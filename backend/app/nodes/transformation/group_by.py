from typing import Any, Dict
import pandas as pd
from app.nodes.base import BaseNodeProcessor


class GroupByProcessor(BaseNodeProcessor):
    """
    Transformation node — groups rows by one or more columns and applies
    aggregate functions to numeric columns.

    Config keys:
        group_by_columns (list[str]): columns to group by
        aggregations     (dict):      {column: func} e.g. {"sales": "sum", "qty": "mean"}
                                      If empty, applies sum/mean/count to all numeric cols.
    """
    output_schema = {"dataframe": "DataFrame", "group_by_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        df: pd.DataFrame = inputs.get("dataframe")
        if df is None:
            raise ValueError("GroupByNode: no upstream dataframe")

        group_cols = config.get("group_columns", config.get("group_by_columns", []))
        if not group_cols:
            raise ValueError("GroupByNode: 'group_columns' is required")

        agg_config = config.get("aggregations", {})
        # Extract default aggregation (UI sends {"_default": "sum"})
        default_agg = agg_config.pop("_default", None) if isinstance(agg_config, dict) else None
        # Filter out _default key
        agg_config = {k: v for k, v in agg_config.items() if k != "_default"} if isinstance(agg_config, dict) else {}

        numeric_cols = [c for c in df.select_dtypes("number").columns if c not in group_cols]

        if agg_config:
            # User-specified aggregations
            result = df.groupby(group_cols).agg(agg_config).reset_index()
        elif default_agg and numeric_cols:
            agg_dict = {c: default_agg for c in numeric_cols}
            result = df.groupby(group_cols).agg(agg_dict).reset_index()
        elif numeric_cols:
            # Default: sum for all numeric columns
            agg_dict = {c: "sum" for c in numeric_cols}
            result = df.groupby(group_cols).agg(agg_dict).reset_index()
        else:
            result = df.groupby(group_cols).size().reset_index(name="count")

        summary = {
            "group_by_columns": group_cols,
            "input_rows": int(len(df)),
            "output_rows": int(len(result)),
            "output_cols": int(len(result.columns)),
        }

        return {"dataframe": result, "group_by_summary": summary}
