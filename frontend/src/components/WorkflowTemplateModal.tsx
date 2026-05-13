import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { templatesApi } from '../api/platform'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import type { WorkflowTemplate } from '../types/workflow'
import { useI18n } from '../i18n'
import { Background, BackgroundVariant, ReactFlow, type Edge, type Node } from '@xyflow/react'
import { nodeTypes } from './nodes/nodeTypes'

interface Props {
  onClose: () => void
}

export default function WorkflowTemplateModal({ onClose }: Props) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [creating, setCreating] = useState(false)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { lang } = useI18n()
  const tr = lang === 'tr'

  useEffect(() => {
    templatesApi.list()
      .then((items) => {
        setTemplates(items)
        setSelectedId(items[0]?.id ?? '')
      })
      .catch(() => toast.error(tr ? 'Template listesi yüklenemedi' : 'Templates could not be loaded'))
  }, [tr])

  const categories = useMemo(() => ['All', ...Array.from(new Set(templates.map((item) => item.category || 'General')))], [templates])
  const visible = useMemo(() => {
    const base = category === 'All'
      ? templates
      : category === 'Favorites'
        ? templates.filter((item) => item.is_favorite)
        : templates.filter((item) => item.category === category)
    const needle = search.trim().toLowerCase()
    if (!needle) return base
    return base.filter((item) => {
      const haystack = [
        item.title,
        item.name,
        item.description,
        item.category,
        ...(item.required_columns ?? []).map(String),
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }, [category, search, templates])
  const selected = templates.find((item) => item.id === selectedId)
  const { activeWorkspaceId } = useWorkspace()
  const sortedVisible = useMemo(() => {
    return [...visible].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || (b.rating_average ?? 0) - (a.rating_average ?? 0) || a.title.localeCompare(b.title))
  }, [visible])

  useEffect(() => {
    if (sortedVisible.length > 0 && !sortedVisible.some((item) => item.id === selectedId)) {
      setSelectedId(sortedVisible[0].id)
    }
  }, [selectedId, sortedVisible])

  const handleCreate = async () => {
    if (!selected) return
    setCreating(true)
    try {
      const wf = await templatesApi.createWorkflow(selected.id, selected.title, activeWorkspaceId)
      navigate(`/workflows/${wf.id}/edit`)
    } catch {
      toast.error(tr ? 'Workflow oluşturulamadı' : 'Failed to create workflow')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
        className="relative bg-surface rounded-2xl border border-[var(--color-border-default)] shadow-2xl w-full max-w-4xl mx-4 overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3 border-b border-[var(--color-border-subtle)]">
          <h2 id="template-modal-title" className="text-[16px] font-semibold text-[var(--color-text-primary)]">{tr ? 'Template Marketplace' : 'Template Marketplace'}</h2>
          <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
            {tr ? "Hazır analiz akışlarından başlayın veya kendi template'lerinizi kaydedin." : 'Start from ready analysis flows or save your own templates.'}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`h-7 px-2.5 rounded-lg text-[11px] ${category === item ? 'bg-primary text-white' : 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)]'}`}
                >
                  {item === 'All' && tr ? 'Tümü' : item}
                </button>
              ))}
              <button
                onClick={() => setCategory('Favorites')}
                className={`h-7 px-2.5 rounded-lg text-[11px] ${category === 'Favorites' ? 'bg-primary text-white' : 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)]'}`}
              >
                {tr ? 'Favoriler' : 'Favorites'}
              </button>
            </div>
            <div className="h-8 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-secondary)] flex items-center gap-2 px-3">
              <svg className="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
              </svg>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tr ? 'Template ara...' : 'Search templates...'}
                className="min-w-0 flex-1 bg-transparent outline-none text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
              />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-0">
          <div className="p-3 grid sm:grid-cols-2 gap-2 max-h-[440px] overflow-y-auto">
            {sortedVisible.length === 0 && (
              <div className="sm:col-span-2 h-44 rounded-xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-secondary)]/50 flex flex-col items-center justify-center text-center px-6">
                <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">{tr ? 'Template bulunamadı' : 'No templates found'}</p>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{tr ? 'Arama kelimesini veya kategori filtresini değiştirin.' : 'Try another search term or category filter.'}</p>
              </div>
            )}
            {sortedVisible.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedId(tpl.id)}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  selectedId === tpl.id
                    ? 'border-primary bg-primary/[0.06]'
                    : 'border-[var(--color-border-default)] hover:border-[var(--color-border-default)]/80'
                }`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] flex-shrink-0 bg-primary text-white">
                  {tpl.icon || tpl.title.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{tpl.title || tpl.name}</p>
                    <span className="text-[11px] text-warning flex-shrink-0">★ {tpl.rating_average || 0}</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-snug mt-0.5 line-clamp-2">{tpl.description}</p>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <p className="text-[10px] text-[var(--color-text-muted)]">{tpl.graph_data?.nodes?.length ?? 0} nodes · {tpl.category}</p>
                    <span className={`text-[11px] ${tpl.is_favorite ? 'text-warning' : 'text-[var(--color-text-muted)]'}`}>★</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <aside className="border-l border-[var(--color-border-subtle)] p-4 bg-[var(--color-secondary)]/50 max-h-[440px] overflow-y-auto">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] mb-2">{tr ? 'Önizleme' : 'Preview'}</p>
            <h3 className="text-[15px] font-semibold mb-2">{selected?.title || '-'}</h3>
            <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)] mb-4">{selected?.description}</p>

            {selected && <TemplateGraphPreview template={selected} />}

            {selected && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={async () => {
                    const next = !selected.is_favorite
                    setTemplates((items) => items.map((item) => item.id === selected.id ? { ...item, is_favorite: next } : item))
                    try {
                      if (next) await templatesApi.favorite(selected.id)
                      else await templatesApi.unfavorite(selected.id)
                    } catch {
                      toast.error(tr ? 'Favori güncellenemedi' : 'Favorite could not be updated')
                    }
                  }}
                  className={`h-8 px-3 rounded-lg text-[12px] font-medium ${selected.is_favorite ? 'bg-warning/12 text-warning' : 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)]'}`}
                >
                  {selected.is_favorite ? (tr ? 'Favoride' : 'Favorited') : (tr ? 'Favorile' : 'Favorite')}
                </button>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={async () => {
                      setTemplates((items) => items.map((item) => item.id === selected.id ? { ...item, my_rating: rating, rating_average: rating } : item))
                      try {
                        await templatesApi.rate(selected.id, rating)
                      } catch {
                        toast.error(tr ? 'Puan kaydedilemedi' : 'Rating could not be saved')
                      }
                    }}
                    className={`w-7 h-7 rounded-lg text-[13px] ${rating <= (selected.my_rating || 0) ? 'text-warning bg-warning/10' : 'text-[var(--color-text-muted)] bg-[var(--color-secondary)]'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-2">
                {tr ? 'Gereken veri' : 'Required data'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(selected?.required_columns?.length ? selected.required_columns : [tr ? 'CSV veya Excel tablo' : 'CSV or Excel table']).map((item, index) => (
                  <span key={`${String(item)}-${index}`} className="px-2 h-6 rounded-lg bg-surface border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-secondary)] inline-flex items-center">
                    {String(item)}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {tr ? 'Akış düğümleri' : 'Flow nodes'}
              </p>
              {(selected?.graph_data?.nodes ?? []).map((node) => (
                <div key={node.id} className="h-8 rounded-lg bg-surface border border-[var(--color-border-subtle)] px-3 flex items-center justify-between gap-3 text-[11px]">
                  <span className="truncate">{node.data?.label || node.type}</span>
                  <span className="text-[var(--color-text-muted)] truncate max-w-[130px]">{node.type}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="px-5 py-3 border-t border-[var(--color-border-subtle)] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 h-8 rounded-lg text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-secondary)]">
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button onClick={handleCreate} disabled={creating || !selected} className="px-5 h-8 rounded-lg text-[13px] font-medium bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-50">
            {creating ? (tr ? 'Oluşturuluyor...' : 'Creating...') : (tr ? 'Workflow oluştur' : 'Create Workflow')}
          </button>
        </div>
      </div>
    </div>
  )
}

function TemplateGraphPreview({ template }: { template: WorkflowTemplate }) {
  const nodes = useMemo<Node[]>(() => (template.graph_data?.nodes ?? []).map((node) => ({
    ...node,
    draggable: false,
    selectable: false,
    data: {
      ...node.data,
      status: 'idle',
    },
  })) as Node[], [template])
  const edges = useMemo<Edge[]>(() => (template.graph_data?.edges ?? []).map((edge) => ({
    ...edge,
    animated: false,
    style: { stroke: '#8AB4F8', strokeWidth: 2.5, opacity: 0.9 },
  })) as Edge[], [template])
  return (
    <div className="h-[210px] rounded-xl overflow-hidden border border-[var(--color-border-default)] bg-page-bg">
      <ReactFlow
        key={template.id}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.22, minZoom: 0.35, maxZoom: 0.9 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="rgba(142,142,147,0.22)" />
      </ReactFlow>
    </div>
  )
}
