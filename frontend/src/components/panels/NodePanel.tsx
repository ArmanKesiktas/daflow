import { useState } from 'react'
import type { NodeCategory } from '../../types/workflow'
import { useI18n, type TranslationKey } from '../../i18n'
import { CHART_DEFINITIONS } from '../../utils/chartCatalog'
import { DashboardPanelChart, buildDashboardPreviewPanel } from '../charts/DashboardPanelChart'
import type { DashboardLang } from '../../utils/dashboardEnhancements'

export interface NodeDefinition {
  type: string
  labelKey?: TranslationKey
  descKey?: TranslationKey
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
    label: 'Database Query', icon: 'DB', category: 'source',
    description: 'Pull rows from PostgreSQL or Supabase table',
    defaultConfig: {
      connection_mode: 'connector',
      connector_id: '',
      db_type: 'postgresql',
      query: 'select * from your_table limit 1000',
      row_limit: 10000,
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
  {
    type: 'join_node',
    label: 'Join', icon: '⋈', category: 'preparation' as NodeCategory,
    description: 'Merge two DataFrames by matching columns',
    defaultConfig: { how: 'inner', keyPairs: [], suffixes: ['_x', '_y'], dismissedSuggestions: [] },
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
    type: 'ccsg_sg_anomaly',
    label: 'CCSG-SG', icon: 'C', category: 'analysis',
    description: 'Conformal copula surprise with stability gating',
    defaultConfig: { window: 30, beta: 8.0, tau: 1.0, threshold: 2.0, ridge: 0.000001, columns: [] },
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
    label: 'Time Series', icon: '~', category: 'analysis',
    description: 'Trend and rolling forecast',
    defaultConfig: { date_column: '', value_column: '', window: 7, forecast_periods: 0, method: 'rolling', freq: 'auto' },
  },

  // ── Big Data Nodes ─────────────────────────────────────────
  {
    type: 'chunk_processing',
    labelKey: 'chunkProcessing', descKey: 'descChunkProcessing',
    label: 'Chunk Processing', icon: '▤', category: 'big_data',
    description: 'Process large tables in row chunks',
    defaultConfig: { chunk_size: 10000 },
  },
  {
    type: 'mapreduce_aggregation',
    labelKey: 'mapReduceAggregation', descKey: 'descMapReduceAggregation',
    label: 'MapReduce Aggregation', icon: 'MR', category: 'big_data',
    description: 'Map and reduce grouped aggregates',
    defaultConfig: { chunk_size: 10000, group_column: '', value_column: '', reducer: 'sum' },
  },
  {
    type: 'spark_groupby',
    labelKey: 'sparkGroupBy', descKey: 'descSparkGroupBy',
    label: 'Spark-like GroupBy', icon: 'S', category: 'big_data',
    description: 'Partitioned Spark-style groupBy',
    defaultConfig: { group_columns: [], aggregate_columns: [], aggregation: 'sum', partitions: 4 },
  },
  {
    type: 'large_dataset_profiler',
    labelKey: 'largeDatasetProfiler', descKey: 'descLargeDatasetProfiler',
    label: 'Large Dataset Profiler', icon: 'LP', category: 'big_data',
    description: 'Profile scale, memory, missingness',
    defaultConfig: { sample_size: 5000 },
  },

  // ── Utility ─────────────────────────────────────────────────
  {
    type: 'route_node',
    labelKey: 'routeNode', descKey: 'descRouteNode',
    label: 'Route Node', icon: 'R', category: 'utility',
    description: 'Collect branches and pass results onward',
    defaultConfig: { mode: 'merge' },
  },
  {
    type: 'code_sql',
    label: 'SQL Query', icon: '⌨', category: 'utility',
    description: 'Write SQL against upstream data',
    defaultConfig: { query: 'SELECT * FROM input_data LIMIT 100', input_node: '' },
  },

  // ── Charts ──────────────────────────────────────────────────
  ...CHART_DEFINITIONS.map((chart) => ({
    type: chart.type,
    label: chart.label,
    icon: chart.icon,
    category: 'visualization' as NodeCategory,
    description: chart.description,
    defaultConfig: { chart_type: chart.type, title: chart.label },
  })),

  // ── Machine Learning ────────────────────────────────────────
  {
    type: 'train_test_split',
    label: 'Train/Test Split', icon: '⊂', category: 'ml',
    description: 'Split data for model training',
    defaultConfig: { test_size: 0.2, random_state: 42, stratify_column: '' },
  },
  {
    type: 'ml_model',
    label: 'ML Model', icon: '◎', category: 'ml',
    description: 'Train and evaluate a model',
    defaultConfig: { task_type: 'classification', algorithm: 'random_forest_classifier', target_column: '', feature_columns: [], random_state: 42 },
  },

  // ── Output ──────────────────────────────────────────────────
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
    type: 'export_output',
    label: 'Export Output', icon: '⬇', category: 'output',
    description: 'Export data to Excel, CSV, or JSON',
    defaultConfig: { format: 'xlsx', filename: 'output', columns: [], include_charts: false, include_summary: false },
  },
]

export const CATEGORIES: { key: NodeCategory; labelKey: TranslationKey; accent: string; dot: string }[] = [
  { key: 'source',      labelKey: 'source',      accent: 'text-[#0071E3]',  dot: 'bg-[#0071E3]' },
  { key: 'preparation', labelKey: 'preparation',  accent: 'text-[#F5A623]',  dot: 'bg-[#F5A623]' },
  { key: 'analysis',    labelKey: 'analysis',     accent: 'text-[#30D158]',  dot: 'bg-[#30D158]' },
  { key: 'big_data',    labelKey: 'bigData',      accent: 'text-[#00A6A6]',  dot: 'bg-[#00A6A6]' },
  { key: 'utility',     labelKey: 'utility',      accent: 'text-[#8E8E93]',  dot: 'bg-[#8E8E93]' },
  { key: 'visualization', labelKey: 'charts',     accent: 'text-[#5E5CE6]',  dot: 'bg-[#5E5CE6]' },
  { key: 'ml',          labelKey: 'ml',            accent: 'text-[#FF6B6B]',  dot: 'bg-[#FF6B6B]' },
  { key: 'output',      labelKey: 'output',       accent: 'text-[#BF5AF2]',  dot: 'bg-[#BF5AF2]' },
]

