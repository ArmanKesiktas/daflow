import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.config import settings
from app.dependencies import get_current_user, get_supabase
from app.schemas.report import ReportCreate, ReportResponse
from app.services.pdf_generator import generate_pdf

router = APIRouter()


@router.get("/")
async def list_reports(
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = (
        supabase.table("reports")
        .select("id, title, format, execution_id, workflow_id, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/", response_model=ReportResponse)
async def create_report(
    payload: ReportCreate,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Generate a PDF/JSON report from an execution's results."""
    # Verify execution ownership
    exec_row = (
        supabase.table("workflow_executions")
        .select("id, workflow_id, status")
        .eq("id", payload.execution_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not exec_row.data:
        raise HTTPException(404, "Execution not found")
    if exec_row.data["status"] != "success":
        raise HTTPException(400, "Cannot generate report: execution has not completed successfully")

    workflow_id = exec_row.data["workflow_id"]

    # Pull workflow name
    wf_row = supabase.table("workflows").select("name").eq("id", workflow_id).single().execute()
    workflow_name = wf_row.data.get("name", "Untitled") if wf_row.data else "Untitled"

    # Aggregate node outputs into report_data
    node_results = (
        supabase.table("node_execution_results")
        .select("node_id, node_type, output_json")
        .eq("execution_id", payload.execution_id)
        .execute()
    )

    report_data = _build_report_data(
        execution_id=payload.execution_id,
        workflow_name=workflow_name,
        title=payload.title or f"Analysis Report — {workflow_name}",
        node_results=node_results.data or [],
    )

    report_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    storage_path = None

    if payload.format == "pdf":
        pdf_bytes = generate_pdf(report_data)
        storage_path = f"{user['id']}/{report_id}/report.pdf"
        supabase.storage.from_(settings.STORAGE_BUCKET_REPORTS).upload(
            storage_path, pdf_bytes, {"content-type": "application/pdf"}
        )

    # Persist report record
    supabase.table("reports").insert({
        "id": report_id,
        "execution_id": payload.execution_id,
        "workflow_id": workflow_id,
        "user_id": user["id"],
        "title": report_data["title"],
        "format": payload.format,
        "storage_path": storage_path,
        "report_data": report_data,
        "created_at": now,
    }).execute()

    return ReportResponse(
        id=report_id,
        execution_id=payload.execution_id,
        title=report_data["title"],
        format=payload.format,
        storage_path=storage_path,
        created_at=now,
    )


@router.get("/{report_id}/pdf")
async def download_pdf(
    report_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Download the generated PDF for a report."""
    row = _get_report(report_id, user["id"], supabase)
    if not row.get("storage_path"):
        raise HTTPException(404, "PDF not available for this report")

    pdf_bytes = supabase.storage.from_(settings.STORAGE_BUCKET_REPORTS).download(row["storage_path"])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{report_id}.pdf"'},
    )


@router.get("/{report_id}/json")
async def get_report_json(
    report_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Return the canonical JSON report data."""
    row = _get_report(report_id, user["id"], supabase)
    return row.get("report_data", {})


@router.post("/{report_id}/ai-insights")
async def generate_ai_insights(
    report_id: str,
    payload: dict = {},
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Generate AI insights for an existing report and return the insight text."""
    from app.nodes.output.ai_insights import AIInsightsProcessor, _build_prompt

    row = _get_report(report_id, user["id"], supabase)
    report_data = row.get("report_data", {})
    if not report_data:
        raise HTTPException(400, "Report has no data to analyse")

    language: str = (payload or {}).get("language", "English")
    provider: str = (payload or {}).get("provider", "gemini")

    processor = AIInsightsProcessor()
    prompt = processor._full_prompt(_build_prompt(report_data), language)

    from app.config import settings
    if provider == "openai":
        api_key = settings.OPENAI_API_KEY
        insights = processor._call_openai(prompt, api_key)
    else:
        api_key = settings.GEMINI_API_KEY
        insights = processor._call_gemini(prompt, api_key)

    # Persist insights into report_data.sections so it loads on next visit
    sections: list = list(report_data.get("sections") or [])
    # Remove any existing ai_insights section then append fresh one
    sections = [s for s in sections if s.get("section_type") != "ai_insights"]
    sections.append({
        "section_type": "ai_insights",
        "node_label": "AI Insights",
        "content": insights,
        "data": {},
    })
    updated_report_data = {**report_data, "sections": sections}
    supabase.table("reports").update({"report_data": updated_report_data}).eq("id", report_id).execute()

    return {"insights": insights}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_report(report_id: str, user_id: str, supabase) -> dict:
    result = (
        supabase.table("reports")
        .select("*")
        .eq("id", report_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Report not found")
    return result.data


def _build_report_data(
    execution_id: str,
    workflow_name: str,
    title: str,
    node_results: list,
) -> dict:
    """Aggregate node outputs into the canonical report JSON structure."""
    sections = []
    metadata = {"execution_id": execution_id}

    section_type_map = {
        "statistics":           "statistics",
        "missing_value":        "missing_value",
        "duplicate_detection":  "duplicate_detection",
        "column_type_detection":"column_type_detection",
        "anomaly_detection":    "anomaly_detection",
        "correlation":          "correlation",
        "distribution":         "distribution",
        "ai_insights":          "ai_insights",
    }

    for node_result in node_results:
        node_type = node_result.get("node_type", "")
        output = node_result.get("output_json", {}) or {}

        if node_type == "file_upload":
            meta = output.get("metadata", {})
            if meta:
                metadata.update(meta)
            continue

        stype = section_type_map.get(node_type)
        if not stype:
            continue

        section_data = {}
        content = None

        if stype == "statistics":
            section_data = output.get("statistics", {})
        elif stype == "missing_value":
            section_data = output.get("missing_summary", {})
        elif stype == "duplicate_detection":
            section_data = output.get("duplicate_summary", {})
        elif stype == "column_type_detection":
            section_data = output.get("column_types", {})
        elif stype == "anomaly_detection":
            section_data = output.get("anomaly_summary", {})
        elif stype == "correlation":
            section_data = {
                "correlation_matrix": output.get("correlation_matrix", {}),
                "strong_pairs": output.get("strong_pairs", []),
                "method": output.get("method", "pearson"),
            }
        elif stype == "distribution":
            section_data = output.get("distributions", {})
        elif stype == "ai_insights":
            content = output.get("insights", "")

        section = {
            "section_type": stype,
            "node_id": node_result.get("node_id", ""),
            "node_label": stype.replace("_", " ").title(),
            "data": section_data,
        }
        if content:
            section["content"] = content

        sections.append(section)

    return {
        "report_id": execution_id,
        "title": title,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workflow_name": workflow_name,
        "metadata": metadata,
        "sections": sections,
    }
