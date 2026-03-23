from typing import Any, Dict
import pandas as pd
import numpy as np
from app.nodes.base import BaseNodeProcessor


class CustomPythonProcessor(BaseNodeProcessor):
    """
    Transformation node — executes user-supplied Python/pandas code.

    The input dataframe is available as `df`.
    The result must be assigned to `df_out`.

    Example code:
        df_out = df[df['age'] > 18].reset_index(drop=True)
        df_out['age_group'] = pd.cut(df_out['age'], bins=[18,30,50,100],
                                      labels=['young','mid','senior'])

    Config keys:
        code (str): Python code string
    """
    output_schema = {"dataframe": "DataFrame", "custom_python_summary": "dict"}

    # Restricted builtins allowed in user code
    _SAFE_BUILTINS = {
        "abs": abs, "all": all, "any": any, "bool": bool, "dict": dict,
        "enumerate": enumerate, "filter": filter, "float": float,
        "frozenset": frozenset, "getattr": getattr, "hasattr": hasattr,
        "int": int, "isinstance": isinstance, "len": len, "list": list,
        "map": map, "max": max, "min": min, "print": print,
        "range": range, "round": round, "set": set, "slice": slice,
        "sorted": sorted, "str": str, "sum": sum, "tuple": tuple,
        "type": type, "zip": zip, "None": None, "True": True, "False": False,
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        df: pd.DataFrame = inputs.get("dataframe")
        if df is None:
            raise ValueError("CustomPythonNode: no upstream dataframe")

        code = str(config.get("code", "")).strip()
        if not code:
            raise ValueError("CustomPythonNode: 'code' is required")

        # Build restricted execution namespace
        local_ns: Dict[str, Any] = {
            "df":     df.copy(),
            "df_out": df.copy(),  # default if user doesn't assign
            "pd":     pd,
            "np":     np,
        }
        global_ns: Dict[str, Any] = {"__builtins__": self._SAFE_BUILTINS}

        try:
            exec(compile(code, "<custom_python>", "exec"), global_ns, local_ns)  # noqa: S102
        except Exception as exc:
            raise RuntimeError(f"CustomPython execution error: {exc}") from exc

        result = local_ns.get("df_out")
        if not isinstance(result, pd.DataFrame):
            raise ValueError("CustomPythonNode: code must assign a DataFrame to 'df_out'")

        summary = {
            "input_shape":  [int(len(df)), int(len(df.columns))],
            "output_shape": [int(len(result)), int(len(result.columns))],
            "code_lines":   len(code.splitlines()),
        }

        return {"dataframe": result, "custom_python_summary": summary}
