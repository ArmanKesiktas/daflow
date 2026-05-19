import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publishApi } from '../api/platform'
import { Bar, Doughnut } from 'react-chartjs-2'
import '../components/charts/chartSetup'
import BrandLogo from '../components/BrandLogo'
import LoadingState from '../components/ui/LoadingState'

export default function PublicDashboardPage() {
  const { token } = useParams()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    publishApi.publicDashboard(token).then(setData).catch(() => setError('Dashboard link is not available.'))
  }, [token])

  if (error) return <PublicError message={error} />
  if (!data) return <PublicLoading />

  const dashboard = data.dashboard || {}
  const panels = dashboard.panels || []
  return (
    <main className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] p-6 text-[#1d1d1f] dark:text-white">
      <section className="max-w-7xl mx-auto">
        <header className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#0071E3] font-semibold">
              <BrandLogo size="xs" showText={false} />
              <span>Daflow Publish</span>
            </p>
            <h1 className="text-[28px] font-semibold tracking-tight mt-1">{dashboard.title || 'Dashboard'}</h1>
          </div>
          {data.link?.allow_export && <button onClick={() => window.print()} className="h-9 px-4 rounded-lg bg-[#0071E3] text-white text-[13px] font-medium print:hidden">Print</button>}
        </header>
        <div className="aspect-video rounded-3xl bg-white dark:bg-[#161618] border border-black/[0.08] dark:border-white/[0.08] p-5 shadow-sm overflow-auto">
          <div className="grid grid-cols-12 auto-rows-[120px] gap-4">
            {panels.map((panel: any, index: number) => (
              <article key={panel.id || index} className="col-span-12 md:col-span-6 xl:col-span-4 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-[#FBFBFD] dark:bg-white/[0.04] p-4 min-h-[220px]">
                <h2 className="text-[15px] font-semibold truncate">{panel.title || panel.type || 'Chart'}</h2>
                {panel.description && <p className="text-[12px] text-[#1d1d1f]/45 dark:text-white/45 mt-1 line-clamp-2">{panel.description}</p>}
                <div className="mt-4 h-[150px]">
                  <PublicPanelChart panel={panel} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function PublicPanelChart({ panel }: { panel: any }) {
  if (panel.type === 'kpi_card') {
    const kpi = panel.kpi || panel.stats?.[0] || {}
    return (
      <div className="h-full min-h-28 rounded-lg bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] px-4 py-3 flex flex-col justify-center">
        <p className="text-[10px] text-[#1d1d1f]/40 dark:text-white/40 truncate">{kpi.label || panel.title}</p>
        <p className="text-[28px] font-semibold truncate">{String(kpi.value ?? '-')}</p>
      </div>
    )
  }
  if (panel.type === 'kpi_grid') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(panel.kpis || panel.stats || []).slice(0, 6).map((item: any, index: number) => (
          <div key={index} className="rounded-lg bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] px-3 py-2">
            <p className="text-[9px] text-[#1d1d1f]/40 dark:text-white/40 truncate">{item.label}</p>
            <p className="text-[15px] font-semibold truncate">{String(item.value)}</p>
          </div>
        ))}
      </div>
    )
  }
  if (panel.type === 'stat_card') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(panel.stats || []).slice(0, 6).map((item: any, index: number) => (
          <div key={index} className="rounded-lg bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] px-3 py-2">
            <p className="text-[9px] text-[#1d1d1f]/40 dark:text-white/40 truncate">{item.label}</p>
            <p className="text-[14px] font-semibold truncate">{String(item.value)}</p>
          </div>
        ))}
      </div>
    )
  }
  const data = panel.data as { labels?: string[]; datasets?: { label?: string; data?: number[] }[] } | undefined
  if ((panel.type === 'donut_chart' || panel.type === 'pie_chart') && data?.labels?.length && data.datasets?.[0]?.data?.length) {
    const colors = ['#0071E3', '#30D158', '#BF5AF2', '#F5A623', '#FF453A', '#5AC8FA']
    return <Doughnut data={{ labels: data.labels, datasets: [{ data: data.datasets[0].data, backgroundColor: data.labels.map((_: string, i: number) => colors[i % colors.length]), borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
  }
  if (panel.network?.nodes?.length) return <PublicNetworkSketch panel={panel} />
  if (panel.map_points?.length) return <PublicMapSketch panel={panel} />
  if (data?.labels?.length) {
    return (
      <Bar
        data={{
          labels: data.labels,
          datasets: (data.datasets || []).map((dataset) => ({ label: dataset.label, data: dataset.data || [], backgroundColor: 'rgba(0,113,227,0.52)', borderRadius: 4 })),
        }}
        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { boxWidth: 10 } } }, scales: { x: { ticks: { maxTicksLimit: 7 } } } }}
      />
    )
  }
  return <div className="h-full rounded-xl bg-[#0071E3]/10 flex items-center justify-center text-[12px] text-[#1d1d1f]/35 dark:text-white/35">No chart data</div>
}

function PublicNetworkSketch({ panel }: { panel: any }) {
  const nodes = (panel.network?.nodes || []).slice(0, 10)
  const links = panel.network?.links || []
  const coords = nodes.map((node: any, index: number) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length)
    return { ...node, x: 50 + Math.cos(angle) * 34, y: 50 + Math.sin(angle) * 32 }
  })
  const byId = new Map(coords.map((node: any) => [node.id, node]))
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {links.slice(0, 18).map((link: any, index: number) => {
        const a = byId.get(String(link.source)) as any
        const b = byId.get(String(link.target)) as any
        return a && b ? <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,113,227,0.35)" strokeWidth={1.5} /> : null
      })}
      {coords.map((node: any) => <circle key={node.id} cx={node.x} cy={node.y} r="4.5" fill="#0071E3" />)}
    </svg>
  )
}

function PublicMapSketch({ panel }: { panel: any }) {
  const points = panel.map_points || []
  const max = Math.max(...points.map((point: any) => Number(point.value) || 1), 1)
  return (
    <svg viewBox="0 0 100 64" className="w-full h-full">
      <path d="M12 28 C20 10 35 12 46 20 C58 6 78 16 86 31 C76 49 55 55 39 47 C26 55 12 45 12 28Z" fill="rgba(0,113,227,0.08)" stroke="rgba(0,113,227,0.22)" />
      {points.slice(0, 12).map((point: any, index: number) => (
        <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r={3 + (Number(point.value) / max) * 5} fill="rgba(0,113,227,0.58)" />
      ))}
    </svg>
  )
}

function PublicLoading() {
  return <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] px-6 py-10"><LoadingState variant="grid" rows={6} message="Loading dashboard..." /></div>
}

function PublicError({ message }: { message: string }) {
  return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#111113] text-[#FF453A] text-sm">{message}</div>
}
