from typing import Any, Dict, List, Optional, Union
import pandas as pd
from app.nodes.base import BaseNodeProcessor


class JoinProcessor(BaseNodeProcessor):
    """
    Transformation node — merges two DataFrames (left + right).

    Inputs (via handle routing):
        left_df  (DataFrame): left input dataframe
        right_df (DataFrame): right input dataframe

    Config keys:
        how       (str): 'inner' | 'left' | 'right' | 'outer' | 'cross'
        keyPairs  (list): list of {left: str, right: str} objects for composite keys
        on        (str): shared column name to join on (legacy, if same in both dfs)
        left_on   (str | list): column name(s) in left df  (legacy, if keys differ)
        right_on  (str | list): column name(s) in right df (legacy, if keys differ)
        suffixes  (list): column name suffixes for overlapping cols (default ['_x', '_y'])
    """
    output_schema = {"dataframe": "DataFrame", "join_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        left_df: pd.DataFrame = inputs.get("left_df")
        right_df: pd.DataFrame = inputs.get("right_df")

        if left_df is None:
            raise ValueError("JoinNode: left input (left_df) is not connected")
        if right_df is None:
            raise ValueError("JoinNode: right input (right_df) is not connected")

        how = config.get("how", "inner")
        suffixes = config.get("suffixes", ["_x", "_y"])

        # Resolve join keys — prefer keyPairs, fall back to legacy on/left_on/right_on
        left_on: Optional[List[str]] = None
        right_on: Optional[List[str]] = None
        on: Optional[Union[str, List[str]]] = None

        key_pairs = config.get("keyPairs")
        if key_pairs and isinstance(key_pairs, list) and len(key_pairs) > 0:
            # New composite key format: [{left: str, right: str}, ...]
            left_on = [pair["left"] for pair in key_pairs]
            right_on = [pair["right"] for pair in key_pairs]
        else:
            # Legacy config support
            legacy_on = config.get("on") or None
            legacy_left_on = config.get("left_on") or None
            legacy_right_on = config.get("right_on") or None

            if legacy_on:
                on = legacy_on
            elif legacy_left_on and legacy_right_on:
                # Normalize string values to single-element lists
                if isinstance(legacy_left_on, str):
                    left_on = [legacy_left_on]
                else:
                    left_on = list(legacy_left_on)

                if isinstance(legacy_right_on, str):
                    right_on = [legacy_right_on]
                else:
                    right_on = list(legacy_right_on)
            else:
                if how != "cross":
                    raise ValueError(
                        "JoinNode: specify 'keyPairs', 'on', or both 'left_on' and 'right_on'"
                    )

        # Perform the merge
        if how == "cross" and not on and not left_on:
            result = pd.merge(left_df, right_df, how="cross", suffixes=tuple(suffixes))
        elif on:
            result = pd.merge(left_df, right_df, how=how, on=on, suffixes=tuple(suffixes))
        elif left_on and right_on:
            result = pd.merge(
                left_df, right_df, how=how,
                left_on=left_on, right_on=right_on,
                suffixes=tuple(suffixes)
            )
        else:
            raise ValueError(
                "JoinNode: specify 'keyPairs', 'on', or both 'left_on' and 'right_on'"
            )

        summary = {
            "how": how,
            "on": on,
            "left_on": left_on,
            "right_on": right_on,
            "left_rows": int(len(left_df)),
            "right_rows": int(len(right_df)),
            "output_rows": int(len(result)),
            "output_cols": int(len(result.columns)),
        }

        return {"dataframe": result, "join_summary": summary}
