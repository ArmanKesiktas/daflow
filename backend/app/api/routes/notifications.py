from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_supabase
from app.services.workspace_service import now_iso

router = APIRouter()


@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    rows: list[dict] = []
    try:
        rows = (
            supabase.table("notifications")
            .select("*")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .limit(40)
            .execute()
            .data or []
        )
    except Exception:
        rows = []
    return _with_pending_invitations(rows, user, supabase)


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    patch = {"read_at": now_iso()}
    try:
        result = (
            supabase.table("notifications")
            .update(patch)
            .eq("id", notification_id)
            .eq("user_id", user["id"])
            .execute()
        )
        return (result.data or [{"id": notification_id, **patch}])[0]
    except Exception:
        return {"id": notification_id, **patch}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    try:
        supabase.table("notifications").update({"read_at": now_iso()}).eq("user_id", user["id"]).is_("read_at", "null").execute()
    except Exception:
        pass
    return {"ok": True}


def _with_pending_invitations(rows: list[dict], user: dict, supabase) -> list[dict]:
    email = str(user.get("email") or "").strip().lower()
    if not email:
        return rows
    try:
        invitations = (
            supabase.table("workspace_invitations")
            .select("*")
            .execute()
            .data or []
        )
        invitations = [
            invite for invite in invitations
            if str(invite.get("email") or "").strip().lower() == email
        ]
    except Exception:
        invitations = []
    existing_ids = {row.get("id") for row in rows}
    now = datetime.now(timezone.utc)
    for invite in invitations:
        if invite.get("accepted_at"):
            continue
        if invite.get("expires_at"):
            try:
                expires = datetime.fromisoformat(str(invite["expires_at"]).replace("Z", "+00:00"))
                if expires < now:
                    continue
            except Exception:
                continue
        notification_id = f"invite-{invite.get('id')}"
        if notification_id in existing_ids:
            continue
        workspace = None
        try:
            workspace = supabase.table("workspaces").select("id, name").eq("id", invite.get("workspace_id")).single().execute().data
        except Exception:
            workspace = None
        workspace_name = (workspace or {}).get("name") or "Workspace"
        rows.append({
            "id": notification_id,
            "user_id": user["id"],
            "workspace_id": invite.get("workspace_id"),
            "actor_id": invite.get("invited_by"),
            "action": "workspace.invitation",
            "title": "Workspace invitation",
            "body": f"You were invited to {workspace_name} as {invite.get('role')}.",
            "metadata": {
                "invitation_id": invite.get("id"),
                "token": invite.get("token"),
                "accept_url": f"/invitations/{invite.get('token')}",
                "workspace_name": workspace_name,
                "role": invite.get("role"),
            },
            "read_at": None,
            "created_at": invite.get("created_at") or now_iso(),
        })
    rows.sort(key=lambda row: row.get("created_at", ""), reverse=True)
    return rows[:40]
