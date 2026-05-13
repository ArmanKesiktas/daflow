import { Bar, Doughnut, Line, Scatter } from 'react-chartjs-2'
import { CorrelationHeatmap } from './index'
import './chartSetup'
import type { DashboardLang, EnhancedPanel } from '../../utils/dashboardEnhancements'

function ui(lang: DashboardLang, en: string, tr: string) {
  return lang === 'tr' ? tr : en
}

const BAR_COMPATIBLE_TYPES = new Set([
  'bar_chart', 'horizontal_bar_chart', 'histogram', 'clustered_bar_chart', 'stacked_bar_chart',
  'overlapping_bars', 'dumbbell_chart', 'diverging_bar_chart', 'small_multiples', 'dual_axis_chart',
  'slope_chart', 'parallel_coordinates', 'beeswarm_plot', 'density_heatmap', 'stream_graph',
])
const LINE_COMPATIBLE_TYPES = new Set(['line_chart', 'area_chart'])
const SCATTER_COMPATIBLE_TYPES = new Set(['scatter_plot', 'bubble_chart', 'connected_scatter_plot', 'convex_hull_chart'])
const COMPOSITION_SKETCH_TYPES = new Set(['treemap', 'sunburst', 'alluvial_diagram', 'word_cloud'])
const NETWORK_SKETCH_TYPES = new Set(['correlation_network', 'network_diagram', 'connection_map', 'circular_graph', 'arc_diagram', 'time_based_network_diagram'])
const MAP_SKETCH_TYPES = new Set(['dot_map', 'choropleth_map', 'bubble_map', 'cartogram', 'dorling_cartogram'])

