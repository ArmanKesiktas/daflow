from typing import Any, Dict, List

import pandas as pd

from app.nodes.base import BaseNodeProcessor


class MissingValueProcessor(BaseNodeProcessor):
    """
    Preparation node — analyses missing values and optionally imputes them.

    Config keys:
        strategy (str):  "report_only" | "drop_rows" | "fill_mean" | "fill_median" | "fill_mode" | "fill_constant"
        fill_value (any): used when strategy == "fill_constant"
        columns (list):  subset of columns to apply strategy; empty = all columns
    """

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "missing_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"].copy()
        strategy: str = config.get("strategy", "report_only")
        fill_value: Any = config.get("fill_value", 0)
        columns: List[str] = config.get("columns", []) or list(df.columns)

        # Analysis
        missing_summary = self._analyse(df, columns)

        # Imputation (pandas 3.x compatible — no inplace=True)
        if strategy == "drop_rows":
            df = df.dropna(subset=columns).reset_index(drop=True)

        elif strategy == "fill_mean":
            for col in columns:
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    df[col] = df[col].fillna(df[col].mean())

        elif strategy == "fill_median":
            for col in columns:
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    df[col] = df[col].fillna(df[col].median())

        elif strategy == "fill_mode":
            for col in columns:
                if col in df.columns:
                    mode = df[col].mode()
                    if not mode.empty:
                        df[col] = df[col].fillna(mode[0])

        elif strategy == "fill_constant":
            valid_cols = [c for c in columns if c in df.columns]
            df[valid_cols] = df[valid_cols].fillna(fill_value)

        # strategy == "report_only" -> no imputation

        missing_after = self._analyse(df, columns)

        return {
            "dataframe": df,
            "missing_summary": missing_summary,
            "missing_after": missing_after,
            "strategy": strategy,
            "total_missing_before": sum(v["missing_count"] for v in missing_summary.values()),
            "total_missing_after": sum(v["missing_count"] for v in missing_after.values()),
        }

    def _analyse(self, df: pd.DataFrame, columns: List[str]) -> Dict[str, Dict]:
        summary: Dict[str, Dict] = {}
        total_rows = len(df)
        for col in columns:
            if col not in df.columns:
                continue
            count = int(df[col].isna().sum())
            summary[col] = {
                "missing_count": count,
                "missing_pct": round(count / total_rows * 100, 2) if total_rows else 0.0,
                "present_count": total_rows - count,
            }
        return summary
