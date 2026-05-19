from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.api.routes.executions import _execute_workflow_task
from app.dependencies import get_supabase


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _next_run(frequency: str) -> str:
    now = datetime.now(timezone.utc)
    if frequency == "hourly":
        return (now + timedelta(hours=1)).isoformat()
    if frequency == "weekly":
        return (now + timedelta(days=7)).isoformat()
    return (now + timedelta(days=1)).isoformat()


async def scheduler_loop(stop_event: asyncio.Event):
    while not stop_event.is_set():
        try:
            await asyncio.to_thread(run_due_schedules_once)
        except Exception as exc:
            print(f"Scheduler tick failed: {exc}")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=60)
        except asyncio.TimeoutError:
            pass


def run_due_schedules_once() -> None:
    supabase = get_supabase()
    rows = (
        supabase.table("workflow_schedules")
        .select("*")
        .eq("is_active", True)
        .execute()
        .data or []
    )
    now = datetime.now(timezone.utc)
    for schedule in rows:
        if schedule.get("frequency") == "continuous":
            continue
        due = _parse_dt(schedule.get("next_run_at"))
        if due and due > now:
            continue
        try:
            execution_id = _start_scheduled_execution(supabase, schedule)
            supabase.table("workflow_schedules").update({
                "last_run_at": now.isoformat(),
                "last_execution_id": execution_id,
                "next_run_at": _next_run(schedule.get("frequency", "daily")),
                "updated_at": now.isoformat(),
            }).eq("id", schedule["id"]).execute()
        except Exception as exc:
            supabase.table("workflow_schedules").update({
                "updated_at": now.isoformat(),
                "next_run_at": _next_run(schedule.get("frequency", "daily")),
            }).eq("id", schedule.get("id")).execute()
            print(f"Scheduled workflow failed: {exc}")


def _start_scheduled_execution(supabase, schedule: dict[str, Any]) -> str:
    workflow_id = schedule["workflow_id"]
    workflow = supabase.table("workflows").select("id, graph_data, name, user_id").eq("id", workflow_id).single().execute().data
    if not workflow:
        raise ValueError("Workflow not found")
    exec_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("workflow_executions").insert({
        "id": exec_id,
        "workflow_id": workflow_id,
        "user_id": schedule["user_id"],
        "status": "pending",
        "created_at": now,
    }).execute()
    for node in workflow.get("graph_data", {}).get("nodes", []):
        supabase.table("node_execution_results").insert({
            "execution_id": exec_id,
            "node_id": node["id"],
            "node_type": node.get("type", "unknown"),
            "status": "pending",
        }).execute()
    _execute_workflow_task(exec_id, workflow_id, workflow.get("graph_data") or {}, workflow.get("name") or "Untitled")
    return exec_id
