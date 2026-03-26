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

from app.config import settings
from app.core.execution_engine import WorkflowExecutionEngine, _compute_node_hash
from app.dependencies import get_current_user, get_supabase
from app.schemas.execution import ExecutionStatusResponse, NodeResultResponse

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
    # Verify ownership
    wf_result = (
        supabase.table("workflows")
        .select("id, graph_data, name")
        .eq("id", workflow_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not wf_result.data:
        raise HTTPException(404, "Workflow not found")

    workflow_data = wf_result.data

    # Create execution record
    exec_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("workflow_executions").insert({
        "id": exec_id,
        "workflow_id": workflow_id,
        "user_id": user["id"],
        "status": "pending",
        "created_at": now,
    }).execute()

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
    exec_row = _get_execution(execution_id, user["id"], supabase)
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


@router.get("/{execution_id}/results/{node_id}", response_model=NodeResultResponse)
async def get_node_result(
    execution_id: str,
    node_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    # Verify ownership via execution
    _get_execution(execution_id, user["id"], supabase)

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

    language: str = (payload or {}).get("language", "English")
    provider: str = (payload or {}).get("provider", "gemini")

    from app.config import settings
    processor = AIInsightsProcessor()
    prompt = processor._full_prompt(_build_prompt(report_data), language)

    if provider == "openai":
        insights = processor._call_openai(prompt, settings.OPENAI_API_KEY)
    else:
        insights = processor._call_gemini(prompt, settings.GEMINI_API_KEY)

    return {"insights": insights}


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

    def on_node_status(node_id: str, status: str, metrics: Dict):
        """Called after each node completes."""
        _update_node_status(supabase, exec_id, node_id, status, metrics)

    try:
        # Inject workflow_name into report/dashboard nodes
        for node in graph_data.get("nodes", []):
            if node.get("type") in ("report", "dashboard"):
                node.setdefault("data", {}).setdefault("config", {})["workflow_name"] = workflow_name

        # Build cache_store from the most recent successful execution
        cache_store: Dict[str, Any] = {}
        try:
            prev_exec = (
                supabase.table("workflow_executions")
                .select("id")
                .eq("workflow_id", workflow_id)
                .eq("status", "success")
                .neq("id", exec_id)
                .order("completed_at", desc=True)
                .limit(1)
                .execute()
            )
            if prev_exec.data:
                prev_id = prev_exec.data[0]["id"]
                prev_nodes = (
                    supabase.table("node_execution_results")
                    .select("config_hash, output_json")
                    .eq("execution_id", prev_id)
                    .execute()
                )
                for row in (prev_nodes.data or []):
                    if row.get("config_hash") and row.get("output_json"):
                        cache_store[row["config_hash"]] = row["output_json"]
        except Exception:
            pass  # Cache building is best-effort; never block execution

        engine = WorkflowExecutionEngine(graph_data, exec_id, on_node_status, cache_store=cache_store)
        summary = engine.execute()

        # Persist serializable outputs, config hashes, and error messages
        for node_id, node_summary in summary.items():
            output_json = _serialize_node_output(engine.node_outputs.get(node_id, {}))
            patch: Dict[str, Any] = {
                "output_json": output_json,
                "metrics": node_summary.get("metrics", {}),
            }
            # Store the config hash for future cache lookups
            if node_id in engine.node_hashes:
                patch["config_hash"] = engine.node_hashes[node_id]
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
    """Strip non-serializable objects (DataFrames) from node output for DB storage."""
    import pandas as pd
    result = {}
    for key, val in output.items():
        if isinstance(val, pd.DataFrame):
            result[key] = {
                "_type": "dataframe",
                "rows": len(val),
                "columns": list(val.columns),
                "sample": val.head(5).fillna("").to_dict("records"),
            }
        elif isinstance(val, (str, int, float, bool, list, dict)) or val is None:
            result[key] = val
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
    exec_row = supabase.table("workflow_executions").select("user_id").eq("id", exec_id).single().execute()
    user_id = (exec_row.data or {}).get("user_id", "dev-user-00000000-0000-0000-0000-000000000000")

    title = report_data.get("title", f"Analysis Report — {workflow_name}")
    now = datetime.now(timezone.utc).isoformat()

    try:
        supabase.table("reports").insert({
            "id":           str(uuid.uuid4()),
            "execution_id": exec_id,
            "workflow_id":  workflow_id,
            "user_id":      user_id,
            "title":        title,
            "format":       "json",
            "storage_path": None,
            "report_data":  report_data,
            "created_at":   now,
        }).execute()
    except Exception:
        pass  # Never crash the execution because of report saving