export function DashboardPanelChart({ panel, lang }: { panel: EnhancedPanel; lang: DashboardLang }) {
  if (panel.type === 'kpi_card') {
    const kpi = (panel as EnhancedPanel & { kpi?: { label?: string; value?: unknown } }).kpi
    const fallback = panel.stats?.[0]
    const label = kpi?.label ?? fallback?.label ?? panel.title
    const value = kpi?.value ?? fallback?.value ?? '-'
    return (
      <div className="h-full min-h-32 rounded-xl bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] p-5 flex flex-col justify-center">
        <p className="text-[11px] text-[#1d1d1f]/45 dark:text-white/45 truncate">{String(label)}</p>
        <p className="mt-2 text-[32px] leading-none font-semibold tracking-tight text-[#1d1d1f] dark:text-white truncate">
          {typeof value === 'number' ? value.toLocaleString() : String(value)}
        </p>
        <p className="mt-2 text-[10px] text-[#1d1d1f]/35 dark:text-white/35">{ui(lang, 'KPI card', 'KPI kartı')}</p>
      </div>
    )
  }
  if (panel.type === 'kpi_grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {(panel.kpis ?? []).slice(0, 12).map((kpi, index) => (
          <div key={index} className="rounded-lg bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] px-3 py-2">
            <p className="text-[9px] text-[#1d1d1f]/40 dark:text-white/40 truncate">{kpi.label}</p>
            <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
          </div>
        ))}
      </div>
    )
  }
  if (panel.type === 'stat_card') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(panel.stats ?? []).map((stat, index) => (
          <div key={index} className="rounded-lg bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] px-3 py-2">
            <p className="text-[9px] text-[#1d1d1f]/40 dark:text-white/40 truncate">{stat.label}</p>
            <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white truncate">{String(stat.value)}</p>
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
          indexAxis: panel.type === 'horizontal_bar_chart' ? 'y' : 'x',
          plugins: { legend: { display: true, labels: { boxWidth: 10 } }, tooltip: { enabled: true } },
          scales: { x: { ticks: { maxTicksLimit: 8 } }, y: { title: { display: true, text: ui(lang, 'Value', 'Değer') } } },
        }}
      />
    )
  }
  if (LINE_COMPATIBLE_TYPES.has(panel.type)) {
    const data = panel.data as { labels?: string[]; datasets?: { label?: string; data?: number[] }[] } | undefined
    if (!data?.labels?.length) return <EmptyChart lang={lang} />
    return (
      <Line
        data={{
          labels: data.labels,
          datasets: (data.datasets ?? []).map((dataset) => ({
            ...dataset,
            data: dataset.data ?? [],
            borderColor: 'rgba(0, 113, 227, 0.86)',
            backgroundColor: panel.type === 'area_chart' ? 'rgba(0, 113, 227, 0.14)' : 'rgba(0, 113, 227, 0.18)',
            fill: panel.type === 'area_chart',
            tension: 0.35,
            pointRadius: 2.5,
          })),
        }}
        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { boxWidth: 10 } } }, scales: { x: { ticks: { maxTicksLimit: 8 } } } }}
      />
    )
  }
  if (SCATTER_COMPATIBLE_TYPES.has(panel.type)) {
    const points = ((panel as EnhancedPanel & { points?: { x: number; y: number; r?: number }[] }).points ?? []).map((point) => ({ x: point.x, y: point.y }))
    if (!points.length) return <EmptyChart lang={lang} />
    return (
      <Scatter
        data={{ datasets: [{ label: panel.title, data: points, backgroundColor: 'rgba(0,113,227,0.62)', pointRadius: panel.type === 'bubble_chart' ? 8 : 5 }] }}
        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { boxWidth: 10 } } } }}
      />
    )
  }
  if (panel.type === 'heatmap') {
    const matrix = panel.data as Record<string, Record<string, number>> | undefined
    return matrix ? <CorrelationHeatmap matrix={matrix} strongPairs={panel.strong_pairs} /> : <EmptyChart lang={lang} />
  }
  if (NETWORK_SKETCH_TYPES.has(panel.type)) return <NetworkSketch panel={panel} />
  if (MAP_SKETCH_TYPES.has(panel.type)) return <MapSketch panel={panel} lang={lang} />
  if (COMPOSITION_SKETCH_TYPES.has(panel.type)) return <CompositionSketch panel={panel} />
  if (panel.type === 'donut_chart' || panel.type === 'pie_chart' || panel.type === 'polar_area_chart') {
    const data = panel.data as { labels?: string[]; datasets?: { data?: number[] }[] } | undefined
    if (!data?.labels?.length || !data.datasets?.[0]?.data?.length) return <EmptyChart lang={lang} />
    const colors = ['#0071E3', '#30D158', '#BF5AF2', '#F5A623', '#FF453A', '#5AC8FA', '#FF9F0A']
    return (
      <Doughnut
        data={{ labels: data.labels, datasets: [{ data: data.datasets[0].data, backgroundColor: data.labels.map((_, i) => colors[i % colors.length]), borderWidth: 0 }] }}
        options={{ responsive: true, maintainAspectRatio: false, cutout: panel.type === 'pie_chart' || panel.type === 'polar_area_chart' ? '0%' : '55%', plugins: { legend: { position: 'right' } } }}
      />
    )
  }
  return <pre className="text-[10px] opacity-40 overflow-auto">{JSON.stringify(panel, null, 2)}</pre>
}

