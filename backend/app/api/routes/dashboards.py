"""
Dashboards routes — list all executions that produced a dashboard_config output.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_supabase

router = APIRouter()


@router.get("/")
async def list_dashboards(
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """
    Return a list of executions that contain a dashboard node output.
    Scans node_execution_results for rows with a non-null dashboard_config key
    in output_json, then enriches each with workflow name.
    """
    # Get all successful executions for this user
    exec_result = (
        supabase.table("workflow_executions")
        .select("id, workflow_id, created_at, status")
        .eq("user_id", user["id"])
        .eq("status", "success")
        .order("created_at", desc=True)
        .execute()
    )
    executions = exec_result.data or []
    if not executions:
        return []

    exec_ids = [e["id"] for e in executions]

    # Build a quick lookup: exec_id → (workflow_id, created_at)
    exec_map = {e["id"]: e for e in executions}

    # Get all node results for these executions that have status == "success"
    node_result = (
        supabase.table("node_execution_results")
        .select("execution_id, output_json")
        .in_("execution_id", exec_ids)
        .eq("status", "success")
        .execute()
    )
    node_rows = node_result.data or []

    # Find executions that have a dashboard_config in any node output
    dashboard_exec_ids: dict[str, dict] = {}
    for row in node_rows:
        exec_id = row["execution_id"]
        if exec_id in dashboard_exec_ids:
            continue  # already found one for this execution
        output = row.get("output_json") or {}
        dc = output.get("dashboard_config")
        if dc and isinstance(dc, dict) and dc.get("panels"):
            dashboard_exec_ids[exec_id] = dc

    if not dashboard_exec_ids:
        return []

    # Collect unique workflow IDs
    workflow_ids = list({exec_map[eid]["workflow_id"] for eid in dashboard_exec_ids})

    wf_result = (
        supabase.table("workflows")
        .select("id, name")
        .in_("id", workflow_ids)
        .execute()
    )
    wf_map = {w["id"]: w["name"] for w in (wf_result.data or [])}

    items = []
    for exec_id, dc in dashboard_exec_ids.items():
        ex = exec_map[exec_id]
        wf_id = ex["workflow_id"]
        items.append({
            "execution_id": exec_id,
            "workflow_id": wf_id,
            "workflow_name": wf_map.get(wf_id, "Untitled"),
            "title": dc.get("title", "Dashboard"),
            "panel_count": len(dc.get("panels", [])),
            "created_at": ex["created_at"],
        })

    # Sort by created_at descending
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items
