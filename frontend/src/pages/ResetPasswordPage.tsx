import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'
import BrandLogo from '../components/BrandLogo'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [linkError, setLinkError] = useState('')
  const acceptedTokenRef = useRef(false)
  const { isDark, toggleTheme } = useTheme()
  const { lang, setLang } = useI18n()
  const navigate = useNavigate()
  const tr = lang === 'tr'

  useEffect(() => {
    const readResetToken = () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const queryParams = new URLSearchParams(window.location.search)
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description')
      const errorCode = hashParams.get('error') || queryParams.get('error')
      const nextToken =
        hashParams.get('access_token') ||
        queryParams.get('access_token')
      const type = hashParams.get('type') || queryParams.get('type')

      if (errorDescription || errorCode) {
        setToken(null)
        setLinkError(errorDescription || errorCode || '')
        return
      }

      if (nextToken && (!type || type === 'recovery')) {
        acceptedTokenRef.current = true
        setToken(nextToken)
        setLinkError('')
        try {
          localStorage.removeItem('supabase_recovery_token')
        } catch (e) {}
        window.history.replaceState({}, document.title, '/reset-password')
        return
      }

      try {
        const saved = localStorage.getItem('supabase_recovery_token')
        if (saved) {
          acceptedTokenRef.current = true
          setToken(saved)
          setLinkError('')
          localStorage.removeItem('supabase_recovery_token')
          return
        }
      } catch (e) {
        // ignore storage errors
      }

      if (acceptedTokenRef.current) return
      setToken(null)
      setLinkError(tr ? 'Geçersiz veya süresi dolmuş şifre sıfırlama linki.' : 'Invalid or expired password reset link.')
    }

    readResetToken()
    window.addEventListener('hashchange', readResetToken)
    return () => window.removeEventListener('hashchange', readResetToken)
  }, [tr])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error(tr ? 'Şifreler eşleşmiyor' : 'Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error(tr ? 'Şifre en az 6 karakter olmalı' : 'Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      await authApi.updatePassword(token!, newPassword)
      toast.success(tr ? 'Şifre başarıyla sıfırlandı' : 'Password reset successfully')
      navigate('/login', { replace: true })
    } catch (exc) {
      toast.error(exc instanceof Error ? exc.message : (tr ? 'Şifre sıfırlama başarısız' : 'Password reset failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[#1d1d1f] dark:text-white">
      <nav className="h-12 px-5 md:px-8 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] bg-[#F5F5F7]/90 dark:bg-[#111113]/90 backdrop-blur-xl">
        <a href="/" className="inline-flex items-center">
          <BrandLogo size="sm" />
        </a>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
            {(['en', 'tr'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setLang(item)}
                className={`px-2.5 py-1 text-[11px] font-medium ${lang === item ? 'bg-[#0071E3] text-white' : 'text-[#1d1d1f]/50 dark:text-white/50'}`}
              >
                {item === 'en' ? 'EN' : 'TR'}
              </button>
            ))}
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1d1d1f]/45 dark:text-white/45 hover:bg-black/[0.06] dark:hover:bg-white/[0.07]"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☼' : '◐'}
          </button>
        </div>
      </nav>

      <main className="min-h-[calc(100vh-48px)] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0071E3] mb-3">
              {tr ? 'Şifre Sıfırlama' : 'Reset Password'}
            </p>
            <h2 className="text-[30px] font-semibold tracking-tight">
              {tr ? 'Yeni şifre belirle' : 'Set your new password'}
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[#1d1d1f]/55 dark:text-white/55">
              {tr
                ? 'Maildeki güvenli bağlantı doğrulandıysa aşağıdan yeni şifreni belirleyebilirsin.'
                : 'If the secure email link is verified, set your new password below.'}
            </p>
          </div>

          {linkError ? (
            <div className="rounded-xl border border-[#FF3B30]/25 bg-[#FF3B30]/10 px-4 py-3 text-[13px] leading-relaxed text-[#1d1d1f]/70 dark:text-white/70">
              <p>{linkError}</p>
              <Link to="/login" className="mt-3 inline-flex text-[#0071E3] font-semibold">
                {tr ? 'Yeni sıfırlama maili iste' : 'Request a new reset email'}
              </Link>
            </div>
          ) : !token ? (
            <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-4 py-3 text-[13px] text-[#1d1d1f]/60 dark:text-white/60">
              {tr ? 'Bağlantı kontrol ediliyor...' : 'Checking reset link...'}
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="block text-[11px] text-[#1d1d1f]/42 dark:text-white/42 mb-1.5">
                {tr ? 'Yeni Şifre' : 'New Password'}
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={6}
                className="w-full h-11 rounded-xl bg-white dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] px-3 text-[14px] outline-none focus:border-[#0071E3]/60"
                placeholder="••••••••"
              />
            </label>

            <label className="block">
              <span className="block text-[11px] text-[#1d1d1f]/42 dark:text-white/42 mb-1.5">
                {tr ? 'Şifreyi Onayla' : 'Confirm Password'}
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                className="w-full h-11 rounded-xl bg-white dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] px-3 text-[14px] outline-none focus:border-[#0071E3]/60"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[14px] font-semibold disabled:opacity-50 mt-6"
            >
              {submitting ? (tr ? 'İşleniyor...' : 'Working...') : tr ? 'Şifreyi Güncelle' : 'Update Password'}
            </button>
          </form>
          )}

          <p className="mt-5 text-center text-[12px] text-[#1d1d1f]/50 dark:text-white/50">
            {tr
              ? 'Sorun mu yaşıyor? '
              : 'Having trouble? '}
            <Link to="/login" className="font-semibold text-[#0071E3] hover:text-[#0077ED]">
              {tr ? 'Giriş sayfasına dön' : 'Go back to login'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
