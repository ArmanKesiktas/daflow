import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { onboardingApi, profileApi } from '../api/platform'
import { authApi } from '../api/auth'
import { useAuth } from '../auth/AuthProvider'
import { useI18n, type Lang } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import type { UserPreferences } from '../types/workflow'

export default function SettingsPage() {
  const { lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  const { session } = useAuth()
  const tr = lang === 'tr'
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    profileApi.getPreferences().then((next) => {
      setPrefs(next)
      if (next.language) setLang(next.language)
      if (next.theme) setTheme(next.theme)
    }).catch(() => setPrefs(null))
  }, [setLang, setTheme])

  const update = (patch: Partial<UserPreferences>) => {
    setPrefs((current) => current ? { ...current, ...patch } : current)
  }

  const save = async () => {
    if (!prefs) return
    setSaving(true)
    try {
      const saved = await profileApi.updatePreferences(prefs)
      setPrefs(saved)
      setLang(saved.language as Lang)
      setTheme(saved.theme)
      toast.success(tr ? 'Ayarlar kaydedildi' : 'Settings saved')
    } catch {
      toast.error(tr ? 'Ayarlar kaydedilemedi' : 'Settings could not be saved')
    } finally {
      setSaving(false)
    }
  }

  const resetTours = async () => {
    Object.keys(localStorage).filter((key) => key.startsWith('daflow_tour:')).forEach((key) => localStorage.removeItem(key))
    await onboardingApi.save({ completed_steps: [] }).catch(() => null)
    update({ completed_tours: [] })
    toast.success(tr ? 'Sayfa turları sıfırlandı' : 'Page tours reset')
  }

  const changePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error(tr ? 'Tüm alanları doldurun' : 'Fill in all fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(tr ? 'Şifreler eşleşmiyor' : 'Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error(tr ? 'Şifre en az 6 karakter olmalı' : 'Password must be at least 6 characters')
      return
    }
    if (!session?.access_token) {
      toast.error(tr ? 'Oturum bulunamadı' : 'Session not found')
      return
    }
    setSavingPassword(true)
    try {
      await authApi.updatePassword(session.access_token, newPassword)
      toast.success(tr ? 'Şifre güncellendi' : 'Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (tr ? 'Şifre güncellenemedi' : 'Password could not be updated')
      toast.error(msg)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 pt-6 pb-10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-primary)] font-semibold">{tr ? 'Profil' : 'Profile'}</p>
      <h1 className="mt-2 text-xl font-bold leading-7 text-[var(--color-text-primary)]">{tr ? 'Profil ayarları' : 'Profile settings'}</h1>

      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{tr ? 'Ad, dil, tema ve bildirim tercihlerinizi yönetin.' : 'Manage your name, language, theme and notification preferences.'}</p>

      <section data-tour="profile-form" className="mt-8 rounded-lg border border-[var(--color-border-default)] bg-[#ffffff] dark:bg-[#1C1C1E] shadow-sm p-4 space-y-5">
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">{tr ? 'Görünen ad' : 'Display name'}</span>
          <input
            value={prefs?.display_name ?? ''}
            onChange={(event) => update({ display_name: event.target.value })}
            className="w-full h-9 rounded-md border border-[var(--color-border-default)] bg-black/[0.04] dark:bg-white/[0.06] px-3 text-[13px] outline-none text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">{tr ? 'Dil' : 'Language'}</span>
            <select value={prefs?.language ?? lang} onChange={(event) => update({ language: event.target.value as Lang })} className="w-full h-9 rounded-md border border-[var(--color-border-default)] bg-black/[0.04] dark:bg-white/[0.06] px-3 text-[13px] outline-none text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary/50">
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">{tr ? 'Tema' : 'Theme'}</span>
            <select value={prefs?.theme ?? theme} onChange={(event) => update({ theme: event.target.value as 'dark' | 'light' })} className="w-full h-9 rounded-md border border-[var(--color-border-default)] bg-black/[0.04] dark:bg-white/[0.06] px-3 text-[13px] outline-none text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary/50">
              <option value="dark">{tr ? 'Karanlık' : 'Dark'}</option>
              <option value="light">{tr ? 'Aydınlık' : 'Light'}</option>
            </select>
          </label>
        </div>
        <div data-tour="notification-settings">
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">{tr ? 'Bildirimler' : 'Notifications'}</p>
          {(['workspace', 'comments', 'roles'] as const).map((key) => (
            <label key={key} className="flex items-center justify-between h-9 rounded-md px-3 bg-black/[0.04] dark:bg-white/[0.06] mb-2">
              <span className="text-[13px] capitalize text-[var(--color-text-primary)]">{key === 'roles' ? (tr ? 'Rol değişimleri' : 'Role changes') : key === 'comments' ? (tr ? 'Yorumlar' : 'Comments') : (tr ? 'Workspace olayları' : 'Workspace events')}</span>
              <input
                type="checkbox"
                checked={prefs?.notification_settings?.[key] ?? true}
                onChange={(event) => update({ notification_settings: { ...(prefs?.notification_settings ?? {}), [key]: event.target.checked } })}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <button data-tour="tour-reset" onClick={resetTours} className="h-9 px-4 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[13px] text-[var(--color-text-secondary)] hover:bg-black/[0.07] dark:hover:bg-white/[0.09] transition-colors duration-150">
            {tr ? 'Onboard turlarını sıfırla' : 'Reset page tours'}
          </button>
          <button onClick={save} disabled={saving || !prefs} className="h-9 px-5 rounded-md bg-[var(--color-primary)] text-white text-[13px] font-medium disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-primary-hover)] transition-colors duration-150">
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[var(--color-border-default)] bg-[#ffffff] dark:bg-[#1C1C1E] shadow-sm p-4 space-y-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{tr ? 'Şifre değiştir' : 'Change password'}</h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">{tr ? 'Hesap şifrenizi güncelleyin.' : 'Update your account password.'}</p>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">{tr ? 'Mevcut şifre' : 'Current password'}</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full h-9 rounded-md border border-[var(--color-border-default)] bg-black/[0.04] dark:bg-white/[0.06] px-3 text-[13px] outline-none text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary/50"
            placeholder={tr ? 'Mevcut şifreniz' : 'Your current password'}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">{tr ? 'Yeni şifre' : 'New password'}</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-9 rounded-md border border-[var(--color-border-default)] bg-black/[0.04] dark:bg-white/[0.06] px-3 text-[13px] outline-none text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary/50"
            placeholder={tr ? 'En az 6 karakter' : 'At least 6 characters'}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">{tr ? 'Yeni şifre (tekrar)' : 'Confirm new password'}</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-9 rounded-md border border-[var(--color-border-default)] bg-black/[0.04] dark:bg-white/[0.06] px-3 text-[13px] outline-none text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary/50"
            placeholder={tr ? 'Şifreyi tekrar girin' : 'Re-enter password'}
          />
        </label>
        <div className="flex justify-end pt-2">
          <button onClick={changePassword} disabled={savingPassword || !newPassword || !confirmPassword} className="h-9 px-5 rounded-md bg-[var(--color-primary)] text-white text-[13px] font-medium disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-primary-hover)] transition-colors duration-150">
            {savingPassword ? (tr ? 'Güncelleniyor...' : 'Updating...') : (tr ? 'Şifreyi güncelle' : 'Update password')}
          </button>
        </div>
      </section>
    </main>
  )
}
