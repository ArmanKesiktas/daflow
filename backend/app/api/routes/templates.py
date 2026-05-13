import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_supabase
from app.services.workspace_service import WRITE_ROLES, is_workspace_not_ready, log_activity, require_workspace_role

router = APIRouter()


@router.get("/")
async def list_templates(
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    try:
        custom = (
            supabase.table("workflow_templates")
            .select("*")
            .eq("owner_id", user["id"])
            .order("created_at", desc=True)
            .execute()
            .data or []
        )
    except Exception:
        custom = []
    items = _builtin_templates() + custom
    return _with_user_template_state(items, user["id"], supabase)


@router.post("/")
async def create_template(
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    title = str(payload.get("title") or "").strip()
    graph_data = payload.get("graph_data") or {}
    if not title:
        raise HTTPException(400, "Template title is required")
    if not isinstance(graph_data, dict):
        raise HTTPException(400, "graph_data must be an object")
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "category": str(payload.get("category") or "Custom"),
        "title": title,
        "description": payload.get("description") or "",
        "graph_data": graph_data,
        "required_columns": payload.get("required_columns") or [],
        "is_public": bool(payload.get("is_public", False)),
        "created_at": now,
        "updated_at": now,
    }
    try:
        supabase.table("workflow_templates").insert(row).execute()
    except Exception:
        row["transient"] = True
    return row


@router.post("/{template_id}/create-workflow")
async def create_workflow_from_template(
    template_id: str,
    payload: dict = {},
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    template = _template_by_id(template_id)
    if template is None:
        try:
            template = (
                supabase.table("workflow_templates")
                .select("*")
                .eq("id", template_id)
                .single()
                .execute()
                .data
            )
        except Exception:
            template = None
    if not template:
        raise HTTPException(404, "Template not found")
    graph_data = template.get("graph_data") or {"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 0.82}}
    workflow_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    name = str(payload.get("name") or template.get("title") or "New Workflow")
    try:
        workspace_id, _ = require_workspace_role(supabase, user, payload.get("workspace_id"), WRITE_ROLES)
    except HTTPException as exc:
        if not is_workspace_not_ready(exc):
            raise
        workspace_id = None
    insert_payload = {
        "id": workflow_id,
        "user_id": user["id"],
        "name": name,
        "description": template.get("description"),
        "graph_data": graph_data,
        "created_at": now,
        "updated_at": now,
    }
    if workspace_id:
        insert_payload["workspace_id"] = workspace_id
        insert_payload["project_id"] = payload.get("project_id")
    supabase.table("workflows").insert(insert_payload).execute()
    log_activity(supabase, workspace_id, user["id"], "workflow.created", "workflow", workflow_id, {"template": template.get("title")})
    return {"id": workflow_id, "name": name}


@router.post("/{template_id}/favorite")
async def favorite_template(
    template_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    row = {"user_id": user["id"], "template_id": template_id, "created_at": datetime.now(timezone.utc).isoformat()}
    try:
        supabase.table("template_favorites").insert(row).execute()
    except Exception:
        pass
    return {"template_id": template_id, "is_favorite": True}


@router.delete("/{template_id}/favorite")
async def unfavorite_template(
    template_id: str,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    supabase.table("template_favorites").delete().eq("user_id", user["id"]).eq("template_id", template_id).execute()
    return {"template_id": template_id, "is_favorite": False}


@router.post("/{template_id}/rating")
async def rate_template(
    template_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    rating = int(payload.get("rating") or 0)
    if rating < 1 or rating > 5:
        raise HTTPException(400, "rating must be between 1 and 5")
    now = datetime.now(timezone.utc).isoformat()
    row = {"user_id": user["id"], "template_id": template_id, "rating": rating, "created_at": now, "updated_at": now}
    try:
        supabase.table("template_ratings").upsert(row).execute()
    except Exception:
        supabase.table("template_ratings").delete().eq("user_id", user["id"]).eq("template_id", template_id).execute()
        supabase.table("template_ratings").insert(row).execute()
    return {"template_id": template_id, "rating": rating}


def _with_user_template_state(items: list[dict], user_id: str, supabase) -> list[dict]:
    try:
        favorites = supabase.table("template_favorites").select("*").eq("user_id", user_id).execute().data or []
    except Exception:
        favorites = []
    try:
        ratings = supabase.table("template_ratings").select("*").execute().data or []
    except Exception:
        ratings = []
    favorite_ids = {row.get("template_id") for row in favorites}
    enriched = []
    for item in items:
        template_id = item.get("id")
        template_ratings = [int(row.get("rating") or 0) for row in ratings if row.get("template_id") == template_id]
        own_rating = next((int(row.get("rating") or 0) for row in ratings if row.get("template_id") == template_id and row.get("user_id") == user_id), 0)
        enriched.append({
            **item,
            "is_favorite": template_id in favorite_ids,
            "favorite_count": len([row for row in favorites if row.get("template_id") == template_id]),
            "rating_average": round(sum(template_ratings) / len(template_ratings), 1) if template_ratings else item.get("rating_average", 0),
            "rating_count": len(template_ratings),
            "my_rating": own_rating,
        })
    return enriched


def _template_by_id(template_id: str) -> dict | None:
    return next((item for item in _builtin_templates() if item["id"] == template_id), None)


def _builtin_templates() -> list[dict]:
    return [
        _template("quick_eda", "General", "Quick EDA", "Upload data, profile it, and build a dashboard.", "∿", [
            _node("file", "file_upload", "File Upload", "source", 80, 220, {}),
            _node("stats", "statistics", "Statistics", "analysis", 350, 140, {}),
            _node("dist", "distribution", "Distribution", "analysis", 350, 300, {"bins": 20}),
            _node("dash", "dashboard", "Dashboard", "output", 660, 220, {"title": "Quick EDA Dashboard"}),
        ], [_edge("file", "stats"), _edge("file", "dist"), _edge("stats", "dash"), _edge("dist", "dash")]),
        _template("sales_dashboard", "Business", "Sales Dashboard", "Summarize category trends and generate a presentation-ready dashboard.", "₺", [
            _node("file", "file_upload", "File Upload", "source", 80, 220, {}),
            _node("types", "column_type_detection", "Column Types", "preparation", 330, 90, {}),
            _node("group", "group_by", "Group By", "transformation", 330, 230, {"aggregation": "sum"}),
            _node("chart", "bar_chart", "Category Bar Chart", "visualization", 580, 220, {}),
            _node("dash", "dashboard", "Dashboard", "output", 830, 220, {"title": "Sales Performance Dashboard"}),
        ], [_edge("file", "types"), _edge("file", "group"), _edge("group", "chart"), _edge("chart", "dash")]),
        _template("big_data_profile", "Big Data", "Large Dataset Profile", "Chunk, aggregate, and profile larger tables for a big data course demo.", "▤", [
            _node("file", "file_upload", "File Upload", "source", 80, 260, {}),
            _node("chunk", "chunk_processing", "Chunk Processing", "big_data", 330, 120, {"chunk_size": 10000}),
            _node("map", "mapreduce_aggregation", "MapReduce Aggregation", "big_data", 330, 260, {}),
            _node("profile", "large_dataset_profiler", "Large Dataset Profiler", "big_data", 330, 400, {}),
            _node("report", "report", "Report", "output", 650, 260, {"title": "Large Dataset Report"}),
        ], [_edge("file", "chunk"), _edge("file", "map"), _edge("file", "profile"), _edge("chunk", "report"), _edge("map", "report"), _edge("profile", "report")]),
        _template("anomaly_ccsg", "Analysis", "CCSG-SG Anomaly Detection", "Run the custom conformal copula surprise anomaly method and dashboard the result.", "C", [
            _node("file", "file_upload", "File Upload", "source", 80, 220, {}),
            _node("ccsg", "ccsg_sg_anomaly", "CCSG-SG Anomaly", "analysis", 350, 220, {"window": 50, "beta": 6, "tau": 1}),
            _node("dash", "dashboard", "Dashboard", "output", 650, 220, {"title": "Anomaly Dashboard"}),
        ], [_edge("file", "ccsg"), _edge("ccsg", "dash")]),
        _template("data_quality_audit", "Quality", "Data Quality Audit", "Find missing values, duplicates, column types, and produce a clean quality report.", "Q", [
            _node("file", "file_upload", "File Upload", "source", 80, 260, {}),
            _node("types", "column_type_detection", "Column Types", "preparation", 330, 100, {}),
            _node("missing", "missing_value", "Missing Values", "preparation", 330, 240, {"strategy": "report_only"}),
            _node("dupes", "duplicate_detection", "Duplicates", "preparation", 330, 380, {"drop": False}),
            _node("missing_chart", "missing_values_bar", "Missing Bar", "visualization", 610, 190, {}),
            _node("report", "report", "Quality Report", "output", 900, 260, {"title": "Data Quality Report"}),
        ], [_edge("file", "types"), _edge("file", "missing"), _edge("file", "dupes"), _edge("missing", "missing_chart"), _edge("types", "report"), _edge("missing_chart", "report"), _edge("dupes", "report")], ["Any CSV/Excel table"]),
        _template("executive_kpi_dashboard", "Business", "Executive KPI Dashboard", "Create a board-ready KPI dashboard with summary cards, trend, and category comparison.", "K", [
            _node("file", "file_upload", "File Upload", "source", 80, 260, {}),
            _node("stats", "statistics", "Statistics", "analysis", 330, 150, {}),
            _node("group", "group_by", "Group By", "transformation", 330, 300, {"aggregation": "sum"}),
            _node("kpi", "kpi_grid", "KPI Grid", "visualization", 610, 100, {}),
            _node("bar", "bar_chart", "Category Bar", "visualization", 610, 260, {}),
            _node("line", "line_chart", "Trend Line", "visualization", 610, 420, {}),
            _node("dash", "dashboard", "Executive Dashboard", "output", 900, 260, {"title": "Executive KPI Dashboard"}),
        ], [_edge("file", "stats"), _edge("file", "group"), _edge("stats", "kpi"), _edge("group", "bar"), _edge("file", "line"), _edge("kpi", "dash"), _edge("bar", "dash"), _edge("line", "dash")], ["Numeric metric", "Category or date column"]),
        _template("customer_segmentation", "Machine Learning", "Customer Segmentation", "Profile customers and train a clustering-style ML workflow for segments.", "S", [
            _node("file", "file_upload", "File Upload", "source", 80, 260, {}),
            _node("types", "column_type_detection", "Column Types", "preparation", 320, 140, {}),
            _node("split", "train_test_split", "Train/Test Split", "ml", 320, 310, {"test_size": 0.2}),
            _node("model", "ml_model", "ML Model", "ml", 580, 310, {"task_type": "clustering", "algorithm": "kmeans"}),
            _node("scatter", "scatter_plot", "Segment Scatter", "visualization", 820, 180, {}),
            _node("dash", "dashboard", "Segment Dashboard", "output", 1060, 260, {"title": "Customer Segments"}),
        ], [_edge("file", "types"), _edge("file", "split"), _edge("split", "model"), _edge("model", "scatter"), _edge("scatter", "dash")], ["Customer id", "Numeric behavior columns"]),
        _template("churn_risk_model", "Machine Learning", "Churn Risk Model", "Prepare customer data, train a churn model, and summarize risk signals.", "R", [
            _node("file", "file_upload", "File Upload", "source", 80, 260, {}),
            _node("missing", "missing_value", "Missing Values", "preparation", 320, 140, {}),
            _node("split", "train_test_split", "Train/Test Split", "ml", 320, 310, {"test_size": 0.25, "stratify_column": "churn"}),
            _node("model", "ml_model", "Churn Model", "ml", 580, 310, {"task_type": "classification", "algorithm": "random_forest_classifier", "target_column": "churn"}),
            _node("card", "stat_card", "Risk Summary", "visualization", 830, 220, {}),
            _node("report", "report", "Churn Report", "output", 1080, 260, {"title": "Churn Risk Report"}),
        ], [_edge("file", "missing"), _edge("missing", "split"), _edge("split", "model"), _edge("model", "card"), _edge("card", "report")], ["Target/churn column", "Customer features"]),
        _template("time_series_forecast", "Analysis", "Time Series Forecast", "Analyze a date-based metric with rolling trend and presentation charts.", "T", [
            _node("file", "file_upload", "File Upload", "source", 80, 220, {}),
            _node("types", "column_type_detection", "Column Types", "preparation", 320, 120, {"try_parse_dates": True}),
            _node("series", "time_series", "Time Series", "analysis", 320, 280, {"window": 7, "forecast_periods": 12}),
            _node("line", "line_chart", "Forecast Line", "visualization", 610, 220, {}),
            _node("area", "area_chart", "Trend Area", "visualization", 610, 370, {}),
            _node("dash", "dashboard", "Forecast Dashboard", "output", 900, 290, {"title": "Time Series Forecast"}),
        ], [_edge("file", "types"), _edge("file", "series"), _edge("series", "line"), _edge("series", "area"), _edge("line", "dash"), _edge("area", "dash")], ["Date column", "Numeric value column"]),
        _template("correlation_lab", "Analysis", "Correlation Lab", "Inspect numeric relationships with correlation heatmap and network summaries.", "ρ", [
            _node("file", "file_upload", "File Upload", "source", 80, 240, {}),
            _node("stats", "statistics", "Statistics", "analysis", 330, 120, {}),
            _node("corr", "correlation", "Correlation", "analysis", 330, 280, {"method": "pearson", "threshold": 0.7}),
            _node("heat", "heatmap", "Heatmap", "visualization", 620, 180, {}),
            _node("net", "correlation_network", "Correlation Network", "visualization", 620, 340, {}),
            _node("dash", "dashboard", "Correlation Dashboard", "output", 900, 260, {"title": "Correlation Lab"}),
        ], [_edge("file", "stats"), _edge("file", "corr"), _edge("corr", "heat"), _edge("corr", "net"), _edge("stats", "dash"), _edge("heat", "dash"), _edge("net", "dash")], ["Two or more numeric columns"]),
        _template("survey_insights", "Research", "Survey Insights", "Turn survey answers into type mix, distribution, and readable report sections.", "?", [
            _node("file", "file_upload", "File Upload", "source", 80, 250, {}),
            _node("types", "column_type_detection", "Column Types", "preparation", 330, 120, {}),
            _node("dist", "distribution", "Distribution", "analysis", 330, 270, {"bins": 10}),
            _node("donut", "donut_chart", "Answer Mix", "visualization", 610, 150, {}),
            _node("hist", "histogram", "Response Histogram", "visualization", 610, 310, {}),
            _node("report", "report", "Survey Report", "output", 880, 250, {"title": "Survey Insights Report"}),
        ], [_edge("file", "types"), _edge("file", "dist"), _edge("types", "donut"), _edge("dist", "hist"), _edge("donut", "report"), _edge("hist", "report")], ["Categorical answers", "Optional numeric scores"]),
        _template("marketing_funnel", "Business", "Marketing Funnel", "Analyze campaign funnel data with conversion summaries and executive dashboard output.", "F", [
            _node("file", "file_upload", "File Upload", "source", 80, 260, {}),
            _node("filter", "filter_rows", "Filter Rows", "preparation", 330, 120, {}),
            _node("group", "group_by", "Group By", "transformation", 330, 280, {"aggregation": "sum"}),
            _node("bar", "horizontal_bar_chart", "Funnel Steps", "visualization", 620, 200, {}),
            _node("kpi", "kpi_grid", "Conversion KPIs", "visualization", 620, 360, {}),
            _node("dash", "dashboard", "Funnel Dashboard", "output", 900, 260, {"title": "Marketing Funnel"}),
        ], [_edge("file", "filter"), _edge("filter", "group"), _edge("group", "bar"), _edge("group", "kpi"), _edge("bar", "dash"), _edge("kpi", "dash")], ["Campaign/channel", "Funnel step", "Count or revenue"]),
        _template("inventory_operations", "Operations", "Inventory Operations", "Monitor stock, missing records, category distribution, and operational exceptions.", "I", [
            _node("file", "file_upload", "File Upload", "source", 80, 260, {}),
            _node("missing", "missing_value", "Missing Values", "preparation", 330, 120, {}),
            _node("stats", "statistics", "Statistics", "analysis", 330, 280, {}),
            _node("anom", "anomaly_detection", "Anomaly Detection", "analysis", 330, 440, {"method": "iqr"}),
            _node("bar", "bar_chart", "Stock by Category", "visualization", 620, 210, {}),
            _node("dash", "dashboard", "Operations Dashboard", "output", 900, 300, {"title": "Inventory Operations"}),
        ], [_edge("file", "missing"), _edge("file", "stats"), _edge("file", "anom"), _edge("stats", "bar"), _edge("missing", "dash"), _edge("anom", "dash"), _edge("bar", "dash")], ["SKU/category", "Stock or quantity metric"]),
        _template("large_file_mapreduce", "Big Data", "Large File MapReduce", "Chunk a large dataset, aggregate by key, and export a scalable report.", "M", [
            _node("file", "file_upload", "File Upload", "source", 80, 260, {}),
            _node("chunk", "chunk_processing", "Chunk Processing", "big_data", 330, 120, {"chunk_size": 50000}),
            _node("map", "mapreduce_aggregation", "MapReduce Aggregation", "big_data", 330, 280, {"reducer": "sum"}),
            _node("group", "spark_groupby", "Spark-like GroupBy", "big_data", 330, 440, {"partitions": 8}),
            _node("profile", "large_dataset_profiler", "Large Dataset Profiler", "big_data", 630, 280, {}),
            _node("report", "report", "Big Data Report", "output", 900, 280, {"title": "Large File Processing Report"}),
        ], [_edge("file", "chunk"), _edge("chunk", "map"), _edge("map", "group"), _edge("group", "profile"), _edge("profile", "report")], ["Large row count", "Group key", "Numeric value"]),
        _template("board_report_pack", "Reporting", "Board Report Pack", "Generate a clean report and dashboard package from one uploaded dataset.", "B", [
            _node("file", "file_upload", "File Upload", "source", 80, 260, {}),
            _node("stats", "statistics", "Statistics", "analysis", 330, 120, {}),
            _node("dist", "distribution", "Distribution", "analysis", 330, 280, {}),
            _node("kpi", "kpi_grid", "KPI Grid", "visualization", 610, 120, {}),
            _node("hist", "histogram", "Histogram", "visualization", 610, 280, {}),
            _node("dash", "dashboard", "Dashboard", "output", 890, 150, {"title": "Board Dashboard"}),
            _node("report", "report", "Report", "output", 890, 360, {"title": "Board Report"}),
        ], [_edge("file", "stats"), _edge("file", "dist"), _edge("stats", "kpi"), _edge("dist", "hist"), _edge("kpi", "dash"), _edge("hist", "dash"), _edge("stats", "report"), _edge("dist", "report")], ["Any business dataset"]),
    ]


def _template(template_id: str, category: str, title: str, description: str, icon: str, nodes: list[dict], edges: list[dict], required_columns: list[str] | None = None) -> dict:
    return {
        "id": template_id,
        "owner_id": None,
        "category": category,
        "title": title,
        "name": title,
        "description": description,
        "icon": icon,
        "required_columns": required_columns or [],
        "graph_data": {"nodes": nodes, "edges": edges, "viewport": {"x": 0, "y": 0, "zoom": 0.82}},
        "is_public": True,
    }


def _node(node_id: str, node_type: str, label: str, category: str, x: int, y: int, config: dict) -> dict:
    return {"id": node_id, "type": node_type, "position": {"x": x, "y": y}, "data": {"label": label, "category": category, "config": config, "status": "idle"}}


def _edge(source: str, target: str) -> dict:
    return {"id": f"{source}-{target}", "source": source, "target": target, "sourceHandle": "dataframe", "targetHandle": "dataframe", "type": "smoothstep"}
