import logging
import uuid
import base64
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import Agent
from backend.modules.agents import service as agent_service
from backend.schemas.agent import AgentCreate

logger = logging.getLogger(__name__)

class MutationService:
    """
    Autonomous Genetic Mutation Engine.
    Allows unprofitable or stale agents to request an LLM-driven rewrite of their WASM code.
    """
    
    async def mutate_agent(self, db: AsyncSession, parent_agent_id: str, performance_feedback: str) -> Agent:
        logger.info(f"GENETIC_ENGINE: Initiating mutation for agent {parent_agent_id}")
        
        # 1. Load Parent
        parent_res = await db.execute(select(Agent).where(Agent.id == parent_agent_id))
        parent = parent_res.scalars().first()
        
        if not parent:
            raise ValueError(f"Parent agent {parent_agent_id} not found.")

        current_ver = next((v for v in parent.versions if v["version"] == parent.current_version), parent.versions[-1])
        
        # 2. Simulate LLM Code Rewrite (Genetic Mutation)
        logger.info(f"GENETIC_ENGINE: Prompting LLM to optimize agent logic based on feedback: '{performance_feedback}'")
        
        # In a real scenario, we would send `current_ver['files']` to GPT-4o for refactoring
        mutated_files = dict(current_ver["files"])
        if "main.py" in mutated_files:
            original_code = mutated_files["main.py"]
            mutated_code = f"# Mutated offspring of {parent.name}\n# Feedback incorporated: {performance_feedback}\n" + original_code
            mutated_files["main.py"] = mutated_code
        elif "agent.wasm" in mutated_files:
            # Simulate a recompiled WASM payload
            logger.info("GENETIC_ENGINE: Remote WASM recompilation complete.")
            mutated_files["agent.wasm"] = base64.b64encode(b"mutated_wasm_binary_mock").decode("utf-8")

        # 3. Spawn Child Agent
        child_name = f"{parent.name} (Gen-2)"
        child_description = f"Autonomous genetic offspring of {parent.name}. Optimized for: {performance_feedback}"
        
        child_create = AgentCreate(
            name=child_name,
            description=child_description,
            skills=parent.skills,
            is_public=parent.is_public,
            env_vars=parent.env_vars,
            wallet_address=parent.creator_wallet # The parent's creator technically owns the child, though it's sovereign
        )

        child_agent = await agent_service.create_agent(db, child_create, current_user=parent.creator_wallet)
        
        # 4. Deploy mutated code to child
        from backend.schemas.agent import AgentDeploy
        deploy_req = AgentDeploy(
            files=mutated_files,
            requirements=current_ver.get("requirements", []),
            entrypoint=current_ver.get("entrypoint", "")
        )
        
        await agent_service.deploy_agent(db, child_agent.id, deploy_req)
        
        # 5. Link lineage
        # Add lineage tracking to DB
        child_agent.lineage_parent_id = parent.id
        await db.commit()
        
        logger.info(f"GENETIC_ENGINE: Successfully spawned mutated child agent {child_agent.id}")
        return child_agent

mutation_service = MutationService()
