import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import type { CSSProperties, ReactNode } from 'react'

const blue = '#0071E3'
const green = '#30D158'
const purple = '#BF5AF2'
const orange = '#FF9F0A'
const red = '#FF453A'
const bg = '#F5F5F7'
const ink = '#1D1D1F'

export function DaflowPromo() {
  return (
    <AbsoluteFill style={{ backgroundColor: bg, color: ink, fontFamily: font }}>
      <BackgroundGrid />
      <Sequence from={0} durationInFrames={160}>
        <IntroScene />
      </Sequence>
      <Sequence from={135} durationInFrames={230}>
        <WorkflowScene />
      </Sequence>
      <Sequence from={335} durationInFrames={220}>
        <DashboardScene />
      </Sequence>
      <Sequence from={525} durationInFrames={215}>
        <WorkspaceScene />
      </Sequence>
      <Sequence from={720} durationInFrames={180}>
        <FinalScene />
      </Sequence>
    </AbsoluteFill>
  )
}

function IntroScene() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 70 } })
  const templateX = interpolate(frame, [30, 150], [0, -190], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill>
      <div style={{ ...topBar, opacity: interpolate(frame, [0, 28], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <BrandMark size={46} />
        <span style={{ fontSize: 26, fontWeight: 700 }}>Daflow</span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 130,
          top: 250,
          width: 680,
          transform: `translateY(${(1 - enter) * 36}px)`,
          opacity: enter,
        }}
      >
        <div style={eyebrow}>DATA ANALYSIS AUTOMATION</div>
        <div style={{ fontSize: 92, fontWeight: 780, letterSpacing: -3, lineHeight: 0.98 }}>From raw data to insight in one visual flow.</div>
        <p style={{ marginTop: 34, fontSize: 30, lineHeight: 1.45, color: fade(ink, 0.58) }}>
          Upload CSV or Excel data, connect analysis nodes, generate dashboards, reports and team-ready outputs.
        </p>
      </div>
      <div style={{ position: 'absolute', right: 110, top: 155, width: 780, height: 760, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 28, transform: `translateX(${templateX}px)`, opacity: interpolate(frame, [20, 45], [0, 1], { extrapolateRight: 'clamp' }) }}>
          <TemplatePreview title="Sales Performance" accent={blue} nodes={['Upload', 'Column Types', 'Statistics', 'Charts', 'Dashboard']} />
          <TemplatePreview title="Real Estate Analysis" accent={green} nodes={['File', 'Profiler', 'Correlation', 'Map', 'Report']} />
          <TemplatePreview title="Anomaly Detection" accent={purple} nodes={['Dataset', 'Clean', 'CCSG-SG', 'KPI', 'Alert']} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

function WorkflowScene() {
  const frame = useCurrentFrame()
  const local = frame - 135
  const draw = interpolate(local, [12, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const active = Math.min(5, Math.floor(interpolate(local, [35, 160], [0, 6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })))

  return (
    <AbsoluteFill>
      <SceneTitle
        eyebrow="WORKFLOW BUILDER"
        title="Build analysis pipelines by connecting nodes."
        subtitle="Every node has a single clear input, visible status, preview output and clean routing."
        frame={local}
      />
      <div style={canvas}>
        <svg style={{ position: 'absolute', inset: 0 }} viewBox="0 0 1320 650">
          <AnimatedPath d="M195 320 C310 320 320 190 445 190" progress={draw} color={blue} />
          <AnimatedPath d="M195 320 C315 320 320 320 445 320" progress={draw - 0.12} color={blue} />
          <AnimatedPath d="M195 320 C315 320 320 450 445 450" progress={draw - 0.22} color={blue} />
          <AnimatedPath d="M660 190 C755 190 765 255 865 255" progress={draw - 0.35} color={purple} />
          <AnimatedPath d="M660 320 C755 320 765 255 865 255" progress={draw - 0.45} color={purple} />
          <AnimatedPath d="M660 450 C755 450 765 390 865 390" progress={draw - 0.55} color={orange} />
          <AnimatedPath d="M1065 255 C1140 255 1145 320 1210 320" progress={draw - 0.65} color={green} />
          <AnimatedPath d="M1065 390 C1140 390 1145 320 1210 320" progress={draw - 0.72} color={green} />
        </svg>
        <FlowNode x={60} y={282} label="File Upload" icon="↑" accent={blue} active={active >= 0} />
        <RouteNode x={310} y={305} active={active >= 1} />
        <FlowNode x={445} y={152} label="Column Types" icon="T" accent={orange} active={active >= 2} />
        <FlowNode x={445} y={282} label="Statistics" icon="σ" accent={green} active={active >= 2} />
        <FlowNode x={445} y={412} label="Missing Values" icon="○" accent={orange} active={active >= 2} />
        <FlowNode x={865} y={217} label="Chart Nodes" icon="▣" accent={purple} active={active >= 3} />
        <FlowNode x={865} y={352} label="Report Builder" icon="□" accent={orange} active={active >= 4} />
        <FlowNode x={1210} y={282} label="Dashboard" icon="⊞" accent={purple} active={active >= 5} />
      </div>
    </AbsoluteFill>
  )
}

function DashboardScene() {
  const frame = useCurrentFrame()
  const local = frame - 335
  const progress = spring({ frame: local, fps: 30, config: { damping: 18, stiffness: 68 } })
  return (
    <AbsoluteFill>
      <SceneTitle
        eyebrow="DASHBOARDS & REPORTS"
        title="Turn workflow results into presentation-ready outputs."
        subtitle="Filtered charts, KPI cards, clean reports and printable pages share the same data model."
        frame={local}
      />
      <div style={{ ...dashboardFrame, transform: `translateY(${(1 - progress) * 34}px) scale(${0.96 + progress * 0.04})`, opacity: progress }}>
        <div style={dashboardHeader}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 720 }}>Real Estate Market Dashboard</div>
            <div style={{ fontSize: 13, color: fade(ink, 0.45), marginTop: 6 }}>Filtered by state, price range and property type</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['State', 'Price', 'Year'].map((label) => <Chip key={label}>{label}</Chip>)}
          </div>
        </div>
        <div style={dashboardGrid}>
          <KpiCard label="Median Price" value="$423K" color={blue} />
          <KpiCard label="Active Listings" value="48.2K" color={green} />
          <KpiCard label="Avg. Sqft" value="2,140" color={orange} />
          <ChartCard title="Price by State" type="bar" color={blue} delay={local - 20} />
          <ChartCard title="Price Distribution" type="hist" color={purple} delay={local - 35} />
          <ChartCard title="Location Map" type="map" color={green} delay={local - 50} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

function WorkspaceScene() {
  const frame = useCurrentFrame()
  const local = frame - 525
  const progress = spring({ frame: local, fps: 30, config: { damping: 20, stiffness: 70 } })
  return (
    <AbsoluteFill>
      <SceneTitle
        eyebrow="TEAM WORKSPACES"
        title="Organize work by workspace, project and role."
        subtitle="Invite teammates, track activity, comment on outputs and keep dashboards scoped to the right project."
        frame={local}
      />
      <div style={{ ...workspaceShell, opacity: progress, transform: `translateY(${(1 - progress) * 28}px)` }}>
        <div style={workspaceTop}>
          <BrandMark size={32} />
          <Pill>Marketing Workspace</Pill>
          <span style={{ color: fade(ink, 0.3), fontSize: 24 }}>/</span>
          <Pill>Real Estate Q2</Pill>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <CircleBadge color={red}>2</CircleBadge>
            <CircleBadge color={blue}>A</CircleBadge>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', minHeight: 520 }}>
          <div style={workspaceSide}>
            {['Workspace Overview', 'Files', 'Workflows', 'Dashboards', 'Reports', 'Members & Roles'].map((item, index) => (
              <div key={item} style={{ ...sideItem, background: index === 2 ? fade(blue, 0.1) : 'transparent', color: index === 2 ? blue : fade(ink, 0.76) }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${index === 2 ? blue : fade(ink, 0.45)}` }} />
                {item}
              </div>
            ))}
          </div>
          <div style={{ padding: 30 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                ['Datasets', '12'],
                ['Workflows', '24'],
                ['Dashboards', '8'],
                ['Reports', '5'],
              ].map(([label, value]) => <WorkspaceStat key={label} label={label} value={value} />)}
            </div>
            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ActivityCard title="Zeynep commented on Dashboard" body="Review anomaly threshold before export." />
              <ActivityCard title="Mehmet joined as Analyst" body="Can upload data and create workflows." />
              <ActivityCard title="Workflow executed" body="Real Estate Q2 finished in 18s." />
              <ActivityCard title="Report generated" body="PDF output is ready for presentation." />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

function FinalScene() {
  const frame = useCurrentFrame()
  const local = frame - 720
  const progress = spring({ frame: local, fps: 30, config: { damping: 18, stiffness: 65 } })
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 70% 36%, ${fade(blue, 0.14)}, transparent 34%), ${bg}` }} />
      <div style={{ position: 'absolute', left: 150, top: 245, opacity: progress, transform: `translateY(${(1 - progress) * 28}px)` }}>
        <BrandMark size={74} />
        <div style={{ marginTop: 28, fontSize: 100, fontWeight: 800, letterSpacing: -4 }}>Daflow</div>
        <div style={{ marginTop: 18, width: 720, fontSize: 36, lineHeight: 1.35, color: fade(ink, 0.62) }}>
          A visual data analysis platform for workflows, dashboards, reports and team collaboration.
        </div>
        <div style={{ marginTop: 44, display: 'flex', gap: 14 }}>
          <Chip strong>Upload</Chip>
          <Chip strong>Connect</Chip>
          <Chip strong>Analyze</Chip>
          <Chip strong>Present</Chip>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 150, bottom: 130, fontSize: 24, color: fade(ink, 0.44) }}>Made with Daflow</div>
    </AbsoluteFill>
  )
}

function SceneTitle({ eyebrow, title, subtitle, frame }: { eyebrow: string; title: string; subtitle: string; frame: number }) {
  const p = interpolate(frame, [0, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', left: 120, top: 110, width: 850, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
      <div style={eyebrowStyle}>{eyebrow}</div>
      <div style={{ fontSize: 58, fontWeight: 780, letterSpacing: -2, lineHeight: 1.02 }}>{title}</div>
      <div style={{ marginTop: 18, fontSize: 25, lineHeight: 1.38, color: fade(ink, 0.55), width: 780 }}>{subtitle}</div>
    </div>
  )
}

function TemplatePreview({ title, accent, nodes }: { title: string; accent: string; nodes: string[] }) {
  return (
    <div style={{ width: 420, height: 560, borderRadius: 34, background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 70px rgba(0,0,0,0.13)', padding: 26 }}>
      <div style={{ fontSize: 24, fontWeight: 720 }}>{title}</div>
      <div style={{ marginTop: 18, height: 1, background: 'rgba(0,0,0,0.06)' }} />
      <div style={{ position: 'relative', marginTop: 40, height: 390 }}>
        {nodes.map((node, index) => (
          <div key={node} style={{ position: 'absolute', left: index % 2 ? 120 : 20, top: 18 + index * 70, width: 240, height: 54, borderRadius: 18, background: 'white', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10 }}>
            <span style={{ width: 26, height: 26, borderRadius: 9, background: index === nodes.length - 1 ? purple : accent, color: 'white', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>{node[0]}</span>
            <span style={{ fontSize: 15, fontWeight: 650 }}>{node}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FlowNode({ x, y, label, icon, accent, active }: { x: number; y: number; label: string; icon: string; accent: string; active: boolean }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 210, height: 78, borderRadius: 22, background: 'white', border: `2px solid ${active ? green : 'rgba(0,0,0,0.08)'}`, boxShadow: active ? `0 0 0 8px ${fade(green, 0.1)}` : '0 12px 36px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
      <span style={{ width: 38, height: 38, borderRadius: 12, background: accent, color: 'white', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800 }}>{icon}</span>
      <span style={{ fontSize: 18, fontWeight: 690 }}>{label}</span>
      <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: active ? green : fade(ink, 0.18) }} />
    </div>
  )
}

function RouteNode({ x, y, active }: { x: number; y: number; active: boolean }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 58, height: 58, borderRadius: 12, background: 'white', border: `2px solid ${active ? green : 'rgba(0,0,0,0.08)'}`, display: 'grid', placeItems: 'center', boxShadow: '0 12px 34px rgba(0,0,0,0.08)' }}>
      <span style={{ fontSize: 22, color: fade(ink, 0.5) }}>R</span>
    </div>
  )
}

function AnimatedPath({ d, progress, color }: { d: string; progress: number; color: string }) {
  const p = Math.max(0, Math.min(1, progress))
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray="1" pathLength={1} strokeDashoffset={1 - p} opacity={0.64} />
  )
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ borderRadius: 24, background: 'white', border: '1px solid rgba(0,0,0,0.08)', padding: 22 }}>
      <div style={{ width: 34, height: 34, borderRadius: 12, background: fade(color, 0.12), marginBottom: 18 }} />
      <div style={{ fontSize: 38, fontWeight: 790 }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 15, color: fade(ink, 0.48) }}>{label}</div>
    </div>
  )
}

function ChartCard({ title, type, color, delay }: { title: string; type: 'bar' | 'hist' | 'map'; color: string; delay: number }) {
  const p = spring({ frame: Math.max(0, delay), fps: 30, config: { damping: 18, stiffness: 80 } })
  return (
    <div style={{ borderRadius: 24, background: 'white', border: '1px solid rgba(0,0,0,0.08)', padding: 22, gridColumn: type === 'map' ? 'span 2' : 'span 1', minHeight: 230, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
      <div style={{ fontSize: 18, fontWeight: 720, marginBottom: 20 }}>{title}</div>
      {type === 'bar' && <Bars color={color} />}
      {type === 'hist' && <Bars color={color} dense />}
      {type === 'map' && <MapLike color={color} />}
    </div>
  )
}

function Bars({ color, dense = false }: { color: string; dense?: boolean }) {
  const frame = useCurrentFrame()
  const heights = dense ? [42, 88, 128, 104, 72, 38, 22] : [70, 118, 58, 145, 92]
  return (
    <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', gap: dense ? 14 : 22 }}>
      {heights.map((h, index) => {
        const scale = interpolate(frame % 90, [0, 50], [0.86, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        return <span key={index} style={{ width: dense ? 28 : 42, height: h * scale, borderRadius: 9, background: fade(color, 0.68) }} />
      })}
    </div>
  )
}

function MapLike({ color }: { color: string }) {
  return (
    <svg width="100%" height="160" viewBox="0 0 420 160">
      {[
        [30, 55, 85, 34],
        [130, 35, 96, 42],
        [250, 62, 110, 36],
        [95, 105, 130, 34],
        [260, 108, 78, 30],
      ].map(([x, y, w, h], index) => (
        <rect key={index} x={x} y={y} width={w} height={h} rx={16} fill={fade(color, 0.18 + index * 0.08)} stroke={fade(color, 0.5)} />
      ))}
    </svg>
  )
}

function WorkspaceStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: 22, background: 'white', border: '1px solid rgba(0,0,0,0.08)', padding: 18 }}>
      <div style={{ fontSize: 13, color: fade(ink, 0.44) }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 34, fontWeight: 780 }}>{value}</div>
    </div>
  )
}

function ActivityCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ borderRadius: 22, background: 'white', border: '1px solid rgba(0,0,0,0.08)', padding: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 14, color: fade(ink, 0.5), lineHeight: 1.4 }}>{body}</div>
    </div>
  )
}

