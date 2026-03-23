from typing import Any, Dict, List

import numpy as np
import pandas as pd
from scipy import stats

from app.nodes.base import BaseNodeProcessor


class DistributionProcessor(BaseNodeProcessor):
    """
    Analysis node — analyses the distribution shape of numeric columns.

    Computes:
        - Histogram bin frequencies
        - Kernel Density Estimate (KDE) points
        - Skewness & Kurtosis interpretation
        - Normality tests (Shapiro-Wilk, D'Agostino-Pearson)
        - Percentiles (5, 10, 25, 50, 75, 90, 95)

    Config keys:
        columns  (list[str]): subset of columns; empty = all numeric
        bins     (int):       histogram bin count (default 20)
        kde_points (int):     number of KDE evaluation points (default 100)
    """

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {
        "dataframe":   "DataFrame",
        "distributions": "dict",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"]
        columns: List[str] = config.get("columns", [])
        bins: int = int(config.get("bins", 20))
        kde_points: int = int(config.get("kde_points", 100))

        numeric_df = df.select_dtypes(include="number")
        if columns:
            numeric_df = numeric_df[[c for c in columns if c in numeric_df.columns]]

        distributions: Dict[str, Dict] = {}
        for col in numeric_df.columns:
            series = numeric_df[col].dropna()
            if len(series) < 2:
                continue
            distributions[col] = self._analyse_column(series, bins, kde_points)

        return {
            "dataframe": df,
            "distributions": distributions,
            "columns_analysed": list(numeric_df.columns),
        }

    def _analyse_column(self, series: pd.Series, bins: int, kde_points: int) -> Dict:
        values = series.values.astype(float)

        # Histogram
        hist_counts, bin_edges = np.histogram(values, bins=bins)
        bin_centers = [(bin_edges[i] + bin_edges[i + 1]) / 2 for i in range(len(bin_edges) - 1)]

        # KDE
        try:
            kde = stats.gaussian_kde(values)
            x_range = np.linspace(values.min(), values.max(), kde_points)
            kde_y = kde(x_range).tolist()
            kde_x = x_range.tolist()
        except Exception:
            kde_x, kde_y = [], []

        # Skewness interpretation
        skew = float(series.skew())
        kurt = float(series.kurtosis())  # excess kurtosis
        skew_label = (
            "symmetric" if abs(skew) < 0.5
            else ("moderately_right_skewed" if 0.5 <= skew < 1.0
                  else ("highly_right_skewed" if skew >= 1.0
                        else ("moderately_left_skewed" if -1.0 < skew <= -0.5
                              else "highly_left_skewed")))
        )

        # Normality tests
        normality: Dict = {}
        n = len(values)
        if 3 <= n <= 5000:
            try:
                sw_stat, sw_p = stats.shapiro(values)
                normality["shapiro_wilk"] = {"statistic": round(float(sw_stat), 6), "p_value": round(float(sw_p), 6)}
            except Exception:
                pass
        if n >= 8:
            try:
                dp_stat, dp_p = stats.normaltest(values)
                normality["dagostino_pearson"] = {"statistic": round(float(dp_stat), 6), "p_value": round(float(dp_p), 6)}
            except Exception:
                pass

        # Percentiles
        percentiles = {
            "p5": float(np.percentile(values, 5)),
            "p10": float(np.percentile(values, 10)),
            "p25": float(np.percentile(values, 25)),
            "p50": float(np.percentile(values, 50)),
            "p75": float(np.percentile(values, 75)),
            "p90": float(np.percentile(values, 90)),
            "p95": float(np.percentile(values, 95)),
        }

        return {
            "histogram": {
                "counts": hist_counts.tolist(),
                "bin_centers": [round(b, 4) for b in bin_centers],
                "bin_edges": [round(e, 4) for e in bin_edges.tolist()],
            },
            "kde": {"x": [round(v, 4) for v in kde_x], "y": [round(v, 6) for v in kde_y]},
            "skewness": round(skew, 6),
            "kurtosis": round(kurt, 6),
            "skewness_label": skew_label,
            "kurtosis_label": (
                "normal" if abs(kurt) < 0.5
                else ("leptokurtic (heavy tails)" if kurt > 0 else "platykurtic (light tails)")
            ),
            "normality_tests": normality,
            "percentiles": percentiles,
            "n": n,
        }
