from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_supabase
from app.services.workspace_service import now_iso

router = APIRouter()


def _default_preferences(user: dict) -> dict:
    return {
        "user_id": user["id"],
        "display_name": user.get("email", "").split("@")[0],
        "language": "tr",
        "theme": "dark",
        "notification_settings": {"workspace": True, "comments": True, "roles": True},
        "completed_tours": [],
    }


@router.get("/profile/preferences")
async def get_preferences(user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    default = _default_preferences(user)
    try:
        row = supabase.table("user_preferences").select("*").eq("user_id", user["id"]).single().execute().data
        return {**default, **(row or {})}
    except Exception:
        return default


@router.patch("/profile/preferences")
async def update_preferences(payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    current = _default_preferences(user)
    allowed = {"display_name", "language", "theme", "notification_settings", "completed_tours"}
    patch = {key: payload[key] for key in allowed if key in payload}
    if patch.get("language") not in {None, "tr", "en"}:
        patch["language"] = "tr"
    if patch.get("theme") not in {None, "dark", "light"}:
        patch["theme"] = "dark"
    row = {
        **current,
        **patch,
        "user_id": user["id"],
        "updated_at": now_iso(),
    }
    try:
        supabase.table("user_preferences").upsert(row).execute()
    except Exception:
        return row
    return row