export function buildDashboardPreviewPanel(type: string): EnhancedPanel {
  const base = {
    id: `preview_${type}`,
    type,
    title: previewTitle(type),
    description: 'Dashboard renderer preview',
    layout: { x: 0, y: 0, w: 6, h: 3 },
  } as EnhancedPanel
  if (type === 'kpi_card') return { ...base, kpi: { label: 'Revenue', value: 128430 }, stats: [{ label: 'Revenue', value: 128430 }] } as EnhancedPanel
  if (type === 'kpi_grid') return { ...base, kpis: [{ label: 'Rows', value: 1240 }, { label: 'Avg', value: 68.4 }, { label: 'Missing', value: '2.1%' }, { label: 'Score', value: 91 }] } as EnhancedPanel
  if (type === 'stat_card' || type === 'duplicate_rate_card') return { ...base, stats: [{ label: 'Duplicate rate', value: '4.8%' }, { label: 'Rows affected', value: 58 }] } as EnhancedPanel
  if (type === 'heatmap') return { ...base, data: { Sales: { Sales: 1, Profit: 0.78, Cost: -0.22 }, Profit: { Sales: 0.78, Profit: 1, Cost: -0.41 }, Cost: { Sales: -0.22, Profit: -0.41, Cost: 1 } } } as EnhancedPanel
  if (NETWORK_SKETCH_TYPES.has(type)) return { ...base, network: previewNetwork() } as EnhancedPanel
  if (MAP_SKETCH_TYPES.has(type)) return { ...base, map_points: previewMapPoints() } as EnhancedPanel
  if (SCATTER_COMPATIBLE_TYPES.has(type)) return { ...base, points: [{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 4 }, { x: 4, y: 8 }, { x: 5, y: 6 }, { x: 6, y: 9 }] } as EnhancedPanel
  if (type === 'donut_chart' || type === 'pie_chart' || type === 'polar_area_chart' || COMPOSITION_SKETCH_TYPES.has(type)) {
    return { ...base, data: { labels: ['North', 'South', 'East', 'West'], datasets: [{ label: 'Share', data: [42, 28, 18, 12] }] } } as EnhancedPanel
  }
  return { ...base, data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], datasets: [{ label: 'Sales', data: [32, 58, 44, 76, 62] }, { label: 'Profit', data: [18, 35, 28, 46, 40] }] } } as EnhancedPanel
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
    <svg viewBox="0 0 100 100" className="w-full h-full rounded-xl bg-white dark:bg-[#111113]">
      {links.slice(0, 18).map((link, index) => {
        const a = byId.get(String(link.source))
        const b = byId.get(String(link.target))
        if (!a || !b) return null
        return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,113,227,0.35)" strokeWidth={1 + Math.min(2, Number(link.value ?? 0) * 2)} />
      })}
      {coords.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r="4.5" fill="#0071E3" />
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
    <svg viewBox="0 0 100 64" className="w-full h-full rounded-xl bg-white dark:bg-[#111113]">
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
          <div key={label} className="rounded-lg bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] p-2 overflow-hidden">
            <div className="h-2 rounded-full bg-[#0071E3]/15 overflow-hidden">
              <div className="h-full bg-[#0071E3]/60" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <p className="mt-2 text-[10px] truncate text-[#1d1d1f]/55 dark:text-white/55">{label}</p>
            <p className="text-[12px] font-semibold">{Number(values[index] || 0).toLocaleString()}</p>
          </div>
        )
      })}
    </div>
  )
}

function EmptyChart({ lang }: { lang: DashboardLang }) {
  return <div className="h-full min-h-32 rounded-lg bg-black/[0.025] dark:bg-white/[0.035] flex items-center justify-center text-[11px] text-[#1d1d1f]/35 dark:text-white/35">{ui(lang, 'No data for this chart.', 'Bu grafik için veri yok.')}</div>
}

function previewNetwork() {
  return {
    nodes: ['Sales', 'Profit', 'Cost', 'Region', 'Segment', 'Date'].map((label) => ({ id: label, label })),
    links: [
      { source: 'Sales', target: 'Profit', value: 0.8 },
      { source: 'Sales', target: 'Region', value: 0.5 },
      { source: 'Cost', target: 'Profit', value: 0.4 },
      { source: 'Segment', target: 'Region', value: 0.6 },
      { source: 'Date', target: 'Sales', value: 0.7 },
    ],
  }
}

function previewMapPoints() {
  return [
    { label: 'North', value: 42, x: 28, y: 24 },
    { label: 'East', value: 68, x: 56, y: 31 },
    { label: 'West', value: 30, x: 42, y: 44 },
    { label: 'South', value: 55, x: 72, y: 40 },
  ]
}

function previewTitle(type: string) {
  return type.split('_').map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(' ')
}
