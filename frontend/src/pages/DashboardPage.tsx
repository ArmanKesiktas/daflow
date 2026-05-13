import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bar, Doughnut } from 'react-chartjs-2'
import toast from 'react-hot-toast'
import { executionsApi } from '../api/executions'
import { publishApi } from '../api/platform'
import { useI18n } from '../i18n'
import { CorrelationHeatmap } from '../components/charts'
import { DashboardPanelChart } from '../components/charts/DashboardPanelChart'
import '../components/charts/chartSetup'
import {
  applyFilters,
  enhancePanelForRows,
  inferFilterDefinitions,
  numericExtent,
  paginatePanels,
  professionalDescription,
  professionalTitle,
  uniqueValues,
  type DashboardFilterDefinition,
  type DashboardFilterState,
  type DashboardLang,
  type DashboardPageModel,
  type DashboardSourceData,
  type EnhancedPanel,
} from '../utils/dashboardEnhancements'

interface DashboardConfig {
  title: string
  panels: EnhancedPanel[]
  pages?: DashboardPageModel[]
  filters?: DashboardFilterDefinition[]
  source_data?: DashboardSourceData
  generated_at: string
}

function ui(lang: DashboardLang, en: string, tr: string) {
  return lang === 'tr' ? tr : en
}

const BAR_COMPATIBLE_TYPES = new Set([
  'bar_chart', 'horizontal_bar_chart', 'histogram', 'clustered_bar_chart', 'stacked_bar_chart',
  'overlapping_bars', 'dumbbell_chart', 'diverging_bar_chart', 'small_multiples', 'dual_axis_chart',
  'slope_chart', 'parallel_coordinates', 'beeswarm_plot', 'density_heatmap', 'stream_graph',
])
const COMPOSITION_SKETCH_TYPES = new Set(['treemap', 'sunburst', 'alluvial_diagram', 'word_cloud'])
const NETWORK_SKETCH_TYPES = new Set(['correlation_network', 'network_diagram', 'connection_map', 'circular_graph', 'arc_diagram', 'time_based_network_diagram'])
const MAP_SKETCH_TYPES = new Set(['dot_map', 'choropleth_map', 'bubble_map', 'cartogram', 'dorling_cartogram'])

