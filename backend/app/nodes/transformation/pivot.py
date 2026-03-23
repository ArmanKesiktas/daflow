from typing import Any, Dict

import pandas as pd

from app.nodes.base import BaseNodeProcessor


class PivotProcessor(BaseNodeProcessor):
    """
    Transformation node — reshapes the dataframe using a pivot table.

    Config keys:
        index   (str):  column to use as row labels
        columns (str):  column whose values become the new column headers
        values  (str):  column to aggregate
        aggfunc (str):  aggregation function: "mean" | "sum" | "count" | "min" | "max" (default "mean")
    """

    input_schema  = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "pivot_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_inputs(inputs)
        df: pd.DataFrame = inputs["dataframe"]

        index   = config.get("index", "")
        columns = config.get("columns", "")
        values  = config.get("values", "")
        aggfunc = config.get("aggfunc", "mean")

        if not index or not columns or not values:
            raise ValueError("PivotNode: 'index', 'columns', and 'values' are all required.")

        for field, col in [("index", index), ("columns", columns), ("values", values)]:
            if col not in df.columns:
                raise ValueError(f"PivotNode: column '{col}' not found (config.{field}).")

        agg_map = {"mean": "mean", "sum": "sum", "count": "count", "min": "min", "max": "max"}
        fn = agg_map.get(aggfunc, "mean")

        pivot_df: pd.DataFrame = df.pivot_table(
            index=index,
            columns=columns,
            values=values,
            aggfunc=fn,
            fill_value=0,
        ).reset_index()

        # Flatten multi-level column names if present
        if isinstance(pivot_df.columns, pd.MultiIndex):
            pivot_df.columns = [f"{a}_{b}" if b else str(a) for a, b in pivot_df.columns]

        return {
            "dataframe": pivot_df,
            "pivot_summary": {
                "index": index,
                "columns": columns,
                "values": values,
                "aggfunc": fn,
                "output_shape": [int(pivot_df.shape[0]), int(pivot_df.shape[1])],
            },
        }
