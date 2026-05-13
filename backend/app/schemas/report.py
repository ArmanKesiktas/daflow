from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime


class ReportSection(BaseModel):
    section_type: str  # statistics | anomaly_detection | correlation | distribution | ai_insights
    node_id: str
    node_label: Optional[str] = None
    data: Dict[str, Any] = {}
    content: Optional[str] = None


class ReportData(BaseModel):
    report_id: str
    title: str
    generated_at: datetime
    workflow_name: str
    metadata: Dict[str, Any]
    sections: List[ReportSection]


class ReportCreate(BaseModel):
    execution_id: str
    title: Optional[str] = None
    format: str = "pdf"  # pdf | json


class ReportResponse(BaseModel):
    id: str
    execution_id: str
    title: str
    format: str
    storage_path: Optional[str] = None
    created_at: datetime


class FileUploadResponse(BaseModel):
    file_id: str
    storage_path: str
    filename: str
    size_bytes: int
    row_count: int
    column_count: int
    columns: List[Dict[str, str]]  # [{name, type}]
    preview: List[Dict[str, Any]]
    missing_summary: Dict[str, int]
    security: Optional[Dict[str, Any]] = None
