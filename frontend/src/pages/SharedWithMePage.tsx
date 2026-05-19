import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { workflowsApi } from '../api/workflows'
import type { WorkflowListItem } from '../types/workflow'
import { useI18n } from '../i18n'
import LoadingState from '../components/ui/LoadingState'

type SharedWorkflow = WorkflowListItem & {
  share_id?: string
  workflow_id?: string
  permission?: 'view' | 'edit'
  expires_at?: string | null
  created_at?: string
}

export default function SharedWithMePage() {
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const [items, setItems] = useState<SharedWorkflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    workflowsApi.sharedWithMe()
      .then((workflows) => setItems(workflows as SharedWorkflow[]))
      .catch(() => toast.error(lang === 'tr' ? 'Paylaşılan workflowlar yüklenemedi' : 'Shared workflows could not be loaded'))
      .finally(() => setLoading(false))
  }, [lang])

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[#1d1d1f] dark:text-white">
      <main className="max-w-5xl mx-auto px-6 pt-6 pb-20">
        <div className="mb-6">
          <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-1">
            {lang === 'tr' ? 'Benimle Paylaşılan Workflowlar' : 'Shared Workflows'}
          </h1>
          <p className="text-[15px] text-[#1d1d1f]/40 dark:text-white/40">
            {lang === 'tr' ? 'E-posta adresinizle size verilen workflow erişimleri burada görünür.' : 'Workflow access shared with your email appears here.'}
          </p>
        </div>

        {loading ? (
          <LoadingState variant="grid" rows={6} message={t('loading')} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-black/[0.05] dark:bg-white/[0.06] flex items-center justify-center">
              <span className="text-[15px] font-semibold text-[#0071E3]">WF</span>
            </div>
            <div className="text-center">
              <p className="text-[17px] font-medium text-[#1d1d1f]/80 dark:text-white/80 mb-1">
                {lang === 'tr' ? 'Henüz paylaşılan workflow yok' : 'No shared workflows yet'}
              </p>
              <p className="text-[14px] text-[#1d1d1f]/35 dark:text-white/35">
                {lang === 'tr' ? 'Başka kullanıcılar workflow paylaştığında burada listelenecek.' : 'Workflows shared by other users will be listed here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const id = item.workflow_id ?? item.id
              return (
                <button
                  key={item.share_id ?? id}
                  onClick={() => navigate(`/workflows/${id}/edit`)}
                  className="group relative text-left bg-white dark:bg-white/[0.04] hover:bg-[#EBEBF0] dark:hover:bg-white/[0.07] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.14] dark:hover:border-white/[0.14] rounded-2xl p-5 transition-all shadow-sm dark:shadow-none"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#0071E3]/10 dark:bg-[#0071E3]/15">
                      <span className="text-[13px] font-semibold text-[#0071E3]">WF</span>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[10px] text-[#1d1d1f]/55 dark:text-white/55 uppercase tracking-wide">
                      {item.permission ?? 'view'}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white truncate mb-1">{item.name}</h3>
                  <p className="text-[12px] text-[#1d1d1f]/35 dark:text-white/35 truncate mb-3">{item.description || (lang === 'tr' ? 'Workflow paylaşımı' : 'Shared workflow')}</p>
                  <div className="flex items-center justify-between text-[11px] text-[#1d1d1f]/25 dark:text-white/25 mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
                    <span>{item.node_count} {item.node_count === 1 ? 'node' : 'nodes'}</span>
                    <span>{formatDate(item.created_at || item.updated_at, lang)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function formatDate(value: string | undefined, lang: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
