import type { NodeCategory } from '../../types/workflow'
import { useI18n, type TranslationKey } from '../../i18n'

// Nodes that are not yet implemented — shown greyed-out and non-draggable
const DISABLED_TYPES = new Set([
  // Transformation
  'normalize', 'encode', 'pivot', 'group_by', 'column_ops', 'custom_python', 'join',
  // Time-series (single node inside analysis)
  'time_series',
  // ML
  'train_test_split', 'ml_model',
])

export interface NodeDefinition {
  type: string
  labelKey: TranslationKey
  descKey: TranslationKey
  label: string   // kept for compat (default English)
  icon: string
  category: NodeCategory
  description: string  // kept for compat (default English)
  defaultConfig: Record<string, unknown>
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  // ── Source ──────────────────────────────────────────────────
  {
    type: 'file_upload',
    labelKey: 'fileUpload', descKey: 'descFileUpload',
    label: 'File Upload', icon: '↑', category: 'source',
    description: 'Load CSV or Excel dataset',
    defaultConfig: { storage_path: '', file_id: '', filename: '' },
  },
  {
    type: 'database_query',
    labelKey: 'databaseQuery', descKey: 'descDatabaseQuery',
    label: 'Database Query', icon: '⊕', category: 'source',
    description: 'Query PostgreSQL, MySQL or SQLite',
    defaultConfig: {
      db_type: 'postgresql', connection_mode: 'fields',
      host: 'localhost', port: 5432, database: '', username: '', password: '',
      connection_string: '', query: 'SELECT * FROM table_name LIMIT 1000', row_limit: 10000,
    },
  },

  // ── Preparation ─────────────────────────────────────────────
  {
    type: 'column_type_detection',
    labelKey: 'columnTypes', descKey: 'descColumnTypes',
    label: 'Column Types', icon: 'T', category: 'preparation',
    description: 'Detect semantic column types',
    defaultConfig: { categorical_threshold: 50, try_parse_dates: true },
  },
  {
    type: 'missing_value',
    labelKey: 'missingValues', descKey: 'descMissingValues',
    label: 'Missing Values', icon: '○', category: 'preparation',
    description: 'Analyse and impute missing data',
    defaultConfig: { strategy: 'report_only', columns: [] },
  },
  {
    type: 'duplicate_detection',
    labelKey: 'duplicates', descKey: 'descDuplicates',
    label: 'Duplicates', icon: '⊟', category: 'preparation',
    description: 'Find and remove duplicate rows',
    defaultConfig: { subset: [], keep: 'first', drop: false },
  },
  {
    type: 'filter_rows',
    labelKey: 'filterRows', descKey: 'descFilterRows',
    label: 'Filter Rows', icon: '⊃', category: 'preparation',
    description: 'Filter rows by condition',
    defaultConfig: { column: '', operator: '==', value: '' },
  },

  // ── Transformation ──────────────────────────────────────────
  {
    type: 'normalize',
    labelKey: 'normalize', descKey: 'descNormalize',
    label: 'Normalize', icon: '⊞', category: 'transformation',
    description: 'Scale numeric columns (min-max, z-score, robust)',
    defaultConfig: { method: 'minmax', columns: [] },
  },
  {
    type: 'encode',
    labelKey: 'encode', descKey: 'descEncode',
    label: 'Encode', icon: '⌘', category: 'transformation',
    description: 'Encode categorical columns (one-hot, label)',
    defaultConfig: { method: 'label', columns: [], drop_first: false },
  },
  {
    type: 'pivot',
    labelKey: 'pivot', descKey: 'descPivot',
    label: 'Pivot Table', icon: '⊛', category: 'transformation',
    description: 'Reshape dataframe into a pivot table',
    defaultConfig: { index: '', columns: '', values: '', aggfunc: 'mean' },
  },

