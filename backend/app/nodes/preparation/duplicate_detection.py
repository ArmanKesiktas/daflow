from typing import Any, Dict, List

import pandas as pd

from app.nodes.base import BaseNodeProcessor


class DuplicateDetectionProcessor(BaseNodeProcessor):
    """
    Preparation node — detects and optionally removes duplicate rows.

    Config keys:
        subset   (list[str]): columns to consider for duplication check; empty = all
        keep     (str):       "first" | "last" | "none"  (which duplicate to keep; default "first")
        drop     (bool):      if True, remove duplicates from output dataframe (default False)
    """

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "duplicate_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"].copy()

        subset: List[str] = config.get("subset", []) or None
        keep: str = config.get("keep", "first")
        drop: bool = config.get("drop", False)

        # Detect duplicates
        dup_mask = df.duplicated(subset=subset, keep=keep)
        duplicate_rows = df[dup_mask].copy()
        duplicate_count = int(dup_mask.sum())

        # Per-column duplicate analysis
        column_analysis: Dict[str, Dict] = {}
        for col in df.columns:
            col_dup = int(df.duplicated(subset=[col]).sum())
            column_analysis[col] = {"duplicate_count": col_dup}

        duplicate_summary = {
            "total_rows": int(len(df)),
            "duplicate_count": duplicate_count,
            "duplicate_pct": round(duplicate_count / len(df) * 100, 2) if len(df) else 0.0,
            "unique_rows": int(len(df) - duplicate_count),
            "keep_strategy": keep,
            "subset_columns": list(subset) if subset else "all",
            "sample_duplicates": duplicate_rows.head(10).to_dict("records"),
        }

        if drop:
            df = df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)

        return {
            "dataframe": df,
            "duplicate_rows": duplicate_rows,
            "duplicate_summary": duplicate_summary,
            "duplicate_count": duplicate_count,
        }
