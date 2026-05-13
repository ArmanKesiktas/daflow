import io
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from app.config import settings
from app.dependencies import get_current_user, get_supabase
from app.schemas.report import FileUploadResponse
from app.services.workspace_service import WRITE_ROLES, is_workspace_not_ready, log_activity, require_workspace_member, require_workspace_role

router = APIRouter()

# Local temp directory used when DEV_MODE=True
_DEV_UPLOAD_DIR = Path(tempfile.gettempdir()) / "dataflow_dev_uploads"
_DEV_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    workspace_id: str | None = Form(None),
    project_id: str | None = Form(None),
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Upload a CSV, Excel, or parquet file and return metadata + preview."""
    try:
        workspace_id, _ = require_workspace_role(supabase, user, workspace_id, WRITE_ROLES)
    except HTTPException as exc:
        if not is_workspace_not_ready(exc):
            raise
        workspace_id = None
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(413, f"File too large (max {settings.MAX_UPLOAD_SIZE_MB} MB)")

    filename = file.filename or "upload.csv"
    ext = filename.lower().rsplit(".", 1)[-1]
    if ext not in ("csv", "xlsx", "xls", "parquet"):
        raise HTTPException(400, f"Unsupported file type: .{ext}")

    try:
        df = _parse_file(filename, content)
    except Exception as exc:
        raise HTTPException(422, f"Could not parse file: {exc}")

    file_id = str(uuid.uuid4())
    if settings.DEV_MODE:
        dest = _DEV_UPLOAD_DIR / file_id
        dest.mkdir(parents=True, exist_ok=True)
        (dest / filename).write_bytes(content)
        storage_path = f"dev://{file_id}/{filename}"
    else:
        storage_path = f"{user['id']}/{file_id}/{filename}"
        supabase.storage.from_(settings.STORAGE_BUCKET_DATASETS).upload(
            storage_path,
            content,
            {"content-type": file.content_type or "application/octet-stream"},
        )

    columns_meta = [
        {
            "name": str(col),
            "type": str(df[col].dtype),
            "missing_count": str(int(df[col].isna().sum())),
        }
        for col in df.columns
    ]
    missing_summary = {str(col): int(df[col].isna().sum()) for col in df.columns}

    insert_payload = {
        "id": file_id,
        "user_id": user["id"],
        "filename": filename,
        "storage_path": storage_path,
        "size_bytes": len(content),
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns_meta": columns_meta,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if workspace_id:
        insert_payload["workspace_id"] = workspace_id
        insert_payload["project_id"] = project_id
    supabase.table("uploaded_files").insert(insert_payload).execute()
    _save_dataset_profile(supabase, user["id"], file_id, columns_meta, df, missing_summary)
    log_activity(supabase, workspace_id, user["id"], "file.uploaded", "file", file_id, {"filename": filename})

    return FileUploadResponse(
        file_id=file_id,
        storage_path=storage_path,
        filename=filename,
        size_bytes=len(content),
        row_count=int(len(df)),
        column_count=int(len(df.columns)),
        columns=columns_meta,
        preview=df.head(settings.MAX_ROWS_PREVIEW).fillna("").to_dict("records"),
        missing_summary=missing_summary,
    )


@router.get("/")
async def list_files(
    workspace_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    try:
        workspace_id, _ = require_workspace_member(supabase, user, workspace_id)
        query = (
            supabase.table("uploaded_files")
            .select("id, filename, size_bytes, row_count, column_count, columns_meta, folder_id, workspace_id, project_id, created_at")
            .eq("workspace_id", workspace_id)
        )
        if project_id:
            query = query.eq("project_id", project_id)
        result = query.order("created_at", desc=True).execute()
    except HTTPException as exc:
        if not is_workspace_not_ready(exc):
            raise
        result = (
            supabase.table("uploaded_files")
            .select("id, filename, size_bytes, row_count, column_count, columns_meta, created_at")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .execute()
        )
    return result.data


@router.get("/samples")
async def list_sample_datasets():
    sample_dir = Path(__file__).resolve().parents[2] / "data" / "samples"
    items = []
    for path in sorted(sample_dir.glob("*.csv")):
        try:
            df = pd.read_csv(path)
            columns = [{"name": str(col), "type": str(df[col].dtype)} for col in df.columns]
            items.append({
                "id": path.stem,
                "filename": path.name,
                "row_count": int(len(df)),
                "column_count": int(len(df.columns)),
                "columns": columns,
                "preview": df.head(5).fillna("").to_dict("records"),
            })
        except Exception:
            continue
    return items


@router.get("/{file_id}")
async def get_file_detail(
    file_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _get_file_for_user(file_id, user, supabase)
    preview: list[dict[str, Any]] = []
    missing_summary: dict[str, int] = {}
    try:
        content = _load_dataset_bytes(row["storage_path"], supabase)
        df = _parse_file(row["filename"], content)
        preview = df.head(settings.MAX_ROWS_PREVIEW).fillna("").to_dict("records")
        missing_summary = {str(col): int(df[col].isna().sum()) for col in df.columns}
    except Exception:
        preview = []

    return {
        "id": row.get("id"),
        "filename": row.get("filename"),
        "size_bytes": row.get("size_bytes", 0),
        "row_count": row.get("row_count", 0),
        "column_count": row.get("column_count", 0),
        "columns": row.get("columns_meta") or [],
        "preview": preview,
        "missing_summary": missing_summary,
        "is_owner": True,
        "folder_id": row.get("folder_id"),
        "created_at": row.get("created_at"),
    }


@router.patch("/{file_id}")
async def rename_file(
    file_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _get_file_for_user(file_id, user, supabase, write=True)
    filename = str(payload.get("filename", "")).strip()
    if not filename:
        raise HTTPException(400, "Filename is required")
    supabase.table("uploaded_files").update({"filename": filename}).eq("id", file_id).eq("user_id", user["id"]).execute()
    log_activity(supabase, row.get("workspace_id"), user["id"], "file.renamed", "file", file_id, {"filename": filename})
    return {"id": file_id, "filename": filename}


@router.post("/{file_id}/create-workflow")
async def create_workflow_from_file(
    file_id: str,
    payload: dict = {},
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _get_file_for_user(file_id, user, supabase, write=True)
    workflow_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    name = str(payload.get("name") or f"Analysis - {row.get('filename', 'Dataset')}")
    storage_path = row.get("storage_path", "")
    filename = row.get("filename", "")
    file_type = filename.lower().rsplit(".", 1)[-1] if "." in filename else "csv"
    nodes = [
        _workflow_node("file", "file_upload", "File Upload", "source", 80, 220, {
            "file_id": file_id,
            "storage_path": storage_path,
            "filename": filename,
            "file_type": file_type,
        }),
        _workflow_node("stats", "statistics", "Statistics", "analysis", 360, 140, {}),
        _workflow_node("dist", "distribution", "Distribution", "analysis", 360, 300, {"bins": 20}),
        _workflow_node("dash", "dashboard", "Dashboard", "output", 660, 220, {"title": f"{filename} Dashboard"}),
    ]
    edges = [
        _workflow_edge("file", "stats"),
        _workflow_edge("file", "dist"),
        _workflow_edge("stats", "dash"),
        _workflow_edge("dist", "dash"),
    ]
    graph_data = {"nodes": nodes, "edges": edges, "viewport": {"x": 0, "y": 0, "zoom": 0.82}}
    insert_payload = {
        "id": workflow_id,
        "user_id": user["id"],
        "name": name,
        "description": f"Generated from {filename}",
        "graph_data": graph_data,
        "created_at": now,
        "updated_at": now,
    }
    if row.get("workspace_id"):
        insert_payload["workspace_id"] = row.get("workspace_id")
        insert_payload["project_id"] = row.get("project_id")
    supabase.table("workflows").insert(insert_payload).execute()
    log_activity(supabase, row.get("workspace_id"), user["id"], "workflow.created", "workflow", workflow_id, {"source_file": filename})
    return {"id": workflow_id, "name": name}


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _get_file_for_user(file_id, user, supabase, write=True)
    storage_path = row["storage_path"]
    if storage_path.startswith("dev://"):
        try:
            rel = storage_path[len("dev://"):]
            (_DEV_UPLOAD_DIR / rel).unlink(missing_ok=True)
        except Exception:
            pass
    else:
        supabase.storage.from_(settings.STORAGE_BUCKET_DATASETS).remove([storage_path])
    supabase.table("uploaded_files").delete().eq("id", file_id).eq("user_id", user["id"]).execute()
    log_activity(supabase, row.get("workspace_id"), user["id"], "file.deleted", "file", file_id, {"filename": row.get("filename")})
    return {"deleted": file_id}


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = _get_file_for_user(file_id, user, supabase)
    try:
        content = _load_dataset_bytes(row["storage_path"], supabase)
    except FileNotFoundError:
        raise HTTPException(404, "File content not found in storage")

    from fastapi.responses import Response
    filename = row.get("filename", "dataset.csv")
    ext = filename.lower().rsplit(".", 1)[-1]
    mime_types = {
        "csv": "text/csv",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xls": "application/vnd.ms-excel",
        "parquet": "application/octet-stream",
    }
    return Response(
        content=content,
        media_type=mime_types.get(ext, "application/octet-stream"),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(content)),
        },
    )


def _get_file(file_id: str, user_id: str, supabase) -> dict:
    result = (
        supabase.table("uploaded_files")
        .select("*")
        .eq("id", file_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "File not found")
    return result.data


def _get_file_for_user(file_id: str, user: dict, supabase, write: bool = False) -> dict:
    row = supabase.table("uploaded_files").select("*").eq("id", file_id).single().execute().data
    if not row:
        raise HTTPException(404, "File not found")
    workspace_id = row.get("workspace_id")
    if workspace_id:
        if write:
            require_workspace_role(supabase, user, workspace_id, WRITE_ROLES)
        else:
            require_workspace_member(supabase, user, workspace_id)
        return row
    if row.get("user_id") != user.get("id"):
        raise HTTPException(403, "You do not have permission to perform this action.")
    return row


def _load_dataset_bytes(storage_path: str, supabase) -> bytes:
    if storage_path.startswith("dev://"):
        rel = storage_path[len("dev://"):]
        local_path = _DEV_UPLOAD_DIR / rel
        if not local_path.exists():
            raise FileNotFoundError(f"Dev file not found: {local_path}")
        return local_path.read_bytes()
    return supabase.storage.from_(settings.STORAGE_BUCKET_DATASETS).download(storage_path)


def _parse_file(filename: str, content: bytes) -> pd.DataFrame:
    ext = filename.lower().rsplit(".", 1)[-1]
    buf = io.BytesIO(content)
    if ext == "csv":
        return pd.read_csv(buf)
    if ext in ("xlsx", "xls"):
        return pd.read_excel(buf)
    if ext == "parquet":
        return pd.read_parquet(buf)
    raise HTTPException(400, f"Unsupported file type: .{ext}")


def _save_dataset_profile(supabase, user_id: str, file_id: str, columns_meta: list[dict], df: pd.DataFrame, missing_summary: dict) -> None:
    now = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table("dataset_profiles").upsert({
            "id": file_id,
            "file_id": file_id,
            "user_id": user_id,
            "inferred_columns": columns_meta,
            "row_count": int(len(df)),
            "missing_summary": missing_summary,
            "sample_preview": df.head(8).fillna("").to_dict("records"),
            "created_at": now,
            "updated_at": now,
        }).execute()
    except Exception:
        pass


def _workflow_node(node_id: str, node_type: str, label: str, category: str, x: int, y: int, config: dict) -> dict:
    return {
        "id": node_id,
        "type": node_type,
        "position": {"x": x, "y": y},
        "data": {"label": label, "category": category, "config": config, "status": "idle"},
    }


def _workflow_edge(source: str, target: str) -> dict:
    return {
        "id": f"{source}-{target}",
        "source": source,
        "target": target,
        "sourceHandle": "dataframe",
        "targetHandle": "dataframe",
        "type": "smoothstep",
    }
