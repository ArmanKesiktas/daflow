"""
Execution routes — trigger workflow runs, stream real-time status via SSE,
and retrieve per-node results.
"""
import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.core.execution_engine import WorkflowExecutionEngine
from app.dependencies import get_current_user, get_supabase
from app.schemas.execution import ExecutionStatusResponse, NodeResultResponse
from app.services.workspace_service import log_activity
from app.services.workspace_service import require_workspace_member

router = APIRouter()


# ── Trigger execution ─────────────────────────────────────────────────────────

@router.post("/workflows/{workflow_id}/run")
async def run_workflow(
    workflow_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Start a workflow execution. Returns execution_id immediately."""
    from app.api.routes.workflows import _has_workflow_permission
    try:
        wf_result = (
            supabase.table("workflows")
            .select("id, graph_data, name, user_id, workspace_id, project_id")
            .eq("id", workflow_id)
            .single()
            .execute()
        )
    except Exception:
        wf_result = (
            supabase.table("workflows")
            .select("id, graph_data, name, user_id")
            .eq("id", workflow_id)
            .single()
            .execute()
        )
    if not wf_result.data:
        raise HTTPException(404, "Workflow not found")

    allowed, _ = _has_workflow_permission(supabase, user, workflow_id, "edit")
    if not allowed:
        raise HTTPException(403, "You do not have permission to run this workflow")

    workflow_data = wf_result.data

    # Create execution record
    exec_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    exec_payload = {
        "id": exec_id,
        "workflow_id": workflow_id,
        "user_id": user["id"],
        "status": "pending",
        "created_at": now,
    }
    if workflow_data.get("workspace_id"):
        exec_payload["workspace_id"] = workflow_data.get("workspace_id")
        exec_payload["project_id"] = workflow_data.get("project_id")
    supabase.table("workflow_executions").insert(exec_payload).execute()
    log_activity(supabase, workflow_data.get("workspace_id"), user["id"], "workflow.executed", "workflow", workflow_id, {"execution_id": exec_id})

    # Seed node results as "pending"
    for node in workflow_data["graph_data"].get("nodes", []):
        supabase.table("node_execution_results").insert({
            "execution_id": exec_id,
            "node_id": node["id"],
            "node_type": node.get("type", "unknown"),
            "status": "pending",
        }).execute()

    # Launch background task
    background_tasks.add_task(
        _execute_workflow_task,
        exec_id,
        workflow_id,
        workflow_data["graph_data"],
        workflow_data.get("name", "Untitled"),
    )

    return {"execution_id": exec_id, "status": "accepted"}


# ── SSE stream ────────────────────────────────────────────────────────────────

@router.get("/{execution_id}/stream")
async def stream_execution(
    execution_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Server-Sent Events stream for real-time execution status updates."""
    # Verify ownership
    _get_execution(execution_id, user["id"], supabase)

    async def event_generator():
        prev_statuses: Dict[str, str] = {}
        terminal_states = {"success", "error"}

        for _ in range(300):  # max 5 minutes (1s polling)
            exec_row = (
                supabase.table("workflow_executions")
                .select("status, started_at, completed_at, error_message, result_summary")
                .eq("id", execution_id)
                .single()
                .execute()
            )
            if not exec_row.data:
                break

            node_rows = (
                supabase.table("node_execution_results")
                .select("node_id, node_type, status, metrics, error_message, executed_at")
                .eq("execution_id", execution_id)
                .execute()
            )

            payload = {
                "execution_id": execution_id,
                "status": exec_row.data["status"],
                "node_statuses": node_rows.data or [],
                "done": exec_row.data["status"] in terminal_states,
            }

            yield f"data: {json.dumps(payload)}\n\n"

            if exec_row.data["status"] in terminal_states:
                break

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Status & results ──────────────────────────────────────────────────────────

@router.get("/", include_in_schema=True)
async def list_executions(
    workflow_id: str | None = None,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    q = (
        supabase.table("workflow_executions")
        .select("id, workflow_id, status, started_at, completed_at, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(50)
    )
    if workflow_id:
        q = q.eq("workflow_id", workflow_id)
    result = q.execute()
    return result.data


@router.get("/{execution_id}", response_model=ExecutionStatusResponse)
async def get_execution_status(
    execution_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    exec_row = _get_execution_for_dashboard_access(execution_id, user, supabase, "view")
    node_rows = (
        supabase.table("node_execution_results")
        .select("*")
        .eq("execution_id", execution_id)
        .execute()
    )
    return ExecutionStatusResponse(
        execution_id=execution_id,
        workflow_id=exec_row["workflow_id"],
        status=exec_row["status"],
        started_at=exec_row.get("started_at"),
        completed_at=exec_row.get("completed_at"),
        error_message=exec_row.get("error_message"),
        node_statuses=node_rows.data or [],
        result_summary=exec_row.get("result_summary", {}),
    )


@router.get("/{execution_id}/export-permission")
async def get_export_permission(
    execution_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    _get_execution_for_dashboard_access(execution_id, user, supabase, "export")
    return {"allowed": True, "reason": "owner", "denied": []}


@router.get("/{execution_id}/compare/{other_id}")
async def compare_executions(
    execution_id: str,
    other_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    left = _get_execution(execution_id, user["id"], supabase)
    right = _get_execution(other_id, user["id"], supabase)
    left_nodes = _node_rows(supabase, execution_id)
    right_nodes = _node_rows(supabase, other_id)
    return {
        "left": _execution_summary(left, left_nodes),
        "right": _execution_summary(right, right_nodes),
        "diff": {
            "status_changed": left.get("status") != right.get("status"),
            "duration_delta_seconds": _duration_seconds(left) - _duration_seconds(right),
            "node_count_delta": len(left_nodes) - len(right_nodes),
            "error_delta": _error_count(left_nodes) - _error_count(right_nodes),
        },
    }


@router.get("/{execution_id}/results/{node_id}", response_model=NodeResultResponse)
async def get_node_result(
    execution_id: str,
    node_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    # Verify ownership via execution
    _get_execution_for_dashboard_access(execution_id, user, supabase, "view")

    row = (
        supabase.table("node_execution_results")
        .select("*")
        .eq("execution_id", execution_id)
        .eq("node_id", node_id)
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(404, "Node result not found")
    r = row.data
    return NodeResultResponse(
        execution_id=execution_id,
        node_id=node_id,
        node_type=r.get("node_type", ""),
        status=r.get("status", ""),
        output=r.get("output_json"),
        metrics=r.get("metrics"),
        error_message=r.get("error_message"),
    )


@router.post("/{execution_id}/ai-summary")
async def generate_ai_summary(
    execution_id: str,
    payload: dict = {},
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """
    Aggregate all node outputs for this execution into a report_data structure
    and call the LLM to produce a natural-language insight summary.
    """
    from app.nodes.output.ai_insights import AIInsightsProcessor, _build_prompt
    from app.api.routes.reports import _build_report_data

    exec_row = _get_execution(execution_id, user["id"], supabase)

    # Pull workflow name
    wf_id = exec_row.get("workflow_id", "")
    wf_row = supabase.table("workflows").select("name").eq("id", wf_id).single().execute()
    workflow_name = (wf_row.data or {}).get("name", "Untitled")

    # Gather all node results
    node_result = (
        supabase.table("node_execution_results")
        .select("node_id, node_type, output_json")
        .eq("execution_id", execution_id)
        .execute()
    )

    report_data = _build_report_data(
        execution_id=execution_id,
        workflow_name=workflow_name,
        title=f"Analysis — {workflow_name}",
        node_results=node_result.data or [],
    )

    raw_language: str = (payload or {}).get("language", "English")
    language = "Turkish" if str(raw_language).lower().startswith("tr") else "English"
    provider: str = (payload or {}).get("provider", "gemini")
    dashboard_context = _build_dashboard_ai_context(exec_row, node_result.data or [], language)

    from app.config import settings
    processor = AIInsightsProcessor()
    prompt = processor._full_prompt(
        _build_prompt(report_data)
        + "\n\nDashboard context for structured analysis:\n"
        + json.dumps(dashboard_context, ensure_ascii=False, indent=2),
        language,
    )

    try:
        if provider == "openai":
            insights = processor._call_openai(prompt, settings.OPENAI_API_KEY)
        else:
            insights = processor._call_gemini(prompt, settings.GEMINI_API_KEY)
    except Exception:
        insights = _fallback_execution_insights(report_data, language)

    return {"insights": insights}


def _build_dashboard_ai_context(exec_row: Dict[str, Any], node_rows: list, language: str) -> Dict[str, Any]:
    columns = []
    filters = []
    existing_charts = []
    chart_count = 0
    for row in node_rows:
        output = row.get("output_json") or {}
        metadata = output.get("metadata") or {}
        if isinstance(metadata.get("columns"), list):
            columns = metadata["columns"]
        dashboard_config = output.get("dashboard_config") or {}
        if isinstance(dashboard_config, dict):
            filters = dashboard_config.get("filters") or filters
            panels = dashboard_config.get("panels") or []
            if isinstance(panels, list):
                existing_charts = [
                    {
                        "id": panel.get("id"),
                        "type": panel.get("type"),
                        "title": panel.get("title"),
                        "description": panel.get("description"),
                        "layout": panel.get("layout"),
                    }
                    for panel in panels
                    if isinstance(panel, dict)
                ]
                chart_count = len(existing_charts)
    return {
        "language": "tr" if language == "Turkish" else "en",
        "datasetColumnNames": [col.get("name") for col in columns if isinstance(col, dict)],
        "inferredColumnTypes": columns,
        "userSelectedFilters": filters,
        "chartCount": chart_count,
        "dashboardPageSize": {"width": 1920, "height": 1080},
        "existingCharts": existing_charts,
        "workflowId": exec_row.get("workflow_id"),
        "responsePreference": "Return structured JSON when proposing dashboard or report changes.",
    }


# ── Background task ───────────────────────────────────────────────────────────

def _execute_workflow_task(
    exec_id: str,
    workflow_id: str,
    graph_data: Dict[str, Any],
    workflow_name: str,
):
    """Runs in FastAPI BackgroundTasks. Executes the full workflow DAG."""
    from app.dependencies import get_supabase
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    # Mark as running
    supabase.table("workflow_executions").update({
        "status": "running", "started_at": now
    }).eq("id", exec_id).execute()
    exec_user_id = (
        supabase.table("workflow_executions")
        .select("user_id")
        .eq("id", exec_id)
        .single()
        .execute()
        .data or {}
    ).get("user_id")

    def on_node_status(node_id: str, status: str, metrics: Dict):
        """Called after each node completes."""
        _update_node_status(supabase, exec_id, node_id, status, metrics)

    try:
        # Inject server-only execution context into nodes that need it.
        for node in graph_data.get("nodes", []):
            if node.get("type") in ("report", "dashboard"):
                node.setdefault("data", {}).setdefault("config", {})["workflow_name"] = workflow_name
            if node.get("type") == "database_query" and exec_user_id:
                node.setdefault("data", {}).setdefault("config", {})["_user_id"] = exec_user_id

        engine = WorkflowExecutionEngine(graph_data, exec_id, on_node_status)
        summary = engine.execute()

        # Persist serializable outputs and error messages
        for node_id, node_summary in summary.items():
            output_json = _serialize_node_output(engine.node_outputs.get(node_id, {}))
            patch = {
                "output_json": output_json,
                "metrics": node_summary.get("metrics", {}),
            }
            if node_summary.get("error"):
                patch["error_message"] = node_summary["error"]
            supabase.table("node_execution_results").update(patch).eq("execution_id", exec_id).eq("node_id", node_id).execute()

        supabase.table("workflow_executions").update({
            "status": "success",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "result_summary": summary,
        }).eq("id", exec_id).execute()

        # Auto-save report if workflow contains a report node
        _auto_save_report(supabase, exec_id, workflow_id, workflow_name, graph_data, engine)

    except Exception as exc:
        supabase.table("workflow_executions").update({
            "status": "error",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "error_message": str(exc),
        }).eq("id", exec_id).execute()


def _update_node_status(supabase, exec_id: str, node_id: str, status: str, metrics: Dict):
    supabase.table("node_execution_results").update({
        "status": status,
        "metrics": metrics,
        "executed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("execution_id", exec_id).eq("node_id", node_id).execute()


def _serialize_node_output(output: Dict[str, Any]) -> Dict[str, Any]:
    """Strip non-serializable objects (DataFrames, Timestamps) from node output for DB storage."""
    import pandas as pd
    import numpy as np
    import math

    def safe_json(value):
        if isinstance(value, dict):
            return {str(k): safe_json(v) for k, v in value.items()}
        if isinstance(value, list):
            return [safe_json(item) for item in value]
        if isinstance(value, tuple):
            return [safe_json(item) for item in value]
        if isinstance(value, (pd.Timestamp, np.datetime64)):
            return str(value) if pd.notna(value) else None
        if value is pd.NaT:
            return None
        if isinstance(value, np.generic):
            value = value.item()
        if isinstance(value, float):
            return value if math.isfinite(value) else None
        try:
            if pd.isna(value):
                return None
        except Exception:
            pass
        return value

    result = {}
    for key, val in output.items():
        if isinstance(val, pd.DataFrame):
            sample = val.head(5).where(pd.notnull(val.head(5)), None).to_dict("records")
            result[key] = {
                "_type": "dataframe",
                "rows": len(val),
                "columns": list(val.columns),
                "sample": safe_json(sample),
            }
        elif isinstance(val, (str, int, float, bool, list, dict, tuple)) or val is None:
            result[key] = safe_json(val)
        elif isinstance(val, (pd.Timestamp, np.datetime64, pd.NaT)):
            result[key] = str(val) if pd.notna(val) else None
        elif isinstance(val, (pd.Series,)):
            result[key] = val.to_dict()
        elif hasattr(val, 'item'):  # numpy scalars
            result[key] = val.item()
        elif isinstance(val, bytes):
            result[key] = str(val)[:100]
        else:
            try:
                result[key] = str(val)
            except Exception:
                result[key] = None
    return result


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_execution(exec_id: str, user_id: str, supabase) -> dict:
    result = (
        supabase.table("workflow_executions")
        .select("*")
        .eq("id", exec_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Execution not found")
    return result.data


def _get_execution_for_dashboard_access(exec_id: str, user: dict, supabase, permission: str = "view") -> dict:
    result = (
        supabase.table("workflow_executions")
        .select("*")
        .eq("id", exec_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Execution not found")
    if result.data.get("user_id") == user.get("id"):
        return result.data
    if result.data.get("workspace_id"):
        require_workspace_member(supabase, user, result.data.get("workspace_id"))
        return result.data
    raise HTTPException(403, "You do not have permission to perform this action.")


def _node_rows(supabase, execution_id: str) -> list[dict]:
    return (
        supabase.table("node_execution_results")
        .select("*")
        .eq("execution_id", execution_id)
        .execute()
        .data or []
    )


def _execution_summary(row: dict, nodes: list[dict]) -> dict:
    return {
        "execution_id": row.get("id"),
        "workflow_id": row.get("workflow_id"),
        "status": row.get("status"),
        "created_at": row.get("created_at"),
        "started_at": row.get("started_at"),
        "completed_at": row.get("completed_at"),
        "duration_seconds": _duration_seconds(row),
        "node_count": len(nodes),
        "error_count": _error_count(nodes),
        "success_count": len([node for node in nodes if node.get("status") == "success"]),
    }


def _duration_seconds(row: dict) -> float:
    try:
        start = datetime.fromisoformat(str(row.get("started_at") or row.get("created_at")).replace("Z", "+00:00"))
        end = datetime.fromisoformat(str(row.get("completed_at") or row.get("created_at")).replace("Z", "+00:00"))
        return max(0.0, (end - start).total_seconds())
    except Exception:
        return 0.0


def _error_count(nodes: list[dict]) -> int:
    return len([node for node in nodes if node.get("status") == "error" or node.get("error_message")])


def _fallback_execution_insights(report_data: dict, language: str) -> str:
    sections = report_data.get("sections") or []
    tr = language == "Turkish"
    if tr:
        return f"Bu çalıştırmada {len(sections)} analiz bölümü üretildi. Önce eksik değerleri, sonra dağılım ve anomali çıktılarını kontrol edin. AI anahtarı yoksa bu kural tabanlı özet gösterilir."
    return f"This run produced {len(sections)} analysis sections. Review missing values first, then inspect distributions and anomalies. This rule-based summary is shown when the AI provider is unavailable."


def _auto_save_report(
    supabase, exec_id: str, workflow_id: str, workflow_name: str,
    graph_data: Dict, engine
) -> None:
    """If the workflow has a report node, persist its output to the reports table."""
    report_nodes = [n for n in graph_data.get("nodes", []) if n.get("type") == "report"]
    if not report_nodes:
        return

    report_node_id = report_nodes[0]["id"]
    report_output = engine.node_outputs.get(report_node_id, {})
    report_data = report_output.get("report_data")
    if not report_data:
        return

    # Get user_id from the execution row
    try:
        exec_row = supabase.table("workflow_executions").select("user_id, workspace_id, project_id").eq("id", exec_id).single().execute()
    except Exception:
        exec_row = supabase.table("workflow_executions").select("user_id").eq("id", exec_id).single().execute()
    exec_data = exec_row.data or {}
    user_id = exec_data.get("user_id", "dev-user-00000000-0000-0000-0000-000000000000")

    title = report_data.get("title", f"Analysis Report — {workflow_name}")
    safe_report_data = _serialize_node_output({"report_data": report_data}).get("report_data", report_data)
    now = datetime.now(timezone.utc).isoformat()

    try:
        insert_payload = {
            "id":           str(uuid.uuid4()),
            "execution_id": exec_id,
            "workflow_id":  workflow_id,
            "user_id":      user_id,
            "title":        title,
            "format":       "json",
            "storage_path": None,
            "report_data":  safe_report_data,
            "created_at":   now,
        }
        if exec_data.get("workspace_id"):
            insert_payload["workspace_id"] = exec_data.get("workspace_id")
            insert_payload["project_id"] = exec_data.get("project_id")
        supabase.table("reports").insert(insert_payload).execute()
    except Exception:
        pass  # Never crash the execution because of report saving
