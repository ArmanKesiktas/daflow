import { useState } from 'react'
import { useFlowStore } from '../../store/flowStore'
import { useExecutionStore } from '../../store/executionStore'
import { filesApi } from '../../api/executions'
import toast from 'react-hot-toast'
import type { NodeData, ColumnMeta } from '../../types/workflow'
import { useWorkflowSave } from '../../hooks/useWorkflowSave'
import { useI18n } from '../../i18n'

// ── Upstream column resolver ──────────────────────────────────────────────────

function useUpstreamColumns(nodeId: string | null): ColumnMeta[] {
  const { nodes, edges } = useFlowStore()
  if (!nodeId) return []
  const visited = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    const node = nodes.find((n) => n.id === current)
    if (node?.type === 'file_upload' || node?.type === 'database_query') {
      return (node.data.columns as ColumnMeta[]) ?? []
    }
    for (const edge of edges) {
      if (edge.target === current && !visited.has(edge.source)) queue.push(edge.source)
    }
  }
  return []
}

interface ConfigPanelProps {
  nodeId: string | null
  collapsed?: boolean
  onToggle?: () => void
}

// ── Help content for every node ────────────────────────────────────────────────

interface OptionHelp { name: string; description: string }
interface NodeHelp {
  concept: string
  description: string
  options?: OptionHelp[]
}