export default function DashboardPage() {
  const { executionId } = useParams()
  const navigate = useNavigate()
  const { lang } = useI18n()
  const dashLang = lang as DashboardLang
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [panels, setPanels] = useState<EnhancedPanel[]>([])
  const [filters, setFilters] = useState<Record<string, DashboardFilterState>>({})
  const [activePage, setActivePage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiPanel, setAiPanel] = useState(false)
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [exportAllowed, setExportAllowed] = useState(true)
  const [dashboardTheme, setDashboardTheme] = useState<'clean' | 'presentation' | 'executive'>('clean')
  const [publishUrl, setPublishUrl] = useState('')

  const storageKey = executionId ? `daflow_dashboard_layout_${executionId}` : ''

  useEffect(() => {
    if (!executionId) return
    setLoading(true)
    setError(null)
    executionsApi.getExportPermission(executionId)
      .then((result) => setExportAllowed(result.allowed))
      .catch(() => setExportAllowed(false))

    executionsApi.getStatus(executionId).then(async (status) => {
      const nodeIds = status.node_statuses.filter((n) => n.status === 'success').map((n) => n.node_id)
      for (const nodeId of nodeIds) {
        try {
          const result = await executionsApi.getNodeResult(executionId, nodeId)
          const dashboardConfig = result.output?.dashboard_config as DashboardConfig | undefined
          if (dashboardConfig?.panels) {
            const saved = readSavedPanels(storageKey)
            const nextPanels = saved?.length ? mergeSavedPanels(dashboardConfig.panels, saved) : dashboardConfig.panels
            setConfig(dashboardConfig)
            setPanels(nextPanels.map((panel, index) => ({
              ...panel,
              id: panel.id ?? `chart_${index + 1}`,
              title: panel.title || professionalTitle(panel, dashLang),
              description: panel.description || professionalDescription(panel, dashLang),
              layout: panel.layout ?? { x: 0, y: 0, w: index % 3 === 0 ? 12 : 6, h: 3 },
            })))
            setLoading(false)
            return
          }
        } catch {
          // Keep scanning successful node outputs.
        }
      }
      setError(ui(dashLang, 'No dashboard node found in this execution.', 'Bu çalıştırmada dashboard düğümü bulunamadı.'))
      setLoading(false)
    }).catch(() => {
      setError(ui(dashLang, 'Failed to load execution.', 'Çalıştırma yüklenemedi.'))
      setLoading(false)
    })
  }, [dashLang, executionId, storageKey])

  const records = config?.source_data?.records ?? []
  const columns = config?.source_data?.columns ?? []
  const filterDefinitions = config?.filters?.length ? config.filters : inferFilterDefinitions(config?.source_data)
  const filteredRecords = useMemo(() => applyFilters(records, filters), [records, filters])
  const visiblePanels = useMemo(() => {
    return panels.map((panel) => {
      const base = {
        ...panel,
        title: panel.title || professionalTitle(panel, dashLang),
        description: panel.description || professionalDescription(panel, dashLang),
      }
      return enhancePanelForRows(base, filteredRecords, columns, dashLang)
    })
  }, [columns, dashLang, filteredRecords, panels])
  const pages = useMemo(() => paginatePanels(visiblePanels), [visiblePanels])
  const currentPage = pages[Math.min(activePage, Math.max(0, pages.length - 1))]

  useEffect(() => {
    if (activePage > pages.length - 1) setActivePage(Math.max(0, pages.length - 1))
  }, [activePage, pages.length])

  const savePanels = (next: EnhancedPanel[]) => {
    setPanels(next)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const handleAiAnalyze = async () => {
    if (!executionId || aiLoading) return
    setAiPanel(true)
    if (aiInsights) return
    setAiLoading(true)
    try {
      const result = await executionsApi.getAiSummary(executionId, dashLang === 'tr' ? 'tr' : 'en')
      setAiInsights(result.insights)
    } catch {
      setAiInsights(ui(dashLang, 'AI analysis failed. Check the API key configuration.', 'AI analizi başarısız oldu. API anahtarı yapılandırmasını kontrol edin.'))
    } finally {
      setAiLoading(false)
    }
  }

  const updatePanel = (id: string, patch: Partial<EnhancedPanel>) => {
    savePanels(panels.map((panel) => (panel.id === id ? { ...panel, ...patch } : panel)))
  }

  const movePanel = (id: string, direction: -1 | 1) => {
    const index = panels.findIndex((panel) => panel.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= panels.length) return
    const next = [...panels]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    savePanels(next)
  }

  const removePanel = (id: string) => savePanels(panels.filter((panel) => panel.id !== id))
  const handlePrint = () => {
    if (!exportAllowed) {
      toast.error('You do not have permission to perform this action.')
      return
    }
    window.print()
  }

  const handleExportPng = () => {
    if (!exportAllowed) {
      toast.error('You do not have permission to perform this action.')
      return
    }
    const canvas = document.querySelector('.dashboard-screen-canvas canvas') as HTMLCanvasElement | null
    if (!canvas) {
      toast.error(ui(dashLang, 'No chart canvas is ready to export yet.', 'Dışa aktarılacak grafik henüz hazır değil.'))
      return
    }
    const link = document.createElement('a')
    link.download = `${config?.title || 'dashboard'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handlePublish = async () => {
    if (!executionId) return
    try {
      const link = await publishApi.dashboard(executionId, { enabled: true, allow_export: false })
      const url = `${window.location.origin}${link.url}`
      setPublishUrl(url)
      await navigator.clipboard?.writeText(url)
      toast.success(ui(dashLang, 'Publish link copied.', 'Yayın linki kopyalandı.'))
    } catch {
      toast.error(ui(dashLang, 'Publish link could not be created.', 'Yayın linki oluşturulamadı.'))
    }
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <header className="max-w-[1500px] mx-auto px-6 pt-6 flex items-center gap-3 print:hidden">
        <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-sm inline-flex items-center justify-center text-[var(--color-text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label="Go back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-7 text-[var(--color-text-primary)] truncate">{config?.title || ui(dashLang, 'Dashboard', 'Dashboard')}</h1>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {filteredRecords.length > 0 ? `${filteredRecords.length.toLocaleString()} / ${(config?.source_data?.row_count ?? records.length).toLocaleString()} ${ui(dashLang, 'rows', 'satır')}` : config?.generated_at ? new Date(config.generated_at).toLocaleString() : ''}
          </p>
        </div>
        <div className="flex-1" />
        <select
          value={dashboardTheme}
          onChange={(event) => setDashboardTheme(event.target.value as typeof dashboardTheme)}
          className="h-8 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-xs px-2 outline-none text-[var(--color-text-secondary)] border border-[var(--color-border-default)]"
        >
          <option value="clean">{ui(dashLang, 'Clean', 'Sade')}</option>
          <option value="presentation">{ui(dashLang, 'Presentation', 'Sunum')}</option>
          <option value="executive">{ui(dashLang, 'Executive', 'Yönetici')}</option>
        </select>
        <button data-tour="dashboard-export" onClick={handleExportPng} disabled={!exportAllowed} className="h-8 px-3 rounded-md text-xs text-[var(--color-text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-150">PNG</button>
        <button onClick={handlePublish} className="h-8 px-3 rounded-md text-xs text-[var(--color-text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-all duration-150">{ui(dashLang, 'Publish', 'Yayınla')}</button>
        <button onClick={handlePrint} disabled={!exportAllowed} className="h-8 px-3 rounded-md text-xs text-[var(--color-text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-150">{ui(dashLang, 'Print', 'Yazdır')}</button>
        <button onClick={handleAiAnalyze} disabled={aiLoading} className="h-8 px-3 rounded-md text-xs font-medium bg-black/[0.05] dark:bg-white/[0.07] text-[var(--color-text-secondary)] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-150">
          {aiLoading ? ui(dashLang, 'Analysing...', 'Analiz ediliyor...') : ui(dashLang, 'AI Analyze', 'AI Analiz')}
        </button>
      </header>

      {aiPanel && (
        <AiPanel lang={dashLang} insights={aiInsights} loading={aiLoading} onClose={() => setAiPanel(false)} />
      )}
      {publishUrl && (
        <div className="dropdown-popover dropdown-popover-right fixed right-4 top-16 z-30 max-w-sm rounded-lg border border-[var(--color-border-default)] bg-surface shadow-xl p-4 print:hidden">
          <p className="text-xs font-semibold text-[var(--color-text-primary)]">{ui(dashLang, 'Published dashboard', 'Dashboard yayınlandı')}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-1">{publishUrl}</p>
        </div>
      )}

      <main className="max-w-[1500px] mx-auto px-6 py-6 print:p-0">
        {loading && <div className="h-80 flex items-center justify-center"><span className="w-6 h-6 border-2 border-[var(--color-border-default)] border-t-[var(--color-text-secondary)] rounded-full animate-spin" /></div>}
        {error && <div className="py-20 text-center text-[13px] text-danger">{error}</div>}

        {config && (
          <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
            <FilterPanel
              lang={dashLang}
              records={records}
              definitions={filterDefinitions}
              filters={filters}
              onChange={setFilters}
            />

            <section className="min-w-0 space-y-4">
              <div className="flex items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  {pages.map((page, index) => (
                    <button
                      key={page.pageNumber}
                      onClick={() => setActivePage(index)}
                      className={`h-8 px-3 rounded-md text-xs transition-colors ${index === activePage ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-surface)]' : 'bg-surface text-[var(--color-text-secondary)] border border-[var(--color-border-default)]'}`}
                    >
                      {ui(dashLang, 'Page', 'Sayfa')} {page.pageNumber}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">1920 × 1080 · 16:9</p>
              </div>

              {filteredRecords.length === 0 && records.length > 0 ? (
                <div className="aspect-video rounded-lg bg-surface border border-[var(--color-border-default)] shadow-sm flex items-center justify-center text-[13px] text-[var(--color-text-muted)]">
                  {ui(dashLang, 'No rows match the selected filters.', 'Seçili filtrelerle eşleşen veri yok.')}
                </div>
              ) : (
                <div data-tour="dashboard-canvas" className={`dashboard-screen-canvas aspect-video border rounded-lg shadow-sm overflow-auto ${
                  dashboardTheme === 'executive'
                    ? 'bg-[#0B1020] border-white/[0.10]'
                    : dashboardTheme === 'presentation'
                      ? 'bg-page-bg border-[var(--color-border-default)]'
                      : 'bg-surface border-[var(--color-border-default)]'
                }`}>
                  <div className="min-h-full p-4 grid grid-cols-12 auto-rows-[minmax(86px,1fr)] gap-4">
                    {(currentPage?.charts ?? []).map((panel) => (
                      <DashboardCard
                        key={panel.id}
                        panel={panel}
                        lang={dashLang}
                        onUpdate={updatePanel}
                        onMove={movePanel}
                        onRemove={removePanel}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="dashboard-print-pages" aria-hidden="true">
                {pages.map((page) => (
                  <div key={page.pageNumber} className="dashboard-print-page">
                    <div className="dashboard-print-header">
                      <div>
                        <p>{config.title}</p>
                        <h2>{ui(dashLang, 'Page', 'Sayfa')} {page.pageNumber}</h2>
                      </div>
                      <span>1920 × 1080</span>
                    </div>
                    <div className="dashboard-print-grid">
                      {page.charts.map((panel) => (
                        <DashboardPrintCard key={panel.id} panel={panel} lang={dashLang} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function DashboardPrintCard({ panel, lang }: { panel: EnhancedPanel; lang: DashboardLang }) {
  const w = panel.layout?.w ?? 6
  const h = panel.layout?.h ?? 3
  return (
    <article
      className="dashboard-print-card"
      style={{ gridColumn: `span ${Math.min(12, Math.max(3, w))}`, gridRow: `span ${Math.min(8, Math.max(2, h))}` }}
    >
      <header>
        <h3>{panel.title}</h3>
        {panel.description && <p>{panel.description}</p>}
      </header>
      <div className="dashboard-print-chart">
        <PanelChart panel={panel} lang={lang} />
      </div>
    </article>
  )
}

function FilterPanel({
  lang,
  records,
  definitions,
  filters,
  onChange,
}: {
  lang: DashboardLang
  records: Record<string, unknown>[]
  definitions: DashboardFilterDefinition[]
  filters: Record<string, DashboardFilterState>
  onChange: (filters: Record<string, DashboardFilterState>) => void
}) {
  const update = (column: string, state: DashboardFilterState) => onChange({ ...filters, [column]: state })
  const clear = () => onChange({})

  return (
    <aside className="print:hidden rounded-lg bg-surface border border-[var(--color-border-default)] shadow-sm p-4 h-fit sticky top-16">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{ui(lang, 'Filters', 'Filtreler')}</h2>
        <button onClick={clear} className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors duration-150">{ui(lang, 'Reset', 'Sıfırla')}</button>
      </div>
      {definitions.length === 0 ? (
        <p className="text-[11px] text-[var(--color-text-muted)]">{ui(lang, 'No filterable columns found.', 'Filtrelenebilir kolon bulunamadı.')}</p>
      ) : (
        <div className="space-y-3">
          {definitions.map((definition) => (
            <FilterControl
              key={definition.column}
              lang={lang}
              records={records}
              definition={definition}
              value={filters[definition.column] ?? {}}
              onChange={(state) => update(definition.column, state)}
            />
          ))}
        </div>
      )}
    </aside>
  )
}

function FilterControl({
  lang,
  records,
  definition,
  value,
  onChange,
}: {
  lang: DashboardLang
  records: Record<string, unknown>[]
  definition: DashboardFilterDefinition
  value: DashboardFilterState
  onChange: (value: DashboardFilterState) => void
}) {
  const label = definition.label
  if (definition.type === 'multi_select') {
    const options = uniqueValues(records, definition.column)
    return (
      <label className="block">
        <span className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-1">{label}</span>
        <select
          multiple
          value={value.selected ?? []}
          onChange={(event) => onChange({ selected: Array.from(event.currentTarget.selectedOptions).map((option) => option.value) })}
          className="w-full min-h-20 rounded-lg bg-black/[0.035] dark:bg-white/[0.05] border border-[var(--color-border-default)] text-[11px] p-2 text-[var(--color-text-primary)]"
        >
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    )
  }
  if (definition.type === 'range') {
    const extent = numericExtent(records, definition.column)
    return (
      <div>
        <span className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-1">{label}</span>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder={extent ? String(extent.min) : 'min'} value={value.min ?? ''} onChange={(e) => onChange({ ...value, min: e.target.value === '' ? undefined : Number(e.target.value) })} className="h-8 rounded-lg bg-black/[0.035] dark:bg-white/[0.05] border border-[var(--color-border-default)] px-2 text-[11px] text-[var(--color-text-primary)]" />
          <input type="number" placeholder={extent ? String(extent.max) : 'max'} value={value.max ?? ''} onChange={(e) => onChange({ ...value, max: e.target.value === '' ? undefined : Number(e.target.value) })} className="h-8 rounded-lg bg-black/[0.035] dark:bg-white/[0.05] border border-[var(--color-border-default)] px-2 text-[11px] text-[var(--color-text-primary)]" />
        </div>
      </div>
    )
  }
  if (definition.type === 'date_range') {
    return (
      <div>
        <span className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-1">{label}</span>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={value.start ?? ''} onChange={(e) => onChange({ ...value, start: e.target.value })} className="h-8 rounded-lg bg-black/[0.035] dark:bg-white/[0.05] border border-[var(--color-border-default)] px-2 text-[11px] text-[var(--color-text-primary)]" />
          <input type="date" value={value.end ?? ''} onChange={(e) => onChange({ ...value, end: e.target.value })} className="h-8 rounded-lg bg-black/[0.035] dark:bg-white/[0.05] border border-[var(--color-border-default)] px-2 text-[11px] text-[var(--color-text-primary)]" />
        </div>
      </div>
    )
  }
  return (
    <label className="block">
      <span className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-1">{label}</span>
      <select value={value.bool ?? ''} onChange={(e) => onChange({ bool: e.target.value as 'true' | 'false' | '' })} className="w-full h-8 rounded-lg bg-black/[0.035] dark:bg-white/[0.05] border border-[var(--color-border-default)] px-2 text-[11px] text-[var(--color-text-primary)]">
        <option value="">{ui(lang, 'All', 'Tümü')}</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    </label>
  )
}

function DashboardCard({
  panel,
  lang,
  onUpdate,
  onMove,
  onRemove,
}: {
  panel: EnhancedPanel
  lang: DashboardLang
  onUpdate: (id: string, patch: Partial<EnhancedPanel>) => void
  onMove: (id: string, direction: -1 | 1) => void
  onRemove: (id: string) => void
}) {
  const id = panel.id ?? panel.title
  const w = panel.layout?.w ?? 6
  const h = panel.layout?.h ?? 3
  return (
    <article
      data-tour="dashboard-card"
      className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm p-4 flex flex-col min-h-0"
      style={{ gridColumn: `span ${Math.min(12, Math.max(3, w))}`, gridRow: `span ${Math.min(8, Math.max(2, h))}` }}
    >
      <div className="flex items-start gap-3 mb-3 print:hidden">
        <div className="min-w-0 flex-1 space-y-1">
          <input value={panel.title} onChange={(e) => onUpdate(id, { title: e.target.value })} className="w-full bg-transparent text-[13px] font-semibold text-[var(--color-text-primary)] outline-none" />
          <input value={panel.description ?? ''} onChange={(e) => onUpdate(id, { description: e.target.value })} className="w-full bg-transparent text-[11px] text-[var(--color-text-muted)] outline-none" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(id, -1)} className="w-7 h-7 rounded-sm inline-flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-[var(--color-text-muted)] transition-all duration-150" aria-label="Move up">↑</button>
          <button onClick={() => onMove(id, 1)} className="w-7 h-7 rounded-sm inline-flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-[var(--color-text-muted)] transition-all duration-150" aria-label="Move down">↓</button>
          <select value={String(w)} onChange={(e) => onUpdate(id, { layout: { ...(panel.layout ?? { x: 0, y: 0, h }), w: Number(e.target.value) } })} className="h-7 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[10px] text-[var(--color-text-primary)] border border-[var(--color-border-default)]">
            <option value="4">S</option>
            <option value="6">M</option>
            <option value="12">L</option>
          </select>
          <button onClick={() => onRemove(id)} className="w-7 h-7 rounded-sm inline-flex items-center justify-center hover:bg-danger/10 text-danger transition-all duration-150" aria-label="Remove panel">×</button>
        </div>
      </div>
      <div className="hidden print:block mb-3">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{panel.title}</h3>
        <p className="text-[11px] text-[var(--color-text-secondary)]">{panel.description}</p>
      </div>
      <div className="min-h-0 flex-1">
        <PanelChart panel={panel} lang={lang} />
      </div>
    </article>
  )
}

function PanelChart({ panel, lang }: { panel: EnhancedPanel; lang: DashboardLang }) {
  return <DashboardPanelChart panel={panel} lang={lang} />
}

function LegacyPanelChart({ panel, lang }: { panel: EnhancedPanel; lang: DashboardLang }) {
  if (panel.type === 'kpi_card') {
    const kpi = (panel as EnhancedPanel & { kpi?: { label?: string; value?: unknown } }).kpi
    const fallback = panel.stats?.[0]
    const label = kpi?.label ?? fallback?.label ?? panel.title
    const value = kpi?.value ?? fallback?.value ?? '-'
    return (
      <div className="h-full min-h-32 rounded-lg bg-surface border border-[var(--color-border-subtle)] shadow-sm p-4 flex flex-col justify-center">
        <p className="text-[11px] text-[var(--color-text-muted)] truncate">{String(label)}</p>
        <p className="mt-2 text-3xl leading-none font-semibold tracking-tight text-[var(--color-text-primary)] truncate">
          {typeof value === 'number' ? value.toLocaleString() : String(value)}
        </p>
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">{ui(lang, 'KPI card', 'KPI kartı')}</p>
      </div>
    )
  }
  if (panel.type === 'kpi_grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {(panel.kpis ?? []).slice(0, 12).map((kpi, index) => (
          <div key={index} className="rounded-lg bg-surface border border-[var(--color-border-subtle)] px-3 py-2">
            <p className="text-[9px] text-[var(--color-text-muted)] truncate">{kpi.label}</p>
            <p className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
          </div>
        ))}
      </div>
    )
  }
  if (panel.type === 'stat_card') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(panel.stats ?? []).map((stat, index) => (
          <div key={index} className="rounded-lg bg-surface border border-[var(--color-border-subtle)] px-3 py-2">
            <p className="text-[9px] text-[var(--color-text-muted)] truncate">{stat.label}</p>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{String(stat.value)}</p>
          </div>
        ))}
      </div>
    )
  }
  if (BAR_COMPATIBLE_TYPES.has(panel.type)) {
    const data = panel.data as { labels?: string[]; datasets?: { label?: string; data?: number[] }[] } | undefined
    if (!data?.labels?.length) return <EmptyChart lang={lang} />
    return (
      <Bar
        data={{
          labels: data.labels,
          datasets: (data.datasets ?? []).map((dataset) => ({
            ...dataset,
            data: dataset.data ?? [],
            backgroundColor: panel.type === 'histogram' || panel.type === 'density_heatmap' ? 'rgba(191, 90, 242, 0.52)' : 'rgba(0, 113, 227, 0.52)',
            borderRadius: 4,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true, labels: { boxWidth: 10 } }, tooltip: { enabled: true } },
          scales: { x: { ticks: { maxTicksLimit: 8 } }, y: { title: { display: true, text: ui(lang, 'Value', 'Değer') } } },
        }}
      />
    )
  }
  if (panel.type === 'heatmap') {
    const matrix = panel.data as Record<string, Record<string, number>> | undefined
    return matrix ? <CorrelationHeatmap matrix={matrix} strongPairs={panel.strong_pairs} /> : <EmptyChart lang={lang} />
  }
  if (NETWORK_SKETCH_TYPES.has(panel.type)) {
    return <NetworkSketch panel={panel} />
  }
  if (MAP_SKETCH_TYPES.has(panel.type)) {
    return <MapSketch panel={panel} lang={lang} />
  }
  if (COMPOSITION_SKETCH_TYPES.has(panel.type)) {
    return <CompositionSketch panel={panel} />
  }
  if (panel.type === 'donut_chart' || panel.type === 'pie_chart') {
    const data = panel.data as { labels?: string[]; datasets?: { data?: number[] }[] } | undefined
    if (!data?.labels?.length || !data.datasets?.[0]?.data?.length) return <EmptyChart lang={lang} />
    const colors = ['var(--color-primary)', 'var(--color-success)', '#BF5AF2', '#F5A623', 'var(--color-danger)', '#5AC8FA', 'var(--color-warning)']
    return (
      <Doughnut
        data={{ labels: data.labels, datasets: [{ data: data.datasets[0].data, backgroundColor: data.labels.map((_, i) => colors[i % colors.length]), borderWidth: 0 }] }}
        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }}
      />
    )
  }
  return <pre className="text-[10px] opacity-40 overflow-auto">{JSON.stringify(panel, null, 2)}</pre>
}

function NetworkSketch({ panel }: { panel: EnhancedPanel }) {
  const network = (panel as EnhancedPanel & { network?: { nodes?: { id: string; label?: string }[]; links?: { source: string; target: string; value?: number }[] } }).network
  const nodes = (network?.nodes ?? []).slice(0, 10)
  if (!nodes.length) return <EmptyChart lang="en" />
  const links = network?.links ?? []
  const coords = nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length)
    return { ...node, x: 50 + Math.cos(angle) * 34, y: 50 + Math.sin(angle) * 32 }
  })
  const byId = new Map(coords.map((node) => [node.id, node]))
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full rounded-lg bg-surface">
      {links.slice(0, 18).map((link, index) => {
        const a = byId.get(String(link.source))
        const b = byId.get(String(link.target))
        if (!a || !b) return null
        return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,113,227,0.35)" strokeWidth={1 + Math.min(2, Number(link.value ?? 0) * 2)} />
      })}
      {coords.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r="4.5" fill="var(--color-primary)" />
          <text x={node.x} y={node.y + 9} textAnchor="middle" fontSize="4.2" fill="currentColor">{String(node.label ?? node.id).slice(0, 10)}</text>
        </g>
      ))}
    </svg>
  )
}

