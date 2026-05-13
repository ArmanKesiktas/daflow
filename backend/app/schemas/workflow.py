from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid


# ─── Node & Edge Schemas ──────────────────────────────────────────────────────

class NodePosition(BaseModel):
    x: float = 0.0
    y: float = 0.0


class WorkflowNode(BaseModel):
    id: str
    type: str
    position: NodePosition
    data: Dict[str, Any] = Field(default_factory=dict)


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None
    type: Optional[str] = "default"


class Viewport(BaseModel):
    x: float = 0.0
    y: float = 0.0
    zoom: float = 1.0


# ─── Workflow CRUD ────────────────────────────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    viewport: Viewport = Field(default_factory=Viewport)


class WorkflowSave(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    viewport: Viewport = Field(default_factory=Viewport)


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    viewport: Viewport
    user_id: str
    created_at: datetime
    updated_at: datetime
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None


class WorkflowListItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    node_count: int = 0
    updated_at: datetime
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
