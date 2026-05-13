import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publishApi } from '../api/platform'
import BrandLogo from '../components/BrandLogo'

export default function PublicReportPage() {
  const { token } = useParams()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    publishApi.publicReport(token).then(setData).catch(() => setError('Report link is not available.'))
  }, [token])

  if (error) return <div className="min-h-screen flex items-center justify-center text-[#FF453A]">{error}</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center"><span className="w-7 h-7 rounded-full border-2 border-[#0071E3]/20 border-t-[#0071E3] animate-spin" /></div>

  const report = data.report || {}
  return (
    <main className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[#1d1d1f] dark:text-white py-8 px-4">
      <article className="max-w-[840px] mx-auto bg-white dark:bg-[#161618] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl shadow-sm p-8 print:shadow-none print:border-0">
        <div className="report-print-brand" aria-label="Made by Daflow">
          <img src="/brand/daflow-mark-blue.png" alt="" />
          <span>Made by Daflow</span>
        </div>
        <header className="border-b border-black/[0.07] dark:border-white/[0.08] pb-5 mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#0071E3] font-semibold">
              <BrandLogo size="xs" showText={false} />
              <span>Daflow Publish</span>
            </p>
            <h1 className="text-[28px] font-semibold tracking-tight mt-1">{report.title || 'Report'}</h1>
            {report.workflow_name && <p className="text-[13px] text-[#1d1d1f]/45 dark:text-white/45 mt-2">{report.workflow_name}</p>}
          </div>
          {data.link?.allow_export && <button onClick={() => window.print()} className="h-9 px-4 rounded-lg bg-[#0071E3] text-white text-[13px] font-medium print:hidden">Print</button>}
        </header>
        {(report.sections || []).map((section: any, index: number) => (
          <section key={index} className="mb-6 break-inside-avoid">
            <h2 className="text-[17px] font-semibold mb-2">{section.node_label || section.section_type || `Section ${index + 1}`}</h2>
            {section.content && <p className="text-[13px] leading-relaxed text-[#1d1d1f]/65 dark:text-white/65 whitespace-pre-wrap">{section.content}</p>}
            {section.data && Object.keys(section.data).length > 0 && (
              <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-black/[0.04] dark:bg-white/[0.05] p-3 text-[11px] text-[#1d1d1f]/60 dark:text-white/60">{JSON.stringify(section.data, null, 2)}</pre>
            )}
          </section>
        ))}
      </article>
    </main>
  )
}
