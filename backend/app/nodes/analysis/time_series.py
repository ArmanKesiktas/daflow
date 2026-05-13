from typing import Any, Dict
import pandas as pd
import numpy as np
from app.nodes.base import BaseNodeProcessor


class TimeSeriesProcessor(BaseNodeProcessor):
    """
    Analysis node — time series decomposition, trend detection and basic forecasting.

    Config keys:
        date_column      (str):  datetime column
        value_column     (str):  numeric column to analyse
        freq             (str):  'D' | 'W' | 'M' | 'auto' (default 'auto')
        window           (int):  rolling average window (default 7)
        forecast_periods (int):  number of future periods to forecast (default 0)
        method           (str):  'rolling' | 'decompose'
    """
    output_schema = {
        "dataframe":       "DataFrame",
        "time_series_data": "dict",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        df: pd.DataFrame = inputs.get("dataframe")
        if df is None:
            raise ValueError("TimeSeriesNode: no upstream dataframe")

        date_col    = config.get("date_column", "")
        value_col   = config.get("value_column", "")
        window      = int(config.get("window", 7))
        forecast_n  = int(config.get("forecast_periods", 0))
        method      = config.get("method", "rolling")

        if not date_col or date_col not in df.columns:
            raise ValueError(f"TimeSeriesNode: date_column '{date_col}' not found")
        if not value_col or value_col not in df.columns:
            raise ValueError(f"TimeSeriesNode: value_column '{value_col}' not found")

        # ── Parse and sort ────────────────────────────────────────────────────
        ts = df[[date_col, value_col]].copy()
        ts[date_col] = pd.to_datetime(ts[date_col], errors="coerce")
        ts = ts.dropna(subset=[date_col]).sort_values(date_col).reset_index(drop=True)
        ts = ts.rename(columns={date_col: "date", value_col: "value"})

        # ── Rolling trend ─────────────────────────────────────────────────────
        ts["rolling_mean"] = ts["value"].rolling(window=window, min_periods=1).mean()
        ts["rolling_std"]  = ts["value"].rolling(window=window, min_periods=1).std().fillna(0)

        # ── Linear trend ─────────────────────────────────────────────────────
        x = np.arange(len(ts))
        coeffs = np.polyfit(x, ts["value"].fillna(0), 1)
        ts["trend"] = np.polyval(coeffs, x)
        trend_slope = float(coeffs[0])

        # ── Decompose (statsmodels optional) ─────────────────────────────────
        seasonal_data = None
        if method == "decompose" and len(ts) >= window * 2:
            try:
                from statsmodels.tsa.seasonal import seasonal_decompose
                period = max(2, window)
                decomp = seasonal_decompose(ts["value"].fillna(method="ffill"),
                                            model="additive", period=period, extrapolate_trend="freq")
                ts["seasonal"]  = decomp.seasonal.values
                ts["residual"]  = decomp.resid.fillna(0).values
                seasonal_data = {
                    "seasonal": [round(float(v), 4) for v in decomp.seasonal.values],
                    "residual":  [round(float(v), 4) for v in decomp.resid.fillna(0).values],
                }
            except Exception:
                pass  # statsmodels not installed or insufficient data

        # ── Simple forecast ───────────────────────────────────────────────────
        forecast_rows = []
        if forecast_n > 0:
            last_date = ts["date"].max()
            freq_map = {"D": "D", "W": "W", "M": "MS", "auto": "D"}
            freq = freq_map.get(str(config.get("freq", "auto")), "D")
            future_dates = pd.date_range(last_date, periods=forecast_n + 1, freq=freq)[1:]
            future_x = np.arange(len(ts), len(ts) + forecast_n)
            future_values = np.polyval(coeffs, future_x)
            for d, v in zip(future_dates, future_values):
                forecast_rows.append({"date": d, "value": float(v), "is_forecast": True})

        # ── Build output df ───────────────────────────────────────────────────
        result_df = df.copy()
        result_df[date_col] = pd.to_datetime(result_df[date_col], errors="coerce")
        result_df = result_df.merge(
            ts[["date", "rolling_mean", "rolling_std", "trend"]].rename(
                columns={"date": date_col}),
            on=date_col, how="left"
        )

        time_series_data = {
            "dates":         [str(d)[:10] for d in ts["date"]],
            "values":        [round(float(v), 4) if pd.notna(v) else None for v in ts["value"]],
            "rolling_mean":  [round(float(v), 4) if pd.notna(v) else None for v in ts["rolling_mean"]],
            "trend":         [round(float(v), 4) for v in ts["trend"]],
            "trend_slope":   round(trend_slope, 6),
            "trend_direction": "up" if trend_slope > 0 else "down" if trend_slope < 0 else "flat",
            "window":        window,
            "date_column":   date_col,
            "value_column":  value_col,
            "forecast":      forecast_rows,
        }
        if seasonal_data:
            time_series_data["seasonal"] = seasonal_data

        return {"dataframe": result_df, "time_series_data": time_series_data}
