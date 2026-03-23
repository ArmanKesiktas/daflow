from typing import Any, Dict

import pandas as pd

from app.nodes.base import BaseNodeProcessor


class ColumnTypeDetectionProcessor(BaseNodeProcessor):
    """
    Preparation node — inspects each column and determines its semantic type.

    Detected types:
        numeric    — int or float columns
        categorical — object/string columns with low cardinality (< threshold)
        text       — object/string columns with high cardinality
        datetime   — parsed datetime columns
        boolean    — bool or 0/1 binary columns

    Config keys:
        categorical_threshold (int): max unique values to be considered categorical (default 50)
        try_parse_dates       (bool): attempt to coerce object columns to datetime (default True)
    """

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "column_types": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"].copy()

        threshold: int = config.get("categorical_threshold", 50)
        try_parse_dates: bool = config.get("try_parse_dates", True)

        column_types: Dict[str, Dict] = {}
        type_counts = {t: 0 for t in ("numeric", "categorical", "text", "datetime", "boolean")}

        for col in df.columns:
            detected = self._detect_type(df, col, threshold, try_parse_dates)
            column_types[col] = detected
            type_counts[detected["semantic_type"]] += 1

        return {
            "dataframe": df,
            "column_types": column_types,
            "type_summary": type_counts,
        }

    # ── Helpers ───────────────────────────────────────────────

    def _detect_type(
        self,
        df: pd.DataFrame,
        col: str,
        threshold: int,
        try_parse_dates: bool,
    ) -> Dict[str, Any]:
        series = df[col]
        pandas_dtype = str(series.dtype)
        n_unique = int(series.nunique(dropna=True))
        n_missing = int(series.isna().sum())

        # Boolean
        if pandas_dtype == "bool":
            return self._meta("boolean", pandas_dtype, n_unique, n_missing)

        # Numeric
        if pd.api.types.is_numeric_dtype(series):
            # Check binary (0/1)
            vals = set(series.dropna().unique())
            if vals <= {0, 1, 0.0, 1.0}:
                return self._meta("boolean", pandas_dtype, n_unique, n_missing)
            return self._meta("numeric", pandas_dtype, n_unique, n_missing)

        # Datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            return self._meta("datetime", pandas_dtype, n_unique, n_missing)

        # Object column — try date parse
        if try_parse_dates and pandas_dtype == "object":
            try:
                parsed = pd.to_datetime(series, infer_datetime_format=True, errors="raise")
                df[col] = parsed
                return self._meta("datetime", "datetime64", n_unique, n_missing)
            except Exception:
                pass

        # Categorical vs Text
        if n_unique <= threshold:
            return self._meta("categorical", pandas_dtype, n_unique, n_missing)

        return self._meta("text", pandas_dtype, n_unique, n_missing)

    @staticmethod
    def _meta(semantic_type: str, pandas_dtype: str, n_unique: int, n_missing: int) -> Dict:
        return {
            "semantic_type": semantic_type,
            "pandas_dtype": pandas_dtype,
            "unique_count": n_unique,
            "missing_count": n_missing,
        }
