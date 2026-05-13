from typing import Any, Dict

import pandas as pd

from app.nodes.base import BaseNodeProcessor


class RouteNodeProcessor(BaseNodeProcessor):
    """
    Utility node that merges upstream outputs and passes them onward.

    It intentionally does not transform data. Its purpose is to let dense
    workflow branches converge into a single visual routing point.
    """

    input_schema = {}
    output_schema = {
        "dataframe": "DataFrame",
        "chart_panel": "dict",
        "chart_panels": "list",
        "dashboard_config": "dict",
        "report_data": "dict",
        "route_summary": "dict",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        output = dict(inputs)
        output["route_summary"] = {
            "mode": config.get("mode", "merge"),
            "input_keys": sorted(str(key) for key in inputs.keys()),
            "input_count": len(inputs),
            "has_dataframe": isinstance(inputs.get("dataframe"), pd.DataFrame),
            "chart_panel_count": _chart_panel_count(inputs),
        }
        return output


def _chart_panel_count(inputs: Dict[str, Any]) -> int:
    count = 0
    if isinstance(inputs.get("chart_panel"), dict):
        count += 1
    chart_panels = inputs.get("chart_panels")
    if isinstance(chart_panels, list):
        count += len(chart_panels)
    return count
