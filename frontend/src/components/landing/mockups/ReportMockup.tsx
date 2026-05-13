/**
 * Realistic HTML/CSS mock of a Daflow Report detail view.
 * Document-style layout with title, metadata, section cards, a data table and chart excerpts.
 * Uses semantic colors + product accent colors so it adapts to light/dark mode.
 */
export default function ReportMockup() {
  return (
    <div className="w-full select-none flex flex-col">
      {/* Window chrome */}
      <div className="h-9 flex items-center gap-3 px-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/80">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-1 rounded-md bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-muted)] font-mono">
            daflow.app/reports/q4-sales-analysis
          </div>
        </div>
        <div className="w-12" />
      </div>

      {/* Document */}
      <div className="flex-1 overflow-hidden p-5 bg-[var(--color-page-bg)]">
        <div className="max-w-[760px] mx-auto bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border-subtle)] shadow-sm overflow-hidden">
          {/* Report header */}
          <div className="px-7 py-6 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-md bg-[#0071E3] text-white flex items-center justify-center text-[10px] font-bold">≣</span>
              <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-[var(--color-text-muted)]">
                Analysis Report
              </span>
            </div>
            <h3 className="text-[20px] font-bold text-[var(--color-text-primary)] tracking-tight leading-tight">
              Q4 Sales Analysis Report
            </h3>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-[var(--color-text-muted)]">
              <MetaItem icon={<CalendarIcon />} label="Generated" value="Jan 12, 2025" />
              <MetaItem icon={<UserIcon />} label="Author" value="A. Yılmaz" />
              <MetaItem icon={<DatabaseIcon />} label="Dataset" value="sales_q4.csv" />
              <MetaItem icon={<RowIcon />} label="Rows" value="8,240" />
            </div>
          </div>

          {/* Section: Executive Summary */}
          <Section number="1" title="Executive Summary">
            <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              Q4 revenue grew <strong className="text-[var(--color-text-primary)]">14.2%</strong> quarter-over-quarter, led by{' '}
              <strong className="text-[var(--color-text-primary)]">North America</strong> and{' '}
              <strong className="text-[var(--color-text-primary)]">EU</strong> regions. The Software category accounts for 40% of total revenue.
              Anomaly detection flagged <strong className="text-[#FF453A]">3 outlier transactions</strong> requiring review.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <MiniKPI label="Total Revenue" value="$12,450" trend="+14.2%" trendColor="#30D158" />
              <MiniKPI label="Orders" value="1,284" trend="+8.6%" trendColor="#30D158" />
              <MiniKPI label="Return Rate" value="2.1%" trend="−0.3%" trendColor="#FF453A" />
            </div>
          </Section>

          {/* Section: Statistics */}
          <Section number="2" title="Descriptive Statistics">
            <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
              <table className="w-full text-[11.5px]">
                <thead className="bg-[var(--color-bg-subtle)]">
                  <tr>
                    <Th>Column</Th>
                    <Th>Mean</Th>
                    <Th>Std</Th>
                    <Th>Min</Th>
                    <Th>Max</Th>
                    <Th>Missing</Th>
                  </tr>
                </thead>
                <tbody>
                  <Tr>
                    <Td><span className="font-mono">revenue</span></Td>
                    <Td>9.69</Td>
                    <Td>4.12</Td>
                    <Td>0.50</Td>
                    <Td>98.40</Td>
                    <Td><span className="text-[#30D158]">0</span></Td>
                  </Tr>
                  <Tr>
                    <Td><span className="font-mono">units</span></Td>
                    <Td>2.14</Td>
                    <Td>1.08</Td>
                    <Td>1</Td>
                    <Td>24</Td>
                    <Td><span className="text-[#F5A623]">12</span></Td>
                  </Tr>
                  <Tr>
                    <Td><span className="font-mono">margin</span></Td>
                    <Td>0.32</Td>
                    <Td>0.09</Td>
                    <Td>0.04</Td>
                    <Td>0.71</Td>
                    <Td><span className="text-[#30D158]">0</span></Td>
                  </Tr>
                  <Tr>
                    <Td><span className="font-mono">region</span></Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td><span className="text-[#30D158]">0</span></Td>
                  </Tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Section: Chart excerpt */}
          <Section number="3" title="Revenue Trend">
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-page-bg)] p-4">
              <svg viewBox="0 0 600 160" className="w-full h-28">
                <defs>
                  <linearGradient id="reportLineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0071E3" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#0071E3" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="30"
                    x2="580"
                    y1={30 + i * 30}
                    y2={30 + i * 30}
                    stroke="var(--color-border-subtle)"
                    strokeDasharray="2 3"
                  />
                ))}
                <path
                  d="M 30 110 L 85 100 L 140 105 L 195 80 L 250 85 L 305 65 L 360 55 L 415 62 L 470 42 L 525 30 L 580 24 L 580 130 L 30 130 Z"
                  fill="url(#reportLineFill)"
                />
                <path
                  d="M 30 110 L 85 100 L 140 105 L 195 80 L 250 85 L 305 65 L 360 55 L 415 62 L 470 42 L 525 30 L 580 24"
                  stroke="#0071E3"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {[
                  [30, 110], [85, 100], [140, 105], [195, 80], [250, 85],
                  [305, 65], [360, 55], [415, 62], [470, 42], [525, 30], [580, 24],
                ].map(([x, y]) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="var(--color-bg-surface)" stroke="#0071E3" strokeWidth="1.8" />
                ))}
              </svg>
              <div className="mt-1 text-center text-[10.5px] text-[var(--color-text-muted)]">
                Monthly revenue · Mar 2024 → Jan 2025
              </div>
            </div>
          </Section>

          {/* Section: Anomalies */}
          <Section number="4" title="Detected Anomalies">
            <div className="space-y-1.5">
              <AnomalyRow id="#4218" column="revenue" value="$98.40" severity="high" />
              <AnomalyRow id="#6194" column="units" value="24" severity="medium" />
              <AnomalyRow id="#7812" column="margin" value="0.71" severity="low" />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="px-7 py-5 border-b border-[var(--color-border-subtle)] last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-md bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] flex items-center justify-center text-[10px] font-semibold">
          {number}
        </span>
        <h4 className="text-[13.5px] font-semibold text-[var(--color-text-primary)] tracking-tight">{title}</h4>
      </div>
      {children}
    </div>
  )
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      <span>{label}:</span>
      <span className="font-medium text-[var(--color-text-primary)]">{value}</span>
    </div>
  )
}

