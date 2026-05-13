import io
import tempfile
from pathlib import Path
from typing import Any, Dict

import pandas as pd

from app.nodes.base import BaseNodeProcessor
from app.config import settings
from app.services.secure_share import decrypt_dataset_bytes

# Must match the directory used in files.py
_DEV_UPLOAD_DIR = Path(tempfile.gettempdir()) / "dataflow_dev_uploads"


class FileUploadProcessor(BaseNodeProcessor):
    """
    Source node — loads a CSV or Excel file and outputs a pandas DataFrame.

    In DEV_MODE the storage_path is a dev://<file_id>/<filename> URI pointing
    to a local temp directory.  In production it is a Supabase Storage path.

    Config keys:
        storage_path (str): path or dev:// URI for the file
        file_id      (str): uploaded_files row ID
    """

    output_schema = {
        "dataframe":    "DataFrame",
        "metadata":     "dict",
        "file_id":      "str",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        storage_path: str = config.get("storage_path", "")
        file_id: str = config.get("file_id", "")
        filename: str = config.get("filename", storage_path.split("/")[-1])

        if not storage_path:
            raise ValueError("FileUploadNode: 'storage_path' is required in config")

        file_bytes = self._load_bytes(storage_path)
        df = self._parse_file(filename, file_bytes)
        columns_meta = self._build_column_meta(df)

        return {
            "dataframe": df,
            "file_id": file_id,
            "metadata": {
                "filename": filename,
                "storage_path": storage_path,
                "row_count": int(len(df)),
                "column_count": int(len(df.columns)),
                "columns": columns_meta,
            },
        }

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _load_bytes(self, storage_path: str) -> bytes:
        """Load file bytes from local disk (dev://) or Supabase Storage."""
        if storage_path.startswith("dev://"):
            rel = storage_path[len("dev://"):]   # e.g. "<file_id>/<filename>"
            local_path = _DEV_UPLOAD_DIR / rel
            if not local_path.exists():
                raise FileNotFoundError(
                    f"Dev file not found: {local_path}. "
                    "Please re-upload the file in the Config panel."
                )
            return decrypt_dataset_bytes(local_path.read_bytes())
        else:
            from app.services.supabase_service import get_supabase_client
            supabase = get_supabase_client()
            return decrypt_dataset_bytes(
                supabase.storage.from_(settings.STORAGE_BUCKET_DATASETS).download(storage_path)
            )

    def _parse_file(self, filename: str, file_bytes: bytes) -> pd.DataFrame:
        ext = filename.lower().rsplit(".", 1)[-1]
        buf = io.BytesIO(file_bytes)
        if ext == "csv":
            return pd.read_csv(buf)
        elif ext in ("xlsx", "xls"):
            return pd.read_excel(buf)
        elif ext == "parquet":
            return pd.read_parquet(buf)
        else:
            raise ValueError(f"Unsupported file format: .{ext}")

    def _build_column_meta(self, df: pd.DataFrame) -> list:
        meta = []
        for col in df.columns:
            meta.append({
                "name": col,
                "dtype": str(df[col].dtype),
                "missing_count": int(df[col].isna().sum()),
                "unique_count": int(df[col].nunique()),
            })
        return meta
