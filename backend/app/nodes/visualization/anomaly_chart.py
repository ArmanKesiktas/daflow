from typing import Any, Dict

from app.nodes.base import BaseNodeProcessor


class AnomalyChartProcessor(BaseNodeProcessor):
    """
    Visualization node — packages anomaly detection output as a dashboard chart panel.
    Renders the scatter plot (anomaly vs normal points) in the dashboard.
    """

    input_schema = {"dataframe": "DataFrame", "anomaly_summary": "dict"}
    output_schema = {"dataframe": "DataFrame", "chart_panel": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        anomaly_summary = inputs.get("anomaly_summary")
        chart_data = inputs.get("chart_data")
        method = inputs.get("method", "")

        chart_panel: Dict[str, Any] = {
            "type": "anomaly_chart_panel",
            "panel_id": "anomaly_chart_panel",
            "title": config.get("title", "Anomaly Detection"),
            "data": {
                "chart_data": chart_data,
                "method": method,
                "anomaly_summary": anomaly_summary,
            },
        }

        return {**inputs, "chart_panel": chart_panel}