  // ── Transformation (new) ────────────────────────────────────
  {
    type: 'group_by',
    labelKey: 'groupBy', descKey: 'descGroupBy',
    label: 'Group By', icon: '≡', category: 'transformation',
    description: 'Group rows and aggregate columns',
    defaultConfig: { group_columns: [], aggregations: {} },
  },
  {
    type: 'column_ops',
    labelKey: 'columnOps', descKey: 'descColumnOps',
    label: 'Column Ops', icon: '✦', category: 'transformation',
    description: 'Select, drop, rename or cast columns',
    defaultConfig: { operation: 'select', columns: [], rename_map: {}, cast_map: {} },
  },
  {
    type: 'custom_python',
    labelKey: 'customPython', descKey: 'descCustomPython',
    label: 'Custom Python', icon: 'λ', category: 'transformation',
    description: 'Run custom Python code on the dataframe',
    defaultConfig: { code: '# df is available as input\ndf_out = df.copy()\n' },
  },
  {
    type: 'join',
    labelKey: 'join', descKey: 'descJoin',
    label: 'Join', icon: '⋈', category: 'transformation',
    description: 'Merge two dataframes (inner/left/right/outer)',
    defaultConfig: { how: 'inner', on: '', left_on: '', right_on: '' },
  },

  // ── Analysis ────────────────────────────────────────────────
  {
    type: 'statistics',
    labelKey: 'statistics', descKey: 'descStatistics',
    label: 'Statistics', icon: 'σ', category: 'analysis',
    description: 'Mean, std, skewness, kurtosis',
    defaultConfig: { columns: [] },
  },
  {
    type: 'anomaly_detection',
    labelKey: 'anomalyDetection', descKey: 'descAnomalyDetection',
    label: 'Anomaly Detection', icon: '△', category: 'analysis',
    description: 'IQR, Z-Score or Isolation Forest',
    defaultConfig: { method: 'iqr', iqr_multiplier: 1.5, zscore_threshold: 3.0, contamination: 0.05, columns: [] },
  },
  {
    type: 'correlation',
    labelKey: 'correlation', descKey: 'descCorrelation',
    label: 'Correlation', icon: 'ρ', category: 'analysis',
    description: 'Correlation matrix and strong pairs',
    defaultConfig: { method: 'pearson', threshold: 0.7, columns: [] },
  },
  {
    type: 'distribution',
    labelKey: 'distribution', descKey: 'descDistribution',
    label: 'Distribution', icon: '∿', category: 'analysis',
    description: 'Histogram, KDE & normality tests',
    defaultConfig: { bins: 20, columns: [] },
  },
  {
    type: 'time_series',
    labelKey: 'timeSeries', descKey: 'descTimeSeries',
    label: 'Time Series', icon: '~', category: 'analysis',
    description: 'Trend, rolling mean & forecast',
    defaultConfig: { date_column: '', value_column: '', window: 7, forecast_periods: 0, method: 'rolling', freq: 'auto' },
  },

  // ── ML ──────────────────────────────────────────────────────
  {
    type: 'train_test_split',
    labelKey: 'trainTestSplit', descKey: 'descTrainTestSplit',
    label: 'Train/Test Split', icon: '⊂', category: 'ml',
    description: 'Split dataset for model training',
    defaultConfig: { test_size: 0.2, random_state: 42, stratify_column: '' },
  },
  {
    type: 'ml_model',
    labelKey: 'mlModel', descKey: 'descMlModel',
    label: 'ML Model', icon: '◎', category: 'ml',
    description: 'Train & evaluate a scikit-learn model',
    defaultConfig: { task_type: 'classification', algorithm: 'random_forest_classifier', target_column: '', feature_columns: [], random_state: 42 },
  },

  // ── Visualization ────────────────────────────────────────────
  {
    type: 'statistics_chart',
    labelKey: 'statisticsChart', descKey: 'descStatisticsChart',
    label: 'Statistics Chart', icon: 'σ', category: 'visualization',
    description: 'Visualise descriptive statistics',
    defaultConfig: { title: 'Descriptive Statistics' },
  },
  {
    type: 'anomaly_chart',
    labelKey: 'anomalyChart', descKey: 'descAnomalyChart',
    label: 'Anomaly Chart', icon: '△', category: 'visualization',
    description: 'Scatter plot of anomaly detection',
    defaultConfig: { title: 'Anomaly Detection' },
  },
  {
    type: 'correlation_chart',
    labelKey: 'correlationChart', descKey: 'descCorrelationChart',
    label: 'Correlation Chart', icon: 'ρ', category: 'visualization',
    description: 'Correlation heatmap',
    defaultConfig: { title: 'Correlation Matrix' },
  },
  {
    type: 'distribution_chart',
    labelKey: 'distributionChart', descKey: 'descDistributionChart',
    label: 'Distribution Chart', icon: '∿', category: 'visualization',
    description: 'Histogram & KDE distribution',
    defaultConfig: { title: 'Distribution Analysis' },
  },

