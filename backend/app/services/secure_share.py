from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException


PERMISSION_ORDER = {
    "view": 1,
    "analyze": 2,
    "edit": 2,
    "export": 3,
}


def decrypt_dataset_bytes(data: bytes) -> bytes:
    """Compatibility shim after removing dataset encryption."""
    return data


def check_graph_dataset_permissions(
    supabase,
    user: dict,
    graph_data: dict,
    permission: str,
    action: str = "view",
) -> None:
    """Keep workflow/report routes compatible without reintroducing AES security."""
    return None


def has_content_permission(
    supabase,
    user: dict,
    resource_type: str,
    resource_id: str,
    owner_id: str | None,
    permission: str,
) -> tuple[bool, str]:
    if owner_id and str(owner_id) == str(user.get("id")):
        return True, "owner"

    required = PERMISSION_ORDER.get(permission, 1)
    now = datetime.now(timezone.utc)
    for share in _list_shares(supabase):
        if str(share.get("resource_type")) != resource_type:
            continue
        if str(share.get("resource_id")) != str(resource_id):
            continue
        if str(share.get("email", "")).lower() != str(user.get("email", "")).lower():
            continue
        if _is_expired(share, now):
            continue
        granted = PERMISSION_ORDER.get(str(share.get("permission", "view")), 1)
        if granted >= required:
            return True, "shared"
    return False, "You do not have permission to perform this action."


def create_content_share(
    supabase,
    user: dict,
    resource_type: str,
    resource_id: str,
    owner_id: str | None,
    payload: dict,
) -> dict:
    if owner_id and str(owner_id) != str(user.get("id")):
        raise HTTPException(403, "Only the owner can share this item")

    email = str(payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "Email is required")

    permission = str(payload.get("permission") or "view")
    if permission not in PERMISSION_ORDER:
        raise HTTPException(400, "Invalid permission")

    now = datetime.now(timezone.utc)
    row = {
        "id": str(uuid.uuid4()),
        "resource_type": resource_type,
        "resource_id": str(resource_id),
        "owner_id": owner_id or user.get("id"),
        "email": email,
        "permission": permission,
        "expires_at": _expiration(payload.get("expiration"), now),
        "created_by": user.get("id"),
        "created_at": now.isoformat(),
    }
    supabase.table("content_shares").insert(row).execute()
    return row


def delete_content_share(
    supabase,
    user: dict,
    resource_type: str,
    resource_id: str,
    owner_id: str | None,
    share_id: str,
) -> None:
    if owner_id and str(owner_id) != str(user.get("id")):
        raise HTTPException(403, "Only the owner can revoke this share")
    supabase.table("content_shares").delete().eq("id", share_id).eq("resource_type", resource_type).eq("resource_id", str(resource_id)).execute()


def list_active_content_shares_for_current_user(supabase, user: dict, resource_type: str) -> list[dict]:
    email = str(user.get("email", "")).lower()
    now = datetime.now(timezone.utc)
    return [
        share
        for share in _list_shares(supabase)
        if str(share.get("resource_type")) == resource_type
        and str(share.get("email", "")).lower() == email
        and not _is_expired(share, now)
    ]


def _list_shares(supabase) -> list[dict]:
    try:
        rows = supabase.table("content_shares").select("*").execute().data
        return rows or []
    except Exception:
        return []


def _expiration(value: Any, now: datetime) -> str | None:
    if value in (None, "", "never"):
        return None
    if value == "24h":
        return (now + timedelta(hours=24)).isoformat()
    if value == "7d":
        return (now + timedelta(days=7)).isoformat()
    if isinstance(value, str):
        return value
    return None


def _is_expired(share: dict, now: datetime) -> bool:
    raw = share.get("expires_at")
    if not raw:
        return False
    try:
        expires = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return expires <= now
    except Exception:
        return False