const CATEGORY_ICON_BG: Record<string, string> = {
  source:      'bg-[#0071E3]',
  preparation: 'bg-[#F5A623]',
  analysis:    'bg-[#30D158]',
  big_data:    'bg-[#00A6A6]',
  utility:     'bg-[#8E8E93]',
  visualization: 'bg-[#5E5CE6]',
  ml:          'bg-[#FF6B6B]',
  output:      'bg-[#BF5AF2]',
}

export default function NodePanel({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [hovered, setHovered] = useState<NodeDefinition | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | null>(null)

  const onCategoryDragStart = (e: React.DragEvent, category: NodeCategory) => {
    e.dataTransfer.setData('application/dataflow-category', category)
    e.dataTransfer.effectAllowed = 'move'
  }

  const matchesQuery = (def: NodeDefinition) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${nodeLabel(def, t)} ${nodeDescription(def, t)} ${def.type}`.toLowerCase().includes(needle)
  }
  const queryActive = query.trim().length > 0
  const filteredDefinitions = NODE_DEFINITIONS.filter(matchesQuery)
  const activeCategory = queryActive ? null : selectedCategory
  const activeCategoryMeta = activeCategory ? CATEGORIES.find((category) => category.key === activeCategory) : null
  const activeDefinitions = queryActive
    ? filteredDefinitions
    : activeCategory
      ? NODE_DEFINITIONS.filter((def) => def.category === activeCategory)
      : []
  const chooseCategory = (category: NodeCategory) => {
    setSelectedCategory(category)
    if (collapsed) onToggle?.()
  }

  // ── Collapsed: icon-only strip ───────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="w-10 bg-page-bg border-r border-[var(--color-border-default)] flex flex-col items-center py-2 flex-shrink-0 transition-all duration-200">
        {/* Toggle button */}
        <button
          onClick={onToggle}
          title="Expand panel"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all mb-2"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex flex-col gap-1.5 items-center">
          {CATEGORIES.map(({ key, labelKey, dot }) => {
            const defs = NODE_DEFINITIONS.filter((d) => d.category === key)
            return (
              <button
                key={key}
                type="button"
                draggable
                onDragStart={(e) => onCategoryDragStart(e, key)}
                onClick={() => chooseCategory(key)}
                title={`${t(labelKey)} · ${defs.length}`}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                  selectedCategory === key
                    ? 'bg-primary/[0.12]'
                    : 'hover:bg-primary/[0.08]'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${dot}`} />
              </button>
            )
          })}
        </div>
      </aside>
    )
  }

  // ── Expanded ─────────────────────────────────────────────────────────────
  return (
    <aside data-tour="node-panel" className="relative w-56 bg-page-bg border-r border-[var(--color-border-default)] overflow-y-auto flex-shrink-0 transition-all duration-200">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">{t('components')}</p>
        <button
          onClick={onToggle}
          title="Collapse panel"
          className="w-5 h-5 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="px-3 pb-3">
        <div className="h-9 rounded-xl border border-[var(--color-border-subtle)] bg-[#ffffff]/70 dark:bg-[#1C1C1E]/70 flex items-center gap-2 px-3">
          <svg className="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
          </svg>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            placeholder={lang === 'tr' ? 'Node ara...' : 'Search nodes...'}
            className="min-w-0 flex-1 bg-transparent outline-none text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          />
        </div>
      </div>

      {!activeCategory && !queryActive && (
        <div className="px-3 pb-4 space-y-2">
          <p className="px-1 pb-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--color-text-muted)]">
            {lang === 'tr' ? 'Kategori seç' : 'Choose category'}
          </p>
          {CATEGORIES.map(({ key, labelKey, accent, dot }) => {
            const defs = NODE_DEFINITIONS.filter((d) => d.category === key)
            return (
              <button
                key={key}
                type="button"
                draggable
                onDragStart={(e) => onCategoryDragStart(e, key)}
                onClick={() => chooseCategory(key)}
                className="w-full min-h-[58px] rounded-xl px-3 py-2.5 text-left transition-colors flex items-center gap-3 hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <span className={`w-3 h-3 rounded-full ${dot} flex-shrink-0`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[11px] font-semibold uppercase tracking-[0.12em] ${accent}`}>{t(labelKey)}</span>
                  <span className="mt-1 block text-[11px] text-[var(--color-text-muted)]">
                    {defs.length} {lang === 'tr' ? 'node seçeneği' : 'node options'}
                  </span>
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--color-text-muted)] flex-shrink-0" aria-hidden="true">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )
          })}
        </div>
      )}

      {(activeCategory || queryActive) && (
        <div className="px-3 pb-4">
          <div className="mb-3 flex items-center gap-2">
            {!queryActive && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-colors"
                title={lang === 'tr' ? 'Kategorilere dön' : 'Back to categories'}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--color-text-muted)]">
                {queryActive ? (lang === 'tr' ? 'Arama sonuçları' : 'Search results') : (lang === 'tr' ? 'Node seçenekleri' : 'Node options')}
              </p>
              <p className={`mt-0.5 text-[12px] font-semibold truncate ${activeCategoryMeta?.accent ?? 'text-[var(--color-text-primary)]'}`}>
                {queryActive ? `${activeDefinitions.length} ${lang === 'tr' ? 'sonuç' : 'results'}` : activeCategoryMeta ? t(activeCategoryMeta.labelKey) : ''}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {activeDefinitions.map((def) => (
              <div
                key={def.type}
                onMouseEnter={() => setHovered(def)}
                onMouseLeave={() => setHovered(null)}
                title={nodeDescription(def, t)}
                className="px-3 py-2.5 rounded-xl hover:bg-primary/[0.08] flex items-center gap-3 transition-colors"
              >
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 ${CATEGORY_ICON_BG[def.category] ?? 'bg-[var(--color-secondary)]'}`}>
                  {def.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-[var(--color-text-primary)] leading-tight truncate">{nodeLabel(def, t)}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)] leading-tight truncate mt-0.5">{nodeDescription(def, t)}</div>
                </div>
              </div>
            ))}
            {activeDefinitions.length === 0 && (
              <div className="rounded-xl bg-[var(--color-secondary)] px-3 py-4 text-[12px] text-[var(--color-text-muted)] text-center">
                {lang === 'tr' ? 'Node bulunamadı.' : 'No nodes found.'}
              </div>
            )}
          </div>
        </div>
      )}
      {hovered && <NodeHoverPreview def={hovered} t={t} lang={lang as DashboardLang} />}
    </aside>
  )
}

function nodeLabel(def: NodeDefinition, t: (key: TranslationKey) => string) {
  return def.labelKey ? t(def.labelKey) : def.label
}

function nodeDescription(def: NodeDefinition, t: (key: TranslationKey) => string) {
  return def.descKey ? t(def.descKey) : def.description
}

function NodeHoverPreview({ def, t, lang }: { def: NodeDefinition; t: (key: TranslationKey) => string; lang: DashboardLang }) {
  const isChart = def.category === 'visualization'

  return (
    <div className="fixed left-[244px] top-[72px] z-[90] w-[390px] rounded-2xl border border-[var(--color-border-default)] bg-[#ffffff] dark:bg-[#1C1C1E] shadow-2xl overflow-hidden pointer-events-none">
      <div className="p-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-start gap-3">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-semibold text-white ${CATEGORY_ICON_BG[def.category] ?? 'bg-[#8E8E93]'}`}>{def.icon}</span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">{nodeLabel(def, t)}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{nodeDescription(def, t)}</p>
          </div>
        </div>
      </div>
      <div className={isChart ? 'p-4' : 'p-4'}>
        {isChart ? <ChartMiniPreview type={def.type} lang={lang} /> : <TextPreview def={def} />}
      </div>
    </div>
  )
}

function TextPreview({ def }: { def: NodeDefinition }) {
  const input = def.category === 'source' ? 'None' : def.category === 'output' ? 'Workflow outputs' : 'DataFrame / upstream result'
  const output = def.category === 'output' ? 'Dashboard or report' : def.category === 'visualization' ? 'Chart panel' : 'DataFrame + summary'
  return (
    <div className="space-y-2">
      <PreviewRow label="Input" value={input} />
      <PreviewRow label="Output" value={output} />
      <div className="rounded-xl bg-[var(--color-secondary)] p-3 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        {Object.keys(def.defaultConfig).length ? `Config: ${Object.keys(def.defaultConfig).slice(0, 5).join(', ')}` : 'No setup required before connecting this node.'}
      </div>
    </div>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-secondary)] px-3 py-2">
      <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[11px] text-[var(--color-text-secondary)] truncate">{value}</span>
    </div>
  )
}

