/**
 * Realistic HTML/CSS mock of a Daflow Dashboard view.
 * Uses semantic colors + product accent colors so it adapts to light/dark mode.
 */
export default function DashboardMockup() {
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
            daflow.app/dashboards/sales-insights
          </div>
        </div>
        <div className="w-12" />
      </div>

      {/* Dashboard header */}
      <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#BF5AF2] text-white flex items-center justify-center text-[11px] font-bold">▦</span>
            <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Sales Insights · Q4</h3>
            <span className="h-5 px-1.5 rounded text-[10px] font-medium bg-[#30D158]/15 text-[#1f9d4c] dark:text-[#4ade80] flex items-center">Live</span>
          </div>
          <div className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
            Generated from Sales Analysis Pipeline · updated 2 min ago
          </div>
        </div>
        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <FilterChip label="Region: All" />
          <FilterChip label="Last 30 days" active />
          <button className="h-7 px-2.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[11.5px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]">
            Export
          </button>
        </div>
      </div>

      {/* Chart grid */}
      <div className="p-5 grid grid-cols-2 gap-4 bg-[var(--color-page-bg)] flex-1">
        {/* KPI card */}
        <ChartCard title="Total Sales" subtitle="Last 30 days">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[28px] leading-none font-bold text-[var(--color-text-primary)] tracking-tight">$12,450</div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#30D158]/15 text-[#1f9d4c] dark:text-[#4ade80] text-[10.5px] font-semibold">
                  ▲ 14.2%
                </span>
                <span className="text-[10.5px] text-[var(--color-text-muted)]">vs prev. month</span>
              </div>
            </div>
            {/* Mini sparkline */}
            <svg viewBox="0 0 120 50" className="w-24 h-12">
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0071E3" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0071E3" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 40 L 15 30 L 30 32 L 45 22 L 60 26 L 75 16 L 90 12 L 105 18 L 120 6 L 120 50 L 0 50 Z"
                fill="url(#sparkFill)"
              />
              <path
                d="M 0 40 L 15 30 L 30 32 L 45 22 L 60 26 L 75 16 L 90 12 L 105 18 L 120 6"
                stroke="#0071E3"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {/* stats row */}
          <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] grid grid-cols-3 gap-2">
            <Stat label="Orders" value="1,284" />
            <Stat label="Avg" value="$9.69" />
            <Stat label="Returns" value="2.1%" accent="danger" />
          </div>
        </ChartCard>

        {/* Bar chart */}
        <ChartCard title="Revenue by Region" subtitle="Top 5 regions">
          <svg viewBox="0 0 300 140" className="w-full h-28">
            {/* Gridlines */}
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1="32"
                x2="296"
                y1={20 + i * 30}
                y2={20 + i * 30}
                stroke="var(--color-border-subtle)"
                strokeDasharray="2 3"
              />
            ))}
            {/* Y labels */}
            {['30k', '20k', '10k', '0'].map((lbl, i) => (
              <text key={lbl} x="4" y={24 + i * 30} fontSize="8" fill="var(--color-text-muted)" fontFamily="ui-sans-serif">
                {lbl}
              </text>
            ))}
            {/* Bars */}
            {[
              { x: 40, h: 86, label: 'NA', color: '#0071E3' },
              { x: 90, h: 70, label: 'EU', color: '#0071E3' },
              { x: 140, h: 60, label: 'APAC', color: '#30D158' },
              { x: 190, h: 44, label: 'LATAM', color: '#F5A623' },
              { x: 240, h: 28, label: 'MEA', color: '#BF5AF2' },
            ].map((bar) => (
              <g key={bar.label}>
                <rect
                  x={bar.x}
                  y={110 - bar.h}
                  width="32"
                  height={bar.h}
                  rx="3"
                  fill={bar.color}
                  opacity="0.92"
                />
                <text x={bar.x + 16} y="125" fontSize="8" fill="var(--color-text-muted)" fontFamily="ui-sans-serif" textAnchor="middle">
                  {bar.label}
                </text>
              </g>
            ))}
          </svg>
        </ChartCard>

        {/* Donut chart */}
        <ChartCard title="Revenue Mix" subtitle="By product category">
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-bg-subtle)" strokeWidth="16" />
              {/* segments: total = 2π*38 ≈ 238.76 */}
              <circle cx="50" cy="50" r="38" fill="none" stroke="#0071E3" strokeWidth="16" strokeDasharray="95 239" strokeDashoffset="0" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#30D158" strokeWidth="16" strokeDasharray="60 239" strokeDashoffset="-95" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#F5A623" strokeWidth="16" strokeDasharray="48 239" strokeDashoffset="-155" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#BF5AF2" strokeWidth="16" strokeDasharray="36 239" strokeDashoffset="-203" />
            </svg>
            <div className="flex-1 space-y-1.5">
              <LegendRow color="#0071E3" label="Software" value="40%" />
              <LegendRow color="#30D158" label="Services" value="25%" />
              <LegendRow color="#F5A623" label="Hardware" value="20%" />
              <LegendRow color="#BF5AF2" label="Other" value="15%" />
            </div>
          </div>
        </ChartCard>

        {/* Line chart */}
        <ChartCard title="Monthly Trend" subtitle="Revenue growth">
          <svg viewBox="0 0 300 140" className="w-full h-28">
            <defs>
              <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#30D158" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#30D158" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Gridlines */}
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1="20"
                x2="290"
                y1={20 + i * 30}
                y2={20 + i * 30}
                stroke="var(--color-border-subtle)"
                strokeDasharray="2 3"
              />
            ))}
            {/* Filled area */}
            <path
              d="M 20 100 L 50 88 L 80 92 L 110 70 L 140 76 L 170 60 L 200 44 L 230 50 L 260 30 L 290 22 L 290 110 L 20 110 Z"
              fill="url(#lineFill)"
            />
            {/* Line */}
            <path
              d="M 20 100 L 50 88 L 80 92 L 110 70 L 140 76 L 170 60 L 200 44 L 230 50 L 260 30 L 290 22"
              stroke="#30D158"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Points */}
            {[
              [20, 100], [50, 88], [80, 92], [110, 70], [140, 76],
              [170, 60], [200, 44], [230, 50], [260, 30], [290, 22],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#fff" stroke="#30D158" strokeWidth="1.8" />
            ))}
            {/* X labels */}
            {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'].map((m, i) => (
              <text key={m} x={20 + i * 30} y="125" fontSize="7.5" fill="var(--color-text-muted)" fontFamily="ui-sans-serif" textAnchor="middle">
                {m}
              </text>
            ))}
          </svg>
        </ChartCard>
      </div>
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</div>
        <div className="text-[11px] text-[var(--color-text-muted)]">{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'danger' | 'success' }) {
  const colorClass =
    accent === 'danger'
      ? 'text-[#FF453A]'
      : accent === 'success'
      ? 'text-[#30D158]'
      : 'text-[var(--color-text-primary)]'
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">{label}</div>
      <div className={`text-[12.5px] font-semibold ${colorClass}`}>{value}</div>
    </div>
  )
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-[var(--color-text-secondary)] flex-1">{label}</span>
      <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{value}</span>
    </div>
  )
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={
        'h-7 px-2.5 rounded-md border text-[11.5px] font-medium flex items-center gap-1 ' +
        (active
          ? 'border-[#0071E3]/40 bg-[#0071E3]/10 text-[#0071E3]'
          : 'border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]')
      }
    >
      {label}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}
