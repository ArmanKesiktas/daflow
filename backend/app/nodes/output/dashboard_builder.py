from datetime import date, datetime
from typing import Any, Dict, List

import pandas as pd

from app.nodes.base import BaseNodeProcessor
from app.nodes.visualization.generic_chart import _build_panel


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
        explicit_charts = config.get("charts", [])
        upstream_chart_panels = inputs.get("chart_panels", [])
        source_data = _source_data(inputs)
        filters = _filter_definitions(source_data.get("columns", []))

        if isinstance(explicit_charts, list) and explicit_charts:
            for chart in explicit_charts:
                if isinstance(chart, str):
                    chart_type = chart
                    chart_config: Dict[str, Any] = {"chart_type": chart_type}
                elif isinstance(chart, dict):
                    chart_type = chart.get("type") or chart.get("chart_type")
                    chart_config = chart
                else:
                    continue
                if not chart_type:
                    continue
                panel = _build_panel(str(chart_type), chart_config.get("title") or _title_for_chart(str(chart_type)), inputs, chart_config)
                panels.append(_enrich_panel(panel, len(panels)))

        if isinstance(upstream_chart_panels, list):
            panels.extend([_enrich_panel(panel, len(panels)) for panel in upstream_chart_panels if isinstance(panel, dict)])

        if panels:
            return {
                "dashboard_config": {
                    "title": title,
                    "panels": panels,
                    "pages": _paginate_panels(panels),
                    "filters": filters,
                    "source_data": source_data,
                    "canvas": {"width": 1920, "height": 1080, "aspect_ratio": "16:9"},
                    "generated_at": datetime.utcnow().isoformat(),
                }
            }

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
                panels.append(_enrich_panel({"type": "kpi_grid", "title": "Descriptive Statistics", "kpis": kpis[:12]}, len(panels)))

        # ── Anomaly summary panel ─────────────────────────────────────
        anomaly = inputs.get("anomaly_summary")
        if anomaly is not None and isinstance(anomaly, dict):
            panels.append(_enrich_panel({
                "type": "stat_card",
                "title": "Anomaly Detection",
                "stats": [
                    {"label": "Method", "value": anomaly.get("method", "N/A")},
                    {"label": "Total Rows", "value": anomaly.get("total_rows", 0)},
                    {"label": "Anomalies Found", "value": anomaly.get("anomaly_count", 0)},
                    {"label": "Anomaly Rate", "value": f"{float(anomaly.get('anomaly_rate', 0) or 0) * 100:.2f}%"},
                ],
            }, len(panels)))

        # ── Missing value bar chart ───────────────────────────────────
        missing = inputs.get("missing_summary")
        if missing is not None and isinstance(missing, dict):
            labels = list(missing.keys())
            values = [v.get("missing_pct", 0) for v in missing.values() if isinstance(v, dict)]
            if any(v > 0 for v in values):
                panels.append(_enrich_panel({
                    "type": "bar_chart",
                    "title": "Missing Values (%)",
                    "data": {
                        "labels": labels,
                        "datasets": [{"label": "Missing %", "data": values}],
                    },
                }, len(panels)))

        # ── Correlation heatmap ───────────────────────────────────
        corr = inputs.get("correlation_matrix")
        if corr is not None and isinstance(corr, dict):
            panels.append(_enrich_panel({
                "type": "heatmap",
                "title": "Correlation Matrix",
                "data": corr,
                "strong_pairs": inputs.get("strong_pairs", []),
            }, len(panels)))

        # ── Distribution histograms ───────────────────────────────────
        distributions = inputs.get("distributions")
        if distributions is not None and isinstance(distributions, dict):
            for col, dist in list(distributions.items())[:4]:  # max 4 charts
                hist = dist.get("histogram", {})
                if hist:
                    panels.append(_enrich_panel({
                        "type": "histogram",
                        "title": f"Distribution: {col}",
                        "column": col,
                        "data": {
                            "labels": [str(round(b, 2)) for b in hist.get("bin_centers", [])],
                            "datasets": [{"label": col, "data": hist.get("counts", [])}],
                        },
                        "skewness": dist.get("skewness"),
                        "kurtosis": dist.get("kurtosis"),
                        "skewness_label": dist.get("skewness_label"),
                    }, len(panels)))

        # ── Duplicate summary ─────────────────────────────────────────
        dup = inputs.get("duplicate_summary")
        if dup and isinstance(dup, dict):
            panels.append(_enrich_panel({
                "type": "stat_card",
                "title": "Duplicate Detection",
                "stats": [
                    {"label": "Total Rows", "value": dup.get("total_rows", 0)},
                    {"label": "Duplicate Rows", "value": dup.get("duplicate_count", 0)},
                    {"label": "Duplicate Rate", "value": f"{dup.get('duplicate_pct', 0):.2f}%"},
                    {"label": "Unique Rows", "value": dup.get("unique_rows", 0)},
                ],
            }, len(panels)))

        # ── Big data processing summary ───────────────────────────────
        big_data = inputs.get("big_data_summary")
        if big_data and isinstance(big_data, dict):
            stats = [
                {"label": "Operation", "value": big_data.get("operation", "big data")},
                {"label": "Input Rows", "value": big_data.get("input_rows", big_data.get("row_count", 0))},
                {"label": "Output Rows", "value": big_data.get("output_rows", "N/A")},
                {"label": "Chunks", "value": big_data.get("chunk_count", big_data.get("mapper_chunks", "N/A"))},
            ]
            if big_data.get("memory_mb") is not None:
                stats.append({"label": "Memory MB", "value": big_data.get("memory_mb")})
            panels.append(_enrich_panel({
                "type": "stat_card",
                "title": "Big Data Processing",
                "stats": stats,
            }, len(panels)))

        # ── Column types summary ──────────────────────────────────────
        type_summary = inputs.get("type_summary")
        if type_summary and isinstance(type_summary, dict):
            panels.append(_enrich_panel({
                "type": "donut_chart",
                "title": "Column Type Distribution",
                "data": {
                    "labels": list(type_summary.keys()),
                    "datasets": [{"data": list(type_summary.values())}],
                },
            }, len(panels)))

        dashboard_config: Dict[str, Any] = {
            "title": title,
            "panels": panels,
            "pages": _paginate_panels(panels),
            "filters": filters,
            "source_data": source_data,
            "canvas": {"width": 1920, "height": 1080, "aspect_ratio": "16:9"},
            "generated_at": datetime.utcnow().isoformat(),
        }

        return {"dashboard_config": dashboard_config}


