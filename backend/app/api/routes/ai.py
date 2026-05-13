from fastapi import APIRouter, Depends

from app.config import settings
from app.dependencies import get_current_user

router = APIRouter()


@router.post("/suggest-analysis")
async def suggest_analysis(payload: dict, user: dict = Depends(get_current_user)):
    columns = payload.get("columns") or []
    language = str(payload.get("language") or "en").lower()
    suggestions = _rule_based_suggestions(columns, language)
    if not settings.GEMINI_API_KEY:
        return {"provider": "rules", "suggestions": suggestions}
    try:
        from app.nodes.output.ai_insights import AIInsightsProcessor
        prompt = (
            "Suggest 4 practical data-analysis workflow steps for Daflow. "
            f"Language: {language}. Columns: {columns}. Return concise JSON-like bullets."
        )
        text = AIInsightsProcessor()._call_gemini(prompt, settings.GEMINI_API_KEY)
        return {"provider": "ai", "text": text, "suggestions": suggestions}
    except Exception:
        return {"provider": "rules", "suggestions": suggestions}


@router.post("/explain-error")
async def explain_error(payload: dict, user: dict = Depends(get_current_user)):
    message = str(payload.get("message") or "")
    language = str(payload.get("language") or "en").lower()
    fallback = _friendly_error(message, language)
    if not settings.GEMINI_API_KEY:
        return {"provider": "rules", "explanation": fallback}
    try:
        from app.nodes.output.ai_insights import AIInsightsProcessor
        prompt = f"Explain this Daflow workflow error in plain {'Turkish' if language.startswith('tr') else 'English'} and give one fix: {message}"
        text = AIInsightsProcessor()._call_gemini(prompt, settings.GEMINI_API_KEY)
        return {"provider": "ai", "explanation": text}
    except Exception:
        return {"provider": "rules", "explanation": fallback}


def _rule_based_suggestions(columns: list, language: str) -> list[dict]:
    names = [str(col.get("name") if isinstance(col, dict) else col) for col in columns]
    numeric = [name for name in names if any(token in name.lower() for token in ("sales", "price", "amount", "revenue", "score", "age", "total", "value"))]
    date_cols = [name for name in names if any(token in name.lower() for token in ("date", "time", "month", "year"))]
    category = [name for name in names if name not in numeric and name not in date_cols]
    tr = language.startswith("tr")
    return [
        {"title": "Eksik değerleri kontrol et" if tr else "Check missing values", "node": "missing_value"},
        {"title": "Temel istatistikleri çıkar" if tr else "Profile descriptive statistics", "node": "statistics"},
        {"title": "Dağılımları görselleştir" if tr else "Visualize distributions", "node": "distribution"},
        {
            "title": ("Kategoriye göre satış/ölçüm özeti" if tr else "Summarize by category") if category else ("Anomali taraması" if tr else "Scan for anomalies"),
            "node": "group_by" if category and numeric else "ccsg_sg_anomaly",
            "columns": {"category": category[:1], "numeric": numeric[:1], "date": date_cols[:1]},
        },
    ]


def _friendly_error(message: str, language: str) -> str:
    lower = message.lower()
    tr = language.startswith("tr")
    if "not found" in lower or "column" in lower:
        return "Bu işlem beklenen bir sütunu bulamadı. Node ayarlarında seçili kolon adını veri setinizle eşleştirin." if tr else "This step could not find an expected column. Check the selected column in the node settings."
    if "unsupported file" in lower or "parse" in lower:
        return "Dosya okunamadı. CSV/Excel biçimini ve başlık satırını kontrol edin." if tr else "The file could not be read. Check the CSV/Excel format and header row."
    if "permission" in lower or "unauthorized" in lower:
        return "Bu işlem için yetkiniz yok. Workflow sahibi paylaşım iznini kontrol etmeli." if tr else "You do not have permission for this action. Ask the workflow owner to check sharing permissions."
    return "İşlem tamamlanamadı. Önce veri yükleme node'unun başarılı çalıştığını ve bağlantıların doğru olduğunu kontrol edin." if tr else "The action could not be completed. Confirm the file upload node ran successfully and the connections are valid."
