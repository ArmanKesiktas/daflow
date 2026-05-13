import uuid
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user, get_supabase
from app.services.workspace_service import WRITE_ROLES, is_workspace_not_ready, log_activity, require_workspace_member, require_workspace_role
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowListItem,
    WorkflowResponse,
    WorkflowSave,
)

router = APIRouter()


@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    payload: WorkflowCreate,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    workspace_id = payload.workspace_id
    try:
        workspace_id, _ = require_workspace_role(supabase, user, payload.workspace_id, WRITE_ROLES)
    except HTTPException as exc:
        if not is_workspace_not_ready(exc):
            raise
        workspace_id = None
    wf_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    graph_data = {
        "nodes": [n.model_dump() for n in payload.nodes],
        "edges": [e.model_dump() for e in payload.edges],
        "viewport": payload.viewport.model_dump(),
    }
    insert_payload = {
        "id": wf_id,
        "user_id": user["id"],
        "name": payload.name,
        "description": payload.description,
        "graph_data": graph_data,
        "created_at": now,
        "updated_at": now,
    }
    if workspace_id:
        insert_payload["workspace_id"] = workspace_id
        insert_payload["project_id"] = payload.project_id
    supabase.table("workflows").insert(insert_payload).execute()
    _create_workflow_version(supabase, wf_id, user["id"], payload.name, graph_data)
    log_activity(supabase, workspace_id, user["id"], "workflow.created", "workflow", wf_id, {"name": payload.name})

    return _build_response(wf_id, payload.name, payload.description, graph_data, user["id"], now, now, workspace_id, payload.project_id)


