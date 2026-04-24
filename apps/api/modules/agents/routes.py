from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from backend.db.session import get_db
from backend.schemas.agent import AgentCreate, AgentResponse, AgentTestRequest
from backend.schemas.task import RunRequest, TaskResponse, TaskHistoryResponse
from backend.modules.agents import service as agent_service
from backend.modules.billing import service as billing_service
from backend.modules.sandbox.client import execute_in_sandbox
from backend.db.models.models import Task, Payment
from backend.core.dependencies import get_current_user
from backend.modules.agents.validation import validate_agent_code
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/run", response_model=TaskResponse)
async def run_agent(
    request: Request,
    req: RunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # 1. Get agent
    agent = await agent_service.get_agent(db, req.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # 2. Verify payment on-chain
    if not req.signature:
        raise HTTPException(status_code=400, detail="Transaction signature required")
    if not req.reference:
        raise HTTPException(status_code=400, detail="Payment reference required")

    success, msg = await billing_service.verify_solana_payment(
        req.signature,
        agent.price,
        current_user,
        req.reference
    )
    
    if not success:
        raise HTTPException(status_code=402, detail=f"Payment verification failed: {msg}")
    
    # 3. Create task record (using task_id from frontend)
    db_task = Task(
        id=req.task_id,
        agent_id=agent.id,
        user_wallet=current_user,
        input_data=str(req.input_data),
        status="queued"
    )
    db.add(db_task)
    await db.commit()

    # 4. Enqueue in background worker
    redis = request.app.state.redis
    await redis.enqueue_job(
        'run_agent_task',
        task_id=req.task_id,
        agent_id=agent.id,
        input_data=req.input_data,
        creator_wallet=agent.creator_wallet,
        price=agent.price
    )
    
    return TaskResponse(
        task_id=req.task_id,
        status="queued",
        result=None,
        error=None
    )

@router.post("/test")
async def test_agent(
    req: AgentTestRequest,
    current_user: str = Depends(get_current_user)
):
    # Rapid development endpoint: no payment, no DB persistence
    entry_code = req.files.get(req.entrypoint, "")
    if not entry_code:
        raise HTTPException(status_code=400, detail=f"Entrypoint {req.entrypoint} not found")
        
    valid, msg = validate_agent_code(entry_code)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    return await execute_in_sandbox(
        files=req.files,
        requirements=req.requirements,
        entrypoint=req.entrypoint,
        input_data=req.input_data or {"test": True}
    )

@router.post("/deploy", response_model=AgentResponse)
async def deploy_agent(
    req: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # Validate agent code structure (entrypoint)
    entry_code = req.files.get(req.entrypoint)
    if not entry_code:
        raise HTTPException(status_code=400, detail=f"Entrypoint {req.entrypoint} not found in files")
        
    valid, msg = validate_agent_code(entry_code)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    return await agent_service.create_agent(db, req, current_user)

@router.get("/tasks", response_model=List[TaskHistoryResponse])
async def list_my_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(
        select(Task).where(Task.user_wallet == current_user).order_by(Task.created_at.desc())
    )
    return result.scalars().all()

@router.get("/me", response_model=List[AgentResponse])
async def list_my_agents(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return await agent_service.get_agents_by_creator(db, current_user)

@router.get("", response_model=List[AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    return await agent_service.get_all_agents(db)

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.creator_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to delete this agent")
    
    await agent_service.delete_agent(db, agent_id)
    return {"message": "Agent deleted successfully"}
