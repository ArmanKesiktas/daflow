from typing import Any, Dict, List

from app.nodes.base import BaseNodeProcessor

STAT_CHARTS = {
    "kpi_card", "kpi_grid", "radar_chart", "polar_area_chart", "bar_chart", "clustered_bar_chart",
    "stacked_bar_chart", "overlapping_bars", "horizontal_bar_chart", "dumbbell_chart",
    "diverging_bar_chart", "small_multiples", "dual_axis_chart", "slope_chart",
    "parallel_coordinates", "box_plot",
}
DIST_CHARTS = {"histogram", "violin_plot", "area_chart", "stream_graph", "beeswarm_plot", "density_heatmap"}
NETWORK_CHARTS = {"heatmap", "correlation_network", "network_diagram", "connection_map", "circular_graph", "arc_diagram", "time_based_network_diagram"}
ANOMALY_CHARTS = {"scatter_plot", "bubble_chart", "line_chart", "connected_scatter_plot", "convex_hull_chart", "stat_card"}
COMPOSITION_CHARTS = {"pie_chart", "donut_chart", "treemap", "sunburst", "alluvial_diagram", "word_cloud"}
MAP_CHARTS = {"dot_map", "choropleth_map", "bubble_map", "cartogram", "dorling_cartogram"}


class GenericChartProcessor(BaseNodeProcessor):
    """
    Visualization node that packages upstream analysis outputs into a chart panel.
    It does not perform new analysis; it exposes chart intent for DashboardBuilder.
    """

    output_schema = {"dataframe": "DataFrame", "chart_panel": "dict", "chart_panels": "list"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        chart_type = config.get("chart_type") or config.get("type") or "bar_chart"
        title = config.get("title") or _default_title(chart_type)
        panel = _build_panel(chart_type, title, inputs, config)
        return {
            **inputs,
            "chart_panel": panel,
            "chart_panels": [panel],
        }


def _default_title(chart_type: str) -> str:
    return chart_type.replace("_", " ").title()


def _chart_data_from_statistics(stats: Dict[str, Any], metric: str = "mean") -> Dict[str, Any]:
    labels: List[str] = []
    values: List[float] = []
    for col, summary in stats.items():
        if isinstance(summary, dict) and metric in summary:
            labels.append(str(col))
            values.append(float(summary.get(metric) or 0))
    return {"labels": labels, "datasets": [{"label": metric.title(), "data": values}]}


def _network_from_correlation(corr: Dict[str, Any], strong_pairs: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
    labels = list(corr.keys()) if isinstance(corr, dict) else []
    nodes = [{"id": str(label), "label": str(label)} for label in labels[:16]]
    links: List[Dict[str, Any]] = []
    if strong_pairs:
        for pair in strong_pairs[:32]:
            links.append({
                "source": str(pair.get("column_a") or pair.get("source") or ""),
                "target": str(pair.get("column_b") or pair.get("target") or ""),
                "value": abs(float(pair.get("correlation") or pair.get("value") or 0)),
            })
    if not links:
        for i, source in enumerate(labels[:8]):
            row = corr.get(source, {}) if isinstance(corr.get(source), dict) else {}
            for target in labels[i + 1:i + 4]:
                value = row.get(target, 0) if isinstance(row, dict) else 0
                if abs(float(value or 0)) >= 0.35:
                    links.append({"source": str(source), "target": str(target), "value": abs(float(value or 0))})
    return {"nodes": nodes, "links": links[:32]}


def _composition_data(summary: Dict[str, Any]) -> Dict[str, Any]:
    labels = [str(key) for key in summary.keys()]
    values = [float(value or 0) for value in summary.values()]
    return {"labels": labels, "datasets": [{"data": values}]}


def _build_panel(chart_type: str, title: str, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    stats = inputs.get("statistics")
    distributions = inputs.get("distributions")
    corr = inputs.get("correlation_matrix")
    missing = inputs.get("missing_summary")
    duplicate = inputs.get("duplicate_summary")
    type_summary = inputs.get("type_summary")
    anomaly = inputs.get("anomaly_summary")

    panel: Dict[str, Any] = {
        "type": chart_type,
        "title": title,
        "description": config.get("description"),
        "layout": config.get("layout"),
        "aggregation": config.get("aggregation"),
        "source": "chart_node",
    }

    if chart_type in STAT_CHARTS and isinstance(stats, dict):
        panel["data"] = _chart_data_from_statistics(stats, str(config.get("metric", "mean")))
        panel["statistics"] = stats
        if chart_type in {"clustered_bar_chart", "stacked_bar_chart", "overlapping_bars", "dual_axis_chart", "small_multiples", "parallel_coordinates"}:
            panel["data"] = {
                "labels": list(stats.keys()),
                "datasets": [
                    {"label": "Mean", "data": [float(v.get("mean", 0) or 0) if isinstance(v, dict) else 0 for v in stats.values()]},
                    {"label": "Std", "data": [float(v.get("std", 0) or 0) if isinstance(v, dict) else 0 for v in stats.values()]},
                ],
            }
        if chart_type == "kpi_card":
            metric = str(config.get("metric") or "mean")
            column = str(config.get("column") or "")
            summary = stats.get(column) if column else None
            if not isinstance(summary, dict):
                fallback = next(
                    ((str(col), item) for col, item in stats.items() if isinstance(item, dict) and metric in item),
                    ("Metric", {}),
                )
                column, summary = fallback
            raw_value = summary.get(metric, 0) if isinstance(summary, dict) else 0
            value = round(float(raw_value or 0), 3)
            label = str(config.get("label") or f"{column} {metric}".strip())
            panel["description"] = config.get("description")
            panel["kpi"] = {"label": label, "value": value, "metric": metric, "column": column}
            panel["stats"] = [{"label": label, "value": value}]
        if chart_type == "kpi_grid":
            kpis = []
            for col, summary in stats.items():
                if not isinstance(summary, dict):
                    continue
                for metric in ("mean", "std", "skewness"):
                    if metric in summary:
                        kpis.append({"label": f"{col} - {metric}", "value": round(float(summary.get(metric) or 0), 3)})
            panel["kpis"] = kpis[:12]
        return panel

    if chart_type in DIST_CHARTS and isinstance(distributions, dict):
        first_col, first_dist = next(iter(distributions.items())) if distributions else ("", {})
        hist = first_dist.get("histogram", {}) if isinstance(first_dist, dict) else {}
        panel.update({
            "column": first_col,
            "data": {
                "labels": [str(round(x, 2)) for x in hist.get("bin_centers", [])],
                "datasets": [{"label": str(first_col), "data": hist.get("counts", [])}],
            },
            "distributions": distributions,
            "skewness": first_dist.get("skewness") if isinstance(first_dist, dict) else None,
            "kurtosis": first_dist.get("kurtosis") if isinstance(first_dist, dict) else None,
            "skewness_label": first_dist.get("skewness_label") if isinstance(first_dist, dict) else None,
        })
        return panel

    if chart_type in NETWORK_CHARTS and isinstance(corr, dict):
        panel["data"] = corr
        panel["strong_pairs"] = inputs.get("strong_pairs", [])
        panel["network"] = _network_from_correlation(corr, inputs.get("strong_pairs", []))
        return panel

    if chart_type in ANOMALY_CHARTS and isinstance(anomaly, dict):
        panel["data"] = {"chart_data": inputs.get("chart_data"), "anomaly_summary": anomaly}
        panel["stats"] = [
            {"label": "Method", "value": anomaly.get("method", "N/A")},
            {"label": "Total Rows", "value": anomaly.get("total_rows", 0)},
            {"label": "Anomalies", "value": anomaly.get("anomaly_count", 0)},
            {"label": "Rate", "value": f"{float(anomaly.get('anomaly_rate', 0) or 0) * 100:.2f}%"},
        ]
        return panel

    if chart_type == "missing_values_bar" and isinstance(missing, dict):
        panel["type"] = "bar_chart"
        panel["data"] = {
            "labels": list(missing.keys()),
            "datasets": [{"label": "Missing %", "data": [v.get("missing_pct", 0) for v in missing.values() if isinstance(v, dict)]}],
        }
        return panel

    if chart_type == "duplicate_rate_card" and isinstance(duplicate, dict):
        panel["type"] = "stat_card"
        panel["stats"] = [
            {"label": "Total Rows", "value": duplicate.get("total_rows", 0)},
            {"label": "Duplicate Rows", "value": duplicate.get("duplicate_count", 0)},
            {"label": "Duplicate Rate", "value": f"{duplicate.get('duplicate_pct', 0):.2f}%"},
        ]
        return panel

    if chart_type in COMPOSITION_CHARTS and isinstance(type_summary, dict):
        panel["data"] = _composition_data(type_summary)
        return panel

    if chart_type in MAP_CHARTS:
        source = type_summary if isinstance(type_summary, dict) else stats if isinstance(stats, dict) else {}
        if isinstance(source, dict):
            values = []
            labels = []
            for key, value in list(source.items())[:12]:
                labels.append(str(key))
                if isinstance(value, dict):
                    values.append(float(value.get("mean", value.get("count", 1)) or 1))
                else:
                    values.append(float(value or 1))
            panel["data"] = {"labels": labels, "datasets": [{"label": "Value", "data": values}]}
            panel["map_points"] = [
                {"label": label, "value": value, "x": 12 + (idx * 19) % 76, "y": 20 + (idx * 31) % 58}
                for idx, (label, value) in enumerate(zip(labels, values))
            ]
        return panel

    panel["data"] = {"message": "No compatible upstream data for this chart yet."}
    return panel
