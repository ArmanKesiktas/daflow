from typing import Any, Dict
import pandas as pd
from app.nodes.base import BaseNodeProcessor


class ColumnOpsProcessor(BaseNodeProcessor):
    """
    Transformation node — select, drop, rename, or reorder columns.

    Config keys:
        operation  (str): 'select' | 'drop' | 'rename' | 'cast'
        columns    (list[str]): columns to select or drop
        rename_map (dict):      {old_name: new_name} for rename operation
        cast_map   (dict):      {column: dtype} for cast operation
                                dtype: 'int' | 'float' | 'str' | 'datetime'
    """
    output_schema = {"dataframe": "DataFrame", "column_ops_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        df: pd.DataFrame = inputs.get("dataframe")
        if df is None:
            raise ValueError("ColumnOpsNode: no upstream dataframe")

        df = df.copy()
        operation = config.get("operation", "select")
        cols_before = list(df.columns)

        if operation == "select":
            columns = config.get("columns", [])
            if columns:
                valid = [c for c in columns if c in df.columns]
                df = df[valid]

        elif operation == "drop":
            columns = config.get("columns", [])
            df = df.drop(columns=[c for c in columns if c in df.columns])

        elif operation == "rename":
            rename_map = config.get("rename_map", {})
            df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

        elif operation == "cast":
            cast_map = config.get("cast_map", {})
            dtype_map = {
                "int":      "int64",
                "float":    "float64",
                "str":      "object",
                "datetime": "datetime64[ns]",
            }
            for col, dtype_key in cast_map.items():
                if col not in df.columns:
                    continue
                pandas_dtype = dtype_map.get(dtype_key, dtype_key)
                try:
                    if pandas_dtype == "datetime64[ns]":
                        df[col] = pd.to_datetime(df[col], errors="coerce")
                    else:
                        df[col] = df[col].astype(pandas_dtype)
                except Exception:
                    pass  # skip columns that can't be cast

        summary = {
            "operation":     operation,
            "cols_before":   len(cols_before),
            "cols_after":    len(df.columns),
            "columns_after": list(df.columns),
        }

        return {"dataframe": df, "column_ops_summary": summary}
