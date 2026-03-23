from typing import Any, Dict, List

import pandas as pd

from app.nodes.base import BaseNodeProcessor


class EncodeProcessor(BaseNodeProcessor):
    """
    Transformation node — encodes categorical columns as numeric values.

    Methods:
        onehot  — creates binary dummy columns (col_value) and drops original
        label   — maps each unique string to an integer (0, 1, 2, …)
        ordinal — same as label; user-defined order is not supported in this version

    Config keys:
        method   (str):        "onehot" | "label" | "ordinal"
        columns  (list[str]):  columns to encode; empty = all object/categorical
        drop_first (bool):     for one-hot, drop first dummy to avoid multicollinearity (default False)
    """

    input_schema  = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "encode_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"].copy()
        method: str      = config.get("method", "label")
        columns: List[str] = config.get("columns", [])
        drop_first: bool = bool(config.get("drop_first", False))

        cat_cols   = df.select_dtypes(include=["object", "category"]).columns.tolist()
        target_cols = [c for c in columns if c in df.columns] if columns else cat_cols

        summary: Dict[str, Any] = {}

        if method == "onehot":
            before_cols = list(df.columns)
            df = pd.get_dummies(df, columns=target_cols, drop_first=drop_first, dtype=int)
            new_cols = [c for c in df.columns if c not in before_cols]
            summary = {"method": "onehot", "encoded_columns": target_cols, "new_columns": new_cols}

        elif method in ("label", "ordinal"):
            mappings: Dict[str, Dict] = {}
            for col in target_cols:
                if col not in df.columns:
                    continue
                unique_vals = sorted(df[col].dropna().unique().tolist(), key=str)
                mapping = {v: i for i, v in enumerate(unique_vals)}
                df[col] = df[col].map(mapping)
                mappings[col] = {str(k): v for k, v in mapping.items()}
            summary = {"method": method, "encoded_columns": target_cols, "mappings": mappings}

        return {
            "dataframe": df,
            "encode_summary": summary,
        }
