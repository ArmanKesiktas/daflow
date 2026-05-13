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

# ── Transformation ───────────────────────────────────────────────────────────
from app.nodes.transformation.join import JoinProcessor

# ── Analysis ─────────────────────────────────────────────────────────────────
from app.nodes.analysis.statistics import StatisticsProcessor
from app.nodes.analysis.anomaly_detection import AnomalyDetectionProcessor
from app.nodes.analysis.ccsg_sg_anomaly import CCSGSGAnomalyProcessor
from app.nodes.analysis.correlation import CorrelationProcessor
from app.nodes.analysis.distribution import DistributionProcessor
from app.nodes.analysis.time_series import TimeSeriesProcessor

# ── Big Data ─────────────────────────────────────────────────────────────────
from app.nodes.big_data.processing import (
    ChunkProcessingProcessor,
    LargeDatasetProfilerProcessor,
    MapReduceAggregationProcessor,
    SparkLikeGroupByProcessor,
)

# ── Utility ──────────────────────────────────────────────────────────────────
from app.nodes.utility.route_node import RouteNodeProcessor

# ── Output ───────────────────────────────────────────────────────────────────
from app.nodes.output.dashboard_builder import DashboardBuilderProcessor
from app.nodes.output.report_builder import ReportBuilderProcessor

# ── ML & visualization ───────────────────────────────────────────────────────
from app.nodes.ml.train_test_split import TrainTestSplitProcessor
from app.nodes.ml.ml_model import MLModelProcessor
from app.nodes.visualization.generic_chart import GenericChartProcessor


NODE_REGISTRY: dict[str, BaseNodeProcessor] = {
    # Sources
    "file_upload":              FileUploadProcessor(),
    "database_query":           DatabaseQueryProcessor(),

    # Preparation
    "column_type_detection":    ColumnTypeDetectionProcessor(),
    "missing_value":            MissingValueProcessor(),
    "duplicate_detection":      DuplicateDetectionProcessor(),
    "filter_rows":              FilterRowsProcessor(),

    # Transformation
    "join_node":                JoinProcessor(),

    # Analysis
    "statistics":               StatisticsProcessor(),
    "anomaly_detection":        AnomalyDetectionProcessor(),
    "ccsg_sg_anomaly":          CCSGSGAnomalyProcessor(),
    "correlation":              CorrelationProcessor(),
    "distribution":             DistributionProcessor(),
    "time_series":              TimeSeriesProcessor(),

    # Big data
    "chunk_processing":         ChunkProcessingProcessor(),
    "mapreduce_aggregation":    MapReduceAggregationProcessor(),
    "spark_groupby":            SparkLikeGroupByProcessor(),
    "large_dataset_profiler":   LargeDatasetProfilerProcessor(),

    # Utility
    "route_node":               RouteNodeProcessor(),

    # Machine learning
    "train_test_split":         TrainTestSplitProcessor(),
    "ml_model":                 MLModelProcessor(),

    # Charts
    "bar_chart":                GenericChartProcessor(),
    "clustered_bar_chart":      GenericChartProcessor(),
    "stacked_bar_chart":        GenericChartProcessor(),
    "overlapping_bars":         GenericChartProcessor(),
    "horizontal_bar_chart":     GenericChartProcessor(),
    "dumbbell_chart":           GenericChartProcessor(),
    "diverging_bar_chart":      GenericChartProcessor(),
    "small_multiples":          GenericChartProcessor(),
    "line_chart":               GenericChartProcessor(),
    "area_chart":               GenericChartProcessor(),
    "dual_axis_chart":          GenericChartProcessor(),
    "stream_graph":             GenericChartProcessor(),
    "connected_scatter_plot":   GenericChartProcessor(),
    "slope_chart":              GenericChartProcessor(),
    "pie_chart":                GenericChartProcessor(),
    "donut_chart":              GenericChartProcessor(),
    "sunburst":                 GenericChartProcessor(),
    "alluvial_diagram":         GenericChartProcessor(),
    "radar_chart":              GenericChartProcessor(),
    "polar_area_chart":         GenericChartProcessor(),
    "scatter_plot":             GenericChartProcessor(),
    "bubble_chart":             GenericChartProcessor(),
    "heatmap":                  GenericChartProcessor(),
    "histogram":                GenericChartProcessor(),
    "box_plot":                 GenericChartProcessor(),
    "violin_plot":              GenericChartProcessor(),
    "beeswarm_plot":            GenericChartProcessor(),
    "density_heatmap":          GenericChartProcessor(),
    "convex_hull_chart":        GenericChartProcessor(),
    "word_cloud":               GenericChartProcessor(),
    "parallel_coordinates":     GenericChartProcessor(),
    "kpi_card":                 GenericChartProcessor(),
    "kpi_grid":                 GenericChartProcessor(),
    "stat_card":                GenericChartProcessor(),
    "missing_values_bar":       GenericChartProcessor(),
    "duplicate_rate_card":      GenericChartProcessor(),
    "correlation_network":      GenericChartProcessor(),
    "treemap":                  GenericChartProcessor(),
    "dot_map":                  GenericChartProcessor(),
    "choropleth_map":           GenericChartProcessor(),
    "bubble_map":               GenericChartProcessor(),
    "cartogram":                GenericChartProcessor(),
    "dorling_cartogram":        GenericChartProcessor(),
    "connection_map":           GenericChartProcessor(),
    "network_diagram":          GenericChartProcessor(),
    "circular_graph":           GenericChartProcessor(),
    "arc_diagram":              GenericChartProcessor(),
    "time_based_network_diagram": GenericChartProcessor(),

    # Output
    "dashboard":                DashboardBuilderProcessor(),
    "report":                   ReportBuilderProcessor(),
}