def _source_data(inputs: Dict[str, Any]) -> Dict[str, Any]:
    df = inputs.get("dataframe")
    if not isinstance(df, pd.DataFrame):
        return {"records": [], "columns": [], "row_count": 0}

    sample = df.head(1000).copy()
    sample = sample.where(pd.notnull(sample), None)
    return {
        "records": [_json_record(row) for row in sample.to_dict("records")],
        "columns": _column_meta(df),
        "row_count": int(len(df)),
        "sampled_rows": int(len(sample)),
    }


def _json_record(row: Dict[str, Any]) -> Dict[str, Any]:
    safe: Dict[str, Any] = {}
    for key, value in row.items():
        if isinstance(value, (pd.Timestamp, datetime, date)):
            safe[str(key)] = value.isoformat()
        elif hasattr(value, "item"):
            try:
                safe[str(key)] = value.item()
            except Exception:
                safe[str(key)] = str(value)
        else:
            safe[str(key)] = value
    return safe


def _column_meta(df: pd.DataFrame) -> List[Dict[str, Any]]:
    columns: List[Dict[str, Any]] = []
    for col in df.columns:
        series = df[col]
        dtype = str(series.dtype)
        if pd.api.types.is_bool_dtype(series):
            semantic = "boolean"
        elif pd.api.types.is_numeric_dtype(series):
            semantic = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(series):
            semantic = "datetime"
        else:
            parsed = pd.to_datetime(series.dropna().head(25), errors="coerce")
            semantic = "datetime" if len(parsed) > 0 and parsed.notna().mean() > 0.8 else "categorical"
        columns.append({
            "name": str(col),
            "dtype": dtype,
            "semantic_type": semantic,
            "unique_count": int(series.nunique(dropna=True)),
            "missing_count": int(series.isna().sum()),
        })
    return columns


