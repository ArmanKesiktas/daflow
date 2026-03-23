from typing import Any, Dict
import pandas as pd
from app.nodes.base import BaseNodeProcessor


class JoinProcessor(BaseNodeProcessor):
    """
    Transformation node — merges two DataFrames (left + right).

    Inputs (via handle routing):
        left_df  (DataFrame): left input dataframe
        right_df (DataFrame): right input dataframe

    Config keys:
        how      (str): 'inner' | 'left' | 'right' | 'outer' | 'cross'
        on       (str): shared column name to join on (if same in both dfs)
        left_on  (str): column name in left df  (if keys differ)
        right_on (str): column name in right df (if keys differ)
        suffixes (list): column name suffixes for overlapping cols (default ['_x', '_y'])
    """
    output_schema = {"dataframe": "DataFrame", "join_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        left_df: pd.DataFrame  = inputs.get("left_df")
        right_df: pd.DataFrame = inputs.get("right_df")

        if left_df is None:
            raise ValueError("JoinNode: left input (left_df) is not connected")
        if right_df is None:
            raise ValueError("JoinNode: right input (right_df) is not connected")

        how      = config.get("how", "inner")
        on       = config.get("on") or None
        left_on  = config.get("left_on") or None
        right_on = config.get("right_on") or None
        suffixes = config.get("suffixes", ["_x", "_y"])

        if on:
            result = pd.merge(left_df, right_df, how=how, on=on, suffixes=tuple(suffixes))
        elif left_on and right_on:
            result = pd.merge(left_df, right_df, how=how,
                              left_on=left_on, right_on=right_on, suffixes=tuple(suffixes))
        else:
            raise ValueError("JoinNode: specify either 'on' or both 'left_on' and 'right_on'")

        summary = {
            "how":           how,
            "on":            on or left_on,
            "left_rows":     int(len(left_df)),
            "right_rows":    int(len(right_df)),
            "output_rows":   int(len(result)),
            "output_cols":   int(len(result.columns)),
        }

        return {"dataframe": result, "join_summary": summary}
