import io
import os
import tempfile
import uuid
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import settings
from app.dependencies import get_current_user, get_supabase
from app.schemas.report import FileUploadResponse

router = APIRouter()

# Local temp directory used when DEV_MODE=True
_DEV_UPLOAD_DIR = Path(tempfile.gettempdir()) / "dataflow_dev_uploads"
_DEV_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Upload a CSV or Excel file and return column metadata + preview."""
    MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, f"File too large (max {settings.MAX_UPLOAD_SIZE_MB} MB)")

    filename = file.filename or "upload.csv"
    ext = filename.lower().rsplit(".", 1)[-1]
    if ext not in ("csv", "xlsx", "xls", "parquet"):
        raise HTTPException(400, f"Unsupported file type: .{ext}")

    # Parse
    buf = io.BytesIO(content)
    try:
        if ext == "csv":
            df = pd.read_csv(buf)
        elif ext in ("xlsx", "xls"):
            df = pd.read_excel(buf)
        else:
            df = pd.read_parquet(buf)
    except Exception as exc:
        raise HTTPException(422, f"Could not parse file: {exc}")

    file_id = str(uuid.uuid4())

    if settings.DEV_MODE:
        # Save file to local temp directory; use dev:// URI so FileUploadProcessor can find it
        dest = _DEV_UPLOAD_DIR / file_id
        dest.mkdir(parents=True, exist_ok=True)
        (dest / filename).write_bytes(content)
        storage_path = f"dev://{file_id}/{filename}"
    else:
        # Upload to Supabase Storage
        storage_path = f"{user['id']}/{file_id}/{filename}"
        supabase.storage.from_(settings.STORAGE_BUCKET_DATASETS).upload(
            storage_path, content, {"content-type": file.content_type or "application/octet-stream"}
        )

    # Column metadata — all values must be str to match FileUploadResponse schema
    columns_meta = []
    for col in df.columns:
        columns_meta.append({
            "name": col,
            "type": str(df[col].dtype),
            "missing_count": str(int(df[col].isna().sum())),
        })

    missing_summary = {col: int(df[col].isna().sum()) for col in df.columns}

    # Persist file record
    supabase.table("uploaded_files").insert({
        "id": file_id,
        "user_id": user["id"],
        "filename": filename,
        "storage_path": storage_path,
        "size_bytes": len(content),
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns_meta": columns_meta,
    }).execute()

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
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = (
        supabase.table("uploaded_files")
        .select("id, filename, size_bytes, row_count, column_count, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = (
        supabase.table("uploaded_files")
        .select("storage_path")
        .eq("id", file_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(404, "File not found")

    supabase.storage.from_(settings.STORAGE_BUCKET_DATASETS).remove([row.data["storage_path"]])
    supabase.table("uploaded_files").delete().eq("id", file_id).execute()
    return {"deleted": file_id}


# ── Sample Datasets ────────────────────────────────────────────────────────────

_SAMPLES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "samples"

SAMPLE_DATASETS = [
    {"id": "iris", "filename": "iris.csv", "description": "Iris flower dataset (150 rows)", "row_count": 150, "column_count": 5},
    {"id": "titanic", "filename": "titanic.csv", "description": "Titanic passengers (891 rows)", "row_count": 891, "column_count": 8},
    {"id": "sales_data", "filename": "sales_data.csv", "description": "Sales data (200 rows)", "row_count": 200, "column_count": 7},
]


@router.get("/samples")
async def list_samples():
    return SAMPLE_DATASETS


@router.post("/samples/{sample_id}/load")
async def load_sample(
    sample_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Load a built-in sample dataset – mirrors the upload endpoint logic."""
    sample = next((s for s in SAMPLE_DATASETS if s["id"] == sample_id), None)
    if not sample:
        raise HTTPException(404, "Sample dataset not found")

    csv_path = _SAMPLES_DIR / sample["filename"]
    if not csv_path.exists():
        raise HTTPException(404, "Sample file missing on server")

    content = csv_path.read_bytes()
    filename = sample["filename"]
    df = pd.read_csv(io.BytesIO(content))

    file_id = str(uuid.uuid4())

    if settings.DEV_MODE:
        dest = _DEV_UPLOAD_DIR / file_id
        dest.mkdir(parents=True, exist_ok=True)
        (dest / filename).write_bytes(content)
        storage_path = f"dev://{file_id}/{filename}"
    else:
        storage_path = f"{user['id']}/{file_id}/{filename}"
        supabase.storage.from_(settings.STORAGE_BUCKET_DATASETS).upload(
            storage_path, content, {"content-type": "text/csv"}
        )

    columns_meta = []
    for col in df.columns:
        columns_meta.append({
            "name": col,
            "type": str(df[col].dtype),
            "missing_count": str(int(df[col].isna().sum())),
        })

    missing_summary = {col: int(df[col].isna().sum()) for col in df.columns}

    supabase.table("uploaded_files").insert({
        "id": file_id,
        "user_id": user["id"],
        "filename": filename,
        "storage_path": storage_path,
        "size_bytes": len(content),
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns_meta": columns_meta,
    }).execute()

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
