import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { onboardingApi } from '../api/platform'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'

// ────────────────────────────────────────────────────────────────────────────
// Tour configuration
// ────────────────────────────────────────────────────────────────────────────

type TourKey =
  | 'workflows'
  | 'workflowEditor'
  | 'dashboard'
  | 'dashboardsList'
  | 'reports'
  | 'reportDetail'
  | 'datasets'
  | 'datasetDetail'
  | 'workspace'
  | 'members'
  | 'projects'
  | 'projectDetail'
  | 'settings'
  | 'help'
  | 'sharedWithMe'

interface TourStep {
  // CSS selectors — tried in order until one matches. First match is highlighted.
  selectors: string[]
  // Fallback selector if nothing matches (highlights nothing, centers panel).
  title: { tr: string; en: string }
  description: { tr: string; en: string }
}

const TOURS: Record<TourKey, TourStep[]> = {
  workflows: [
    {
      selectors: ['[data-tour="workflow-create"]', 'main h1'],
      title: { tr: 'Workflow listesi', en: 'Workflow list' },
      description: {
        tr: 'Tüm iş akışlarınız burada. Şablonlardan yeni bir workflow başlatabilir veya sıfırdan oluşturabilirsiniz.',
        en: 'All your workflows live here. Start from templates or create one from scratch.',
      },
    },
    {
      selectors: ['[data-tour="workflow-filters"]'],
      title: { tr: 'Arama ve filtreler', en: 'Search & filters' },
      description: {
        tr: 'İsme veya tarihe göre filtreleyin. Son çalışmalarınızı saniyeler içinde bulun.',
        en: 'Filter by name or date. Find your recent work in seconds.',
      },
    },
    {
      selectors: ['[data-tour="workflow-list"]'],
      title: { tr: 'Workflow kartları', en: 'Workflow cards' },
      description: {
        tr: 'Bir karta tıklayarak workflow editöre girin. Node eklemek, düzenlemek ve çalıştırmak için hazır.',
        en: 'Click a card to open the editor. Add nodes, edit, and run your pipeline.',
      },
    },
  ],
  workflowEditor: [
    {
      selectors: ['[data-tour="node-panel"]', 'aside:first-of-type'],
      title: { tr: 'Bileşen kütüphanesi', en: 'Component library' },
      description: {
        tr: 'Kaynak, hazırlık, analiz, ML ve çıktı node\u2019larını buradan sürükleyin.',
        en: 'Drag source, preparation, analysis, ML, and output nodes from here.',
      },
    },
    {
      selectors: ['[data-tour="flow-canvas"]', '.react-flow'],
      title: { tr: 'Canvas', en: 'Canvas' },
      description: {
        tr: 'Node\u2019ları sürükleyin ve bağlayın. Her node verinizi sonraki adıma aktarır.',
        en: 'Drop and connect nodes. Each node passes data to the next step.',
      },
    },
    {
      selectors: ['[data-tour="config-panel"]', 'aside:last-of-type'],
      title: { tr: 'Konfigürasyon', en: 'Configuration' },
      description: {
        tr: 'Seçili node\u2019un parametrelerini sağ panelden ayarlayın.',
        en: 'Tune the selected node\u2019s parameters in the right panel.',
      },
    },
    {
      selectors: ['[data-tour="toolbar-run"]', 'header button[aria-label*="run" i]', 'header'],
      title: { tr: 'Çalıştır', en: 'Run' },
      description: {
        tr: 'Hazır olduğunuzda Çalıştır\u2019a basın. Sonuçlar canlı akar, node durumları renklerle gösterilir.',
        en: 'Hit Run when ready. Results stream live and node status shows as colored dots.',
      },
    },
  ],
  dashboard: [
    {
      selectors: ['[data-tour="dashboard-canvas"]', 'main'],
      title: { tr: 'Dashboard canvas', en: 'Dashboard canvas' },
      description: {
        tr: '16:9 sunum düzeni. Grafikler burada görselleştirilir.',
        en: '16:9 presentation layout. Charts are visualized here.',
      },
    },
    {
      selectors: ['[data-tour="dashboard-card"]', 'main article'],
      title: { tr: 'Grafik kartları', en: 'Chart cards' },
      description: {
        tr: 'Başlık ve açıklamayı kart üstünden düzenleyebilirsiniz. Filtreler tüm kartları etkiler.',
        en: 'Edit title and description directly. Filters apply to every card.',
      },
    },
    {
      selectors: ['[data-tour="dashboard-export"]'],
      title: { tr: 'Dışa aktar / yayınla', en: 'Export / publish' },
      description: {
        tr: 'PNG veya PDF olarak indirin ya da paylaşılabilir link üretin.',
        en: 'Download as PNG or PDF, or create a shareable link.',
      },
    },
  ],
  dashboardsList: [
    {
      selectors: ['main h1'],
      title: { tr: 'Dashboard listesi', en: 'Dashboard list' },
      description: {
        tr: 'Başarılı workflow çalıştırmalarından oluşturulmuş dashboardları görüntüleyin.',
        en: 'Browse dashboards generated from successful workflow runs.',
      },
    },
  ],
  reports: [
    {
      selectors: ['[data-tour="reports-list"]', 'main'],
      title: { tr: 'Raporlar', en: 'Reports' },
      description: {
        tr: 'Workflow çıktılarını yazdırılabilir A4 raporlar olarak toplar.',
        en: 'Collects workflow outputs into printable A4 reports.',
      },
    },
    {
      selectors: ['[data-tour="report-export"]', 'main button'],
      title: { tr: 'Yayınla veya yazdır', en: 'Publish or print' },
      description: {
        tr: 'Raporu yazdırın, PDF olarak kaydedin veya yayın linki oluşturun.',
        en: 'Print, save as PDF, or generate a publish link.',
      },
    },
  ],
  reportDetail: [
    {
      selectors: ['.report-print-root', 'main'],
      title: { tr: 'Rapor içeriği', en: 'Report content' },
      description: {
        tr: 'Bölümler sol sütundan navigasyonla açılır. Print A4 hazır gelir.',
        en: 'Sections navigate from the left sidebar. Print output is A4-ready.',
      },
    },
  ],
  datasets: [
    {
      selectors: ['[data-tour="dataset-organize"]', 'main aside'],
      title: { tr: 'Klasörler ve etiketler', en: 'Folders & tags' },
      description: {
        tr: 'Verilerinizi klasör ve etiketlerle organize edin.',
        en: 'Organize your data with folders and tags.',
      },
    },
    {
      selectors: ['[data-tour="dataset-preview"]', 'main article'],
      title: { tr: 'Veri önizleme', en: 'Dataset preview' },
      description: {
        tr: 'Yüklediğiniz dosyaların sütun ve satırlarını hızlıca görün.',
        en: 'Peek at columns and rows of uploaded files.',
      },
    },
    {
      selectors: ['[data-tour="dataset-workflow"]', 'main button'],
      title: { tr: 'Workflow başlat', en: 'Start workflow' },
      description: {
        tr: 'Seçili veri setinden tek tıkla yeni bir workflow açın.',
        en: 'Start a new workflow from the selected dataset with one click.',
      },
    },
  ],
  datasetDetail: [
    {
      selectors: ['main section', 'main'],
      title: { tr: 'Veri detayı', en: 'Dataset detail' },
      description: {
        tr: 'Sütun tipleri, satır sayısı ve önizleme burada. Workflow oluşturmak için hazır.',
        en: 'Column types, row counts, and preview. Ready to pipe into a workflow.',
      },
    },
  ],
  workspace: [
    {
      selectors: ['[data-tour="workspace-stats"]'],
      title: { tr: 'Workspace özeti', en: 'Workspace overview' },
      description: {
        tr: 'Takımınızın aktivitesi, veri sayısı, workflow ve dashboard metrikleri burada.',
        en: 'Team activity, dataset count, workflow and dashboard metrics live here.',
      },
    },
    {
      selectors: ['[data-tour="workspace-actions"]'],
      title: { tr: 'Hızlı eylemler', en: 'Quick actions' },
      description: {
        tr: 'Yeni workflow, dashboard veya veri yükleme işlemlerini tek tıkla başlatın.',
        en: 'Start a new workflow, dashboard, or upload with one click.',
      },
    },
    {
      selectors: ['[data-tour="workspace-danger"]'],
      title: { tr: 'Ayarlar', en: 'Settings' },
      description: {
        tr: 'Workspace sahipleri burada silme ve yönetim ayarlarını görebilir.',
        en: 'Workspace owners see delete and management settings here.',
      },
    },
  ],
  members: [
    {
      selectors: ['[data-tour="role-map"]'],
      title: { tr: 'Rol haritası', en: 'Role map' },
      description: {
        tr: 'Kim ne yapabiliyor? Rollerin erişim seviyesini buradan görün.',
        en: 'Who can do what? See access levels for each role.',
      },
    },
    {
      selectors: ['[data-tour="members-list"]'],
      title: { tr: 'Üyeler', en: 'Members' },
      description: {
        tr: 'Mevcut üyeleri görüntüleyin, rollerini değiştirin veya kaldırın.',
        en: 'View members, change roles, or remove them.',
      },
    },
    {
      selectors: ['[data-tour="invite-member"]'],
      title: { tr: 'Üye davet et', en: 'Invite members' },
      description: {
        tr: 'E-posta, rol ve geçerlilik süresiyle davet linki oluşturun.',
        en: 'Create invite links with email, role, and expiration.',
      },
    },
  ],
  projects: [
    {
      selectors: ['main h1', 'main'],
      title: { tr: 'Projeler', en: 'Projects' },
      description: {
        tr: 'Her proje kendi dosya, workflow, dashboard ve raporuna sahiptir.',
        en: 'Each project has its own files, workflows, dashboards, and reports.',
      },
    },
  ],
  projectDetail: [
    {
      selectors: ['main > div:first-of-type', 'main'],
      title: { tr: 'Proje detay', en: 'Project detail' },
      description: {
        tr: 'Proje içindeki veri, workflow, dashboard ve aktiviteye tek ekrandan ulaşın.',
        en: 'Access the project\u2019s data, workflows, dashboards, and activity on one screen.',
      },
    },
  ],
  settings: [
    {
      selectors: ['[data-tour="profile-form"]'],
      title: { tr: 'Profil ayarları', en: 'Profile settings' },
      description: {
        tr: 'Ad, dil ve tema tercihlerinizi buradan güncelleyin.',
        en: 'Update your name, language, and theme here.',
      },
    },
    {
      selectors: ['[data-tour="notification-settings"]'],
      title: { tr: 'Bildirimler', en: 'Notifications' },
      description: {
        tr: 'Hangi olaylarda bildirim almak istediğinizi seçin.',
        en: 'Pick which events should send you notifications.',
      },
    },
    {
      selectors: ['[data-tour="tour-reset"]'],
      title: { tr: 'Turları sıfırla', en: 'Reset tours' },
      description: {
        tr: 'Onboard turlarını yeniden görmek için buradan sıfırlayabilirsiniz.',
        en: 'Reset onboarding tours to see them again.',
      },
    },
  ],
  help: [
    {
      selectors: ['main h1', 'main'],
      title: { tr: 'Yardım merkezi', en: 'Help center' },
      description: {
        tr: 'Daflow\u2019un temel akışlarını öğrenin ve referanslara hızlıca ulaşın.',
        en: 'Learn Daflow\u2019s core flows and access references quickly.',
      },
    },
  ],
  sharedWithMe: [
    {
      selectors: ['main h1', 'main'],
      title: { tr: 'Benimle paylaşılan', en: 'Shared with me' },
      description: {
        tr: 'Ekip üyelerinin sizinle paylaştığı workflow ve raporları burada görürsünüz.',
        en: 'Workflows and reports shared with you by teammates appear here.',
      },
    },
  ],
}

