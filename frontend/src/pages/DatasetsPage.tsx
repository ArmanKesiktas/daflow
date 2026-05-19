import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { filesApi } from '../api/executions'
import { connectorsApi, datasetOrgApi } from '../api/platform'
import type { DataConnector, DatasetFolder, DatasetListItem, DatasetTag } from '../types/workflow'
import { useI18n } from '../i18n'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [folders, setFolders] = useState<DatasetFolder[]>([])
  const [tags, setTags] = useState<DatasetTag[]>([])
  const [connectors, setConnectors] = useState<DataConnector[]>([])
  const [activeFolder, setActiveFolder] = useState<string>('all')
  const [activeTag, setActiveTag] = useState<string>('all')
  const [newFolderName, setNewFolderName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [connectorDraft, setConnectorDraft] = useState({
    type: 'public_url' as DataConnector['type'],
    name: '',
    url: '',
    records_path: '',
    table: '',
    api_key: '',
    connection_string: '',
    query: 'select 1 as value',
  })
  const [connectorTest, setConnectorTest] = useState<Record<string, string>>({})
  const navigate = useNavigate()
  const { workspaceId: routeWorkspaceId, projectId: routeProjectId } = useParams()
  const { lang } = useI18n()
  const { activeWorkspaceId, activeWorkspace, activeProject } = useWorkspace()
  const effectiveWorkspaceId = routeWorkspaceId || activeWorkspaceId
  const effectiveProjectId = routeProjectId || null
  const visibleProject = routeProjectId ? activeProject : null
  const tr = lang === 'tr'

  const load = () => {
    setLoading(true)
    setError(null)
    filesApi.list(effectiveWorkspaceId, effectiveProjectId)
      .then(setDatasets)
      .catch(() => {
        setError(tr ? 'Veriler yüklenemedi' : 'Datasets could not be loaded')
        toast.error(tr ? 'Veriler yüklenemedi' : 'Datasets could not be loaded')
      })
      .finally(() => setLoading(false))
    datasetOrgApi.folders().then(setFolders).catch(() => setFolders([]))
    datasetOrgApi.tags().then(setTags).catch(() => setTags([]))
    connectorsApi.list().then(setConnectors).catch(() => setConnectors([]))
  }

  useEffect(load, [tr, effectiveWorkspaceId, effectiveProjectId])

  const filtered = useMemo(() => {
    return datasets.filter((item) => {
      if (search && !item.filename.toLowerCase().includes(search.toLowerCase())) return false
      if (activeFolder !== 'all' && (item.folder_id || 'none') !== activeFolder) return false
      if (activeTag !== 'all') {
        const tag = tags.find((candidate) => candidate.id === activeTag)
        if (!tag?.dataset_ids?.includes(item.id)) return false
      }
      return true
    })
  }, [activeFolder, activeTag, datasets, search, tags])

  const startRename = (dataset: DatasetListItem) => {
    setRenamingId(dataset.id)
    setDraftName(dataset.filename)
  }

  const saveRename = async () => {
    if (!renamingId || !draftName.trim()) return
    try {
      await filesApi.rename(renamingId, draftName.trim())
      setDatasets((items) => items.map((item) => item.id === renamingId ? { ...item, filename: draftName.trim() } : item))
      toast.success(tr ? 'Dosya adı güncellendi' : 'Dataset renamed')
      setRenamingId(null)
    } catch {
      toast.error(tr ? 'Yeniden adlandırılamadı' : 'Rename failed')
    }
  }

  const createWorkflow = async (dataset: DatasetListItem) => {
    try {
      const wf = await filesApi.createWorkflow(dataset.id)
      navigate(`/workflows/${wf.id}/edit`)
    } catch {
      toast.error(tr ? 'Workflow oluşturulamadı' : 'Workflow could not be created')
    }
  }

  const deleteDataset = async (dataset: DatasetListItem) => {
    try {
      await filesApi.delete(dataset.id)
      setDatasets((items) => items.filter((item) => item.id !== dataset.id))
      toast.success(tr ? 'Veri silindi' : 'Dataset deleted')
    } catch {
      toast.error(tr ? 'Veri silinemedi' : 'Dataset could not be deleted')
    }
  }

  const createFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    try {
      const folder = await datasetOrgApi.createFolder({ name })
      setFolders((items) => [folder, ...items])
      setNewFolderName('')
    } catch {
      toast.error('Operation failed')
    }
  }

  const createTag = async () => {
    const name = newTagName.trim()
    if (!name) return
    try {
      const tag = await datasetOrgApi.createTag({ name })
      setTags((items) => [tag, ...items])
      setNewTagName('')
    } catch {
      toast.error('Operation failed')
    }
  }

  const moveDataset = async (dataset: DatasetListItem, folder_id: string | null) => {
    try {
      await datasetOrgApi.updateFile(dataset.id, { folder_id })
      setDatasets((items) => items.map((item) => item.id === dataset.id ? { ...item, folder_id } : item))
    } catch {
      toast.error('Operation failed')
    }
  }

  const toggleDatasetTag = async (dataset: DatasetListItem, tagId: string) => {
    try {
      const current = tags.filter((tag) => tag.dataset_ids?.includes(dataset.id)).map((tag) => tag.id)
      const next = current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
      await datasetOrgApi.updateFile(dataset.id, { folder_id: dataset.folder_id, tag_ids: next })
      setTags((items) => items.map((tag) => ({
        ...tag,
        dataset_ids: next.includes(tag.id)
          ? Array.from(new Set([...(tag.dataset_ids || []), dataset.id]))
          : (tag.dataset_ids || []).filter((id) => id !== dataset.id),
      })))
    } catch {
      toast.error('Operation failed')
    }
  }

  const createConnector = async () => {
    const config_json = connectorConfig(connectorDraft)
    if (!Object.values(config_json).some(Boolean)) return toast.error(tr ? 'Bağlantı bilgisi gerekli' : 'Connection details are required')
    try {
      const connector = await connectorsApi.create({
        type: connectorDraft.type,
        name: connectorDraft.name || connectorDraft.type,
        config_json,
      })
      setConnectors((items) => [connector, ...items])
      toast.success(tr ? 'Connector eklendi' : 'Connector added')
    } catch {
      toast.error(tr ? 'Connector eklenemedi' : 'Connector failed')
    }
  }

  const testConnector = async (connector: DataConnector) => {
    setConnectorTest((state) => ({ ...state, [connector.id]: tr ? 'Test ediliyor...' : 'Testing...' }))
    try {
      const result = await connectorsApi.test(connector.id)
      setConnectorTest((state) => ({
        ...state,
        [connector.id]: result.ok
          ? `${result.row_count?.toLocaleString()} rows · ${result.column_count} columns`
          : result.error || 'Failed',
      }))
    } catch {
      setConnectorTest((state) => ({ ...state, [connector.id]: tr ? 'Test başarısız' : 'Test failed' }))
    }
  }

  const syncConnector = async (connector: DataConnector) => {
    try {
      const result = await connectorsApi.sync(connector.id, { workspace_id: effectiveWorkspaceId, project_id: effectiveProjectId })
      toast.success(`${tr ? 'Senkronize edildi' : 'Synced'}: ${result.row_count} rows`)
      load()
    } catch {
      toast.error(tr ? 'Sync başarısız' : 'Sync failed')
    }
  }

  const createWorkflowFromConnector = async (connector: DataConnector) => {
    if (!connector.last_synced_file_id) {
      toast.error(tr ? 'Önce connector verisini sync et' : 'Sync the connector first')
      return
    }
    try {
      const wf = await filesApi.createWorkflow(connector.last_synced_file_id, connector.name)
      navigate(`/workflows/${wf.id}/edit`)
    } catch {
      toast.error(tr ? 'Workflow oluşturulamadı' : 'Workflow could not be created')
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-6 pt-6 pb-20">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold leading-7 text-[var(--color-text-primary)]">
            {tr ? 'Veri Kütüphanesi' : 'Dataset Library'}
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
            {tr ? 'Yüklediğiniz tabloları yönetin ve doğrudan workflow oluşturun.' : 'Manage uploaded tables and create workflows from them.'}
            {activeWorkspace ? ` · ${activeWorkspace.name}` : ''}
            {visibleProject ? ` / ${visibleProject.name}` : ''}
          </p>
        </div>
        <button onClick={() => navigate('/workflows')} className="h-8 px-4 rounded-lg bg-primary text-white text-[13px] font-medium transition-all hover:bg-primary-hover">
          {tr ? 'Workflowlara git' : 'Go to workflows'}
        </button>
      </div>

      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-3 mb-5">
        <aside data-tour="dataset-organize" className="rounded-lg border border-[var(--color-border-default)] bg-surface p-4 h-fit">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[var(--color-text-primary)]">{tr ? 'Klasörler' : 'Folders'}</p>
          </div>
          <div className="flex gap-1 mb-2">
            <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFolder()} placeholder={tr ? 'Yeni klasör' : 'New folder'} className="min-w-0 flex-1 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-2 text-[11px] outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]" />
            <button onClick={createFolder} className="w-8 h-8 rounded-lg bg-primary text-white text-xs">+</button>
          </div>
          <button onClick={() => setActiveFolder('all')} className={`w-full text-left h-8 px-2 rounded-lg text-xs ${activeFolder === 'all' ? 'bg-primary text-white' : 'text-[var(--color-text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}>{tr ? 'Tümü' : 'All'}</button>
          <button onClick={() => setActiveFolder('none')} className={`w-full text-left h-8 px-2 rounded-lg text-xs ${activeFolder === 'none' ? 'bg-primary text-white' : 'text-[var(--color-text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}>{tr ? 'Klasörsüz' : 'No folder'}</button>
          {folders.map((folder) => (
            <button key={folder.id} onClick={() => setActiveFolder(folder.id)} className={`w-full text-left h-8 px-2 rounded-lg text-xs ${activeFolder === folder.id ? 'bg-primary text-white' : 'text-[var(--color-text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}>{folder.name}</button>
          ))}
          <div className="flex items-center justify-between mt-5 mb-2">
            <p className="text-xs font-medium text-[var(--color-text-primary)]">{tr ? 'Etiketler' : 'Tags'}</p>
          </div>
          <div className="flex gap-1 mb-2">
            <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createTag()} placeholder={tr ? 'Yeni etiket' : 'New tag'} className="min-w-0 flex-1 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-2 text-[11px] outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]" />
            <button onClick={createTag} className="w-8 h-8 rounded-lg bg-primary text-white text-xs">+</button>
          </div>
          <button onClick={() => setActiveTag('all')} className={`w-full text-left h-8 px-2 rounded-lg text-xs ${activeTag === 'all' ? 'bg-primary text-white' : 'text-[var(--color-text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}>{tr ? 'Tüm etiketler' : 'All tags'}</button>
          {tags.map((tag) => (
            <button key={tag.id} onClick={() => setActiveTag(tag.id)} className={`w-full text-left h-8 px-2 rounded-lg text-xs ${activeTag === tag.id ? 'bg-primary text-white' : 'text-[var(--color-text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}>{tag.name}</button>
          ))}
        </aside>
        <section className="space-y-3">
      <div className="rounded-lg border border-[var(--color-border-default)] bg-surface p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr ? 'Dosya ara...' : 'Search files...'}
          className="w-full h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 text-[13px] outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
        />
      </div>
      <div className="rounded-lg border border-[var(--color-border-default)] bg-surface p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">{tr ? 'Bağlantı türü' : 'Connector'}</label>
            <select value={connectorDraft.type} onChange={(e) => setConnectorDraft((draft) => ({ ...draft, type: e.target.value as DataConnector['type'] }))} className="h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-2 text-xs outline-none text-[var(--color-text-primary)]">
              <option value="public_url">CSV/Excel URL</option>
              <option value="google_sheets">Google Sheets</option>
              <option value="rest_json">REST JSON</option>
              <option value="supabase_table">Supabase Table</option>
              <option value="postgres">PostgreSQL</option>
            </select>
          </div>
          <input value={connectorDraft.name} onChange={(e) => setConnectorDraft((draft) => ({ ...draft, name: e.target.value }))} placeholder={tr ? 'Ad' : 'Name'} className="h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 text-xs outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]" />
          {(connectorDraft.type === 'public_url' || connectorDraft.type === 'google_sheets' || connectorDraft.type === 'rest_json' || connectorDraft.type === 'supabase_table') && (
            <input value={connectorDraft.url} onChange={(e) => setConnectorDraft((draft) => ({ ...draft, url: e.target.value }))} placeholder={connectorDraft.type === 'supabase_table' ? 'https://project.supabase.co' : 'https://...'} className="h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 text-xs outline-none flex-1 min-w-[220px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]" />
          )}
          {connectorDraft.type === 'rest_json' && (
            <input value={connectorDraft.records_path} onChange={(e) => setConnectorDraft((draft) => ({ ...draft, records_path: e.target.value }))} placeholder="records path: data/results" className="h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 text-xs outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]" />
          )}
          {connectorDraft.type === 'supabase_table' && (
            <>
              <input value={connectorDraft.table} onChange={(e) => setConnectorDraft((draft) => ({ ...draft, table: e.target.value }))} placeholder="table" className="h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 text-xs outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]" />
              <input value={connectorDraft.api_key} onChange={(e) => setConnectorDraft((draft) => ({ ...draft, api_key: e.target.value }))} placeholder="anon/service key" className="h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 text-xs outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]" />
            </>
          )}
          {connectorDraft.type === 'postgres' && (
            <>
              <input value={connectorDraft.connection_string} onChange={(e) => setConnectorDraft((draft) => ({ ...draft, connection_string: e.target.value }))} placeholder="postgres://..." className="h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 text-xs outline-none flex-1 min-w-[260px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]" />
              <input value={connectorDraft.query} onChange={(e) => setConnectorDraft((draft) => ({ ...draft, query: e.target.value }))} placeholder="select * from table limit 1000" className="h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 text-xs outline-none flex-1 min-w-[220px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]" />
            </>
          )}
          <button onClick={createConnector} className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-medium transition-all hover:bg-primary-hover">{tr ? 'Bağla' : 'Connect'}</button>
        </div>
        {connectors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {connectors.map((connector) => (
              <div key={connector.id} className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 flex items-center gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate text-[var(--color-text-primary)]">{connector.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{connector.type}{connectorTest[connector.id] ? ` · ${connectorTest[connector.id]}` : ''}</p>
                </div>
                <button onClick={() => testConnector(connector)} className="h-7 px-2 rounded-lg text-[11px] bg-surface border border-[var(--color-border-default)] text-[var(--color-text-primary)]">{tr ? 'Test' : 'Test'}</button>
                <button onClick={() => syncConnector(connector)} className="h-7 px-2 rounded-lg text-[11px] bg-primary text-white">{tr ? 'Sync' : 'Sync'}</button>
                {connector.last_synced_file_id && (
                  <button onClick={() => createWorkflowFromConnector(connector)} className="h-7 px-2 rounded-lg text-[11px] bg-success/15 text-success">
                    {tr ? 'Workflow' : 'Workflow'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState variant="list" rows={6} message={tr ? 'Veri setleri yükleniyor...' : 'Loading datasets...'} />
      ) : error ? (
        <ErrorState
          title={tr ? 'Yükleme hatası' : 'Failed to load'}
          message={error}
          onRetry={load}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="3" width="14" height="14" rx="3" />
              <path d="M7 10h6M10 7v6" strokeLinecap="round" />
            </svg>
          }
          title={tr ? 'Henüz veri yok' : 'No datasets yet'}
          description={tr ? 'Workflow içinde dosya yüklediğinizde burada görünecek.' : 'Uploaded workflow files will appear here.'}
        />
      ) : (
        <div data-tour="dataset-preview" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((dataset) => (
            <article key={dataset.id} className="rounded-lg border border-[var(--color-border-default)] bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  {renamingId === dataset.id ? (
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={saveRename}
                      onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                      className="w-full h-8 rounded-lg bg-black/[0.05] dark:bg-white/[0.06] px-2 text-[13px] outline-none text-[var(--color-text-primary)]"
                    />
                  ) : (
                    <h2 className="text-[15px] font-semibold truncate text-[var(--color-text-primary)]">{dataset.filename}</h2>
                  )}
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    {dataset.row_count.toLocaleString()} {tr ? 'satır' : 'rows'} · {dataset.column_count} {tr ? 'sütun' : 'columns'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[13px] font-semibold">CSV</div>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-8 mb-4">
                {(dataset.columns_meta ?? []).slice(0, 4).map((col) => (
                  <span key={col.name} className="px-2 py-1 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[11px] text-[var(--color-text-secondary)]">
                    {col.name}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <select value={dataset.folder_id || ''} onChange={(e) => moveDataset(dataset, e.target.value || null)} className="h-7 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[11px] px-2 outline-none text-[var(--color-text-primary)]">
                  <option value="">{tr ? 'Klasör seç' : 'Folder'}</option>
                  {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
                {tags.slice(0, 4).map((tag) => {
                  const active = tag.dataset_ids?.includes(dataset.id)
                  return (
                    <button key={tag.id} onClick={() => toggleDatasetTag(dataset, tag.id)} className={`h-7 px-2 rounded-lg text-[11px] ${active ? 'bg-primary text-white' : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--color-text-primary)]'}`}>
                      {tag.name}
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => navigate(`/datasets/${dataset.id}`)} className="h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs text-[var(--color-text-primary)] transition-all hover:bg-black/[0.08] dark:hover:bg-white/[0.1]">
                  {tr ? 'Önizle' : 'Preview'}
                </button>
                <button data-tour="dataset-workflow" onClick={() => createWorkflow(dataset)} className="h-8 rounded-lg bg-primary text-white text-xs font-medium transition-all hover:bg-primary-hover">
                  {tr ? 'Workflow oluştur' : 'Create workflow'}
                </button>
                <button onClick={() => startRename(dataset)} className="h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs text-[var(--color-text-primary)] transition-all hover:bg-black/[0.08] dark:hover:bg-white/[0.1]">
                  {tr ? 'Adlandır' : 'Rename'}
                </button>
                <button onClick={() => deleteDataset(dataset)} className="h-8 rounded-lg bg-danger/10 text-danger text-xs transition-all hover:bg-danger/20">
                  {tr ? 'Sil' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
        </section>
      </div>
    </main>
  )
}

function connectorConfig(draft: {
  type: DataConnector['type']
  url: string
  records_path: string
  table: string
  api_key: string
  connection_string: string
  query: string
}) {
  if (draft.type === 'postgres') return { connection_string: draft.connection_string, query: draft.query }
  if (draft.type === 'supabase_table') return { url: draft.url, table: draft.table, api_key: draft.api_key }
  if (draft.type === 'rest_json') return { url: draft.url, records_path: draft.records_path }
  return { url: draft.url }
}
