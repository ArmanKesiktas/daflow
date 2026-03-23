from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from scipy import stats

from app.nodes.base import BaseNodeProcessor


class StatisticsProcessor(BaseNodeProcessor):
    """
    Analysis node — computes descriptive statistics for numeric columns.

    Outputs per-column:
        count, mean, median, std, min, max, q1, q3, iqr,
        skewness, kurtosis, cv (coefficient of variation),
        shapiro_p (normality test p-value, if n <= 5000)

    Config keys:
        columns (list[str]): subset of columns; empty = all numeric
    """

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "statistics": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"]

        selected_cols: List[str] = config.get("columns", [])
        numeric_df = df.select_dtypes(include="number")

        if selected_cols:
            numeric_df = numeric_df[[c for c in selected_cols if c in numeric_df.columns]]

        statistics: Dict[str, Dict] = {}
        for col in numeric_df.columns:
            series = numeric_df[col].dropna()
            statistics[col] = self._compute(series)

        return {
            "dataframe": df,
            "statistics": statistics,
            "columns_analysed": list(numeric_df.columns),
        }

    def _compute(self, series: pd.Series) -> Dict[str, Any]:
        n = len(series)
        q1 = float(series.quantile(0.25))
        q3 = float(series.quantile(0.75))
        iqr = q3 - q1

        result: Dict[str, Any] = {
            "count":     int(n),
            "mean":      float(series.mean()),
            "median":    float(series.median()),
            "std":       float(series.std()),
            "variance":  float(series.var()),
            "min":       float(series.min()),
            "max":       float(series.max()),
            "range":     float(series.max() - series.min()),
            "q1":        q1,
            "q3":        q3,
            "iqr":       iqr,
            "skewness":  float(series.skew()),
            "kurtosis":  float(series.kurtosis()),   # excess kurtosis (Fisher)
            "cv":        float(series.std() / series.mean()) if series.mean() != 0 else None,
        }

        # Shapiro-Wilk normality test (only practical for n <= 5000)
        if 3 <= n <= 5000:
            try:
                _, p_value = stats.shapiro(series)
                result["shapiro_p"] = round(float(p_value), 6)
                result["is_normal"] = bool(p_value > 0.05)
            except Exception:
                result["shapiro_p"] = None
                result["is_normal"] = None
        else:
            result["shapiro_p"] = None
            result["is_normal"] = None

        return result
