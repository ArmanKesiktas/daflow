"""
PDF Report Generator using ReportLab.
Converts the canonical JSON report structure into a styled PDF document.
"""
from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak,
)

# Brand colors
COLOR_PRIMARY = colors.HexColor("#1a1a2e")
COLOR_ACCENT  = colors.HexColor("#4f8ef7")
COLOR_LIGHT   = colors.HexColor("#f0f4ff")
COLOR_WARN    = colors.HexColor("#e67e22")
COLOR_DANGER  = colors.HexColor("#e74c3c")
COLOR_SUCCESS = colors.HexColor("#27ae60")


def generate_pdf(report_data: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = _build_styles()
    story: List = []

    # ── Cover ──────────────────────────────────────────────────────────
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(report_data.get("title", "Data Analysis Report"), styles["title"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=COLOR_ACCENT))
    story.append(Spacer(1, 0.3 * cm))

    meta = report_data.get("metadata", {})
    story.append(Paragraph(
        f"Workflow: <b>{report_data.get('workflow_name', 'N/A')}</b>  |  "
        f"Generated: <b>{report_data.get('generated_at', 'N/A')[:19]}</b>  |  "
        f"Rows: <b>{meta.get('row_count', 'N/A')}</b>  |  "
        f"Columns: <b>{meta.get('column_count', 'N/A')}</b>",
        styles["meta"],
    ))
    story.append(Spacer(1, 0.8 * cm))

    # ── Sections ───────────────────────────────────────────────────────
    for section in report_data.get("sections", []):
        stype = section.get("section_type", "")
        label = section.get("node_label", stype.replace("_", " ").title())
        data = section.get("data", {})

        story.append(Paragraph(label, styles["h1"]))
        story.append(Spacer(1, 0.15 * cm))

        if stype == "statistics":
            story += _render_statistics(data, styles)
        elif stype == "missing_value":
            story += _render_missing(data, styles)
        elif stype == "anomaly_detection":
            story += _render_anomaly(data, styles)
        elif stype == "correlation":
            story += _render_correlation(data, styles)
        elif stype == "duplicate_detection":
            story += _render_duplicate(data, styles)
        elif stype == "column_type_detection":
            story += _render_column_types(section.get("data", {}), styles)
        elif stype == "ai_insights":
            story += _render_ai_insights(section.get("content", ""), styles)

        story.append(Spacer(1, 0.6 * cm))

    doc.build(story)
    return buffer.getvalue()


# ── Section renderers ──────────────────────────────────────────────────────────

def _render_statistics(data: Dict, styles: Dict) -> List:
    if not data:
        return [Paragraph("No statistics data available.", styles["normal"])]
    rows = [["Column", "Mean", "Std Dev", "Min", "Max", "Skewness", "Kurtosis", "Normal?"]]
    for col, s in data.items():
        if not isinstance(s, dict):
            continue
        rows.append([
            col,
            _fmt(s.get("mean")),
            _fmt(s.get("std")),
            _fmt(s.get("min")),
            _fmt(s.get("max")),
            _fmt(s.get("skewness")),
            _fmt(s.get("kurtosis")),
            "Yes" if s.get("is_normal") else ("No" if s.get("is_normal") is False else "N/A"),
        ])
    return [_styled_table(rows)]


def _render_missing(data: Dict, styles: Dict) -> List:
    if not data:
        return [Paragraph("No missing value data available.", styles["normal"])]
    rows = [["Column", "Missing Count", "Missing %", "Present Count"]]
    for col, info in data.items():
        if not isinstance(info, dict):
            continue
        rows.append([
            col,
            str(info.get("missing_count", 0)),
            f"{info.get('missing_pct', 0):.2f}%",
            str(info.get("present_count", 0)),
        ])
    return [_styled_table(rows)]


def _render_anomaly(data: Dict, styles: Dict) -> List:
    elements = []
    summary_rows = [
        ["Metric", "Value"],
        ["Method", str(data.get("method", "N/A"))],
        ["Total Rows", str(data.get("total_rows", "N/A"))],
        ["Anomalies Found", str(data.get("anomaly_count", "N/A"))],
        ["Anomaly Rate", f"{float(data.get('anomaly_rate', 0) or 0) * 100:.2f}%"],
        ["Clean Rows", str(data.get("clean_count", "N/A"))],
        ["Columns Analysed", ", ".join(data.get("columns_analysed", []))],
    ]
    elements.append(_styled_table(summary_rows))
    return elements


def _render_correlation(data: Dict, styles: Dict) -> List:
    elements = []
    strong = data.get("strong_pairs", [])
    if not strong:
        elements.append(Paragraph("No strong correlations found above the threshold.", styles["normal"]))
        return elements

    rows = [["Column A", "Column B", "Correlation (r)", "Direction", "Strength"]]
    for p in strong:
        rows.append([
            p.get("col_a", ""),
            p.get("col_b", ""),
            str(p.get("correlation", "")),
            p.get("direction", ""),
            p.get("strength", ""),
        ])
    elements.append(_styled_table(rows))
    return elements


def _render_duplicate(data: Dict, styles: Dict) -> List:
    rows = [
        ["Metric", "Value"],
        ["Total Rows", str(data.get("total_rows", "N/A"))],
        ["Duplicate Rows", str(data.get("duplicate_count", "N/A"))],
        ["Duplicate Rate", f"{data.get('duplicate_pct', 0):.2f}%"],
        ["Unique Rows", str(data.get("unique_rows", "N/A"))],
        ["Keep Strategy", str(data.get("keep_strategy", "N/A"))],
    ]
    return [_styled_table(rows)]


def _render_column_types(data: Dict, styles: Dict) -> List:
    if not data:
        return [Paragraph("No column type data available.", styles["normal"])]
    rows = [["Column", "Semantic Type", "Pandas Dtype", "Unique Count", "Missing Count"]]
    for col, info in data.items():
        if not isinstance(info, dict):
            continue
        rows.append([
            col,
            info.get("semantic_type", ""),
            info.get("pandas_dtype", ""),
            str(info.get("unique_count", "")),
            str(info.get("missing_count", "")),
        ])
    return [_styled_table(rows)]


def _render_ai_insights(content: str, styles: Dict) -> List:
    if not content:
        return [Paragraph("No AI insights available.", styles["normal"])]
    paragraphs = content.strip().split("\n\n")
    elements = []
    for para in paragraphs:
        if para.strip():
            elements.append(Paragraph(para.strip().replace("\n", " "), styles["normal"]))
            elements.append(Spacer(1, 0.2 * cm))
    return elements


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt(val: Any) -> str:
    if val is None:
        return "N/A"
    if isinstance(val, float):
        return f"{val:.4f}"
    return str(val)


def _styled_table(rows: List[List]) -> Table:
    col_count = len(rows[0]) if rows else 1
    table = Table(rows, repeatRows=1)
    style = TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0),  COLOR_PRIMARY),
        ("TEXTCOLOR",    (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0),  9),
        ("BACKGROUND",   (0, 1), (-1, -1), COLOR_LIGHT),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_LIGHT]),
        ("FONTSIZE",     (0, 1), (-1, -1), 8),
        ("GRID",         (0, 0), (-1, -1), 0.4, colors.grey),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING",      (0, 0), (-1, -1), 4),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
    ])
    table.setStyle(style)
    return table


def _build_styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title":  ParagraphStyle("title",  parent=base["Title"],   fontSize=20, textColor=COLOR_PRIMARY, spaceAfter=6),
        "h1":     ParagraphStyle("h1",     parent=base["Heading1"], fontSize=13, textColor=COLOR_PRIMARY, spaceBefore=12, spaceAfter=4),
        "meta":   ParagraphStyle("meta",   parent=base["Normal"],  fontSize=9,  textColor=colors.grey),
        "normal": ParagraphStyle("normal", parent=base["Normal"],  fontSize=9,  leading=14),
    }
