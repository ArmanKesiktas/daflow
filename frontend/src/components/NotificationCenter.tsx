import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../api/platform'
import { useI18n } from '../i18n'
import type { NotificationItem } from '../types/workflow'

export default function NotificationCenter() {
  const { lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const tr = lang === 'tr'
  const unread = items.filter((item) => !item.read_at).length

  const load = () => {
    notificationsApi.list().then(setItems).catch(() => setItems([]))
  }

  useEffect(() => {
    load()
    const id = window.setInterval(load, 30000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [open])

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => null)
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })))
  }

  const openItem = async (item: NotificationItem) => {
    if (!item.read_at && !item.id.startsWith('invite-')) {
      await notificationsApi.markRead(item.id).catch(() => null)
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: row.read_at ?? new Date().toISOString() } : row))
    }
    const acceptUrl = typeof item.metadata?.accept_url === 'string' ? item.metadata.accept_url : ''
    if (acceptUrl) {
      setOpen(false)
      navigate(acceptUrl)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={`relative w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-secondary)] transition-all ${
          unread > 0
            ? 'text-danger'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
        }`}
        title={tr ? 'Bildirimler' : 'Notifications'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 006 0" />
        </svg>
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[9px] leading-4 font-semibold">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="alert"
            className="dropdown-popover dropdown-popover-right absolute right-0 top-9 z-50 w-80 rounded-xl border border-[var(--color-border-default)] bg-[#ffffff] dark:bg-[#1C1C1E] shadow-xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{tr ? 'Bildirimler' : 'Notifications'}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{tr ? `${unread} okunmamış` : `${unread} unread`}</p>
              </div>
              <button onClick={markAll} className="text-[11px] text-danger hover:underline">{tr ? 'Tümünü oku' : 'Read all'}</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-5 text-[12px] text-[var(--color-text-muted)]">{tr ? 'Henüz bildirim yok.' : 'No notifications yet.'}</div>
              ) : items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openItem(item)}
                  className="w-full text-left px-4 py-3 border-b border-[var(--color-border-subtle)] last:border-b-0 hover:bg-[var(--color-secondary)] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 w-2 h-2 rounded-full ${item.read_at ? 'bg-[var(--color-text-muted)]' : 'bg-danger'}`} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">{item.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-text-muted)]">{item.body}</p>
                      {item.action === 'workspace.invitation' && (
                        <p className="mt-1 text-[11px] font-medium text-danger">{tr ? 'Daveti aç' : 'Open invitation'}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