function ChartMiniPreview({ type, lang }: { type: string; lang: DashboardLang }) {
  const definition = CHART_DEFINITIONS.find((chart) => chart.type === type)
  const previewPanel = buildDashboardPreviewPanel(type)
  return (
    <div className="space-y-3">
      <div className="h-[230px] rounded-2xl border border-[var(--color-border-subtle)] bg-page-bg p-3 overflow-hidden">
        <DashboardPanelChart panel={previewPanel} lang={lang} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PreviewRow label="Family" value={definition?.family ?? 'Chart'} />
        <PreviewRow label="Input" value={definition?.input?.replace(/_/g, ' ') ?? 'Data'} />
      </div>
    </div>
  )
}

function ChartSvg({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 320 210" className="w-full h-full">{children}</svg>
}

function renderChartPreview(type: string) {
  switch (type) {
    case 'bar_chart':
      return <BarPreview />
    case 'clustered_bar_chart':
      return <ClusteredBarPreview />
    case 'stacked_bar_chart':
      return <StackedBarPreview />
    case 'overlapping_bars':
      return <OverlappingBarsPreview />
    case 'horizontal_bar_chart':
      return <HorizontalBarPreview />
    case 'dumbbell_chart':
      return <DumbbellPreview />
    case 'diverging_bar_chart':
      return <DivergingBarPreview />
    case 'small_multiples':
      return <SmallMultiplesPreview />
    case 'line_chart':
      return <LinePreview />
    case 'area_chart':
      return <AreaPreview />
    case 'dual_axis_chart':
      return <DualAxisPreview />
    case 'stream_graph':
      return <StreamGraphPreview />
    case 'connected_scatter_plot':
      return <ConnectedScatterPreview />
    case 'slope_chart':
      return <SlopePreview />
    case 'pie_chart':
      return <PiePreview donut={false} />
    case 'donut_chart':
      return <PiePreview donut />
    case 'sunburst':
      return <SunburstPreview />
    case 'alluvial_diagram':
      return <AlluvialPreview />
    case 'radar_chart':
      return <RadarPreview />
    case 'polar_area_chart':
      return <PolarAreaPreview />
    case 'scatter_plot':
      return <ScatterPreview />
    case 'bubble_chart':
      return <BubblePreview />
    case 'heatmap':
      return <HeatmapPreview />
    case 'histogram':
      return <HistogramPreview />
    case 'box_plot':
      return <BoxPlotPreview />
    case 'violin_plot':
      return <ViolinPreview />
    case 'beeswarm_plot':
      return <BeeswarmPreview />
    case 'density_heatmap':
      return <DensityHeatmapPreview />
    case 'convex_hull_chart':
      return <ConvexHullPreview />
    case 'word_cloud':
      return <WordCloudPreview />
    case 'parallel_coordinates':
      return <ParallelCoordinatesPreview />
    case 'kpi_card':
      return <KpiCardPreview />
    case 'kpi_grid':
      return <KpiGridPreview />
    case 'stat_card':
      return <StatCardPreview />
    case 'missing_values_bar':
      return <MissingValuesPreview />
    case 'duplicate_rate_card':
      return <DuplicateCardPreview />
    case 'correlation_network':
      return <NetworkPreview mode="correlation" />
    case 'treemap':
      return <TreemapPreview />
    case 'dot_map':
      return <MapPreview mode="dot" />
    case 'choropleth_map':
      return <MapPreview mode="choropleth" />
    case 'bubble_map':
      return <MapPreview mode="bubble" />
    case 'cartogram':
      return <MapPreview mode="cartogram" />
    case 'dorling_cartogram':
      return <MapPreview mode="dorling" />
    case 'connection_map':
      return <ConnectionMapPreview />
    case 'network_diagram':
      return <NetworkPreview mode="network" />
    case 'circular_graph':
      return <CircularGraphPreview />
    case 'arc_diagram':
      return <ArcDiagramPreview />
    case 'time_based_network_diagram':
      return <TimeNetworkPreview />
    default:
      return <BarPreview />
  }
}

function ChartFrame() {
  return (
    <>
      <line x1="38" y1="176" x2="288" y2="176" stroke="#1d1d1f" opacity=".12" />
      <line x1="38" y1="35" x2="38" y2="176" stroke="#1d1d1f" opacity=".12" />
      {[70, 105, 140].map((y) => <line key={y} x1="38" y1={y} x2="288" y2={y} stroke="#1d1d1f" opacity=".04" />)}
    </>
  )
}

function BarPreview() {
  return (
    <ChartSvg>
      <ChartFrame />
      {[52, 95, 138, 181, 224].map((x, i) => <rect key={x} x={x} y={[116, 72, 96, 54, 86][i]} width="28" height={176 - [116, 72, 96, 54, 86][i]} rx="7" fill="#0071E3" opacity={0.55 + i * 0.08} />)}
    </ChartSvg>
  )
}

function ClusteredBarPreview() {
  return (
    <ChartSvg>
      <ChartFrame />
      {[60, 128, 196].map((x, i) => (
        <g key={x}>
          <rect x={x} y={[96, 62, 112][i]} width="18" height={176 - [96, 62, 112][i]} rx="5" fill="#0071E3" />
          <rect x={x + 22} y={[122, 88, 74][i]} width="18" height={176 - [122, 88, 74][i]} rx="5" fill="#30D158" opacity=".78" />
          <rect x={x + 44} y={[78, 116, 96][i]} width="18" height={176 - [78, 116, 96][i]} rx="5" fill="#FF9F0A" opacity=".78" />
        </g>
      ))}
    </ChartSvg>
  )
}

function StackedBarPreview() {
  return (
    <ChartSvg>
      <ChartFrame />
      {[58, 110, 162, 214].map((x, i) => {
        const parts = [[42, 31, 28], [54, 24, 35], [34, 48, 26], [62, 29, 42]][i]
        let y = 176
        return <g key={x}>{parts.map((h, index) => {
          y -= h
          return <rect key={index} x={x} y={y} width="34" height={h - 2} rx="6" fill={['#0071E3', '#30D158', '#FF9F0A'][index]} opacity={index === 0 ? 0.9 : 0.74} />
        })}</g>
      })}
    </ChartSvg>
  )
}

function OverlappingBarsPreview() {
  return (
    <ChartSvg>
      <ChartFrame />
      {[60, 112, 164, 216].map((x, i) => (
        <g key={x}>
          <rect x={x} y={[90, 64, 108, 78][i]} width="38" height={176 - [90, 64, 108, 78][i]} rx="7" fill="#0071E3" opacity=".45" />
          <rect x={x + 14} y={[118, 84, 76, 105][i]} width="38" height={176 - [118, 84, 76, 105][i]} rx="7" fill="#AF52DE" opacity=".55" />
        </g>
      ))}
    </ChartSvg>
  )
}

function HorizontalBarPreview() {
  return (
    <ChartSvg>
      {[46, 78, 110, 142, 174].map((y, i) => (
        <g key={y}>
          <text x="38" y={y + 13} fontSize="11" fill="#1d1d1f" opacity=".38">Cat {i + 1}</text>
          <rect x="84" y={y} width={[170, 122, 194, 88, 146][i]} height="18" rx="9" fill="#0071E3" opacity={0.5 + i * 0.08} />
        </g>
      ))}
    </ChartSvg>
  )
}

function DumbbellPreview() {
  return (
    <ChartSvg>
      {[58, 92, 126, 160].map((y, i) => {
        const start = [84, 110, 72, 132][i]
        const end = [204, 236, 188, 248][i]
        return (
          <g key={y}>
            <line x1={start} y1={y} x2={end} y2={y} stroke="#8E8E93" strokeWidth="4" strokeLinecap="round" opacity=".25" />
            <circle cx={start} cy={y} r="8" fill="#0071E3" />
            <circle cx={end} cy={y} r="8" fill="#30D158" />
          </g>
        )
      })}
    </ChartSvg>
  )
}

function DivergingBarPreview() {
  return (
    <ChartSvg>
      <line x1="160" y1="35" x2="160" y2="180" stroke="#1d1d1f" opacity=".16" />
      {[52, 84, 116, 148, 180].map((y, i) => (
        <g key={y}>
          <rect x={160 - [72, 42, 94, 28, 56][i]} y={y} width={[72, 42, 94, 28, 56][i]} height="18" rx="9" fill="#FF453A" opacity=".68" />
          <rect x="160" y={y} width={[86, 112, 44, 128, 72][i]} height="18" rx="9" fill="#30D158" opacity=".72" />
        </g>
      ))}
    </ChartSvg>
  )
}

function SmallMultiplesPreview() {
  return (
    <ChartSvg>
      {[0, 1, 2, 3].map((index) => {
        const x = 44 + (index % 2) * 128
        const y = 44 + Math.floor(index / 2) * 78
        return (
          <g key={index}>
            <rect x={x} y={y} width="100" height="54" rx="10" fill="#0071E3" opacity=".06" stroke="#0071E3" strokeOpacity=".16" />
            {[0, 1, 2, 3].map((bar) => <rect key={bar} x={x + 16 + bar * 18} y={y + 34 - [10, 24, 16, 30][(bar + index) % 4]} width="10" height={[10, 24, 16, 30][(bar + index) % 4]} rx="4" fill="#0071E3" opacity=".72" />)}
          </g>
        )
      })}
    </ChartSvg>
  )
}

function LinePreview() {
  return (
    <ChartSvg>
      <ChartFrame />
      <path d="M45 142 C78 78 101 112 127 86 S176 48 207 76 S245 116 286 58" fill="none" stroke="#0071E3" strokeWidth="5" strokeLinecap="round" />
      {[45, 127, 207, 286].map((x, i) => <circle key={x} cx={x} cy={[142, 86, 76, 58][i]} r="5" fill="#0071E3" />)}
    </ChartSvg>
  )
}

function AreaPreview() {
  return (
    <ChartSvg>
      <ChartFrame />
      <path d="M45 146 C82 96 104 120 132 72 S190 65 218 98 S254 62 286 84 L286 176 L45 176 Z" fill="#0071E3" opacity=".16" />
      <path d="M45 146 C82 96 104 120 132 72 S190 65 218 98 S254 62 286 84" fill="none" stroke="#0071E3" strokeWidth="5" strokeLinecap="round" />
    </ChartSvg>
  )
}

function DualAxisPreview() {
  return (
    <ChartSvg>
      <ChartFrame />
      <line x1="288" y1="35" x2="288" y2="176" stroke="#30D158" opacity=".22" />
      <path d="M45 136 C80 96 110 118 140 80 S210 70 286 48" fill="none" stroke="#0071E3" strokeWidth="4" strokeLinecap="round" />
      <path d="M45 72 C88 108 114 70 148 112 S224 138 286 92" fill="none" stroke="#30D158" strokeWidth="4" strokeLinecap="round" />
    </ChartSvg>
  )
}

function StreamGraphPreview() {
  return (
    <ChartSvg>
      <path d="M42 105 C82 70 118 94 150 73 S218 82 286 58 L286 93 C224 108 184 108 150 96 S84 105 42 135 Z" fill="#0071E3" opacity=".62" />
      <path d="M42 135 C96 104 126 126 160 104 S224 104 286 93 L286 128 C228 150 184 140 154 132 S90 142 42 158 Z" fill="#30D158" opacity=".58" />
      <path d="M42 158 C94 142 134 160 166 144 S236 138 286 128 L286 162 C228 184 180 172 148 174 S84 170 42 176 Z" fill="#FF9F0A" opacity=".62" />
    </ChartSvg>
  )
}

function ConnectedScatterPreview() {
  const points = [[54, 148], [88, 92], [126, 120], [164, 72], [204, 112], [248, 60], [284, 82]]
  return (
    <ChartSvg>
      <ChartFrame />
      <polyline points={points.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#0071E3" strokeWidth="3" strokeDasharray="5 5" />
      {points.map(([x, y], index) => <circle key={`${x}-${y}`} cx={x} cy={y} r={index === 5 ? 9 : 6} fill={index === 5 ? '#FF453A' : '#0071E3'} />)}
    </ChartSvg>
  )
}

function SlopePreview() {
  return (
    <ChartSvg>
      {[54, 86, 118, 150].map((y, i) => (
        <g key={y}>
          <line x1="70" y1={y} x2="250" y2={[104, 62, 148, 92][i]} stroke={['#0071E3', '#30D158', '#FF9F0A', '#AF52DE'][i]} strokeWidth="4" strokeLinecap="round" />
          <circle cx="70" cy={y} r="6" fill={['#0071E3', '#30D158', '#FF9F0A', '#AF52DE'][i]} />
          <circle cx="250" cy={[104, 62, 148, 92][i]} r="6" fill={['#0071E3', '#30D158', '#FF9F0A', '#AF52DE'][i]} />
        </g>
      ))}
      <text x="56" y="190" fontSize="11" fill="#1d1d1f" opacity=".35">Start</text>
      <text x="234" y="190" fontSize="11" fill="#1d1d1f" opacity=".35">End</text>
    </ChartSvg>
  )
}

function PiePreview({ donut }: { donut: boolean }) {
  return (
    <ChartSvg>
      <circle cx="160" cy="105" r="68" fill="#0071E3" />
      <path d="M160 105 L160 37 A68 68 0 0 1 224 128 Z" fill="#30D158" />
      <path d="M160 105 L224 128 A68 68 0 0 1 119 159 Z" fill="#FF9F0A" />
      <path d="M160 105 L119 159 A68 68 0 0 1 160 37 Z" fill="#AF52DE" opacity=".82" />
      {donut && <circle cx="160" cy="105" r="34" fill="#FBFBFD" className="dark:fill-[#111113]" />}
    </ChartSvg>
  )
}

function SunburstPreview() {
  return (
    <ChartSvg>
      <circle cx="160" cy="105" r="26" fill="#0071E3" />
      <path d="M160 105 L160 55 A50 50 0 0 1 208 119 L185 112 A26 26 0 0 0 160 79 Z" fill="#30D158" />
      <path d="M160 105 L208 119 A50 50 0 0 1 122 138 L140 122 A26 26 0 0 0 185 112 Z" fill="#FF9F0A" />
      <path d="M160 105 L122 138 A50 50 0 0 1 160 55 L160 79 A26 26 0 0 0 140 122 Z" fill="#AF52DE" />
      <circle cx="160" cy="105" r="72" fill="none" stroke="#0071E3" strokeWidth="18" strokeDasharray="160 45 90 60" opacity=".3" />
    </ChartSvg>
  )
}

function AlluvialPreview() {
  return (
    <ChartSvg>
      <rect x="46" y="50" width="24" height="112" rx="8" fill="#0071E3" />
      <rect x="250" y="42" width="24" height="132" rx="8" fill="#30D158" />
      <path d="M70 64 C125 44 188 48 250 60" fill="none" stroke="#0071E3" strokeWidth="18" strokeLinecap="round" opacity=".35" />
      <path d="M70 104 C132 118 180 128 250 108" fill="none" stroke="#FF9F0A" strokeWidth="24" strokeLinecap="round" opacity=".42" />
      <path d="M70 148 C132 160 186 156 250 156" fill="none" stroke="#AF52DE" strokeWidth="16" strokeLinecap="round" opacity=".4" />
    </ChartSvg>
  )
}

function RadarPreview() {
  const center = [160, 105]
  const axes = [[160, 44], [224, 82], [205, 154], [115, 154], [96, 82]]
  return (
    <ChartSvg>
      {[62, 42, 22].map((r) => <polygon key={r} points={axes.map(([x, y]) => `${center[0] + (x - center[0]) * r / 62},${center[1] + (y - center[1]) * r / 62}`).join(' ')} fill="none" stroke="#1d1d1f" opacity=".08" />)}
      {axes.map(([x, y]) => <line key={`${x}-${y}`} x1={center[0]} y1={center[1]} x2={x} y2={y} stroke="#1d1d1f" opacity=".08" />)}
      <polygon points="160,58 212,88 190,138 126,145 108,88" fill="#0071E3" opacity=".2" stroke="#0071E3" strokeWidth="4" />
    </ChartSvg>
  )
}

function PolarAreaPreview() {
  return (
    <ChartSvg>
      <path d="M160 105 L160 45 A60 60 0 0 1 214 132 Z" fill="#0071E3" opacity=".78" />
      <path d="M160 105 L214 132 A60 60 0 0 1 125 158 Z" fill="#30D158" opacity=".72" />
      <path d="M160 105 L125 158 A60 60 0 0 1 104 84 Z" fill="#FF9F0A" opacity=".72" />
      <path d="M160 105 L104 84 A60 60 0 0 1 160 45 Z" fill="#AF52DE" opacity=".68" />
      <circle cx="160" cy="105" r="66" fill="none" stroke="#1d1d1f" opacity=".08" />
    </ChartSvg>
  )
}

function ScatterPreview() {
  const points = [[64, 142], [82, 124], [105, 152], [128, 102], [146, 118], [178, 78], [198, 98], [228, 62], [252, 132], [276, 48]]
  return (
    <ChartSvg>
      <ChartFrame />
      {points.map(([x, y], index) => <circle key={`${x}-${y}`} cx={x} cy={y} r={index > 7 ? 8 : 5} fill={index > 7 ? '#FF453A' : '#0071E3'} opacity={index > 7 ? 0.9 : 0.68} />)}
    </ChartSvg>
  )
}

function BubblePreview() {
  const points = [[70, 135, 12], [112, 100, 20], [154, 128, 9], [198, 72, 25], [245, 104, 16]]
  return (
    <ChartSvg>
      <ChartFrame />
      {points.map(([x, y, r], index) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={['#0071E3', '#30D158', '#FF9F0A', '#AF52DE', '#5AC8FA'][index]} opacity=".58" />)}
    </ChartSvg>
  )
}

function HeatmapPreview() {
  return (
    <ChartSvg>
      {[0, 1, 2, 3, 4].map((row) => [0, 1, 2, 3, 4].map((col) => (
        <rect key={`${row}-${col}`} x={78 + col * 35} y={34 + row * 29} width="30" height="24" rx="6" fill="#0071E3" opacity={0.16 + ((row + col * 2) % 5) * 0.16} />
      )))}
    </ChartSvg>
  )
}

function HistogramPreview() {
  return (
    <ChartSvg>
      <ChartFrame />
      {[50, 75, 100, 125, 150, 175, 200, 225, 250].map((x, i) => <rect key={x} x={x} y={[148, 132, 94, 58, 72, 104, 124, 142, 154][i]} width="21" height={176 - [148, 132, 94, 58, 72, 104, 124, 142, 154][i]} rx="4" fill="#0071E3" opacity=".72" />)}
    </ChartSvg>
  )
}

function BoxPlotPreview() {
  return (
    <ChartSvg>
      <ChartFrame />
      {[86, 160, 234].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={[48, 62, 54][i]} x2={x} y2={[164, 156, 170][i]} stroke="#0071E3" strokeWidth="3" />
          <rect x={x - 22} y={[74, 92, 84][i]} width="44" height={[50, 38, 58][i]} rx="8" fill="#0071E3" opacity=".24" stroke="#0071E3" strokeWidth="3" />
          <line x1={x - 22} y1={[98, 110, 112][i]} x2={x + 22} y2={[98, 110, 112][i]} stroke="#0071E3" strokeWidth="3" />
        </g>
      ))}
    </ChartSvg>
  )
}

