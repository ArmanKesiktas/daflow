import { useI18n } from '../i18n'

export default function HelpPage() {
  const { lang } = useI18n()
  const tr = lang === 'tr'
  const articles = tr ? [
    ['Workflow nasıl kurulur?', 'Dosyanızı yükleyin, hazırlık ve analiz node’larını bağlayın, sonuna dashboard veya rapor ekleyip çalıştırın.'],
    ['Dashboard nasıl hazırlanır?', 'Chart node’larını kullanarak grafik tipini, başlığını ve metriğini ayarlayın; sonra bu chart node’larını dashboard node’una bağlayın.'],
    ['Workspace paylaşımı', 'Workspace içinde üye davet edin, rol seçin ve takımın dosya, workflow, dashboard ve rapor erişimini yönetin.'],
  ] : [
    ['How to build a workflow', 'Upload a file, connect preparation and analysis nodes, then attach a dashboard or report node and run.'],
    ['How to prepare dashboards', 'Use chart nodes to configure chart type, title and metrics; then connect those chart nodes into a dashboard node.'],
    ['Workspace sharing', 'Invite members, choose a role, and manage team access to files, workflows, dashboards and reports.'],
  ]
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#0071E3] font-semibold">{tr ? 'Yardım Merkezi' : 'Help Center'}</p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
        {tr ? 'Daflow’u daha hızlı kullanın' : 'Use Daflow faster'}
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#1d1d1f]/45 dark:text-white/45">
        {tr ? 'Kısa ürün rehberleri, workflow kurulumundan takım paylaşımına kadar temel adımları açıklar.' : 'Short product guides explain the core steps from workflow setup to team sharing.'}
      </p>
      <section data-tour="help-articles" className="mt-8 grid md:grid-cols-3 gap-4">
        {articles.map(([title, body]) => (
          <article key={title} className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-white/[0.04] p-5">
            <h2 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-white">{title}</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[#1d1d1f]/50 dark:text-white/50">{body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
