from typing import Any, Dict

from app.nodes.base import BaseNodeProcessor


class DistributionChartProcessor(BaseNodeProcessor):
    """
    Visualization node — packages distribution analysis output as a dashboard chart panel.
    Renders histogram + KDE charts in the dashboard.
    """

    input_schema = {"dataframe": "DataFrame", "distributions": "dict"}
    output_schema = {"dataframe": "DataFrame", "chart_panel": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        distributions = inputs.get("distributions")

        chart_panel: Dict[str, Any] = {
            "type": "distribution_chart_panel",
            "panel_id": "distribution_chart_panel",
            "title": config.get("title", "Distribution Analysis"),
            "data": {
                "distributions": distributions,
            },
        }

        return {**inputs, "chart_panel": chart_panel}