  // ── Output ──────────────────────────────────────────────────
  {
    type: 'data_export',
    labelKey: 'dataExport', descKey: 'descDataExport',
    label: 'Data Export', icon: '↓', category: 'output',
    description: 'Export dataframe to CSV, Excel or JSON',
    defaultConfig: { format: 'csv', filename: 'export' },
  },
  {
    type: 'dashboard',
    labelKey: 'dashboard', descKey: 'descDashboard',
    label: 'Dashboard', icon: '⊞', category: 'output',
    description: 'Visual analysis dashboard',
    defaultConfig: { title: 'Analysis Dashboard' },
  },
  {
    type: 'report',
    labelKey: 'report', descKey: 'descReport',
    label: 'Report', icon: '⊡', category: 'output',
    description: 'Generate structured PDF report',
    defaultConfig: { title: 'Data Analysis Report', include_data: false },
  },
  {
    type: 'ai_insights',
    labelKey: 'aiInsights', descKey: 'descAiInsights',
    label: 'AI Insights', icon: '◈', category: 'output',
    description: 'Natural language interpretation',
    defaultConfig: { provider: 'gemini', language: 'English' },
  },
]

const CATEGORIES: { key: NodeCategory; labelKey: TranslationKey; accent: string; dot: string }[] = [
  { key: 'source',         labelKey: 'source',         accent: 'text-[#0071E3]',  dot: 'bg-[#0071E3]' },
  { key: 'preparation',    labelKey: 'preparation',    accent: 'text-[#F5A623]',  dot: 'bg-[#F5A623]' },
  { key: 'transformation', labelKey: 'transformation', accent: 'text-[#FF9F0A]',  dot: 'bg-[#FF9F0A]' },
  { key: 'analysis',       labelKey: 'analysis',       accent: 'text-[#30D158]',  dot: 'bg-[#30D158]' },
  { key: 'visualization',  labelKey: 'visualization',  accent: 'text-[#5E5CE6]',  dot: 'bg-[#5E5CE6]' },
  { key: 'ml',             labelKey: 'ml',             accent: 'text-[#FF6B6B]',  dot: 'bg-[#FF6B6B]' },
  { key: 'output',         labelKey: 'output',         accent: 'text-[#BF5AF2]',  dot: 'bg-[#BF5AF2]' },
]

const CATEGORY_ICON_BG: Record<string, string> = {
  source:         'bg-[#0071E3]',
  preparation:    'bg-[#F5A623]',
  transformation: 'bg-[#FF9F0A]',
  analysis:       'bg-[#30D158]',
  visualization:  'bg-[#5E5CE6]',
  ml:             'bg-[#FF6B6B]',
  output:         'bg-[#BF5AF2]',
}

// Categories open by default
const DEFAULT_OPEN: Set<NodeCategory> = new Set(['source', 'preparation', 'analysis', 'output'])

import { useState } from 'react'

