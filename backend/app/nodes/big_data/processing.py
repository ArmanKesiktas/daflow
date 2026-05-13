from __future__ import annotations

from typing import Any, Dict, Iterable, List

import pandas as pd

from app.nodes.base import BaseNodeProcessor


def _dataframe(inputs: Dict[str, Any], name: str) -> pd.DataFrame:
    df = inputs.get("dataframe")
    if not isinstance(df, pd.DataFrame):
        raise ValueError(f"{name}: missing required input 'dataframe'")
    return df


def _chunk_size(config: Dict[str, Any]) -> int:
    try:
        return max(1, int(config.get("chunk_size", 10000)))
    except Exception:
        return 10000


def _chunks(df: pd.DataFrame, size: int) -> Iterable[tuple[int, pd.DataFrame]]:
    for start in range(0, len(df), size):
        yield start, df.iloc[start:start + size]


def _list_config(value: Any) -> List[str]:
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    if isinstance(value, list):
        return [str(part).strip() for part in value if str(part).strip()]
    return []


def _first_numeric(df: pd.DataFrame, exclude: List[str] | None = None) -> str | None:
    excluded = set(exclude or [])
    for column in df.select_dtypes(include="number").columns:
        if column not in excluded:
            return str(column)
    return None


def _first_group_column(df: pd.DataFrame) -> str | None:
    preferred = df.select_dtypes(include=["object", "category", "bool", "datetime64", "datetimetz"]).columns
    if len(preferred):
        return str(preferred[0])
    return str(df.columns[0]) if len(df.columns) else None


