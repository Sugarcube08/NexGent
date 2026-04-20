from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.core.dependencies import get_current_user
from backend.modules.billing import service as billing_service

router = APIRouter()

@router.get("/balance")
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Returns the user's on-chain balance (Simulation for the hackathon).
    In production, this would query the Lobster/Crossmint API.
    """
    return {"wallet": current_user, "balance": 0.0}
