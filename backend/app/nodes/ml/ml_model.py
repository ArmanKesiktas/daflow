from typing import Any, Dict, List
import pandas as pd
import numpy as np
from app.nodes.base import BaseNodeProcessor


_CLASSIFIERS = {
    "logistic_regression":         "sklearn.linear_model.LogisticRegression",
    "random_forest_classifier":    "sklearn.ensemble.RandomForestClassifier",
    "gradient_boosting_classifier":"sklearn.ensemble.GradientBoostingClassifier",
    "svm_classifier":              "sklearn.svm.SVC",
}
_REGRESSORS = {
    "linear_regression":           "sklearn.linear_model.LinearRegression",
    "random_forest_regressor":     "sklearn.ensemble.RandomForestRegressor",
    "gradient_boosting_regressor": "sklearn.ensemble.GradientBoostingRegressor",
    "ridge":                       "sklearn.linear_model.Ridge",
}


def _import_model(dotted_path: str):
    module_path, class_name = dotted_path.rsplit(".", 1)
    import importlib
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


class MLModelProcessor(BaseNodeProcessor):
    """
    ML node — trains a scikit-learn model and evaluates it.

    Expects a '_split' column (train/test) from an upstream TrainTestSplit node.
    If not present, uses 80% train / 20% test automatically.

    Config keys:
        task_type     (str):       'classification' | 'regression'
        algorithm     (str):       model key (see _CLASSIFIERS / _REGRESSORS above)
        target_column (str):       column to predict
        feature_columns (list):   columns to use as features (empty = all numeric)
        random_state  (int):       42
    """
    output_schema = {
        "dataframe":         "DataFrame",
        "ml_metrics":        "dict",
        "feature_importance": "dict",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        from sklearn.metrics import (
            accuracy_score, classification_report,
            mean_squared_error, r2_score, mean_absolute_error,
        )
        from sklearn.preprocessing import LabelEncoder

        df: pd.DataFrame = inputs.get("dataframe")
        if df is None:
            raise ValueError("MLModelNode: no upstream dataframe")

        task_type      = config.get("task_type", "classification")
        algorithm      = config.get("algorithm", "random_forest_classifier" if task_type == "classification" else "random_forest_regressor")
        target_col     = config.get("target_column", "")
        feature_cols   = config.get("feature_columns", [])
        random_state   = int(config.get("random_state", 42))

        if not target_col or target_col not in df.columns:
            raise ValueError(f"MLModelNode: target_column '{target_col}' not found in dataframe")

        # ── Feature selection ─────────────────────────────────────────────────
        if feature_cols:
            feature_cols = [c for c in feature_cols if c in df.columns and c != target_col]
        else:
            feature_cols = [c for c in df.select_dtypes("number").columns if c != target_col and c != "_split"]

        if not feature_cols:
            raise ValueError("MLModelNode: no numeric feature columns found")

        # ── Train/Test split ──────────────────────────────────────────────────
        if "_split" in df.columns:
            train_df = df[df["_split"] == "train"]
            test_df  = df[df["_split"] == "test"]
        else:
            from sklearn.model_selection import train_test_split as tts
            train_df, test_df = tts(df, test_size=0.2, random_state=random_state)

        X_train = train_df[feature_cols].fillna(0)
        X_test  = test_df[feature_cols].fillna(0)
        y_train = train_df[target_col]
        y_test  = test_df[target_col]

        # ── Label encode for classification ──────────────────────────────────
        le = None
        if task_type == "classification":
            le = LabelEncoder()
            y_train = le.fit_transform(y_train.astype(str))
            y_test  = le.transform(y_test.astype(str))

        # ── Model ─────────────────────────────────────────────────────────────
        model_map = _CLASSIFIERS if task_type == "classification" else _REGRESSORS
        dotted_path = model_map.get(algorithm)
        if not dotted_path:
            raise ValueError(f"MLModelNode: unknown algorithm '{algorithm}'")

        ModelClass = _import_model(dotted_path)
        try:
            model = ModelClass(random_state=random_state)
        except TypeError:
            model = ModelClass()  # SVC, Ridge don't take random_state
        model.fit(X_train, y_train)

        # ── Predict & metrics ─────────────────────────────────────────────────
        y_pred = model.predict(X_test)
        metrics: Dict[str, Any] = {
            "algorithm":    algorithm,
            "task_type":    task_type,
            "train_samples": int(len(X_train)),
            "test_samples":  int(len(X_test)),
            "features_used": feature_cols,
        }

        if task_type == "classification":
            metrics["accuracy"] = round(float(accuracy_score(y_test, y_pred)), 4)
            report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
            metrics["weighted_f1"] = round(float(report.get("weighted avg", {}).get("f1-score", 0)), 4)
            metrics["weighted_precision"] = round(float(report.get("weighted avg", {}).get("precision", 0)), 4)
            metrics["weighted_recall"]    = round(float(report.get("weighted avg", {}).get("recall", 0)), 4)
        else:
            metrics["r2"]   = round(float(r2_score(y_test, y_pred)), 4)
            metrics["rmse"] = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4)
            metrics["mae"]  = round(float(mean_absolute_error(y_test, y_pred)), 4)

        # ── Feature importance ────────────────────────────────────────────────
        importance: Dict[str, float] = {}
        if hasattr(model, "feature_importances_"):
            importance = {col: round(float(imp), 4)
                          for col, imp in zip(feature_cols, model.feature_importances_)}
        elif hasattr(model, "coef_"):
            coefs = model.coef_
            if coefs.ndim > 1:
                coefs = np.abs(coefs).mean(axis=0)
            total = float(np.abs(coefs).sum()) or 1.0
            importance = {col: round(float(abs(c)) / total, 4)
                          for col, c in zip(feature_cols, coefs)}

        # ── Output dataframe with predictions ────────────────────────────────
        result_df = test_df.copy()
        if le is not None:
            result_df["_prediction"] = le.inverse_transform(y_pred)
            result_df["_actual"]     = le.inverse_transform(y_test)
        else:
            result_df["_prediction"] = y_pred
            result_df["_actual"]     = y_test.values

        return {
            "dataframe":          result_df,
            "ml_metrics":         metrics,
            "feature_importance": importance,
        }