class ChunkProcessingProcessor(BaseNodeProcessor):
    """Split an upstream dataframe into deterministic chunks and profile each chunk."""

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "chunk_summary": "dict", "big_data_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        df = _dataframe(inputs, "ChunkProcessingProcessor")
        size = _chunk_size(config)
        total_rows = int(len(df))
        chunk_count = int((total_rows + size - 1) // size) if total_rows else 0
        profiles = []

        for idx, (start, chunk) in enumerate(_chunks(df, size)):
            if idx >= 50:
                break
            profiles.append({
                "chunk_index": idx,
                "start_row": int(start),
                "end_row": int(start + len(chunk) - 1) if len(chunk) else int(start),
                "row_count": int(len(chunk)),
                "missing_cells": int(chunk.isna().sum().sum()),
                "memory_mb": round(float(chunk.memory_usage(deep=True).sum()) / (1024 * 1024), 4),
            })

        summary = {
            "operation": "chunk_processing",
            "chunk_size": size,
            "chunk_count": chunk_count,
            "input_rows": total_rows,
            "input_columns": int(len(df.columns)),
            "profiled_chunks": profiles,
            "profile_truncated": chunk_count > len(profiles),
        }

        return {
            "dataframe": df,
            "chunk_summary": summary,
            "big_data_summary": summary,
        }


class MapReduceAggregationProcessor(BaseNodeProcessor):
    """Run a map/reduce-style grouped aggregation over dataframe chunks."""

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "mapreduce_summary": "dict", "big_data_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        df = _dataframe(inputs, "MapReduceAggregationProcessor")
        size = _chunk_size(config)
        reducer = str(config.get("reducer", "sum")).lower()
        if reducer not in {"count", "sum", "mean", "min", "max"}:
            reducer = "sum"

        group_column = str(config.get("group_column") or "").strip() or _first_group_column(df)
        if not group_column or group_column not in df.columns:
            raise ValueError("MapReduceAggregationProcessor: group_column is required")

        value_column = str(config.get("value_column") or "").strip()
        if reducer != "count":
            value_column = value_column or (_first_numeric(df, [group_column]) or "")
            if not value_column or value_column not in df.columns:
                raise ValueError("MapReduceAggregationProcessor: value_column is required for numeric reducers")

        partials = []
        for _, chunk in _chunks(df, size):
            if reducer == "count":
                partial = chunk.groupby(group_column, dropna=False).size().reset_index(name="count")
            elif reducer == "mean":
                partial = chunk.groupby(group_column, dropna=False)[value_column].agg(["sum", "count"]).reset_index()
            else:
                partial = chunk.groupby(group_column, dropna=False)[value_column].agg(reducer).reset_index(name=reducer)
            partials.append(partial)

        if not partials:
            result = pd.DataFrame(columns=[group_column, reducer])
        else:
            mapped = pd.concat(partials, ignore_index=True)
            if reducer == "count":
                result = mapped.groupby(group_column, dropna=False)["count"].sum().reset_index()
            elif reducer == "mean":
                reduced = mapped.groupby(group_column, dropna=False)[["sum", "count"]].sum().reset_index()
                reduced["mean"] = reduced["sum"] / reduced["count"].replace(0, pd.NA)
                result = reduced[[group_column, "mean"]]
            elif reducer in {"sum"}:
                result = mapped.groupby(group_column, dropna=False)[reducer].sum().reset_index()
            elif reducer == "min":
                result = mapped.groupby(group_column, dropna=False)[reducer].min().reset_index()
            else:
                result = mapped.groupby(group_column, dropna=False)[reducer].max().reset_index()

        summary = {
            "operation": "mapreduce_aggregation",
            "group_column": group_column,
            "value_column": value_column or None,
            "reducer": reducer,
            "chunk_size": size,
            "mapper_chunks": len(partials),
            "input_rows": int(len(df)),
            "output_rows": int(len(result)),
        }

        return {
            "dataframe": result,
            "mapreduce_summary": summary,
            "big_data_summary": summary,
        }


class SparkLikeGroupByProcessor(BaseNodeProcessor):
    """Partitioned groupBy aggregation inspired by Spark DataFrame operations."""

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {"dataframe": "DataFrame", "spark_groupby_summary": "dict", "group_by_summary": "dict"}

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        df = _dataframe(inputs, "SparkLikeGroupByProcessor")
        group_columns = _list_config(config.get("group_columns") or config.get("group_by_columns"))
        if not group_columns:
            fallback = _first_group_column(df)
            group_columns = [fallback] if fallback else []
        group_columns = [col for col in group_columns if col in df.columns]
        if not group_columns:
            raise ValueError("SparkLikeGroupByProcessor: group_columns is required")

        aggregation = str(config.get("aggregation", "sum")).lower()
        if aggregation not in {"count", "sum", "mean", "min", "max"}:
            aggregation = "sum"

        aggregate_columns = _list_config(config.get("aggregate_columns"))
        if not aggregate_columns:
            aggregate_columns = [str(col) for col in df.select_dtypes(include="number").columns if col not in group_columns]
        aggregate_columns = [col for col in aggregate_columns if col in df.columns and col not in group_columns]

        if aggregation == "count" or not aggregate_columns:
            result = df.groupby(group_columns, dropna=False).size().reset_index(name="count")
        else:
            result = df.groupby(group_columns, dropna=False)[aggregate_columns].agg(aggregation).reset_index()

        partitions = max(1, int(config.get("partitions", 4) or 4))
        summary = {
            "operation": "spark_like_groupby",
            "group_columns": group_columns,
            "aggregate_columns": aggregate_columns,
            "aggregation": aggregation,
            "partitions": partitions,
            "shuffle_keys": len(group_columns),
            "input_rows": int(len(df)),
            "output_rows": int(len(result)),
            "output_columns": int(len(result.columns)),
        }

        return {
            "dataframe": result,
            "spark_groupby_summary": summary,
            "group_by_summary": summary,
            "big_data_summary": summary,
        }


class LargeDatasetProfilerProcessor(BaseNodeProcessor):
    """Profile dataset size, types, missingness, cardinality, and numeric spread."""

    input_schema = {"dataframe": "DataFrame"}
    output_schema = {
        "dataframe": "DataFrame",
        "profiler_summary": "dict",
        "type_summary": "dict",
        "missing_summary": "dict",
        "statistics": "dict",
    }

    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        df = _dataframe(inputs, "LargeDatasetProfilerProcessor")
        sample_size = max(1, int(config.get("sample_size", 5000) or 5000))
        sample = df.head(sample_size)

        type_summary = {str(dtype): int(count) for dtype, count in df.dtypes.astype(str).value_counts().items()}
        missing_summary = {
            str(col): {
                "missing_count": int(df[col].isna().sum()),
                "missing_pct": round(float(df[col].isna().mean()) * 100, 4),
            }
            for col in df.columns
        }
        cardinality = {str(col): int(sample[col].nunique(dropna=True)) for col in sample.columns}

        statistics: Dict[str, Dict[str, Any]] = {}
        for col in sample.select_dtypes(include="number").columns:
            series = sample[col].dropna()
            if series.empty:
                continue
            statistics[str(col)] = {
                "count": int(series.count()),
                "mean": float(series.mean()),
                "std": float(series.std()) if len(series) > 1 else 0.0,
                "min": float(series.min()),
                "max": float(series.max()),
                "median": float(series.median()),
            }

        memory_mb = round(float(df.memory_usage(deep=True).sum()) / (1024 * 1024), 4)
        summary = {
            "operation": "large_dataset_profiler",
            "row_count": int(len(df)),
            "column_count": int(len(df.columns)),
            "memory_mb": memory_mb,
            "sample_size": int(min(sample_size, len(df))),
            "type_summary": type_summary,
            "top_cardinality": dict(sorted(cardinality.items(), key=lambda item: item[1], reverse=True)[:10]),
            "columns_with_missing": int(sum(1 for item in missing_summary.values() if item["missing_count"] > 0)),
        }

        return {
            "dataframe": df,
            "profiler_summary": summary,
            "big_data_summary": summary,
            "type_summary": type_summary,
            "missing_summary": missing_summary,
            "statistics": statistics,
        }