function Chip({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <span style={{ padding: strong ? '12px 18px' : '8px 12px', borderRadius: 999, background: strong ? blue : fade(ink, 0.055), color: strong ? 'white' : fade(ink, 0.62), fontSize: strong ? 18 : 13, fontWeight: 700 }}>{children}</span>
}

function Pill({ children }: { children: ReactNode }) {
  return <span style={{ height: 42, padding: '0 16px', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.78)', display: 'inline-flex', alignItems: 'center', fontSize: 15, fontWeight: 700 }}>{children}</span>
}

function CircleBadge({ children, color }: { children: ReactNode; color: string }) {
  return <span style={{ width: 40, height: 40, borderRadius: '50%', background: color, color: 'white', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800 }}>{children}</span>
}

function BrandMark({ size }: { size: number }) {
  return <Img src={staticFile('/brand/daflow-mark-blue.png')} style={{ width: size, height: size, objectFit: 'contain' }} />
}

function BackgroundGrid() {
  return (
    <AbsoluteFill style={{ backgroundImage: 'radial-gradient(circle, rgba(29,29,31,0.09) 1.2px, transparent 1.2px)', backgroundSize: '32px 32px', opacity: 0.48 }} />
  )
}

const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
const eyebrowStyle: CSSProperties = { color: blue, fontSize: 16, letterSpacing: 6, fontWeight: 780, marginBottom: 18 }
const eyebrow = { ...eyebrowStyle, marginBottom: 24 }
const topBar: CSSProperties = { position: 'absolute', left: 52, right: 52, top: 38, height: 62, display: 'flex', alignItems: 'center', gap: 14 }
const canvas: CSSProperties = { position: 'absolute', left: 300, right: 100, top: 330, height: 650, borderRadius: 34, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 28px 90px rgba(0,0,0,0.12)', overflow: 'hidden' }
const dashboardFrame: CSSProperties = { position: 'absolute', left: 190, right: 190, top: 315, height: 650, borderRadius: 34, background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 28px 90px rgba(0,0,0,0.13)', overflow: 'hidden' }
const dashboardHeader: CSSProperties = { height: 90, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }
const dashboardGrid: CSSProperties = { padding: 24, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 18 }
const workspaceShell: CSSProperties = { position: 'absolute', left: 180, right: 180, top: 320, height: 610, borderRadius: 34, background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 28px 90px rgba(0,0,0,0.13)', overflow: 'hidden' }
const workspaceTop: CSSProperties = { height: 74, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px' }
const workspaceSide: CSSProperties = { borderRight: '1px solid rgba(0,0,0,0.06)', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }
const sideItem: CSSProperties = { height: 44, borderRadius: 16, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 690 }

function fade(hex: string, alpha: number) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
