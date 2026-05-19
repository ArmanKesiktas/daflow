import { useState, useMemo } from 'react'
import { useI18n } from '../i18n'

interface Article {
  title: string
  body: string
  category: string
}

const categories = {
  tr: ['Tümü', 'Workflow', 'Veri', 'Dashboard', 'Rapor', 'Workspace', 'AI', 'Genel'],
  en: ['All', 'Workflow', 'Data', 'Dashboard', 'Report', 'Workspace', 'AI', 'General'],
}

const articleData: { tr: Article[]; en: Article[] } = {
  tr: [
    { title: 'Workflow nasıl kurulur?', body: 'Dosyanızı yükleyin, hazırlık ve analiz node\'larını bağlayın, sonuna dashboard veya rapor ekleyip çalıştırın. Her node bir veri işleme adımını temsil eder.', category: 'Workflow' },
    { title: 'Node türleri ve bağlantılar', body: 'Kaynak, hazırlık, analiz, görselleştirme ve çıktı node\'ları mevcuttur. Node\'ları sürükleyip bırakarak canvas\'a ekleyin ve portlarını birbirine bağlayın.', category: 'Workflow' },
    { title: 'Veri yükleme ve format desteği', body: 'CSV, Excel (.xlsx) ve JSON dosyalarını sürükle-bırak ile yükleyin. Maksimum dosya boyutu 50 MB\'dir. Yüklenen veriler otomatik olarak önizlenir.', category: 'Veri' },
    { title: 'Veri temizleme ve dönüştürme', body: 'Hazırlık node\'ları ile eksik değerleri doldurun, sütunları yeniden adlandırın, filtreleyin veya yeni hesaplanmış sütunlar ekleyin.', category: 'Veri' },
    { title: 'Dashboard nasıl hazırlanır?', body: 'Chart node\'larını kullanarak grafik tipini, başlığını ve metriğini ayarlayın; sonra bu chart node\'larını dashboard node\'una bağlayın. Bar, line, pie ve scatter desteklenir.', category: 'Dashboard' },
    { title: 'Dashboard paylaşımı', body: 'Dashboard detay sayfasından "Paylaş" butonuna tıklayın. Herkese açık link oluşturabilir veya workspace üyeleriyle paylaşabilirsiniz.', category: 'Dashboard' },
    { title: 'Rapor oluşturma', body: 'Rapor node\'u ekleyerek workflow çıktılarını PDF veya web formatında dışa aktarın. Rapor başlığı, açıklama ve grafik seçimi yapılabilir.', category: 'Rapor' },
    { title: 'Rapor şablonları', body: 'Hazır rapor şablonlarını kullanarak hızlıca profesyonel raporlar oluşturun. Şablonlar özelleştirilebilir ve yeniden kullanılabilir.', category: 'Rapor' },
    { title: 'Workspace yönetimi', body: 'Workspace oluşturun, üye davet edin ve rol atayın. Owner, admin, analyst, viewer ve guest rolleri mevcuttur. Her rol farklı erişim seviyesine sahiptir.', category: 'Workspace' },
    { title: 'Workspace paylaşımı ve roller', body: 'Workspace içinde üye davet edin, rol seçin ve workspace dosya, workflow, dashboard ve rapor erişimini yönetin. Davet linki ile kolayca üye ekleyin.', category: 'Workspace' },
    { title: 'AI destekli analiz', body: 'AI node\'ları verilerinizi otomatik analiz eder, anomali tespiti yapar ve öneriler sunar. Doğal dil ile soru sorarak veri hakkında bilgi alabilirsiniz.', category: 'AI' },
    { title: 'AI ile workflow önerileri', body: 'AI asistanı mevcut verilerinize göre uygun node\'ları ve bağlantıları önerir. "AI Suggest" butonuyla otomatik workflow oluşturabilirsiniz.', category: 'AI' },
    { title: 'Klavye kısayolları', body: 'Ctrl+S: Kaydet, Ctrl+Z: Geri al, Delete: Seçili node\'u sil, Space: Canvas\'ı sürükle, Ctrl+A: Tümünü seç, Ctrl+D: Seçili node\'u çoğalt.', category: 'Genel' },
    { title: 'Tema ve dil ayarları', body: 'Ayarlar sayfasından karanlık/aydınlık tema ve Türkçe/İngilizce dil seçimi yapabilirsiniz. Tercihleriniz otomatik kaydedilir.', category: 'Genel' },
  ],
  en: [
    { title: 'How to build a workflow', body: 'Upload a file, connect preparation and analysis nodes, then attach a dashboard or report node and run. Each node represents a data processing step.', category: 'Workflow' },
    { title: 'Node types and connections', body: 'Source, preparation, analysis, visualization, and output nodes are available. Drag and drop nodes onto the canvas and connect their ports together.', category: 'Workflow' },
    { title: 'Data upload and format support', body: 'Upload CSV, Excel (.xlsx), and JSON files via drag-and-drop. Maximum file size is 50 MB. Uploaded data is automatically previewed.', category: 'Data' },
    { title: 'Data cleaning and transformation', body: 'Use preparation nodes to fill missing values, rename columns, filter rows, or add new computed columns.', category: 'Data' },
    { title: 'How to prepare dashboards', body: 'Use chart nodes to configure chart type, title and metrics; then connect those chart nodes into a dashboard node. Bar, line, pie, and scatter are supported.', category: 'Dashboard' },
    { title: 'Sharing dashboards', body: 'Click the "Share" button on the dashboard detail page. You can create a public link or share with workspace members.', category: 'Dashboard' },
    { title: 'Creating reports', body: 'Add a report node to export workflow outputs in PDF or web format. Configure report title, description, and chart selection.', category: 'Report' },
    { title: 'Report templates', body: 'Use ready-made report templates to quickly create professional reports. Templates are customizable and reusable.', category: 'Report' },
    { title: 'Workspace management', body: 'Create workspaces, invite members, and assign roles. Owner, admin, analyst, viewer, and guest roles are available with different access levels.', category: 'Workspace' },
    { title: 'Workspace sharing and roles', body: 'Invite members, choose a role, and manage workspace access to files, workflows, dashboards and reports. Easily add members via invite link.', category: 'Workspace' },
    { title: 'AI-powered analysis', body: 'AI nodes automatically analyze your data, detect anomalies, and provide suggestions. Ask questions in natural language to get insights about your data.', category: 'AI' },
    { title: 'AI workflow suggestions', body: 'The AI assistant suggests appropriate nodes and connections based on your data. Use the "AI Suggest" button to auto-generate workflows.', category: 'AI' },
    { title: 'Keyboard shortcuts', body: 'Ctrl+S: Save, Ctrl+Z: Undo, Delete: Remove selected node, Space: Pan canvas, Ctrl+A: Select all, Ctrl+D: Duplicate selected node.', category: 'General' },
    { title: 'Theme and language settings', body: 'Choose dark/light theme and Turkish/English language from the Settings page. Your preferences are saved automatically.', category: 'General' },
  ],
}

