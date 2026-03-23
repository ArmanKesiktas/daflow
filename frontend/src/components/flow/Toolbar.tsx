import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { workflowsApi } from '../../api/workflows'
import { useFlowStore } from '../../store/flowStore'
import { useExecutionStore } from '../../store/executionStore'
import { useWorkflowSave } from '../../hooks/useWorkflowSave'
import { useTheme } from '../../hooks/useTheme'
import { useI18n } from '../../i18n'
import HistoryModal from '../HistoryModal'
import { downloadPython } from '../../utils/exportPython'

interface ToolbarProps {
  onRunComplete: (execId: string) => void
}

export default function Toolbar({ onRunComplete }: ToolbarProps) {
  const { workflowId, workflowName, setWorkflowName, undo, redo, past, future, nodes, edges } = useFlowStore()
  const { isRunning } = useExecutionStore()
  const { saveNow } = useWorkflowSave()
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState(workflowName)
  const [showHistory, setShowHistory] = useState(false)
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { lang, setLang, t } = useI18n()

  useEffect(() => {
    if (!editingName) setTempName(workflowName)
  }, [workflowName])

  const handleRun = async () => {
    if (!workflowId) return toast.error(t('failedToSave'))
    try {
      await saveNow()
      const res = await workflowsApi.run(workflowId)
      toast.success(t('workflowStarted'))
      onRunComplete(res.execution_id)
    } catch {
      toast.error(t('failedToStart'))
    }
  }

  const handleSave = async () => {
    await saveNow()
    toast.success(t('saved'))
  }

  const commitName = () => {
    setWorkflowName(tempName)
    setEditingName(false)
    saveNow()
  }

  return (
    <>
    <header className="h-11 bg-[#F5F5F7]/95 dark:bg-[#111113]/95 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/[0.07] flex items-center px-4 gap-3 flex-shrink-0 z-10">
      {/* Back */}
      <button
        onClick={() => navigate('/workflows')}
        title={t('backToWorkflows')}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.08]" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => { undo(); saveNow() }}
          disabled={past.length === 0}
          title="Undo (Ctrl+Z)"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed text-[#1d1d1f]/50 dark:text-white/50 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07]"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <path d="M3 6H9.5C11.433 6 13 7.567 13 9.5S11.433 13 9.5 13H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5.5 3.5L3 6l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={() => { redo(); saveNow() }}
          disabled={future.length === 0}
          title="Redo (Ctrl+Y)"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed text-[#1d1d1f]/50 dark:text-white/50 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07]"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <path d="M13 6H6.5C4.567 6 3 7.567 3 9.5S4.567 13 6.5 13H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M10.5 3.5L13 6l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.08]" />

      {/* Workflow name */}
      {editingName ? (
        <input
          autoFocus
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && commitName()}
          className="bg-black/[0.06] dark:bg-white/[0.07] border border-black/[0.12] dark:border-white/[0.14] rounded-md px-2 h-7 text-[13px] text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071E3]/60 w-48"
        />
      ) : (
        <button
          onClick={() => { setTempName(workflowName); setEditingName(true) }}
          className="text-[13px] font-medium text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors flex items-center gap-1.5"
        >
          {workflowName}
          <svg className="w-3 h-3 text-[#1d1d1f]/25 dark:text-white/25" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        </button>
      )}

      <div className="flex-1" />

      {/* Language toggle */}
      <div className="flex rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
        {(['en', 'tr'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
              lang === l
                ? 'bg-[#0071E3] text-white'
                : 'text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
            }`}
          >
            {l === 'en' ? '🇬🇧' : '🇹🇷'}
          </button>
        ))}
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={isDark ? t('switchToLight') : t('switchToDark')}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
      >
        {isDark ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>

      {/* Python Export */}
      <button
        onClick={() => downloadPython(nodes, edges, workflowName)}
        title="Export as Python"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </button>

      {/* History */}
      <button
        onClick={() => setShowHistory(true)}
        title="Execution History"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Actions */}
      <button
        onClick={handleSave}
        className="text-[12px] px-3 h-7 rounded-md text-[#1d1d1f]/50 dark:text-white/50 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
      >
        {t('save')}
      </button>

      <button
        onClick={handleRun}
        disabled={isRunning || !workflowId}
        className={`text-[12px] px-4 h-7 rounded-md font-medium transition-all ${
          isRunning
            ? 'bg-black/[0.07] dark:bg-white/[0.07] text-[#1d1d1f]/30 dark:text-white/30 cursor-not-allowed'
            : 'bg-[#0071E3] hover:bg-[#0077ED] text-white'
        }`}
      >
        {isRunning ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
            {t('running')}
          </span>
        ) : t('run')}
      </button>
    </header>
    {showHistory && <HistoryModal workflowId={workflowId} onClose={() => setShowHistory(false)} />}
    </>
  )
}
