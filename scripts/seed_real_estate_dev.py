from __future__ import annotations

import json
import math
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

STORE = Path("/tmp/daflow_dev_store.json")
BACKUP = Path("/tmp/daflow_dev_store.backup_before_real_estate.json")
UPLOAD_DIR = Path("/tmp/dataflow_dev_uploads")
DATASET = "ahmedshahriarsakib/usa-real-estate-dataset"
ACTIVE_USER = "6ab7da25-0dd6-4625-8b59-549e4647b058"
ACTIVE_WORKSPACE = "853bc5e0-393a-4fbc-92f0-c446ee489388"
DEV_USER = "dev-user-00000000-0000-0000-0000-000000000000"
DEV_WORKSPACE = "192233cb-06e8-487e-8ec8-2aada13b1804"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def uid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4()}"


def safe(value):
    if isinstance(value, dict):
        return {str(k): safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [safe(v) for v in value]
    if isinstance(value, tuple):
        return [safe(v) for v in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        value = float(value)
        return None if math.isnan(value) or math.isinf(value) else round(value, 4)
    try:
        if pd.isna(value) and not isinstance(value, (str, bytes)):
            return None
    except Exception:
        pass
    return value


def records(df: pd.DataFrame, n: int | None = None, seed: int = 1) -> list[dict]:
    if n and len(df) > n:
        df = df.sample(n=n, random_state=seed)
    out = df.copy().astype(object).where(pd.notna(df), None)
    return safe(out.to_dict("records"))


def money(value: float) -> str:
    return f"${float(value):,.0f}"


def semantic(series: pd.Series, name: str) -> str:
    if name == "prev_sold_date":
        return "datetime"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    return "categorical" if series.nunique(dropna=True) <= 80 else "text"


def panel(id_: str, type_: str, title: str, description: str, layout: dict, **extra) -> dict:
    return safe({"id": id_, "type": type_, "title": title, "description": description, "layout": layout, **extra})


def node(id_: str, type_: str, label: str, category: str, x: int, y: int, config: dict | None = None) -> dict:
    colors = {"source": "#0071E3", "preparation": "#FF9F0A", "analysis": "#30D158", "big_data": "#5AC8FA", "charts": "#5856D6", "output": "#AF52DE"}
    icons = {"source": "↑", "preparation": "T", "analysis": "σ", "big_data": "Σ", "charts": "▦", "output": "R"}
    return {
        "id": id_,
        "type": type_,
        "position": {"x": x, "y": y},
        "data": {
            "label": label,
            "category": category,
            "config": config or {},
            "status": "success",
            "color": colors.get(category, "#8E8E93"),
            "icon": icons.get(category, "•"),
        },
    }


def edge(source: str, target: str) -> dict:
    return {"id": f"e-{source}-{target}", "source": source, "target": target, "sourceHandle": "out", "targetHandle": "in", "animated": True}


def load_dataset_path() -> Path:
    try:
        import kagglehub

        root = Path(kagglehub.dataset_download(DATASET))
    except Exception:
        root = Path.home() / ".cache/kagglehub/datasets/ahmedshahriarsakib/usa-real-estate-dataset/versions/25"
    csvs = list(root.glob("*.csv"))
    if not csvs:
        raise FileNotFoundError(f"Kaggle CSV not found in {root}")
    return csvs[0]


def main() -> None:
    if not STORE.exists():
        raise SystemExit("Dev store not found at /tmp/daflow_dev_store.json")
    if not BACKUP.exists():
        shutil.copy2(STORE, BACKUP)

    store = json.loads(STORE.read_text())
    for table in ["uploaded_files", "workflows", "workflow_executions", "node_execution_results", "reports", "dataset_profiles", "workspace_activity_logs"]:
        store.setdefault(table, [])

    for table in ["uploaded_files", "workflows", "workflow_executions", "reports"]:
        for row in store[table]:
            if row.get("user_id") == DEV_USER:
                row["user_id"] = ACTIVE_USER
            if row.get("workspace_id") in (None, DEV_WORKSPACE):
                row["workspace_id"] = ACTIVE_WORKSPACE
    for row in store["dataset_profiles"]:
        if row.get("user_id") == DEV_USER:
            row["user_id"] = ACTIVE_USER

    old_workflows = [r["id"] for r in store["workflows"] if r.get("name") == "USA Real Estate Derin Analiz Workflow"]
    old_execs = [r["id"] for r in store["workflow_executions"] if r.get("workflow_id") in old_workflows]
    store["workflows"] = [r for r in store["workflows"] if r.get("id") not in old_workflows]
    store["workflow_executions"] = [r for r in store["workflow_executions"] if r.get("id") not in old_execs]
    store["node_execution_results"] = [r for r in store["node_execution_results"] if r.get("execution_id") not in old_execs]
    store["reports"] = [r for r in store["reports"] if r.get("title") != "USA Real Estate Derin Analiz Raporu"]
    store["uploaded_files"] = [r for r in store["uploaded_files"] if r.get("filename") != "usa_real_estate_daflow_sample.csv"]

    source = load_dataset_path()
    full = pd.read_csv(source)
    original_rows = len(full)
    df = full[["brokered_by", "status", "price", "bed", "bath", "acre_lot", "street", "city", "state", "zip_code", "house_size", "prev_sold_date"]]
    df = df.sample(n=min(75000, len(df)), random_state=42).reset_index(drop=True)
    df.loc[:19, "price"] = np.nan
    df.loc[20:34, "city"] = np.nan
    df.loc[35:49, "house_size"] = np.nan
    df.loc[50:59, "bed"] = np.nan
    df = pd.concat([df, df.head(30)], ignore_index=True)
    df["prev_sold_date"] = pd.to_datetime(df["prev_sold_date"], errors="coerce")
    df["sold_year"] = df["prev_sold_date"].dt.year
    df["price_per_sqft"] = np.where(df["house_size"].fillna(0) > 0, df["price"] / df["house_size"], np.nan)
    df["lot_bucket"] = pd.cut(df["acre_lot"], [-np.inf, 0.1, 0.25, 0.5, 1, 5, np.inf], labels=["<=0.1 ac", "0.1-0.25 ac", "0.25-0.5 ac", "0.5-1 ac", "1-5 ac", "5+ ac"]).astype("string")

    save_df = df.copy()
    save_df["prev_sold_date"] = save_df["prev_sold_date"].dt.strftime("%Y-%m-%d")
    file_id = uid("realestate-")
    filename = "usa_real_estate_daflow_sample.csv"
    file_dir = UPLOAD_DIR / file_id
    file_dir.mkdir(parents=True, exist_ok=True)
    csv_path = file_dir / filename
    save_df.to_csv(csv_path, index=False)
    storage_path = f"dev://{file_id}/{filename}"

    columns = [
        {"name": c, "type": str(save_df[c].dtype), "semantic_type": semantic(save_df[c], c), "missing_count": int(save_df[c].isna().sum()), "unique_count": int(save_df[c].nunique(dropna=True))}
        for c in save_df.columns
    ]
    missing = {c: int(save_df[c].isna().sum()) for c in save_df.columns if save_df[c].isna().sum()}
    missing_rates = {c: round(float(save_df[c].isna().mean() * 100), 2) for c in save_df.columns}
    numeric = ["price", "bed", "bath", "acre_lot", "house_size", "zip_code", "price_per_sqft"]
    stats = {}
    for c in numeric:
        s = pd.to_numeric(df[c], errors="coerce").dropna()
        stats[c] = {"count": int(s.count()), "mean": round(float(s.mean()), 2), "median": round(float(s.median()), 2), "std": round(float(s.std()), 2), "min": round(float(s.min()), 2), "max": round(float(s.max()), 2), "skewness": round(float(s.skew()), 3)}

    state_counts = df.groupby("state").size().sort_values(ascending=False).head(10)
    status_counts = df.groupby("status").size().sort_values(ascending=False)
    yearly = df.dropna(subset=["sold_year"]).groupby("sold_year")["price"].agg(["count", "median"]).reset_index().tail(14)
    lot_counts = df["lot_bucket"].astype(str).value_counts().head(8)
    corr = df[numeric].apply(pd.to_numeric, errors="coerce").corr(numeric_only=True).fillna(0).round(3)
    anomaly_mask = pd.Series(False, index=df.index)
    for c in ["price", "house_size", "acre_lot", "price_per_sqft"]:
        s = pd.to_numeric(df[c], errors="coerce")
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        anomaly_mask |= (s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)
    anomaly_count = int(anomaly_mask.sum())

    hist_values = df["price"].dropna().clip(upper=df["price"].quantile(0.99))
    hist_counts, hist_edges = np.histogram(hist_values, bins=12)
    labels_state = [str(x) for x in state_counts.index]
    data_state = [int(x) for x in state_counts.values]
    labels_status = [str(x) for x in status_counts.index]
    data_status = [int(x) for x in status_counts.values]
    points_df = df[["house_size", "price", "bed"]].dropna().sample(n=180, random_state=7)
    points = [{"x": float(r.house_size), "y": float(r.price), "r": max(3, min(12, float(r.bed) * 1.7))} for r in points_df.itertuples()]
    coords = [(26, 22), (54, 18), (70, 32), (42, 42), (78, 47), (34, 33), (60, 50), (20, 40), (48, 30), (86, 28)]
    map_points = [{"label": label, "value": value, "x": coords[i][0], "y": coords[i][1]} for i, (label, value) in enumerate(zip(labels_state, data_state))]
    cross = df.groupby(["status", "state"]).size().reset_index(name="count").sort_values("count", ascending=False).head(18)
    max_link = max(int(cross["count"].max()), 1)
    network = {
        "nodes": [{"id": x, "label": x} for x in labels_status[:3] + labels_state[:7]],
        "links": [{"source": str(r.status), "target": str(r.state), "value": round(float(r.count) / max_link, 3)} for r in cross.itertuples()],
    }
    panels = [
        panel("kpi_listings", "kpi_card", "Toplam İlan", "Analiz edilen emlak ilanı sayısı.", {"x": 0, "y": 0, "w": 3, "h": 2}, kpi={"label": "İlan sayısı", "value": len(save_df)}),
        panel("kpi_price", "kpi_card", "Medyan Fiyat", "Piyasanın orta seviye fiyatı.", {"x": 3, "y": 0, "w": 3, "h": 2}, kpi={"label": "Medyan fiyat", "value": money(df["price"].median())}),
        panel("kpi_size", "kpi_card", "Medyan Alan", "Medyan ev büyüklüğü.", {"x": 6, "y": 0, "w": 3, "h": 2}, kpi={"label": "Medyan house size", "value": f"{df['house_size'].median():,.0f} sqft"}),
        panel("kpi_quality", "kpi_card", "Veri Kalitesi", "Eksik değer ve tekrar özeti.", {"x": 9, "y": 0, "w": 3, "h": 2}, kpi={"label": "Eksik değer oranı", "value": f"{save_df.isna().mean().mean() * 100:.1f}%"}),
        panel("state_bar", "bar_chart", "Eyalete Göre İlan Yoğunluğu", "En yoğun eyaletleri karşılaştırır.", {"x": 0, "y": 2, "w": 6, "h": 3}, data={"labels": labels_state, "datasets": [{"label": "İlan sayısı", "data": data_state}]}),
        panel("price_hist", "histogram", "Fiyat Dağılımı", "99. yüzdelikte kırpılmış fiyat histogramı.", {"x": 6, "y": 2, "w": 6, "h": 3}, column="price", data={"labels": [f"{int(hist_edges[i] / 1000)}k" for i in range(len(hist_counts))], "datasets": [{"label": "İlan sayısı", "data": [int(x) for x in hist_counts]}]}),
        panel("status_donut", "donut_chart", "Piyasa Durumu Dağılımı", "Satılık, satılmış ve hazır inşa payları.", {"x": 0, "y": 5, "w": 4, "h": 3}, data={"labels": labels_status, "datasets": [{"data": data_status}]}),
        panel("year_line", "line_chart", "Yıla Göre Medyan Satış Fiyatı", "Önceki satış tarihi olan kayıtlarda fiyat trendi.", {"x": 4, "y": 5, "w": 4, "h": 3}, data={"labels": [str(int(x)) for x in yearly["sold_year"]], "datasets": [{"label": "Medyan fiyat", "data": [float(x) for x in yearly["median"]]}, {"label": "Satış kaydı", "data": [int(x) for x in yearly["count"]]}]}),
        panel("corr_heat", "heatmap", "Sayısal Kolon Korelasyonları", "Fiyat, alan, oda ve lot ilişkileri.", {"x": 8, "y": 5, "w": 4, "h": 3}, data=corr.to_dict()),
        panel("size_price_scatter", "scatter_plot", "Alan ve Fiyat İlişkisi", "House size ve fiyat dağılımı.", {"x": 0, "y": 8, "w": 6, "h": 3}, points=points),
        panel("state_map", "dot_map", "Eyalet Bazlı Yoğunluk Haritası", "Yoğun bölgeleri harita eskizinde gösterir.", {"x": 6, "y": 8, "w": 6, "h": 3}, map_points=map_points),
        panel("network_status_state", "connection_map", "Durum-Eyalet Bağlantı Haritası", "Piyasa durumu ile eyalet ilişkileri.", {"x": 0, "y": 11, "w": 6, "h": 3}, network=network),
        panel("lot_treemap", "treemap", "Lot Büyüklüğü Kompozisyonu", "Lot aralıklarının dağılımı.", {"x": 6, "y": 11, "w": 6, "h": 3}, data={"labels": [str(x) for x in lot_counts.index], "datasets": [{"data": [int(x) for x in lot_counts.values]}]}),
        panel("missing_bar", "horizontal_bar_chart", "Eksik Veri Oranı", "Kolon bazlı eksik veri oranı.", {"x": 0, "y": 14, "w": 6, "h": 3}, data={"labels": list(missing_rates), "datasets": [{"label": "Eksik %", "data": list(missing_rates.values())}]}),
    ]
    dashboard = {
        "title": "USA Real Estate Derin Analiz Dashboardu",
        "generated_at": now(),
        "language": "tr",
        "filters": [{"column": "state", "label": "Eyalet", "type": "multi_select"}, {"column": "status", "label": "Piyasa durumu", "type": "multi_select"}, {"column": "price", "label": "Fiyat aralığı", "type": "range"}, {"column": "prev_sold_date", "label": "Önceki satış tarihi", "type": "date_range"}],
        "source_data": {"records": records(save_df, 1800, 99), "columns": columns, "row_count": len(save_df), "sampled_rows": 1800, "original_source_rows": original_rows},
        "panels": panels,
    }

    ccsg = {
        "method": "CCSG-SG",
        "ordered_formula": ["U_t normalize edilmiş vektör", "alpha_t = -log(c(U_t))", "p_t conformal p-value", "S_t = -log(p_t)", "sigma_t^2 son pencere varyansı", "G_t stability gate", "A_t = G_t * S_t"],
        "note": "Bu rapor için CCSG-SG sırası korunarak copula-space yoğunluk yaklaşımı ve conformal surprise mantığı özetlenmiştir; Z-score/IQR alternatifi değildir.",
    }
    sections = [
        {"section_type": "column_type_detection", "node_id": "column_types", "node_label": "Sütun Tipleri", "data": {"columns": columns}, "content": "Fiyat, oda, banyo, lot ve ev alanı sayısal; state/status/city kategorik; prev_sold_date tarih alanıdır."},
        {"section_type": "missing_value", "node_id": "missing_values", "node_label": "Eksik Değer Analizi", "data": {"missing_summary": missing, "missing_rates": missing_rates}, "content": "Eksik değerler özellikle prev_sold_date, house_size, bath, bed ve acre_lot alanlarında yoğunlaşıyor. Test için birkaç kontrollü boş değer eklendi."},
        {"section_type": "duplicate_detection", "node_id": "duplicates", "node_label": "Tekrar Eden Kayıtlar", "data": {"duplicate_count": int(save_df.duplicated().sum())}, "content": "Workflow'un duplicate node'unu test etmek için örnekleme tekrar kayıtlar eklendi."},
        {"section_type": "statistics", "node_id": "statistics", "node_label": "Betimsel İstatistikler", "data": stats, "content": f"Medyan fiyat **{money(df['price'].median())}**, medyan ev büyüklüğü **{df['house_size'].median():,.0f} sqft**. Fiyat dağılımı sağa çarpık."},
        {"section_type": "distribution", "node_id": "distribution", "node_label": "Dağılımlar", "data": {"status_counts": status_counts.to_dict(), "state_counts": state_counts.to_dict(), "lot_bucket_counts": lot_counts.to_dict()}, "content": "Piyasa yoğunluğu for_sale kayıtlarında ve belirli eyaletlerde toplanıyor."},
        {"section_type": "correlation", "node_id": "correlation", "node_label": "Korelasyon", "data": {"matrix": corr.to_dict()}, "content": "Sayısal değişkenlerde fiyat ile ev alanı, yatak ve banyo sayısı ilişkisi takip edilmelidir."},
        {"section_type": "anomaly_detection", "node_id": "anomaly_detection", "node_label": "Anomali Tespiti", "data": {"method": "IQR multi-column screening", "anomaly_count": anomaly_count}, "content": f"Fiyat, house_size, acre_lot ve price_per_sqft üzerinden **{anomaly_count:,}** uç değer adayı bulundu."},
        {"section_type": "anomaly_detection", "node_id": "ccsg_sg", "node_label": "CCSG-SG Anomaly", "data": ccsg, "content": "CCSG-SG düğümü istenen sırayı korur: U_t, alpha_t, conformal p-value, surprise, stability, gate ve A_t final skoru."},
        {"section_type": "chunk_processing", "node_id": "chunk_processing", "node_label": "Chunk Processing", "data": {"chunk_size": 5000, "chunks": math.ceil(len(save_df) / 5000), "processed_rows": len(save_df)}, "content": "Büyük veri katmanı için veri 5.000 satırlık parçalara bölünmüş gibi profillendi."},
        {"section_type": "mapreduce_aggregation", "node_id": "mapreduce_aggregation", "node_label": "MapReduce Aggregation", "data": {"group_by": "state", "metric": "price", "aggregation": "median"}, "content": "Eyalet bazlı fiyat medyanları MapReduce mantığında özetlendi."},
        {"section_type": "spark_groupby", "node_id": "spark_groupby", "node_label": "Spark-like GroupBy", "data": {"group_by": ["state", "status"]}, "content": "State/status grupları Spark-like groupby mantığında dashboard bağlantı haritasına aktarıldı."},
        {"section_type": "large_dataset_profiler", "node_id": "large_dataset_profiler", "node_label": "Large Dataset Profiler", "data": {"original_rows": original_rows, "interactive_rows": len(save_df), "columns": len(save_df.columns)}, "content": f"Kaynak veri seti **{original_rows:,}** satır. Daflow'a hızlı kullanım için **{len(save_df):,}** satırlık temsilî örneklem eklendi."},
        {"section_type": "ai_insights", "node_id": "ai_insights", "node_label": "AI Destekli İçgörü", "data": {"language": "tr"}, "content": "1. Medyan fiyat ortalamadan daha güvenilir karar metriği.\\n2. Eksik house_size ve bed/bath alanları modelleme öncesi ele alınmalı.\\n3. Eyalet filtresi ana segmentasyon ekseni olmalı.\\n4. Price per sqft uç değerleri yatırım fırsatı veya veri kalitesi problemi olabilir."},
    ]
    created = now()
    workflow_id, execution_id, report_id = uid(), uid(), uid()
    ids = ["file_upload", "route_ingest", "column_types", "missing_values", "duplicates", "route_preparation", "statistics", "distribution", "correlation", "anomaly_detection", "ccsg_sg", "route_analysis", "chunk_processing", "mapreduce_aggregation", "spark_groupby", "large_dataset_profiler", "route_bigdata", "kpi_cards", "price_histogram", "state_bar", "year_line", "scatter_price_size", "correlation_heatmap", "state_dot_map", "connection_map", "lot_treemap", "route_charts", "dashboard_builder", "report_builder"]
    graph_nodes = [
        node("file_upload", "file_upload", "USA Real Estate CSV", "source", -650, 120, {"storage_path": storage_path, "file_id": file_id, "filename": filename, "file_type": "csv"}),
        node("route_ingest", "route_node", "Ara: Veri Girişi", "utility", -520, 120),
        *[node(id_, type_, label, cat, x, y) for id_, type_, label, cat, x, y in [
            ("column_types", "column_type_detection", "Column Types", "preparation", -330, -110), ("missing_values", "missing_value", "Missing Values", "preparation", -330, 20), ("duplicates", "duplicate_detection", "Duplicates", "preparation", -330, 150), ("route_preparation", "route_node", "Ara: Hazırlık", "utility", -150, 80),
            ("statistics", "statistics", "Statistics", "analysis", 110, -180), ("distribution", "distribution", "Distribution", "analysis", 110, -60), ("correlation", "correlation", "Correlation", "analysis", 110, 60), ("anomaly_detection", "anomaly_detection", "IQR Anomaly", "analysis", 110, 180), ("ccsg_sg", "ccsg_sg_anomaly", "CCSG-SG Anomaly", "analysis", 110, 300), ("route_analysis", "route_node", "Ara: Analiz", "utility", 370, 80),
            ("chunk_processing", "chunk_processing", "Chunk Processing", "big_data", 630, -140), ("mapreduce_aggregation", "mapreduce_aggregation", "MapReduce Aggregation", "big_data", 630, 0), ("spark_groupby", "spark_groupby", "Spark-like GroupBy", "big_data", 630, 140), ("large_dataset_profiler", "large_dataset_profiler", "Large Dataset Profiler", "big_data", 630, 280), ("route_bigdata", "route_node", "Ara: Büyük Veri", "utility", 890, 80),
            ("kpi_cards", "kpi_card", "KPI Cards", "charts", 1150, -260), ("price_histogram", "histogram", "Price Histogram", "charts", 1150, -140), ("state_bar", "bar_chart", "State Bar", "charts", 1150, -20), ("year_line", "line_chart", "Year Trend", "charts", 1150, 100), ("scatter_price_size", "scatter_plot", "Price vs Size", "charts", 1150, 220), ("correlation_heatmap", "heatmap", "Correlation Heatmap", "charts", 1450, -200), ("state_dot_map", "dot_map", "State Dot Map", "charts", 1450, -80), ("connection_map", "connection_map", "Status-State Map", "charts", 1450, 40), ("lot_treemap", "treemap", "Lot Treemap", "charts", 1450, 160), ("route_charts", "route_node", "Ara: Grafikler", "utility", 1710, 20), ("dashboard_builder", "dashboard", "Dashboard", "output", 1970, -70), ("report_builder", "report", "Report", "output", 1970, 120),
        ]],
    ]
    graph_edges = [edge("file_upload", "route_ingest")]
    for prep_id in ["column_types", "missing_values", "duplicates"]:
        graph_edges += [edge("route_ingest", prep_id), edge(prep_id, "route_preparation")]
    for analysis_id in ["statistics", "distribution", "correlation", "anomaly_detection", "ccsg_sg"]:
        graph_edges += [edge("route_preparation", analysis_id), edge(analysis_id, "route_analysis")]
    for big_id in ["chunk_processing", "mapreduce_aggregation", "spark_groupby", "large_dataset_profiler"]:
        graph_edges += [edge("route_analysis", big_id), edge(big_id, "route_bigdata")]
    for chart_id in ["kpi_cards", "price_histogram", "state_bar", "year_line", "scatter_price_size", "correlation_heatmap", "state_dot_map", "connection_map", "lot_treemap"]:
        graph_edges += [edge("route_bigdata", chart_id), edge(chart_id, "route_charts")]
    graph_edges += [edge("route_charts", "dashboard_builder"), edge("route_charts", "report_builder"), edge("route_analysis", "report_builder")]
    graph = {"nodes": graph_nodes, "edges": graph_edges, "viewport": {"x": 230, "y": 260, "zoom": 0.47}}
    report = {"report_id": f"rpt_real_estate_{datetime.now(timezone.utc):%Y%m%d%H%M%S}", "title": "USA Real Estate Derin Analiz Raporu", "generated_at": created, "workflow_name": "USA Real Estate Derin Analiz Workflow", "metadata": {"row_count": len(save_df), "source_row_count": original_rows, "column_count": len(save_df.columns), "dataset": filename}, "sections": safe(sections)}

    store["uploaded_files"].append(safe({"id": file_id, "user_id": ACTIVE_USER, "workspace_id": ACTIVE_WORKSPACE, "filename": filename, "storage_path": storage_path, "size_bytes": csv_path.stat().st_size, "row_count": len(save_df), "column_count": len(save_df.columns), "columns_meta": columns, "created_at": created, "updated_at": created}))
    store["dataset_profiles"].append(safe({"id": file_id, "file_id": file_id, "user_id": ACTIVE_USER, "workspace_id": ACTIVE_WORKSPACE, "inferred_columns": columns, "row_count": len(save_df), "missing_summary": missing, "sample_preview": records(save_df.head(8)), "created_at": created, "updated_at": created}))
    store["workflows"].append(safe({"id": workflow_id, "user_id": ACTIVE_USER, "workspace_id": ACTIVE_WORKSPACE, "name": "USA Real Estate Derin Analiz Workflow", "description": "Kaggle USA Real Estate veri seti için kapsamlı analiz, big data, CCSG-SG, dashboard ve rapor akışı.", "graph_data": graph, "created_at": created, "updated_at": created}))
    outputs = {"file_upload": {"metadata": {"row_count": len(save_df), "column_count": len(save_df.columns), "filename": filename, "storage_path": storage_path}, "dataframe": {"_type": "dataframe", "rows": len(save_df), "columns": list(save_df.columns), "sample": records(save_df.head(5))}}, "dashboard_builder": {"dashboard_config": dashboard}, "report_builder": {"report_data": report}, "ai_insights": {"insights": sections[-1]["content"], "report_data": report}}
    outputs.update({"column_types": {"columns": columns}, "missing_values": {"missing_summary": missing}, "duplicates": {"duplicate_count": int(save_df.duplicated().sum())}, "statistics": {"statistics": stats}, "distribution": {"status_counts": status_counts.to_dict(), "state_counts": state_counts.to_dict()}, "correlation": {"correlation_matrix": corr.to_dict()}, "anomaly_detection": {"anomaly_count": anomaly_count}, "ccsg_sg": {"ccsg_sg": ccsg}, "chunk_processing": {"processed_rows": len(save_df)}, "mapreduce_aggregation": {"group_by": "state"}, "spark_groupby": {"group_by": ["state", "status"]}, "large_dataset_profiler": {"original_rows": original_rows, "row_count": len(save_df)}})
    summary = {}
    for graph_node in graph_nodes:
        node_id = graph_node["id"]
        summary[node_id] = {"status": "success", "metrics": {"row_count": len(save_df), "column_count": len(save_df.columns)}, "error": None}
        store["node_execution_results"].append(safe({"id": uid(), "execution_id": execution_id, "node_id": node_id, "node_type": graph_node["type"], "status": "success", "metrics": summary[node_id]["metrics"], "executed_at": created, "output_json": outputs.get(node_id, {})}))
    store["workflow_executions"].append(safe({"id": execution_id, "workflow_id": workflow_id, "user_id": ACTIVE_USER, "workspace_id": ACTIVE_WORKSPACE, "status": "success", "created_at": created, "started_at": created, "completed_at": created, "result_summary": summary}))
    store["reports"].append(safe({"id": report_id, "execution_id": execution_id, "workflow_id": workflow_id, "user_id": ACTIVE_USER, "workspace_id": ACTIVE_WORKSPACE, "title": report["title"], "format": "json", "storage_path": None, "report_data": report, "created_at": created}))

    STORE.write_text(json.dumps(safe(store), ensure_ascii=False, indent=2))
    print(json.dumps({"workflow_id": workflow_id, "execution_id": execution_id, "report_id": report_id, "file_id": file_id, "rows": len(save_df), "source_rows": original_rows, "csv": str(csv_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
