import { useNavigate } from 'react-router-dom'
import LandingNavbar from '../components/landing/LandingNavbar'
import PricingSection from '../components/landing/PricingSection'
import LandingFooter from '../components/landing/LandingFooter'

export default function PricingPage() {
  const navigate = useNavigate()

  const handleSectionClick = (sectionId: string) => {
    // Pricing page doesn't have other sections — navigate back to landing page with hash
    navigate(`/#${sectionId}`)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[var(--color-text-primary)] overflow-x-hidden">
      <LandingNavbar onSectionClick={handleSectionClick} />
      <div className="pt-14">
        <PricingSection />
      </div>
      <LandingFooter />
    </div>
  )
}
