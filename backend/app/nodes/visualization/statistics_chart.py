from typing import Any, Dict

from app.nodes.base import BaseNodeProcessor


class StatisticsChartProcessor(BaseNodeProcessor):
    """
    Visualization node — packages statistics analysis output as a dashboard chart panel.
    Passes all inputs through and adds a chart_panel dict for the dashboard to render.
    """

    input_schema = {"dataframe": "DataFrame", "statistics": "dict"}
    output_schema = {"dataframe": "DataFrame", "chart_panel": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        stats = inputs.get("statistics")

        chart_panel: Dict[str, Any] = {
            "type": "statistics_chart_panel",
            "panel_id": "statistics_chart_panel",
            "title": config.get("title", "Descriptive Statistics"),
            "data": {"statistics": stats} if stats else {},
        }

        if stats and isinstance(stats, dict):
            kpis = []
            for col, s in stats.items():
                if not isinstance(s, dict):
                    continue
                kpis.append({"label": f"{col} — Mean",     "value": round(s.get("mean", 0), 3)})
                kpis.append({"label": f"{col} — Std Dev",  "value": round(s.get("std", 0), 3)})
                kpis.append({"label": f"{col} — Skewness", "value": round(s.get("skewness", 0), 3)})
            chart_panel["kpis"] = kpis[:12]

        return {**inputs, "chart_panel": chart_panel}