function MiniKPI({ label, value, trend, trendColor }: { label: string; value: string; trend: string; trendColor: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-page-bg)] p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-[15px] font-bold text-[var(--color-text-primary)]">{value}</span>
        <span className="text-[10px] font-semibold" style={{ color: trendColor }}>
          {trend}
        </span>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-muted)]">
      {children}
    </th>
  )
}
function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-[var(--color-border-subtle)]">{children}</tr>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-1.5 text-[var(--color-text-primary)]">{children}</td>
}

function AnomalyRow({ id, column, value, severity }: { id: string; column: string; value: string; severity: 'high' | 'medium' | 'low' }) {
  const sevColor = severity === 'high' ? '#FF453A' : severity === 'medium' ? '#F5A623' : '#0071E3'
  const sevBg = severity === 'high' ? 'rgba(255,69,58,0.10)' : severity === 'medium' ? 'rgba(245,166,35,0.12)' : 'rgba(0,113,227,0.10)'
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-page-bg)]">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sevColor }} />
      <span className="text-[11.5px] font-mono text-[var(--color-text-muted)]">{id}</span>
      <span className="text-[11.5px] text-[var(--color-text-primary)]">
        Outlier in <span className="font-mono">{column}</span> · value = <span className="font-mono">{value}</span>
      </span>
      <div className="flex-1" />
      <span
        className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
        style={{ color: sevColor, backgroundColor: sevBg }}
      >
        {severity}
      </span>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function DatabaseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v7c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12v7c0 1.66 4 3 9 3s9-1.34 9-3v-7" />
    </svg>
  )
}
function RowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="16" x2="21" y2="16" />
    </svg>
  )
}
