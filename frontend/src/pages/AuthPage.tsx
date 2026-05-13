import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthProvider'
import { authApi } from '../api/auth'
import { useI18n } from '../i18n'
import BrandLogo from '../components/BrandLogo'
import ThemeToggle from '../components/ThemeToggle'

const INTERESTS = [
  { id: 'analytics', tr: 'Veri analizi', en: 'Data analysis' },
  { id: 'dashboards', tr: 'Dashboard', en: 'Dashboards' },
  { id: 'reports', tr: 'Raporlama', en: 'Reporting' },
  { id: 'automation', tr: 'Otomasyon', en: 'Automation' },
  { id: 'machine-learning', tr: 'Makine öğrenmesi', en: 'Machine learning' },
  { id: 'cleaning', tr: 'Veri temizleme', en: 'Data cleaning' },
]

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [acceptedPolicies, setAcceptedPolicies] = useState(false)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [onboarding, setOnboarding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const { signIn, signUp, authConfigured } = useAuth()
  const { lang, setLang } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const tr = lang === 'tr'
  const from = (location.state as { from?: string } | null)?.from ?? '/workflows'

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const type = params.get('type')

    if (accessToken && type === 'recovery') {
      navigate(`/reset-password#${hash}`, { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('supabase_recovery_token')
      if (saved) {
        navigate('/reset-password', { replace: true })
      }
    } catch (e) {
      // ignore
    }
  }, [navigate])

  const resetSignupExtras = () => {
    setFullName('')
    setEmailConfirm('')
    setPasswordConfirm('')
    setAcceptedPolicies(false)
    setSelectedInterests([])
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (mode === 'signup') {
      if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
        toast.error(tr ? 'E-posta adresleri eşleşmiyor' : 'Email addresses do not match')
        return
      }
      if (password !== passwordConfirm) {
        toast.error(tr ? 'Şifreler eşleşmiyor' : 'Passwords do not match')
        return
      }
      if (!acceptedPolicies) {
        toast.error(tr ? 'Devam etmek için politikaları kabul etmelisin' : 'Accept the policies to continue')
        return
      }
    }

    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
        toast.success(tr ? 'Giriş yapıldı' : 'Signed in')
        navigate(from, { replace: true })
      } else {
        await signUp(email.trim(), password, {
          full_name: fullName.trim(),
          accepted_policies_at: new Date().toISOString(),
        })
        localStorage.setItem('daflow_profile_name', fullName.trim())
        localStorage.setItem('daflow_policy_acceptance', new Date().toISOString())
        toast.success(tr ? 'Hesap oluşturuldu' : 'Account created')
        setOnboarding(true)
      }
    } catch (exc) {
      toast.error(exc instanceof Error ? exc.message : (tr ? 'Kimlik doğrulama başarısız' : 'Authentication failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleInterest = (id: string) => {
    setSelectedInterests((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const finishOnboarding = () => {
    localStorage.setItem('daflow_onboarding_complete', 'true')
    localStorage.setItem('daflow_interests', JSON.stringify(selectedInterests))
    localStorage.setItem('daflow_workspace_tour_pending', 'true')
    navigate('/workflows', { replace: true })
  }

  const switchMode = () => {
    setMode((current) => current === 'signin' ? 'signup' : 'signin')
    resetSignupExtras()
  }

  const requestPasswordReset = () => {
    setForgotPasswordMode(true)
    setForgotSent(false)
    setForgotEmail(email.trim())
  }

  const handleForgotPasswordEmail = async () => {
    const normalizedEmail = forgotEmail.trim().toLowerCase()
    if (!normalizedEmail) {
      toast.error(tr ? 'E-posta adresini gir' : 'Enter your email')
      return
    }

    setForgotSubmitting(true)
    try {
      await authApi.resetPassword(normalizedEmail, `${window.location.origin}/reset-password`)
      toast.success(tr ? 'Şifre sıfırlama e-postası gönderildi' : 'Password reset email sent')
      setForgotSent(true)
    } catch (exc) {
      toast.error(exc instanceof Error ? exc.message : (tr ? 'E-posta gönderme başarısız' : 'Email sending failed'))
    } finally {
      setForgotSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[#1d1d1f] dark:text-white">
      <nav className="h-12 px-5 md:px-8 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] bg-[#F5F5F7]/90 dark:bg-[#111113]/90 backdrop-blur-xl">
        <Link to="/" className="inline-flex items-center">
          <BrandLogo size="sm" />
        </Link>
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
          <ThemeToggle />
        </div>
      </nav>

      <main className="min-h-[calc(100vh-48px)] grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:flex relative overflow-hidden border-r border-black/[0.07] dark:border-white/[0.06] p-10 items-center">
          <div className="absolute inset-0 landing-grid opacity-40" />
          <div className="relative max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0071E3] mb-4">
              {tr ? 'Hesaplı workspace' : 'Account workspace'}
            </p>
            <h1 className="mb-5">
              <BrandLogo size="lg" />
            </h1>
            <p className="text-[18px] leading-relaxed text-[#1d1d1f]/58 dark:text-white/58">
              {tr
                ? 'Workflow, dashboard, rapor ve yüklenen dosyalar her kullanıcı için kendi hesabında saklanır.'
                : 'Workflows, dashboards, reports, and uploaded files are scoped to each user account.'}
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                ['Workflow', '#0071E3'],
                ['Reports', '#BF5AF2'],
                ['Files', '#30D158'],
              ].map(([label, color]) => (
                <div key={label} className="rounded-xl bg-white/70 dark:bg-white/[0.05] border border-black/[0.07] dark:border-white/[0.08] p-3">
                  <span className="block w-3 h-3 rounded-full mb-4" style={{ backgroundColor: color }} />
                  <span className="text-[12px] font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {forgotPasswordMode ? (
              <>
                <div className="mb-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0071E3] mb-3">
                    {tr ? 'Şifre Sıfırlama' : 'Reset Password'}
                  </p>
                  <h2 className="text-[30px] font-semibold tracking-tight">
                    {tr ? 'Şifreyi sıfırla' : 'Reset your password'}
                  </h2>
                  <p className="mt-3 text-[13px] leading-relaxed text-[#1d1d1f]/55 dark:text-white/55">
                    {tr
                      ? 'Hesabına bağlı e-posta adresini gir. Şifreni güvenli bağlantı üzerinden yeniden belirlemen için mail göndereceğiz.'
                      : 'Enter the email address for your account. We will send a secure link to set a new password.'}
                  </p>
                </div>

                {forgotSent && (
                  <div className="mb-4 rounded-xl border border-[#30D158]/25 bg-[#30D158]/10 px-4 py-3 text-[12px] leading-relaxed text-[#1d1d1f]/70 dark:text-white/70">
                    {tr
                      ? 'Mail gönderildi. Gelen kutunu ve spam klasörünü kontrol et; link açıldığında yeni şifre ekranına geleceksin.'
                      : 'Email sent. Check your inbox and spam folder; the link will open the new password screen.'}
                  </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); handleForgotPasswordEmail() }} className="space-y-3">
                  <TextInput
                    label="Email"
                    type="email"
                    value={forgotEmail}
                    onChange={(value) => {
                      setForgotEmail(value)
                      setForgotSent(false)
                    }}
                    required
                    placeholder="you@example.com"
                  />
                  <button
                    type="submit"
                    disabled={forgotSubmitting || !authConfigured}
                    className="w-full h-11 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[14px] font-semibold disabled:opacity-50 mt-6"
                  >
                    {forgotSubmitting ? (tr ? 'Gönderiliyor...' : 'Sending...') : tr ? 'Sıfırlama maili gönder' : 'Send reset email'}
                  </button>
                </form>

                <button
                  onClick={() => {
                    setForgotPasswordMode(false)
                    setForgotSent(false)
                    setForgotEmail('')
                  }}
                  className="mt-5 text-[13px] text-[#1d1d1f]/50 dark:text-white/50"
                >
                  {tr ? 'Giriş sayfasına dön' : 'Go back to login'}
                </button>
              </>
            ) : onboarding ? (
              <OnboardingStep
                tr={tr}
                selectedInterests={selectedInterests}
                toggleInterest={toggleInterest}
                finishOnboarding={finishOnboarding}
              />
            ) : (
              <>
                <div className="mb-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0071E3] mb-3">
                    {mode === 'signin' ? (tr ? 'Giriş' : 'Sign in') : (tr ? 'Üye ol' : 'Create account')}
                  </p>
                  <h2 className="text-[30px] font-semibold tracking-tight">
                    {mode === 'signin' ? (tr ? "Workspace'e giriş yap" : 'Sign in to your workspace') : (tr ? 'Yeni hesap oluştur' : 'Create your account')}
                  </h2>
                </div>

                {!authConfigured && (
                  <div className="mb-4 rounded-xl border border-[#FF9F0A]/25 bg-[#FF9F0A]/10 px-4 py-3 text-[12px] text-[#FF9F0A]">
                    {tr
                      ? 'Supabase frontend env değerleri eksik. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY eklenmeli.'
                      : 'Supabase frontend env values are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-3">
                  {mode === 'signup' && (
                    <TextInput
                      label={tr ? 'İsim' : 'Name'}
                      value={fullName}
                      onChange={setFullName}
                      required
                      placeholder={tr ? 'Ad Soyad' : 'Full name'}
                    />
                  )}
                  <TextInput label="Email" type="email" value={email} onChange={setEmail} required placeholder="you@example.com" />
                  {mode === 'signup' && (
                    <TextInput
                      label={tr ? 'Email tekrar' : 'Repeat email'}
                      type="email"
                      value={emailConfirm}
                      onChange={setEmailConfirm}
                      required
                      placeholder="you@example.com"
                    />
                  )}
                  <TextInput
                    label={tr ? 'Şifre' : 'Password'}
                    type="password"
                    value={password}
                    onChange={setPassword}
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                  {mode === 'signup' && (
                    <>
                      <TextInput
                        label={tr ? 'Şifre tekrar' : 'Repeat password'}
                        type="password"
                        value={passwordConfirm}
                        onChange={setPasswordConfirm}
                        required
                        minLength={6}
                        placeholder="••••••••"
                      />
                      <label className="flex gap-3 rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acceptedPolicies}
                          onChange={(event) => setAcceptedPolicies(event.target.checked)}
                          required
                          className="mt-0.5 h-4 w-4 accent-[#0071E3]"
                        />
                        <span className="text-[12px] leading-relaxed text-[#1d1d1f]/58 dark:text-white/58">
                          {tr
                            ? 'Kullanım koşullarını, gizlilik politikasını ve veri işleme şartlarını kabul ediyorum.'
                            : 'I accept the terms of service, privacy policy, and data processing terms.'}
                        </span>
                      </label>
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !authConfigured}
                    className="w-full h-11 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[14px] font-semibold disabled:opacity-50"
                  >
                    {submitting
                      ? (tr ? 'İşleniyor...' : 'Working...')
                      : mode === 'signin'
                        ? (tr ? 'Giriş yap' : 'Sign in')
                        : (tr ? 'Üye ol' : 'Create account')}
                  </button>

                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={requestPasswordReset}
                      disabled={!authConfigured}
                      className="text-[13px] text-[#0071E3] hover:text-[#0077ED] font-semibold disabled:opacity-50"
                    >
                      {tr ? 'Şifremi unuttum' : 'Forgot password'}
                    </button>
                  )}
                </form>

                <button
                  onClick={switchMode}
                  className="mt-5 text-[13px] text-[#1d1d1f]/50 dark:text-white/50"
                >
                  {mode === 'signin'
                    ? <>{tr ? 'Hesabın yok mu? ' : 'No account? '}<span className="font-semibold text-[#0071E3] hover:text-[#0077ED]">{tr ? 'Üye ol' : 'Create one'}</span></>
                    : <>{tr ? 'Zaten hesabın var mı? ' : 'Already have an account? '}<span className="font-semibold text-[#0071E3] hover:text-[#0077ED]">{tr ? 'Giriş yap' : 'Sign in'}</span></>}
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
 
function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  required,
  minLength,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  minLength?: number
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="block text-[11px] text-[#1d1d1f]/42 dark:text-white/42 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        className="w-full h-11 rounded-xl bg-white dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] px-3 text-[14px] outline-none focus:border-[#0071E3]/60"
        placeholder={placeholder}
      />
    </label>
  )
}

function OnboardingStep({
  tr,
  selectedInterests,
  toggleInterest,
  finishOnboarding,
}: {
  tr: boolean
  selectedInterests: string[]
  toggleInterest: (id: string) => void
  finishOnboarding: () => void
}) {
  return (
    <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] p-5 shadow-sm dark:shadow-none">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0071E3] mb-3">
        {tr ? 'Başlangıç ayarı' : 'Onboarding'}
      </p>
      <h2 className="text-[25px] font-semibold tracking-tight mb-2">
        {tr ? 'Ne ile ilgileniyorsun?' : 'What are you interested in?'}
      </h2>
      <p className="text-[13px] leading-relaxed text-[#1d1d1f]/48 dark:text-white/48 mb-5">
        {tr
          ? 'Bunu ilk workflow önerilerini ve kısa tanıtımı daha anlamlı yapmak için kullanacağız.'
          : 'This helps tune your first workflow suggestions and the short product tour.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {INTERESTS.map((interest) => {
          const selected = selectedInterests.includes(interest.id)
          return (
            <button
              key={interest.id}
              type="button"
              onClick={() => toggleInterest(interest.id)}
              className={`min-h-11 rounded-xl border px-3 text-left text-[12px] font-semibold transition-all ${
                selected
                  ? 'border-[#0071E3]/45 bg-[#0071E3]/10 text-[#0071E3]'
                  : 'border-black/[0.07] dark:border-white/[0.08] bg-black/[0.025] dark:bg-white/[0.035] text-[#1d1d1f]/62 dark:text-white/62 hover:border-[#0071E3]/30'
              }`}
            >
              {tr ? interest.tr : interest.en}
            </button>
          )
        })}
      </div>
      <button
        onClick={finishOnboarding}
        className="mt-5 w-full h-11 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[14px] font-semibold"
      >
        {tr ? 'Workspace’e devam et' : 'Continue to workspace'}
      </button>
    </div>
  )
}