function MapSketch({ panel, lang }: { panel: EnhancedPanel; lang: DashboardLang }) {
  const points = (panel as EnhancedPanel & { map_points?: { label: string; value: number; x: number; y: number }[] }).map_points ?? []
  if (!points.length) return <EmptyChart lang={lang} />
  const max = Math.max(...points.map((point) => Number(point.value) || 1), 1)
  return (
    <svg viewBox="0 0 100 64" className="w-full h-full rounded-lg bg-surface">
      <path d="M12 28 C20 10 35 12 46 20 C58 6 78 16 86 31 C76 49 55 55 39 47 C26 55 12 45 12 28Z" fill="rgba(0,113,227,0.08)" stroke="rgba(0,113,227,0.22)" />
      {points.slice(0, 12).map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r={3 + (Number(point.value) / max) * 5} fill="rgba(0,113,227,0.58)" />
          <text x={point.x} y={point.y + 10} textAnchor="middle" fontSize="4" fill="currentColor">{point.label.slice(0, 8)}</text>
        </g>
      ))}
    </svg>
  )
}

function CompositionSketch({ panel }: { panel: EnhancedPanel }) {
  const data = panel.data as { labels?: string[]; datasets?: { data?: number[] }[] } | undefined
  const labels = data?.labels ?? []
  const values = data?.datasets?.[0]?.data ?? []
  if (!labels.length || !values.length) return <EmptyChart lang="en" />
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0) || 1
  return (
    <div className="h-full grid grid-cols-2 gap-2">
      {labels.slice(0, 8).map((label, index) => {
        const pct = Math.max(12, (Number(values[index] || 0) / total) * 100)
        return (
          <div key={label} className="rounded-lg bg-surface border border-[var(--color-border-subtle)] p-2 overflow-hidden">
            <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
              <div className="h-full bg-primary/60" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <p className="mt-2 text-[10px] truncate text-[var(--color-text-secondary)]">{label}</p>
            <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{Number(values[index] || 0).toLocaleString()}</p>
          </div>
        )
      })}
    </div>
  )
}

