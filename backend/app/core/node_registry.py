"""
Node Registry — maps node_type strings to processor instances.

Add new node types here after implementing their processor class.
"""
from app.nodes.base import BaseNodeProcessor

# ── Sources ──────────────────────────────────────────────────────────────────
from app.nodes.sources.file_upload import FileUploadProcessor
from app.nodes.sources.database_query import DatabaseQueryProcessor

# ── Preparation ──────────────────────────────────────────────────────────────
from app.nodes.preparation.column_type_detection import ColumnTypeDetectionProcessor
from app.nodes.preparation.missing_value import MissingValueProcessor
from app.nodes.preparation.duplicate_detection import DuplicateDetectionProcessor
from app.nodes.preparation.filter_rows import FilterRowsProcessor

# ── Analysis ─────────────────────────────────────────────────────────────────
from app.nodes.analysis.statistics import StatisticsProcessor
from app.nodes.analysis.anomaly_detection import AnomalyDetectionProcessor
from app.nodes.analysis.correlation import CorrelationProcessor
from app.nodes.analysis.distribution import DistributionProcessor
from app.nodes.analysis.time_series import TimeSeriesProcessor

# ── Transformation ───────────────────────────────────────────────────────────
from app.nodes.transformation.normalize import NormalizeProcessor
from app.nodes.transformation.encode import EncodeProcessor
from app.nodes.transformation.pivot import PivotProcessor
from app.nodes.transformation.group_by import GroupByProcessor
from app.nodes.transformation.column_ops import ColumnOpsProcessor
from app.nodes.transformation.custom_python import CustomPythonProcessor
from app.nodes.transformation.join import JoinProcessor

# ── ML ────────────────────────────────────────────────────────────────────────
from app.nodes.ml.train_test_split import TrainTestSplitProcessor
from app.nodes.ml.ml_model import MLModelProcessor

# ── Visualization ─────────────────────────────────────────────────────────────
from app.nodes.visualization.statistics_chart import StatisticsChartProcessor
from app.nodes.visualization.anomaly_chart import AnomalyChartProcessor
from app.nodes.visualization.correlation_chart import CorrelationChartProcessor
from app.nodes.visualization.distribution_chart import DistributionChartProcessor

# ── Output ───────────────────────────────────────────────────────────────────
from app.nodes.output.dashboard_builder import DashboardBuilderProcessor
from app.nodes.output.report_builder import ReportBuilderProcessor
from app.nodes.output.ai_insights import AIInsightsProcessor
from app.nodes.output.data_export import DataExportProcessor


NODE_REGISTRY: dict[str, BaseNodeProcessor] = {
    # Sources
    "file_upload":              FileUploadProcessor(),
    "database_query":           DatabaseQueryProcessor(),

    # Preparation
    "column_type_detection":    ColumnTypeDetectionProcessor(),
    "missing_value":            MissingValueProcessor(),
    "duplicate_detection":      DuplicateDetectionProcessor(),
    "filter_rows":              FilterRowsProcessor(),

    # Analysis
    "statistics":               StatisticsProcessor(),
    "anomaly_detection":        AnomalyDetectionProcessor(),
    "correlation":              CorrelationProcessor(),
    "distribution":             DistributionProcessor(),
    "time_series":              TimeSeriesProcessor(),

    # Transformation
    "normalize":                NormalizeProcessor(),
    "encode":                   EncodeProcessor(),
    "pivot":                    PivotProcessor(),
    "group_by":                 GroupByProcessor(),
    "column_ops":               ColumnOpsProcessor(),
    "custom_python":            CustomPythonProcessor(),
    "join":                     JoinProcessor(),

    # ML
    "train_test_split":         TrainTestSplitProcessor(),
    "ml_model":                 MLModelProcessor(),

    # Visualization
    "statistics_chart":         StatisticsChartProcessor(),
    "anomaly_chart":            AnomalyChartProcessor(),
    "correlation_chart":        CorrelationChartProcessor(),
    "distribution_chart":       DistributionChartProcessor(),

    # Output
    "dashboard":                DashboardBuilderProcessor(),
    "report":                   ReportBuilderProcessor(),
    "ai_insights":              AIInsightsProcessor(),
    "data_export":              DataExportProcessor(),
}
