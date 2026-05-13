import { useNavigate, useParams } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'

type PageKind = 'about' | 'blog' | 'updates'

const content = {
  about: {
    eyebrow: { tr: 'About Daflow', en: 'About Daflow' },
    title: { tr: 'Daflow veri analizi için görsel bir çalışma alanıdır.', en: 'Daflow is a visual workspace for data analysis.' },
    intro: {
      tr: 'Daflow, CSV ve Excel verilerini node tabanlı workflowlarla işleyip dashboard, rapor ve paylaşılabilir çıktılara dönüştürmek için tasarlandı.',
      en: 'Daflow is designed to turn CSV and Excel datasets into dashboards, reports, and shareable outputs through node-based workflows.',
    },
    sections: [
      {
        title: { tr: 'Neyi çözer?', en: 'What it solves' },
        body: {
          tr: 'Tekrarlayan veri temizleme, keşifsel analiz, grafik üretimi ve raporlama adımlarını aynı canvas üzerinde görünür hale getirir. Kullanıcı bir dosya yükler, node’ları bağlar ve sonucu çalıştırır.',
          en: 'It makes repetitive data cleaning, exploratory analysis, charting, and reporting steps visible on one canvas. A user uploads a file, connects nodes, and runs the result.',
        },
      },
      {
        title: { tr: 'Kimler için?', en: 'Who it is for' },
        body: {
          tr: 'Veri analistleri, öğrenciler, operasyon ekipleri ve teknik olmayan ekip arkadaşları için uygundur. Kod yazmadan analiz akışını anlamak ve paylaşmak isteyen kullanıcıları hedefler.',
          en: 'It fits analysts, students, operations teams, and non-technical teammates who need to understand and share analysis flows without writing glue code.',
        },
      },
      {
        title: { tr: 'Platform yapısı', en: 'Platform shape' },
        body: {
          tr: 'Workflow editörü, dataset library, template marketplace, dashboard, rapor, workspace ve yorum sistemleri aynı ürün deneyimi içinde çalışır.',
          en: 'The workflow editor, dataset library, template marketplace, dashboards, reports, workspaces, and comments operate as one product experience.',
        },
      },
    ],
  },
  blog: {
    eyebrow: { tr: 'Blog', en: 'Blog' },
    title: { tr: 'Daflow ile veri analizi akışlarını daha okunabilir tasarlamak', en: 'Designing more readable analysis flows with Daflow' },
    intro: {
      tr: 'Bu sayfa Daflow’un kullanım mantığını, iyi workflow tasarımı önerilerini ve dashboard üretim yaklaşımını anlatan kısa ürün yazıları içerir.',
      en: 'This page contains short product articles about Daflow’s workflow model, good flow design, and dashboard generation approach.',
    },
    sections: [
      {
        title: { tr: '1. Workflow önce okunabilir olmalı', en: '1. A workflow should be readable first' },
        body: {
          tr: 'İyi bir workflow sadece çalışan bir otomasyon değildir; ekip arkadaşının da anlayabileceği bir analiz haritasıdır. Daflow’da kaynak, hazırlık, analiz, grafik ve çıktı node’ları kategori renkleriyle ayrılır.',
          en: 'A good workflow is not only automation that runs; it is an analysis map a teammate can understand. Daflow separates source, preparation, analysis, chart, and output nodes by category.',
        },
      },
      {
        title: { tr: '2. Dashboard node’u sonuç değil, sunum katmanıdır', en: '2. The dashboard node is a presentation layer' },
        body: {
          tr: 'Dashboard, bağlı chart node’larından gelen panelleri toplar. Böylece grafik ayarları ilgili chart node’unda kalır, dashboard ise düzen, tema ve sayfalama görevini üstlenir.',
          en: 'A dashboard collects panels from connected chart nodes. Chart configuration stays on the chart node, while the dashboard handles layout, theme, and paging.',
        },
      },
      {
        title: { tr: '3. Template iyi başlangıç noktasıdır', en: '3. Templates are good starting points' },
        body: {
          tr: 'Quick EDA, Data Quality, Relationship Map veya Big Data Processing gibi template’ler kullanıcıya boş canvas yerine hazır bir analiz iskeleti verir.',
          en: 'Templates such as Quick EDA, Data Quality, Relationship Map, and Big Data Processing give users a ready analysis structure instead of a blank canvas.',
        },
      },
    ],
  },
  updates: {
    eyebrow: { tr: 'Güncellemeler', en: 'Updates' },
    title: { tr: 'Son ürün geliştirmeleri', en: 'Recent product updates' },
    intro: {
      tr: 'Daflow üzerinde eklenen önemli özelliklerin kısa ve anlaşılır değişiklik notları.',
      en: 'Short, clear release notes for important Daflow product additions.',
    },
    sections: [
      {
        title: { tr: 'Workspace collaboration', en: 'Workspace collaboration' },
        body: {
          tr: 'Workspace seçici, proje yapısı, üyeler, roller, davetler, yorumlar ve activity feed eklendi. Dosya, workflow, dashboard ve raporlar aktif workspace bağlamında yönetiliyor.',
          en: 'Workspace switcher, projects, members, roles, invitations, comments, and activity feed were added. Files, workflows, dashboards, and reports are managed in the active workspace context.',
        },
      },
      {
        title: { tr: 'Dashboard ve rapor üretimi', en: 'Dashboard and report generation' },
        body: {
          tr: 'Dashboardlarda KPI kartları, 16:9 sunum düzeni, filtre mantığı, yazdırma/PDF iyileştirmeleri ve raporda A4 çıktı akışı geliştirildi.',
          en: 'Dashboards gained KPI cards, 16:9 presentation layout, filter logic, print/PDF improvements, and reports gained an A4 output flow.',
        },
      },
      {
        title: { tr: 'Template ve node deneyimi', en: 'Template and node experience' },
        body: {
          tr: 'Template önizleme, node arama, chart preview, ara düğüm, big data node’ları ve workflow başlangıç kamerası gibi editor deneyimi geliştirmeleri eklendi.',
          en: 'Template previews, node search, chart preview, router node, big data nodes, and editor camera defaults improved the workflow authoring experience.',
        },
      },
    ],
  },
}

