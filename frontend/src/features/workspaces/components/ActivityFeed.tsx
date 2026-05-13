import type { WorkspaceActivity } from '../../../types/workflow'

export default function ActivityFeed({ items }: { items: WorkspaceActivity[] }) {
  if (!items.length) {
    return <div className="rounded-2xl border border-dashed border-black/[0.10] dark:border-white/[0.12] p-8 text-center text-[13px] text-[#1d1d1f]/40 dark:text-white/40">Henüz aktivite yok.</div>
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 rounded-2xl bg-white dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.07] p-3">
          <span className="mt-1 w-2 h-2 rounded-full bg-[#1d1d1f]/18 dark:bg-white/25 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{formatAction(item)}</p>
            <p className="text-[11px] text-[#1d1d1f]/35 dark:text-white/35 mt-0.5">{new Date(item.created_at).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatAction(item: WorkspaceActivity) {
  const meta = item.metadata || {}
  const name = String(meta.name || meta.filename || meta.title || meta.email || item.entity_type || 'item')
  const map: Record<string, string> = {
    'workspace.created': `Workspace oluşturuldu: ${name}`,
    'workspace.updated': 'Workspace ayarları güncellendi',
    'member.invited': `Üye davet edildi: ${name}`,
    'member.role_changed': `Üye rolü değişti: ${String(meta.role || '')}`,
    'file.uploaded': `Dosya yüklendi: ${name}`,
    'file.renamed': `Dosya yeniden adlandırıldı: ${name}`,
    'workflow.created': `Workflow oluşturuldu: ${name}`,
    'workflow.updated': `Workflow güncellendi: ${name}`,
    'workflow.executed': 'Workflow çalıştırıldı',
    'report.generated': `Rapor üretildi: ${name}`,
    'comment.created': 'Yorum eklendi',
    'project.created': `Proje oluşturuldu: ${name}`,
  }
  return map[item.action] || item.action
}
