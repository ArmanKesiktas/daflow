import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user, get_supabase
from app.services.workspace_service import (
    ADMIN_ROLES,
    WORKSPACE_ROLES,
    WRITE_ROLES,
    ensure_personal_workspace,
    invitation_expiry,
    is_workspace_not_ready,
    legacy_workspace,
    list_user_workspaces,
    log_activity,
    new_invitation_token,
    now_iso,
    require_workspace_member,
    require_workspace_role,
)
from app.services.notification_service import create_notification, notify_workspace_members

router = APIRouter()


@router.get("/workspaces")
async def list_workspaces(user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    return list_user_workspaces(supabase, user)


@router.post("/workspaces")
async def create_workspace(payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Workspace name is required")
    slug = str(payload.get("slug") or _slugify(name)).strip().lower()
    workspace = {
        "id": str(uuid.uuid4()),
        "name": name,
        "slug": slug,
        "description": payload.get("description"),
        "owner_id": user["id"],
        "avatar_url": payload.get("avatar_url"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    try:
        _ensure_workspace_name_available(supabase, user["id"], name)
        supabase.table("workspaces").insert(workspace).execute()
        supabase.table("workspace_members").insert({
            "id": str(uuid.uuid4()),
            "workspace_id": workspace["id"],
            "user_id": user["id"],
            "role": "owner",
            "status": "active",
            "joined_at": now_iso(),
            "created_at": now_iso(),
        }).execute()
    except HTTPException:
        raise
    except Exception as exc:
        message = str(exc)
        if "workspaces" in message or "workspace_members" in message or "Could not find" in message:
            return legacy_workspace(user, name)
        raise
    log_activity(supabase, workspace["id"], user["id"], "workspace.created", "workspace", workspace["id"], {"name": name})
    create_notification(
        supabase,
        user["id"],
        workspace["id"],
        user["id"],
        "workspace.created",
        "Workspace created",
        f"{name} workspace was created.",
        {"workspace_name": name},
    )
    return {**workspace, "role": "owner"}


@router.get("/workspaces/{workspace_id}")
async def get_workspace(workspace_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    if workspace_id.startswith("legacy-personal-"):
        return legacy_workspace(user)
    try:
        workspace_id, membership = require_workspace_member(supabase, user, workspace_id)
        workspace = supabase.table("workspaces").select("*").eq("id", workspace_id).single().execute().data
    except HTTPException as exc:
        if is_workspace_not_ready(exc):
            return legacy_workspace(user)
        raise
    except Exception as exc:
        message = str(exc)
        if "workspaces" in message or "workspace_members" in message or "Could not find" in message:
            return legacy_workspace(user)
        raise
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    return {**workspace, "role": membership.get("role"), "stats": _workspace_stats(supabase, workspace_id)}


@router.patch("/workspaces/{workspace_id}")
async def update_workspace(workspace_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    require_workspace_role(supabase, user, workspace_id, ADMIN_ROLES)
    workspace = supabase.table("workspaces").select("id, owner_id").eq("id", workspace_id).single().execute().data
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    patch = {k: v for k, v in payload.items() if k in {"name", "slug", "description", "avatar_url"}}
    if "name" in patch:
        patch["name"] = str(patch["name"] or "").strip()
        if not patch["name"]:
            raise HTTPException(400, "Workspace name is required")
        _ensure_workspace_name_available(supabase, workspace.get("owner_id") or user["id"], patch["name"], exclude_id=workspace_id)
    patch["updated_at"] = now_iso()
    result = supabase.table("workspaces").update(patch).eq("id", workspace_id).execute()
    log_activity(supabase, workspace_id, user["id"], "workspace.updated", "workspace", workspace_id, patch)
    return (result.data or [{**patch, "id": workspace_id}])[0]


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    workspace = supabase.table("workspaces").select("*").eq("id", workspace_id).single().execute().data
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    if workspace.get("owner_id") != user["id"]:
        raise HTTPException(403, "Only the workspace owner can delete this workspace.")
    create_notification(
        supabase,
        user["id"],
        workspace_id,
        user["id"],
        "workspace.deleted",
        "Workspace deleted",
        f"{workspace.get('name') or 'Workspace'} was deleted.",
        {"workspace_name": workspace.get("name")},
    )
    supabase.table("workspaces").delete().eq("id", workspace_id).execute()
    return {"deleted": workspace_id}


@router.get("/workspaces/{workspace_id}/members")
async def list_members(workspace_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    if workspace_id.startswith("legacy-personal-"):
        return [{"id": user["id"], "workspace_id": workspace_id, "user_id": user["id"], "email": user.get("email"), "role": "owner", "status": "active"}]
    require_workspace_member(supabase, user, workspace_id)
    rows = supabase.table("workspace_members").select("*").eq("workspace_id", workspace_id).execute().data or []
    return [{**row, "email": user.get("email") if row.get("user_id") == user.get("id") else None} for row in rows if row.get("status") != "removed"]


@router.post("/workspaces/{workspace_id}/invitations")
async def create_invitation(workspace_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    require_workspace_role(supabase, user, workspace_id, ADMIN_ROLES)
    email = str(payload.get("email") or "").strip().lower()
    role = str(payload.get("role") or "viewer")
    if "@" not in email:
        raise HTTPException(400, "Valid email is required")
    if role not in {"admin", "analyst", "viewer", "guest"}:
        raise HTTPException(400, "Invalid role")
    row = {
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "email": email,
        "role": role,
        "token": new_invitation_token(),
        "invited_by": user["id"],
        "expires_at": invitation_expiry(str(payload.get("expiration") or "7d")),
        "accepted_at": None,
        "created_at": now_iso(),
    }
    supabase.table("workspace_invitations").insert(row).execute()
    log_activity(supabase, workspace_id, user["id"], "member.invited", "workspace", workspace_id, {"email": email, "role": role})
    notify_workspace_members(
        supabase,
        workspace_id,
        user["id"],
        "member.invited",
        "Member invited",
        f"{email} was invited as {role}.",
        {"email": email, "role": role},
        exclude_user_id=user["id"],
    )
    return {**row, "accept_url": f"/invitations/{row['token']}"}


@router.patch("/workspaces/{workspace_id}/members/{member_id}/role")
async def update_member_role(workspace_id: str, member_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    _, actor = require_workspace_role(supabase, user, workspace_id, ADMIN_ROLES)
    role = str(payload.get("role") or "")
    if role not in WORKSPACE_ROLES:
        raise HTTPException(400, "Invalid role")
    member = supabase.table("workspace_members").select("*").eq("id", member_id).eq("workspace_id", workspace_id).single().execute().data
    if not member:
        raise HTTPException(404, "Member not found")
    if member.get("role") == "owner" and actor.get("role") != "owner":
        raise HTTPException(403, "Only owners can change an owner role.")
    if role == "owner" and actor.get("role") != "owner":
        raise HTTPException(403, "Only owners can assign owner role.")
    result = supabase.table("workspace_members").update({"role": role}).eq("id", member_id).eq("workspace_id", workspace_id).execute()
    log_activity(supabase, workspace_id, user["id"], "member.role_changed", "member", member_id, {"role": role})
    create_notification(
        supabase,
        member.get("user_id"),
        workspace_id,
        user["id"],
        "member.role_changed",
        "Role changed",
        f"Your workspace role was changed to {role}.",
        {"role": role},
    )
    return (result.data or [{**member, "role": role}])[0]


@router.delete("/workspaces/{workspace_id}/members/{member_id}")
async def remove_member(workspace_id: str, member_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    _, actor = require_workspace_role(supabase, user, workspace_id, ADMIN_ROLES)
    member = supabase.table("workspace_members").select("*").eq("id", member_id).eq("workspace_id", workspace_id).single().execute().data
    if not member:
        raise HTTPException(404, "Member not found")
    if member.get("role") == "owner" and actor.get("role") != "owner":
        raise HTTPException(403, "Only owners can remove another owner.")
    if member.get("role") == "owner" and _owner_count(supabase, workspace_id) <= 1:
        raise HTTPException(400, "Assign another owner before removing the last owner.")
    supabase.table("workspace_members").update({"status": "removed"}).eq("id", member_id).execute()
    log_activity(supabase, workspace_id, user["id"], "member.removed", "member", member_id, {})
    return {"deleted": member_id}


@router.get("/invitations/{token}")
async def get_invitation(token: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    invite = supabase.table("workspace_invitations").select("*").eq("token", token).single().execute().data
    if not invite:
        raise HTTPException(404, "Invitation not found")
    workspace = supabase.table("workspaces").select("id, name, slug").eq("id", invite["workspace_id"]).single().execute().data
    return {**invite, "workspace": workspace}


@router.post("/invitations/{token}/accept")
async def accept_invitation(token: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    invite = supabase.table("workspace_invitations").select("*").eq("token", token).single().execute().data
    if not invite:
        raise HTTPException(404, "Invitation not found")
    if invite.get("accepted_at"):
        return {"accepted": True, "workspace_id": invite.get("workspace_id")}
    if invite.get("expires_at"):
        expires = datetime.fromisoformat(str(invite["expires_at"]).replace("Z", "+00:00"))
        if expires < datetime.now(timezone.utc):
            raise HTTPException(410, "Invitation expired")
    if user.get("email") and invite.get("email") and user["email"].lower() != invite["email"].lower():
        raise HTTPException(403, "This invitation belongs to another email address.")
    supabase.table("workspace_members").insert({
        "id": str(uuid.uuid4()),
        "workspace_id": invite["workspace_id"],
        "user_id": user["id"],
        "role": invite["role"],
        "status": "active",
        "joined_at": now_iso(),
        "created_at": now_iso(),
    }).execute()
    supabase.table("workspace_invitations").update({"accepted_at": now_iso()}).eq("id", invite["id"]).execute()
    log_activity(supabase, invite["workspace_id"], user["id"], "member.joined", "member", None, {"email": user.get("email")})
    notify_workspace_members(
        supabase,
        invite["workspace_id"],
        user["id"],
        "member.joined",
        "Member joined",
        f"{user.get('email') or 'A member'} joined the workspace.",
        {"email": user.get("email")},
        exclude_user_id=user["id"],
    )
    return {"accepted": True, "workspace_id": invite["workspace_id"]}


@router.get("/workspaces/{workspace_id}/projects")
async def list_projects(workspace_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    if workspace_id.startswith("legacy-personal-"):
        return []
    require_workspace_member(supabase, user, workspace_id)
    rows = supabase.table("workspace_projects").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).execute().data or []
    return [{**row, "stats": _project_stats(supabase, workspace_id, row["id"])} for row in rows]


@router.post("/workspaces/{workspace_id}/projects")
async def create_project(workspace_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    require_workspace_role(supabase, user, workspace_id, WRITE_ROLES)
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Project name is required")
    _ensure_project_name_available(supabase, workspace_id, name)
    row = {
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "name": name,
        "description": payload.get("description"),
        "created_by": user["id"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    supabase.table("workspace_projects").insert(row).execute()
    log_activity(supabase, workspace_id, user["id"], "project.created", "project", row["id"], {"name": name})
    return row


@router.patch("/projects/{project_id}")
async def update_project(project_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    project = _get_project(supabase, project_id)
    require_workspace_role(supabase, user, project["workspace_id"], WRITE_ROLES)
    patch = {k: v for k, v in payload.items() if k in {"name", "description"}}
    if "name" in patch:
        patch["name"] = str(patch["name"] or "").strip()
        if not patch["name"]:
            raise HTTPException(400, "Project name is required")
        _ensure_project_name_available(supabase, project["workspace_id"], patch["name"], exclude_id=project_id)
    patch["updated_at"] = now_iso()
    result = supabase.table("workspace_projects").update(patch).eq("id", project_id).execute()
    log_activity(supabase, project["workspace_id"], user["id"], "project.updated", "project", project_id, patch)
    return (result.data or [{**project, **patch}])[0]


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    project = _get_project(supabase, project_id)
    require_workspace_role(supabase, user, project["workspace_id"], WRITE_ROLES)
    supabase.table("workspace_projects").delete().eq("id", project_id).execute()
    log_activity(supabase, project["workspace_id"], user["id"], "project.deleted", "project", project_id, {})
    return {"deleted": project_id}


@router.get("/workspaces/{workspace_id}/activity")
async def list_activity(workspace_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    if workspace_id.startswith("legacy-personal-"):
        return []
    require_workspace_member(supabase, user, workspace_id)
    return (
        supabase.table("workspace_activity_logs")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=True)
        .limit(60)
        .execute()
        .data or []
    )


@router.get("/workspaces/{workspace_id}/comments")
async def list_comments(
    workspace_id: str,
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    if workspace_id.startswith("legacy-personal-"):
        return []
    require_workspace_member(supabase, user, workspace_id)
    query = supabase.table("workspace_comments").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True)
    if entity_type:
        query = query.eq("entity_type", entity_type)
    if entity_id:
        query = query.eq("entity_id", entity_id)
    return query.execute().data or []


@router.post("/workspaces/{workspace_id}/comments")
async def create_comment(workspace_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    require_workspace_member(supabase, user, workspace_id)
    content = str(payload.get("content") or "").strip()
    entity_type = str(payload.get("entity_type") or "")
    entity_id = str(payload.get("entity_id") or "")
    if not content or entity_type not in {"file", "workflow", "dashboard", "report", "node"} or not entity_id:
        raise HTTPException(400, "entity_type, entity_id and content are required")
    row = {
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "project_id": payload.get("project_id"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "node_id": payload.get("node_id"),
        "content": content,
        "created_by": user["id"],
        "resolved": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    supabase.table("workspace_comments").insert(row).execute()
    log_activity(supabase, workspace_id, user["id"], "comment.created", entity_type, entity_id, {"content": content[:120]})
    notify_workspace_members(
        supabase,
        workspace_id,
        user["id"],
        "comment.created",
        "New comment",
        f"{user.get('email') or 'A member'} commented on {entity_type}.",
        {"entity_type": entity_type, "entity_id": entity_id, "node_id": payload.get("node_id")},
        exclude_user_id=user["id"],
    )
    return row


@router.patch("/comments/{comment_id}")
async def update_comment(comment_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    row = supabase.table("workspace_comments").select("*").eq("id", comment_id).single().execute().data
    if not row:
        raise HTTPException(404, "Comment not found")
    _, membership = require_workspace_member(supabase, user, row["workspace_id"])
    if row.get("created_by") != user["id"] and membership.get("role") not in ADMIN_ROLES:
        raise HTTPException(403, "You do not have permission to update this comment.")
    patch = {k: v for k, v in payload.items() if k in {"content", "resolved"}}
    patch["updated_at"] = now_iso()
    result = supabase.table("workspace_comments").update(patch).eq("id", comment_id).execute()
    return (result.data or [{**row, **patch}])[0]


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    row = supabase.table("workspace_comments").select("*").eq("id", comment_id).single().execute().data
    if not row:
        raise HTTPException(404, "Comment not found")
    _, membership = require_workspace_member(supabase, user, row["workspace_id"])
    if row.get("created_by") != user["id"] and membership.get("role") not in ADMIN_ROLES:
        raise HTTPException(403, "You do not have permission to delete this comment.")
    supabase.table("workspace_comments").delete().eq("id", comment_id).execute()
    return {"deleted": comment_id}


def _workspace_stats(supabase, workspace_id: str) -> dict[str, int]:
    return {
        "datasets": _count(supabase, "uploaded_files", workspace_id),
        "workflows": _count(supabase, "workflows", workspace_id),
        "dashboards": _count(supabase, "dashboards", workspace_id),
        "reports": _count(supabase, "reports", workspace_id),
        "members": len(supabase.table("workspace_members").select("id").eq("workspace_id", workspace_id).eq("status", "active").execute().data or []),
    }


def _project_stats(supabase, workspace_id: str, project_id: str) -> dict[str, int]:
    return {
        "datasets": _count(supabase, "uploaded_files", workspace_id, project_id),
        "workflows": _count(supabase, "workflows", workspace_id, project_id),
        "dashboards": _count(supabase, "dashboards", workspace_id, project_id),
        "reports": _count(supabase, "reports", workspace_id, project_id),
    }


def _count(supabase, table: str, workspace_id: str, project_id: str | None = None) -> int:
    query = supabase.table(table).select("id").eq("workspace_id", workspace_id)
    if project_id:
        query = query.eq("project_id", project_id)
    return len(query.execute().data or [])


def _owner_count(supabase, workspace_id: str) -> int:
    return len(
        supabase.table("workspace_members")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("role", "owner")
        .eq("status", "active")
        .execute()
        .data or []
    )


def _get_project(supabase, project_id: str) -> dict:
    project = supabase.table("workspace_projects").select("*").eq("id", project_id).single().execute().data
    if not project:
        raise HTTPException(404, "Project not found")
    return project


def _normalize_name(value: Any) -> str:
    return " ".join(str(value or "").strip().casefold().split())


def _has_matching_name(rows: list[dict], name: str, exclude_id: str | None = None) -> bool:
    normalized = _normalize_name(name)
    return any(
        _normalize_name(row.get("name")) == normalized and str(row.get("id")) != str(exclude_id)
        for row in rows
    )


def _ensure_workspace_name_available(supabase, owner_id: str, name: str, exclude_id: str | None = None) -> None:
    rows = supabase.table("workspaces").select("id, name").eq("owner_id", owner_id).execute().data or []
    if _has_matching_name(rows, name, exclude_id):
        raise HTTPException(409, "Aynı isimle workspace oluşturamazsınız.")


def _ensure_project_name_available(supabase, workspace_id: str, name: str, exclude_id: str | None = None) -> None:
    rows = supabase.table("workspace_projects").select("id, name").eq("workspace_id", workspace_id).execute().data or []
    if _has_matching_name(rows, name, exclude_id):
        raise HTTPException(409, "Aynı isimle proje oluşturamazsınız.")


def _slugify(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")
    return f"{cleaned or 'workspace'}-{str(uuid.uuid4())[:8]}"
