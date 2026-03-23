from typing import Any, Dict

import pandas as pd

from app.nodes.base import BaseNodeProcessor


class FilterRowsProcessor(BaseNodeProcessor):
    """
    Preparation node — filters rows based on a column condition.

    Config keys:
        column    (str):  column name to filter on
        operator  (str):  "==" | "!=" | ">" | ">=" | "<" | "<=" | "contains" | "not_contains" | "isnull" | "notnull"
        value     (any):  comparison value (not needed for isnull/notnull)
    """

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"].copy()

        column: str = config.get("column", "")
        operator: str = config.get("operator", "==")
        value: Any = config.get("value")

        if not column:
            raise ValueError("FilterRowsNode: 'column' is required")
        if column not in df.columns:
            raise ValueError(f"FilterRowsNode: column '{column}' not found in dataframe")

        row_count_before = len(df)
        mask = self._build_mask(df, column, operator, value)
        df = df[mask].reset_index(drop=True)
        row_count_after = len(df)

        return {
            "dataframe": df,
            "filter_summary": {
                "column": column,
                "operator": operator,
                "value": str(value),
                "rows_before": row_count_before,
                "rows_after": row_count_after,
                "rows_removed": row_count_before - row_count_after,
            },
        }

    def _build_mask(self, df: pd.DataFrame, column: str, operator: str, value: Any):
        col = df[column]
        if operator == "==":     return col == value
        if operator == "!=":     return col != value
        if operator == ">":      return col > value
        if operator == ">=":     return col >= value
        if operator == "<":      return col < value
        if operator == "<=":     return col <= value
        if operator == "contains":     return col.astype(str).str.contains(str(value), na=False)
        if operator == "not_contains": return ~col.astype(str).str.contains(str(value), na=False)
        if operator == "isnull":       return col.isna()
        if operator == "notnull":      return col.notna()
        raise ValueError(f"Unknown operator: '{operator}'")