function EmptyChart({ lang }: { lang: DashboardLang }) {
  return <div className="h-full min-h-32 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-center text-[11px] text-[var(--color-text-muted)]">{ui(lang, 'No data for this chart.', 'Bu grafik için veri yok.')}</div>
}

function AiPanel({ lang, insights, loading, onClose }: { lang: DashboardLang; insights: string | null; loading: boolean; onClose: () => void }) {
  return (
    <div className="print:hidden fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-surface border-l border-[var(--color-border-default)] shadow-xl flex flex-col">
        <div className="px-4 py-4 border-b border-[var(--color-border-subtle)] flex items-center gap-3">
          <span className="text-[var(--color-text-muted)]">✦</span>
          <h2 className="text-[15px] font-semibold flex-1 text-[var(--color-text-primary)]">{ui(lang, 'AI Analysis', 'AI Analiz')}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-sm inline-flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-[var(--color-text-muted)] transition-all duration-150" aria-label="Close panel">×</button>
        </div>
        <div className="p-4 overflow-y-auto text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {loading ? <div className="h-40 flex items-center justify-center"><span className="w-6 h-6 border-2 border-[var(--color-border-default)] border-t-[var(--color-text-secondary)] rounded-full animate-spin" /></div> : <MarkdownBlock content={insights ?? ''} />}
        </div>
      </aside>
    </div>
  )
}

function MarkdownBlock({ content }: { content: string }) {
  if (!content) return null
  return (
    <div className="space-y-2">
      {content.split('\n').filter(Boolean).map((line, index) => {
        if (line.startsWith('## ')) return <h3 key={index} className="text-[13px] font-semibold text-[var(--color-text-primary)] mt-4">{line.slice(3)}</h3>
        if (line.startsWith('- ')) return <p key={index} className="pl-3 border-l border-[var(--color-border-default)]">{line.slice(2)}</p>
        return <p key={index}>{line}</p>
      })}
    </div>
  )
}

function readSavedPanels(key: string): EnhancedPanel[] | null {
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as EnhancedPanel[] : null
  } catch {
    return null
  }
}

function mergeSavedPanels(base: EnhancedPanel[], saved: EnhancedPanel[]) {
  const baseById = new Map(base.map((panel, index) => [panel.id ?? `chart_${index + 1}`, panel]))
  return saved
    .filter((panel) => baseById.has(panel.id ?? ''))
    .map((panel) => ({ ...baseById.get(panel.id ?? '')!, ...panel }))
}
