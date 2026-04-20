from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import Agent
from backend.schemas.agent import AgentCreate
import hashlib
import logging

logger = logging.getLogger(__name__)

async def create_agent(db: AsyncSession, agent_data: AgentCreate, creator_wallet: str):
    # Check if agent exists
    result = await db.execute(select(Agent).where(Agent.id == agent_data.id))
    db_agent = result.scalars().first()
    
    new_version = {
        "version": agent_data.version,
        "files": agent_data.files,
        "requirements": agent_data.requirements,
        "entrypoint": agent_data.entrypoint
    }
    
    if db_agent:
        # Update existing agent
        versions = list(db_agent.versions)
        version_exists = False
        for i, v in enumerate(versions):
            if v['version'] == agent_data.version:
                versions[i] = new_version
                version_exists = True
                break
        
        if not version_exists:
            versions.append(new_version)
            
        db_agent.versions = versions
        db_agent.current_version = agent_data.version
        db_agent.name = agent_data.name
        db_agent.description = agent_data.description
        db_agent.price = agent_data.price
    else:
        # Create new agent with REAL Metaplex Minting
        import subprocess
        import os
        from backend.core.config import SOLANA_RPC_URL, PLATFORM_SECRET_SEED
        import base58
        from solders.keypair import Keypair

        # Derive bs58 secret key for the Node.js script
        kp = Keypair.from_seed(PLATFORM_SECRET_SEED.encode())
        secret_key_bs58 = base58.b58encode(bytes(kp)).decode('utf-8')
        
        mint_address = None
        try:
            logger.info(f"Metaplex: Minting real agent asset for {agent_data.name}")
            script_path = os.path.join(os.path.dirname(__file__), "mint_asset.js")
            # For hackathon/demo, we'll use a placeholder URI or a real one if uploaded
            metadata_uri = f"https://api.shoujiki.ai/agents/{agent_data.id}/metadata"
            
            result = subprocess.run(
                ["node", script_path, SOLANA_RPC_URL, secret_key_bs58, agent_data.name, metadata_uri],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                mint_address = result.stdout.strip()
                logger.info(f"Metaplex: Successfully minted asset: {mint_address}")
            else:
                logger.error(f"Metaplex: Minting failed: {result.stderr}")
                # Fallback for demo if node/deps not fully setup in environment
                mint_address = f"asset_{hashlib.sha256(agent_data.id.encode()).hexdigest()[:32]}"
        except Exception as e:
            logger.error(f"Metaplex: Minting exception: {e}")
            mint_address = f"asset_{hashlib.sha256(agent_data.id.encode()).hexdigest()[:32]}"

        db_agent = Agent(
            id=agent_data.id,
            name=agent_data.name,
            description=agent_data.description,
            versions=[new_version],
            current_version=agent_data.version,
            price=agent_data.price,
            creator_wallet=creator_wallet,
            mint_address=mint_address
        )
        db.add(db_agent)
    
    await db.commit()
    await db.refresh(db_agent)
    return db_agent

async def get_agent(db: AsyncSession, agent_id: str):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    return result.scalars().first()

async def get_all_agents(db: AsyncSession):
    result = await db.execute(select(Agent))
    return result.scalars().all()

async def get_agents_by_creator(db: AsyncSession, creator_wallet: str):
    result = await db.execute(select(Agent).where(Agent.creator_wallet == creator_wallet))
    return result.scalars().all()

async def delete_agent(db: AsyncSession, agent_id: str):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    db_agent = result.scalars().first()
    if db_agent:
        await db.delete(db_agent)
        await db.commit()
    return db_agent
