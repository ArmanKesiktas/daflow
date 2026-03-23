from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.nodes.base import BaseNodeProcessor


class ReportBuilderProcessor(BaseNodeProcessor):
    """
    Output node — collects all upstream analysis results and assembles
    a structured JSON report (AnalysisReport schema).

    The canonical JSON is also used as the input to the PDF generator.

    Config keys:
        title        (str):  report title (default "Data Analysis Report")
        include_data (bool): include sample rows in report (default False)
    """

    input_schema = {}   # Accepts any upstream output dynamically
    output_schema = {"report_data": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        title: str = config.get("title", "Data Analysis Report")
        include_data: bool = config.get("include_data", False)

        sections: List[Dict] = []
        metadata: Dict = {}

        # ── Extract metadata from file upload / column type detection ──
        raw_meta = inputs.get("metadata", {})
        if raw_meta:
            metadata.update(raw_meta)

        df = inputs.get("dataframe")
        if df is not None:
            import pandas as pd
            if isinstance(df, pd.DataFrame):
                metadata.setdefault("row_count", int(len(df)))
                metadata.setdefault("column_count", int(len(df.columns)))

        # ── Build sections from known output keys ──────────────────────
        section_map = {
            "statistics":       "statistics",
            "missing_summary":  "missing_value",
            "duplicate_summary":"duplicate_detection",
            "column_types":     "column_type_detection",
            "anomaly_summary":  "anomaly_detection",
            "correlation_matrix":"correlation",
            "distributions":    "distribution",
        }

        import pandas as pd

        for input_key, section_type in section_map.items():
            val = inputs.get(input_key)
            if val is None:
                continue
            if isinstance(val, pd.DataFrame):
                continue  # skip raw DataFrames — only dicts are report-worthy
            if not val:
                continue
            section: Dict[str, Any] = {
                "section_type": section_type,
                "node_id": config.get("node_id", "report"),
                "node_label": section_type.replace("_", " ").title(),
                "data": val,
            }
            # Attach extra context
            if section_type == "anomaly_detection":
                section["data"] = {
                    **val,
                    "anomaly_count": inputs.get("anomaly_count"),
                    "anomaly_rate": inputs.get("anomaly_rate"),
                    "method": inputs.get("method"),
                }
            sections.append(section)

        # ── AI insights (if already computed upstream) ─────────────────
        if "insights" in inputs:
            sections.append({
                "section_type": "ai_insights",
                "node_id": "ai_insights",
                "node_label": "AI Insights",
                "data": {},
                "content": inputs["insights"],
            })

        report_data: Dict[str, Any] = {
            "report_id":     f"rpt_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "title":         title,
            "generated_at":  datetime.now(timezone.utc).isoformat(),
            "workflow_name": config.get("workflow_name", "Untitled Workflow"),
            "metadata":      metadata,
            "sections":      sections,
        }

        return {"report_data": report_data}