export default function NodePanel({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const { t } = useI18n()

  // Per-category open/closed state
  const [openCats, setOpenCats] = useState<Set<NodeCategory>>(new Set(DEFAULT_OPEN))

  const toggleCat = (key: NodeCategory) =>
    setOpenCats((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    if (DISABLED_TYPES.has(nodeType)) { e.preventDefault(); return }
    e.dataTransfer.setData('application/dataflow-node', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  // ── Collapsed: icon-only strip ───────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="w-10 bg-[#F5F5F7] dark:bg-[#111113] border-r border-black/[0.07] dark:border-white/[0.07] flex flex-col items-center py-2 flex-shrink-0 transition-all duration-200">
        {/* Toggle button */}
        <button
          onClick={onToggle}
          title="Expand panel"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1d1d1f]/30 dark:text-white/30 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all mb-2"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex flex-col gap-1.5 items-center">
          {CATEGORIES.map(({ key }) => {
            const defs = NODE_DEFINITIONS.filter((d) => d.category === key)
            const iconBg = CATEGORY_ICON_BG[key] ?? 'bg-black/[0.06]'
            return defs.map((def) => {
              const disabled = DISABLED_TYPES.has(def.type)
              return (
                <div
                  key={def.type}
                  draggable={!disabled}
                  onDragStart={(e) => onDragStart(e, def.type)}
                  title={disabled ? `${t(def.labelKey)} — Coming soon` : `${t(def.labelKey)} — ${t(def.descKey)}`}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 ${iconBg} ${
                    disabled
                      ? 'opacity-35 cursor-not-allowed grayscale'
                      : 'cursor-grab active:cursor-grabbing hover:scale-110 transition-transform'
                  }`}
                >
                  {def.icon}
                </div>
              )
            })
          })}
        </div>
      </aside>
    )
  }

  // ── Expanded ─────────────────────────────────────────────────────────────
  return (
    <aside className="w-52 bg-[#F5F5F7] dark:bg-[#111113] border-r border-black/[0.07] dark:border-white/[0.07] overflow-y-auto flex-shrink-0 transition-all duration-200">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[#1d1d1f]/30 dark:text-white/30 uppercase tracking-widest">{t('components')}</p>
        <button
          onClick={onToggle}
          title="Collapse panel"
          className="w-5 h-5 rounded flex items-center justify-center text-[#1d1d1f]/25 dark:text-white/25 hover:text-[#1d1d1f]/70 dark:hover:text-white/70 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {CATEGORIES.map(({ key, labelKey, accent, dot }) => {
        const defs = NODE_DEFINITIONS.filter((d) => d.category === key)
        const iconBg = CATEGORY_ICON_BG[key] ?? 'bg-black/[0.06] dark:bg-white/[0.07]'
        const isOpen = openCats.has(key)
        return (
          <div key={key} className="mb-1">
            {/* Accordion header */}
            <button
              onClick={() => toggleCat(key)}
              className="w-full flex items-center gap-1.5 px-4 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors rounded-lg group"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot} opacity-80 flex-shrink-0`} />
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${accent} opacity-80 flex-1 text-left`}>
                {t(labelKey)}
              </span>
              <span className="text-[9px] font-medium text-[#1d1d1f]/25 dark:text-white/25 mr-0.5">
                {defs.length}
              </span>
              <svg
                width="8" height="8" viewBox="0 0 8 8" fill="none"
                className={`flex-shrink-0 text-[#1d1d1f]/30 dark:text-white/30 transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
              >
                <path d="M2 1.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Collapsible node list */}
            <div
              className="overflow-hidden transition-all duration-200 ease-in-out"
              style={{ maxHeight: isOpen ? `${defs.length * 56}px` : '0px', opacity: isOpen ? 1 : 0 }}
            >
              <div className="pb-2">
                {defs.map((def) => {
                  const disabled = DISABLED_TYPES.has(def.type)
                  return (
                    <div
                      key={def.type}
                      draggable={!disabled}
                      onDragStart={(e) => onDragStart(e, def.type)}
                      title={disabled ? `${t(def.labelKey)} — Coming soon` : t(def.descKey)}
                      className={`mx-3 mb-1 px-3 py-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                        disabled
                          ? 'opacity-35 cursor-not-allowed grayscale bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.04] dark:border-white/[0.04] select-none'
                          : 'bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.07] dark:hover:bg-white/[0.07] cursor-grab active:cursor-grabbing border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.12]'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 ${iconBg}`}>
                        {def.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-[#1d1d1f]/80 dark:text-white/80 leading-tight truncate flex items-center gap-1.5">
                          {t(def.labelKey)}
                          {disabled && (
                            <span className="text-[8px] font-semibold uppercase tracking-wider text-[#1d1d1f]/30 dark:text-white/30 bg-black/[0.06] dark:bg-white/[0.06] px-1 py-0.5 rounded">
                              soon
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#1d1d1f]/30 dark:text-white/30 leading-tight truncate mt-0.5">{t(def.descKey)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </aside>
  )
}
