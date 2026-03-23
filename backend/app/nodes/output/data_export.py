import io
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict

import pandas as pd

from app.nodes.base import BaseNodeProcessor

_DEV_UPLOAD_DIR = Path(tempfile.gettempdir()) / "dataflow_dev_uploads"


class DataExportProcessor(BaseNodeProcessor):
    """
    Output node — exports the upstream DataFrame to a downloadable file.

    Config keys:
        format    (str): 'csv' | 'excel' | 'json'  (default 'csv')
        filename  (str): base filename without extension (default 'export')
    """
    output_schema = {"file_id": "str", "filename": "str", "download_path": "str", "row_count": "int"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        df: pd.DataFrame = inputs.get("dataframe")
        if df is None:
            raise ValueError("DataExportNode: no upstream dataframe")

        fmt      = str(config.get("format", "csv")).lower()
        basename = str(config.get("filename", "export")).strip() or "export"
        file_id  = str(uuid.uuid4())

        _DEV_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        ext_map = {"csv": "csv", "excel": "xlsx", "json": "json"}
        ext = ext_map.get(fmt, "csv")
        filename = f"{basename}.{ext}"
        dest = _DEV_UPLOAD_DIR / file_id / filename
        dest.parent.mkdir(parents=True, exist_ok=True)

        if fmt == "csv":
            df.to_csv(dest, index=False)
        elif fmt == "excel":
            df.to_excel(dest, index=False)
        elif fmt == "json":
            df.to_json(dest, orient="records", indent=2)
        else:
            df.to_csv(dest, index=False)

        return {
            "file_id":       file_id,
            "filename":      filename,
            "download_path": f"dev://{file_id}/{filename}",
            "row_count":     int(len(df)),
            "column_count":  int(len(df.columns)),
            "format":        fmt,
        }
