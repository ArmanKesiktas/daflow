import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../WorkspaceContext'

export default function WorkspaceSwitcher() {
  const navigate = useNavigate()
  const { workspaces, activeWorkspace, setActiveWorkspaceId, createWorkspace, loading } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const workspaceStorageReady = activeWorkspace?.storage_ready !== false

  const handleCreate = async () => {
    const value = name.trim()
    if (!value) return
    const workspace = await createWorkspace(value)
    if (workspace) {
      setName('')
      setCreating(false)
      setOpen(false)
      navigate(`/workspaces/${workspace.id}`)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="h-8 max-w-[220px] rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.06] px-3 flex items-center gap-2 text-[12px] font-medium"
      >
        <span className="w-5 h-5 rounded-lg bg-black/[0.08] dark:bg-white/[0.10] text-[#1d1d1f]/70 dark:text-white/70 flex items-center justify-center text-[10px]">
          {(activeWorkspace?.name || 'W').slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate">{loading ? 'Loading...' : activeWorkspace?.name || 'Workspace'}</span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="dropdown-popover dropdown-popover-left absolute left-0 top-10 z-[80] w-72 rounded-2xl border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] shadow-2xl p-2">
          <div className="max-h-64 overflow-y-auto">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => {
                  setActiveWorkspaceId(workspace.id)
                  setOpen(false)
                  navigate(`/workspaces/${workspace.id}`)
                }}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left ${
                  workspace.id === activeWorkspace?.id ? 'bg-black/[0.06] dark:bg-white/[0.08] text-[#1d1d1f] dark:text-white' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                <span className="w-7 h-7 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center text-[11px] font-semibold">
                  {workspace.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold truncate">{workspace.name}</span>
                  <span className="block text-[10px] opacity-50">{workspace.role || 'member'}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-black/[0.06] dark:border-white/[0.08] mt-2 pt-2">
            {!workspaceStorageReady ? (
              <div className="rounded-xl bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2 text-[11px] leading-relaxed text-[#1d1d1f]/50 dark:text-white/50">
                Workspace tabloları Supabase'e uygulanana kadar kişisel alan kullanılıyor.
              </div>
            ) : creating ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Workspace name"
                  className="w-full h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] px-3 text-[12px] outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleCreate} className="h-8 flex-1 rounded-lg bg-black/[0.06] dark:bg-white/[0.08] text-[#1d1d1f]/75 dark:text-white/75 text-[12px] font-medium">Create</button>
                  <button onClick={() => setCreating(false)} className="h-8 px-3 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[12px]">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} className="w-full h-9 rounded-xl text-[12px] font-medium text-[#1d1d1f]/60 dark:text-white/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]">
                + Create Workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0 text-[#1d1d1f]/35 dark:text-white/35"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  )
}