export default function MarketingInfoPage({ kind: explicitKind }: { kind?: PageKind }) {
  const params = useParams()
  const kind = explicitKind || (params.kind as PageKind) || 'about'
  const page = content[kind] || content.about
  const { lang, setLang } = useI18n()
  const { isDark, toggleTheme } = useTheme()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const tr = lang === 'tr'

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[#1d1d1f] dark:text-white">
      <nav className="h-12 px-5 md:px-8 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] bg-[#F5F5F7]/88 dark:bg-[#111113]/88 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => navigate('/')} className="inline-flex items-center">
          <BrandLogo size="sm" />
        </button>
        <div className="flex items-center gap-1.5">
          {(['about', 'blog', 'updates'] as PageKind[]).map((item) => (
            <button
              key={item}
              onClick={() => navigate(`/${item}`)}
              className={`hidden sm:inline-flex h-8 px-3 items-center rounded-md text-[12px] transition-colors ${
                item === kind
                  ? 'bg-black/[0.08] dark:bg-white/[0.10] text-[#1d1d1f] dark:text-white'
                  : 'text-[#1d1d1f]/55 dark:text-white/55 hover:bg-black/[0.06] dark:hover:bg-white/[0.07]'
              }`}
            >
              {item === 'about' ? (tr ? 'Hakkında' : 'About') : item === 'updates' ? (tr ? 'Güncellemeler' : 'Updates') : 'Blog'}
            </button>
          ))}
          <div className="flex rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
            {(['en', 'tr'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setLang(item)}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${lang === item ? 'bg-[#0071E3] text-white' : 'text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}
              >
                {item === 'en' ? 'EN' : 'TR'}
              </button>
            ))}
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1d1d1f]/45 dark:text-white/45 hover:bg-black/[0.06] dark:hover:bg-white/[0.07]"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☼' : '◐'}
          </button>
          <button onClick={() => navigate(isAuthenticated ? '/workflows' : '/login')} className="h-8 px-3.5 rounded-md bg-[#0071E3] hover:bg-[#0077ED] text-white text-[12px] font-medium">
            {isAuthenticated ? (tr ? 'Uygulamaya git' : 'Go to app') : (tr ? 'Giriş yap' : 'Sign in')}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-14 md:py-18">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#0071E3] font-semibold">{tr ? page.eyebrow.tr : page.eyebrow.en}</p>
        <h1 className="mt-3 max-w-3xl text-[36px] md:text-[54px] leading-[0.98] font-semibold tracking-tight">
          {tr ? page.title.tr : page.title.en}
        </h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#1d1d1f]/58 dark:text-white/58">
          {tr ? page.intro.tr : page.intro.en}
        </p>

        <section className="mt-10 grid gap-4">
          {page.sections.map((section) => (
            <article key={section.title.en} className="rounded-3xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] p-6">
              <h2 className="text-[20px] font-semibold tracking-tight">{tr ? section.title.tr : section.title.en}</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-[#1d1d1f]/55 dark:text-white/55">{tr ? section.body.tr : section.body.en}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
