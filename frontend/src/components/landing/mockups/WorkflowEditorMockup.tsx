import type { ReactNode } from 'react'

/**
 * Realistic HTML/CSS mock of the Daflow Workflow Editor.
 * Uses semantic colors so it adapts to light/dark mode.
 *
 * Variants:
 *  - "hero":     full chrome (window dots + url), larger padding
 *  - "compact":  trimmed chrome, smaller typography, for showcase cards
 */
export default function WorkflowEditorMockup({ variant = 'hero' }: { variant?: 'hero' | 'compact' }) {
  const compact = variant === 'compact'

  return (
    <div className="w-full select-none">
      {/* Window chrome */}
      <div className="h-9 flex items-center gap-3 px-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/80">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-1 rounded-md bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-muted)] font-mono">
            daflow.app/workflows/sales-analysis
          </div>
        </div>
        <div className="w-12" />
      </div>

      {/* App toolbar */}
      <div className="h-11 flex items-center px-4 gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/70 backdrop-blur-xl">
        <button className="w-7 h-7 rounded-md hover:bg-[var(--color-bg-subtle)] flex items-center justify-center text-[var(--color-text-muted)]">
          <ChevronLeft />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">Satış Analizi Pipeline</span>
          <span className="text-[11px] text-[var(--color-text-muted)]">· v3</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
          Saved
        </div>
        <button className="h-7 px-2.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[12px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]">
          Save
        </button>
        <button className="h-7 px-3 rounded-md bg-[#0071E3] hover:bg-[#0077ED] text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-sm">
          <PlayIcon />
          Run
        </button>
      </div>

      {/* Body: sidebar + canvas + config */}
      <div className={`flex ${compact ? 'h-[340px] md:h-[380px]' : 'h-[420px] md:h-[480px]'}`}>
        {/* Left sidebar */}
        <aside className={`${compact ? 'w-48' : 'w-56'} border-r border-[var(--color-border-subtle)] bg-[var(--color-page-bg)] overflow-hidden flex flex-col`}>
          <div className="px-3 py-2.5 border-b border-[var(--color-border-subtle)]">
            <div className="text-[10px] font-semibold tracking-[0.08em] text-[var(--color-text-muted)] uppercase">
              Components
            </div>
            <div className="mt-2 h-6 rounded-md bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center px-2 gap-1.5">
              <SearchIcon />
              <span className="text-[11px] text-[var(--color-text-muted)]">Search nodes…</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-2 space-y-3">
            <SidebarCategory label="Kaynak" color="#0071E3" items={[
              { icon: '↑', label: 'Dosya Yükle' },
              { icon: 'DB', label: 'Veritabanı Sorgusu' },
            ]} />
            <SidebarCategory label="Hazırlık" color="#F5A623" items={[
              { icon: '○', label: 'Eksik Değerler' },
              { icon: '⊟', label: 'Tekrarlar' },
              { icon: '⊃', label: 'Satır Filtrele' },
            ]} />
            <SidebarCategory label="Analiz" color="#30D158" items={[
              { icon: 'σ', label: 'İstatistikler' },
              { icon: 'ρ', label: 'Korelasyon' },
              { icon: '△', label: 'Anomali' },
            ]} />
            <SidebarCategory label="Çıktı" color="#BF5AF2" items={[
              { icon: '▦', label: 'Dashboard' },
              { icon: '≣', label: 'Rapor' },
            ]} />
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-[var(--color-bg-surface)]">
          {/* Dotted background */}
          <div
            className="absolute inset-0 opacity-[0.14] dark:opacity-[0.10]"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--color-text-muted) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Mini-map in corner */}
          <div className="absolute bottom-3 right-3 w-28 h-20 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/70 backdrop-blur-sm overflow-hidden z-10">
            <div className="absolute inset-0 flex items-center justify-center gap-1 p-2">
              <span className="w-4 h-3 rounded-sm bg-[#0071E3]/60" />
              <span className="w-3 h-2 rounded-sm bg-[#F5A623]/60" />
              <span className="w-3 h-2 rounded-sm bg-[#30D158]/60" />
              <span className="w-3 h-2 rounded-sm bg-[#30D158]/60" />
              <span className="w-4 h-3 rounded-sm bg-[#BF5AF2]/60" />
            </div>
            <div className="absolute top-1 left-1 text-[8px] font-medium text-[var(--color-text-muted)] tracking-wide uppercase">
              Minimap
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-3 left-3 flex flex-col rounded-lg overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/80 backdrop-blur-sm z-10 shadow-sm">
            <button className="w-7 h-7 flex items-center justify-center text-[var(--color-text-secondary)] text-sm hover:bg-[var(--color-bg-subtle)]">+</button>
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <button className="w-7 h-7 flex items-center justify-center text-[var(--color-text-secondary)] text-sm hover:bg-[var(--color-bg-subtle)]">−</button>
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <button className="w-7 h-7 flex items-center justify-center text-[var(--color-text-secondary)] text-[11px] hover:bg-[var(--color-bg-subtle)]">⤢</button>
          </div>

          {/*
            Connector SVG overlay — React Flow smoothstep style edges.
            viewBox uses canvas aspect ratio (~10:6) so the curves don't
            distort when the canvas height changes.
          */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0071E3" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#BF5AF2" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="edgeGradActive" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#30D158" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#30D158" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            {/*
              Node centers in viewBox coords (x%, y%) × (1000, 600):
                File Upload:    (140, 120)   half-w ≈ 80 → right edge ≈ 220
                Missing Values: (340, 240)   left edge ≈ 260, right edge ≈ 420
                Statistics:     (620, 120)   left edge ≈ 540, right edge ≈ 700
                Correlation:    (620, 348)   left edge ≈ 540, right edge ≈ 700
                Dashboard:      (880, 240)   left edge ≈ 800

              Use horizontal bezier with control points at half-dx offset.
            */}

            {/* File Upload → Missing Values */}
            <path
              d="M 220,120 C 260,120 220,240 260,240"
              stroke="url(#edgeGrad)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Missing Values → Statistics (running, green) */}
            <path
              d="M 420,240 C 480,240 480,120 540,120"
              stroke="url(#edgeGradActive)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Missing Values → Correlation */}
            <path
              d="M 420,240 C 480,240 480,348 540,348"
              stroke="url(#edgeGrad)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Statistics → Dashboard */}
            <path
              d="M 700,120 C 750,120 750,240 800,240"
              stroke="url(#edgeGrad)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Correlation → Dashboard */}
            <path
              d="M 700,348 C 750,348 750,240 800,240"
              stroke="url(#edgeGrad)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>

          {/*
            Nodes positioned to exactly match SVG connector endpoints.
            SVG viewBox is 1000×600, so percentages map as:
              File Upload:    (140, 120) → (14%, 20%)
              Missing Values: (340, 240) → (34%, 40%)
              Statistics:     (620, 120) → (62%, 20%)
              Correlation:    (620, 348) → (62%, 58%)
              Dashboard:      (880, 240) → (88%, 40%)
            Nodes use translate(-50%, -50%) internally so (left, top) = center.
          */}
          <div className="absolute inset-0">
            <MockNode
              style={{ left: '14%', top: '20%' }}
              icon="↑"
              label="Dosya Yükle"
              category="source"
              status="success"
              meta="satis_q4.csv"
            />
            <MockNode
              style={{ left: '34%', top: '40%' }}
              icon="○"
              label="Eksik Değerler"
              category="preparation"
              status="success"
              meta="2 sütun dolduruldu"
            />
            <MockNode
              style={{ left: '62%', top: '20%' }}
              icon="σ"
              label="İstatistikler"
              category="analysis"
              status="running"
              meta="hesaplanıyor…"
            />
            <MockNode
              style={{ left: '62%', top: '58%' }}
              icon="ρ"
              label="Korelasyon"
              category="analysis"
              status="idle"
              meta="pearson"
            />
            <MockNode
              style={{ left: '88%', top: '40%' }}
              icon="▦"
              label="Dashboard"
              category="output"
              status="idle"
              meta="Satış Analizi"
            />
          </div>
        </div>

        {/* Right config panel */}
        {!compact && (
          <aside className="w-64 border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hidden lg:flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--color-text-muted)] uppercase">
                Configuration
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#30D158] text-white flex items-center justify-center text-[10px] font-bold">σ</span>
                <span className="text-[13px] font-medium text-[var(--color-text-primary)]">Statistics</span>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-3.5">
              <ConfigField label="Columns">
                <div className="flex flex-wrap gap-1">
                  <Chip>revenue</Chip>
                  <Chip>units</Chip>
                  <Chip>margin</Chip>
                </div>
              </ConfigField>
              <ConfigField label="Include">
                <div className="h-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 flex items-center justify-between">
                  <span className="text-[12px] text-[var(--color-text-primary)]">Mean, Std, Median</span>
                  <ChevronDown />
                </div>
              </ConfigField>
              <ConfigField label="Percentiles">
                <div className="h-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 flex items-center text-[12px] text-[var(--color-text-primary)] font-mono">
                  25, 50, 75, 95
                </div>
              </ConfigField>
              <ConfigField label="Group by">
                <div className="h-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 flex items-center justify-between">
                  <span className="text-[12px] text-[var(--color-text-primary)]">region</span>
                  <ChevronDown />
                </div>
              </ConfigField>
              <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-semibold mb-1.5">Status</div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] animate-pulse" />
                  Running · 2.3s
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────

function SidebarCategory({ label, color, items }: { label: string; color: string; items: { icon: string; label: string }[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-1.5 mb-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-semibold tracking-[0.04em] uppercase text-[var(--color-text-muted)]">
          {label}
        </span>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-[var(--color-bg-surface)] cursor-grab"
          >
            <span
              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {item.icon}
            </span>
            <span className="text-[11.5px] text-[var(--color-text-primary)] font-medium truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const categoryColorMap: Record<string, string> = {
  source: '#0071E3',
  preparation: '#F5A623',
  analysis: '#30D158',
  output: '#BF5AF2',
}

function MockNode({
  icon,
  label,
  category,
  status,
  meta,
  style,
}: {
  icon: string
  label: string
  category: 'source' | 'preparation' | 'analysis' | 'output'
  status: 'idle' | 'running' | 'success'
  meta: string
  style: React.CSSProperties
}) {
  const color = categoryColorMap[category]
  const ringStyle =
    status === 'success'
      ? { boxShadow: '0 0 0 3px rgba(48,209,88,0.20), 0 10px 24px rgba(48,209,88,0.12)' }
      : status === 'running'
      ? { boxShadow: '0 0 0 3px rgba(0,113,227,0.16), 0 8px 20px rgba(0,113,227,0.10)' }
      : { boxShadow: '0 6px 16px rgba(0,0,0,0.06)' }

  const statusDot =
    status === 'success' ? '#30D158' : status === 'running' ? '#0071E3' : '#8E8E93'

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 min-w-[116px] rounded-2xl border bg-[var(--color-bg-surface)]/95 backdrop-blur-xl"
      style={{
        ...style,
        borderColor:
          status === 'success'
            ? 'rgba(48,209,88,0.50)'
            : status === 'running'
            ? 'rgba(0,113,227,0.50)'
            : 'var(--color-border-default)',
        ...ringStyle,
      }}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </span>
        <span className="text-[11px] font-medium text-[var(--color-text-primary)] truncate flex-1">{label}</span>
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'running' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: statusDot }}
        />
      </div>
      <div className="px-2.5 pb-1.5 border-t border-[var(--color-border-subtle)] pt-1.5">
        <div className="text-[10px] text-[var(--color-text-muted)] truncate font-mono">{meta}</div>
      </div>
    </div>
  )
}

function ConfigField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center h-5 px-2 rounded-md bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[10.5px] font-medium text-[var(--color-text-secondary)]">
      {children}
    </span>
  )
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)]">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)]">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