const HELP_CONTENT: Record<string, NodeHelp> = {
  database_query: {
    concept: 'Database Query',
    description:
      'Connects to a relational database and executes a SQL query, returning the result as a DataFrame for downstream analysis. Supports PostgreSQL, MySQL, and SQLite. Credentials are stored in the workflow config — use a read-only database user in production.',
    options: [
      { name: 'Database Type', description: 'postgresql — via psycopg2 driver. mysql — via pymysql driver. sqlite — local file, no credentials needed.' },
      { name: 'Connection Mode', description: '"Fields" lets you fill in host, port, username, and password individually. "Connection String" accepts a full SQLAlchemy URL like postgresql://user:pass@host:5432/db.' },
      { name: 'SQL Query', description: 'Any valid SELECT statement. Always include a LIMIT clause to avoid fetching millions of rows. The row_limit setting acts as a hard cap on top of your query.' },
      { name: 'Row Limit', description: 'Maximum rows returned by this node regardless of what the query returns. Default is 10 000.' },
      { name: 'SSH Tunnel', description: 'Enable when the database is behind a firewall or private network. The app connects to an SSH jump host first, then tunnels through to the database. Use either SSH Password or a PEM-encoded Private Key — not both.' },
    ],
  },
  file_upload: {
    concept: 'File Upload',
    description:
      'The entry point of every workflow. Upload a structured dataset (CSV, Excel, or Parquet) to make it available to downstream nodes. The file is stored temporarily on the server and referenced by a unique ID.',
    options: [
      { name: 'Accepted formats', description: '.csv, .xlsx, .xls, .parquet — tabular data files with a header row.' },
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
      'Identifies data points that deviate significantly from the rest of the dataset. Anomalies can indicate data entry errors, fraud, sensor failures, or genuinely rare events. Four algorithms are available — choose based on your data distribution and dimensionality.',
    options: [
      {
        name: 'IQR — Interquartile Range',
        description:
          'Non-parametric method. Computes fences from quartiles and flags values outside them.\n\n' +
          'IQR = Q₃ − Q₁\n' +
          'Lower fence: L = Q₁ − k · IQR\n' +
          'Upper fence: U = Q₃ + k · IQR\n' +
          'Anomaly if: xᵢ < L  or  xᵢ > U\n\n' +
          'Score = max(L − xᵢ, xᵢ − U, 0) / IQR\n\n' +
          'k = 1.5 (standard Tukey inner fence). No normality assumption. Fast: O(n log n).',
      },
      {
        name: 'Z-Score',
        description:
          'Parametric method. Standardises each value relative to the column mean and standard deviation.\n\n' +
          'zᵢ = (xᵢ − x̄) / s\n' +
          'Anomaly if: |zᵢ| > θ   (default θ = 3.0)\n\n' +
          'Under a normal distribution, |z| > 3 captures only ~0.27% of data. Sensitive to outliers distorting x̄ and s — use Modified Z-Score when outliers are already present.',
      },
      {
        name: 'Modified Z-Score (MAD)',
        description:
          'Robust variant. Replaces mean/std with median and Median Absolute Deviation (MAD), which are not influenced by existing outliers.\n\n' +
          'MAD = median(|xᵢ − x̃|)\n' +
          'Mᵢ = 0.6745 · |xᵢ − x̃| / MAD\n' +
          'Anomaly if: Mᵢ > θ   (default θ = 3.5)\n\n' +
          'Constant 0.6745 = Φ⁻¹(0.75): the 75th percentile of the standard normal, making MAD comparable to std for Gaussian data. Recommended over plain Z-Score when data may already contain outliers.',
      },
      {
        name: 'Isolation Forest',
        description:
          'Ensemble ML method. Anomalies are isolated faster (shorter paths in random trees) than normal points.\n\n' +
          'Anomaly score:  s(x, n) = 2^(−E[h(x)] / c(n))\n' +
          'where E[h(x)] = average path length across T trees\n' +
          'c(n) = 2·H(n−1) − 2(n−1)/n   (normaliser)\n' +
          'H(k) = ln(k) + 0.5772…   (harmonic number)\n\n' +
          's → 1: very short path → anomaly\n' +
          's → 0: long path → normal point\n' +
          's ≈ 0.5: indeterminate\n\n' +
          'Best for high-dimensional or non-linear data. Complexity: O(T · n log n).',
      },
      {
        name: 'IQR Multiplier (k)',
        description: 'Controls IQR fence width. k = 1.5 is the standard Tukey inner fence. k = 3.0 is the outer fence (only extreme outliers). Lower k → stricter detection.',
      },
      {
        name: 'Z-Score Threshold (θ)',
        description: 'Cut-off for Z-Score and Modified Z-Score. Default 3.0 / 3.5. Reduce to catch subtle anomalies; increase to flag only extreme deviations.',
      },
      {
        name: 'Contamination',
        description: 'Expected fraction of anomalies in the dataset (0–0.5), used by Isolation Forest to set the decision threshold. Set close to the true outlier rate for best results.',
      },
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
  report: {
    concept: 'Report Builder',
    description:
      'Aggregates outputs from upstream analysis nodes into a structured, multi-section report. Supports PDF export. Each connected analysis node contributes its own section (statistics, anomalies, correlations, etc.).',
    options: [
      { name: 'Report Title', description: 'The heading displayed at the top of the generated report and in the report list.' },
    ],
  },
  ai_insights: {
    concept: 'AI Insights',
    description:
      'Uses a large language model (Gemini or OpenAI) to write a natural-language interpretation of your data analysis. The AI receives all upstream statistics, anomaly counts, and correlation findings, then produces a structured 6-section report.',
    options: [
      { name: 'AI Provider', description: 'gemini = Google Gemini 2.5 Flash (fast, recommended). openai = GPT-4o (requires OpenAI API key).' },
      { name: 'Report Language', description: 'Language of the generated AI narrative. English produces formal business English; Türkçe produces a Turkish-language report.' },
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
}

export default function ConfigPanel({ nodeId, collapsed = false, onToggle }: ConfigPanelProps) {
  const { nodes, updateNodeData } = useFlowStore()
  const { saveNow } = useWorkflowSave()
  const nodeStatuses = useExecutionStore((s) => s.nodeStatuses)
  const [showHelp, setShowHelp] = useState(false)
  const { t } = useI18n()
  const upstreamColumns = useUpstreamColumns(nodeId)

  // ── Collapsed: icon-only strip ────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="w-10 bg-[#F5F5F7] dark:bg-[#111113] border-l border-black/[0.07] dark:border-white/[0.07] flex flex-col items-center py-2 flex-shrink-0 transition-all duration-200">
        <button
          onClick={onToggle}
          title="Expand options"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1d1d1f]/30 dark:text-white/30 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
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
      <aside className="w-64 bg-[#F5F5F7] dark:bg-[#111113] border-l border-black/[0.07] dark:border-white/[0.07] flex flex-col flex-shrink-0 transition-all duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <p className="text-[10px] font-semibold text-[#1d1d1f]/30 dark:text-white/30 uppercase tracking-widest">{t('options') ?? 'Options'}</p>
          <button
            onClick={onToggle}
            title="Collapse panel"
            className="w-5 h-5 rounded flex items-center justify-center text-[#1d1d1f]/25 dark:text-white/25 hover:text-[#1d1d1f]/70 dark:hover:text-white/70 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <span className="text-4xl opacity-10">⚙</span>
          <p className="text-[#1d1d1f]/25 dark:text-white/25 text-[12px]">{t('selectNode')}</p>
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

  return (
    <aside className="w-64 bg-[#F5F5F7] dark:bg-[#111113] border-l border-black/[0.07] dark:border-white/[0.07] overflow-y-auto flex-shrink-0 flex flex-col transition-all duration-200">
      <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2.5">
        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 ${categoryColor}`}>
          {getIcon(node.type || '')}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-medium text-[#1d1d1f] dark:text-white truncate">{data.label}</h2>
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
                ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                : 'bg-black/[0.07] dark:bg-white/[0.08] text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.12] dark:hover:bg-white/[0.14]'
            }`}
          >
            ?
          </button>
        )}
        <button
          onClick={onToggle}
          title="Collapse panel"
          className="w-5 h-5 rounded flex items-center justify-center text-[#1d1d1f]/25 dark:text-white/25 hover:text-[#1d1d1f]/70 dark:hover:text-white/70 transition-colors flex-shrink-0"
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
            <h3 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white mb-1.5">{help.concept}</h3>
            <p className="text-[11px] text-[#1d1d1f]/60 dark:text-white/55 leading-relaxed">{help.description}</p>
          </div>
          {help.options && help.options.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold text-[#1d1d1f]/30 dark:text-white/30 uppercase tracking-widest">{t('options')}</p>
              {help.options.map((opt) => (
                <div key={opt.name} className="rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-[#1d1d1f]/80 dark:text-white/80 mb-1">{opt.name}</p>
                  <p className="text-[10.5px] text-[#1d1d1f]/50 dark:text-white/45 leading-relaxed">{opt.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className="p-4 space-y-4">
        {/* ── File Upload Config ─────────────────────────── */}
        {node.type === 'file_upload' && (
          <FileUploadConfig nodeId={nodeId!} config={config} set={set} />
        )}

        {/* ── Database Query Config ──────────────────────── */}
        {node.type === 'database_query' && (
          <>
            <Field label="Database Type">
              <Select
                value={String(config.db_type ?? 'postgresql')}
                onChange={(v) => { set('db_type', v); if (v === 'postgresql') set('port', 5432); if (v === 'mysql') set('port', 3306) }}
                options={['postgresql', 'mysql', 'sqlite']}
              />
            </Field>
            <Field label="Connection Mode">
              <Select
                value={String(config.connection_mode ?? 'fields')}
                onChange={(v) => set('connection_mode', v)}
                options={['fields', 'connection_string']}
              />
            </Field>
            {config.connection_mode === 'connection_string' ? (
              <Field label="Connection URL">
                <TextInput
                  value={String(config.connection_string ?? '')}
                  onChange={(v) => set('connection_string', v)}
                  placeholder="postgresql://user:pass@host:5432/db"
                />
              </Field>
            ) : (
              <>
                {config.db_type !== 'sqlite' && (
                  <>
                    <Field label="Host">
                      <TextInput value={String(config.host ?? 'localhost')} onChange={(v) => set('host', v)} placeholder="localhost" />
                    </Field>
                    <Field label="Port">
                      <NumberInput value={Number(config.port ?? 5432)} onChange={(v) => set('port', v)} step={1} min={1} max={65535} />
                    </Field>
                    <Field label="Username">
                      <TextInput value={String(config.username ?? '')} onChange={(v) => set('username', v)} placeholder="postgres" />
                    </Field>
                    <Field label="Password">
                      <TextInput value={String(config.password ?? '')} onChange={(v) => set('password', v)} placeholder="••••••••" />
                    </Field>
                  </>
                )}
                <Field label={config.db_type === 'sqlite' ? 'File Path' : 'Database'}>
                  <TextInput
                    value={String(config.database ?? '')}
                    onChange={(v) => set('database', v)}
                    placeholder={config.db_type === 'sqlite' ? '/path/to/file.db' : 'database_name'}
                  />
                </Field>
              </>
            )}
            <Field label="SQL Query">
              <textarea
                value={String(config.query ?? '')}
                onChange={(e) => set('query', e.target.value)}
                rows={5}
                placeholder="SELECT * FROM table_name LIMIT 1000"
                className="w-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-2 text-[11px] font-mono text-[#1d1d1f]/80 dark:text-white/80 placeholder-[#1d1d1f]/25 dark:placeholder-white/25 resize-none focus:outline-none focus:border-[#0071E3]/50 transition-colors"
              />
            </Field>
            <Field label="Row Limit">
              <NumberInput value={Number(config.row_limit ?? 10000)} onChange={(v) => set('row_limit', v)} step={1000} min={100} max={1000000} />
            </Field>

            {/* ── SSH Tunnel ──────────────────────────────────── */}
            <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-3 mt-1">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={Boolean(config.use_ssh_tunnel)}
                  onChange={(e) => set('use_ssh_tunnel', e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                />
                <span className="text-[11px] font-semibold text-[#1d1d1f]/70 dark:text-white/70">SSH Tunnel</span>
                <span className="text-[10px] text-[#1d1d1f]/30 dark:text-white/30">firewall / private network</span>
              </label>
              {config.use_ssh_tunnel && (
                <div className="space-y-3 pl-1">
                  <Field label="SSH Host">
                    <TextInput value={String(config.ssh_host ?? '')} onChange={(v) => set('ssh_host', v)} placeholder="jump.example.com" />
                  </Field>
                  <Field label="SSH Port">
                    <NumberInput value={Number(config.ssh_port ?? 22)} onChange={(v) => set('ssh_port', v)} step={1} min={1} max={65535} />
                  </Field>
                  <Field label="SSH Username">
                    <TextInput value={String(config.ssh_user ?? '')} onChange={(v) => set('ssh_user', v)} placeholder="ubuntu" />
                  </Field>
                  <Field label="SSH Password">
                    <TextInput value={String(config.ssh_password ?? '')} onChange={(v) => set('ssh_password', v)} placeholder="leave empty if using key" />
                  </Field>
                  <Field label="Private Key (PEM)">
                    <textarea
                      value={String(config.ssh_private_key ?? '')}
                      onChange={(e) => set('ssh_private_key', e.target.value)}
                      rows={4}
                      placeholder={'-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----'}
                      className="w-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-2 text-[10px] font-mono text-[#1d1d1f]/70 dark:text-white/70 placeholder-[#1d1d1f]/20 dark:placeholder-white/20 resize-none focus:outline-none focus:border-[#0071E3]/50 transition-colors"
                    />
                  </Field>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Normalize Config ─────────────────────────────── */}
        {node.type === 'normalize' && (
          <>
            <Field label="Method">
              <Select value={String(config.method ?? 'minmax')} onChange={(v) => set('method', v)}
                options={['minmax', 'zscore', 'robust']} />
            </Field>
            {upstreamColumns.length > 0 && (
              <Field label="Columns">
                <ColumnPicker columns={upstreamColumns.filter(c => c.type?.includes('int') || c.type?.includes('float') || c.type === 'number')} selected={(config.columns as string[]) ?? []} onChange={(v) => set('columns', v)} />
              </Field>
            )}
          </>
        )}

        {/* ── Encode Config ────────────────────────────────── */}
        {node.type === 'encode' && (
          <>
            <Field label="Method">
              <Select value={String(config.method ?? 'label')} onChange={(v) => set('method', v)}
                options={['label', 'onehot', 'ordinal']} />
            </Field>
            {upstreamColumns.length > 0 && (
              <Field label="Columns">
                <ColumnPicker columns={upstreamColumns} selected={(config.columns as string[]) ?? []} onChange={(v) => set('columns', v)} />
              </Field>
            )}
          </>
        )}

        {/* ── Pivot Config ─────────────────────────────────── */}
        {node.type === 'pivot' && (
          <>
            <Field label="Index (row labels)">
              <ColumnSelect columns={upstreamColumns} value={String(config.index ?? '')} onChange={(v) => set('index', v)} placeholder="Select column" />
            </Field>
            <Field label="Columns (headers)">
              <ColumnSelect columns={upstreamColumns} value={String(config.columns ?? '')} onChange={(v) => set('columns', v)} placeholder="Select column" />
            </Field>
            <Field label="Values">
              <ColumnSelect columns={upstreamColumns} value={String(config.values ?? '')} onChange={(v) => set('values', v)} placeholder="Select column" />
            </Field>
            <Field label="Aggregation">
              <Select value={String(config.aggfunc ?? 'mean')} onChange={(v) => set('aggfunc', v)}
                options={['mean', 'sum', 'count', 'min', 'max']} />
            </Field>
          </>
        )}

        {/* ── Anomaly Detection Config ──────────────────── */}
        {node.type === 'anomaly_detection' && (
          <>
            {upstreamColumns.length > 0 && (
              <Field label="Columns">
                <ColumnPicker columns={upstreamColumns} selected={(config.columns as string[]) ?? []} onChange={(v) => set('columns', v)} />
              </Field>
            )}
            <Field label={t('method')}>
              <Select value={String(config.method ?? 'iqr')} onChange={(v) => set('method', v)}
                options={['iqr', 'zscore', 'modified_zscore', 'isolation_forest']} />
            </Field>
            {(config.method === 'iqr' || !config.method) && (
              <Field label={t('iqrMultiplier')}>
                <NumberInput value={Number(config.iqr_multiplier ?? 1.5)} onChange={(v) => set('iqr_multiplier', v)} step={0.5} />
              </Field>
            )}
            {config.method === 'zscore' && (
              <Field label={t('zscoreThreshold')}>
                <NumberInput value={Number(config.zscore_threshold ?? 3.0)} onChange={(v) => set('zscore_threshold', v)} step={0.5} />
              </Field>
            )}
            {config.method === 'isolation_forest' && (
              <Field label={t('contamination')}>
                <NumberInput value={Number(config.contamination ?? 0.05)} onChange={(v) => set('contamination', v)} step={0.01} min={0.01} max={0.5} />
              </Field>
            )}
          </>
        )}

        {/* ── Missing Value Config ─────────────────────── */}
        {node.type === 'missing_value' && (
          <>
            {upstreamColumns.length > 0 && (
              <Field label="Columns">
                <ColumnPicker columns={upstreamColumns} selected={(config.columns as string[]) ?? []} onChange={(v) => set('columns', v)} />
              </Field>
            )}
            <Field label={t('strategy')}>
              <Select value={String(config.strategy ?? 'report_only')} onChange={(v) => set('strategy', v)}
                options={['report_only', 'drop_rows', 'fill_mean', 'fill_median', 'fill_mode', 'fill_constant']} />
            </Field>
          </>
        )}

        {/* ── Correlation Config ───────────────────────── */}
        {node.type === 'correlation' && (
          <>
            {upstreamColumns.length > 0 && (
              <Field label="Columns">
                <ColumnPicker columns={upstreamColumns} selected={(config.columns as string[]) ?? []} onChange={(v) => set('columns', v)} />
              </Field>
            )}
            <Field label={t('method')}>
              <Select value={String(config.method ?? 'pearson')} onChange={(v) => set('method', v)}
                options={['pearson', 'spearman', 'kendall']} />
            </Field>
            <Field label={t('strongCorrelationThreshold')}>
              <NumberInput value={Number(config.threshold ?? 0.7)} onChange={(v) => set('threshold', v)} step={0.05} min={0.1} max={1.0} />
            </Field>
          </>
        )}

        {/* ── Filter Rows Config ──────────────────────── */}
        {node.type === 'filter_rows' && (
          <>
            <Field label={t('columnName')}>
              <ColumnSelect columns={upstreamColumns} value={String(config.column ?? '')} onChange={(v) => set('column', v)} placeholder="Select column" />
            </Field>
            <Field label={t('operator')}>
              <Select value={String(config.operator ?? '==')} onChange={(v) => set('operator', v)}
                options={['==', '!=', '>', '>=', '<', '<=', 'contains', 'not_contains', 'isnull', 'notnull']} />
            </Field>
            <Field label={t('value')}>
              <TextInput value={String(config.value ?? '')} onChange={(v) => set('value', v)} placeholder="comparison value" />
            </Field>
          </>
        )}

        {/* ── Report Config ───────────────────────────── */}
        {node.type === 'report' && (
          <Field label={t('reportTitle')}>
            <TextInput value={String(config.title ?? 'Data Analysis Report')} onChange={(v) => set('title', v)} />
          </Field>
        )}

        {/* ── AI Insights Config ──────────────────────── */}
        {node.type === 'ai_insights' && (
          <>
            <Field label={t('aiProvider')}>
              <Select value={String(config.provider ?? 'gemini')} onChange={(v) => set('provider', v)}
                options={['gemini', 'openai']} />
            </Field>
            <Field label={t('reportLanguage')}>
              <div className="flex rounded-lg overflow-hidden border border-black/[0.10] dark:border-white/[0.10]">
                {(['English', 'Turkish'] as const).map((lang) => {
                  const current = String(config.language ?? 'English')
                  const active = current === lang
                  return (
                    <button
                      key={lang}
                      onClick={() => set('language', lang)}
                      className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                          : 'bg-transparent text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      {lang === 'English' ? '🇬🇧 English' : '🇹🇷 Türkçe'}
                    </button>
                  )
                })}
              </div>
            </Field>
          </>
        )}

        {/* ── Dashboard Config ────────────────────────── */}
        {node.type === 'dashboard' && (
          <>
            <Field label={t('dashboardTitle')}>
              <TextInput value={String(config.title ?? 'Analysis Dashboard')} onChange={(v) => set('title', v)} />
            </Field>
            <Field label={t('dashboardPanels') ?? 'Dashboard Panels'}>
              <div className="space-y-1">
                {([
                  { id: 'kpi_grid',               icon: 'σ', label: 'Descriptive Statistics' },
                  { id: 'anomaly_summary',        icon: '△', label: 'Anomaly Detection' },
                  { id: 'missing_values',         icon: '○', label: 'Missing Values' },
                  { id: 'correlation_heatmap',    icon: 'ρ', label: 'Correlation Heatmap' },
                  { id: 'distribution_histogram', icon: '∿', label: 'Distribution' },
                  { id: 'duplicate_summary',      icon: '⊟', label: 'Duplicate Detection' },
                  { id: 'column_types',           icon: 'T', label: 'Column Types' },
                ] as const).map((panel) => {
                  const selected: string[] = (config.selected_panels as string[]) ?? []
                  const checked = selected.length === 0 || selected.includes(panel.id)
                  return (
                    <label
                      key={panel.id}
                      className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          let next: string[]
                          if (selected.length === 0) {
                            // First click on any checkbox: select all except this one
                            next = ['kpi_grid', 'anomaly_summary', 'missing_values', 'correlation_heatmap', 'distribution_histogram', 'duplicate_summary', 'column_types'].filter(id => id !== panel.id)
                          } else if (checked) {
                            next = selected.filter(id => id !== panel.id)
                          } else {
                            next = [...selected, panel.id]
                          }
                          // If all are selected, reset to empty (= show all)
                          if (next.length === 7) next = []
                          set('selected_panels', next)
                        }}
                        className="w-3.5 h-3.5 rounded border-black/20 dark:border-white/20 text-[#0071E3] focus:ring-[#0071E3]/30 focus:ring-offset-0"
                      />
                      <span className="text-[11px] text-[#1d1d1f]/70 dark:text-white/70 font-medium">
                        {panel.icon} {panel.label}
                      </span>
                    </label>
                  )
                })}
                <p className="text-[10px] text-[#1d1d1f]/25 dark:text-white/25 mt-1 px-2">
                  {t('selectPanels') ?? 'Uncheck panels to hide them from dashboard'}
                </p>
              </div>
            </Field>
          </>
        )}

        {/* ── Distribution / Statistics ───────────────── */}
        {node.type === 'distribution' && (
          <>
            {upstreamColumns.length > 0 && (
              <Field label="Columns">
                <ColumnPicker columns={upstreamColumns} selected={(config.columns as string[]) ?? []} onChange={(v) => set('columns', v)} />
              </Field>
            )}
            <Field label={t('histogramBins')}>
              <NumberInput value={Number(config.bins ?? 20)} onChange={(v) => set('bins', v)} step={5} min={5} max={100} />
            </Field>
          </>
        )}

        {/* ── Statistics columns ───────────────────────── */}
        {node.type === 'statistics' && upstreamColumns.length > 0 && (
          <Field label="Columns">
            <ColumnPicker columns={upstreamColumns} selected={(config.columns as string[]) ?? []} onChange={(v) => set('columns', v)} />
          </Field>
        )}

        {/* ── Time Series Config ──────────────────────── */}
        {node.type === 'time_series' && (
          <>
            <Field label="Date Column">
              <ColumnSelect columns={upstreamColumns} value={String(config.date_column ?? '')} onChange={(v) => set('date_column', v)} placeholder="Select date column" />
            </Field>
            <Field label="Value Column">
              <ColumnSelect columns={upstreamColumns} value={String(config.value_column ?? '')} onChange={(v) => set('value_column', v)} placeholder="Select value column" />
            </Field>
            <Field label="Rolling Window">
              <NumberInput value={Number(config.window ?? 7)} onChange={(v) => set('window', v)} step={1} min={2} max={365} />
            </Field>
            <Field label="Method">
              <Select value={String(config.method ?? 'rolling')} onChange={(v) => set('method', v)} options={['rolling', 'decompose']} />
            </Field>
            <Field label="Forecast Periods">
              <NumberInput value={Number(config.forecast_periods ?? 0)} onChange={(v) => set('forecast_periods', v)} step={1} min={0} max={365} />
            </Field>
            <Field label="Frequency">
              <Select value={String(config.freq ?? 'auto')} onChange={(v) => set('freq', v)} options={['auto', 'D', 'W', 'M']} />
            </Field>
          </>
        )}

        {/* ── Group By Config ──────────────────────── */}
        {node.type === 'group_by' && (
          <>
            {upstreamColumns.length > 0 && (
              <Field label="Group By Columns">
                <ColumnPicker columns={upstreamColumns} selected={(config.group_columns as string[]) ?? []} onChange={(v) => set('group_columns', v)} />
              </Field>
            )}
            <Field label="Default Aggregation">
              <Select value={String((config.aggregations as Record<string, string>)?._default ?? 'sum')} onChange={(v) => set('aggregations', { ...(config.aggregations as Record<string, string> ?? {}), _default: v })} options={['sum', 'mean', 'count', 'min', 'max', 'std', 'first', 'last']} />
            </Field>
          </>
        )}

        {/* ── Column Ops Config ────────────────────── */}
        {node.type === 'column_ops' && (
          <>
            <Field label="Operation">
              <Select value={String(config.operation ?? 'select')} onChange={(v) => set('operation', v)} options={['select', 'drop', 'rename', 'cast']} />
            </Field>
            {(config.operation === 'select' || config.operation === 'drop') && upstreamColumns.length > 0 && (
              <Field label="Columns">
                <ColumnPicker columns={upstreamColumns} selected={(config.columns as string[]) ?? []} onChange={(v) => set('columns', v)} />
              </Field>
            )}
            {config.operation === 'rename' && (
              <Field label="Rename Map (JSON)">
                <textarea
                  value={typeof config.rename_map === 'object' ? JSON.stringify(config.rename_map, null, 2) : '{}'}
                  onChange={(e) => { try { set('rename_map', JSON.parse(e.target.value)) } catch { /* ignore parse errors while typing */ } }}
                  rows={4}
                  placeholder={'{"old_name": "new_name"}'}
                  className="w-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-2 text-[11px] font-mono text-[#1d1d1f]/80 dark:text-white/80 placeholder-[#1d1d1f]/25 dark:placeholder-white/25 resize-none focus:outline-none focus:border-[#0071E3]/50 transition-colors"
                />
              </Field>
            )}
            {config.operation === 'cast' && (
              <Field label="Cast Map (JSON)">
                <textarea
                  value={typeof config.cast_map === 'object' ? JSON.stringify(config.cast_map, null, 2) : '{}'}
                  onChange={(e) => { try { set('cast_map', JSON.parse(e.target.value)) } catch { /* ignore parse errors while typing */ } }}
                  rows={4}
                  placeholder={'{"col": "float"}'}
                  className="w-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-2 text-[11px] font-mono text-[#1d1d1f]/80 dark:text-white/80 placeholder-[#1d1d1f]/25 dark:placeholder-white/25 resize-none focus:outline-none focus:border-[#0071E3]/50 transition-colors"
                />
              </Field>
            )}
          </>
        )}

        {/* ── Custom Python Config ─────────────────── */}
        {node.type === 'custom_python' && (
          <Field label="Python Code">
            <textarea
              value={String(config.code ?? '# df is available as input\ndf_out = df.copy()\n')}
              onChange={(e) => set('code', e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-2 text-[11px] font-mono text-[#1d1d1f]/80 dark:text-white/80 placeholder-[#1d1d1f]/25 dark:placeholder-white/25 resize-none focus:outline-none focus:border-[#0071E3]/50 transition-colors"
            />
            <p className="text-[10px] text-[#1d1d1f]/30 dark:text-white/30 mt-1">Input: <code>df</code> — Output: assign to <code>df_out</code></p>
          </Field>
        )}

        {/* ── Join Config ──────────────────────────── */}
        {node.type === 'join' && (
          <>
            <Field label="Join Type">
              <Select value={String(config.how ?? 'inner')} onChange={(v) => set('how', v)} options={['inner', 'left', 'right', 'outer']} />
            </Field>
            <Field label="Join Key (same name both sides)">
              <TextInput value={String(config.on ?? '')} onChange={(v) => set('on', v)} placeholder="column_name" />
            </Field>
            <div className="text-[10px] text-[#1d1d1f]/30 dark:text-white/30 text-center">— or use different keys —</div>
            <Field label="Left Key">
              <TextInput value={String(config.left_on ?? '')} onChange={(v) => set('left_on', v)} placeholder="left column" />
            </Field>
            <Field label="Right Key">
              <TextInput value={String(config.right_on ?? '')} onChange={(v) => set('right_on', v)} placeholder="right column" />
            </Field>
          </>
        )}

        {/* ── Train Test Split Config ──────────────── */}
        {node.type === 'train_test_split' && (
          <>
            <Field label="Test Size">
              <NumberInput value={Number(config.test_size ?? 0.2)} onChange={(v) => set('test_size', v)} step={0.05} min={0.05} max={0.5} />
            </Field>
            <Field label="Random State">
              <NumberInput value={Number(config.random_state ?? 42)} onChange={(v) => set('random_state', v)} step={1} min={0} />
            </Field>
            <Field label="Stratify Column (optional)">
              <ColumnSelect columns={upstreamColumns} value={String(config.stratify_column ?? '')} onChange={(v) => set('stratify_column', v)} placeholder="None" />
            </Field>
          </>
        )}

        {/* ── ML Model Config ──────────────────────── */}
        {node.type === 'ml_model' && (
          <>
            <Field label="Task Type">
              <Select value={String(config.task_type ?? 'classification')} onChange={(v) => {
                set('task_type', v)
                set('algorithm', v === 'classification' ? 'random_forest_classifier' : 'random_forest_regressor')
              }} options={['classification', 'regression']} />
            </Field>
            <Field label="Algorithm">
              {config.task_type === 'regression' ? (
                <Select value={String(config.algorithm ?? 'random_forest_regressor')} onChange={(v) => set('algorithm', v)}
                  options={['linear_regression', 'random_forest_regressor', 'gradient_boosting_regressor', 'ridge']} />
              ) : (
                <Select value={String(config.algorithm ?? 'random_forest_classifier')} onChange={(v) => set('algorithm', v)}
                  options={['logistic_regression', 'random_forest_classifier', 'gradient_boosting_classifier', 'svm_classifier']} />
              )}
            </Field>
            <Field label="Target Column">
              <ColumnSelect columns={upstreamColumns} value={String(config.target_column ?? '')} onChange={(v) => set('target_column', v)} placeholder="Select target column" />
            </Field>
            {upstreamColumns.length > 0 && (
              <Field label="Feature Columns">
                <ColumnPicker columns={upstreamColumns} selected={(config.feature_columns as string[]) ?? []} onChange={(v) => set('feature_columns', v)} />
              </Field>
            )}
            <Field label="Random State">
              <NumberInput value={Number(config.random_state ?? 42)} onChange={(v) => set('random_state', v)} step={1} min={0} />
            </Field>
          </>
        )}

        {/* ── Data Export Config ───────────────────── */}
        {node.type === 'data_export' && (
          <>
            <Field label="Format">
              <Select value={String(config.format ?? 'csv')} onChange={(v) => set('format', v)} options={['csv', 'excel', 'json']} />
            </Field>
            <Field label="Filename (no extension)">
              <TextInput value={String(config.filename ?? 'export')} onChange={(v) => set('filename', v)} placeholder="export" />
            </Field>
          </>
        )}

        {/* ── No config nodes ─────────────────────────── */}
        {['statistics', 'duplicate_detection', 'column_type_detection'].includes(node.type ?? '') && upstreamColumns.length === 0 && (
          <div className="text-center py-4">
            <p className="text-[11px] text-[#1d1d1f]/30 dark:text-white/30">{t('noConfigNeeded')}</p>
            {help && (
              <button
                onClick={() => setShowHelp(true)}
                className="mt-2 text-[11px] text-[#007AFF] dark:text-[#0A84FF] hover:underline"
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const toastId = toast.loading(`Uploading ${file.name}…`)
    try {
      const result = await filesApi.upload(file)
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
        resultPreview: { row_count: result.row_count, column_count: result.column_count },
      })
      toast.success(`Uploaded: ${result.filename} (${result.row_count} rows)`, { id: toastId })
      // Small delay to let React state settle before saving
      setTimeout(() => saveNow(), 100)
    } catch {
      toast.error('Upload failed', { id: toastId })
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-[11px] text-[#1d1d1f]/40 dark:text-white/40 font-medium mb-1.5">Upload Dataset</label>
      <input
        type="file"
        accept=".csv,.xlsx,.xls,.parquet"
        onChange={handleFile}
        className="block w-full text-[11px] text-[#1d1d1f]/40 dark:text-white/40 file:mr-2 file:py-1 file:px-3
          file:rounded-md file:border-0 file:text-[11px] file:font-medium
          file:bg-[#0071E3] file:text-white hover:file:bg-[#0077ED] cursor-pointer"
      />
      {Boolean(config.filename) && (
        <div className="text-[11px] text-[#30D158] truncate">{String(config.filename)}</div>
      )}
    </div>
  )
}

// ── Shared micro-components ───────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-[#1d1d1f]/40 dark:text-white/40 font-medium mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12px] text-[#1d1d1f]/80 dark:text-white/80 focus:outline-none focus:border-[#0071E3]/50 transition-colors"
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
      className="w-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12px] text-[#1d1d1f]/80 dark:text-white/80 placeholder-[#1d1d1f]/20 dark:placeholder-white/20 focus:outline-none focus:border-[#0071E3]/50 transition-colors"
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
      className="w-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12px] text-[#1d1d1f]/80 dark:text-white/80 focus:outline-none focus:border-[#0071E3]/50 transition-colors"
    />
  )
}

function getCategoryIconBg(category?: string): string {
  if (category === 'preparation')    return 'bg-[#F5A623]'
  if (category === 'transformation') return 'bg-[#FF9F0A]'
  if (category === 'analysis')       return 'bg-[#30D158]'
  if (category === 'visualization')  return 'bg-[#5E5CE6]'
  if (category === 'ml')             return 'bg-[#FF6B6B]'
  if (category === 'output')         return 'bg-[#BF5AF2]'
  return 'bg-[#0071E3]' // source
}

// ── Column picker components ──────────────────────────────────────────────────

function ColumnPicker({ columns, selected, onChange }: {
  columns: ColumnMeta[]
  selected: string[]
  onChange: (cols: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  if (columns.length === 0) return null
  const label = selected.length === 0
    ? 'All columns'
    : selected.length === 1
      ? selected[0]
      : `${selected.length} columns selected`
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12px] text-[#1d1d1f]/80 dark:text-white/80 text-left hover:border-[#0071E3]/40 transition-colors"
      >
        <span className={selected.length === 0 ? 'opacity-40' : ''}>{label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-[#1C1C1E] border border-black/[0.10] dark:border-white/[0.10] rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-40 overflow-y-auto p-1">
            <button
              onClick={() => { onChange([]); setOpen(false) }}
              className="w-full text-left px-2.5 py-1.5 text-[11px] text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-lg"
            >
              All columns (default)
            </button>
            {columns.map((col) => {
              const checked = selected.includes(col.name)
              return (
                <label key={col.name} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked ? selected.filter((c) => c !== col.name) : [...selected, col.name]
                      onChange(next)
                    }}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span className="text-[11px] text-[#1d1d1f]/80 dark:text-white/80 truncate flex-1">{col.name}</span>
                  <span className="text-[10px] text-[#1d1d1f]/25 dark:text-white/25 font-mono">{col.type}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ColumnSelect({ columns, value, onChange, placeholder }: {
  columns: ColumnMeta[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  if (columns.length === 0) {
    return <TextInput value={value} onChange={onChange} placeholder={placeholder} />
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12px] text-[#1d1d1f]/80 dark:text-white/80 focus:outline-none focus:border-[#0071E3]/50 transition-colors"
    >
      <option value="">{placeholder ?? 'Select column'}</option>
      {columns.map((col) => (
        <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
      ))}
    </select>
  )
}

function getIcon(type: string): string {
  const map: Record<string, string> = {
    file_upload: '\u2191', database_query: '\u2295', column_type_detection: 'T', missing_value: '\u25cb',
    duplicate_detection: '\u229f', filter_rows: '\u2283', statistics: '\u03c3',
    anomaly_detection: '\u25b3', correlation: '\u03c1', distribution: '\u223f',
    time_series: '~', group_by: '\u2261', column_ops: '\u2726', custom_python: '\u03bb',
    join: '\u22c8', train_test_split: '\u2282', ml_model: '\u25ce',
    data_export: '\u2193',
    dashboard: '\u229e', report: '\u22a1', ai_insights: '\u25c8',
  }
  return map[type] ?? '\u2699'
}

function statusColor(status?: string): string {
  if (status === 'success') return 'text-[#30D158]'
  if (status === 'error')   return 'text-[#FF453A]'
  if (status === 'running') return 'text-[#0071E3]'
  return 'text-[#1d1d1f]/25 dark:text-white/25'
}
