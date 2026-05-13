from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_supabase

router = APIRouter()


@router.get("/")
async def get_onboarding(
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    default = {"user_id": user["id"], "completed_steps": [], "skipped": False}
    try:
        rows = (
            supabase.table("user_onboarding")
            .select("*")
            .eq("user_id", user["id"])
            .execute()
            .data
        ) or []
        row = _latest_row(rows)
        return row or default
    except Exception:
        return default


@router.post("/")
async def save_onboarding(
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    now = datetime.now(timezone.utc).isoformat()
    existing = None
    current = []
    if "completed_steps" in payload and payload.get("completed_steps") != []:
        try:
            rows = (
                supabase.table("user_onboarding")
                .select("*")
                .eq("user_id", user["id"])
                .execute()
                .data
            ) or []
            existing = _latest_row(rows)
            current = existing.get("completed_steps") or [] if existing else []
        except Exception:
            current = []
    else:
        try:
            rows = (
                supabase.table("user_onboarding")
                .select("*")
                .eq("user_id", user["id"])
                .execute()
                .data
            ) or []
            existing = _latest_row(rows)
        except Exception:
            existing = None
    incoming = payload.get("completed_steps") if "completed_steps" in payload else current
    completed_steps = [] if incoming == [] else list(dict.fromkeys([*current, *(incoming or [])]))
    row = {
        "user_id": user["id"],
        "completed_steps": completed_steps,
        "skipped": bool(payload.get("skipped", False)),
        "created_at": payload.get("created_at") or now,
        "updated_at": now,
    }
    try:
        if existing and existing.get("id"):
            supabase.table("user_onboarding").update(row).eq("id", existing["id"]).execute()
        else:
            supabase.table("user_onboarding").insert(row).execute()
    except Exception:
        pass
    return row


def _latest_row(rows: list[dict]) -> dict | None:
    if not rows:
        return None
    return sorted(rows, key=lambda row: row.get("updated_at") or row.get("created_at") or "", reverse=True)[0]
