from typing import Any, Dict
import pandas as pd
from app.nodes.base import BaseNodeProcessor


class TrainTestSplitProcessor(BaseNodeProcessor):
    """
    ML node — splits a DataFrame into train and test sets by adding a
    '_split' column ('train' | 'test') to the dataframe.

    Downstream ML Model node filters by this column.

    Config keys:
        test_size       (float): fraction for test set (default 0.2)
        random_state    (int):   seed for reproducibility (default 42)
        stratify_column (str):   column to stratify split on (optional)
    """
    output_schema = {"dataframe": "DataFrame", "split_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        from sklearn.model_selection import train_test_split

        df: pd.DataFrame = inputs.get("dataframe")
        if df is None:
            raise ValueError("TrainTestSplitNode: no upstream dataframe")

        test_size       = float(config.get("test_size", 0.2))
        random_state    = int(config.get("random_state", 42))
        stratify_column = config.get("stratify_column") or None

        stratify = df[stratify_column] if stratify_column and stratify_column in df.columns else None

        train_idx, test_idx = train_test_split(
            df.index,
            test_size=test_size,
            random_state=random_state,
            stratify=stratify,
        )

        df = df.copy()
        df["_split"] = "train"
        df.loc[test_idx, "_split"] = "test"

        summary = {
            "total_rows": int(len(df)),
            "train_rows": int((df["_split"] == "train").sum()),
            "test_rows":  int((df["_split"] == "test").sum()),
            "test_size":  test_size,
        }

        return {"dataframe": df, "split_summary": summary}
