# Implementation Plan: Landing Page

## Overview

Build the Daflow landing page as a single-page React component with modular sections. Implementation follows a dependency-first approach: foundation utilities and i18n, then core sections top-to-bottom, then polish (animations, SEO, responsive refinements). All code is TypeScript + Tailwind CSS, reusing existing hooks and design tokens.

## Tasks

- [x] 1. Foundation setup
  - [x] 1.1 Create `useScrollAnimation` hook at `src/hooks/useScrollAnimation.ts`
    - Implement IntersectionObserver-based visibility detection
    - Support `threshold`, `rootMargin`, `triggerOnce` options
    - Respect `prefers-reduced-motion` (set visible immediately if enabled)
    - Return `{ ref, isVisible }` tuple
    - _Requirements: 14.1, 14.4_

  - [x] 1.2 Create `SectionWrapper` component at `src/components/landing/SectionWrapper.tsx`
    - Wrap children with scroll animation (fade-up, fade-in, stagger variants)
    - Accept `id`, `className`, `animation`, `staggerDelay` props
    - Apply Tailwind transition classes based on `isVisible` state
    - Limit transitions to 300ms max
    - _Requirements: 14.1, 14.3, 14.5_

  - [x] 1.3 Add all landing page i18n strings to `src/i18n/index.tsx`
    - Add TR and EN translations for navbar, hero, features, how-it-works, trust, pricing, footer keys
    - Ensure all keys have non-empty values in both languages
    - _Requirements: 12.1, 12.2_

  - [x] 1.4 Set up route and `LandingPage.tsx` shell at `src/pages/LandingPage.tsx`
    - Create page component that checks auth state and redirects authenticated users
    - Use `useAuth` to detect authentication; redirect to `/workflows` or active workspace
    - Render placeholder sections in correct order
    - Integrate `react-helmet-async` for SEO meta tags
    - _Requirements: 1.1, 1.2, 1.3, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 2. Navigation
  - [x] 2.1 Create `LandingNavbar` component at `src/components/landing/LandingNavbar.tsx`
    - Fixed top navbar with Daflow logo, section links (Features, How It Works, Pricing)
    - Include existing `ThemeToggle` component and language switcher
    - Login and Sign Up buttons navigating to `/auth`
    - Apply backdrop-blur + background on scroll > 50px
    - Smooth-scroll to section on link click
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 11.4, 11.6, 1.4_

  - [x] 2.2 Create `MobileNavMenu` component at `src/components/landing/MobileNavMenu.tsx`
    - Hamburger icon visible at < 768px viewport
    - Full-screen slide-in overlay with section links, theme toggle, language switcher, auth buttons
    - Touch targets ≥ 44x44px
    - _Requirements: 8.4, 8.5, 8.6_

- [x] 3. Hero Section
  - [x] 3.1 Create `HeroSection` component at `src/components/landing/HeroSection.tsx`
    - Headline (≤10 words), subheadline (20-30 words) from i18n
    - Primary CTA "Get Started Free" → `/auth?mode=signup`
    - Secondary CTA "Watch Demo"
    - Product preview image/screenshot of workflow editor
    - Responsive: single-column on mobile, side-by-side on desktop
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 4. Features Section
  - [x] 4.1 Create `FeaturesSection` component at `src/components/landing/FeaturesSection.tsx`
    - Display 5 feature cards: workflow editor, AI insights, dashboards/reports, collaboration, big data
    - Each card: icon, title, description (15-25 words) from i18n
    - Cards animate in with fade-up on viewport entry via SectionWrapper
    - Grid layout: 1 col mobile, 2 col tablet, 3 col desktop
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 4.2 Write property test for feature card structure completeness
    - **Property 1: Feature card structure completeness**
    - Generate random icon, title, description (15-25 words); verify all three render as visible DOM nodes
    - **Validates: Requirements 3.7**