function ViolinPreview() {
  return (
    <ChartSvg>
      {[92, 160, 228].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 46 C${x - 34} 72 ${x - 26} 132 ${x} 166 C${x + 26} 132 ${x + 34} 72 ${x} 46Z`} fill={['#0071E3', '#30D158', '#AF52DE'][i]} opacity=".32" stroke={['#0071E3', '#30D158', '#AF52DE'][i]} strokeWidth="3" />
          <line x1={x} y1="58" x2={x} y2="154" stroke="#1d1d1f" opacity=".18" />
        </g>
      ))}
    </ChartSvg>
  )
}

function BeeswarmPreview() {
  const dots = [[78, 136], [91, 124], [104, 139], [118, 116], [132, 130], [148, 108], [162, 124], [178, 96], [194, 112], [210, 88], [226, 105], [244, 76]]
  return (
    <ChartSvg>
      <line x1="58" y1="150" x2="270" y2="150" stroke="#1d1d1f" opacity=".12" />
      {dots.map(([x, y], i) => <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill={i % 3 === 0 ? '#30D158' : '#0071E3'} opacity=".7" />)}
    </ChartSvg>
  )
}

function DensityHeatmapPreview() {
  return (
    <ChartSvg>
      {[0, 1, 2, 3, 4, 5].map((row) => [0, 1, 2, 3, 4, 5, 6].map((col) => {
        const distance = Math.abs(row - 2.5) + Math.abs(col - 3)
        return <rect key={`${row}-${col}`} x={50 + col * 32} y={36 + row * 25} width="28" height="21" rx="5" fill={distance < 2 ? '#FF9F0A' : '#0071E3'} opacity={Math.max(0.18, 0.85 - distance * 0.14)} />
      }))}
    </ChartSvg>
  )
}

function ConvexHullPreview() {
  return (
    <ChartSvg>
      <path d="M62 136 C82 82 146 72 192 92 C232 110 232 154 190 168 C136 184 82 172 62 136Z" fill="#0071E3" opacity=".12" stroke="#0071E3" strokeWidth="3" />
      {[[82, 134], [108, 104], [136, 128], [174, 94], [204, 126], [172, 154], [118, 164]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill="#0071E3" />)}
      <circle cx="252" cy="58" r="8" fill="#FF453A" />
    </ChartSvg>
  )
}

function WordCloudPreview() {
  const words = [
    ['Sales', 88, 95, 26, '#0071E3'],
    ['Region', 122, 128, 18, '#30D158'],
    ['Growth', 174, 78, 22, '#AF52DE'],
    ['KPI', 208, 124, 24, '#FF9F0A'],
    ['Trend', 78, 136, 15, '#5AC8FA'],
  ] as const
  return (
    <ChartSvg>
      {words.map(([word, x, y, size, color]) => <text key={word} x={x} y={y} fontSize={size} fontWeight="700" fill={color} opacity=".8">{word}</text>)}
    </ChartSvg>
  )
}

function ParallelCoordinatesPreview() {
  const paths = [
    'M54 150 L104 76 L154 118 L204 58 L254 104',
    'M54 96 L104 134 L154 64 L204 122 L254 72',
    'M54 124 L104 96 L154 150 L204 86 L254 136',
  ]
  return (
    <ChartSvg>
      {[54, 104, 154, 204, 254].map((x) => <line key={x} x1={x} y1="46" x2={x} y2="168" stroke="#1d1d1f" opacity=".12" />)}
      {paths.map((path, index) => <path key={path} d={path} fill="none" stroke={['#0071E3', '#30D158', '#AF52DE'][index]} strokeWidth="3" opacity=".68" />)}
    </ChartSvg>
  )
}

function KpiCardPreview() {
  return (
    <ChartSvg>
      <rect x="70" y="52" width="180" height="106" rx="24" fill="#0071E3" opacity=".09" stroke="#0071E3" strokeOpacity=".22" />
      <text x="94" y="88" fontSize="13" fontWeight="700" fill="#1d1d1f" opacity=".45">Revenue</text>
      <text x="94" y="123" fontSize="32" fontWeight="800" fill="#0071E3">$128K</text>
      <path d="M94 140 L126 128 L158 134 L204 108" fill="none" stroke="#30D158" strokeWidth="4" strokeLinecap="round" />
    </ChartSvg>
  )
}

function KpiGridPreview() {
  return (
    <ChartSvg>
      {[0, 1, 2, 3].map((index) => {
        const x = 56 + (index % 2) * 110
        const y = 46 + Math.floor(index / 2) * 72
        return (
          <g key={index}>
            <rect x={x} y={y} width="92" height="56" rx="16" fill="#0071E3" opacity=".08" stroke="#0071E3" strokeOpacity=".18" />
            <text x={x + 14} y={y + 23} fontSize="10" fill="#1d1d1f" opacity=".42">Metric</text>
            <text x={x + 14} y={y + 43} fontSize="19" fontWeight="800" fill="#0071E3">{[42, 88, 17, 63][index]}%</text>
          </g>
        )
      })}
    </ChartSvg>
  )
}

function StatCardPreview() {
  return (
    <ChartSvg>
      <rect x="62" y="56" width="196" height="98" rx="22" fill="#30D158" opacity=".1" stroke="#30D158" strokeOpacity=".25" />
      <text x="88" y="90" fontSize="13" fontWeight="700" fill="#1d1d1f" opacity=".45">Anomaly score</text>
      <text x="88" y="126" fontSize="34" fontWeight="800" fill="#30D158">2.74</text>
      <circle cx="220" cy="105" r="22" fill="#30D158" opacity=".18" />
    </ChartSvg>
  )
}

function MissingValuesPreview() {
  return (
    <ChartSvg>
      {[58, 90, 122, 154].map((y, i) => (
        <g key={y}>
          <rect x="70" y={y} width={[162, 84, 206, 118][i]} height="18" rx="9" fill={i === 2 ? '#FF9F0A' : '#0071E3'} opacity=".68" />
          <text x="42" y={y + 13} fontSize="10" fill="#1d1d1f" opacity=".35">C{i + 1}</text>
        </g>
      ))}
    </ChartSvg>
  )
}

function DuplicateCardPreview() {
  return (
    <ChartSvg>
      <rect x="78" y="50" width="164" height="112" rx="22" fill="#FF9F0A" opacity=".1" stroke="#FF9F0A" strokeOpacity=".28" />
      <text x="106" y="88" fontSize="13" fontWeight="700" fill="#1d1d1f" opacity=".45">Duplicate rows</text>
      <text x="106" y="126" fontSize="34" fontWeight="800" fill="#FF9F0A">4.8%</text>
      <rect x="106" y="140" width="84" height="8" rx="4" fill="#FF9F0A" opacity=".35" />
    </ChartSvg>
  )
}

function NetworkPreview({ mode }: { mode: 'network' | 'correlation' }) {
  const nodes = [[76, 104], [130, 64], [176, 118], [228, 78], [240, 150], [128, 154]]
  const links = mode === 'correlation' ? [[0, 1], [1, 2], [2, 3], [2, 5], [3, 4], [5, 0]] : [[0, 2], [0, 5], [1, 2], [2, 4], [3, 4], [1, 3], [5, 4]]
  return (
    <ChartSvg>
      {links.map(([a, b]) => <line key={`${a}-${b}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#0071E3" strokeWidth={mode === 'correlation' ? 4 : 2.5} opacity={mode === 'correlation' ? .28 : .36} />)}
      {nodes.map(([x, y], index) => <circle key={`${x}-${y}`} cx={x} cy={y} r={index === 2 ? 16 : 11} fill={index === 2 ? '#AF52DE' : '#0071E3'} />)}
    </ChartSvg>
  )
}

function TreemapPreview() {
  return (
    <ChartSvg>
      <rect x="52" y="42" width="104" height="126" rx="10" fill="#0071E3" opacity=".72" />
      <rect x="162" y="42" width="100" height="66" rx="10" fill="#30D158" opacity=".68" />
      <rect x="162" y="114" width="44" height="54" rx="10" fill="#FF9F0A" opacity=".7" />
      <rect x="212" y="114" width="50" height="54" rx="10" fill="#AF52DE" opacity=".62" />
    </ChartSvg>
  )
}

function MapOutline() {
  return <path d="M56 108 C68 58 118 50 146 74 C176 48 236 58 258 106 C236 160 178 168 144 144 C106 166 48 150 56 108Z" fill="#0071E3" opacity=".07" stroke="#0071E3" strokeOpacity=".26" />
}

function MapPreview({ mode }: { mode: 'dot' | 'choropleth' | 'bubble' | 'cartogram' | 'dorling' }) {
  if (mode === 'choropleth') {
    return (
      <ChartSvg>
        <MapOutline />
        <path d="M82 96 C98 70 132 70 144 92 C130 120 100 122 82 96Z" fill="#0071E3" opacity=".72" />
        <path d="M150 88 C174 62 218 72 236 106 C216 124 174 126 150 88Z" fill="#30D158" opacity=".55" />
        <path d="M110 128 C134 110 180 118 198 144 C164 158 128 152 110 128Z" fill="#AF52DE" opacity=".48" />
      </ChartSvg>
    )
  }
  if (mode === 'cartogram' || mode === 'dorling') {
    const circles = mode === 'dorling' ? [[112, 94, 24], [156, 116, 36], [204, 88, 18], [216, 140, 26]] : [[100, 110, 32], [156, 94, 22], [204, 118, 42], [144, 148, 18]]
    return (
      <ChartSvg>
        {circles.map(([x, y, r], index) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={['#0071E3', '#30D158', '#FF9F0A', '#AF52DE'][index]} opacity=".58" />)}
      </ChartSvg>
    )
  }
  return (
    <ChartSvg>
      <MapOutline />
      {[[96, 96, 5], [130, 128, 9], [176, 86, 7], [218, 118, 13], [150, 106, 6]].map(([x, y, r], index) => <circle key={`${x}-${y}`} cx={x} cy={y} r={mode === 'bubble' ? r * 1.8 : 6} fill={index % 2 ? '#30D158' : '#0071E3'} opacity=".72" />)}
    </ChartSvg>
  )
}

function ConnectionMapPreview() {
  return (
    <ChartSvg>
      <MapOutline />
      <path d="M96 102 C132 54 190 58 226 112" fill="none" stroke="#0071E3" strokeWidth="4" strokeLinecap="round" opacity=".52" />
      <path d="M118 132 C150 110 178 112 212 86" fill="none" stroke="#30D158" strokeWidth="4" strokeLinecap="round" opacity=".52" />
      {[[96, 102], [226, 112], [118, 132], [212, 86]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill="#0071E3" />)}
    </ChartSvg>
  )
}

function CircularGraphPreview() {
  const nodes = Array.from({ length: 8 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2
    return [160 + Math.cos(angle) * 68, 105 + Math.sin(angle) * 68]
  })
  return (
    <ChartSvg>
      <circle cx="160" cy="105" r="68" fill="none" stroke="#1d1d1f" opacity=".08" />
      {[[0, 3], [1, 5], [2, 6], [4, 7], [0, 6]].map(([a, b]) => <path key={`${a}-${b}`} d={`M${nodes[a][0]} ${nodes[a][1]} Q160 105 ${nodes[b][0]} ${nodes[b][1]}`} fill="none" stroke="#0071E3" strokeWidth="3" opacity=".35" />)}
      {nodes.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="8" fill="#0071E3" />)}
    </ChartSvg>
  )
}

