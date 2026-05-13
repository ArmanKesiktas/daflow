"""
Dashboards routes — list all executions that produced a dashboard_config output
and manage SecureShare links for dashboard executions.
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
import base64
import json

from app.dependencies import get_current_user, get_supabase
from app.services.secure_share import (
    create_content_share,
    delete_content_share,
    list_active_content_shares_for_current_user,
)
from app.services.workspace_service import is_workspace_not_ready, require_workspace_member

router = APIRouter()


def _dashboard_config_for_execution(supabase, execution_id: str) -> dict | None:
    node_result = (
        supabase.table("node_execution_results")
        .select("output_json")
        .eq("execution_id", execution_id)
        .eq("status", "success")
        .execute()
    )
    for row in node_result.data or []:
        output = row.get("output_json") or {}
        dashboard_config = output.get("dashboard_config")
        if isinstance(dashboard_config, dict) and dashboard_config.get("panels"):
            return dashboard_config
    return None


def _get_dashboard_execution(supabase, execution_id: str) -> dict:
    row = supabase.table("workflow_executions").select("*").eq("id", execution_id).single().execute().data
    if not row:
        raise HTTPException(404, "Dashboard not found")
    return row


@router.get("/")
async def list_dashboards(
    workspace_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """
    Return a list of executions that contain a dashboard node output.
    Scans node_execution_results for rows with a non-null dashboard_config key
    in output_json, then enriches each with workflow name.
    """
    try:
        query = supabase.table("workflow_executions").select("id, workflow_id, created_at, status, workspace_id, project_id")
        if workspace_id:
            workspace_id, _ = require_workspace_member(supabase, user, workspace_id)
            query = query.eq("workspace_id", workspace_id)
            if project_id:
                query = query.eq("project_id", project_id)
        else:
            query = query.eq("user_id", user["id"])
        exec_result = query.eq("status", "success").order("created_at", desc=True).execute()
    except HTTPException as exc:
        if not is_workspace_not_ready(exc):
            raise
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

    # DevStoreClient does not support `.in_()`, so fetch rows and filter in Python.
    node_result = (
        supabase.table("node_execution_results")
        .select("execution_id, output_json")
        .eq("status", "success")
        .execute()
    )
    node_rows = [
        row for row in (node_result.data or [])
        if row.get("execution_id") in exec_map
    ]

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

    # DevStoreClient does not support `.in_()`, so fetch workflows and filter in Python.
    wf_result = supabase.table("workflows").select("id, name").execute()
    wf_map = {
        w["id"]: w["name"]
        for w in (wf_result.data or [])
        if w.get("id") in {exec_map[eid]["workflow_id"] for eid in dashboard_exec_ids}
    }

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


@router.get("/shared-with-me")
async def shared_with_me(
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
    authorization: str | None = Header(default=None),
):
    # If DEV_MODE and user is the fixed dev user, try to decode Authorization header to
    # derive the real email used in the synthetic token so shared-with-me works locally.
    if (user.get("email") == "dev@localhost") and authorization and authorization.lower().startswith("bearer "):
        try:
            token = authorization.split(" ", 1)[1].strip()
            parts = token.split('.')
            if len(parts) >= 2:
                payload_b64 = parts[1]
                padding = '=' * (-len(payload_b64) % 4)
                raw = base64.urlsafe_b64decode((payload_b64 + padding).encode('utf-8'))
                payload = json.loads(raw.decode('utf-8')) or {}
                if payload.get('email'):
                    user = {"id": payload.get('sub') or user.get('id'), "email": payload.get('email')}
        except Exception:
            pass

    shares = list_active_content_shares_for_current_user(supabase, user, "dashboard")
    if not shares:
        return []

    seen: set[str] = set()
    result: list[dict] = []
    for share in shares:
        execution_id = str(share.get("resource_id") or "")
        if not execution_id or execution_id in seen:
            continue
        seen.add(execution_id)

        exec_row = supabase.table("workflow_executions").select("*").eq("id", execution_id).single().execute().data
        if not exec_row:
            continue
        dashboard_config = _dashboard_config_for_execution(supabase, execution_id)
        if not dashboard_config:
            continue

        wf_row = supabase.table("workflows").select("name").eq("id", exec_row.get("workflow_id")).single().execute().data or {}
        result.append({
            "share_id": share.get("id"),
            "execution_id": execution_id,
            "title": dashboard_config.get("title", "Dashboard"),
            "owner": exec_row.get("user_id"),
            "permission": share.get("permission", "view"),
            "expires_at": share.get("expires_at"),
            "created_at": share.get("created_at") or exec_row.get("created_at"),
            "panel_count": len(dashboard_config.get("panels", [])),
            "workflow_name": wf_row.get("name", "Untitled"),
        })

    result.sort(key=lambda item: item["created_at"], reverse=True)
    return result


@router.post("/{execution_id}/shares")
async def share_dashboard(
    execution_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    exec_row = _get_dashboard_execution(supabase, execution_id)
    if not _dashboard_config_for_execution(supabase, execution_id):
        raise HTTPException(404, "Dashboard not found")
    return create_content_share(supabase, user, "dashboard", execution_id, exec_row.get("user_id", ""), payload)


@router.delete("/{execution_id}/shares/{share_id}")
async def revoke_dashboard_share(
    execution_id: str,
    share_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    exec_row = _get_dashboard_execution(supabase, execution_id)
    delete_content_share(supabase, user, "dashboard", execution_id, exec_row.get("user_id", ""), share_id)
    return {"deleted": True}
