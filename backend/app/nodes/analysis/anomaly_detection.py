from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from scipy import stats

from app.nodes.base import BaseNodeProcessor


class AnomalyDetectionProcessor(BaseNodeProcessor):
    """
    Analysis node — detects anomalies using one of three custom algorithms.

    Methods:
        iqr              — Interquartile Range (univariate, non-parametric)
        zscore           — Z-Score (univariate, assumes Gaussian)
        modified_zscore  — Modified Z-Score via MAD (robust to extreme outliers)
        isolation_forest — Isolation Forest (multivariate, ML-based)

    Config keys:
        method          (str):   "iqr" | "zscore" | "modified_zscore" | "isolation_forest"
        columns         (list):  numeric columns to analyse; empty = all numeric
        iqr_multiplier  (float): IQR fence multiplier (default 1.5)
        zscore_threshold(float): |z| threshold for z-score method (default 3.0)
        contamination   (float): expected outlier fraction for isolation forest (default 0.05)
        n_estimators    (int):   trees for isolation forest (default 100)
        mark_column     (str):   name of the boolean flag column added to output df (default "_is_anomaly")
    """

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {
        "dataframe":         "DataFrame",   # Original + _is_anomaly column
        "anomalies":         "DataFrame",   # Only anomalous rows
        "clean_data":        "DataFrame",   # Rows without anomalies
        "anomaly_scores":    "dict",        # {row_index: score}
        "anomaly_summary":   "dict",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"].copy()

        method: str = config.get("method", "iqr")
        columns: List[str] = config.get("columns", [])
        mark_col: str = config.get("mark_column", "_is_anomaly")

        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        if columns:
            columns = [c for c in columns if c in numeric_cols]
        else:
            columns = numeric_cols

        if not columns:
            # No numeric columns — return empty result instead of crashing
            import numpy as np
            empty_mask = pd.Series([False] * len(df), index=df.index)
            return {
                "dataframe": df,
                "anomalies": df.iloc[0:0],
                "clean_data": df,
                "anomaly_scores": {},
                "anomaly_summary": {
                    "method": method,
                    "columns_analysed": [],
                    "total_rows": int(len(df)),
                    "anomaly_count": 0,
                    "anomaly_rate": 0.0,
                    "clean_count": int(len(df)),
                    "anomalous_indices": [],
                    "warning": "No numeric columns found. Anomaly detection was skipped.",
                },
                "anomaly_count": 0,
                "anomaly_rate": 0.0,
                "method": method,
            }

        # Dispatch to algorithm
        mask, scores = self._detect(df, columns, method, config)

        # Annotate dataframe
        df[mark_col] = mask

        anomaly_rows = df[mask].copy()
        clean_rows = df[~mask].copy()

        summary = {
            "method": method,
            "columns_analysed": columns,
            "total_rows": int(len(df)),
            "anomaly_count": int(mask.sum()),
            "anomaly_rate": round(float(mask.mean()), 6),
            "clean_count": int((~mask).sum()),
            "anomalous_indices": anomaly_rows.index.tolist()[:200],  # cap for JSON
        }

        # Build chart-ready data per column (scatter plot: index vs value, colored by anomaly)
        chart_data: Dict[str, Any] = {}
        MAX_CHART_POINTS = 2000
        for col in columns:
            series = df[col]
            n = len(series)
            # Downsample if too large
            if n > MAX_CHART_POINTS:
                step = n // MAX_CHART_POINTS
                indices = list(range(0, n, step))[:MAX_CHART_POINTS]
            else:
                indices = list(range(n))
            chart_data[col] = {
                "indices": indices,
                "values": [round(float(series.iloc[i]), 4) if pd.notna(series.iloc[i]) else None for i in indices],
                "is_anomaly": [bool(mask.iloc[i]) for i in indices],
            }

        return {
            "dataframe": df,
            "anomalies": anomaly_rows,
            "clean_data": clean_rows,
            "anomaly_scores": {int(k): round(float(v), 6) for k, v in scores.items()},
            "anomaly_summary": summary,
            "anomaly_count": int(mask.sum()),
            "anomaly_rate": round(float(mask.mean()), 6),
            "method": method,
            "chart_data": chart_data,
        }

    # ── Algorithm implementations ─────────────────────────────

    def _detect(
        self,
        df: pd.DataFrame,
        columns: List[str],
        method: str,
        config: Dict[str, Any],
    ):
        if method == "iqr":
            return self._iqr(df, columns, config.get("iqr_multiplier", 1.5))
        elif method == "zscore":
            return self._zscore(df, columns, config.get("zscore_threshold", 3.0))
        elif method == "modified_zscore":
            return self._modified_zscore(df, columns, config.get("zscore_threshold", 3.5))
        elif method == "isolation_forest":
            return self._isolation_forest(
                df,
                columns,
                contamination=config.get("contamination", 0.05),
                n_estimators=config.get("n_estimators", 100),
            )
        else:
            raise ValueError(f"Unknown anomaly detection method: '{method}'")

    def _iqr(self, df: pd.DataFrame, columns: List[str], multiplier: float):
        """Flag rows where ANY selected column falls outside [Q1 - k*IQR, Q3 + k*IQR]."""
        combined_mask = pd.Series(False, index=df.index)
        scores: Dict[int, float] = {}

        for col in columns:
            series = df[col]
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower = q1 - multiplier * iqr
            upper = q3 + multiplier * iqr
            col_mask = (series < lower) | (series > upper)
            combined_mask |= col_mask

            # Score = max distance beyond fence, normalized by IQR
            for idx in df.index:
                val = series.iloc[idx] if isinstance(series.iloc[0], float) else series[idx]
                dist = max(lower - val, val - upper, 0)
                normalized = dist / iqr if iqr > 0 else 0.0
                scores[int(idx)] = max(scores.get(int(idx), 0.0), normalized)

        return combined_mask, scores

    def _zscore(self, df: pd.DataFrame, columns: List[str], threshold: float):
        """Flag rows where |z-score| exceeds threshold in ANY selected column."""
        combined_mask = pd.Series(False, index=df.index)
        scores: Dict[int, float] = {}

        for col in columns:
            series = df[col].fillna(df[col].mean())
            z = np.abs(stats.zscore(series))
            col_mask = pd.Series(z > threshold, index=df.index)
            combined_mask |= col_mask
            for idx, zv in zip(df.index, z):
                scores[int(idx)] = max(scores.get(int(idx), 0.0), float(zv))

        return combined_mask, scores

    def _modified_zscore(self, df: pd.DataFrame, columns: List[str], threshold: float):
        """Modified Z-Score using Median Absolute Deviation — more robust than standard z-score."""
        combined_mask = pd.Series(False, index=df.index)
        scores: Dict[int, float] = {}

        for col in columns:
            series = df[col].fillna(df[col].median())
            median = series.median()
            mad = np.median(np.abs(series - median))
            if mad == 0:
                mad = 1e-9
            mz = 0.6745 * np.abs(series - median) / mad
            col_mask = pd.Series(mz > threshold, index=df.index)
            combined_mask |= col_mask
            for idx, mzv in zip(df.index, mz):
                scores[int(idx)] = max(scores.get(int(idx), 0.0), float(mzv))

        return combined_mask, scores

    def _isolation_forest(
        self,
        df: pd.DataFrame,
        columns: List[str],
        contamination: float,
        n_estimators: int,
    ):
        """Isolation Forest — multivariate anomaly detection."""
        from sklearn.ensemble import IsolationForest

        X = df[columns].fillna(df[columns].median())
        clf = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=42,
        )
        predictions = clf.fit_predict(X)     # -1 = outlier, 1 = inlier
        raw_scores = clf.score_samples(X)    # lower = more anomalous

        mask = pd.Series(predictions == -1, index=df.index)
        # Normalize scores to [0, 1] where 1 = most anomalous
        norm_scores = (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-9)
        scores = {int(idx): float(1 - s) for idx, s in zip(df.index, norm_scores)}

        return mask, scores
