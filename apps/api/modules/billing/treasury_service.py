import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import UserWallet, Agent

logger = logging.getLogger(__name__)


async def get_or_create_user_wallet(
    db: AsyncSession, wallet_address: str
) -> UserWallet:
    """
    Retrieves the UserWallet metadata and internal App Wallet balance.
    """
    result = await db.execute(
        select(UserWallet).where(UserWallet.wallet_address == wallet_address)
    )
    user_wallet = result.scalars().first()

    if not user_wallet:
        user_wallet = UserWallet(
            wallet_address=wallet_address, balance=0.0, allowances={}
        )
        db.add(user_wallet)
        await db.commit()
        await db.refresh(user_wallet)

    return user_wallet


async def check_user_solvency(
    db: AsyncSession, wallet_address: str, required_amount_sol: float
) -> bool:
    """
    Checks if the user has sufficient internal balance to proceed with execution.
    """
    user_wallet = await get_or_create_user_wallet(db, wallet_address)
    is_solvent = user_wallet.balance >= required_amount_sol
    if not is_solvent:
        logger.warning(
            f"TREASURY: User {wallet_address} insolvent. Balance: {user_wallet.balance}, Required: {required_amount_sol}"
        )
    return is_solvent


async def deduct_agentic_fee(
    db: AsyncSession, wallet_address: str, agent_id: str, amount_sol: float
) -> bool:
    """
    Deducts dynamic fees from the internal App Wallet and credits the Agent.
    """
    # 1. Deduct from User
    user_wallet = await get_or_create_user_wallet(db, wallet_address)

    if user_wallet.balance < amount_sol:
        logger.error(
            f"TREASURY: Critical failure - balance went insolvent during deduction for {wallet_address}"
        )
        # In a real system, we might still deduct and go negative or trigger an alert
        user_wallet.balance -= amount_sol
    else:
        user_wallet.balance -= amount_sol

    # 2. Credit Agent (Internal Ledger)
    agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_res.scalars().first()

    if agent:
        agent.balance += amount_sol
        agent.total_earnings += amount_sol
        logger.info(
            f"TREASURY: Credited agent {agent_id} with {amount_sol} SOL. New balance: {agent.balance}"
        )
    else:
        logger.error(f"TREASURY: Agent {agent_id} not found during fee credit.")

    await db.commit()
    return True


async def record_agent_earnings(db: AsyncSession, agent_id: str, amount_sol: float):
    """
    Agent earnings are now settled directly into their Squads treasury on-chain.
    """
    logger.info(
        f"TREASURY: Agent {agent_id} earnings of {amount_sol} SOL will be settled on-chain."
    )
    pass
