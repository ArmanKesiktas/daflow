from typing import Any, Dict

from app.nodes.base import BaseNodeProcessor


class CorrelationChartProcessor(BaseNodeProcessor):
    """
    Visualization node — packages correlation analysis output as a dashboard chart panel.
    Renders the correlation heatmap in the dashboard.
    """

    input_schema = {"dataframe": "DataFrame", "correlation_matrix": "dict"}
    output_schema = {"dataframe": "DataFrame", "chart_panel": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        correlation_matrix = inputs.get("correlation_matrix")
        strong_pairs = inputs.get("strong_pairs", [])
        method = inputs.get("method", "pearson")

        chart_panel: Dict[str, Any] = {
            "type": "correlation_chart_panel",
            "panel_id": "correlation_chart_panel",
            "title": config.get("title", "Correlation Matrix"),
            "data": {
                "correlation_matrix": correlation_matrix,
                "strong_pairs": strong_pairs,
                "method": method,
            },
        }

        return {**inputs, "chart_panel": chart_panel}
