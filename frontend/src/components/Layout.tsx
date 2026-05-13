import { type ReactNode } from 'react'
import Navbar from './Navbar'
import PageTour from './PageTour'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-primary)] font-sans">
      <Navbar />
      {children}
      <PageTour />
    </div>
  )
}
