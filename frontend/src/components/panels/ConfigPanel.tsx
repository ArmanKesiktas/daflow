import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlowStore } from '../../store/flowStore'
import { useExecutionStore } from '../../store/executionStore'
import { filesApi } from '../../api/executions'
import { connectorsApi } from '../../api/platform'
import toast from 'react-hot-toast'
import type { DataConnector, NodeData } from '../../types/workflow'
import { useWorkflowSave } from '../../hooks/useWorkflowSave'
import { useI18n } from '../../i18n'
import { useWorkspace } from '../../features/workspaces/WorkspaceContext'
import { NODE_DEFINITIONS } from './NodePanel'
import type { Edge, Node } from '@xyflow/react'
import { CHART_DEFINITIONS, chartDefinition } from '../../utils/chartCatalog'
import { friendlyError } from '../../utils/friendlyErrors'
import JoinConfigPanel from './JoinConfigPanel'

interface ConfigPanelProps {
  nodeId: string | null
  collapsed?: boolean
  onToggle?: () => void
}

// ── Field requirement metadata ─────────────────────────────────────────────────
// Maps node types to their fields with required/optional indicators.
// `true` = required, `false` = optional. Fields not listed are treated as neutral (no indicator).

export const FIELD_REQUIREMENTS: Record<string, Record<string, boolean>> = {
  file_upload: {
    file: true,
  },
  database_query: {
    connector_id: true,
    query: true,
    connection_string: true,
    host: true,
    database: true,
    username: true,
    password: true,
    row_limit: false,
    db_type: false,
    port: false,
  },
  anomaly_detection: {
    method: true,
    iqr_multiplier: false,
    zscore_threshold: false,
    contamination: false,
  },
  ccsg_sg_anomaly: {
    window: true,
    beta: false,
    tau: false,
    threshold: false,
    ridge: false,
  },
  missing_value: {
    strategy: true,
  },
  correlation: {
    method: true,
    threshold: false,
  },
  filter_rows: {
    column: true,
    operator: true,
    value: false,
  },
  report: {
    title: true,
  },
  dashboard: {
    title: true,
  },
  time_series: {
    date_column: true,
    value_column: true,
    window: false,
  },
  train_test_split: {
    test_size: true,
    random_state: false,
    stratify_column: false,
  },
  ml_model: {
    task_type: true,
    algorithm: true,
    target_column: true,
    feature_columns: false,
  },
  distribution: {
    bins: false,
  },
  chunk_processing: {
    chunk_size: false,
  },
  mapreduce_aggregation: {
    chunk_size: false,
    group_column: false,
    value_column: false,
    reducer: true,
  },
  spark_groupby: {
    group_columns: false,
    aggregate_columns: false,
    aggregation: true,
    partitions: false,
  },
  large_dataset_profiler: {
    sample_size: false,
  },
  join_node: {
    how: true,
    keyPairs: true,
  },
  export_output: {
    format: true,
    filename: true,
    columns: false,
    include_charts: false,
    include_summary: false,
  },
  code_sql: {
    query: true,
    input_node: false,
  },
}

// ── Help content for every node ────────────────────────────────────────────────

interface OptionHelp { name: string; description: string }
interface NodeHelp {
  concept: string
  description: string
  options?: OptionHelp[]
}

