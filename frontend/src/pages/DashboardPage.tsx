import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { executionsApi } from '../api/executions'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'
import { AnomalyChart, CorrelationHeatmap, DistributionChart, StatisticsChart } from '../components/charts'
import '../components/charts/chartSetup'
import { Bar, Doughnut } from 'react-chartjs-2'

// ── Inline Markdown renderer (shared with ReportDetailPage) ───────────────────
function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white mt-5 mb-2 first:mt-0">{renderInline(line.slice(3))}</h3>)
    } else if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-[12px] font-semibold text-[#1d1d1f]/80 dark:text-white/80 mt-4 mb-1.5">{renderInline(line.slice(4))}</h4>)
    } else if (line.match(/^(\d+)\. /)) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && lines[i].match(/^(\d+)\. /)) {
        const m = lines[i].match(/^(\d+)\. (.*)/)!
        listItems.push(<li key={i} className="flex gap-2 text-[12px] text-[#1d1d1f]/75 dark:text-white/75 leading-relaxed"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] text-[10px] font-semibold flex items-center justify-center mt-0.5">{m[1]}</span><span>{renderInline(m[2])}</span></li>)
        i++
      }
      elements.push(<ol key={`ol-${i}`} className="space-y-2 my-2">{listItems}</ol>)
      continue
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(<li key={i} className="flex gap-2 text-[12px] text-[#1d1d1f]/75 dark:text-white/75 leading-relaxed"><span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#1d1d1f]/30 dark:bg-white/30 mt-2" /><span>{renderInline(lines[i].slice(2))}</span></li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-1.5 my-2">{listItems}</ul>)
      continue
    } else if (line.trim() !== '') {
      elements.push(<p key={i} className="text-[12px] text-[#1d1d1f]/75 dark:text-white/75 leading-relaxed">{renderInline(line)}</p>)
    }
    i++
  }
  return <div className="space-y-1">{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-[#1d1d1f] dark:text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

interface Panel {
  type: string
  title: string
  data?: Record<string, unknown>
  kpis?: { label: string; value: number | string }[]
  stats?: { label: string; value: number | string }[]
  strong_pairs?: { col_a: string; col_b: string; correlation: number; direction: string }[]
  column?: string
  skewness?: number
  kurtosis?: number
  skewness_label?: string
}

interface DashboardConfig {
  title: string
  panels: Panel[]
  generated_at: string
}

export default function DashboardPage() {
  const { executionId } = useParams()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { t } = useI18n()
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiPanel, setAiPanel] = useState(false)
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (!executionId) return
    setLoading(true)

    executionsApi.getStatus(executionId).then(async (status) => {
      const nodeIds = status.node_statuses
        .filter((n) => n.status === 'success')
        .map((n) => n.node_id)

      if (nodeIds.length === 0) {
        setError('No completed nodes found in this execution')
        setLoading(false)
        return
      }

      // Scan all successful node results to find dashboard_config
      for (const nodeId of nodeIds) {
        try {
          const result = await executionsApi.getNodeResult(executionId, nodeId)
          const dc = result.output?.dashboard_config as DashboardConfig | undefined
          if (dc && dc.panels) {
            setConfig(dc)
            setLoading(false)
            return
          }
        } catch {
          // skip this node
        }
      }

      setError('No dashboard node found in this execution')
      setLoading(false)
    }).catch(() => {
      setError('Failed to load execution')
      setLoading(false)
    })
  }, [executionId])

  const handleAiAnalyze = async () => {
    if (!executionId || aiLoading) return
    setAiPanel(true)
    if (aiInsights) return
    setAiLoading(true)
    try {
      const result = await executionsApi.getAiSummary(executionId)
      setAiInsights(result.insights)
    } catch {
      setAiInsights('[AI analysis failed. Please check your API key configuration.]')
    } finally {
      setAiLoading(false)
    }
  }

  const handlePrint = () => window.print()

  const renderPanel = (panel: Panel, i: number) => {
    const card = (children: React.ReactNode) => (
      <div
        key={i}
        className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] p-5 shadow-sm"
      >
        <h3 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white mb-3">{panel.title}</h3>
        {children}
      </div>
    )

    switch (panel.type) {
      case 'kpi_grid':
        return card(
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {panel.kpis?.map((kpi, j) => (
              <div key={j} className="bg-[#F5F5F7] dark:bg-[#111113] rounded-xl p-3 text-center">
                <p className="text-[10px] text-[#1d1d1f]/40 dark:text-white/40 mb-1">{kpi.label}</p>
                <p className="text-[16px] font-bold text-[#1d1d1f] dark:text-white">
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : kpi.value}
                </p>
              </div>
            ))}
          </div>
        )

      case 'stat_card':
        return card(
          <div className="grid grid-cols-2 gap-3">
            {panel.stats?.map((s, j) => (
              <div key={j} className="flex justify-between items-center py-1.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                <span className="text-[11px] text-[#1d1d1f]/50 dark:text-white/50">{s.label}</span>
                <span className="text-[12px] font-semibold text-[#1d1d1f] dark:text-white">{String(s.value)}</span>
              </div>
            ))}
          </div>
        )

      case 'bar_chart': {
        const d = panel.data as { labels: string[]; datasets: { label: string; data: number[] }[] } | undefined
        if (!d) return null
        return card(
          <div className="h-56">
            <Bar
              data={{
                labels: d.labels,
                datasets: d.datasets.map((ds) => ({
                  ...ds,
                  backgroundColor: 'rgba(0, 113, 227, 0.5)',
                  borderRadius: 3,
                })),
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
            />
          </div>
        )
      }

      case 'histogram': {
        const d = panel.data as { labels: string[]; datasets: { label: string; data: number[] }[] } | undefined
        if (!d) return null
        return card(
          <div className="space-y-2">
            <div className="h-52">
              <Bar
                data={{
                  labels: d.labels,
                  datasets: d.datasets.map((ds) => ({
                    ...ds,
                    backgroundColor: 'rgba(191, 90, 242, 0.5)',
                    borderColor: 'rgba(191, 90, 242, 0.8)',
                    borderWidth: 1,
                    borderRadius: 2,
                  })),
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { ticks: { maxTicksLimit: 10 } } },
                }}
              />
            </div>
            {panel.skewness != null && (
              <div className="flex gap-3 text-[10px] opacity-50">
                <span>Skew: {panel.skewness.toFixed(3)} ({panel.skewness_label})</span>
                {panel.kurtosis != null && <span>Kurtosis: {panel.kurtosis.toFixed(3)}</span>}
              </div>
            )}
          </div>
        )
      }

      case 'heatmap': {
        const matrix = panel.data as Record<string, Record<string, number>> | undefined
        if (!matrix) return null
        return card(
          <CorrelationHeatmap matrix={matrix} strongPairs={panel.strong_pairs} />
        )
      }

      case 'donut_chart': {
        const d = panel.data as { labels: string[]; datasets: { data: number[] }[] } | undefined
        if (!d || !d.datasets?.[0]) return null
        const colors = ['#0071E3', '#30D158', '#BF5AF2', '#F5A623', '#FF453A', '#5AC8FA', '#FF9F0A']
        return card(
          <div className="h-52 flex items-center justify-center">
            <Doughnut
              data={{
                labels: d.labels,
                datasets: [{
                  data: d.datasets[0].data,
                  backgroundColor: d.labels.map((_, i) => colors[i % colors.length]),
                  borderWidth: 0,
                }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }}
            />
          </div>
        )
      }

      case 'statistics_chart_panel': {
        const stats = panel.data?.statistics as Record<string, Record<string, number>> | undefined
        if (!stats) return card(<p className="text-[11px] opacity-40">No data</p>)
        return card(<StatisticsChart statistics={stats} />)
      }

      case 'anomaly_chart_panel': {
        const chartData = panel.data?.chart_data as Record<string, { indices: number[]; values: (number | null)[]; is_anomaly: boolean[] }> | undefined
        if (!chartData) return card(<p className="text-[11px] opacity-40">No data</p>)
        return card(<AnomalyChart chartData={chartData} method={panel.data?.method as string} />)
      }

      case 'correlation_chart_panel': {
        const matrix = panel.data?.correlation_matrix as Record<string, Record<string, number>> | undefined
        if (!matrix) return card(<p className="text-[11px] opacity-40">No data</p>)
        return card(
          <CorrelationHeatmap
            matrix={matrix}
            strongPairs={panel.data?.strong_pairs as { col_a: string; col_b: string; correlation: number; direction: string }[]}
          />
        )
      }

      case 'distribution_chart_panel': {
        const dists = panel.data?.distributions as Record<string, { histogram: { counts: number[]; bin_centers: number[]; bin_edges: number[] }; kde: { x: number[]; y: number[] }; skewness: number; kurtosis: number; skewness_label: string }> | undefined
        if (!dists) return card(<p className="text-[11px] opacity-40">No data</p>)
        return card(<DistributionChart distributions={dists} />)
      }

      default:
        return card(<pre className="text-[10px] opacity-40">{JSON.stringify(panel, null, 2)}</pre>)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113]">
      {/* Header */}
      <header className="h-12 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/[0.07] flex items-center px-6 gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
          {config?.title || 'Dashboard'}
        </h1>
        <span className="text-[11px] text-[#1d1d1f]/30 dark:text-white/30">
          {config?.generated_at ? new Date(config.generated_at).toLocaleString() : ''}
        </span>
        <div className="flex-1" />
        <button
          onClick={toggleTheme}
          className="print:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#1d1d1f]/40 dark:text-white/40 hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
        >
          {isDark ? '☀' : '☽'}
        </button>
        <button
          onClick={handlePrint}
          className="print:hidden flex items-center gap-1.5 text-[12px] text-[#1d1d1f]/50 dark:text-white/50 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] px-3 h-8 rounded-lg transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M4 6V2h8v4M4 12H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4 9h8v5H4V9z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Print
        </button>
        <button
          onClick={handleAiAnalyze}
          disabled={aiLoading}
          className="print:hidden flex items-center gap-1.5 text-[12px] font-medium bg-gradient-to-r from-[#BF5AF2]/10 to-[#0071E3]/10 dark:from-[#BF5AF2]/15 dark:to-[#0071E3]/15 text-[#BF5AF2] hover:from-[#BF5AF2]/20 hover:to-[#0071E3]/20 px-3 h-8 rounded-lg transition-all disabled:opacity-50"
        >
          {aiLoading ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#BF5AF2]/30 border-t-[#BF5AF2] animate-spin" />
          ) : (
            <span className="text-[14px]">✦</span>
          )}
          AI Analyze
        </button>
      </header>

      {/* AI Slide-in Panel */}
      {aiPanel && (
        <div className="print:hidden fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={() => setAiPanel(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#1C1C1E] border-l border-black/[0.07] dark:border-white/[0.07] h-full flex flex-col shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-gradient-to-r from-[#BF5AF2]/5 to-transparent">
              <span className="text-[16px] text-[#BF5AF2]">✦</span>
              <h2 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white flex-1">AI Analysis</h2>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#BF5AF2]/10 text-[#BF5AF2]">Gemini</span>
              <button
                onClick={() => setAiPanel(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1d1d1f]/30 dark:text-white/30 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-5">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#BF5AF2]/20 border-t-[#BF5AF2] animate-spin" />
                  <p className="text-[12px] text-[#1d1d1f]/40 dark:text-white/40">Analysing your data...</p>
                </div>
              ) : aiInsights ? (
                <MarkdownBlock content={aiInsights} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <span className="w-8 h-8 border-3 border-[#0071E3]/20 border-t-[#0071E3] rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-[#FF453A] text-[13px]">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-[12px] text-[#0071E3] hover:underline"
            >
              ← Go back
            </button>
          </div>
        )}

        {config && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {config.panels.map((panel, i) => renderPanel(panel, i))}
          </div>
        )}
      </main>
    </div>
  )
}
