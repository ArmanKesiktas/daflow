import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import LandingNavbar from '../components/landing/LandingNavbar'
import HeroSection from '../components/landing/HeroSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import ShowcaseSection from '../components/landing/ShowcaseSection'
import HowItWorksSection from '../components/landing/HowItWorksSection'
import TrustSection from '../components/landing/TrustSection'
import LandingFooter from '../components/landing/LandingFooter'

export default function LandingPage() {
  const { isAuthenticated } = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const { lang } = useI18n()

  // SEO: Set document title and meta tags
  useEffect(() => {
    const title = lang === 'tr'
      ? 'Daflow – Veri Analizi Otomasyon Platformu'
      : 'Daflow – Data Analysis Automation Platform'

    const description = lang === 'tr'
      ? 'Daflow ile CSV/Excel verilerinizi görsel workflow editörde analiz edin, dashboard ve raporlar oluşturun. Kodsuz veri hattı.'
      : 'Analyze CSV/Excel data with a visual workflow editor, create dashboards and reports. No-code data pipelines by Daflow.'

    document.title = title

    // Update or create meta description
    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc.setAttribute('content', description)

    // Update or create OG tags
    setMetaTag('og:title', title)
    setMetaTag('og:description', description)
    setMetaTag('og:image', '/brand/daflow-mark-blue.png')
    setMetaTag('og:url', 'https://daflow.app')
    setMetaTag('twitter:card', 'summary_large_image')
    setMetaTag('twitter:title', title)
    setMetaTag('twitter:description', description)

    return () => {
      document.title = 'Daflow'
    }
  }, [lang])

  // Redirect authenticated users
  if (isAuthenticated) {
    const redirectPath = activeWorkspaceId ? `/workspaces/${activeWorkspaceId}` : '/workflows'
    return <Navigate to={redirectPath} replace />
  }

  const handleSectionClick = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[var(--color-text-primary)] overflow-x-hidden">
      <LandingNavbar onSectionClick={handleSectionClick} />
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <HowItWorksSection />
      <TrustSection />
      <LandingFooter />
    </div>
  )
}

function setMetaTag(property: string, content: string) {
  const isOg = property.startsWith('og:') || property.startsWith('twitter:')
  const attr = isOg ? 'property' : 'name'
  let tag = document.querySelector(`meta[${attr}="${property}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, property)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}
