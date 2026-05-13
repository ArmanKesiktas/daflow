import uuid
from typing import Any

from app.services.workspace_service import now_iso


def create_notification(
    supabase,
    user_id: str | None,
    workspace_id: str | None,
    actor_id: str | None,
    action: str,
    title: str,
    body: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not user_id:
        return
    try:
        supabase.table("notifications").insert({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "workspace_id": workspace_id,
            "actor_id": actor_id,
            "action": action,
            "title": title,
            "body": body,
            "metadata": metadata or {},
            "read_at": None,
            "created_at": now_iso(),
        }).execute()
    except Exception:
        # Notifications are a product convenience; they must not break core flows.
        return


def notify_workspace_members(
    supabase,
    workspace_id: str,
    actor_id: str | None,
    action: str,
    title: str,
    body: str,
    metadata: dict[str, Any] | None = None,
    exclude_user_id: str | None = None,
) -> None:
    try:
        members = (
            supabase.table("workspace_members")
            .select("user_id")
            .eq("workspace_id", workspace_id)
            .eq("status", "active")
            .execute()
            .data or []
        )
    except Exception:
        members = []
    for member in members:
        target = member.get("user_id")
        if target and target != exclude_user_id:
            create_notification(supabase, target, workspace_id, actor_id, action, title, body, metadata)