- [x] 5. How It Works Section
  - [x] 5.1 Create `HowItWorksSection` component at `src/components/landing/HowItWorksSection.tsx`
    - Display 3 steps: Upload Data → Build Workflow → Get Insights
    - Each step: number, title, description, visual icon
    - Visual connector lines/arrows between steps
    - Staggered animation (150-300ms delay) on viewport entry
    - Responsive: vertical stack on mobile, horizontal on desktop
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Trust Section
  - [x] 6.1 Create `TrustSection` component at `src/components/landing/TrustSection.tsx`
    - Display ≥3 stats with animated count-up on viewport entry (users, workflows, data sources)
    - Display ≥2 testimonial quotes with name, role, company
    - Display "trusted by" row with ≥4 company/partner logos
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 Create `CountUpAnimation` component at `src/components/landing/CountUpAnimation.tsx`
    - Animate from 0 to target value when visible
    - Support suffix ("+", "K", etc.)
    - Respect reduced-motion preference
    - _Requirements: 5.2, 14.4_

- [x] 7. Pricing Section
  - [x] 7.1 Create `PricingSection` component at `src/components/landing/PricingSection.tsx`
    - Display 3 tiers: Free ($0), Pro ($29/mo highlighted), Enterprise (Custom)
    - Each tier: name, price, ≥4 features, CTA button
    - Pro tier visually highlighted (border/badge)
    - CTA navigates to `/auth?plan={tierId}`
    - Responsive: stack on mobile, 3-col on desktop
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 7.2 Write property test for pricing tier structure and CTA navigation
    - **Property 2: Pricing tier structure completeness**
    - **Property 3: Pricing CTA navigation includes plan identifier**
    - Generate tier data; verify all elements render and CTA includes correct plan param
    - **Validates: Requirements 6.2, 6.4**

- [x] 8. Footer
  - [x] 8.1 Create `LandingFooter` component at `src/components/landing/LandingFooter.tsx`
    - Link groups: Product, Company, Legal (Privacy Policy, Terms of Service)
    - Social media icon links (open in new tab)
    - Newsletter email input with submit button
    - Client-side email validation; show success/error messages from i18n
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 8.2 Write property test for newsletter email validation
    - **Property 4: Newsletter email validation**
    - Generate valid and invalid email strings; verify correct success/error state
    - **Validates: Requirements 7.5, 7.6**

- [x] 9. Checkpoint - Core sections complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Polish and integration
  - [x] 10.1 Wire all sections into `LandingPage.tsx` with correct ordering and section IDs
    - Ensure semantic HTML structure: `<header>`, `<main>`, `<section>`, `<footer>`
    - Exactly one `<h1>` element (in HeroSection)
    - All sections have `id` attributes matching navbar links
    - _Requirements: 10.3, 10.7, 13.4_

  - [x] 10.2 Implement dark/light mode support across all landing components
    - Use existing `useTheme` hook and Tailwind dark: classes
    - Detect system preference on initial load
    - Theme toggle with fade transition
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

  - [x] 10.3 Add responsive refinements and mobile polish
    - Verify single-column < 768px, multi-column ≥ 768px
    - No horizontal scroll at 320px viewport
    - Touch targets ≥ 44x44px on mobile
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

  - [x] 10.4 Add performance optimizations
    - Lazy-load images below fold with `loading="lazy"`
    - Use WebP format for raster images with fallbacks
    - Font-display: swap for custom fonts
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 10.5 Add hover interactions and animation polish
    - Hover scale/shadow on cards and buttons
    - All transitions ≤ 300ms
    - No animations causing layout shift after render
    - _Requirements: 14.2, 14.3, 14.5, 15.4_

  - [x] 10.6 Ensure brand consistency
    - Use logo from `/public/brand/`
    - Use Tailwind color palette from `tailwind.config`
    - Same font family as main app
    - Border-radius 8-16px for cards/containers
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ]* 10.7 Write property test for translation completeness
    - **Property 6: Translation completeness**
    - Enumerate all landing page translation keys; verify both TR and EN values are non-empty
    - **Validates: Requirements 12.1**

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The design uses TypeScript + React with existing project conventions — no new frameworks needed
- `react-helmet-async` should already be installed or added as a dependency in task 1.4
- All i18n keys follow the `landing_` prefix convention to avoid collisions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 3, "tasks": ["4.1", "5.1", "6.1", "6.2"] },
    { "id": 4, "tasks": ["4.2", "7.1", "8.1"] },
    { "id": 5, "tasks": ["7.2", "8.2"] },
    { "id": 6, "tasks": ["10.1", "10.2"] },
    { "id": 7, "tasks": ["10.3", "10.4", "10.5", "10.6"] },
    { "id": 8, "tasks": ["10.7"] }
  ]
}
```
