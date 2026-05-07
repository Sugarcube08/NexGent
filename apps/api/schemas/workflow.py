from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class NodeType(str, Enum):
    AGENT = "AGENT"
    CONDITION = "CONDITION"
    TRANSFORM = "TRANSFORM"
    START = "START"
    END = "END"


class WorkflowNode(BaseModel):
    id: str
    type: NodeType
    config: Dict[str, Any] = {}
    # For UI positioning
    position: Optional[Dict[str, float]] = None


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    source_handle: Optional[str] = None
    condition: Optional[str] = None  # e.g., "result.score > 0.8" or "SUCCESS"


class WorkflowBase(BaseModel):
    name: str
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]


class WorkflowCreate(WorkflowBase):
    id: str


class WorkflowResponse(WorkflowBase):
    id: str
    creator_wallet: str
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowRunRequest(BaseModel):
    initial_input: dict
    max_budget: float = Field(default=0.1)


class WorkflowRunResponse(BaseModel):
    run_id: str
    status: str


class WorkflowRunHistoryResponse(BaseModel):
    id: str
    workflow_id: str
    user_wallet: str
    status: str
    results: Optional[Dict] = None
    # Current active nodes in the graph
    active_nodes: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True
