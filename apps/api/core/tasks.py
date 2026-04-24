import asyncio
from arq import create_pool
from arq.connections import RedisSettings
import os
import logging
from backend.modules.sandbox.client import execute_in_sandbox
from backend.db.session import AsyncSessionLocal
from backend.modules.agents import service as agent_service
from backend.modules.billing import service as billing_service
from backend.db.models.models import Task
from sqlalchemy import update

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

async def run_agent_task(ctx, task_id: str, agent_id: str, input_data: dict, creator_wallet: str, price: float):
    """
    Background worker task to execute agent in sandbox and settle payment.
    """
    logger.info(f"Worker: Starting task {task_id} for agent {agent_id}")
    
    # 1. Update status to 'running'
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Task).where(Task.id == task_id).values(status="running")
        )
        await db.commit()

        # 2. Get agent details
        agent = await agent_service.get_agent(db, agent_id)
        if not agent:
            logger.error(f"Worker: Agent {agent_id} not found")
            await db.execute(
                update(Task).where(Task.id == task_id).values(status="failed", result="Agent not found")
            )
            await db.commit()
            return

        current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
        
        # 3. Execute in sandbox
        try:
            exec_result = await execute_in_sandbox(
                files=current_ver['files'],
                requirements=current_ver['requirements'],
                entrypoint=current_ver['entrypoint'],
                input_data=input_data
            )
            
            # 4. Update task result and generate receipt
            status = "completed" if exec_result["success"] else "failed"
            result = exec_result["output"] if exec_result["success"] else exec_result["error"]
            
            import hashlib
            import json
            receipt = {
                "task_id": task_id,
                "agent_id": agent_id,
                "input_hash": hashlib.sha256(json.dumps(input_data).encode()).hexdigest(),
                "output_hash": hashlib.sha256(result.encode()).hexdigest() if result else None,
                "success": exec_result["success"],
                "timestamp": str(asyncio.get_event_loop().time()) # Placeholder for real time
            }

            await db.execute(
                update(Task).where(Task.id == task_id).values(
                    status=status, 
                    result=result,
                    execution_receipt=receipt
                )
            )
            await db.commit()
            
            # 5. Settle payment
            await billing_service.settle_task_payment(
                task_id,
                creator_wallet,
                exec_result["success"],
                price
            )
            
            logger.info(f"Worker: Task {task_id} finished with status {status}")
            
        except Exception as e:
            logger.error(f"Worker: Critical error in task {task_id}: {e}")
            await db.execute(
                update(Task).where(Task.id == task_id).values(status="failed", result=str(e))
            )
            await db.commit()

async def startup(ctx):
    logger.info("Worker starting up...")

async def shutdown(ctx):
    logger.info("Worker shutting down...")

class WorkerSettings:
    functions = [run_agent_task]
    redis_settings = RedisSettings(host=REDIS_HOST, port=REDIS_PORT)
    on_startup = startup
    on_shutdown = shutdown
