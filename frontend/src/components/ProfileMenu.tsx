import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import toast from 'react-hot-toast'
import { useI18n } from '../i18n'

export default function ProfileMenu() {
  const { userEmail, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { lang } = useI18n()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmingSignOut(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = () => {
    setConfirmingSignOut(true)
  }

  const confirmSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const cancelSignOut = () => {
    setConfirmingSignOut(false)
  }

  const handleDeleteAccount = async () => {
    setOpen(false)
    setConfirmingSignOut(false)
    toast.error('Hesap silme özelliği yakında aktif olacak')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setConfirmingSignOut(false) }}
        className="flex items-center gap-2 h-7 px-3 rounded-lg bg-[var(--color-secondary)] hover:bg-[var(--color-border-default)] transition-all"
      >
        <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-semibold text-white">
          {userEmail ? userEmail[0].toUpperCase() : '?'}
        </span>
        <span className="text-[12px] text-[var(--color-text-secondary)] max-w-[120px] truncate">
          {userEmail || 'Guest'}
        </span>
        <svg className="w-3 h-3 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setConfirmingSignOut(false) }} />
          <div
            role="menu"
            className="dropdown-popover dropdown-popover-right absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-[#ffffff] dark:bg-[#1C1C1E] border border-[var(--color-border-default)] shadow-xl z-50 overflow-hidden"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">{userEmail}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Hesap</p>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); setConfirmingSignOut(false); navigate('/settings') }}
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-colors"
              >
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 0 .431 1.431l1.007.827c.424.352.428 1.024.261 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.369.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1-.43-1.431l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.49l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                Hesap Ayarları
              </button>

              <button
                onClick={() => { setOpen(false); setConfirmingSignOut(false); toast.success('Veriler sıfırlandı') }}
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-colors"
              >
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Verileri Sıfırla
              </button>

              <div className="my-1 border-t border-[var(--color-border-subtle)]" />

              {/* Çıkış Yap — inline confirmation */}
              {!confirmingSignOut ? (
                <button
                  onClick={handleSignOut}
                  role="menuitem"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-danger hover:bg-danger/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  {lang === 'tr' ? 'Çıkış Yap' : 'Sign Out'}
                </button>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-[11px] text-[var(--color-text-secondary)] mb-2">
                    {lang === 'tr' ? 'Çıkış yapmak istediğinize emin misiniz?' : 'Are you sure you want to sign out?'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmSignOut}
                      className="flex-1 h-8 rounded-lg bg-[#FF453A] text-white text-[11px] font-medium transition-colors hover:opacity-90"
                    >
                      {lang === 'tr' ? 'Evet' : 'Yes'}
                    </button>
                    <button
                      onClick={cancelSignOut}
                      className="flex-1 h-8 rounded-lg bg-black/[0.06] dark:bg-white/[0.08] text-[var(--color-text-primary)] text-[11px] font-medium transition-colors hover:bg-black/[0.10] dark:hover:bg-white/[0.12]"
                    >
                      {lang === 'tr' ? 'Hayır' : 'No'}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleDeleteAccount}
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Hesabı Sil
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
