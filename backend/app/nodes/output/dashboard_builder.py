from typing import Any, Dict, List

import pandas as pd

from app.nodes.base import BaseNodeProcessor


class DashboardBuilderProcessor(BaseNodeProcessor):
    """
    Output node — aggregates chart specs and KPI values from upstream
    visualization/analysis nodes into a unified dashboard config.

    The dashboard config is consumed directly by the React frontend
    to render a modular, multi-panel dashboard.

    Config keys:
        title    (str):  dashboard title
        layout   (list): list of panel configs [{type, node_id, title, ...}]
    """

    output_schema = {"dashboard_config": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        title: str = config.get("title", "Analysis Dashboard")
        panels: List[Dict] = []

        # ── New system: chart nodes produce chart_panels list ─────────
        chart_panels = inputs.get("chart_panels")
        if chart_panels and isinstance(chart_panels, list):
            panels = [p for p in chart_panels if isinstance(p, dict)]
            dashboard_config: Dict[str, Any] = {
                "title": title,
                "panels": panels,
                "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
            }
            return {"dashboard_config": dashboard_config}

        # ── Legacy system: analysis nodes connected directly ───────────
        # ── KPI panel from statistics ──────────────────────────────────
        stats = inputs.get("statistics")
        if stats is not None and isinstance(stats, dict):
            kpis = []
            for col, s in stats.items():
                if not isinstance(s, dict):
                    continue
                kpis.append({"label": f"{col} — Mean",     "value": round(s.get("mean", 0), 3)})
                kpis.append({"label": f"{col} — Std Dev",  "value": round(s.get("std", 0), 3)})
                kpis.append({"label": f"{col} — Skewness", "value": round(s.get("skewness", 0), 3)})
            if kpis:
                panels.append({"type": "kpi_grid", "panel_id": "kpi_grid", "title": "Descriptive Statistics", "kpis": kpis[:12]})

        # ── Anomaly summary panel ─────────────────────────────────────
        anomaly = inputs.get("anomaly_summary")
        if anomaly is not None and isinstance(anomaly, dict):
            panels.append({
                "type": "stat_card",
                "panel_id": "anomaly_summary",
                "title": "Anomaly Detection",
                "stats": [
                    {"label": "Method", "value": anomaly.get("method", "N/A")},
                    {"label": "Total Rows", "value": anomaly.get("total_rows", 0)},
                    {"label": "Anomalies Found", "value": anomaly.get("anomaly_count", 0)},
                    {"label": "Anomaly Rate", "value": f"{float(anomaly.get('anomaly_rate', 0) or 0) * 100:.2f}%"},
                ],
            })

        # ── Missing value bar chart ───────────────────────────────────
        missing = inputs.get("missing_summary")
        if missing is not None and isinstance(missing, dict):
            labels = list(missing.keys())
            values = [v.get("missing_pct", 0) for v in missing.values() if isinstance(v, dict)]
            if any(v > 0 for v in values):
                panels.append({
                    "type": "bar_chart",
                    "panel_id": "missing_values",
                    "title": "Missing Values (%)",
                    "data": {
                        "labels": labels,
                        "datasets": [{"label": "Missing %", "data": values}],
                    },
                })

        # ── Correlation heatmap ───────────────────────────────────
        corr = inputs.get("correlation_matrix")
        if corr is not None and isinstance(corr, dict):
            panels.append({
                "type": "heatmap",
                "panel_id": "correlation_heatmap",
                "title": "Correlation Matrix",
                "data": corr,
                "strong_pairs": inputs.get("strong_pairs", []),
            })

        # ── Distribution histograms ───────────────────────────────────
        distributions = inputs.get("distributions")
        if distributions is not None and isinstance(distributions, dict):
            for col, dist in list(distributions.items())[:4]:  # max 4 charts
                hist = dist.get("histogram", {})
                if hist:
                    panels.append({
                        "type": "histogram",
                        "panel_id": "distribution_histogram",
                        "title": f"Distribution: {col}",
                        "column": col,
                        "data": {
                            "labels": [str(round(b, 2)) for b in hist.get("bin_centers", [])],
                            "datasets": [{"label": col, "data": hist.get("counts", [])}],
                        },
                        "skewness": dist.get("skewness"),
                        "kurtosis": dist.get("kurtosis"),
                        "skewness_label": dist.get("skewness_label"),
                    })

        # ── Duplicate summary ─────────────────────────────────────────
        dup = inputs.get("duplicate_summary")
        if dup and isinstance(dup, dict):
            panels.append({
                "type": "stat_card",
                "panel_id": "duplicate_summary",
                "title": "Duplicate Detection",
                "stats": [
                    {"label": "Total Rows", "value": dup.get("total_rows", 0)},
                    {"label": "Duplicate Rows", "value": dup.get("duplicate_count", 0)},
                    {"label": "Duplicate Rate", "value": f"{dup.get('duplicate_pct', 0):.2f}%"},
                    {"label": "Unique Rows", "value": dup.get("unique_rows", 0)},
                ],
            })

        # ── Column types summary ──────────────────────────────────────
        type_summary = inputs.get("type_summary")
        if type_summary and isinstance(type_summary, dict):
            panels.append({
                "type": "donut_chart",
                "panel_id": "column_types",
                "title": "Column Type Distribution",
                "data": {
                    "labels": list(type_summary.keys()),
                    "datasets": [{"data": list(type_summary.values())}],
                },
            })

        # Filter panels by user selection (empty = show all, backward compatible)
        selected = config.get("selected_panels", [])
        if selected:
            panels = [p for p in panels if p.get("panel_id") in selected]

        dashboard_config: Dict[str, Any] = {
            "title": title,
            "panels": panels,
            "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
        }

        return {"dashboard_config": dashboard_config}