const HELP_CONTENT: Record<string, NodeHelp> = {
  file_upload: {
    concept: 'File Upload',
    description:
      'The entry point of every workflow. Upload a structured dataset (CSV, Excel, or Parquet) to make it available to downstream nodes. The file is stored temporarily on the server and referenced by a unique ID.',
    options: [
      { name: 'Accepted formats', description: '.csv, .xlsx, .xls, .parquet — tabular data files with a header row.' },
    ],
  },
  join_node: {
    concept: 'Join',
    description:
      'Combines two DataFrames by matching rows on shared key columns. Supports inner, left, right, outer, and cross join types. Connect two data sources to the left and right handles, then configure the join keys.',
    options: [
      { name: 'Join Type', description: 'INNER keeps only matching rows. LEFT/RIGHT keeps all rows from one side. OUTER keeps all rows from both. CROSS produces a cartesian product.' },
      { name: 'Key Pairs', description: 'Column pairs used to match rows between the two tables. Multiple pairs create a composite key.' },
    ],
  },
  database_query: {
    concept: 'Database Query',
    description:
      'A workflow source that pulls tabular data from a saved PostgreSQL or Supabase Table connector. The query runs on the backend and only read-only statements are allowed.',
    options: [
      { name: 'Saved connector', description: 'Use Dataset Library connectors so passwords and API keys stay on the server instead of being saved into the workflow graph.' },
      { name: 'SQL', description: 'PostgreSQL connectors support SELECT/WITH queries. Supabase Table connectors read the selected table through the REST API.' },
      { name: 'Row limit', description: 'Caps the number of rows passed downstream to keep previews and workflow runs responsive.' },
    ],
  },
  column_type_detection: {
    concept: 'Column Type Detection',
    description:
      'Automatically inspects each column and assigns a semantic type — numeric, categorical, datetime, boolean, or text. Downstream analysis nodes use these types to apply the most appropriate algorithms.',
    options: [
      { name: 'Categorical Threshold', description: 'If a column has fewer unique values than this number, it is classified as categorical. Increase for datasets with many distinct but still discrete values.' },
      { name: 'Try Parse Dates', description: 'When enabled, columns with date-like string patterns are converted to datetime type, enabling time-series analysis.' },
    ],
  },
  missing_value: {
    concept: 'Missing Values',
    description:
      'Detects null, NaN, or empty entries in the dataset. Missing data can bias statistical results if not handled. Choose a strategy that matches your data context.',
    options: [
      { name: 'report_only', description: 'Do nothing — just count and report missing values per column. No data is changed.' },
      { name: 'drop_rows', description: 'Remove every row that contains at least one missing value. Suitable when missing rate is very low (<5%).' },
      { name: 'fill_mean', description: 'Replace missing values with the column arithmetic mean. Best for normally distributed numeric columns.' },
      { name: 'fill_median', description: 'Replace with the column median. More robust than mean when data contains outliers.' },
      { name: 'fill_mode', description: 'Replace with the most frequent value. Works for both numeric and categorical columns.' },
      { name: 'fill_constant', description: 'Replace with a fixed value (e.g., 0 or "Unknown"). Use when the absence itself carries meaning.' },
    ],
  },
  duplicate_detection: {
    concept: 'Duplicate Detection',
    description:
      'Identifies rows that are identical across all columns (or a chosen subset). Duplicates can inflate statistics and skew model training.',
    options: [
      { name: 'Subset', description: 'Columns to compare. Leave empty to compare all columns. Enter comma-separated column names to detect partial duplicates.' },
      { name: 'Keep', description: '"first" keeps the first occurrence and marks the rest; "last" keeps the last; "none" marks all duplicates.' },
      { name: 'Drop', description: 'When enabled, duplicate rows are removed from the output dataframe. When off, rows are flagged but kept.' },
    ],
  },
  filter_rows: {
    concept: 'Filter Rows',
    description:
      'Applies a conditional rule to retain only rows matching a criterion. Useful for focusing analysis on a specific segment (e.g., a product category or date range).',
    options: [
      { name: 'Column Name', description: 'The column to evaluate. Must match an existing column name exactly (case-sensitive).' },
      { name: 'Operator', description: 'Comparison operator: == (equals), != (not equals), > / >= / < / <= (numeric comparisons), contains / not_contains (string search), isnull / notnull (missing check).' },
      { name: 'Value', description: 'The value to compare against. Leave empty for isnull / notnull operators. For numeric columns enter a number; for text columns enter a string.' },
    ],
  },
  statistics: {
    concept: 'Descriptive Statistics',
    description:
      'Computes summary statistics for every numeric column. These metrics help you understand the central tendency, spread, and shape of your data distribution before applying more complex analysis.',
    options: [
      { name: 'Mean', description: 'Arithmetic average — the center of gravity of the data.' },
      { name: 'Std Dev', description: 'Standard deviation — how spread out values are around the mean.' },
      { name: 'Skewness', description: 'Asymmetry of the distribution. 0 = symmetric, >0 = right tail, <0 = left tail.' },
      { name: 'Kurtosis', description: 'Tail heaviness. High kurtosis means more extreme outliers are present.' },
      { name: 'Min / Max / Median', description: 'Range and central value of the data.' },
    ],
  },
  anomaly_detection: {
    concept: 'Anomaly Detection',
    description:
      'Identifies data points that deviate significantly from the rest of the dataset. Anomalies can indicate data entry errors, fraud, sensor failures, or genuinely rare events.',
    options: [
      { name: 'Method → IQR', description: 'Interquartile Range method. Flags values outside [Q1 − k·IQR, Q3 + k·IQR]. Simple, fast, and non-parametric (no normality assumption).' },
      { name: 'Method → Z-Score', description: 'Standardizes values and flags those exceeding a threshold (default 3σ). Assumes approximately normal distribution.' },
      { name: 'Method → Modified Z-Score', description: 'Uses the median instead of mean, making it more robust to existing outliers.' },
      { name: 'Method → Isolation Forest', description: 'Machine learning algorithm that isolates anomalies by random partitioning. Best for high-dimensional data or complex patterns.' },
      { name: 'IQR Multiplier', description: 'Sensitivity factor k for IQR method. Lower = stricter (e.g., 1.5 is standard; 3.0 is lenient).' },
      { name: 'Z-Score Threshold', description: 'Points further than this many standard deviations from the mean are flagged. Typical value: 3.0.' },
      { name: 'Contamination', description: 'Expected proportion of anomalies (0–0.5) for Isolation Forest. Set to estimated outlier rate in your data.' },
    ],
  },
  ccsg_sg_anomaly: {
    concept: 'CCSG-SG',
    description:
      'Conformal Copula Surprise with Stability Gating. This node follows the sequence U_t normalization, copula-density alpha, sliding-window conformal p-value, surprise, stability variance, logistic gate, and final A_t score.',
    options: [
      { name: 'Window', description: 'Sliding history size used by conformal p-value and stability variance.' },
      { name: 'Beta', description: 'Controls how sharply the stability gate responds when variance crosses tau.' },
      { name: 'Tau', description: 'Variance level where the stability gate begins suppressing surprise.' },
      { name: 'A_t Threshold', description: 'Rows with final A_t score at or above this value are marked as anomalies.' },
      { name: 'Ridge', description: 'Small diagonal regularization for the copula correlation matrix.' },
    ],
  },
  correlation: {
    concept: 'Correlation Analysis',
    description:
      'Measures the linear (or monotonic) relationship between pairs of numeric columns. A correlation coefficient r ranges from −1 (perfect inverse) through 0 (no relationship) to +1 (perfect positive).',
    options: [
      { name: 'Method → Pearson', description: 'Measures linear correlation. Assumes both variables are normally distributed. Most common choice.' },
      { name: 'Method → Spearman', description: 'Rank-based correlation. Non-parametric — works with ordinal data and non-normal distributions.' },
      { name: 'Method → Kendall', description: 'Another rank-based measure. More robust with small samples and many ties.' },
      { name: 'Threshold', description: 'Pairs with |r| above this value are highlighted as "strong correlations". Common thresholds: 0.5 (moderate), 0.7 (strong), 0.9 (very strong).' },
    ],
  },
  distribution: {
    concept: 'Distribution Analysis',
    description:
      'Visualises how values are distributed across each numeric column using histograms and kernel density estimation (KDE). Also runs normality tests to check if data follows a Gaussian distribution.',
    options: [
      { name: 'Histogram Bins', description: 'Number of equal-width intervals to group values into. More bins → finer detail but noisier. Fewer bins → smoother but may hide patterns. Rule of thumb: √n where n = row count.' },
    ],
  },
  chunk_processing: {
    concept: 'Chunk Processing',
    description:
      'Splits large tabular datasets into row chunks and profiles each chunk. This demonstrates batch-oriented big data processing while keeping the original dataframe available downstream.',
    options: [
      { name: 'Chunk Size', description: 'Maximum rows processed per chunk. Smaller chunks use less memory per step but create more mapper work.' },
    ],
  },
  mapreduce_aggregation: {
    concept: 'MapReduce Aggregation',
    description:
      'Runs grouped aggregation in two phases: mapper chunks produce partial aggregates, then the reducer combines them into a final table.',
    options: [
      { name: 'Group Column', description: 'Column used as the reduce key. Empty chooses a categorical column automatically.' },
      { name: 'Value Column', description: 'Numeric column to aggregate for sum, mean, min, and max.' },
      { name: 'Reducer', description: 'Aggregation function applied by the reduce phase.' },
    ],
  },
  spark_groupby: {
    concept: 'Spark-like GroupBy',
    description:
      'Performs a partition-style groupBy aggregation inspired by Spark DataFrames. It summarizes shuffle keys, partitions, and output groups.',
    options: [
      { name: 'Group Columns', description: 'Comma-separated grouping keys.' },
      { name: 'Aggregate Columns', description: 'Comma-separated numeric columns. Empty uses all numeric columns outside the group keys.' },
      { name: 'Partitions', description: 'Logical partition count used for the Spark-like execution summary.' },
    ],
  },
  large_dataset_profiler: {
    concept: 'Large Dataset Profiler',
    description:
      'Profiles dataset scale, memory usage, type distribution, missingness, cardinality, and numeric spread from a bounded sample.',
    options: [
      { name: 'Sample Size', description: 'Rows used for expensive profiling metrics such as cardinality and numeric summaries.' },
    ],
  },
  route_node: {
    concept: 'Route Node',
    description:
      'A visual routing node for simplifying dense workflows. Connect multiple upstream analysis or chart nodes into it, then connect the route node to dashboards, reports, or later nodes. It merges upstream outputs without changing the data.',
    options: [
      { name: 'Merge route', description: 'Passes dataframe, analysis summaries, chart panels, dashboard config, and report data onward.' },
    ],
  },
  report: {
    concept: 'Report Builder',
    description:
      'Aggregates outputs from upstream analysis nodes into a structured, multi-section report. Supports PDF export. Each connected analysis node contributes its own section (statistics, anomalies, correlations, etc.).',
    options: [
      { name: 'Report Title', description: 'The heading displayed at the top of the generated report and in the report list.' },
    ],
  },
  dashboard: {
    concept: 'Dashboard',
    description:
      'Creates an interactive visual dashboard from connected analysis results. Displays charts, tables, and metrics in a single-page view. Connect Statistics, Anomaly Detection, Correlation, and Distribution nodes to populate all panels.',
    options: [
      { name: 'Dashboard Title', description: 'Title shown in the dashboard header.' },
    ],
  },
  export_output: {
    concept: 'Export Output',
    description:
      'Exports the upstream DataFrame to a downloadable file in Excel (.xlsx), CSV (.csv), or JSON (.json) format. Configure which columns to include, whether to add charts or a summary sheet, and set the output filename.',
    options: [
      { name: 'Format', description: 'Output file format: xlsx (Excel with formatting), csv (plain text), or json (structured data).' },
      { name: 'Filename', description: 'Name of the exported file (without extension). The correct extension is added automatically.' },
      { name: 'Columns', description: 'Comma-separated column names to include. Leave empty to export all columns.' },
      { name: 'Include Charts', description: 'When enabled and format is xlsx, embeds chart images from upstream visualization nodes into the Excel file.' },
      { name: 'Include Summary', description: 'When enabled, adds a summary sheet (xlsx) or section (json) with basic statistics of the exported data.' },
    ],
  },
  code_sql: {
    concept: 'SQL Query',
    description:
      'Write custom SQL SELECT queries against upstream datasets. The upstream DataFrame is registered as "input_data" and you can query it using standard SQL syntax. Only SELECT and WITH (CTE) statements are allowed for security.',
    options: [
      { name: 'Input Dataset', description: 'Select which upstream node provides the DataFrame to query. The data is available as the "input_data" table.' },
      { name: 'SQL Query', description: 'Write a SELECT or WITH statement. DROP, DELETE, ALTER, INSERT, UPDATE, and CREATE are blocked.' },
      { name: 'Run', description: 'Execute the query and preview results. Errors are shown with line number information.' },
    ],
  },
}

