import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workflowsApi } from '../api/workflows'
import toast from 'react-hot-toast'

// ── Template definitions ──────────────────────────────────────────────────────

interface Template {
  id: string
  name: string
  description: string
  icon: string
  color: string
  nodes: unknown[]
  edges: unknown[]
}

const uuid = () => crypto.randomUUID()

function makeEdge(source: string, target: string, sh = 'dataframe', th = 'dataframe') {
  return { id: uuid(), source, target, sourceHandle: sh, targetHandle: th, type: 'smoothstep' }
}

function makeNode(id: string, type: string, label: string, category: string, x: number, y: number, config = {}) {
  return { id, type, position: { x, y }, data: { label, category, config, status: 'idle' } }
}

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank Workflow',
    description: 'Start from scratch with an empty canvas.',
    icon: '○',
    color: 'bg-black/[0.06] dark:bg-white/[0.07]',
    nodes: [],
    edges: [],
  },
  {
    id: 'quick_eda',
    name: 'Quick EDA',
    description: 'Upload a file and instantly get descriptive statistics, distribution charts, and a dashboard.',
    icon: '∿',
    color: 'bg-[#0071E3]',
    nodes: (() => {
      const n = [
        makeNode('n1', 'file_upload',   'File Upload',           'source',      80,  200),
        makeNode('n2', 'statistics',    'Statistics',            'analysis',    350, 120, {}),
        makeNode('n3', 'distribution',  'Distribution',          'analysis',    350, 260, { bins: 20 }),
        makeNode('n4', 'dashboard',     'Dashboard',             'output',      620, 200, { title: 'Quick EDA Dashboard' }),
      ]
      return n
    })(),
    edges: (() => {
      const ids = { n1: 'n1', n2: 'n2', n3: 'n3', n4: 'n4' }
      return [
        makeEdge(ids.n1, ids.n2),
        makeEdge(ids.n1, ids.n3),
        makeEdge(ids.n2, ids.n4),
        makeEdge(ids.n3, ids.n4),
      ]
    })(),
  },
  {
    id: 'anomaly_pipeline',
    name: 'Anomaly Detection Pipeline',
    description: 'Clean data, detect outliers with IQR method, and visualize anomalies in a dashboard.',
    icon: '△',
    color: 'bg-[#FF453A]',
    nodes: (() => {
      return [
        makeNode('n1', 'file_upload',       'File Upload',        'source',      80,  200),
        makeNode('n2', 'missing_value',     'Missing Values',     'preparation', 320, 120, { strategy: 'fill_median' }),
        makeNode('n3', 'anomaly_detection', 'Anomaly Detection',  'analysis',    320, 260, { method: 'iqr', iqr_multiplier: 1.5 }),
        makeNode('n4', 'statistics',        'Statistics',         'analysis',    560, 120),
        makeNode('n5', 'dashboard',         'Dashboard',          'output',      800, 200, { title: 'Anomaly Dashboard' }),
      ]
    })(),
    edges: (() => {
      return [
        makeEdge('n1', 'n2'),
        makeEdge('n2', 'n3'),
        makeEdge('n2', 'n4'),
        makeEdge('n3', 'n5'),
        makeEdge('n4', 'n5'),
      ]
    })(),
  },
  {
    id: 'full_analysis',
    name: 'Full Analysis',
    description: 'Complete pipeline: type detection, missing values, duplicates, statistics, anomaly, correlation, and report.',
    icon: 'σ',
    color: 'bg-[#30D158]',
    nodes: (() => {
      return [
        makeNode('n1',  'file_upload',           'File Upload',           'source',      80,   300),
        makeNode('n2',  'column_type_detection', 'Column Types',          'preparation', 320,  120),
        makeNode('n3',  'missing_value',         'Missing Values',        'preparation', 320,  260, { strategy: 'fill_median' }),
        makeNode('n4',  'duplicate_detection',   'Duplicates',            'preparation', 320,  400),
        makeNode('n5',  'statistics',            'Statistics',            'analysis',    580,  120),
        makeNode('n6',  'anomaly_detection',     'Anomaly Detection',     'analysis',    580,  260, { method: 'iqr' }),
        makeNode('n7',  'correlation',           'Correlation',           'analysis',    580,  400, { method: 'pearson', threshold: 0.7 }),
        makeNode('n8',  'distribution',          'Distribution',          'analysis',    580,  540, { bins: 20 }),
        makeNode('n9',  'report',                'Report',                'output',      860,  300, { title: 'Full Analysis Report' }),
        makeNode('n10', 'ai_insights',           'AI Insights',           'output',      1120, 300, { provider: 'gemini', language: 'English' }),
      ]
    })(),
    edges: (() => {
      return [
        makeEdge('n1', 'n2'), makeEdge('n1', 'n3'), makeEdge('n1', 'n4'),
        makeEdge('n3', 'n5'), makeEdge('n3', 'n6'), makeEdge('n3', 'n7'), makeEdge('n3', 'n8'),
        makeEdge('n5', 'n9'), makeEdge('n6', 'n9'), makeEdge('n7', 'n9'), makeEdge('n8', 'n9'),
        makeEdge('n9', 'n10', 'report_data', 'report_data'),
      ]
    })(),
  },
]

// ── Modal component ───────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export default function WorkflowTemplateModal({ onClose }: Props) {
  const [selected, setSelected] = useState<string>('blank')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const handleCreate = async () => {
    const tpl = TEMPLATES.find((t) => t.id === selected)!
    setCreating(true)
    try {
      const wf = await workflowsApi.create({ name: tpl.id === 'blank' ? 'New Workflow' : tpl.name })
      if (tpl.nodes.length > 0) {
        await workflowsApi.save(wf.id, {
          nodes: tpl.nodes as never[],
          edges: tpl.edges as never[],
          viewport: { x: 0, y: 0, zoom: 1 },
          name: tpl.name,
        })
      }
      navigate(`/workflows/${wf.id}/edit`)
    } catch {
      toast.error('Failed to create workflow')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">New Workflow</h2>
          <p className="text-[13px] text-[#1d1d1f]/40 dark:text-white/40 mt-0.5">Start blank or pick a template</p>
        </div>

        {/* Templates */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setSelected(tpl.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                selected === tpl.id
                  ? 'border-[#0071E3] bg-[#0071E3]/[0.06]'
                  : 'border-black/[0.07] dark:border-white/[0.07] hover:border-black/[0.14] dark:hover:border-white/[0.14]'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0 ${tpl.id === 'blank' ? 'bg-black/[0.06] dark:bg-white/[0.07] text-[#1d1d1f]/40 dark:text-white/40' : `${tpl.color} text-white`}`}>
                {tpl.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{tpl.name}</p>
                <p className="text-[11px] text-[#1d1d1f]/40 dark:text-white/40 leading-snug mt-0.5">{tpl.description}</p>
              </div>
              {selected === tpl.id && (
                <div className="w-5 h-5 rounded-full bg-[#0071E3] flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 h-8 rounded-lg text-[13px] text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-5 h-8 rounded-lg text-[13px] font-medium bg-[#0071E3] hover:bg-[#0077ED] text-white transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  )
}
