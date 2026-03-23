from typing import Any, Dict, List

import pandas as pd
from scipy import stats as scipy_stats

from app.nodes.base import BaseNodeProcessor


class CorrelationProcessor(BaseNodeProcessor):
    """
    Analysis node — computes a correlation matrix and identifies strong pairs.

    Config keys:
        method    (str):   "pearson" | "spearman" | "kendall" (default "pearson")
        threshold (float): minimum |r| to classify as strong (default 0.7)
        columns   (list):  subset of numeric columns; empty = all numeric
    """

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {
        "dataframe":         "DataFrame",
        "correlation_matrix":"dict",
        "strong_pairs":      "list",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"]
        method: str = config.get("method", "pearson")
        threshold: float = float(config.get("threshold", 0.7))
        columns: List[str] = config.get("columns", [])

        numeric_df = df.select_dtypes(include="number")
        if columns:
            numeric_df = numeric_df[[c for c in columns if c in numeric_df.columns]]

        if len(numeric_df.columns) < 2:
            # Not enough numeric columns — return empty result instead of crashing
            return {
                "dataframe": df,
                "correlation_matrix": {},
                "strong_pairs": [],
                "p_value_matrix": {},
                "method": method,
                "threshold": threshold,
                "columns_analysed": list(numeric_df.columns),
                "warning": (
                    f"Correlation analysis requires at least 2 numeric columns. "
                    f"Found: {list(numeric_df.columns) or 'none'}. "
                    f"Non-numeric columns were skipped."
                ),
            }

        corr_matrix = numeric_df.corr(method=method)
        strong_pairs = self._find_strong_pairs(corr_matrix, threshold)
        p_matrix = self._compute_p_values(numeric_df, method)

        return {
            "dataframe": df,
            "correlation_matrix": corr_matrix.round(6).to_dict(),
            "strong_pairs": strong_pairs,
            "p_value_matrix": p_matrix,
            "method": method,
            "threshold": threshold,
            "columns_analysed": list(numeric_df.columns),
        }

    def _find_strong_pairs(self, corr: pd.DataFrame, threshold: float) -> List[Dict]:
        pairs = []
        cols = corr.columns.tolist()
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                r = corr.iloc[i, j]
                if abs(r) >= threshold:
                    pairs.append({
                        "col_a": cols[i],
                        "col_b": cols[j],
                        "correlation": round(float(r), 6),
                        "abs_correlation": round(abs(float(r)), 6),
                        "direction": "positive" if r > 0 else "negative",
                        "strength": "very_strong" if abs(r) >= 0.9 else "strong",
                    })
        pairs.sort(key=lambda x: -x["abs_correlation"])
        return pairs

    def _compute_p_values(self, df: pd.DataFrame, method: str) -> Dict:
        """Compute pairwise p-values using scipy."""
        cols = df.columns.tolist()
        p_matrix: Dict[str, Dict[str, float]] = {}
        for col_a in cols:
            p_matrix[col_a] = {}
            for col_b in cols:
                if col_a == col_b:
                    p_matrix[col_a][col_b] = 0.0
                    continue
                a = df[col_a].dropna()
                b = df[col_b].dropna()
                # Align on common indices
                common = a.index.intersection(b.index)
                if len(common) < 3:
                    p_matrix[col_a][col_b] = None
                    continue
                try:
                    if method == "pearson":
                        _, p = scipy_stats.pearsonr(a[common], b[common])
                    elif method == "spearman":
                        _, p = scipy_stats.spearmanr(a[common], b[common])
                    else:
                        _, p = scipy_stats.kendalltau(a[common], b[common])
                    p_matrix[col_a][col_b] = round(float(p), 6)
                except Exception:
                    p_matrix[col_a][col_b] = None
        return p_matrix
