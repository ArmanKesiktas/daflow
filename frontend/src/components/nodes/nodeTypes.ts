import { FileUploadNode } from './FileUploadNode'
import { DatabaseQueryNode } from './DatabaseQueryNode'
import {
  ColumnTypeDetectionNode,
  MissingValueNode,
  DuplicateDetectionNode,
  FilterRowsNode,
  StatisticsNode,
  AnomalyDetectionNode,
  CorrelationNode,
  DistributionNode,
  TimeSeriesNode,
} from './AnalysisNodes'
import {
  StatisticsChartNode,
  AnomalyChartNode,
  CorrelationChartNode,
  DistributionChartNode,
} from './VisualizationNodes'
import { NormalizeNode, EncodeNode, PivotNode, GroupByNode, ColumnOpsNode, CustomPythonNode, JoinNode } from './TransformationNodes'
import { TrainTestSplitNode, MLModelNode } from './MLNodes'
import { ReportNode, AIInsightsNode, DashboardNode, DataExportNode } from './OutputNodes'

/**
 * Registered outside any component to avoid React Flow re-renders.
 * Maps node `type` strings → custom React components.
 */
export const nodeTypes = {
  file_upload:             FileUploadNode,
  database_query:          DatabaseQueryNode,
  column_type_detection:   ColumnTypeDetectionNode,
  missing_value:           MissingValueNode,
  duplicate_detection:     DuplicateDetectionNode,
  filter_rows:             FilterRowsNode,
  statistics:              StatisticsNode,
  anomaly_detection:       AnomalyDetectionNode,
  correlation:             CorrelationNode,
  distribution:            DistributionNode,
  normalize:               NormalizeNode,
  encode:                  EncodeNode,
  pivot:                   PivotNode,
  group_by:                GroupByNode,
  column_ops:              ColumnOpsNode,
  custom_python:           CustomPythonNode,
  join:                    JoinNode,
  train_test_split:        TrainTestSplitNode,
  ml_model:                MLModelNode,
  time_series:             TimeSeriesNode,
  statistics_chart:        StatisticsChartNode,
  anomaly_chart:           AnomalyChartNode,
  correlation_chart:       CorrelationChartNode,
  distribution_chart:      DistributionChartNode,
  report:                  ReportNode,
  ai_insights:             AIInsightsNode,
  dashboard:               DashboardNode,
  data_export:             DataExportNode,
}
