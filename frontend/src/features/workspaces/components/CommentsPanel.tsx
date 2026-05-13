import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { workspacesApi } from '../../../api/workspaces'
import type { WorkspaceComment } from '../../../types/workflow'

type CommentEntityType = WorkspaceComment['entity_type']

export default function CommentsPanel({ workspaceId, entityType, entityId }: { workspaceId: string; entityType: CommentEntityType; entityId: string }) {
  const [comments, setComments] = useState<WorkspaceComment[]>([])
  const [content, setContent] = useState('')

  const load = () => {
    workspacesApi.comments(workspaceId, { entity_type: entityType, entity_id: entityId }).then(setComments).catch(() => setComments([]))
  }

  useEffect(load, [workspaceId, entityType, entityId])

  const submit = async () => {
    const value = content.trim()
    if (!value) return
    try {
      const comment = await workspacesApi.createComment(workspaceId, { entity_type: entityType, entity_id: entityId, content: value })
      setComments((items) => [comment, ...items])
      setContent('')
    } catch {
      toast.error('Yorum eklenemedi')
    }
  }

  const resolve = async (comment: WorkspaceComment) => {
    const updated = await workspacesApi.updateComment(comment.id, { resolved: !comment.resolved })
    setComments((items) => items.map((item) => item.id === comment.id ? updated : item))
  }

  return (
    <section className="rounded-3xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-white/[0.04] p-5">
      <h2 className="text-[15px] font-semibold mb-3">Comments</h2>
      <div className="flex gap-2 mb-4">
        <input value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Yorum yaz..." className="flex-1 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] px-3 text-[13px] outline-none" />
        <button onClick={submit} className="h-9 px-4 rounded-xl bg-black/[0.06] dark:bg-white/[0.08] text-[#1d1d1f]/75 dark:text-white/75 text-[12px] font-medium hover:bg-black/[0.09] dark:hover:bg-white/[0.12] transition-colors">Add</button>
      </div>
      <div className="space-y-2">
        {comments.map((comment) => (
          <div key={comment.id} className={`rounded-2xl border p-3 ${comment.resolved ? 'border-black/[0.08] dark:border-white/[0.08] bg-black/[0.035] dark:bg-white/[0.045]' : 'border-black/[0.07] dark:border-white/[0.07] bg-black/[0.02] dark:bg-white/[0.03]'}`}>
            <p className="text-[13px] text-[#1d1d1f]/75 dark:text-white/75">{comment.content}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#1d1d1f]/35 dark:text-white/35">{new Date(comment.created_at).toLocaleString()}</span>
              <button onClick={() => resolve(comment)} className="text-[11px] text-[#1d1d1f]/45 dark:text-white/45 hover:text-[#1d1d1f]/70 dark:hover:text-white/70 transition-colors">{comment.resolved ? 'Reopen' : 'Resolve'}</button>
            </div>
          </div>
        ))}
        {!comments.length && <p className="text-[12px] text-[#1d1d1f]/35 dark:text-white/35">Bu öğe için yorum yok.</p>}
      </div>
    </section>
  )
}
