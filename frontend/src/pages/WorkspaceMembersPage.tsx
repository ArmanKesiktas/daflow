import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useParams } from 'react-router-dom'
import { workspacesApi } from '../api/workspaces'
import type { WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from '../types/workflow'
import RoleBadge from '../features/workspaces/components/RoleBadge'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingState } from '../components/ui/LoadingState'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'

const ROLES: WorkspaceRole[] = ['owner', 'admin', 'analyst', 'viewer', 'guest']

export default function WorkspaceMembersPage() {
  const { workspaceId } = useParams()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Exclude<WorkspaceRole, 'owner'>>('analyst')
  const [expiration, setExpiration] = useState<'24h' | '7d' | 'never'>('7d')
  const [invite, setInvite] = useState<WorkspaceInvitation | null>(null)
  const { lang } = useI18n()
  const tr = lang === 'tr'

  const load = () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    workspacesApi.members(workspaceId)
      .then(setMembers)
      .catch(() => {
        setError(tr ? 'Üyeler yüklenemedi' : 'Failed to load members')
        toast.error(tr ? 'Üyeler yüklenemedi' : 'Failed to load members')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [workspaceId])

  const sendInvite = async () => {
    if (!workspaceId || !email.trim()) return
    try {
      const created = await workspacesApi.invite(workspaceId, { email: email.trim(), role, expiration })
      setInvite(created)
      setEmail('')
      toast.success(tr ? 'Davet oluşturuldu' : 'Invite created')
    } catch {
      toast.error(tr ? 'Davet oluşturulamadı' : 'Failed to create invite')
    }
  }

  const updateRole = async (member: WorkspaceMember, nextRole: WorkspaceRole) => {
    if (!workspaceId) return
    try {
      const updated = await workspacesApi.updateRole(workspaceId, member.id, nextRole)
      setMembers((items) => items.map((item) => item.id === member.id ? updated : item))
    } catch {
      toast.error(tr ? 'Rol değiştirilemedi' : 'Failed to change role')
    }
  }

  const removeMember = async (member: WorkspaceMember) => {
    if (!workspaceId) return
    try {
      await workspacesApi.removeMember(workspaceId, member.id)
      setMembers((items) => items.filter((item) => item.id !== member.id))
    } catch {
      toast.error('Operation failed')
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 pt-6 pb-20">
      <PageHeader
        title={tr ? 'Çalışma Alanı Üyeleri' : 'Workspace Members'}
        subtitle={tr ? 'Üyeleri davet et, rollerini yönet ve erişimi sınırla.' : 'Invite members, manage roles and restrict access.'}
      />

      {loading ? (
        <LoadingState message={tr ? 'Üyeler yükleniyor...' : 'Loading members...'} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.208V17.13a4.002 4.002 0 013.4-3.956c.396-.067.8-.1 1.2-.1h.6c.4 0 .804.033 1.2.1a4.002 4.002 0 013.4 3.956v.078A2 2 0 0110.772 19.128H15zM12 10a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title={tr ? 'Henüz üye yok' : 'No members yet'}
          description={tr ? 'Çalışma alanınıza üye davet edin.' : 'Invite members to your workspace.'}
        />
      ) : (
        <>
          <RoleMap members={members} tr={tr} />

          <section data-tour="invite-member" className="rounded-lg border border-[var(--color-border-default)] bg-surface p-5 mb-3 shadow-sm">
            <h2 className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-primary)] mb-3">
              {tr ? 'Üye davet et' : 'Invite member'}
            </h2>
            <div className="flex flex-wrap gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="h-9 flex-1 min-w-[220px] rounded-md bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--color-border-default)] px-3 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Exclude<WorkspaceRole, 'owner'>)}
                className="h-9 rounded-md bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--color-border-default)] px-3 text-[13px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              >
                {ROLES.filter((item) => item !== 'owner').map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select
                value={expiration}
                onChange={(e) => setExpiration(e.target.value as '24h' | '7d' | 'never')}
                className="h-9 rounded-md bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--color-border-default)] px-3 text-[13px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              >
                <option value="24h">24h</option>
                <option value="7d">7d</option>
                <option value="never">{tr ? 'süresiz' : 'never'}</option>
              </select>
              <button
                onClick={sendInvite}
                className="h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-white text-[13px] font-medium transition-all duration-150 active:scale-[0.97]"
              >
                {tr ? 'Davet oluştur' : 'Create invite'}
              </button>
            </div>
            {invite && (
              <p className="mt-3 text-[12px] text-[var(--color-text-secondary)] break-all">
                Invite link: {window.location.origin}{invite.accept_url}
              </p>
            )}
          </section>

          <section data-tour="members-list" className="rounded-lg border border-[var(--color-border-default)] bg-surface overflow-hidden shadow-sm">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-subtle)] last:border-b-0">
                <div className="w-9 h-9 rounded-md bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center text-[12px] font-semibold text-[var(--color-text-primary)]">
                  {member.email?.slice(0, 1).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{member.email || member.user_id}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{member.status}</p>
                </div>
                <RoleBadge role={member.role} />
                <select
                  value={member.role}
                  onChange={(e) => updateRole(member, e.target.value as WorkspaceRole)}
                  className="h-8 rounded-md bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--color-border-default)] px-2 text-[12px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                >
                  {ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <button
                  onClick={() => removeMember(member)}
                  className="h-8 px-3 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[var(--color-text-secondary)] hover:text-danger text-[12px] font-medium transition-colors duration-150"
                >
                  {tr ? 'Kaldır' : 'Remove'}
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  )
}

function RoleMap({ members, tr }: { members: WorkspaceMember[]; tr: boolean }) {
  const descriptions: Record<WorkspaceRole, string> = {
    owner: tr ? 'Tam yönetim ve silme yetkisi' : 'Full management and delete access',
    admin: tr ? 'Üye ve içerik yönetimi' : 'Member and content management',
    analyst: tr ? 'Dosya, workflow, dashboard üretimi' : 'Creates files, workflows and dashboards',
    viewer: tr ? 'Görüntüler ve yorum ekler' : 'Views content and comments',
    guest: tr ? 'Sınırlı görüntüleme' : 'Limited viewing',
  }
  return (
    <section data-tour="role-map" className="grid md:grid-cols-5 gap-3 mb-3">
      {ROLES.map((role) => (
        <div key={role} className="rounded-lg border border-[var(--color-border-default)] bg-surface p-3 min-h-32 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <RoleBadge role={role} />
            <span className="text-[11px] text-[var(--color-text-muted)]">{members.filter((member) => member.role === role).length}</span>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-[var(--color-text-secondary)]">{descriptions[role]}</p>
          <div className="mt-3 space-y-1">
            {members.filter((member) => member.role === role).slice(0, 4).map((member) => (
              <div key={member.id} className="h-6 rounded-md bg-black/[0.035] dark:bg-white/[0.05] px-2 flex items-center text-[11px] text-[var(--color-text-primary)] truncate">
                {member.email || member.user_id}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
