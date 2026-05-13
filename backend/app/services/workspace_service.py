from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException


WORKSPACE_ROLES = ("owner", "admin", "analyst", "viewer", "guest")
WRITE_ROLES = {"owner", "admin", "analyst"}
ADMIN_ROLES = {"owner", "admin"}
WORKSPACE_NOT_READY = "Workspace storage is not ready. Apply migration 011_workspace_collaboration.sql."


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def personal_slug(user_id: str) -> str:
    return f"personal-{str(user_id)[:8]}"


def legacy_workspace(user: dict, name: str | None = None) -> dict:
    """Virtual workspace used while the Supabase workspace migration is not applied."""
    now = now_iso()
    return {
        "id": f"legacy-personal-{str(user.get('id', 'user'))[:8]}",
        "name": name or "Personal Workspace",
        "slug": personal_slug(user.get("id", "user")),
        "description": "Workspace tables are not installed yet; using your personal data scope.",
        "owner_id": user.get("id"),
        "avatar_url": None,
        "role": "owner",
        "storage_ready": False,
        "created_at": now,
        "updated_at": now,
        "stats": {"datasets": 0, "workflows": 0, "dashboards": 0, "reports": 0, "members": 1},
    }


def _safe_rows(query) -> list[dict]:
    try:
        data = query.execute().data
        if isinstance(data, list):
            return data
        return [data] if data else []
    except Exception as exc:
        message = str(exc)
        if "workspaces" in message or "workspace_members" in message or "Could not find" in message:
            raise HTTPException(503, WORKSPACE_NOT_READY) from exc
        raise


def is_workspace_not_ready(exc: Exception) -> bool:
    return isinstance(exc, HTTPException) and exc.status_code == 503 and "Workspace storage is not ready" in str(exc.detail)


def _safe_first(query) -> dict | None:
    rows = _safe_rows(query.limit(1))
    return rows[0] if rows else None


def ensure_personal_workspace(supabase, user: dict) -> dict:
    """Return at least one active workspace for the user, creating Personal Workspace lazily."""
    memberships = _safe_rows(
        supabase.table("workspace_members")
        .select("*")
        .eq("user_id", user["id"])
        .eq("status", "active")
    )
    if memberships:
        workspace_id = memberships[0].get("workspace_id")
        workspace = _safe_first(supabase.table("workspaces").select("*").eq("id", workspace_id))
        if workspace:
            return workspace

    slug = personal_slug(user["id"])
    workspace = _safe_first(supabase.table("workspaces").select("*").eq("slug", slug))
    if not workspace:
        workspace = {
            "id": str(uuid.uuid4()),
            "name": "Personal Workspace",
            "slug": slug,
            "description": "Your private Daflow workspace.",
            "owner_id": user["id"],
            "avatar_url": None,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        supabase.table("workspaces").insert(workspace).execute()

    existing_member = get_membership(supabase, user["id"], workspace["id"])
    if not existing_member:
        supabase.table("workspace_members").insert({
            "id": str(uuid.uuid4()),
            "workspace_id": workspace["id"],
            "user_id": user["id"],
            "role": "owner",
            "status": "active",
            "joined_at": now_iso(),
            "created_at": now_iso(),
        }).execute()
    return workspace


def list_user_workspaces(supabase, user: dict) -> list[dict]:
    try:
        ensure_personal_workspace(supabase, user)
    except HTTPException as exc:
        if is_workspace_not_ready(exc):
            return [legacy_workspace(user)]
        raise
    memberships = _safe_rows(
        supabase.table("workspace_members")
        .select("*")
        .eq("user_id", user["id"])
        .eq("status", "active")
    )
    workspaces = _safe_rows(supabase.table("workspaces").select("*"))
    by_id = {row.get("id"): row for row in workspaces}
    result = []
    for membership in memberships:
        workspace = by_id.get(membership.get("workspace_id"))
        if workspace:
            result.append({**workspace, "role": membership.get("role")})
    result.sort(key=lambda row: (row.get("name") != "Personal Workspace", row.get("created_at", "")))
    return result


def get_membership(supabase, user_id: str, workspace_id: str) -> dict | None:
    return _safe_first(
        supabase.table("workspace_members")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .eq("status", "active")
    )


def require_workspace_member(supabase, user: dict, workspace_id: str | None) -> tuple[str, dict]:
    if not workspace_id:
        workspace = ensure_personal_workspace(supabase, user)
        workspace_id = workspace["id"]
    membership = get_membership(supabase, user["id"], workspace_id)
    if not membership:
        raise HTTPException(403, "You do not have access to this workspace.")
    return workspace_id, membership


def require_workspace_role(supabase, user: dict, workspace_id: str | None, roles: set[str]) -> tuple[str, dict]:
    workspace_id, membership = require_workspace_member(supabase, user, workspace_id)
    if membership.get("role") not in roles:
        raise HTTPException(403, "You do not have permission to perform this action.")
    return workspace_id, membership


def can_manage_workspace(supabase, user: dict, workspace_id: str) -> bool:
    membership = get_membership(supabase, user["id"], workspace_id)
    return bool(membership and membership.get("role") in ADMIN_ROLES)


def can_invite_members(supabase, user: dict, workspace_id: str) -> bool:
    return can_manage_workspace(supabase, user, workspace_id)


def can_upload_file(supabase, user: dict, workspace_id: str) -> bool:
    membership = get_membership(supabase, user["id"], workspace_id)
    return bool(membership and membership.get("role") in WRITE_ROLES)


def can_create_workflow(supabase, user: dict, workspace_id: str) -> bool:
    return can_upload_file(supabase, user, workspace_id)


def can_edit_workflow(supabase, user: dict, workspace_id: str, workflow_id: str | None = None) -> bool:
    membership = get_membership(supabase, user["id"], workspace_id)
    return bool(membership and membership.get("role") in WRITE_ROLES)


def can_view_dashboard(supabase, user: dict, workspace_id: str, dashboard_id: str | None = None) -> bool:
    return bool(get_membership(supabase, user["id"], workspace_id))


def can_create_comment(supabase, user: dict, workspace_id: str) -> bool:
    return bool(get_membership(supabase, user["id"], workspace_id))


def log_activity(
    supabase,
    workspace_id: str | None,
    actor_id: str | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not workspace_id:
        return
    try:
        supabase.table("workspace_activity_logs").insert({
            "id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "metadata": metadata or {},
            "created_at": now_iso(),
        }).execute()
    except Exception:
        pass


def invitation_expiry(expiration: str | None) -> str | None:
    if expiration == "24h" or expiration == "1d":
        return (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    if expiration == "7d":
        return (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    return None


def new_invitation_token() -> str:
    return secrets.token_urlsafe(32)
