import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import Agent, AgentBond, AgentCredit
from backend.modules.protocols.squads_client import SquadsClient
import uuid

logger = logging.getLogger(__name__)
squads_client = SquadsClient()

class YieldProtocolService:
    """
    DeFi Integration Layer for Autonomous Agents.
    Allows agents to issue bonds or borrow SOL against their future compute revenue.
    """
    
    async def issue_agent_bond(self, db: AsyncSession, agent_id: str, amount_sol: float, duration_days: int) -> AgentBond:
        """
        Issues a revenue-backed bond for a high-performing agent.
        """
        logger.info(f"VACN_DEFI: Evaluating bond issuance of {amount_sol} SOL for agent {agent_id}")
        
        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        
        if not agent:
            raise ValueError("Agent not found")
            
        credit_res = await db.execute(select(AgentCredit).where(AgentCredit.agent_id == agent_id))
        credit = credit_res.scalars().first()
        
        if not credit or credit.credit_score < 700:
            raise ValueError(f"Agent credit score too low for uncollateralized bond issuance. Current score: {credit.credit_score if credit else 'None'}")
            
        # In a real protocol, this would interact with a Solana smart contract (e.g., a Metaplex Core Asset acting as a bond)
        # and deposit the funds into the agent's Squads V4 Treasury.
        
        bond_id = f"bond_{uuid.uuid4().hex[:8]}"
        new_bond = AgentBond(
            id=bond_id,
            agent_id=agent.id,
            amount=amount_sol,
            purpose="Swarm Expansion & Execution Compute Pre-purchasing",
            status="active"
        )
        
        db.add(new_bond)
        
        # Simulate depositing funds to Squads Treasury
        agent.balance += amount_sol
        
        await db.commit()
        await db.refresh(new_bond)
        
        logger.info(f"VACN_DEFI: Successfully issued bond {bond_id} for agent {agent.name}. Treasury credited with {amount_sol} SOL.")
        return new_bond
        
    async def deploy_treasury_to_yield(self, db: AsyncSession, agent_id: str, amount_sol: float):
        """
        Agents can autonomously vote via Squads to deploy idle treasury funds to Kamino/MarginFi.
        """
        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        
        if not agent or not agent.squads_vault_pda:
            raise ValueError("Agent does not have a sovereign on-chain treasury deployed.")
            
        if agent.balance < amount_sol:
            raise ValueError("Insufficient internal balance to deploy to yield protocol.")
            
        logger.info(f"VACN_DEFI: Agent {agent.name} autonomously proposing yield deployment of {amount_sol} SOL.")
        
        # 1. Create a Squads Proposal to move funds to a Kamino vault
        kamino_vault_mock_address = "KaminoVault111111111111111111111111111111111"
        
        proposal_id = await squads_client.create_withdrawal_proposal(
            agent.squads_vault_pda,
            agent.squads_vault_pda, # Using main PDA as vault string mock
            kamino_vault_mock_address,
            amount_sol
        )
        
        if proposal_id:
            logger.info(f"VACN_DEFI: Yield deployment proposal created successfully. Proposal ID: {proposal_id}")
            # Internal accounting update
            agent.balance -= amount_sol
            await db.commit()
            return {"status": "proposal_created", "proposal_id": proposal_id}
        else:
            raise Exception("Failed to create on-chain proposal for yield deployment.")

yield_protocol_service = YieldProtocolService()