function routeToKey(pathname: string): TourKey | null {
  if (pathname.includes('/workflows/') && pathname.includes('/edit')) return 'workflowEditor'
  if (/\/workspaces\/[^/]+\/projects\/[^/]+(\/?$)/.test(pathname)) return 'projectDetail'
  if (pathname.endsWith('/projects')) return 'projects'
  if (pathname.endsWith('/workflows') || pathname === '/workflows') return 'workflows'
  if (pathname.startsWith('/workflows/')) return 'workflowEditor'
  if (pathname.startsWith('/dashboard/')) return 'dashboard'
  if (pathname.endsWith('/dashboards') || pathname === '/dashboards') return 'dashboardsList'
  if (pathname.startsWith('/reports/')) return 'reportDetail'
  if (pathname.endsWith('/reports') || pathname === '/reports') return 'reports'
  if (pathname.startsWith('/datasets/')) return 'datasetDetail'
  if (pathname.endsWith('/files') || pathname.endsWith('/datasets') || pathname === '/datasets') return 'datasets'
  if (pathname.endsWith('/members')) return 'members'
  if (/\/workspaces\/[^/]+\/?$/.test(pathname)) return 'workspace'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/help') || pathname.startsWith('/articles')) return 'help'
  if (pathname.startsWith('/shared-with-me')) return 'sharedWithMe'
  return null
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export default function PageTour() {
  const location = useLocation()
  const { lang } = useI18n()
  const { session, userEmail } = useAuth()

  const key = useMemo(() => routeToKey(location.pathname), [location.pathname])
  const steps = key ? TOURS[key] : []
  const [stepIndex, setStepIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState<Rect | null>(null)
  const recordedRef = useRef<string | null>(null)

  const accountKey = session?.user?.id || userEmail || 'anonymous'
  const storageKey = key ? `daflow_tour:${accountKey}:${key}` : ''
  const legacyKey = key ? `daflow_tour:${key}` : ''
  const completedKey = key ? `tour:${key}` : ''

  // Initial load — check if tour is already completed
  useEffect(() => {
    if (!key || steps.length === 0) {
      setVisible(false)
      return
    }
    recordedRef.current = null
    setStepIndex(0)

    const localDone =
      localStorage.getItem(storageKey) === 'done' ||
      localStorage.getItem(legacyKey) === 'done'

    if (localDone) {
      setVisible(false)
      return
    }

    // Delay so the target elements have time to render
    const timer = setTimeout(() => setVisible(true), 500)

    onboardingApi
      .get()
      .then((state) => {
        if (state.completed_steps?.includes(completedKey)) {
          setVisible(false)
        }
      })
      .catch(() => {
        // Local storage already handled
      })

    return () => clearTimeout(timer)
  }, [key, steps.length, storageKey, legacyKey, completedKey])

  // Mark as completed when user interacts (seen the tour)
  useEffect(() => {
    if (!visible || !key || recordedRef.current === key) return
    recordedRef.current = key
    localStorage.setItem(storageKey, 'done')
    onboardingApi.save({ completed_steps: [completedKey] }).catch(() => null)
  }, [visible, key, storageKey, completedKey])

  // Find and track the highlighted target
  const updateRect = useCallback(() => {
    if (!visible || !key || !steps[stepIndex]) {
      setRect(null)
      return
    }
    const selectors = steps[stepIndex].selectors
    let element: Element | null = null
    for (const sel of selectors) {
      element = document.querySelector(sel)
      if (element) break
    }
    if (!element) {
      setRect(null)
      return
    }
    const r = element.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) {
      setRect(null)
      return
    }
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
    // Give the scroll a moment to settle before recalculating
    setTimeout(() => {
      const r2 = element!.getBoundingClientRect()
      setRect({ left: r2.left, top: r2.top, width: r2.width, height: r2.height })
    }, 350)
  }, [visible, key, stepIndex, steps])

  useEffect(() => {
    updateRect()
    const onScroll = () => updateRect()
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [updateRect])

  const finish = useCallback(() => {
    localStorage.setItem(storageKey, 'done')
    setVisible(false)
    onboardingApi
      .get()
      .then((state) => {
        const next = Array.from(new Set([...(state.completed_steps ?? []), completedKey]))
        return onboardingApi.save({ completed_steps: next })
      })
      .catch(() => null)
  }, [storageKey, completedKey])

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finish()
    } else {
      setStepIndex((i) => i + 1)
    }
  }, [stepIndex, steps.length, finish])

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  if (!visible || !key || steps.length === 0) return null

  const step = steps[stepIndex]
  const title = step.title[lang]
  const description = step.description[lang]

  // Compute panel position near the target, with smart side selection
  const panelPos = computePanelPosition(rect)

  return (
    <>
      {/* Dimmed backdrop with hole around the target */}
      <div className="fixed inset-0 z-[9990] pointer-events-none">
        <div className="absolute inset-0 bg-black/35 dark:bg-black/55 transition-opacity" />
      </div>

      {/* Highlight box */}
      {rect && (
        <div
          className="fixed z-[9991] pointer-events-none rounded-2xl border-[3px] border-[#0A84FF] transition-all duration-300 ease-out"
          style={{
            left: Math.max(8, rect.left - 8),
            top: Math.max(8, rect.top - 8),
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow:
              '0 0 0 9999px rgba(0,0,0,0.0), 0 0 0 4px rgba(10,132,255,0.25), 0 0 32px rgba(10,132,255,0.45)',
          }}
        />
      )}

      {/* Tour panel with mascot */}
      <div
        className="fixed z-[9999] w-[360px] max-w-[92vw] transition-all duration-300 ease-out"
        style={panelPos}
      >
        {/* Mascot */}
        <TourMascot />

        {/* Panel */}
        <div className="relative rounded-2xl border-2 border-[#0A84FF]/40 bg-white dark:bg-[#1C1C1E] shadow-[0_20px_60px_rgba(0,0,0,0.25),0_0_0_1px_rgba(10,132,255,0.10)] p-5 pt-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i <= stepIndex ? 'bg-[#0A84FF]' : 'bg-black/[0.08] dark:bg-white/[0.10]'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)] shrink-0">
              {stepIndex + 1}/{steps.length}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-1.5 leading-tight">
            {title}
          </h3>

          {/* Description */}
          <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </p>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              onClick={finish}
              className="h-8 px-3 rounded-lg text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            >
              {lang === 'tr' ? 'Atla' : 'Skip'}
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  onClick={prev}
                  className="h-8 px-3 rounded-lg text-[12px] font-medium text-[var(--color-text-primary)] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] transition-colors"
                >
                  {lang === 'tr' ? 'Geri' : 'Back'}
                </button>
              )}
              <button
                onClick={next}
                className="h-8 px-4 rounded-lg bg-[#0A84FF] hover:bg-[#0077ED] text-white text-[12px] font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-[#0A84FF]/30"
              >
                {stepIndex >= steps.length - 1
                  ? lang === 'tr'
                    ? 'Bitir'
                    : 'Finish'
                  : lang === 'tr'
                  ? 'Sonraki'
                  : 'Next'}
                {stepIndex < steps.length - 1 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────────

/** Small animated mascot sitting on top-right of the tour panel */
function TourMascot() {
  const [pose, setPose] = useState<'hold' | 'throw'>('hold')

  useEffect(() => {
    const timer = setTimeout(
      () => setPose((p) => (p === 'hold' ? 'throw' : 'hold')),
      pose === 'hold' ? 1400 : 600
    )
    return () => clearTimeout(timer)
  }, [pose])

  const src = pose === 'hold' ? '/mascot/ballholding.png' : '/mascot/ballthrow.png'

  return (
    <div
      className="absolute -top-16 -right-4 w-24 h-24 pointer-events-none select-none z-[10000]"
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]"
      />
    </div>
  )
}