@router.get("/", response_model=List[WorkflowListItem])
async def list_workflows(
    workspace_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    try:
        workspace_id, _ = require_workspace_member(supabase, user, workspace_id)
        query = (
            supabase.table("workflows")
            .select("id, name, description, graph_data, updated_at, workspace_id, project_id")
            .eq("workspace_id", workspace_id)
        )
        if project_id:
            query = query.eq("project_id", project_id)
        result = query.order("updated_at", desc=True).execute()
    except HTTPException as exc:
        if not is_workspace_not_ready(exc):
            raise
        result = (
            supabase.table("workflows")
            .select("id, name, description, graph_data, updated_at")
            .eq("user_id", user["id"])
            .order("updated_at", desc=True)
            .execute()
        )
    items = []
    for row in result.data:
        node_count = len(row.get("graph_data", {}).get("nodes", []))
        items.append(WorkflowListItem(
            id=row["id"],
            name=row["name"],
            description=row.get("description"),
            node_count=node_count,
            updated_at=row["updated_at"],
            workspace_id=row.get("workspace_id"),
            project_id=row.get("project_id"),
        ))
    return items


@router.get("/shared-with-me")
async def list_shared_workflows(
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """List all workflows shared with the current user."""
    email = (user.get("email") or "").lower()
    user_id = user.get("id")
    rows = []
    if email:
        rows.extend(
            supabase.table("workflow_shares")
            .select("*")
            .eq("shared_with_email", email)
            .order("created_at", desc=True)
            .execute()
            .data or []
        )
    if user_id:
        rows.extend(
            supabase.table("workflow_shares")
            .select("*")
            .eq("shared_with_user_id", user_id)
            .order("created_at", desc=True)
            .execute()
            .data or []
        )
    now = datetime.now(timezone.utc)
    active = []
    seen = set()
    for share in rows:
        share_id = share.get("id")
        if share_id in seen:
            continue
        seen.add(share_id)
        expires_at = share.get("expires_at")
        if expires_at:
            try:
                exp = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
                if exp < now:
                    continue
            except Exception:
                continue
        active.append(share)

    result = []
    for share in active:
        wf_row = supabase.table("workflows").select("id, name, description, graph_data, created_at, updated_at").eq("id", share.get("workflow_id")).single().execute().data
        if not wf_row:
            continue
        node_count = len(wf_row.get("graph_data", {}).get("nodes", []))
        result.append({
            "share_id": share.get("id"),
            "id": wf_row.get("id"),
            "workflow_id": wf_row.get("id"),
            "name": wf_row.get("name"),
            "description": wf_row.get("description"),
            "node_count": node_count,
            "owner": share.get("owner_email") or share.get("owner_id"),
            "permission": share.get("permission"),
            "expires_at": share.get("expires_at"),
            "created_at": share.get("created_at"),
            "updated_at": wf_row.get("updated_at"),
        })

    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return result


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _require_workflow_permission(supabase, user, workflow_id, "view")
    gd = row.get("graph_data", {})
    return _build_response(
        row["id"], row["name"], row.get("description"),
        gd, row["user_id"], row["created_at"], row["updated_at"], row.get("workspace_id"), row.get("project_id"),
    )


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def save_workflow(
    workflow_id: str,
    payload: WorkflowSave,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _require_workflow_permission(supabase, user, workflow_id, "edit")

    now = datetime.now(timezone.utc).isoformat()
    graph_data = {
        "nodes": [n.model_dump() for n in payload.nodes],
        "edges": [e.model_dump() for e in payload.edges],
        "viewport": payload.viewport.model_dump(),
    }
    update_payload = {"graph_data": graph_data, "updated_at": now}
    if payload.name:
        update_payload["name"] = payload.name
    if payload.description is not None:
        update_payload["description"] = payload.description
    if payload.project_id is not None:
        update_payload["project_id"] = payload.project_id

    supabase.table("workflows").update(update_payload).eq("id", workflow_id).execute()
    log_activity(supabase, row.get("workspace_id"), user["id"], "workflow.updated", "workflow", workflow_id, {"name": payload.name or row.get("name")})

    row = supabase.table("workflows").select("*").eq("id", workflow_id).single().execute().data
    _create_workflow_version(supabase, workflow_id, row["user_id"], row["name"], graph_data)
    return _build_response(
        row["id"], row["name"], row.get("description"),
        graph_data, row["user_id"], row["created_at"], row["updated_at"], row.get("workspace_id"), row.get("project_id"),
    )


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _require_workflow_permission(supabase, user, workflow_id, "edit")
    supabase.table("workflows").delete().eq("id", workflow_id).execute()
    log_activity(supabase, row.get("workspace_id"), user["id"], "workflow.deleted", "workflow", workflow_id, {"name": row.get("name")})
    return {"deleted": workflow_id}


@router.post("/{workflow_id}/fork")
async def fork_workflow(
    workflow_id: str,
    payload: dict = {},
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _require_workflow_permission(supabase, user, workflow_id, "view")
    workspace_id = str(payload.get("workspace_id") or row.get("workspace_id") or "")
    workspace_id, _ = require_workspace_role(supabase, user, workspace_id, WRITE_ROLES)
    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    name = str(payload.get("name") or f"{row.get('name', 'Workflow')} Copy")
    graph_data = row.get("graph_data") or {"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 0.82}}
    insert_payload = {
        "id": new_id,
        "user_id": user["id"],
        "name": name,
        "description": row.get("description"),
        "graph_data": graph_data,
        "created_at": now,
        "updated_at": now,
    }
    if workspace_id:
        insert_payload["workspace_id"] = workspace_id
        insert_payload["project_id"] = payload.get("project_id") if "project_id" in payload else row.get("project_id")
    supabase.table("workflows").insert(insert_payload).execute()
    _create_workflow_version(supabase, new_id, user["id"], name, graph_data)
    log_activity(supabase, workspace_id, user["id"], "workflow.created", "workflow", new_id, {"forked_from": workflow_id})
    return {"id": new_id, "name": name}


@router.get("/{workflow_id}/versions")
async def list_workflow_versions(
    workflow_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _require_workflow_permission(supabase, user, workflow_id, "view")
    try:
        result = (
            supabase.table("workflow_versions")
            .select("*")
            .eq("workflow_id", workflow_id)
            .eq("user_id", row["user_id"])
            .order("version_number", desc=True)
            .limit(50)
            .execute()
        )
        return result.data or []
    except Exception:
        return []


@router.post("/{workflow_id}/versions")
async def create_workflow_version(
    workflow_id: str,
    payload: dict = {},
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _require_workflow_permission(supabase, user, workflow_id, "edit")
    version = _create_workflow_version(
        supabase,
        workflow_id,
        row["user_id"],
        str(payload.get("name") or row.get("name") or "Workflow"),
        row.get("graph_data") or {},
    )
    return version


@router.post("/{workflow_id}/restore/{version_id}", response_model=WorkflowResponse)
async def restore_workflow_version(
    workflow_id: str,
    version_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _require_workflow_permission(supabase, user, workflow_id, "edit")
    try:
        version = (
            supabase.table("workflow_versions")
            .select("*")
            .eq("id", version_id)
            .eq("workflow_id", workflow_id)
            .single()
            .execute()
            .data
        )
    except Exception:
        version = None
    if not version:
        raise HTTPException(404, "Version not found")
    graph_data = version.get("graph_data") or {}
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("workflows").update({
        "name": version.get("name") or row.get("name"),
        "graph_data": graph_data,
        "updated_at": now,
    }).eq("id", workflow_id).execute()
    _create_workflow_version(supabase, workflow_id, row["user_id"], version.get("name") or row.get("name"), graph_data)
    return _build_response(workflow_id, version.get("name") or row.get("name"), row.get("description"), graph_data, row["user_id"], row["created_at"], now, row.get("workspace_id"), row.get("project_id"))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fetch_workflow(workflow_id: str, user_id: str, supabase) -> dict:
    """Fetch a workflow by ID. Used by owner-only operations."""
    result = (
        supabase.table("workflows")
        .select("*")
        .eq("id", workflow_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, f"Workflow '{workflow_id}' not found")
    return result.data


def _build_response(wf_id, name, description, graph_data, user_id, created_at, updated_at, workspace_id=None, project_id=None):
    from app.schemas.workflow import WorkflowNode, WorkflowEdge, Viewport, NodePosition

    def parse_nodes(raw):
        nodes = []
        for n in raw:
            pos = n.get("position", {})
            nodes.append(WorkflowNode(
                id=n["id"], type=n.get("type", ""),
                position=NodePosition(x=pos.get("x", 0), y=pos.get("y", 0)),
                data=n.get("data", {}),
            ))
        return nodes

    def parse_edges(raw):
        return [WorkflowEdge(**e) for e in raw]

    vp = graph_data.get("viewport", {})
    return WorkflowResponse(
        id=wf_id,
        name=name,
        description=description,
        nodes=parse_nodes(graph_data.get("nodes", [])),
        edges=parse_edges(graph_data.get("edges", [])),
        viewport=Viewport(x=vp.get("x", 0), y=vp.get("y", 0), zoom=vp.get("zoom", 0.82)),
        user_id=user_id,
        workspace_id=workspace_id,
        project_id=project_id,
        created_at=created_at,
        updated_at=updated_at,
    )


def _create_workflow_version(supabase, workflow_id: str, user_id: str, name: str, graph_data: dict) -> dict:
    try:
        existing = (
            supabase.table("workflow_versions")
            .select("version_number")
            .eq("workflow_id", workflow_id)
            .order("version_number", desc=True)
            .limit(1)
            .execute()
            .data or []
        )
        version_number = int(existing[0].get("version_number", 0)) + 1 if existing else 1
        row = {
            "id": str(uuid.uuid4()),
            "workflow_id": workflow_id,
            "user_id": user_id,
            "name": name or "Workflow",
            "graph_data": graph_data,
            "version_number": version_number,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("workflow_versions").insert(row).execute()
        return row
    except Exception:
        return {}


# ── Workflow Sharing ─────────────────────────────────────────────────────────

def _has_workflow_permission(supabase, user: dict, workflow_id: str, permission: str) -> tuple[bool, str]:
    """Check if user has permission to access a workflow (owner or via share)."""
    try:
        row = supabase.table("workflows").select("user_id, workspace_id").eq("id", workflow_id).single().execute().data
    except Exception as exc:
        message = str(exc)
        if "workspace_id" in message or "Could not find" in message:
            row = supabase.table("workflows").select("user_id").eq("id", workflow_id).single().execute().data
        else:
            raise
    if not row:
        return False, "Workflow not found"
    if row.get("user_id") == user.get("id"):
        return True, "owner"
    workspace_id = row.get("workspace_id")
    if workspace_id:
        try:
            if permission == "view":
                require_workspace_member(supabase, user, workspace_id)
                return True, "workspace"
            require_workspace_role(supabase, user, workspace_id, WRITE_ROLES)
            return True, "workspace"
        except HTTPException as exc:
            if is_workspace_not_ready(exc):
                return False, "Workspace storage is not ready."
            return False, str(exc.detail)
    if permission == "owner":
        return False, "Only the workflow owner can perform this action."
    email = (user.get("email") or "").lower()
    user_id = user.get("id")
    try:
        shares = (
            supabase.table("workflow_shares")
            .select("shared_with_email, shared_with_user_id, permission, expires_at")
            .eq("workflow_id", workflow_id)
            .execute()
            .data or []
        )
    except Exception:
        shares = []
    now = datetime.now(timezone.utc)
    required = 1 if permission == "edit" else 0
    for share in shares:
        if share.get("shared_with_user_id") == user_id or (email and share.get("shared_with_email", "").lower() == email):
            expires_at = share.get("expires_at")
            if expires_at:
                try:
                    exp = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
                    if exp < now:
                        continue
                except Exception:
                    continue
            granted = share.get("permission", "view")
            granted_level = 1 if granted == "edit" else 0
            if granted_level >= required:
                return True, f"shared:{granted}"
            return False, "You do not have permission to edit this workflow."
    return False, "You do not have permission to access this workflow."


def _require_workflow_permission(supabase, user: dict, workflow_id: str, permission: str) -> dict:
    """Get workflow if user has permission, else raise 403."""
    row = supabase.table("workflows").select("*").eq("id", workflow_id).single().execute().data
    if not row:
        raise HTTPException(404, "Workflow not found")
    allowed, reason = _has_workflow_permission(supabase, user, workflow_id, permission)
    if not allowed:
        raise HTTPException(403, reason)
    return row


def _workflow_share_expires_at(expiration: str) -> str | None:
    if expiration == "24h":
        return (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    if expiration == "7d":
        return (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    return None


@router.get("/{workflow_id}/shares")
async def list_workflow_shares(
    workflow_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """List all shares for a workflow (owner only)."""
    _require_workflow_permission(supabase, user, workflow_id, "owner")
    shares = (
        supabase.table("workflow_shares")
        .select("*")
        .eq("workflow_id", workflow_id)
        .order("created_at", desc=True)
        .execute()
        .data or []
    )
    return shares


@router.post("/{workflow_id}/shares")
async def share_workflow(
    workflow_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Share a workflow with another user by email."""
    row = _require_workflow_permission(supabase, user, workflow_id, "owner")
    email = str(payload.get("email", "")).strip().lower()
    permission = str(payload.get("permission", "view"))
    expiration = str(payload.get("expiration", "7d"))
    if not email or "@" not in email:
        raise HTTPException(400, "Valid email is required")
    if permission not in {"view", "edit"}:
        raise HTTPException(400, "Invalid permission")
    if expiration not in {"24h", "7d", "never"}:
        raise HTTPException(400, "Invalid expiration")

    share = {
        "id": str(uuid.uuid4()),
        "workflow_id": workflow_id,
        "owner_id": user["id"],
        "owner_email": user.get("email", ""),
        "shared_with_email": email,
        "shared_with_user_id": payload.get("shared_with_user_id"),
        "permission": permission,
        "expires_at": _workflow_share_expires_at(expiration),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    supabase.table("workflow_shares").delete().eq("workflow_id", workflow_id).eq("shared_with_email", email).execute()
    supabase.table("workflow_shares").insert(share).execute()
    return share


@router.delete("/{workflow_id}/shares/{share_id}")
async def revoke_workflow_share(
    workflow_id: str,
    share_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Revoke a workflow share (owner only)."""
    _require_workflow_permission(supabase, user, workflow_id, "owner")
    supabase.table("workflow_shares").delete().eq("id", share_id).eq("workflow_id", workflow_id).execute()
    return {"deleted": share_id}
