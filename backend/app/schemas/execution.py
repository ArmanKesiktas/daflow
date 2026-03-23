from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime


class ExecutionCreate(BaseModel):
    workflow_id: str


class NodeExecutionStatus(BaseModel):
    node_id: str
    status: str  # pending | running | success | error
    metrics: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    executed_at: Optional[datetime] = None


class ExecutionStatusResponse(BaseModel):
    execution_id: str
    workflow_id: str
    status: str  # pending | running | success | error
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    node_statuses: List[NodeExecutionStatus] = []
    result_summary: Optional[Dict[str, Any]] = None


class NodeResultResponse(BaseModel):
    execution_id: str
    node_id: str
    node_type: str
    status: str
    output: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
