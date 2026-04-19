from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_db
from app.schemas.agent import AgentResponse
from app.modules.agents import service as agent_service

router = APIRouter()

@router.get("/featured", response_model=List[AgentResponse])
async def get_featured_agents(db: AsyncSession = Depends(get_db)):
    # Return 6 most recently created agents as featured
    from sqlalchemy import desc
    from app.db.models.models import Agent
    from sqlalchemy.future import select
    
    result = await db.execute(
        select(Agent).order_by(desc(Agent.created_at)).limit(6)
    )
    return result.scalars().all()
