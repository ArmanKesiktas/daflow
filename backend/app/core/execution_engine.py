"""
DAG Execution Engine
====================
Executes a workflow graph by:
  1. Parsing the graph into an adjacency map
  2. Topological sort (Kahn's algorithm) to determine execution order
  3. Iterating nodes in order, gathering upstream outputs as inputs
  4. Dispatching each node to its registered processor
  5. Emitting status events after each node completes

Status updates are persisted to Supabase so the SSE stream can pick them up.
"""
from __future__ import annotations

import traceback
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

import pandas as pd

from app.core.node_registry import NODE_REGISTRY


# ─── Graph helpers ────────────────────────────────────────────────────────────

def topological_sort(node_ids: List[str], edges: List[Dict]) -> List[str]:
    """
    Kahn's algorithm topological sort.
    Returns node IDs in safe execution order.
    Raises ValueError on cycle detection.
    """
    in_degree: Dict[str, int] = {n: 0 for n in node_ids}
    adjacency: Dict[str, List[str]] = defaultdict(list)

    for edge in edges:
        src = edge["source"]
        tgt = edge["target"]
        adjacency[src].append(tgt)
        in_degree[tgt] = in_degree.get(tgt, 0) + 1

    queue = deque(n for n in node_ids if in_degree[n] == 0)
    result: List[str] = []

    while queue:
        node = queue.popleft()
        result.append(node)
        for neighbor in adjacency[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(result) != len(node_ids):
        raise ValueError(
            "Cycle detected in workflow graph. Ensure all connections form a DAG."
        )

    return result


def gather_inputs(node_id: str, edges: List[Dict], node_outputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Collect outputs from all upstream nodes that connect to this node.
    Uses targetHandle as the key so multi-input nodes can differentiate ports.
    """
    inputs: Dict[str, Any] = {}
    for edge in edges:
        if edge["target"] == node_id:
            upstream_output = node_outputs.get(edge["source"], {})
            handle = edge.get("targetHandle") or "dataframe"
            # Merge upstream outputs; handle-keyed access takes priority
            if isinstance(upstream_output, dict):
                inputs.update(upstream_output)
                val = upstream_output.get(handle)
                inputs[handle] = val if val is not None else upstream_output.get("dataframe")
    return inputs


# ─── Execution Engine ─────────────────────────────────────────────────────────

class WorkflowExecutionEngine:
    """
    Core execution engine for a single workflow run.

    Usage:
        engine = WorkflowExecutionEngine(workflow_graph, execution_id, on_node_status)
        results = engine.execute()
    """

    def __init__(
        self,
        workflow_graph: Dict[str, Any],
        execution_id: str,
        on_node_status: Optional[Callable[[str, str, Dict], None]] = None,
    ):
        """
        Args:
            workflow_graph: {"nodes": [...], "edges": [...]}
            execution_id:   UUID of the workflow_executions row
            on_node_status: callback(node_id, status, metrics) called after each node
        """
        self.nodes: Dict[str, Dict] = {n["id"]: n for n in workflow_graph.get("nodes", [])}
        self.edges: List[Dict] = workflow_graph.get("edges", [])
        self.execution_id = execution_id
        self.on_node_status = on_node_status or (lambda *_: None)

        # Cache of outputs indexed by node_id
        self.node_outputs: Dict[str, Any] = {}
        self.node_metrics: Dict[str, Dict] = {}
        self.errors: Dict[str, str] = {}

    # ── Public API ────────────────────────────────────────────

    def execute(self) -> Dict[str, Any]:
        """
        Execute all nodes in topological order.
        Returns a summary dict: {node_id → {status, metrics, output_preview}}.
        """
        node_ids = list(self.nodes.keys())
        try:
            exec_order = topological_sort(node_ids, self.edges)
        except ValueError as exc:
            raise RuntimeError(str(exc)) from exc

        for node_id in exec_order:
            self._run_node(node_id)

        return self._build_summary()

    # ── Private helpers ───────────────────────────────────────

    def _run_node(self, node_id: str) -> None:
        node = self.nodes[node_id]
        node_type = node.get("type", "unknown")
        config = node.get("data", {}).get("config", {})

        # Notify: starting
        self.on_node_status(node_id, "running", {})

        try:
            processor = NODE_REGISTRY.get(node_type)
            if processor is None:
                raise ValueError(f"No processor registered for node type '{node_type}'")

            inputs = gather_inputs(node_id, self.edges, self.node_outputs)
            output = processor.execute(inputs, config)

            # Cache output — strip non-serializable DataFrames before storing metrics
            self.node_outputs[node_id] = output
            metrics = self._extract_metrics(output, node_type)
            self.node_metrics[node_id] = metrics

            self.on_node_status(node_id, "success", metrics)

        except Exception as exc:
            error_msg = f"{type(exc).__name__}: {exc}"
            self.errors[node_id] = error_msg
            self.node_outputs[node_id] = {}
            self.on_node_status(node_id, "error", {"error": error_msg})

    def _extract_metrics(self, output: Dict[str, Any], node_type: str) -> Dict[str, Any]:
        """Pull lightweight scalar metrics out of a node output for DB storage."""
        metrics: Dict[str, Any] = {}
        if not isinstance(output, dict):
            return metrics

        df = output.get("dataframe")
        if isinstance(df, pd.DataFrame):
            metrics["row_count"] = int(len(df))
            metrics["column_count"] = int(len(df.columns))

        # Node-type specific metric extraction
        for key in ("anomaly_count", "anomaly_rate", "missing_count", "duplicate_count",
                    "method", "row_count_input", "row_count_output"):
            if key in output:
                val = output[key]
                if isinstance(val, (int, float, str, bool)):
                    metrics[key] = val

        return metrics

    def _build_summary(self) -> Dict[str, Any]:
        summary: Dict[str, Any] = {}
        for node_id in self.nodes:
            status = "error" if node_id in self.errors else "success"
            summary[node_id] = {
                "status": status,
                "metrics": self.node_metrics.get(node_id, {}),
                "error": self.errors.get(node_id),
            }
        return summary
