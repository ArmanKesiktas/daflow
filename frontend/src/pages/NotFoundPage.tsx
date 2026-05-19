import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { lang } = useI18n()
  const tr = lang === 'tr'

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--color-secondary)] flex items-center justify-center">
          <span className="text-[32px] font-bold text-[var(--color-text-muted)]">404</span>
        </div>
        <h1 className="text-[24px] font-bold text-[var(--color-text-primary)] mb-2">
          {tr ? 'Sayfa bulunamadı' : 'Page not found'}
        </h1>
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-8 leading-relaxed">
          {tr
            ? 'Aradığınız sayfa mevcut değil veya taşınmış olabilir.'
            : 'The page you are looking for does not exist or may have been moved.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 px-5 rounded-xl bg-[var(--color-secondary)] text-[var(--color-text-primary)] text-[13px] font-medium hover:opacity-80 transition-all"
          >
            {tr ? 'Geri dön' : 'Go back'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="h-10 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[13px] font-medium hover:bg-[var(--color-primary-hover)] transition-all"
          >
            {tr ? 'Ana sayfa' : 'Home'}
          </button>
        </div>
      </div>
    </div>
  )
}