export default function HelpPage() {
  const { lang } = useI18n()
  const tr = lang === 'tr'
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(0)

  const cats = tr ? categories.tr : categories.en
  const articles = tr ? articleData.tr : articleData.en

  const filtered = useMemo(() => {
    let result = articles
    if (activeCategory > 0) {
      const catName = cats[activeCategory]
      result = result.filter((a) => a.category === catName)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q))
    }
    return result
  }, [articles, activeCategory, cats, search])

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#0071E3] font-semibold">{tr ? 'Yardım Merkezi' : 'Help Center'}</p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
        {tr ? "Daflow'u daha hızlı kullanın" : 'Use Daflow faster'}
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#1d1d1f]/45 dark:text-white/45">
        {tr ? 'Kısa ürün rehberleri, workflow kurulumundan workspace paylaşımına kadar temel adımları açıklar.' : 'Short product guides explain the core steps from workflow setup to workspace sharing.'}
      </p>

      {/* Search */}
      <div className="mt-6 relative max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1d1d1f]/30 dark:text-white/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr ? 'Makale ara...' : 'Search articles...'}
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-white/[0.04] text-[13px] text-[#1d1d1f] dark:text-white outline-none focus:ring-2 focus:ring-[#0071E3]/30 transition-all"
        />
      </div>

      {/* Category tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {cats.map((cat, i) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(i)}
            className={`h-8 px-4 rounded-full text-[12px] font-medium transition-all ${
              activeCategory === i
                ? 'bg-[#0071E3] text-white'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#1d1d1f]/60 dark:text-white/60 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles grid */}
      <section data-tour="help-articles" className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((article) => (
          <article key={article.title} className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-white/[0.04] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] font-medium">{article.category}</span>
            </div>
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white leading-snug">{article.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#1d1d1f]/50 dark:text-white/50">{article.body}</p>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-[14px] text-[#1d1d1f]/40 dark:text-white/40">
            {tr ? 'Sonuç bulunamadı.' : 'No results found.'}
          </div>
        )}
      </section>
    </main>
  )
}
