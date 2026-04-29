import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import UserWallet, Agent, Task
from typing import Optional, Dict

logger = logging.getLogger(__name__)

async def get_or_create_user_wallet(db: AsyncSession, wallet_address: str) -> UserWallet:
    """
    Retrieves the UserWallet metadata. 
    Balance is no longer tracked here (now on-chain).
    """
    result = await db.execute(select(UserWallet).where(UserWallet.wallet_address == wallet_address))
    user_wallet = result.scalars().first()
    
    if not user_wallet:
        user_wallet = UserWallet(wallet_address=wallet_address, balance=0.0, allowances={})
        db.add(user_wallet)
        await db.commit()
        await db.refresh(user_wallet)
        
    return user_wallet

async def record_agent_earnings(db: AsyncSession, agent_id: str, amount_sol: float):
    """
    Agent earnings are now settled directly into their Squads treasury on-chain.
    """
    logger.info(f"TREASURY: Agent {agent_id} earnings of {amount_sol} SOL will be settled on-chain.")
    pass