/**
 * Compute where to place the tour panel so it doesn't overlap the target
 * and stays on screen. Returns CSS left/top/bottom properties.
 */
function computePanelPosition(rect: Rect | null): React.CSSProperties {
  const PANEL_WIDTH = 360
  const PANEL_HEIGHT = 200
  const PADDING = 20
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  // No target — center the panel (first load)
  if (!rect) {
    return {
      left: `${Math.max(PADDING, (vw - PANEL_WIDTH) / 2)}px`,
      top: `${Math.max(PADDING, (vh - PANEL_HEIGHT) / 2)}px`,
    }
  }

  // Try to place below the target
  const belowTop = rect.top + rect.height + PADDING
  if (belowTop + PANEL_HEIGHT < vh - PADDING) {
    const left = Math.min(
      Math.max(PADDING, rect.left + rect.width / 2 - PANEL_WIDTH / 2),
      vw - PANEL_WIDTH - PADDING
    )
    return { left: `${left}px`, top: `${belowTop}px` }
  }

  // Try to place to the right
  const rightLeft = rect.left + rect.width + PADDING
  if (rightLeft + PANEL_WIDTH < vw - PADDING) {
    const top = Math.min(
      Math.max(PADDING, rect.top + rect.height / 2 - PANEL_HEIGHT / 2),
      vh - PANEL_HEIGHT - PADDING
    )
    return { left: `${rightLeft}px`, top: `${top}px` }
  }

  // Try to place to the left
  const leftRight = rect.left - PADDING - PANEL_WIDTH
  if (leftRight > PADDING) {
    const top = Math.min(
      Math.max(PADDING, rect.top + rect.height / 2 - PANEL_HEIGHT / 2),
      vh - PANEL_HEIGHT - PADDING
    )
    return { left: `${leftRight}px`, top: `${top}px` }
  }

  // Fallback: place above the target
  const aboveTop = Math.max(PADDING, rect.top - PADDING - PANEL_HEIGHT)
  const left = Math.min(
    Math.max(PADDING, rect.left + rect.width / 2 - PANEL_WIDTH / 2),
    vw - PANEL_WIDTH - PADDING
  )
  return { left: `${left}px`, top: `${aboveTop}px` }
}