export default function ConfigPanel({ nodeId, collapsed = false, onToggle }: ConfigPanelProps) {
  const { nodes, edges, updateNodeData, addNode, setEdges } = useFlowStore()
  const { saveNow } = useWorkflowSave()
  const nodeStatuses = useExecutionStore((s) => s.nodeStatuses)
  const [showHelp, setShowHelp] = useState(false)
  const { t, lang } = useI18n()

  // ── Collapsed: icon-only strip ────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside data-tour="config-panel" className="w-10 bg-page-bg border-l border-[var(--color-border-default)] flex flex-col items-center py-2 flex-shrink-0 transition-all duration-200">
        <button
          onClick={onToggle}
          title="Expand options"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="mt-3 flex flex-col items-center gap-1">
          <span className="text-[18px] opacity-10">⚙</span>
        </div>
      </aside>
    )
  }

  const node = nodes.find((n) => n.id === nodeId)
  if (!node) {
    return (
      <aside data-tour="config-panel" className="w-64 bg-page-bg border-l border-[var(--color-border-default)] flex flex-col flex-shrink-0 transition-all duration-200">
        <div className="flex items-center justify-between px-4 h-11 border-b border-[var(--color-border-subtle)]">
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">{t('options') ?? 'Options'}</p>
          <button
            onClick={onToggle}
            title="Collapse panel"
            className="w-5 h-5 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <span className="text-4xl opacity-10">⚙</span>
          <p className="text-[var(--color-text-muted)] text-[12px]">{t('selectNode')}</p>
        </div>
      </aside>
    )
  }

  const data = node.data as NodeData
  const config = data.config as Record<string, unknown>
  const execStatus = nodeStatuses[nodeId!]
  const help = HELP_CONTENT[node.type || '']
  const categoryColor = getCategoryIconBg(data.category)

  const set = (key: string, value: unknown) => {
    updateNodeData(nodeId!, { config: { ...config, [key]: value } })
    saveNow()
  }

  // Get field requirement status for the current node type
  const fieldReqs = FIELD_REQUIREMENTS[node.type || ''] ?? {}
  const isRequired = (fieldKey: string): boolean | undefined => {
    if (fieldKey in fieldReqs) return fieldReqs[fieldKey]
    return undefined // no indicator
  }

  const addSuggestedNode = (type: string) => {
    const def = NODE_DEFINITIONS.find((item) => item.type === type)
    if (!def) return

    const newNode: Node<NodeData> = {
      id: crypto.randomUUID(),
      type: def.type,
      position: { x: node.position.x + 260, y: node.position.y },
      data: {
        label: def.label,
        category: def.category,
        config: { ...def.defaultConfig },
        status: 'idle',
      },
    }

    const edge: Edge = {
      id: crypto.randomUUID(),
      source: node.id,
      target: newNode.id,
      sourceHandle: 'dataframe',
      targetHandle: 'dataframe',
      type: 'smoothstep',
    }

    addNode(newNode)
    setEdges([...edges, edge])
    setTimeout(saveNow, 100)
  }

  const suggestions = getSuggestions(node.type ?? '', edges.some((edge) => edge.source === node.id))

  return (
    <aside data-tour="config-panel" className="w-64 bg-page-bg border-l border-[var(--color-border-default)] overflow-y-auto flex-shrink-0 flex flex-col transition-all duration-200">
      <div className="px-4 h-11 border-b border-[var(--color-border-subtle)] flex items-center gap-2.5">
        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 ${categoryColor}`}>
          {getIcon(node.type || '')}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{data.label}</h2>
          <span className={`text-[10px] font-medium ${statusColor(execStatus)}`}>
            {execStatus ?? 'idle'}
          </span>
        </div>
        {help && (
          <button
            onClick={() => setShowHelp((v) => !v)}
            title={showHelp ? 'Show config' : 'Show guide'}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors flex-shrink-0 ${
              showHelp
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]'
            }`}
          >
            ?
          </button>
        )}
        <button
          onClick={onToggle}
          title="Collapse panel"
          className="w-5 h-5 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors flex-shrink-0"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Help Guide ──────────────────────────────────── */}
      {showHelp && help ? (
        <div className="p-4 space-y-4 flex-1">
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1.5">{help.concept}</h3>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{help.description}</p>
          </div>
          {help.options && help.options.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">{t('options')}</p>
              {help.options.map((opt) => (
                <div key={opt.name} className="rounded-xl bg-[var(--color-secondary)] border border-[var(--color-border-subtle)] px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-[var(--color-text-primary)] mb-1">{opt.name}</p>
                  <p className="text-[10.5px] text-[var(--color-text-secondary)] leading-relaxed">{opt.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className="p-4 space-y-4">
        {suggestions.length > 0 && (
          <div className="rounded-xl bg-[var(--color-secondary)] border border-[var(--color-border-subtle)] p-3">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Next steps</p>
            <div className="space-y-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.type}
                  onClick={() => addSuggestedNode(suggestion.type)}
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[var(--color-border-subtle)] transition-colors"
                >
                  <span className={`w-6 h-6 rounded-md ${suggestion.color} text-white flex items-center justify-center text-[10px] font-semibold`}>{suggestion.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-medium text-[var(--color-text-primary)]">{suggestion.label}</span>
                    <span className="block text-[10px] text-[var(--color-text-muted)] truncate">{suggestion.reason}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {node.type === 'category_node' && (
          <CategoryNodeConfig
            nodeId={nodeId!}
            config={config}
            category={data.category}
            set={set}
            lang={lang}
          />
        )}

        {/* ── File Upload Config ─────────────────────────── */}
        {node.type === 'file_upload' && (
          <FileUploadConfig nodeId={nodeId!} config={config} set={set} />
        )}

        {/* ── Database Query Config ─────────────────────── */}
        {node.type === 'database_query' && (
          <DatabaseQueryConfig config={config} set={set} />
        )}

        {/* ── Anomaly Detection Config ──────────────────── */}
        {node.type === 'anomaly_detection' && (
          <>
            <Field label={t('method')} required={isRequired('method')}>
              <Select value={String(config.method ?? 'iqr')} onChange={(v) => set('method', v)}
                options={['iqr', 'zscore', 'modified_zscore', 'isolation_forest']} />
            </Field>
            {(config.method === 'iqr' || !config.method) && (
              <Field label={t('iqrMultiplier')} required={isRequired('iqr_multiplier')}>
                <NumberInput value={Number(config.iqr_multiplier ?? 1.5)} onChange={(v) => set('iqr_multiplier', v)} step={0.5} />
              </Field>
            )}
            {config.method === 'zscore' && (
              <Field label={t('zscoreThreshold')} required={isRequired('zscore_threshold')}>
                <NumberInput value={Number(config.zscore_threshold ?? 3.0)} onChange={(v) => set('zscore_threshold', v)} step={0.5} />
              </Field>
            )}
            {config.method === 'isolation_forest' && (
              <Field label={t('contamination')} required={isRequired('contamination')}>
                <NumberInput value={Number(config.contamination ?? 0.05)} onChange={(v) => set('contamination', v)} step={0.01} min={0.01} max={0.5} />
              </Field>
            )}
          </>
        )}

        {/* ── CCSG-SG Config ─────────────────────────── */}
        {node.type === 'ccsg_sg_anomaly' && (
          <>
            <div className="rounded-xl bg-success/10 border border-success/20 px-3 py-2 text-[10.5px] leading-relaxed text-[var(--color-text-secondary)]">
              {'U_t -> alpha_t -> p_t -> S_t -> sigma_t^2 -> G_t -> A_t'}
            </div>
            <Field label="Window" required={isRequired('window')}>
              <NumberInput value={Number(config.window ?? 30)} onChange={(v) => set('window', v)} step={5} min={2} />
            </Field>
            <Field label="Beta" required={isRequired('beta')}>
              <NumberInput value={Number(config.beta ?? 8.0)} onChange={(v) => set('beta', v)} step={0.5} min={0.1} />
            </Field>
            <Field label="Tau" required={isRequired('tau')}>
              <NumberInput value={Number(config.tau ?? 1.0)} onChange={(v) => set('tau', v)} step={0.1} min={0} />
            </Field>
            <Field label="A_t Threshold" required={isRequired('threshold')}>
              <NumberInput value={Number(config.threshold ?? 2.0)} onChange={(v) => set('threshold', v)} step={0.25} min={0} />
            </Field>
            <Field label="Ridge" required={isRequired('ridge')}>
              <NumberInput value={Number(config.ridge ?? 0.000001)} onChange={(v) => set('ridge', v)} step={0.000001} min={0.000000001} />
            </Field>
          </>
        )}

        {/* ── Missing Value Config ─────────────────────── */}
        {node.type === 'missing_value' && (
          <Field label={t('strategy')} required={isRequired('strategy')}>
            <Select value={String(config.strategy ?? 'report_only')} onChange={(v) => set('strategy', v)}
              options={['report_only', 'drop_rows', 'fill_mean', 'fill_median', 'fill_mode', 'fill_constant']} />
          </Field>
        )}

        {/* ── Correlation Config ───────────────────────── */}
        {node.type === 'correlation' && (
          <>
            <Field label={t('method')} required={isRequired('method')}>
              <Select value={String(config.method ?? 'pearson')} onChange={(v) => set('method', v)}
                options={['pearson', 'spearman', 'kendall']} />
            </Field>
            <Field label={t('strongCorrelationThreshold')} required={isRequired('threshold')}>
              <NumberInput value={Number(config.threshold ?? 0.7)} onChange={(v) => set('threshold', v)} step={0.05} min={0.1} max={1.0} />
            </Field>
          </>
        )}

        {/* ── Filter Rows Config ──────────────────────── */}
        {node.type === 'filter_rows' && (
          <>
            <Field label={t('columnName')} required={isRequired('column')}>
              <TextInput value={String(config.column ?? '')} onChange={(v) => set('column', v)} placeholder="column_name" />
            </Field>
            <Field label={t('operator')} required={isRequired('operator')}>
              <Select value={String(config.operator ?? '==')} onChange={(v) => set('operator', v)}
                options={['==', '!=', '>', '>=', '<', '<=', 'contains', 'not_contains', 'isnull', 'notnull']} />
            </Field>
            <Field label={t('value')} required={isRequired('value')}>
              <TextInput value={String(config.value ?? '')} onChange={(v) => set('value', v)} placeholder="comparison value" />
            </Field>
          </>
        )}

        {/* ── Report Config ───────────────────────────── */}
        {node.type === 'report' && (
          <Field label={t('reportTitle')} required={isRequired('title')}>
            <TextInput value={String(config.title ?? 'Data Analysis Report')} onChange={(v) => set('title', v)} />
          </Field>
        )}

        {/* ── Dashboard Config ────────────────────────── */}
        {node.type === 'dashboard' && (
          <>
            <Field label={t('dashboardTitle')} required={isRequired('title')}>
              <TextInput value={String(config.title ?? 'Analysis Dashboard')} onChange={(v) => set('title', v)} />
            </Field>
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-secondary)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                {lang === 'tr'
                  ? 'Dashboard grafikleri bu düğüme bağlanan chart node’larından gelir.'
                  : 'Dashboard charts come from chart nodes connected to this dashboard.'}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                {lang === 'tr'
                  ? 'Başlık, açıklama, chart tipi, KPI metriği ve düzen ayarlarını ilgili chart node’unda yapın.'
                  : 'Set title, description, chart type, KPI metric and layout from each chart node.'}
              </p>
            </div>
          </>
        )}

        {/* ── Export Output Config ────────────────────── */}
        {node.type === 'export_output' && (
          <ExportOutputConfig nodeId={nodeId!} config={config} set={set} data={data} />
        )}

        {/* ── Code SQL Config ─────────────────────────── */}
        {node.type === 'code_sql' && (
          <CodeSQLConfig nodeId={nodeId!} config={config} set={set} edges={edges} nodes={nodes} />
        )}

        {/* ── Chart Config ────────────────────────────── */}
        {data.category === 'visualization' && node.type !== 'category_node' && (
          <>
            <Field label="Chart Title">
              <TextInput value={String(config.title ?? data.label)} onChange={(v) => set('title', v)} />
            </Field>
            <Field label="Chart Type">
              <Select
                value={String(config.chart_type ?? node.type)}
                onChange={(v) => set('chart_type', v)}
                options={CHART_DEFINITIONS.map((chart) => chart.type)}
              />
            </Field>
            <Field label={lang === 'tr' ? 'Açıklama' : 'Description'}>
              <TextInput
                value={String(config.description ?? '')}
                onChange={(v) => set('description', v)}
                placeholder={lang === 'tr' ? 'Dashboard kartı açıklaması' : 'Dashboard card description'}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Metric">
                <Select value={String(config.metric ?? 'mean')} onChange={(v) => set('metric', v)} options={['mean', 'sum', 'median', 'std', 'min', 'max', 'skewness']} />
              </Field>
              <Field label={lang === 'tr' ? 'Toplama' : 'Aggregation'}>
                <Select value={String(config.aggregation ?? 'auto')} onChange={(v) => set('aggregation', v)} options={['auto', 'sum', 'mean', 'count', 'min', 'max']} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label={lang === 'tr' ? 'Sütun' : 'Column'}>
                <TextInput value={String(config.column ?? '')} onChange={(v) => set('column', v)} placeholder={lang === 'tr' ? 'opsiyonel' : 'optional'} />
              </Field>
              <Field label="Width">
                <NumberInput
                  value={Number((config.layout as Record<string, unknown> | undefined)?.w ?? 6)}
                  min={3}
                  max={12}
                  onChange={(v) => set('layout', { ...((config.layout as Record<string, unknown> | undefined) ?? {}), w: v })}
                />
              </Field>
              <Field label="Height">
                <NumberInput
                  value={Number((config.layout as Record<string, unknown> | undefined)?.h ?? 3)}
                  min={2}
                  max={8}
                  onChange={(v) => set('layout', { ...((config.layout as Record<string, unknown> | undefined) ?? {}), h: v })}
                />
              </Field>
            </div>
            <div className="rounded-xl bg-[var(--color-secondary)] border border-[var(--color-border-subtle)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                {chartDefinition(String(config.chart_type ?? node.type))?.description ?? 'Chart panel'}
              </p>
            </div>
          </>
        )}

        {/* ── Join Node Config ─────────────────────────── */}
        {node.type === 'join_node' && (
          <JoinConfigPanel nodeId={nodeId!} config={config} onConfigChange={set} />
        )}

        {/* ── ML Config ───────────────────────────────── */}
        {node.type === 'train_test_split' && (
          <>
            <Field label="Test Size" required={isRequired('test_size')}>
              <NumberInput value={Number(config.test_size ?? 0.2)} onChange={(v) => set('test_size', v)} step={0.05} min={0.05} max={0.5} />
            </Field>
            <Field label="Random State" required={isRequired('random_state')}>
              <NumberInput value={Number(config.random_state ?? 42)} onChange={(v) => set('random_state', v)} />
            </Field>
            <Field label="Stratify Column" required={isRequired('stratify_column')}>
              <TextInput value={String(config.stratify_column ?? '')} onChange={(v) => set('stratify_column', v)} placeholder="optional column" />
            </Field>
          </>
        )}

        {node.type === 'ml_model' && (
          <>
            <Field label="Task Type" required={isRequired('task_type')}>
              <Select value={String(config.task_type ?? 'classification')} onChange={(v) => {
                updateNodeData(nodeId!, {
                  config: {
                    ...config,
                    task_type: v,
                    algorithm: v === 'classification' ? 'random_forest_classifier' : 'random_forest_regressor',
                  },
                })
                saveNow()
              }} options={['classification', 'regression']} />
            </Field>
            <Field label="Algorithm" required={isRequired('algorithm')}>
              <Select
                value={String(config.algorithm ?? 'random_forest_classifier')}
                onChange={(v) => set('algorithm', v)}
                options={String(config.task_type ?? 'classification') === 'classification'
                  ? ['logistic_regression', 'random_forest_classifier', 'gradient_boosting_classifier', 'svm_classifier']
                  : ['linear_regression', 'random_forest_regressor', 'gradient_boosting_regressor', 'ridge']}
              />
            </Field>
            <Field label="Target Column" required={isRequired('target_column')}>
              <TextInput value={String(config.target_column ?? '')} onChange={(v) => set('target_column', v)} placeholder="column_to_predict" />
            </Field>
            <Field label="Feature Columns" required={isRequired('feature_columns')}>
              <TextInput value={Array.isArray(config.feature_columns) ? config.feature_columns.join(', ') : ''} onChange={(v) => set('feature_columns', v.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="empty = all numeric" />
            </Field>
          </>
        )}

        {/* ── Distribution / Statistics ───────────────── */}
        {node.type === 'distribution' && (
            <Field label={t('histogramBins')} required={isRequired('bins')}>
            <NumberInput value={Number(config.bins ?? 20)} onChange={(v) => set('bins', v)} step={5} min={5} max={100} />
          </Field>
        )}

        {node.type === 'time_series' && (
          <>
            <Field label="Date Column" required={isRequired('date_column')}>
              <TextInput value={String(config.date_column ?? '')} onChange={(v) => set('date_column', v)} placeholder="date" />
            </Field>
            <Field label="Value Column" required={isRequired('value_column')}>
              <TextInput value={String(config.value_column ?? '')} onChange={(v) => set('value_column', v)} placeholder="sales" />
            </Field>
            <Field label="Window" required={isRequired('window')}>
              <NumberInput value={Number(config.window ?? 7)} onChange={(v) => set('window', v)} min={2} />
            </Field>
          </>
        )}

        {/* ── Big Data Config ─────────────────────────── */}
        {node.type === 'chunk_processing' && (
          <Field label="Chunk Size" required={isRequired('chunk_size')}>
            <NumberInput value={Number(config.chunk_size ?? 10000)} onChange={(v) => set('chunk_size', v)} step={1000} min={1} />
          </Field>
        )}

        {node.type === 'mapreduce_aggregation' && (
          <>
            <Field label="Chunk Size" required={isRequired('chunk_size')}>
              <NumberInput value={Number(config.chunk_size ?? 10000)} onChange={(v) => set('chunk_size', v)} step={1000} min={1} />
            </Field>
            <Field label="Group Column" required={isRequired('group_column')}>
              <TextInput value={String(config.group_column ?? '')} onChange={(v) => set('group_column', v)} placeholder="empty = auto" />
            </Field>
            <Field label="Value Column" required={isRequired('value_column')}>
              <TextInput value={String(config.value_column ?? '')} onChange={(v) => set('value_column', v)} placeholder="empty = first numeric" />
            </Field>
            <Field label="Reducer" required={isRequired('reducer')}>
              <Select value={String(config.reducer ?? 'sum')} onChange={(v) => set('reducer', v)} options={['count', 'sum', 'mean', 'min', 'max']} />
            </Field>
          </>
        )}

        {node.type === 'spark_groupby' && (
          <>
            <Field label="Group Columns" required={isRequired('group_columns')}>
              <TextInput
                value={Array.isArray(config.group_columns) ? config.group_columns.join(', ') : String(config.group_columns ?? '')}
                onChange={(v) => set('group_columns', v.split(',').map((item) => item.trim()).filter(Boolean))}
                placeholder="empty = auto"
              />
            </Field>
            <Field label="Aggregate Columns" required={isRequired('aggregate_columns')}>
              <TextInput
                value={Array.isArray(config.aggregate_columns) ? config.aggregate_columns.join(', ') : String(config.aggregate_columns ?? '')}
                onChange={(v) => set('aggregate_columns', v.split(',').map((item) => item.trim()).filter(Boolean))}
                placeholder="empty = all numeric"
              />
            </Field>
            <Field label="Aggregation" required={isRequired('aggregation')}>
              <Select value={String(config.aggregation ?? 'sum')} onChange={(v) => set('aggregation', v)} options={['count', 'sum', 'mean', 'min', 'max']} />
            </Field>
            <Field label="Partitions" required={isRequired('partitions')}>
              <NumberInput value={Number(config.partitions ?? 4)} onChange={(v) => set('partitions', v)} step={1} min={1} />
            </Field>
          </>
        )}

        {node.type === 'large_dataset_profiler' && (
          <Field label="Sample Size" required={isRequired('sample_size')}>
            <NumberInput value={Number(config.sample_size ?? 5000)} onChange={(v) => set('sample_size', v)} step={1000} min={1} />
          </Field>
        )}

        {/* ── No config nodes ─────────────────────────── */}
        {['statistics', 'duplicate_detection', 'column_type_detection', 'route_node'].includes(node.type ?? '') && (
          <div className="text-center py-4">
            <p className="text-[11px] text-[var(--color-text-muted)]">{t('noConfigNeeded')}</p>
            {help && (
              <button
                onClick={() => setShowHelp(true)}
                className="mt-2 text-[11px] text-[var(--color-primary)] hover:underline"
              >
                {t('viewGuide')}
              </button>
            )}
          </div>
        )}
      </div>
      )}
    </aside>
  )
}

function CategoryNodeConfig({
  nodeId,
  config,
  category,
  set,
  lang,
}: {
  nodeId: string
  config: Record<string, unknown>
  category: string
  set: (k: string, v: unknown) => void
  lang: string
}) {
  const defs = NODE_DEFINITIONS.filter((def) => def.category === category)
  const operations = normaliseCategoryOperations(config.operations)
  const selected = new Set(operations.map((operation) => operation.type))
  const tr = lang === 'tr'

  const toggleOperation = (type: string) => {
    const def = defs.find((item) => item.type === type)
    if (!def) return
    const next = selected.has(type)
      ? operations.filter((operation) => operation.type !== type)
      : [
          ...operations,
          { type: def.type, label: def.label, config: { ...def.defaultConfig } },
        ]
    set('operations', defs
      .map((definition) => next.find((operation) => operation.type === definition.type))
      .filter(Boolean))
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2.5">
        <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">
          {tr ? 'Bu tek node içinde çalışacak özellikleri seçin.' : 'Choose features that run inside this single node.'}
        </p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-[var(--color-text-muted)]">
          {tr
            ? 'Seçilen işlemler listelenen sırayla çalışır ve çıktı tek node üzerinden devam eder.'
            : 'Selected operations run in the displayed order and continue through one node output.'}
        </p>
      </div>

      <div className="space-y-1.5">
        {defs.map((def) => {
          const checked = selected.has(def.type)
          return (
            <label
              key={def.type}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                checked
                  ? 'border-primary/45 bg-primary/[0.07]'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-secondary)] hover:border-[var(--color-border-default)]'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleOperation(def.type)}
                className="mt-0.5 w-3.5 h-3.5 rounded border-[var(--color-border-default)] text-primary focus:ring-0 focus:ring-offset-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-[var(--color-text-primary)]">{def.label}</span>
                <span className="block text-[10px] leading-relaxed text-[var(--color-text-muted)]">{def.description}</span>
              </span>
            </label>
          )
        })}
      </div>

      {category === 'source' && selected.has('file_upload') && (
        <FileUploadConfig nodeId={nodeId} config={config} set={set} />
      )}

      {category === 'source' && selected.has('database_query') && (
        <DatabaseQueryConfig config={config} set={set} />
      )}
    </div>
  )
}

function normaliseCategoryOperations(raw: unknown): Array<{ type: string; label?: string; config?: Record<string, unknown> }> {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string') return { type: item }
      if (item && typeof item === 'object' && 'type' in item) {
        return item as { type: string; label?: string; config?: Record<string, unknown> }
      }
      return null
    })
    .filter((item): item is { type: string; label?: string; config?: Record<string, unknown> } => Boolean(item?.type))
}

// ── Database Query sub-component ──────────────────────────────────────────────

function DatabaseQueryConfig({
  config,
  set,
}: {
  config: Record<string, unknown>
  set: (k: string, v: unknown) => void
}) {
  const [connectors, setConnectors] = useState<DataConnector[]>([])
  const [loading, setLoading] = useState(true)
  const [testState, setTestState] = useState<string>('')
  const { lang } = useI18n()
  const tr = lang === 'tr'
  const mode = String(config.connection_mode ?? 'connector')
  const dbConnectors = connectors.filter((connector) => connector.type === 'postgres' || connector.type === 'supabase_table')
  const selectedConnector = dbConnectors.find((connector) => connector.id === config.connector_id)
  const fieldReqs = FIELD_REQUIREMENTS['database_query'] ?? {}
  const isRequired = (fieldKey: string): boolean | undefined => {
    if (fieldKey in fieldReqs) return fieldReqs[fieldKey]
    return undefined
  }

  useEffect(() => {
    let active = true
    connectorsApi.list()
      .then((items) => {
        if (active) setConnectors(items)
      })
      .catch(() => {
        if (active) setConnectors([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const testSelectedConnector = async () => {
    if (!selectedConnector) return
    setTestState(tr ? 'Test ediliyor...' : 'Testing...')
    try {
      const result = await connectorsApi.test(selectedConnector.id)
      setTestState(result.ok
        ? `${result.row_count?.toLocaleString()} rows · ${result.column_count} columns`
        : result.error || (tr ? 'Bağlantı başarısız' : 'Connection failed'))
    } catch {
      setTestState(tr ? 'Bağlantı başarısız' : 'Connection failed')
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-primary/10 border border-primary/15 px-3 py-2 text-[10.5px] leading-relaxed text-[var(--color-text-secondary)]">
        {tr
          ? 'Kaynak olarak veritabanından satır çeker. Bağlantı şifreleri workflow grafiğine yazılmaz; backend kayıtlı connector bilgisini kullanır.'
          : 'Pulls rows from a database source. Secrets are not stored in the workflow graph; the backend uses the saved connector.'}
      </div>

      <Field label={tr ? 'Bağlantı modu' : 'Connection mode'}>
        <Select
          value={mode}
          onChange={(v) => set('connection_mode', v)}
          options={['connector', 'connection_string', 'fields']}
        />
      </Field>

      {mode === 'connector' ? (
        <>
          <Field label={tr ? 'Kayıtlı DB connector' : 'Saved DB connector'} required={isRequired('connector_id')}>
            <select
              value={String(config.connector_id ?? '')}
              onChange={(e) => set('connector_id', e.target.value)}
              className="w-full bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--color-text-primary)] focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="">{loading ? (tr ? 'Yükleniyor...' : 'Loading...') : (tr ? 'Connector seç' : 'Select connector')}</option>
              {dbConnectors.map((connector) => (
                <option key={connector.id} value={connector.id}>{connector.name} · {connector.type}</option>
              ))}
            </select>
          </Field>
          {selectedConnector?.type === 'postgres' && (
            <Field label="SQL" required={isRequired('query')}>
              <textarea
                value={String(config.query ?? 'select * from your_table limit 1000')}
                onChange={(e) => set('query', e.target.value)}
                rows={5}
                placeholder="select * from orders limit 1000"
                className="w-full resize-none bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-lg px-2.5 py-2 text-[11px] font-mono text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
              />
            </Field>
          )}
          {selectedConnector?.type === 'supabase_table' && (
            <div className="rounded-xl bg-[var(--color-secondary)] border border-[var(--color-border-subtle)] px-3 py-2 text-[10.5px] text-[var(--color-text-secondary)]">
              {tr ? 'Supabase Table connector seçili. Backend tabloyu REST API üzerinden okur.' : 'Supabase Table connector selected. The backend reads the table through the REST API.'}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={testSelectedConnector}
              disabled={!selectedConnector}
              className="h-8 px-3 rounded-lg bg-[var(--color-secondary)] disabled:opacity-40 text-[11px] font-medium"
            >
              {tr ? 'Bağlantıyı test et' : 'Test connection'}
            </button>
            {testState && <span className="text-[10.5px] text-[var(--color-text-muted)] truncate">{testState}</span>}
          </div>
        </>
      ) : mode === 'connection_string' ? (
        <>
          <Field label="Connection string" required={isRequired('connection_string')}>
            <TextInput value={String(config.connection_string ?? '')} onChange={(v) => set('connection_string', v)} placeholder="postgresql+psycopg2://user:pass@host:5432/db" />
          </Field>
          <Field label="SQL" required={isRequired('query')}>
            <textarea
              value={String(config.query ?? 'select * from your_table limit 1000')}
              onChange={(e) => set('query', e.target.value)}
              rows={5}
              className="w-full resize-none bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-lg px-2.5 py-2 text-[11px] font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-primary/50 transition-colors"
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="DB type" required={isRequired('db_type')}>
            <Select value={String(config.db_type ?? 'postgresql')} onChange={(v) => set('db_type', v)} options={['postgresql', 'mysql', 'sqlite']} />
          </Field>
          <Field label="Host" required={isRequired('host')}>
            <TextInput value={String(config.host ?? 'localhost')} onChange={(v) => set('host', v)} />
          </Field>
          <Field label="Port" required={isRequired('port')}>
            <NumberInput value={Number(config.port ?? 5432)} onChange={(v) => set('port', v)} min={1} />
          </Field>
          <Field label="Database" required={isRequired('database')}>
            <TextInput value={String(config.database ?? '')} onChange={(v) => set('database', v)} />
          </Field>
          <Field label="Username" required={isRequired('username')}>
            <TextInput value={String(config.username ?? '')} onChange={(v) => set('username', v)} />
          </Field>
          <Field label="Password" required={isRequired('password')}>
            <input
              type="password"
              value={String(config.password ?? '')}
              onChange={(e) => set('password', e.target.value)}
              className="w-full bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--color-text-primary)] focus:outline-none focus:border-primary/50 transition-colors"
            />
          </Field>
          <Field label="SQL" required={isRequired('query')}>
            <textarea
              value={String(config.query ?? 'select * from your_table limit 1000')}
              onChange={(e) => set('query', e.target.value)}
              rows={5}
              className="w-full resize-none bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-lg px-2.5 py-2 text-[11px] font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-primary/50 transition-colors"
            />
          </Field>
        </>
      )}

      <Field label={tr ? 'Satır limiti' : 'Row limit'} required={isRequired('row_limit')}>
        <NumberInput value={Number(config.row_limit ?? 10000)} onChange={(v) => set('row_limit', v)} step={1000} min={1} />
      </Field>
    </div>
  )
}

// ── File Upload sub-component ─────────────────────────────────────────────────

function FileUploadConfig({
  nodeId,
  config,
  set,
}: {
  nodeId: string
  config: Record<string, unknown>
  set: (k: string, v: unknown) => void
}) {
  const { updateNodeData } = useFlowStore()
  const { saveNow } = useWorkflowSave()
  const navigate = useNavigate()
  const { activeWorkspaceId, activeProjectId } = useWorkspace()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const toastId = toast.loading(`Uploading ${file.name}…`)
    try {
      const result = await filesApi.upload(file, undefined, activeWorkspaceId, activeProjectId)
      // Set all config keys atomically in a single call to avoid overwrites
      updateNodeData(nodeId, {
        config: {
          ...config,
          storage_path: result.storage_path,
          file_id: result.file_id,
          filename: result.filename,
          file_type: result.filename.split('.').pop()?.toLowerCase() ?? 'csv',
        },
        filename: result.filename,
        fileId: result.file_id,
        storagePath: result.storage_path,
        columns: result.columns,
        resultPreview: {
          row_count: result.row_count,
          column_count: result.column_count,
          preview: result.preview?.slice(0, 5) ?? [],
        },
      })
      toast.success(`Uploaded: ${result.filename} (${result.row_count} rows)`, { id: toastId })
      // Small delay to let React state settle before saving
      setTimeout(() => saveNow(), 100)
    } catch (error) {
      toast.error(friendlyError(error), { id: toastId })
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-[11px] text-[var(--color-text-muted)] font-medium mb-1.5">Upload Dataset</label>
      <input
        type="file"
        accept=".csv,.xlsx,.xls,.parquet"
        onChange={handleFile}
        className="block w-full text-[11px] text-[var(--color-text-muted)] file:mr-2 file:py-1 file:px-3
          file:rounded-md file:border-0 file:text-[11px] file:font-medium
          file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-hover)] cursor-pointer"
      />
      {Boolean(config.filename) && (
        <div className="space-y-2">
          <div className="text-[11px] text-success truncate">{String(config.filename)}</div>
          <div className="rounded-lg border border-success/20 bg-success/10 p-2 text-[11px] text-[var(--color-text-secondary)]">
            <div className="flex items-center justify-between gap-2">
              <span>Uploaded</span>
              <span>{String(config.file_type || '').toUpperCase()}</span>
            </div>
            {Boolean(config.file_id) && (
              <button
                onClick={() => navigate(`/datasets/${String(config.file_id)}`)}
                className="mt-2 w-full h-7 rounded-md bg-primary/10 text-[var(--color-primary)] font-medium hover:bg-primary/15"
              >
                Preview Dataset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Export Output sub-component ───────────────────────────────────────────────

function ExportOutputConfig({
  nodeId,
  config,
  set,
  data,
}: {
  nodeId: string
  config: Record<string, unknown>
  set: (k: string, v: unknown) => void
  data: NodeData
}) {
  const { lang } = useI18n()
  const tr = lang === 'tr'
  const fieldReqs = FIELD_REQUIREMENTS['export_output'] ?? {}
  const isRequired = (fieldKey: string): boolean | undefined => {
    if (fieldKey in fieldReqs) return fieldReqs[fieldKey]
    return undefined
  }

  const downloadUrl = (data.resultPreview as Record<string, unknown> | undefined)?.download_url as string | undefined

  const handleDownload = () => {
    if (!downloadUrl) return
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${String(config.filename || 'output')}.${String(config.format || 'xlsx')}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-primary/10 border border-primary/15 px-3 py-2 text-[10.5px] leading-relaxed text-[var(--color-text-secondary)]">
        {tr
          ? 'Üst akış verilerini Excel, CSV veya JSON formatında dışa aktarır. Çalıştırma sonrası dosyayı indirebilirsiniz.'
          : 'Exports upstream data to Excel, CSV, or JSON. Download the file after execution.'}
      </div>

      <Field label={tr ? 'Format' : 'Format'} required={isRequired('format')}>
        <Select
          value={String(config.format ?? 'xlsx')}
          onChange={(v) => set('format', v)}
          options={['xlsx', 'csv', 'json']}
        />
      </Field>

      <Field label={tr ? 'Dosya Adı' : 'Filename'} required={isRequired('filename')}>
        <TextInput
          value={String(config.filename ?? 'output')}
          onChange={(v) => set('filename', v)}
          placeholder="output"
        />
      </Field>

      <Field label={tr ? 'Sütunlar' : 'Columns'} required={isRequired('columns')}>
        <TextInput
          value={Array.isArray(config.columns) ? (config.columns as string[]).join(', ') : String(config.columns ?? '')}
          onChange={(v) => set('columns', v.split(',').map((item) => item.trim()).filter(Boolean))}
          placeholder={tr ? 'boş = tüm sütunlar' : 'empty = all columns'}
        />
      </Field>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(config.include_charts)}
            onChange={(e) => set('include_charts', e.target.checked)}
            className="w-3.5 h-3.5 rounded border-[var(--color-border-default)] text-[var(--color-primary)] focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            {tr ? 'Grafikleri dahil et' : 'Include charts'}
            {isRequired('include_charts') === false && <span className="text-[var(--color-text-muted)] opacity-60 ml-1">(optional)</span>}
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(config.include_summary)}
            onChange={(e) => set('include_summary', e.target.checked)}
            className="w-3.5 h-3.5 rounded border-[var(--color-border-default)] text-[var(--color-primary)] focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            {tr ? 'Özet dahil et' : 'Include summary'}
            {isRequired('include_summary') === false && <span className="text-[var(--color-text-muted)] opacity-60 ml-1">(optional)</span>}
          </span>
        </label>
      </div>

      {downloadUrl && (
        <button
          onClick={handleDownload}
          className="w-full h-9 rounded-xl bg-[var(--color-primary)] text-white text-[12px] font-semibold hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center gap-2"
        >
          <span>⬇</span>
          <span>{tr ? 'Dosyayı İndir' : 'Download File'}</span>
        </button>
      )}

      {!downloadUrl && data.status === 'success' && (
        <div className="rounded-xl bg-success/10 border border-success/20 px-3 py-2 text-[10.5px] text-[var(--color-text-secondary)]">
          {tr ? 'Çalıştırma tamamlandı. İndirme bağlantısı bekleniyor...' : 'Execution complete. Waiting for download link...'}
        </div>
      )}
    </div>
  )
}

// ── Shared micro-components ───────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-[var(--color-text-muted)] font-medium mb-1.5">
        {label}
        {required && <span className="text-[#FF453A] ml-0.5">*</span>}
        {required === false && <span className="text-[var(--color-text-muted)] opacity-60 ml-1 font-normal">(optional)</span>}
      </label>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--color-text-primary)] focus:outline-none focus:border-primary/50 transition-colors"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
    />
  )
}

function NumberInput({ value, onChange, step = 1, min, max }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--color-text-primary)] focus:outline-none focus:border-primary/50 transition-colors"
    />
  )
}

function getCategoryIconBg(category?: string): string {
  if (category === 'preparation') return 'bg-[#F5A623]'
  if (category === 'analysis')    return 'bg-[#30D158]'
  if (category === 'big_data') return 'bg-[#00A6A6]'
  if (category === 'utility') return 'bg-[#8E8E93]'
  if (category === 'visualization') return 'bg-[#5E5CE6]'
  if (category === 'ml') return 'bg-[#FF6B6B]'
  if (category === 'output')      return 'bg-[#BF5AF2]'
  return 'bg-[#0071E3]' // source
}

function getIcon(type: string): string {
  const map: Record<string, string> = {
    file_upload: '\u2191', column_type_detection: 'T', missing_value: '\u25cb',
    duplicate_detection: '\u229f', filter_rows: '\u2283', statistics: '\u03c3',
    anomaly_detection: '\u25b3', ccsg_sg_anomaly: 'C', correlation: '\u03c1', distribution: '\u223f',
    chunk_processing: '\u25a4', mapreduce_aggregation: '\u03a3', spark_groupby: 'S', large_dataset_profiler: 'LP',
    route_node: 'R', join_node: '\u22c8',
    time_series: '~', train_test_split: '\u2282', ml_model: '\u25ce',
    dashboard: '\u229e', report: '\u22a1', export_output: '\u2b07', code_sql: '\u2328',
  }
  return map[type] ?? '\u2699'
}

function statusColor(status?: string): string {
  if (status === 'success') return 'text-[#30D158]'
  if (status === 'error')   return 'text-[#FF453A]'
  if (status === 'running') return 'text-[var(--color-primary)]'
  if (status === 'cancelled') return 'text-[#8E8E93]'
  return 'text-[var(--color-text-muted)]'
}

// ── Code SQL sub-component ────────────────────────────────────────────────────

function CodeSQLConfig({
  nodeId,
  config,
  set,
  edges,
  nodes,
}: {
  nodeId: string
  config: Record<string, unknown>
  set: (k: string, v: unknown) => void
  edges: Edge[]
  nodes: Node<NodeData>[]
}) {
  const { lang } = useI18n()
  const tr = lang === 'tr'
  const [sqlError, setSqlError] = useState<string | null>(null)
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: unknown[][] } | null>(null)
  const [running, setRunning] = useState(false)

  const fieldReqs = FIELD_REQUIREMENTS['code_sql'] ?? {}
  const isRequired = (fieldKey: string): boolean | undefined => {
    if (fieldKey in fieldReqs) return fieldReqs[fieldKey]
    return undefined
  }

  // Get upstream nodes connected to this node
  const upstreamNodes = edges
    .filter((e) => e.target === nodeId)
    .map((e) => nodes.find((n) => n.id === e.source))
    .filter(Boolean) as Node<NodeData>[]

  const handleRun = async () => {
    const query = String(config.query ?? '').trim()
    if (!query) {
      setSqlError(tr ? 'SQL sorgusu boş olamaz.' : 'SQL query cannot be empty.')
      return
    }

    // Client-side security check
    const blocked = ['DROP', 'DELETE', 'ALTER', 'INSERT', 'UPDATE', 'CREATE', 'TRUNCATE']
    const upperQuery = query.toUpperCase()
    const hasBlocked = blocked.some((kw) => upperQuery.includes(kw))
    if (hasBlocked) {
      setSqlError(tr ? 'Güvenlik hatası: Yalnızca SELECT ve WITH (CTE) ifadelerine izin verilir.' : 'Security error: Only SELECT and WITH (CTE) statements are allowed.')
      setQueryResult(null)
      return
    }

    setRunning(true)
    setSqlError(null)
    setQueryResult(null)

    try {
      // Simulate execution — actual backend call will be implemented in task 7.2
      // For now, show a placeholder indicating the query would be executed
      setSqlError(null)
      setQueryResult(null)
      // The actual execution will be triggered through the workflow execution engine
      toast.success(tr ? 'Sorgu çalıştırma isteği gönderildi' : 'Query execution requested')
    } catch (err) {
      setSqlError(String(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-[#8E8E93]/10 border border-[#8E8E93]/15 px-3 py-2 text-[10.5px] leading-relaxed text-[var(--color-text-secondary)]">
        {tr
          ? 'Üst akış verilerine SQL sorgusu yazın. Veri "input_data" tablosu olarak erişilebilir. Yalnızca SELECT ve WITH ifadelerine izin verilir.'
          : 'Write SQL queries against upstream data. Data is accessible as the "input_data" table. Only SELECT and WITH statements are allowed.'}
      </div>

      {/* Input dataset selector */}
      <Field label={tr ? 'Giriş Veri Seti' : 'Input Dataset'} required={isRequired('input_node')}>
        <select
          value={String(config.input_node ?? '')}
          onChange={(e) => set('input_node', e.target.value)}
          className="w-full bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--color-text-primary)] focus:outline-none focus:border-primary/50 transition-colors"
        >
          <option value="">{tr ? 'Otomatik (bağlı node)' : 'Auto (connected node)'}</option>
          {upstreamNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {(n.data as NodeData).label}
            </option>
          ))}
        </select>
      </Field>

      {/* SQL query textarea with monospace font and dark background */}
      <Field label="SQL Query" required={isRequired('query')}>
        <div className="relative">
          <textarea
            value={String(config.query ?? 'SELECT * FROM input_data LIMIT 100')}
            onChange={(e) => {
              set('query', e.target.value)
              setSqlError(null)
            }}
            rows={8}
            spellCheck={false}
            placeholder="SELECT * FROM input_data LIMIT 100"
            className="w-full resize-y bg-[#1C1C1E] dark:bg-[#0D0D0F] border border-[var(--color-border-default)] rounded-lg px-3 py-2.5 text-[11px] font-mono text-[#E5E5EA] placeholder-[#636366] focus:outline-none focus:border-primary/50 transition-colors leading-relaxed"
          />
          <span className="absolute top-2 right-2 text-[9px] font-mono text-[#636366] uppercase tracking-wider">SQL</span>
        </div>
      </Field>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={running}
        className="w-full h-9 rounded-xl bg-[var(--color-primary)] text-white text-[12px] font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {running ? (
          <>
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {tr ? 'Çalışıyor...' : 'Running...'}
          </>
        ) : (
          <>
            <span>▶</span>
            {tr ? 'Sorguyu Çalıştır' : 'Run Query'}
          </>
        )}
      </button>

      {/* Error display */}
      {sqlError && (
        <div className="rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/20 px-3 py-2">
          <p className="text-[10.5px] font-medium text-[#FF453A] leading-relaxed">{sqlError}</p>
        </div>
      )}

      {/* Results preview table */}
      {queryResult && queryResult.columns.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border-subtle)] overflow-hidden">
          <div className="px-3 py-1.5 bg-[var(--color-secondary)] border-b border-[var(--color-border-subtle)]">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
              {tr ? 'Sonuç Önizleme' : 'Results Preview'}
            </p>
          </div>
          <div className="overflow-x-auto max-h-[160px] overflow-y-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="bg-[var(--color-secondary)]">
                  {queryResult.columns.map((col) => (
                    <th key={col} className="px-2 py-1 text-left text-[var(--color-text-muted)] font-semibold border-b border-[var(--color-border-subtle)] whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryResult.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-[var(--color-border-subtle)] last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {cell == null ? <span className="text-[var(--color-text-muted)] italic">null</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function getSuggestions(type: string, hasOutgoing: boolean) {
  const definitions = new Map(NODE_DEFINITIONS.map((definition) => [definition.type, definition]))
  const typesBySource: Record<string, { type: string; reason: string }[]> = {
    file_upload: [
      { type: 'route_node', reason: 'Collect branches before the next stage' },
      { type: 'missing_value', reason: 'Clean null values before analysis' },
      { type: 'statistics', reason: 'Profile numeric columns quickly' },
      { type: 'ccsg_sg_anomaly', reason: 'Apply conformal copula surprise' },
      { type: 'large_dataset_profiler', reason: 'Profile scale before deeper analysis' },
      { type: 'chunk_processing', reason: 'Process the dataset in chunks' },
      { type: 'distribution', reason: 'Inspect column shapes visually' },
      { type: 'train_test_split', reason: 'Prepare data for machine learning' },
    ],
    missing_value: [
      { type: 'statistics', reason: 'Measure the cleaned dataset' },
      { type: 'anomaly_detection', reason: 'Find outliers after imputation' },
      { type: 'ccsg_sg_anomaly', reason: 'Score stable copula surprise' },
      { type: 'correlation', reason: 'Check numeric relationships' },
    ],
    statistics: [
      { type: 'route_node', reason: 'Bundle this result with other branches' },
      { type: 'bar_chart', reason: 'Visualize summary metrics' },
      { type: 'dashboard', reason: 'Turn metrics into a dashboard' },
      { type: 'report', reason: 'Capture findings in a report' },
      { type: 'export_output', reason: 'Export data to file' },
    ],
    anomaly_detection: [
      { type: 'dashboard', reason: 'Visualize outlier findings' },
      { type: 'report', reason: 'Document anomaly results' },
    ],
    ccsg_sg_anomaly: [
      { type: 'dashboard', reason: 'Visualize CCSG-SG scores' },
      { type: 'report', reason: 'Document CCSG-SG findings' },
    ],
    correlation: [
      { type: 'dashboard', reason: 'Show relationships in one view' },
      { type: 'report', reason: 'Document strong pairs' },
    ],
    distribution: [
      { type: 'histogram', reason: 'Add distribution chart panel' },
      { type: 'dashboard', reason: 'Visualize distributions' },
      { type: 'report', reason: 'Document normality and shape' },
    ],
    chunk_processing: [
      { type: 'mapreduce_aggregation', reason: 'Aggregate chunk outputs' },
      { type: 'dashboard', reason: 'Show processing metrics' },
      { type: 'report', reason: 'Document chunk execution' },
    ],
    mapreduce_aggregation: [
      { type: 'spark_groupby', reason: 'Compare with Spark-like grouping' },
      { type: 'dashboard', reason: 'Visualize aggregate results' },
      { type: 'report', reason: 'Document MapReduce summary' },
    ],
    spark_groupby: [
      { type: 'dashboard', reason: 'Show grouped output metrics' },
      { type: 'report', reason: 'Document groupBy result' },
    ],
    large_dataset_profiler: [
      { type: 'dashboard', reason: 'Turn profile into dashboard panels' },
      { type: 'report', reason: 'Document dataset profile' },
    ],
    route_node: [
      { type: 'dashboard', reason: 'Send bundled outputs to a dashboard' },
      { type: 'report', reason: 'Send bundled outputs to a report' },
    ],
    train_test_split: [
      { type: 'ml_model', reason: 'Train a model on this split' },
    ],
    ml_model: [
      { type: 'dashboard', reason: 'Show model metrics' },
      { type: 'report', reason: 'Document model performance' },
      { type: 'export_output', reason: 'Export predictions to file' },
    ],
    report: [],
  }

  return (typesBySource[type] ?? [])
    .filter((suggestion) => !(hasOutgoing && ['dashboard', 'report'].includes(suggestion.type)))
    .map((suggestion) => {
      const def = definitions.get(suggestion.type)
      return {
        ...suggestion,
        label: def?.label ?? suggestion.type,
        icon: def?.icon ?? '+',
        color: getCategoryIconBg(def?.category),
      }
    })
}