def _filter_definitions(columns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    filters = []
    for col in columns:
        semantic = col.get("semantic_type")
        if semantic == "numeric":
            ftype = "range"
        elif semantic == "datetime":
            ftype = "date_range"
        elif semantic == "boolean":
            ftype = "boolean"
        else:
            ftype = "multi_select"
        filters.append({"column": col.get("name"), "label": _humanize(str(col.get("name", ""))), "type": ftype})
    return filters


def _title_for_chart(chart_type: str) -> str:
    return _humanize(chart_type.replace("_chart", ""))


def _humanize(value: str) -> str:
    cleaned = value.replace("_", " ").replace("-", " ").strip()
    return " ".join(part.capitalize() for part in cleaned.split())


def _enrich_panel(panel: Dict[str, Any], index: int) -> Dict[str, Any]:
    panel = dict(panel)
    panel.setdefault("id", f"chart_{index + 1}")
    panel["title"] = _humanize(str(panel.get("title") or panel.get("type") or "Chart"))
    panel.setdefault("description", _description_for_panel(panel))
    panel.setdefault("layout", _default_layout(panel.get("type"), index))
    return panel


def _description_for_panel(panel: Dict[str, Any]) -> str:
    ptype = panel.get("type")
    if ptype in {"kpi_card", "kpi_grid"}:
        return "Summary metrics for the selected dataset."
    if ptype in {"bar_chart", "horizontal_bar_chart", "clustered_bar_chart", "stacked_bar_chart", "overlapping_bars", "dumbbell_chart", "diverging_bar_chart", "small_multiples"}:
        return "Comparison of values across categories or columns."
    if ptype == "histogram":
        return "Distribution shape and frequency bins for the selected column."
    if ptype == "heatmap":
        return "Relationship intensity between numeric columns."
    if ptype in {"donut_chart", "pie_chart", "treemap", "sunburst", "alluvial_diagram", "word_cloud"}:
        return "Composition of values as share of total."
    if ptype in {"connection_map", "network_diagram", "circular_graph", "arc_diagram", "time_based_network_diagram", "correlation_network"}:
        return "Relationship links between entities or correlated fields."
    if ptype in {"dot_map", "choropleth_map", "bubble_map", "cartogram", "dorling_cartogram"}:
        return "Map-style spatial summary generated from available categorical values."
    if ptype == "stat_card":
        return "Key indicators and operational summary."
    return "Dashboard chart generated from workflow results."


def _default_layout(panel_type: Any, index: int) -> Dict[str, int]:
    width = 4 if panel_type == "kpi_card" else 12 if panel_type in {"heatmap", "kpi_grid", "connection_map", "network_diagram", "choropleth_map"} else 6
    height = 4 if panel_type in {"heatmap", "histogram"} else 3
    return {"x": (index % 2) * 6, "y": (index // 2) * 4, "w": width, "h": height}


def _paginate_panels(panels: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    pages: List[Dict[str, Any]] = []
    current: List[Dict[str, Any]] = []
    used_rows = 0
    max_rows = 9
    for panel in panels:
        layout = panel.get("layout") if isinstance(panel.get("layout"), dict) else {}
        rows = int(layout.get("h", 3))
        if current and used_rows + rows > max_rows:
            pages.append({"pageNumber": len(pages) + 1, "title": f"Page {len(pages) + 1}", "charts": current})
            current = []
            used_rows = 0
        current.append(panel)
        used_rows += rows
    if current:
        pages.append({"pageNumber": len(pages) + 1, "title": f"Page {len(pages) + 1}", "charts": current})
    return pages
