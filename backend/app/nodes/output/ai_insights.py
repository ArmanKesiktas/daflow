import asyncio
import json
from typing import Any, Dict, List

from app.nodes.base import BaseNodeProcessor
from app.config import settings


def _build_prompt(report_data: Dict[str, Any]) -> str:
    """Build a structured natural-language prompt from analysis results."""
    lines: List[str] = []
    meta = report_data.get("metadata", {})

    lines.append(f"Dataset: {meta.get('filename', 'Unknown')}")
    lines.append(f"Rows: {meta.get('row_count', 'N/A')}  |  Columns: {meta.get('column_count', 'N/A')}")
    lines.append("")

    for section in report_data.get("sections", []):
        stype = section.get("section_type", "")
        data = section.get("data", {})

        if stype == "statistics" and data:
            lines.append("=== Descriptive Statistics ===")
            for col, s in data.items():
                if isinstance(s, dict):
                    lines.append(
                        f"  {col}: mean={s.get('mean', 'N/A'):.3f}, "
                        f"std={s.get('std', 'N/A'):.3f}, "
                        f"skewness={s.get('skewness', 'N/A'):.3f}, "
                        f"kurtosis={s.get('kurtosis', 'N/A'):.3f}"
                        + (f", NOT normal (p={s.get('shapiro_p', 'N/A')})"
                           if s.get("is_normal") is False else "")
                    )

        elif stype == "missing_value" and data:
            lines.append("=== Missing Values ===")
            for col, info in data.items():
                if isinstance(info, dict) and info.get("missing_count", 0) > 0:
                    lines.append(
                        f"  {col}: {info['missing_count']} missing ({info.get('missing_pct', 0):.1f}%)"
                    )

        elif stype == "anomaly_detection" and data:
            lines.append("=== Anomaly Detection ===")
            lines.append(
                f"  Method: {data.get('method', 'N/A')}, "
                f"Anomalies found: {data.get('anomaly_count', 'N/A')} "
                f"({float(data.get('anomaly_rate', 0) or 0) * 100:.2f}% of data)"
            )

        elif stype == "correlation" and isinstance(data, dict):
            strong = data.get("strong_pairs", []) if isinstance(data, dict) else []
            if strong:
                lines.append("=== Strong Correlations ===")
                for pair in strong[:5]:
                    lines.append(
                        f"  {pair['col_a']} ↔ {pair['col_b']}: r={pair['correlation']:.3f} ({pair['direction']})"
                    )

        elif stype == "duplicate_detection" and data:
            lines.append("=== Duplicate Rows ===")
            lines.append(
                f"  {data.get('duplicate_count', 0)} duplicates "
                f"({data.get('duplicate_pct', 0):.1f}% of data)"
            )

    return "\n".join(lines)


