from typing import Any, Dict, List

import numpy as np
import pandas as pd
from scipy.stats import norm

from app.nodes.base import BaseNodeProcessor


class CCSGSGAnomalyProcessor(BaseNodeProcessor):
    """
    CCSG-SG: Conformal Copula Surprise with Stability Gating.

    The implementation intentionally follows the requested formula order:
      1. numeric columns -> normalized U_t vectors
      2. alpha_t = -log(c(U_t)) using a Gaussian-copula density approximation
      3. sliding-window conformal p-value from past alpha scores
      4. S_t = -log(p_t)
      5. sigma_t^2 = last-window variance
      6. G_t = 1 / (1 + exp(beta * (sigma_t^2 - tau)))
      7. A_t = G_t * S_t
    """

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {
        "dataframe": "DataFrame",
        "anomalies": "DataFrame",
        "clean_data": "DataFrame",
        "anomaly_scores": "dict",
        "anomaly_summary": "dict",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"].copy()

        selected_columns: List[str] = config.get("columns", [])
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        columns = [col for col in selected_columns if col in numeric_cols] if selected_columns else numeric_cols

        mark_col = str(config.get("mark_column", "_is_ccsg_sg_anomaly"))
        score_col = str(config.get("score_column", "_ccsg_sg_score"))
        window = max(2, int(config.get("window", 30)))
        beta = float(config.get("beta", 8.0))
        tau = max(0.0, float(config.get("tau", 1.0)))
        threshold = max(0.0, float(config.get("threshold", 2.0)))
        ridge = max(1e-9, float(config.get("ridge", 1e-6)))

        if not columns:
            mask = pd.Series(False, index=df.index)
            return self._empty_result(df, mask, columns, mark_col, score_col, "No numeric columns found.")

        X = df[columns].apply(pd.to_numeric, errors="coerce")
        X = X.fillna(X.median(numeric_only=True)).fillna(0.0)

        # 1. Numeric columns -> normalized U_t vectors via empirical CDF ranks.
        U = self._empirical_u(X)

        # 2. Copula-density approximation and alpha_t = -log(c(U_t)).
        alpha = self._copula_surprise_alpha(U, ridge)

        # 3-7. Conformal p-value, surprise, stability, gate, final score.
        p_values = np.ones(len(df), dtype=float)
        surprise = np.zeros(len(df), dtype=float)
        stability = np.zeros(len(df), dtype=float)
        gate = np.ones(len(df), dtype=float)
        final_scores = np.zeros(len(df), dtype=float)

        for t in range(len(df)):
            history = alpha[max(0, t - window):t]
            n = len(history)

            # 3. Sliding-window conformal p-value from past alpha scores.
            p_t = (1 + int(np.sum(history >= alpha[t]))) / (n + 1)
            p_values[t] = p_t

            # 4. Surprise.
            surprise[t] = -np.log(max(p_t, 1e-12))

            # 5. Last-window variance.
            last_window = alpha[max(0, t - window + 1):t + 1]
            sigma2_t = float(np.var(last_window)) if len(last_window) > 1 else 0.0
            stability[t] = sigma2_t

            # 6. Stability gate.
            gate[t] = 1.0 / (1.0 + np.exp(np.clip(beta * (sigma2_t - tau), -60, 60)))

            # 7. Final anomaly score.
            final_scores[t] = gate[t] * surprise[t]

        mask = pd.Series(final_scores >= threshold, index=df.index)
        df[mark_col] = mask
        df[score_col] = final_scores
        df["_ccsg_sg_alpha"] = alpha
        df["_ccsg_sg_p_value"] = p_values
        df["_ccsg_sg_surprise"] = surprise
        df["_ccsg_sg_stability"] = stability
        df["_ccsg_sg_gate"] = gate

        anomalies = df[mask].copy()
        clean_data = df[~mask].copy()

        chart_data = self._chart_data(df, columns, mask)
        score_table = [
            {
                "row": int(i),
                "alpha": round(float(alpha[i]), 6),
                "p_value": round(float(p_values[i]), 6),
                "surprise": round(float(surprise[i]), 6),
                "stability": round(float(stability[i]), 6),
                "gate": round(float(gate[i]), 6),
                "score": round(float(final_scores[i]), 6),
                "is_anomaly": bool(mask.iloc[i]),
            }
            for i in range(min(len(df), 500))
        ]

        summary = {
            "method": "ccsg_sg",
            "name": "CCSG-SG",
            "columns_analysed": columns,
            "total_rows": int(len(df)),
            "window": window,
            "beta": beta,
            "tau": tau,
            "threshold": threshold,
            "anomaly_count": int(mask.sum()),
            "anomaly_rate": round(float(mask.mean()), 6),
            "clean_count": int((~mask).sum()),
            "anomalous_indices": [int(i) for i, flag in enumerate(mask.tolist()) if flag][:200],
            "formula_order": [
                "U_t empirical-CDF normalization",
                "alpha_t = -log(c(U_t))",
                "p_t = (1 + count(alpha_i >= alpha_t)) / (n + 1)",
                "S_t = -log(p_t)",
                "sigma_t^2 = last-window variance",
                "G_t = 1 / (1 + exp(beta * (sigma_t^2 - tau)))",
                "A_t = G_t * S_t",
            ],
            "score_table": score_table,
        }

        return {
            "dataframe": df,
            "anomalies": anomalies,
            "clean_data": clean_data,
            "anomaly_scores": {int(i): round(float(score), 6) for i, score in enumerate(final_scores)},
            "anomaly_summary": summary,
            "anomaly_count": int(mask.sum()),
            "anomaly_rate": round(float(mask.mean()), 6),
            "method": "ccsg_sg",
            "chart_data": chart_data,
        }

    def _empirical_u(self, X: pd.DataFrame) -> np.ndarray:
        n = len(X)
        ranks = X.rank(method="average", pct=False).to_numpy(dtype=float)
        U = ranks / (n + 1.0)
        return np.clip(U, 1e-6, 1.0 - 1e-6)

    def _copula_surprise_alpha(self, U: np.ndarray, ridge: float) -> np.ndarray:
        n, dim = U.shape
        if dim == 1:
            # A one-dimensional copula has density 1. This preserves the formula.
            return np.zeros(n, dtype=float)

        Z = norm.ppf(U)
        corr = np.corrcoef(Z, rowvar=False)
        corr = np.nan_to_num(corr, nan=0.0, posinf=0.0, neginf=0.0)
        corr = np.atleast_2d(corr)
        np.fill_diagonal(corr, 1.0)
        corr = corr + np.eye(dim) * ridge

        sign, logdet = np.linalg.slogdet(corr)
        if sign <= 0:
            corr = corr + np.eye(dim) * max(ridge * 100, 1e-4)
            sign, logdet = np.linalg.slogdet(corr)

        inv_corr = np.linalg.pinv(corr)
        delta = inv_corr - np.eye(dim)
        quadratic = np.einsum("ij,jk,ik->i", Z, delta, Z)
        log_c = -0.5 * logdet - 0.5 * quadratic
        return -log_c

    def _chart_data(self, df: pd.DataFrame, columns: List[str], mask: pd.Series) -> Dict[str, Any]:
        chart_data: Dict[str, Any] = {}
        max_points = 2000
        n = len(df)
        indices = list(range(n)) if n <= max_points else list(range(0, n, max(1, n // max_points)))[:max_points]
        for col in columns:
            series = df[col]
            chart_data[col] = {
                "indices": indices,
                "values": [round(float(series.iloc[i]), 4) if pd.notna(series.iloc[i]) else None for i in indices],
                "is_anomaly": [bool(mask.iloc[i]) for i in indices],
            }
        return chart_data

    def _empty_result(self, df: pd.DataFrame, mask: pd.Series, columns: List[str], mark_col: str, score_col: str, warning: str):
        df[mark_col] = mask
        df[score_col] = 0.0
        return {
            "dataframe": df,
            "anomalies": df.iloc[0:0],
            "clean_data": df,
            "anomaly_scores": {},
            "anomaly_summary": {
                "method": "ccsg_sg",
                "name": "CCSG-SG",
                "columns_analysed": columns,
                "total_rows": int(len(df)),
                "anomaly_count": 0,
                "anomaly_rate": 0.0,
                "clean_count": int(len(df)),
                "anomalous_indices": [],
                "warning": warning,
            },
            "anomaly_count": 0,
            "anomaly_rate": 0.0,
            "method": "ccsg_sg",
            "chart_data": {},
        }
