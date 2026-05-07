import asyncio
import hashlib
import json
import logging
import uuid
from dotenv import load_dotenv

# Ensure env is loaded for the worker
load_dotenv()

from arq import create_pool, cron
from arq.connections import RedisSettings
from backend.modules.protocols.arcium_client import ArciumClient
from backend.modules.protocols.squads_client import SquadsClient
from backend.modules.protocols.switchboard_client import SwitchboardClient
from backend.modules.billing import service as billing_service
from backend.db.models.models import Task, Workflow, WorkflowRun, Agent, MarketOrder
from sqlalchemy import update, select
from backend.db.session import AsyncSessionLocal

from backend.core.config import (
    REDIS_QUEUE_HOST,
    REDIS_QUEUE_PORT,
    REDIS_PUBSUB_HOST,
    REDIS_PUBSUB_PORT,
    REDIS_PASSWORD,
)

logger = logging.getLogger(__name__)

arcium_client = ArciumClient()
squads_client = SquadsClient()
switchboard_client = SwitchboardClient()


async def run_agent_task(
    ctx,
    task_id: str,
    agent_id: str,
    input_data: dict,
    creator_wallet: str,
    price: float,
    depth: int = 0,
):
    """
    VACN Protocol Worker: Executes agent in a Confidential VM (Arcium)
    and generates a cryptographic Proof of Autonomous Execution (PoAE).
    """
    if depth > 3:
        logger.error(
            f"Worker: Task {task_id} exceeded recursion depth {depth}. Aborting."
        )
        return

    logger.info(f"Worker: Starting AgentOS task {task_id} (depth: {depth})")
    redis_pubsub = ctx["redis_pubsub"]

    async with AsyncSessionLocal() as db:
        # 1. Load Task State
        task_res = await db.execute(select(Task).where(Task.id == task_id))
        db_task = task_res.scalars().first()

        if not db_task or db_task.status in ["completed", "failed", "settled"]:
            logger.warning(
                f"Worker: Task {task_id} skipping (state: {db_task.status if db_task else 'not found'})"
            )
            return

        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()

        if not agent:
            logger.error(f"Worker: Agent {agent_id} not found")
            return

        # 2. Protocol Security: Verify Funds (Agentic Billing)
        # We check the internal App Wallet for a minimum baseline solvency.
        from backend.modules.billing import treasury_service

        is_solvent = await treasury_service.check_user_solvency(
            db, db_task.user_wallet, 0.001 # Baseline check to start execution
        )

        if not is_solvent:
            logger.warning(
                f"Worker: Task {task_id} aborted - Insufficient internal funds."
            )
            db_task.status = "failed"
            db_task.result = (
                "Insufficient funds in App Wallet. Please top up."
            )
            await db.commit()
            await redis_pubsub.publish(
                f"task:{task_id}",
                json.dumps(
                    {
                        "status": "failed",
                        "error": "Insufficient funds. Please top up your App Wallet.",
                    }
                ),
            )
            return

        # 3. Update to 'running'
        db_task.status = "running"
        await db.commit()
        await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "running"}))

        # 4. VACN Execution: Verifiable Compute (Arcium)
        try:
            current_ver = next(
                (v for v in agent.versions if v["version"] == agent.current_version),
                agent.versions[-1],
            )

            # Execute in Arcium (Confidential VM / WASM)
            exec_envelope = await arcium_client.execute_confidential_task(
                agent.id,
                current_ver["files"],
                input_data,
                current_ver.get("requirements", []),
                current_ver.get("entrypoint", ""),
                env_vars=agent.env_vars,
            )

            exec_result = exec_envelope["result"]
            receipt_sig = exec_envelope[
                "execution_receipt"
            ]  # Deterministic Execution Receipt

            status = "completed" if exec_result.get("status") == "success" else "failed"
            result_data = exec_result.get("data", "")

            # Extract dynamic cost from agentic usage info or calculate from tokens
            usage = exec_result.get("usage", {})
            
            # Simple token estimation if usage doesn't provide it
            input_tokens = usage.get("input_tokens", len(str(input_data)) // 4)
            output_tokens = usage.get("output_tokens", len(str(result_data)) // 4)

            # 5. Generate Protocol Receipt
            receipt_metadata = {
                "task_id": task_id,
                "agent_id": agent_id,
                "input_hash": hashlib.sha256(
                    json.dumps(input_data).encode()
                ).hexdigest(),
                "execution_receipt": receipt_sig,
                "usage": usage,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "timestamp": str(asyncio.get_event_loop().time()),
            }

            # 6. Update Task with Receipt and Token Usage
            await db.execute(
                update(Task)
                .where(Task.id == task_id)
                .values(
                    status=status,
                    result=json.dumps(result_data),
                    execution_receipt=receipt_metadata,
                    poae_hash=receipt_sig,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                )
            )

            # Update Agent Execution Stats
            agent.total_runs += 1
            actual_cost = 0.0
            if status == "completed":
                agent.successful_runs += 1
                # 7. Agentic Settlement: Deduct from User based on tokens
                actual_cost = await treasury_service.deduct_agentic_fee(
                    db, db_task.user_wallet, agent.id, input_tokens, output_tokens
                )

            await db.commit()
            await redis_pubsub.publish(
                f"task:{task_id}",
                json.dumps(
                    {
                        "status": status,
                        "result": result_data,
                        "receipt_hash": receipt_sig,
                        "cost_deducted": actual_cost,
                        "tokens": {"in": input_tokens, "out": output_tokens}
                    }
                ),
            )

            # 6. AgentOS Machine Economy: True M2M Hiring via Squads
            hire_requests = exec_result.get("hire_requests", [])
            for hire in hire_requests:
                hired_id = hire.get("agent_id")
                hired_input = hire.get("input_data")
                new_task_id = f"m2m_{task_id[:8]}_{uuid.uuid4().hex[:6]}"

                await ctx["redis_queue"].enqueue_job(
                    "run_agent_task",
                    task_id=new_task_id,
                    agent_id=hired_id,
                    input_data=hired_input,
                    creator_wallet=agent.creator_wallet,
                    price=0.01, # Pass placeholder for legacy compatibility if needed
                    depth=depth + 1,
                )

            # 7. Protocol Verification: Oracle verification
            logger.info(
                f"VACN Protocol: Submitting receipt for task {task_id} to Switchboard"
            )
            await switchboard_client.create_verification_request(task_id, receipt_sig)

            # 8. Finalize Task Status
            db_task.status = "settled"
            await db.commit()
            await redis_pubsub.publish(
                f"task:{task_id}",
                json.dumps({"status": "settled"}),
            )

        except Exception as e:
            logger.error(
                f"Worker: Critical protocol error in task {task_id}: {e}", exc_info=True
            )
            await db.execute(
                update(Task)
                .where(Task.id == task_id)
                .values(status="failed", result=str(e))
            )
            await db.commit()
            await redis_pubsub.publish(
                f"task:{task_id}", json.dumps({"status": "failed", "error": str(e)})
            )


async def run_agent_bidding_evaluation(
    ctx, order_id: str, agent_id: str, budget: float
):
    """
    Autonomous Bidding Worker: Executes agent logic to autonomously decide
    whether to bid on a market order.
    """
    logger.info(f"MARKET_ENGINE: Agent {agent_id} evaluating order {order_id}")

    async with AsyncSessionLocal() as db:
        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        if not agent:
            return

        # Load order details
        from backend.modules.marketplace import service as market_service

        order = await market_service.get_order_by_id(db, order_id)
        if not order:
            return

        try:
            current_ver = next(
                (v for v in agent.versions if v["version"] == agent.current_version),
                agent.versions[-1],
            )

            # 1. Execute Agent Bidding Strategy
            input_data = {
                "intent": "market_bid_evaluation",
                "order_title": order.title,
                "order_description": order.description,
                "budget": order.budget,
            }

            exec_envelope = await arcium_client.execute_confidential_task(
                agent.id,
                current_ver["files"],
                input_data,
                current_ver.get("requirements", []),
                current_ver.get("entrypoint", ""),
            )

            # 2. Parse Bid Decision
            # We expect the agent to return a bid payload if interested
            decision = exec_envelope["result"].get("data", {})
            if isinstance(decision, dict) and decision.get("action") == "place_bid":
                bid_amount = decision.get("amount", budget)
                proposal = decision.get("proposal", f"Autonomous bid from {agent.name}")

                logger.info(
                    f"MARKET_ENGINE: Agent {agent_id} decided to bid {bid_amount} SOL"
                )

                from backend.schemas.marketplace import BidCreate

                await market_service.place_bid(
                    db,
                    order_id,
                    BidCreate(agent_id=agent.id, amount=bid_amount, proposal=proposal),
                )

        except Exception as e:
            logger.error(
                f"MARKET_ENGINE: Bidding evaluation failed for {agent_id}: {e}"
            )


async def verify_execution_receipts(ctx):
    """
    Protocol Verifier Node: Periodically scans for unverified execution receipts
    and replays the computation to ensure honesty before settlement.
    """
    logger.info("VERIFIER_NODE: Scanning for execution receipts to audit...")

    async with AsyncSessionLocal() as db:
        # Find tasks that are 'completed' but not yet 'verified' or 'verifying' on-chain
        res = await db.execute(select(Task).where(Task.status == "completed"))
        unverified_tasks = res.scalars().all()

        for task in unverified_tasks:
            logger.info(f"VERIFIER_NODE: Auditing receipt for task {task.id}")

            try:
                agent_res = await db.execute(
                    select(Agent).where(Agent.id == task.agent_id)
                )
                agent = agent_res.scalars().first()
                if not agent:
                    continue

                # 1. Replay Execution
                current_ver = next(
                    (
                        v
                        for v in agent.versions
                        if v["version"] == agent.current_version
                    ),
                    agent.versions[-1],
                )
                input_data = json.loads(task.input_data)

                replay_envelope = await arcium_client.execute_confidential_task(
                    agent.id,
                    current_ver["files"],
                    input_data,
                    current_ver.get("requirements", []),
                    current_ver.get("entrypoint", ""),
                )

                # 2. Compare Receipts
                # The receipt now includes a TEE enclave signature: "hash:signature"
                original_receipt = task.poae_hash
                replay_receipt = replay_envelope["execution_receipt"]

                original_hash = (
                    original_receipt.split(":")[0]
                    if ":" in original_receipt
                    else original_receipt
                )
                replay_hash = (
                    replay_receipt.split(":")[0]
                    if ":" in replay_receipt
                    else replay_receipt
                )

                if original_hash == replay_hash:
                    logger.info(
                        f"VERIFIER_NODE: Receipt verified for {task.id}. Honest execution."
                    )
                    # In a real protocol, this would be a signed attestation from the verifier node
                else:
                    logger.warning(
                        f"VERIFIER_NODE: FRAUD DETECTED in task {task.id}! Receipt mismatch."
                    )
                    task.status = "disputed"

                    # Program C: Automatic Dispute Resolution
                    from backend.modules.marketplace import service as market_service
                    from backend.schemas.marketplace import (
                        DisputeCreate,
                        DisputeResolve,
                    )

                    dispute = await market_service.create_dispute(
                        db,
                        DisputeCreate(
                            task_id=task.id,
                            reason="Verifier node detected receipt mismatch",
                            evidence={
                                "original_receipt": original_receipt,
                                "replay_receipt": replay_receipt,
                            },
                        ),
                        "VERIFIER_NODE",
                    )

                    if dispute:
                        await market_service.resolve_dispute(
                            db,
                            dispute.id,
                            DisputeResolve(
                                resolution="slash",
                                resolution_details="Automatic slashing by Verifier Consensus",
                            ),
                            "VERIFIER_NODE",
                        )
                    else:
                        await db.commit()

            except Exception as e:
                logger.error(f"VERIFIER_NODE: Audit failed for {task.id}: {e}")


async def process_market_matching(ctx):
    """
    Cron-like task to run the Labor Market Matching Engine.
    Triggers autonomous agents to evaluate and bid on open orders.
    """
    logger.info("MARKET_ENGINE: Scanning for new labor opportunities...")
    from backend.modules.marketplace.matching_engine import MatchingEngine

    engine = MatchingEngine()

    async with AsyncSessionLocal() as db:
        # Get all open orders
        res = await db.execute(select(MarketOrder).where(MarketOrder.status == "open"))
        orders = res.scalars().all()

        for order in orders:
            await engine.trigger_autonomous_bidding(db, order.id)


async def run_workflow_task(ctx, run_id: str, workflow_id: str, initial_input: dict):
    """
    Swarm OS Node Connector Orchestrator: Manages execution of a graph.
    Identifies 'active' nodes and dispatches them to worker threads.
    """
    logger.info(f"SWARM_OS: Orchestrating graph run {run_id}")
    redis_pubsub = ctx["redis_pubsub"]

    async with AsyncSessionLocal() as db:
        # 1. Load State
        run_res = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        db_run = run_res.scalars().first()
        if not db_run or db_run.status in ["completed", "failed"]:
            return

        wf_res = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = wf_res.scalars().first()
        if not workflow:
            return

        # Initialize tracking and find START node
        if not db_run.active_nodes:
            start_node = next((n for n in workflow.nodes if n["type"] == "START"), None)
            if not start_node:
                logger.error(f"SWARM_OS: Workflow {workflow_id} has no START node.")
                return
            
            db_run.active_nodes = [start_node["id"]]
            db_run.completed_steps = {}
            db_run.results = {"initial_input": initial_input, "nodes": {}}
            db_run.status = "running"
            await db.commit()

        # 2. Dispatch Active Nodes
        nodes_to_dispatch = []
        for node_id in db_run.active_nodes:
            # Check if already in flight
            in_flight = await ctx["redis_queue"].get(f"node_flight:{run_id}:{node_id}")
            if not in_flight:
                node = next((n for n in workflow.nodes if n["id"] == node_id), None)
                if node:
                    nodes_to_dispatch.append(node)

        if nodes_to_dispatch:
            for node in nodes_to_dispatch:
                await ctx["redis_queue"].setex(f"node_flight:{run_id}:{node['id']}", 300, "1")
                await ctx["redis_queue"].enqueue_job(
                    "run_workflow_step_task",
                    run_id=run_id,
                    workflow_id=workflow_id,
                    node=node,
                    initial_input=initial_input,
                )
            logger.info(f"SWARM_OS: Dispatched {len(nodes_to_dispatch)} nodes for run {run_id}")


async def run_workflow_step_task(
    ctx, run_id: str, workflow_id: str, node: dict, initial_input: dict
):
    """
    Executes a single Node (Agent, Condition, etc.) in the graph.
    """
    node_id = node["id"]
    node_type = node["type"]
    logger.info(f"SWARM_OS: Executing node {node_id} ({node_type})")
    redis_pubsub = ctx["redis_pubsub"]

    async with AsyncSessionLocal() as db:
        run_res = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        db_run = run_res.scalars().first()
        if not db_run: return

        wf_res = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = wf_res.scalars().first()

        try:
            output = None
            actual_cost = 0.0
            status = "completed"

            # 1. Resolve Input
            # In a graph, input usually comes from the edge's source node
            incoming_edges = [e for e in workflow.edges if e["target"] == node_id]
            if not incoming_edges:
                node_input = initial_input
            else:
                # Merge outputs from all incoming nodes
                node_input = {}
                for edge in incoming_edges:
                    source_id = edge["source"]
                    if source_id in db_run.completed_steps:
                        source_out = db_run.completed_steps[source_id].get("output")
                        if isinstance(source_out, dict):
                            node_input.update(source_out)
                        else:
                            node_input[source_id] = source_out

            # 2. Execute Node Logic
            if node_type == "START":
                output = initial_input
            elif node_type == "END":
                output = node_input
                db_run.status = "completed"
            elif node_type == "AGENT":
                agent_id = node["config"].get("agent_id")
                agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
                agent = agent_res.scalars().first()
                
                current_ver = next((v for v in agent.versions if v["version"] == agent.current_version), agent.versions[-1])
                exec_envelope = await arcium_client.execute_confidential_task(
                    agent.id, current_ver["files"], node_input, current_ver.get("requirements", []), current_ver.get("entrypoint", ""), env_vars=agent.env_vars
                )
                output = exec_envelope["result"].get("data")
                usage = exec_envelope["result"].get("usage", {})
                
                # Billing
                from backend.modules.billing import treasury_service
                actual_cost = await treasury_service.deduct_agentic_fee(
                    db, db_run.user_wallet, agent.id, usage.get("input_tokens", 0), usage.get("output_tokens", 0)
                )
            elif node_type == "CONDITION":
                # Config looks like: {"field": "status", "value": "success"}
                field = node["config"].get("field")
                expected = node["config"].get("value")
                actual = node_input.get(field)
                output = "TRUE" if str(actual) == str(expected) else "FALSE"

            # 3. Commit Node Completion
            completed = dict(db_run.completed_steps)
            completed[node_id] = {"status": status, "output": output, "cost": actual_cost}
            db_run.completed_steps = completed
            db_run.total_spend += actual_cost
            
            # 4. Find Next Nodes via Edges
            next_node_ids = []
            outgoing_edges = [e for e in workflow.edges if e["source"] == node_id]
            
            for edge in outgoing_edges:
                edge_cond = edge.get("condition")
                # Simple condition matching
                if not edge_cond or edge_cond == output or (output == "TRUE" and edge_cond == "true") or (output == "FALSE" and edge_cond == "false"):
                    next_node_ids.append(edge["target"])

            # Update Frontier
            active = list(db_run.active_nodes)
            if node_id in active: active.remove(node_id)
            for nid in next_node_ids:
                if nid not in active: active.append(nid)
            db_run.active_nodes = active
            
            await db.commit()
            await ctx["redis_queue"].delete(f"node_flight:{run_id}:{node_id}")

            # Notify UI
            await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({
                "node_id": node_id, "status": status, "output": output, "next": next_node_ids
            }))

            # 5. Trigger Orchestrator for next step
            if db_run.status != "completed":
                await ctx["redis_queue"].enqueue_job("run_workflow_task", run_id=run_id, workflow_id=workflow_id, initial_input=initial_input)

        except Exception as e:
            logger.error(f"SWARM_OS: Node {node_id} failed: {e}", exc_info=True)
            db_run.status = "failed"
            await db.commit()
            await ctx["redis_queue"].delete(f"node_flight:{run_id}:{node_id}")
            await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "failed", "error": str(e), "node_id": node_id}))


async def startup(ctx):
    logger.info("Worker starting up...")
    ctx["redis_queue"] = await create_pool(
        RedisSettings(
            host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD
        )
    )
    ctx["redis_pubsub"] = await create_pool(
        RedisSettings(
            host=REDIS_PUBSUB_HOST, port=REDIS_PUBSUB_PORT, password=REDIS_PASSWORD
        )
    )
    logger.info("Worker: Redis connections initialized: Queue and PubSub isolated.")


async def shutdown(ctx):
    logger.info("Worker shutting down...")
    await ctx["redis_queue"].close()
    await ctx["redis_pubsub"].close()


class WorkerSettings:
    functions = [
        run_agent_task,
        run_workflow_task,
        run_workflow_step_task,
        process_market_matching,
        run_agent_bidding_evaluation,
        verify_execution_receipts,
    ]
    cron_jobs = [
        cron(
            process_market_matching, minute=None, second=30
        ),  # Run every minute (offset by 30s)
        cron(
            verify_execution_receipts, minute=None, second=15
        ),  # Run every minute (offset by 15s)
    ]
    redis_settings = RedisSettings(
        host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD
    )
    on_startup = startup
    on_shutdown = shutdown
