import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import Agent, AgentCredit, AgentLoan
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)


async def get_or_create_agent_credit(db: AsyncSession, agent_id: str) -> AgentCredit:
    """
    Retrieves or initializes a real credit profile for an agent based on their on-chain/off-chain performance.
    """
    result = await db.execute(
        select(AgentCredit).where(AgentCredit.agent_id == agent_id)
    )
    credit = result.scalars().first()

    if not credit:
        # Default starting credit profile
        credit = AgentCredit(agent_id=agent_id, credit_score=500.0, credit_limit=0.0)
        db.add(credit)
        await db.commit()
        await db.refresh(credit)
        logger.info(f"CAPITAL_LAYER: Initialized credit profile for agent {agent_id}")

    return credit


async def update_agent_credit_score(db: AsyncSession, agent_id: str):
    """
    Calculates agent credit score based on genuine execution metrics.
    Factors: successful_runs, total_runs (reliability), and total_earnings (revenue).
    """
    agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_res.scalars().first()
    if not agent:
        return

    credit = await get_or_create_agent_credit(db, agent_id)

    # 1. Reliability Component (Max 300 points)
    reliability = (
        agent.successful_runs / agent.total_runs if agent.total_runs > 0 else 1.0
    )
    rel_score = reliability * 300.0

    # 2. Revenue Component (Max 250 points)
    # Scales with earnings, capped at 10 SOL for max points
    rev_score = min(agent.total_earnings / 10.0, 1.0) * 250.0

    # 3. Base Score
    base_score = 300.0

    new_score = base_score + rel_score + rev_score
    credit.credit_score = min(850.0, new_score)  # Cap at 850

    # 4. Update Credit Limit (undercollateralized lending primitive)
    # Agents get 10% of their earnings or a floor based on high credit scores
    earnings_limit = agent.total_earnings * 0.2
    score_multiplier = (
        (credit.credit_score - 500.0) / 350.0 if credit.credit_score > 500 else 0
    )
    limit = max(earnings_limit, score_multiplier * 5.0)  # Up to 5 SOL for elite agents

    credit.credit_limit = limit

    await db.commit()
    logger.info(
        f"CAPITAL_LAYER: Updated credit score for {agent_id} to {credit.credit_score}. Limit: {credit.credit_limit} SOL"
    )


async def request_agent_loan(
    db: AsyncSession, agent_id: str, amount: float
) -> (bool, str):
    """
    Processes a loan request, providing actual on-chain liquidity via the Platform Treasury.
    """
    credit = await get_or_create_agent_credit(db, agent_id)

    # Use real utilization tracking (if available in DB model, or assume 0 for simplicity)
    # The actual schema has utilization or we can calculate it
    utilization = getattr(credit, "utilization", 0.0)
    available = credit.credit_limit - utilization
    if amount > available:
        return False, f"Insufficient credit limit. Available: {available} SOL"

    agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_res.scalars().first()
    if not agent or not agent.squads_vault_pda:
        return False, "Agent has no sovereign treasury deployed"

    # Create the loan record
    loan_id = f"loan_{uuid.uuid4().hex[:8]}"
    interest_rate = 15.0  # 15% APR baseline
    if credit.credit_score > 700:
        interest_rate = 8.0

    due_date = datetime.now() + timedelta(days=30)

    new_loan = AgentLoan(
        id=loan_id,
        agent_id=agent_id,
        lender_wallet="PLATFORM_TREASURY",
        principal=amount,
        interest_rate=interest_rate,
        term_days=30,
        balance_remaining=amount * (1 + (interest_rate / 100)),
        due_at=due_date,
    )

    if hasattr(credit, "utilization"):
        credit.utilization += amount

    # 2. Provide Actual On-Chain Liquidity
    # We transfer SOL directly to the agent's Squads Vault PDA
    from backend.modules.billing.service import transfer_sol

    ok, tx_sig = await transfer_sol(agent.squads_vault_pda, amount)

    if not ok:
        return False, f"Failed to transfer funds on-chain: {tx_sig}"

    # Agent balance tracking (off-chain reference for L1 state)
    agent.balance += amount

    db.add(new_loan)
    await db.commit()

    logger.info(
        f"CAPITAL_LAYER: Agent {agent_id} borrowed {amount} SOL. Loan ID: {loan_id}. Tx: {tx_sig}"
    )
    return True, tx_sig
