"""Platform productivity routes: schedules, publish links, connectors, dataset organization, and validation."""
from __future__ import annotations

import io
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
import pandas as pd
import psycopg2
from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.dashboards import _dashboard_config_for_execution
from app.api.routes.files import _DEV_UPLOAD_DIR, _parse_file, _save_dataset_profile
from app.api.routes.reports import _json_safe
from app.api.routes.workflows import _has_workflow_permission
from app.config import settings
from app.dependencies import get_current_user, get_supabase
from app.services.workspace_service import WRITE_ROLES, require_workspace_role

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def _next_run(frequency: str, time_of_day: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    hour = 9
    minute = 0
    if time_of_day and ":" in str(time_of_day):
        try:
            hour, minute = [int(part) for part in str(time_of_day).split(":", 1)]
        except Exception:
            hour, minute = 9, 0
    if frequency == "hourly":
        return (now + timedelta(hours=1)).isoformat()
    if frequency == "weekly":
        candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if candidate <= now:
            candidate += timedelta(days=7)
        return candidate.isoformat()
    candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate <= now:
        candidate += timedelta(days=1)
    return candidate.isoformat()


# ── Workflow schedules ────────────────────────────────────────────────────────

@router.get("/workflows/{workflow_id}/schedules")
async def list_workflow_schedules(
    workflow_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    allowed, _ = _has_workflow_permission(supabase, user, workflow_id, "edit")
    if not allowed:
        raise HTTPException(403, "You do not have permission to perform this action.")
    try:
        result = (
            supabase.table("workflow_schedules")
            .select("*")
            .eq("workflow_id", workflow_id)
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception:
        return []


@router.post("/workflows/{workflow_id}/schedules")
async def create_workflow_schedule(
    workflow_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    allowed, _ = _has_workflow_permission(supabase, user, workflow_id, "edit")
    if not allowed:
        raise HTTPException(403, "You do not have permission to perform this action.")
    frequency = str(payload.get("frequency") or "daily")
    if frequency not in {"hourly", "daily", "weekly"}:
        raise HTTPException(400, "frequency must be hourly, daily, or weekly")
    row = {
        "id": str(uuid.uuid4()),
        "workflow_id": workflow_id,
        "user_id": user["id"],
        "frequency": frequency,
        "time_of_day": payload.get("time_of_day") or "09:00",
        "timezone": payload.get("timezone") or "Europe/Istanbul",
        "is_active": bool(payload.get("is_active", True)),
        "next_run_at": _next_run(frequency, payload.get("time_of_day")),
        "created_at": _now(),
        "updated_at": _now(),
    }
    try:
        supabase.table("workflow_schedules").insert(row).execute()
    except Exception as exc:
        raise HTTPException(503, "Schedule storage is not ready. Apply migration 010_platform_productivity.sql.") from exc
    return row


@router.patch("/workflows/{workflow_id}/schedules/{schedule_id}")
async def update_workflow_schedule(
    workflow_id: str,
    schedule_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    allowed, _ = _has_workflow_permission(supabase, user, workflow_id, "edit")
    if not allowed:
        raise HTTPException(403, "You do not have permission to perform this action.")
    patch = {k: v for k, v in payload.items() if k in {"frequency", "time_of_day", "timezone", "is_active"}}
    if "frequency" in patch:
        patch["next_run_at"] = _next_run(str(patch["frequency"]), payload.get("time_of_day"))
    patch["updated_at"] = _now()
    result = (
        supabase.table("workflow_schedules")
        .update(patch)
        .eq("id", schedule_id)
        .eq("workflow_id", workflow_id)
        .eq("user_id", user["id"])
        .execute()
    )
    return (result.data or [None])[0] or {"id": schedule_id, **patch}


@router.delete("/workflows/{workflow_id}/schedules/{schedule_id}")
async def delete_workflow_schedule(
    workflow_id: str,
    schedule_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    allowed, _ = _has_workflow_permission(supabase, user, workflow_id, "edit")
    if not allowed:
        raise HTTPException(403, "You do not have permission to perform this action.")
    supabase.table("workflow_schedules").delete().eq("id", schedule_id).eq("workflow_id", workflow_id).eq("user_id", user["id"]).execute()
    return {"deleted": schedule_id}


# ── Smart validation ──────────────────────────────────────────────────────────

@router.post("/workflows/{workflow_id}/validate")
async def validate_workflow(
    workflow_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    allowed, _ = _has_workflow_permission(supabase, user, workflow_id, "view")
    if not allowed:
        raise HTTPException(403, "You do not have permission to perform this action.")
    row = supabase.table("workflows").select("graph_data").eq("id", workflow_id).single().execute().data
    if not row:
        raise HTTPException(404, "Workflow not found")
    return _validate_graph(row.get("graph_data") or {})


@router.post("/templates/{template_id}/validate-dataset")
async def validate_template_dataset(
    template_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    from app.api.routes.templates import _template_by_id

    template = _template_by_id(template_id)
    if template is None:
        template = supabase.table("workflow_templates").select("*").eq("id", template_id).single().execute().data
    if not template:
        raise HTTPException(404, "Template not found")
    dataset_columns = payload.get("columns") or []
    required = [str(item).lower() for item in (template.get("required_columns") or [])]
    available = " ".join([str(col.get("name", col)).lower() for col in dataset_columns])
    warnings = [
        {"code": "template_requirement", "message": f"Check dataset has: {item}", "node_id": None}
        for item in required
        if item.lower() not in available
    ]
    result = _validate_graph(template.get("graph_data") or {})
    result["warnings"] = (result.get("warnings") or []) + warnings
    result["valid"] = not result.get("errors")
    return result


def _validate_graph(graph: dict) -> dict:
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []
    node_ids = {node.get("id") for node in nodes}
    node_by_id = {node.get("id"): node for node in nodes}
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    suggestions: list[dict[str, Any]] = []

    if not nodes:
        errors.append({"code": "empty_workflow", "message": "Workflow has no nodes.", "node_id": None})

    for edge in edges:
        if edge.get("source") not in node_ids or edge.get("target") not in node_ids:
            errors.append({"code": "broken_edge", "message": "A connection points to a missing node.", "node_id": edge.get("target")})

    outgoing = {node_id: 0 for node_id in node_ids}
    incoming = {node_id: 0 for node_id in node_ids}
    for edge in edges:
        if edge.get("source") in outgoing:
            outgoing[edge["source"]] += 1
        if edge.get("target") in incoming:
            incoming[edge["target"]] += 1

    for node in nodes:
        node_id = node.get("id")
        node_type = node.get("type")
        config = (node.get("data") or {}).get("config") or {}
        if node_type == "file_upload" and not (config.get("file_id") or config.get("storage_path")):
            errors.append({"code": "missing_file", "message": "File Upload node needs a dataset.", "node_id": node_id})
        if node_type == "database_query":
            if not (config.get("connector_id") or config.get("connection_string") or config.get("host")):
                errors.append({"code": "missing_database_connection", "message": "Database Query node needs a connector or connection details.", "node_id": node_id})
        if node_type not in {"file_upload", "database_query"} and incoming.get(node_id, 0) == 0:
            warnings.append({"code": "no_input", "message": "Node has no input connection.", "node_id": node_id})
        if node_type in {"dashboard", "report"} and incoming.get(node_id, 0) == 0:
            errors.append({"code": "output_without_input", "message": "Output node is not connected to analysis results.", "node_id": node_id})
        if node_type and node_type.endswith("_chart") and incoming.get(node_id, 0) == 0:
            warnings.append({"code": "chart_without_input", "message": "Chart node has no input data.", "node_id": node_id})

    if nodes and not any(node.get("type") in {"dashboard", "report"} for node in nodes):
        suggestions.append({"code": "add_output", "message": "Add a dashboard or report node to use the results.", "node_id": None})

    try:
        from app.core.execution_engine import topological_sort
        topological_sort([str(node.get("id")) for node in nodes], edges)
    except Exception:
        errors.append({"code": "cycle", "message": "Workflow connections contain a cycle.", "node_id": None})

    for edge in edges:
        source = node_by_id.get(edge.get("source"))
        target = node_by_id.get(edge.get("target"))
        if source and target and source.get("type", "").endswith("_chart") and target.get("type", "").endswith("_chart"):
            warnings.append({"code": "chart_to_chart", "message": "Chart-to-chart connections rarely produce useful output.", "node_id": target.get("id")})

    return {"valid": not errors, "errors": errors, "warnings": warnings, "suggestions": suggestions}


# ── Publish links ─────────────────────────────────────────────────────────────

@router.post("/dashboards/{execution_id}/publish")
async def publish_dashboard(
    execution_id: str,
    payload: dict = {},
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    exec_row = supabase.table("workflow_executions").select("*").eq("id", execution_id).eq("user_id", user["id"]).single().execute().data
    if not exec_row:
        raise HTTPException(404, "Dashboard execution not found")
    return _upsert_publish_link(supabase, user["id"], "dashboard", execution_id, payload)


@router.post("/reports/{report_id}/publish")
async def publish_report(
    report_id: str,
    payload: dict = {},
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    report = supabase.table("reports").select("*").eq("id", report_id).eq("user_id", user["id"]).single().execute().data
    if not report:
        raise HTTPException(404, "Report not found")
    return _upsert_publish_link(supabase, user["id"], "report", report_id, payload)


@router.patch("/publish-links/{link_id}")
async def update_publish_link(
    link_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    patch = {k: v for k, v in payload.items() if k in {"enabled", "allow_export", "expires_at"}}
    patch["updated_at"] = _now()
    result = supabase.table("publish_links").update(patch).eq("id", link_id).eq("owner_id", user["id"]).execute()
    return (result.data or [None])[0] or {"id": link_id, **patch}


@router.get("/public/dashboards/{token}")
async def public_dashboard(token: str, supabase=Depends(get_supabase)):
    link = _get_public_link(supabase, token, "dashboard")
    config = _dashboard_config_for_execution(supabase, link["resource_id"])
    if not config:
        raise HTTPException(404, "Dashboard not found")
    return {"link": _public_link_payload(link), "dashboard": config}


@router.get("/public/reports/{token}")
async def public_report(token: str, supabase=Depends(get_supabase)):
    link = _get_public_link(supabase, token, "report")
    report = supabase.table("reports").select("report_data,title,created_at").eq("id", link["resource_id"]).single().execute().data
    if not report:
        raise HTTPException(404, "Report not found")
    return {"link": _public_link_payload(link), "report": _json_safe(report.get("report_data") or {})}


def _upsert_publish_link(supabase, owner_id: str, resource_type: str, resource_id: str, payload: dict) -> dict:
    try:
        existing = (
            supabase.table("publish_links")
            .select("*")
            .eq("owner_id", owner_id)
            .eq("resource_type", resource_type)
            .eq("resource_id", resource_id)
            .single()
            .execute()
            .data
        )
    except Exception:
        existing = None
    patch = {
        "enabled": bool(payload.get("enabled", True)),
        "allow_export": bool(payload.get("allow_export", False)),
        "expires_at": payload.get("expires_at"),
        "updated_at": _now(),
    }
    if existing:
        result = supabase.table("publish_links").update(patch).eq("id", existing["id"]).execute()
        row = (result.data or [None])[0] or {**existing, **patch}
    else:
        row = {
            "id": str(uuid.uuid4()),
            "resource_type": resource_type,
            "resource_id": resource_id,
            "owner_id": owner_id,
            "token": secrets.token_urlsafe(24),
            "created_at": _now(),
            **patch,
        }
        try:
            supabase.table("publish_links").insert(row).execute()
        except Exception as exc:
            raise HTTPException(503, "Publish link storage is not ready. Apply migration 010_platform_productivity.sql.") from exc
    row["url"] = f"/public/{resource_type}s/{row['token']}"
    return row


def _get_public_link(supabase, token: str, resource_type: str) -> dict:
    link = supabase.table("publish_links").select("*").eq("token", token).eq("resource_type", resource_type).single().execute().data
    if not link or not link.get("enabled"):
        raise HTTPException(404, "Publish link not found")
    expires_at = _parse_dt(link.get("expires_at"))
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, "Publish link expired")
    return link


def _public_link_payload(link: dict) -> dict:
    return {
        "id": link.get("id"),
        "resource_type": link.get("resource_type"),
        "allow_export": bool(link.get("allow_export")),
        "expires_at": link.get("expires_at"),
    }


# ── Data connectors ──────────────────────────────────────────────────────────

@router.get("/connectors")
async def list_connectors(user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    try:
        result = supabase.table("data_connectors").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
        return [_safe_connector(row) for row in (result.data or [])]
    except Exception:
        return []


@router.post("/connectors")
async def create_connector(payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": str(payload.get("type") or "public_url"),
        "name": str(payload.get("name") or "Connector"),
        "config_json": payload.get("config_json") or {},
        "status": "idle",
        "created_at": _now(),
        "updated_at": _now(),
    }
    try:
        supabase.table("data_connectors").insert(row).execute()
    except Exception as exc:
        raise HTTPException(503, "Connector storage is not ready. Apply migration 010_platform_productivity.sql.") from exc
    return _safe_connector(row)


@router.patch("/connectors/{connector_id}")
async def update_connector(connector_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    patch = {k: v for k, v in payload.items() if k in {"type", "name", "config_json", "status"}}
    patch["updated_at"] = _now()
    result = supabase.table("data_connectors").update(patch).eq("id", connector_id).eq("user_id", user["id"]).execute()
    return _safe_connector((result.data or [None])[0] or {"id": connector_id, **patch})


@router.delete("/connectors/{connector_id}")
async def delete_connector(connector_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    supabase.table("data_connectors").delete().eq("id", connector_id).eq("user_id", user["id"]).execute()
    return {"deleted": connector_id}


@router.post("/connectors/{connector_id}/test")
async def test_connector(connector_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    row = _get_connector(supabase, connector_id, user["id"])
    try:
        df = _connector_dataframe(row)
        return {"ok": True, "row_count": int(len(df)), "column_count": int(len(df.columns)), "columns": [str(col) for col in df.columns[:20]]}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@router.post("/connectors/{connector_id}/sync")
async def sync_connector(connector_id: str, payload: dict = {}, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    row = _get_connector(supabase, connector_id, user["id"])
    workspace_id, _ = require_workspace_role(supabase, user, payload.get("workspace_id"), WRITE_ROLES)
    try:
        df = _connector_dataframe(row)
        file_id = _persist_connector_dataset(supabase, user["id"], row, df, workspace_id, payload.get("project_id"))
        patch = {"status": "synced", "last_synced_file_id": file_id, "last_synced_at": _now(), "updated_at": _now()}
        supabase.table("data_connectors").update(patch).eq("id", connector_id).execute()
        return {"ok": True, "file_id": file_id, "row_count": int(len(df)), "column_count": int(len(df.columns))}
    except Exception as exc:
        supabase.table("data_connectors").update({"status": "error", "updated_at": _now()}).eq("id", connector_id).execute()
        raise HTTPException(422, str(exc)) from exc


def _safe_connector(row: dict) -> dict:
    config = dict(row.get("config_json") or {})
    for key in ("password", "api_key", "token", "connection_string"):
        if config.get(key):
            config[key] = "••••••••"
    return {**row, "config_json": config}


def _get_connector(supabase, connector_id: str, user_id: str) -> dict:
    row = supabase.table("data_connectors").select("*").eq("id", connector_id).eq("user_id", user_id).single().execute().data
    if not row:
        raise HTTPException(404, "Connector not found")
    return row


def _connector_dataframe(row: dict) -> pd.DataFrame:
    connector_type = row.get("type")
    config = row.get("config_json") or {}
    if connector_type in {"public_url", "google_sheets"}:
        url = str(config.get("url") or "").strip()
        if not url:
            raise ValueError("URL is required")
        if connector_type == "google_sheets" and "/edit" in url:
            url = url.split("/edit", 1)[0] + "/export?format=csv"
        if url.lower().endswith((".xlsx", ".xls")):
            return pd.read_excel(url)
        return pd.read_csv(url)
    if connector_type == "rest_json":
        url = str(config.get("url") or "").strip()
        if not url:
            raise ValueError("URL is required")
        response = httpx.get(url, timeout=20)
        response.raise_for_status()
        payload = response.json()
        data = payload.get(config.get("records_path")) if isinstance(payload, dict) and config.get("records_path") else payload
        if isinstance(data, dict):
            data = data.get("data") or data.get("results") or [data]
        return pd.json_normalize(data)
    if connector_type == "postgres":
        query = str(config.get("query") or "select 1 as value")
        _assert_read_only_connector_query(query)
        conn = psycopg2.connect(str(config.get("connection_string") or ""))
        try:
            return pd.read_sql(query, conn)
        finally:
            conn.close()
    if connector_type == "supabase_table":
        url = str(config.get("url") or "").rstrip("/")
        key = str(config.get("api_key") or "")
        table = str(config.get("table") or "")
        if not url or not key or not table:
            raise ValueError("Supabase url, api_key and table are required")
        response = httpx.get(f"{url}/rest/v1/{table}?select=*&limit=50000", headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=20)
        response.raise_for_status()
        return pd.DataFrame(response.json())
    raise ValueError(f"Unsupported connector type: {connector_type}")


def _assert_read_only_connector_query(query: str) -> None:
    normalized = " ".join(query.strip().lower().rstrip(";").split())
    if not normalized.startswith(("select ", "with ", "show ", "describe ", "explain ")):
        raise ValueError("Only read-only SELECT/WITH queries are allowed")
    forbidden = (" insert ", " update ", " delete ", " drop ", " alter ", " truncate ", " create ", " grant ", " revoke ")
    padded = f" {normalized} "
    if any(term in padded for term in forbidden) or ";" in normalized:
        raise ValueError("Write, DDL, or multi-statement SQL is not allowed")


def _persist_connector_dataset(supabase, user_id: str, connector: dict, df: pd.DataFrame, workspace_id: str | None = None, project_id: str | None = None) -> str:
    file_id = str(uuid.uuid4())
    filename = f"{connector.get('name') or 'connector'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    content = df.to_csv(index=False).encode("utf-8")
    if settings.DEV_MODE:
        dest = _DEV_UPLOAD_DIR / file_id
        dest.mkdir(parents=True, exist_ok=True)
        (dest / filename).write_bytes(content)
        storage_path = f"dev://{file_id}/{filename}"
    else:
        storage_path = f"{user_id}/{file_id}/{filename}"
        supabase.storage.from_(settings.STORAGE_BUCKET_DATASETS).upload(storage_path, content, {"content-type": "text/csv"})
    columns_meta = [{"name": str(col), "type": str(df[col].dtype), "missing_count": int(df[col].isna().sum())} for col in df.columns]
    missing_summary = {str(col): int(df[col].isna().sum()) for col in df.columns}
    supabase.table("uploaded_files").insert({
        "id": file_id,
        "user_id": user_id,
        "filename": filename,
        "storage_path": storage_path,
        "size_bytes": len(content),
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns_meta": columns_meta,
        "workspace_id": workspace_id,
        "project_id": project_id,
        "created_at": _now(),
    }).execute()
    _save_dataset_profile(supabase, user_id, file_id, columns_meta, df, missing_summary)
    return file_id


# ── Dataset folders and tags ──────────────────────────────────────────────────

@router.get("/dataset-folders")
async def list_dataset_folders(user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    try:
        result = supabase.table("dataset_folders").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
        return result.data or []
    except Exception:
        return []


@router.post("/dataset-folders")
async def create_dataset_folder(payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    row = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": str(payload.get("name") or "Folder"), "color": payload.get("color") or "#0071E3", "created_at": _now(), "updated_at": _now()}
    try:
        supabase.table("dataset_folders").insert(row).execute()
    except Exception as exc:
        raise HTTPException(503, "Dataset folder storage is not ready. Apply migration 010_platform_productivity.sql.") from exc
    return row


@router.patch("/dataset-folders/{folder_id}")
async def update_dataset_folder(folder_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    patch = {k: v for k, v in payload.items() if k in {"name", "color"}}
    patch["updated_at"] = _now()
    result = supabase.table("dataset_folders").update(patch).eq("id", folder_id).eq("user_id", user["id"]).execute()
    return (result.data or [None])[0] or {"id": folder_id, **patch}


@router.delete("/dataset-folders/{folder_id}")
async def delete_dataset_folder(folder_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    supabase.table("dataset_folders").delete().eq("id", folder_id).eq("user_id", user["id"]).execute()
    supabase.table("uploaded_files").update({"folder_id": None}).eq("folder_id", folder_id).eq("user_id", user["id"]).execute()
    return {"deleted": folder_id}


@router.get("/dataset-tags")
async def list_dataset_tags(user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    try:
        tags = supabase.table("dataset_tags").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute().data or []
        links = supabase.table("dataset_tag_links").select("*").eq("user_id", user["id"]).execute().data or []
    except Exception:
        return []
    return [{**tag, "dataset_ids": [link["dataset_id"] for link in links if link.get("tag_id") == tag.get("id")]} for tag in tags]


@router.post("/dataset-tags")
async def create_dataset_tag(payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    row = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": str(payload.get("name") or "Tag"), "color": payload.get("color") or "#8E8E93", "created_at": _now(), "updated_at": _now()}
    try:
        supabase.table("dataset_tags").insert(row).execute()
    except Exception as exc:
        raise HTTPException(503, "Dataset tag storage is not ready. Apply migration 010_platform_productivity.sql.") from exc
    return row


@router.patch("/dataset-tags/{tag_id}")
async def update_dataset_tag(tag_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    patch = {k: v for k, v in payload.items() if k in {"name", "color"}}
    patch["updated_at"] = _now()
    result = supabase.table("dataset_tags").update(patch).eq("id", tag_id).eq("user_id", user["id"]).execute()
    return (result.data or [None])[0] or {"id": tag_id, **patch}


@router.delete("/dataset-tags/{tag_id}")
async def delete_dataset_tag(tag_id: str, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    supabase.table("dataset_tag_links").delete().eq("tag_id", tag_id).eq("user_id", user["id"]).execute()
    supabase.table("dataset_tags").delete().eq("id", tag_id).eq("user_id", user["id"]).execute()
    return {"deleted": tag_id}


@router.patch("/files/{file_id}/organization")
async def update_file_organization(file_id: str, payload: dict, user: dict = Depends(get_current_user), supabase=Depends(get_supabase)):
    supabase.table("uploaded_files").update({"folder_id": payload.get("folder_id")}).eq("id", file_id).eq("user_id", user["id"]).execute()
    if "tag_ids" in payload:
        supabase.table("dataset_tag_links").delete().eq("dataset_id", file_id).eq("user_id", user["id"]).execute()
        for tag_id in payload.get("tag_ids") or []:
            supabase.table("dataset_tag_links").insert({"dataset_id": file_id, "tag_id": tag_id, "user_id": user["id"]}).execute()
    return {"id": file_id, "folder_id": payload.get("folder_id"), "tag_ids": payload.get("tag_ids") or []}
