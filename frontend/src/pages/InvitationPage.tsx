import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { workspacesApi } from '../api/workspaces'
import type { WorkspaceInvitation } from '../types/workflow'

export default function InvitationPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<(WorkspaceInvitation & { workspace?: { name?: string } }) | null>(null)

  useEffect(() => {
    if (!token) return
    workspacesApi.invitation(token).then(setInvite).catch(() => toast.error('Davet bulunamadı'))
  }, [token])

  const accept = async () => {
    if (!token) return
    try {
      const result = await workspacesApi.acceptInvitation(token)
      toast.success('Workspace daveti kabul edildi')
      navigate(`/workspaces/${result.workspace_id}`)
    } catch {
      toast.error('Davet kabul edilemedi')
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-20">
      <section className="rounded-3xl bg-white dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.07] p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#0071E3] font-semibold mb-3">Workspace Invitation</p>
        <h1 className="text-[26px] font-semibold mb-2">{invite?.workspace?.name || 'Daflow Workspace'}</h1>
        <p className="text-[14px] text-[#1d1d1f]/45 dark:text-white/45 mb-6">{invite ? `${invite.email} adresi ${invite.role} rolüyle davet edildi.` : 'Davet yükleniyor...'}</p>
        <button onClick={accept} disabled={!invite} className="h-10 px-5 rounded-xl bg-[#0071E3] text-white text-[13px] font-semibold disabled:opacity-50">Accept invitation</button>
      </section>
    </main>
  )
}
