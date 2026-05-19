import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { workflowsApi } from '../../api/workflows'
import { useFlowStore } from '../../store/flowStore'
import { useExecutionStore } from '../../store/executionStore'
import { useWorkflowSave } from '../../hooks/useWorkflowSave'
import { useTheme } from '../../hooks/useTheme'
import { useI18n } from '../../i18n'
import { validateWorkflow } from '../../utils/workflowValidation'
import HistoryModal from '../HistoryModal'
import { downloadPython } from '../../utils/exportPython'
import { friendlyError } from '../../utils/friendlyErrors'
import { schedulesApi, templatesApi, validationApi } from '../../api/platform'
import type { WorkflowSchedule, WorkflowValidationResult } from '../../types/workflow'
import { useWorkspace } from '../../features/workspaces/WorkspaceContext'

interface ToolbarProps {
  onRunComplete: (execId: string) => void
  onOpenTemplates: () => void
}

export default function Toolbar({ onRunComplete, onOpenTemplates }: ToolbarProps) {
  const { workflowId, workflowName, setWorkflowName, nodes, edges, undo, redo, past, future, updateNodeData } = useFlowStore()
  const { executionId, isRunning, setRunning } = useExecutionStore()
  const { saveNow } = useWorkflowSave()
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState(workflowName)
  const [showHistory, setShowHistory] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view')
  const [shareExpiration, setShareExpiration] = useState<'24h' | '7d' | 'never'>('7d')
  const [sharing, setSharing] = useState(false)
  const [shareRows, setShareRows] = useState<any[]>([])
  const [canManageShares, setCanManageShares] = useState(true)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [versionLoading, setVersionLoading] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedules, setSchedules] = useState<WorkflowSchedule[]>([])
  const [scheduleDraft, setScheduleDraft] = useState<Partial<WorkflowSchedule>>({ frequency: 'daily', time_of_day: '09:00', timezone: 'Europe/Istanbul', is_active: true })
  const [validationResult, setValidationResult] = useState<WorkflowValidationResult | null>(null)
  const [automationActive, setAutomationActive] = useState(false)
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { lang, setLang, t } = useI18n()
  const { activeWorkspaceId, activeProjectId } = useWorkspace()
  const workflowsBackPath = activeWorkspaceId && activeProjectId
    ? `/workspaces/${activeWorkspaceId}/projects/${activeProjectId}/workflows`
    : '/workflows'

  useEffect(() => {
    if (!editingName) setTempName(workflowName)
  }, [workflowName])

  useEffect(() => {
    if (!workflowId) return
    let cancelled = false
    let timer: number | undefined

    const pollAutomation = async () => {
      try {
        const status = await workflowsApi.automationStatus(workflowId)
        if (cancelled) return
        setAutomationActive(status.active)
        if (status.active) {
          setRunning(true)
          if (status.current_execution_id && status.current_execution_id !== executionId) {
            onRunComplete(status.current_execution_id)
          }
        }
      } catch {
        if (!cancelled) setAutomationActive(false)
      }
    }

    if (automationActive || isRunning) {
      pollAutomation()
      timer = window.setInterval(pollAutomation, 3000)
    }
    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    }
  }, [automationActive, executionId, isRunning, onRunComplete, setRunning, workflowId])

  const handleRun = async () => {
    if (!workflowId) return toast.error(t('failedToSave'))
    try {
      await saveNow()
      const validation = await validationApi.workflow(workflowId)
      setValidationResult(validation)
      if (validation.errors.length > 0) {
        toast.error(lang === 'tr' ? 'Çalıştırmadan önce workflow hatalarını düzelt.' : 'Fix workflow errors before running.')
        return
      }
      nodes.forEach((node) => {
        updateNodeData(node.id, {
          status: 'pending',
          error_message: undefined,
          cached: undefined,
        })
      })
      const res = await workflowsApi.run(workflowId)
      setAutomationActive(true)
      setRunning(true)
      toast.success(lang === 'tr' ? 'Workflow otomasyonu başladı' : 'Workflow automation started')
      onRunComplete(res.execution_id)
    } catch (error) {
      nodes.forEach((node) => updateNodeData(node.id, { status: 'idle' }))
      toast.error(friendlyError(error, lang))
    }
  }

  const handleSave = async () => {
    await saveNow()
    if (workflowId) {
      try {
        await workflowsApi.checkpoint(workflowId, workflowName)
      } catch {
        // Saving the workflow is more important than retaining an explicit checkpoint.
      }
    }
    toast.success(t('saved'))
  }

  const handleCheck = async () => {
    if (!workflowId) {
      const issues = validateWorkflow(nodes, edges)
      const errors = issues.filter((issue) => issue.level === 'error')
      const warnings = issues.filter((issue) => issue.level === 'warning')
      toast[errors.length ? 'error' : 'success'](`${errors.length} error, ${warnings.length} warning`)
      return
    }
    try {
      const result = await validationApi.workflow(workflowId)
      setValidationResult(result)
      if (result.errors.length === 0 && result.warnings.length === 0) toast.success(lang === 'tr' ? 'Workflow kontrolü geçti' : 'Workflow check passed')
      else toast[result.errors.length ? 'error' : 'success'](`${result.errors.length} error, ${result.warnings.length} warning`)
    } catch {
      toast.error(lang === 'tr' ? 'Kontrol çalışmadı' : 'Check failed')
    }
  }

  const handleStop = async () => {
    if (!workflowId) return
    try {
      await workflowsApi.stop(workflowId, executionId)
      setAutomationActive(false)
      setRunning(false)
      toast.success(lang === 'tr' ? 'Workflow otomasyonu durduruldu' : 'Workflow automation stopped')
    } catch {
      toast.error(t('failedToStop'))
    }
  }

  const handleShare = async () => {
    if (!workflowId || !shareEmail) return
    setSharing(true)
    try {
      await workflowsApi.share(workflowId, { email: shareEmail, permission: sharePermission, expiration: shareExpiration })
      toast.success(lang === 'tr' ? 'Paylaşıldı!' : 'Shared!')
      setShareEmail('')
      await refreshShares()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || (lang === 'tr' ? 'Paylaşım başarısız' : 'Share failed'))
    } finally {
      setSharing(false)
    }
  }

  const refreshShares = async () => {
    if (!workflowId) return
    try {
      const rows = await workflowsApi.listShares(workflowId)
      setShareRows(rows)
      setCanManageShares(true)
    } catch {
      setShareRows([])
      setCanManageShares(false)
    }
  }

  const openShareModal = () => {
    setShowShareModal(true)
    refreshShares()
  }

  const revokeShare = async (shareId: string) => {
    if (!workflowId) return
    try {
      await workflowsApi.revokeShare(workflowId, shareId)
      toast.success(lang === 'tr' ? 'Paylaşım kaldırıldı' : 'Share revoked')
      await refreshShares()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || (lang === 'tr' ? 'Kaldırılamadı' : 'Could not revoke share'))
    }
  }

  const commitName = () => {
    setWorkflowName(tempName)
    setEditingName(false)
    saveNow()
  }

  const openVersions = async () => {
    if (!workflowId) return
    setShowVersions(true)
    setVersionLoading(true)
    try {
      setVersions(await workflowsApi.versions(workflowId))
    } catch {
      toast.error(lang === 'tr' ? 'Versiyonlar yüklenemedi' : 'Versions could not be loaded')
    } finally {
      setVersionLoading(false)
    }
  }

  const restoreVersion = async (versionId: string) => {
    if (!workflowId) return
    try {
      const wf = await workflowsApi.restore(workflowId, versionId)
      toast.success(lang === 'tr' ? 'Versiyon geri yüklendi' : 'Version restored')
      window.location.reload()
      return wf
    } catch {
      toast.error(lang === 'tr' ? 'Geri yükleme başarısız' : 'Restore failed')
    }
  }

  const forkWorkflow = async () => {
    if (!workflowId) return
    try {
      const wf = await workflowsApi.fork(workflowId)
      toast.success(lang === 'tr' ? 'Kopya oluşturuldu' : 'Workflow copied')
      navigate(`/workflows/${wf.id}/edit`)
    } catch {
      toast.error(lang === 'tr' ? 'Kopyalanamadı' : 'Copy failed')
    }
  }

  const saveAsTemplate = async () => {
    try {
      await templatesApi.create({
        title: workflowName,
        category: 'Custom',
        description: `Saved from ${workflowName}`,
        graph_data: { nodes, edges, viewport: { x: 0, y: 0, zoom: 0.82 } },
      })
      toast.success(lang === 'tr' ? 'Template kaydedildi' : 'Template saved')
    } catch {
      toast.error(lang === 'tr' ? 'Template kaydedilemedi' : 'Template could not be saved')
    }
  }

  const openSchedule = async () => {
    if (!workflowId) return
    setShowSchedule(true)
    try {
      setSchedules(await schedulesApi.list(workflowId))
    } catch {
      setSchedules([])
    }
  }

  const saveSchedule = async () => {
    if (!workflowId) return
    try {
      const row = await schedulesApi.create(workflowId, scheduleDraft)
      setSchedules((items) => [row, ...items])
      toast.success(lang === 'tr' ? 'Zamanlama kaydedildi' : 'Schedule saved')
    } catch {
      toast.error(lang === 'tr' ? 'Zamanlama kaydedilemedi' : 'Schedule could not be saved')
    }
  }

  const removeSchedule = async (scheduleId: string) => {
    if (!workflowId) return
    try {
      await schedulesApi.remove(workflowId, scheduleId)
      setSchedules((items) => items.filter((item) => item.id !== scheduleId))
    } catch {
      toast.error(lang === 'tr' ? 'Silinemedi' : 'Could not delete')
    }
  }

  return (
    <>
    <header className="h-11 bg-page-bg/95 backdrop-blur-xl border-b border-[var(--color-border-default)] flex items-center px-4 gap-3 flex-shrink-0 z-10">
      {/* Back */}
      <button
        onClick={() => navigate(workflowsBackPath)}
        title={t('backToWorkflows')}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <div className="w-px h-4 bg-[var(--color-border-default)]" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => { undo(); setTimeout(saveNow, 50) }}
          disabled={past.length === 0}
          title="Undo"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)]"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <path d="M3 6H9.5C11.433 6 13 7.567 13 9.5S11.433 13 9.5 13H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5.5 3.5L3 6l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={() => { redo(); setTimeout(saveNow, 50) }}
          disabled={future.length === 0}
          title="Redo"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)]"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <path d="M13 6H6.5C4.567 6 3 7.567 3 9.5S4.567 13 6.5 13H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M10.5 3.5L13 6l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="w-px h-4 bg-[var(--color-border-default)]" />

      {/* Workflow name */}
      {editingName ? (
        <input
          autoFocus
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && commitName()}
          className="bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-md px-2 h-7 text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:border-primary/60 w-48"
        />
      ) : (
        <button
          onClick={() => { setTempName(workflowName); setEditingName(true) }}
          className="text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5"
        >
          {workflowName}
          <svg className="w-3 h-3 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        </button>
      )}

      <div className="flex-1" />

      <button
        onClick={onOpenTemplates}
        className="text-[12px] px-3 h-7 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
      >
        Templates
      </button>

      <button
        onClick={handleCheck}
        className="text-[12px] px-3 h-7 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
      >
        Check
      </button>

      <button
        onClick={openSchedule}
        className="text-[12px] px-3 h-7 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
      >
        Schedule
      </button>

      {/* Language toggle */}
      <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
        {(['en', 'tr'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
              lang === l
                ? 'bg-primary text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-secondary)]'
            }`}
          >
            {l === 'en' ? 'EN' : 'TR'}
          </button>
        ))}
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={isDark ? t('switchToLight') : t('switchToDark')}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
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

      <button
        onClick={() => downloadPython(nodes, edges, workflowName)}
        title="Export as Python"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </button>

      <button
        onClick={forkWorkflow}
        title={lang === 'tr' ? 'Kendi hesabıma kopyala' : 'Copy to my account'}
        aria-label={lang === 'tr' ? 'Kendi hesabıma kopyala' : 'Copy to my account'}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-secondary)] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h9a2 2 0 012 2v9a2 2 0 01-2 2H8a2 2 0 01-2-2v-9a2 2 0 012-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 16H4a2 2 0 01-2-2V5a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      </button>

      <button
        onClick={openVersions}
        title={lang === 'tr' ? 'Versiyon geçmişi' : 'Version history'}
        aria-label={lang === 'tr' ? 'Versiyon geçmişi' : 'Version history'}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.05 11A9 9 0 1021 12" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4v7h7" />
        </svg>
      </button>

      <button
        onClick={saveAsTemplate}
        title={lang === 'tr' ? 'Template olarak kaydet' : 'Save as template'}
        aria-label={lang === 'tr' ? 'Template olarak kaydet' : 'Save as template'}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-success hover:bg-[var(--color-secondary)] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
        </svg>
      </button>

      <button
        onClick={openShareModal}
        title={lang === 'tr' ? 'Paylaş' : 'Share'}
        aria-label={lang === 'tr' ? 'Paylaş' : 'Share'}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-secondary)] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
      </button>

      <button
        onClick={() => setShowHistory(true)}
        title="Execution History"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3.25 2" />
        </svg>
      </button>

      {/* Actions */}
      <button
        onClick={handleSave}
        className="text-[12px] px-3 h-7 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-all"
      >
        {t('save')}
      </button>

      {isRunning ? (
        <button
          onClick={handleStop}
          className="text-[12px] px-4 h-7 rounded-md font-medium bg-danger hover:bg-danger/90 text-white transition-all"
        >
          {t('stop')}
        </button>
      ) : (
        <button
          onClick={handleRun}
          disabled={!workflowId}
          className="text-[12px] px-4 h-7 rounded-md font-medium transition-all bg-[#0071E3] dark:bg-[#4f8ef7] hover:brightness-110 text-white disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {t('run')}
        </button>
      )}
    </header>
    {showHistory && <HistoryModal workflowId={workflowId} onClose={() => setShowHistory(false)} />}
    {validationResult && (
      <div className="dropdown-popover dropdown-popover-right fixed right-4 top-14 z-[90] w-[340px] rounded-2xl bg-[#ffffff] dark:bg-[#1C1C1E] border border-[var(--color-border-default)] shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold">{lang === 'tr' ? 'Workflow Kontrolü' : 'Workflow Check'}</h3>
          <button onClick={() => setValidationResult(null)} className="text-[var(--color-text-muted)]">×</button>
        </div>
        <ValidationGroup title="Errors" color="text-danger" items={validationResult.errors} />
        <ValidationGroup title="Warnings" color="text-warning" items={validationResult.warnings} />
        <ValidationGroup title="Suggestions" color="text-primary" items={validationResult.suggestions} />
      </div>
    )}
    {showSchedule && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSchedule(false)} />
        <div className="relative bg-[#ffffff] dark:bg-[#1C1C1E] rounded-2xl border border-[var(--color-border-default)] shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{lang === 'tr' ? 'Zamanlanmış Çalıştırma' : 'Scheduled Runs'}</h2>
            <button onClick={() => setShowSchedule(false)} className="text-[var(--color-text-muted)]">×</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={scheduleDraft.frequency}
                onChange={(e) => setScheduleDraft((draft) => ({ ...draft, frequency: e.target.value as WorkflowSchedule['frequency'] }))}
                className="h-9 rounded-lg bg-[var(--color-secondary)] px-2 text-[12px] outline-none"
              >
                <option value="hourly">{lang === 'tr' ? 'Saatlik' : 'Hourly'}</option>
                <option value="daily">{lang === 'tr' ? 'Günlük' : 'Daily'}</option>
                <option value="weekly">{lang === 'tr' ? 'Haftalık' : 'Weekly'}</option>
              </select>
              <input
                type="time"
                value={scheduleDraft.time_of_day || '09:00'}
                onChange={(e) => setScheduleDraft((draft) => ({ ...draft, time_of_day: e.target.value }))}
                className="h-9 rounded-lg bg-[var(--color-secondary)] px-2 text-[12px] outline-none"
              />
            </div>
            <button onClick={saveSchedule} className="w-full h-9 rounded-xl bg-primary text-white text-[13px] font-medium">
              {lang === 'tr' ? 'Zamanlama Ekle' : 'Add Schedule'}
            </button>
            <div className="space-y-2">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-secondary)] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium">{schedule.frequency} · {schedule.time_of_day}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{lang === 'tr' ? 'Sonraki' : 'Next'}: {schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : '-'}</p>
                  </div>
                  <button onClick={() => removeSchedule(schedule.id)} className="text-[12px] text-danger">{lang === 'tr' ? 'Sil' : 'Delete'}</button>
                </div>
              ))}
              {schedules.length === 0 && <p className="text-[12px] text-[var(--color-text-muted)]">{lang === 'tr' ? 'Henüz zamanlama yok.' : 'No schedules yet.'}</p>}
            </div>
          </div>
        </div>
      </div>
    )}
    {showShareModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
        <div className="relative bg-[#ffffff] dark:bg-[#1C1C1E] rounded-2xl border border-[var(--color-border-default)] shadow-2xl w-full max-w-[380px] mx-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              {lang === 'tr' ? 'Workflow Paylaş' : 'Share Workflow'}
            </h2>
            <button onClick={() => setShowShareModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5 space-y-4">
            {!canManageShares && (
              <div className="rounded-xl bg-warning/10 text-[#A15C00] dark:text-[#FFD60A] px-3 py-2 text-[12px]">
                {lang === 'tr'
                  ? 'Bu workflow için paylaşımı sadece sahibi yönetebilir.'
                  : 'Only the workflow owner can manage sharing.'}
              </div>
            )}
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                {lang === 'tr' ? 'E-posta' : 'Email'}
              </label>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                disabled={!canManageShares}
                placeholder="user@example.com"
                className="w-full h-9 rounded-lg bg-[var(--color-secondary)] px-3 text-[13px] outline-none border border-[var(--color-border-default)] focus:border-primary/50 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] disabled:opacity-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                  {lang === 'tr' ? 'İzin' : 'Permission'}
                </label>
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}
                  disabled={!canManageShares}
                  className="w-full h-9 rounded-lg bg-[var(--color-secondary)] px-2 text-[12px] outline-none border border-[var(--color-border-default)] text-[var(--color-text-primary)] disabled:opacity-50"
                >
                  <option value="view">{lang === 'tr' ? 'Görüntüle' : 'View'}</option>
                  <option value="edit">{lang === 'tr' ? 'Düzenle' : 'Edit'}</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                  {lang === 'tr' ? 'Süre' : 'Expiration'}
                </label>
                <select
                  value={shareExpiration}
                  onChange={(e) => setShareExpiration(e.target.value as '24h' | '7d' | 'never')}
                  disabled={!canManageShares}
                  className="w-full h-9 rounded-lg bg-[var(--color-secondary)] px-2 text-[12px] outline-none border border-[var(--color-border-default)] text-[var(--color-text-primary)] disabled:opacity-50"
                >
                  <option value="24h">24 {lang === 'tr' ? 'saat' : 'hours'}</option>
                  <option value="7d">7 {lang === 'tr' ? 'gün' : 'days'}</option>
                  <option value="never">{lang === 'tr' ? 'Süresiz' : 'Never'}</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleShare}
              disabled={sharing || !shareEmail || !canManageShares}
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary-hover text-white text-[13px] font-medium transition-all disabled:opacity-50"
            >
              {sharing ? (lang === 'tr' ? 'Paylaşılıyor...' : 'Sharing...') : (lang === 'tr' ? 'Paylaş' : 'Share')}
            </button>
            <div className="pt-3 border-t border-[var(--color-border-subtle)]">
              <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-2">
                {lang === 'tr' ? 'Aktif paylaşımlar' : 'Active shares'}
              </p>
              <div className="space-y-2 max-h-44 overflow-auto">
                {shareRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-secondary)] px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">{row.shared_with_email}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {row.permission} · {row.expires_at ? new Date(row.expires_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US') : (lang === 'tr' ? 'süresiz' : 'never')}
                      </p>
                    </div>
                    <button onClick={() => revokeShare(row.id)} className="text-[12px] text-danger px-2 h-7 rounded-lg hover:bg-danger/10">
                      {lang === 'tr' ? 'Kaldır' : 'Revoke'}
                    </button>
                  </div>
                ))}
                {canManageShares && shareRows.length === 0 && (
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    {lang === 'tr' ? 'Henüz paylaşım yok.' : 'No shares yet.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    {showVersions && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowVersions(false)} />
        <div className="relative bg-[#ffffff] dark:bg-[#1C1C1E] rounded-2xl border border-[var(--color-border-default)] shadow-2xl w-full max-w-[480px] mx-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{lang === 'tr' ? 'Versiyon Geçmişi' : 'Version History'}</h2>
            <button onClick={() => setShowVersions(false)} className="w-7 h-7 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)]">×</button>
          </div>
          <div className="p-4 max-h-[420px] overflow-auto space-y-2">
            {versionLoading ? (
              <div className="h-24 flex items-center justify-center"><span className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>
            ) : versions.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">{lang === 'tr' ? 'Henüz kayıtlı versiyon yok.' : 'No versions yet.'}</p>
            ) : versions.map((version) => (
              <div key={version.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] p-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[12px] font-semibold">v{version.version_number}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{version.name}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{new Date(version.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</p>
                </div>
                <button onClick={() => restoreVersion(version.id)} className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-[12px] font-medium">
                  {lang === 'tr' ? 'Geri yükle' : 'Restore'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function ValidationGroup({ title, color, items }: { title: string; color: string; items: { code: string; message: string; node_id?: string | null }[] }) {
  if (items.length === 0) return null
  return (
    <div className="mb-3">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5 ${color}`}>{title}</p>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={`${item.code}-${index}`} className="rounded-lg bg-[var(--color-secondary)] px-2.5 py-2">
            <p className="text-[12px] text-[#1d1d1f] dark:text-white/75">{item.message}</p>
            {item.node_id && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">node: {item.node_id}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
