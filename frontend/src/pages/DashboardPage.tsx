import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { executionsApi } from '../api/executions'
import { publishApi } from '../api/platform'
import { useI18n } from '../i18n'
import { DashboardPanelChart } from '../components/charts/DashboardPanelChart'
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