class AIInsightsProcessor(BaseNodeProcessor):
    """
    Output node — sends pre-computed analysis results to an LLM
    and returns a natural language insight summary.

    NOTE: AI does NOT perform any analysis. It only interprets
    the structured outputs produced by upstream algorithm nodes.

    Config keys:
        provider    (str): "gemini" | "openai" (default from settings)
        api_key     (str): override API key; falls back to settings
        language    (str): output language, e.g. "English" | "Turkish" (default "English")
    """

    input_schema = {"report_data": "dict"}
    output_schema = {"insights": "str", "report_data": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        report_data: Dict = inputs.get("report_data", {})
        if not report_data:
            raise ValueError("AIInsightsNode: 'report_data' input is required")

        provider: str = config.get("provider", settings.DEFAULT_AI_PROVIDER)
        api_key: str = config.get("api_key", "")
        language: str = config.get("language", "English")

        # Resolve effective key
        effective_key = api_key or (
            settings.GEMINI_API_KEY if provider == "gemini" else settings.OPENAI_API_KEY
        )

        if not effective_key:
            placeholder = (
                "AI insights are not available because no API key is configured.\n\n"
                "To enable AI insights, set GEMINI_API_KEY or OPENAI_API_KEY in the backend "
                ".env file, or enter a key directly in the node configuration panel."
            )
            updated_report = {
                **report_data,
                "sections": report_data.get("sections", []) + [
                    {
                        "section_type": "ai_insights",
                        "node_id": "ai_insights",
                        "node_label": "AI Insights",
                        "data": {},
                        "content": placeholder,
                    }
                ],
            }
            return {"insights": placeholder, "report_data": updated_report}

        prompt = self._full_prompt(_build_prompt(report_data), language)

        if provider == "gemini":
            insights = self._call_gemini(prompt, effective_key)
        else:
            insights = self._call_openai(prompt, effective_key)

        # Attach insights back into report_data
        updated_report = {
            **report_data,
            "sections": report_data.get("sections", []) + [
                {
                    "section_type": "ai_insights",
                    "node_id": "ai_insights",
                    "node_label": "AI Insights",
                    "data": {},
                    "content": insights,
                }
            ],
        }

        return {
            "insights": insights,
            "report_data": updated_report,
        }

    # ── Prompt builder ────────────────────────────────────────

    def _full_prompt(self, analysis_text: str, language: str) -> str:
        lang_instruction = (
            "Write entirely in Turkish (Türkçe). Use formal report language."
            if language.lower() in ("turkish", "türkçe", "tr")
            else "Write entirely in English. Use formal report language."
        )
        if language.lower() in ("turkish", "türkçe", "tr"):
            section_titles = {
                "exec": "## 1. Yönetici Özeti",
                "quality": "## 2. Veri Kalitesi",
                "stats": "## 3. İstatistiksel Bulgular",
                "anomaly": "## 4. Anomali Analizi",
                "correlation": "## 5. Korelasyon Bulguları",
                "recommendations": "## 6. Öneriler",
            }
        else:
            section_titles = {
                "exec": "## 1. Executive Summary",
                "quality": "## 2. Data Quality Assessment",
                "stats": "## 3. Statistical Findings",
                "anomaly": "## 4. Anomaly Analysis",
                "correlation": "## 5. Correlation Findings",
                "recommendations": "## 6. Recommendations",
            }
        s = section_titles
        return f"""You are a senior data analyst writing a formal data analysis report.
{lang_instruction}

Below are the statistical results from automated analysis algorithms. Interpret them and produce a structured report.

ANALYSIS DATA:
{analysis_text}

OUTPUT FORMAT — write the report using exactly these Markdown sections in order:

{s['exec']}
Write 2-3 sentences summarizing the dataset size, overall data quality, and the most important finding.

{s['quality']}
- Bullet each data quality issue found (missing values, duplicates, type problems).
- If data quality is good, explicitly say so.
- Cite actual numbers from the analysis. Do NOT invent numbers.

{s['stats']}
- For each numeric column with notable characteristics (high skewness >1, non-normal distribution, extreme range), write one bullet with the column name and key stat.
- If distributions are unremarkable, note that briefly.

{s['anomaly']}
- State the anomaly detection method used and the anomaly rate.
- Interpret what the anomalies might mean for this dataset.
- If no anomaly data is available, write "No anomaly analysis was performed."

{s['correlation']}
- List any strong correlations (|r| > 0.6) as bullets: Column A ↔ Column B (r = X.XX) — brief business interpretation.
- If no strong correlations exist, state that explicitly.

{s['recommendations']}
Provide exactly 3 numbered, concrete, actionable recommendations based strictly on the findings above. Each recommendation must be one sentence and reference a specific finding.

RULES:
- Use only numbers that appear in the analysis data above. Do NOT fabricate statistics.
- Do NOT add extra sections beyond the 6 listed.
- Markdown formatting only: ## for section headers, - for bullets, **bold** for emphasis, numbers for the recommendations list.
"""

    # ── API callers ───────────────────────────────────────────

    def _call_gemini(self, prompt: str, api_key: str) -> str:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            return response.text
        except Exception as exc:
            return f"[Gemini API error: {exc}]"

    def _call_openai(self, prompt: str, api_key: str) -> str:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional data analyst."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1200,
            )
            return response.choices[0].message.content
        except Exception as exc:
            return f"[OpenAI API error: {exc}]"