function ArcDiagramPreview() {
  const xs = [60, 92, 124, 156, 188, 220, 252]
  return (
    <ChartSvg>
      <line x1="52" y1="154" x2="260" y2="154" stroke="#1d1d1f" opacity=".12" />
      {[[0, 3], [1, 5], [2, 4], [3, 6]].map(([a, b]) => <path key={`${a}-${b}`} d={`M${xs[a]} 154 Q${(xs[a] + xs[b]) / 2} ${70 - (b - a) * 6} ${xs[b]} 154`} fill="none" stroke="#0071E3" strokeWidth="3" opacity=".5" />)}
      {xs.map((x) => <circle key={x} cx={x} cy="154" r="7" fill="#0071E3" />)}
    </ChartSvg>
  )
}

function TimeNetworkPreview() {
  return (
    <ChartSvg>
      {[62, 120, 178, 236].map((x, i) => (
        <g key={x}>
          <line x1={x} y1="54" x2={x} y2="160" stroke="#1d1d1f" opacity=".08" />
          <circle cx={x} cy={[116, 82, 132, 70][i]} r="10" fill="#0071E3" />
        </g>
      ))}
      <path d="M62 116 C92 78 100 82 120 82 C148 84 154 132 178 132 C205 132 212 70 236 70" fill="none" stroke="#30D158" strokeWidth="4" strokeLinecap="round" opacity=".55" />
      <text x="52" y="184" fontSize="10" fill="#1d1d1f" opacity=".35">t1</text>
      <text x="226" y="184" fontSize="10" fill="#1d1d1f" opacity=".35">t4</text>
    </ChartSvg>
  )
}
