from typing import Any, Dict, List

import pandas as pd

from app.nodes.base import BaseNodeProcessor


class NormalizeProcessor(BaseNodeProcessor):
    """
    Transformation node — scales numeric columns to a standard range.

    Methods:
        minmax   — scales to [0, 1]: (x - min) / (max - min)
        zscore   — standardises to mean=0, std=1: (x - mean) / std
        robust   — scales using median and IQR: (x - median) / IQR

    Config keys:
        method   (str):        "minmax" | "zscore" | "robust"
        columns  (list[str]):  columns to normalise; empty = all numeric
    """

    input_schema  = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "normalize_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"].copy()
        method: str       = config.get("method", "minmax")
        columns: List[str] = config.get("columns", [])

        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        target_cols  = [c for c in columns if c in numeric_cols] if columns else numeric_cols

        summary: Dict[str, Dict] = {}

        for col in target_cols:
            series = df[col]
            if method == "minmax":
                mn, mx = series.min(), series.max()
                denom = mx - mn if mx != mn else 1.0
                df[col] = (series - mn) / denom
                summary[col] = {"method": "minmax", "original_min": float(mn), "original_max": float(mx)}
            elif method == "zscore":
                mu, sigma = series.mean(), series.std()
                denom = sigma if sigma != 0 else 1.0
                df[col] = (series - mu) / denom
                summary[col] = {"method": "zscore", "original_mean": float(mu), "original_std": float(sigma)}
            elif method == "robust":
                median = series.median()
                q1, q3 = series.quantile(0.25), series.quantile(0.75)
                iqr = q3 - q1 if q3 != q1 else 1.0
                df[col] = (series - median) / iqr
                summary[col] = {"method": "robust", "original_median": float(median), "iqr": float(iqr)}

        return {
            "dataframe": df,
            "normalize_summary": {
                "method": method,
                "columns_normalised": target_cols,
                "stats": summary,
            },
        }
