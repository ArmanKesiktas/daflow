# Implementation Plan: Frontend UI Consistency

## Overview

This plan implements a centralized design token system, builds reusable UI primitives, and migrates all existing components to use tokens — eliminating visual inconsistencies across the Daflow frontend. Tasks are ordered by dependency: token foundation first, then primitives, then migration across pages and features.

## Tasks

- [x] 1. Establish the Design Token Foundation
  - [x] 1.1 Define CSS custom properties in index.css
    - Add `:root` selector with all semantic color tokens (primary, danger, success, warning, info, backgrounds, text colors, borders)
    - Add `.dark` selector with corresponding dark mode values for every token
    - Add shadow tokens (sm, md, lg, xl) for both light and dark modes
    - Ensure every variable in `:root` has a matching variable in `.dark`
    - _Requirements: 1.1, 1.2, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 1.2 Extend tailwind.config.js with full token system
    - Replace existing minimal `colors.primary` with full semantic color map referencing CSS variables
    - Add spacing scale tokens (xs through 3xl)
    - Add border-radius tokens (sm through full)
    - Add box-shadow tokens referencing CSS variable shadows
    - Add fontSize scale with line-height pairs (xs through 3xl)
    - Add fontWeight tokens (normal, medium, semibold, bold)
    - Preserve existing fontFamily definitions
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.8_

  - [x] 1.3 Write property test for Token Light/Dark Parity
    - **Property 1: Token Light/Dark Parity**
    - Parse index.css, extract all CSS variable names from `:root`, verify each exists in `.dark`
    - **Validates: Requirements 1.2**

  - [x] 1.4 Write property test for Color Contrast Compliance
    - **Property 10: Color Contrast Compliance**
    - Compute WCAG contrast ratios for all text/background token pairs
    - Verify body text pairs meet 4.5:1 and UI boundaries meet 3:1
    - **Validates: Requirements 12.4, 12.5**

- [x] 2. Build Core UI Primitives — Buttons
  - [x] 2.1 Create Button component (src/components/ui/Button.tsx)
    - Implement ButtonProps interface with variant (primary, secondary, ghost, danger, outline), size (sm, md, lg), loading, icon, iconPosition
    - Apply correct token-based styles for each variant and size per design spec
    - Implement all four interactive states: default, hover (+10% opacity), active (scale 0.97), disabled (opacity 0.45, cursor not-allowed)
    - Add 150ms transition duration for all state changes
    - Implement loading state with 14px spinner, hidden text, maintained width
    - Add focus ring (2px, primary at 40% opacity) for keyboard navigation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 12.2_

  - [x] 2.2 Create IconButton component (src/components/ui/IconButton.tsx)
    - Implement icon-only button with minimum 28×28px tap target
    - Apply ghost button hover treatment
    - Require aria-label prop for accessibility
    - Use 16px icon sizing with centered alignment
    - _Requirements: 2.7, 8.7, 12.3_

  - [x] 2.3 Write property test for Button Interactive State Correctness
    - **Property 3: Button Interactive State Correctness**
    - Render Button with all variant × state combinations, verify correct CSS classes
    - **Validates: Requirements 2.5**

  - [x] 2.4 Write property test for Icon-Only Button Accessibility
    - **Property 9: Icon-Only Button Accessibility**
    - Find all icon-only buttons, verify aria-label presence with at least 2 words
    - **Validates: Requirements 12.3**

- [x] 3. Build Core UI Primitives — Form Elements
  - [x] 3.1 Create Input component (src/components/ui/Input.tsx)
    - Implement InputProps with label, error, required props
    - Apply consistent styling: height 36px, border-radius 8px, 1px border (border token), bg black/4% light or white/6% dark, px 12px, font-size 13px
    - Implement focus ring (2px, primary at 50% opacity)
    - Implement error state with danger border and caption-style error message 4px below
    - Implement disabled state (opacity 0.45, not-allowed cursor)
    - Add required asterisk indicator in danger color after label
    - Add aria-describedby linking error message to input
    - _Requirements: 7.1, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 12.8_

  - [x] 3.2 Create Select component (src/components/ui/Select.tsx)
    - Implement SelectProps with label, error, required, options props
    - Match Input styling (height 36px, radius 8px, border, background, px 12px, font-size 13px)
    - Add right-aligned chevron indicator (16px, muted color)
    - Implement same focus, error, disabled, and required states as Input
    - _Requirements: 7.2, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 3.3 Create Textarea component (src/components/ui/Textarea.tsx)
    - Implement TextareaProps with label, error, required props
    - Match Input border, radius, and background styling
    - Set minimum height 80px, padding 12px, vertical resize enabled
    - Implement same focus, error, disabled, and required states as Input
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 3.4 Write property test for Form Element Styling Consistency
    - **Property 5: Form Element Styling Consistency**
    - Render Input, Select, Textarea and verify height, border-radius, border, background, padding, font-size
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 4. Build Core UI Primitives — Containers and Layout
  - [x] 4.1 Create Card component (src/components/ui/Card.tsx)
    - Implement CardProps with children, className, padding (none, sm, md, lg)
    - Apply surface background, 1px border (border token), border-radius 12px, shadow-sm light / shadow-md dark
    - Default padding 16px (md)
    - _Requirements: 6.1, 6.2, 5.4_

  - [x] 4.2 Create Modal component (src/components/ui/Modal.tsx)
    - Implement ModalProps with open, onClose, title, children, footer, maxWidth
    - Apply centered overlay with black/40% backdrop and backdrop-blur-sm
    - Content container: border-radius 16px, max-width 480px
    - Header: 16px padding, border-bottom; Body: 24px padding; Footer: 16px padding, border-top
    - Implement focus trap (trap keyboard focus within modal)
    - Close on Escape key and backdrop click, return focus to trigger element
    - Add role="dialog" and aria-modal="true"
    - _Requirements: 6.3, 12.6, 12.7_

  - [x] 4.3 Create PageHeader component (src/components/ui/PageHeader.tsx)
    - Implement PageHeaderProps with title, subtitle, backTo, actions
    - Apply page-title typography to title
    - Render back-navigation ghost button with left-chevron (16px) when backTo is provided
    - Layout: title left, actions right, 16px vertical padding
    - _Requirements: 9.1, 9.4, 2.8_

  - [x] 4.4 Create barrel export (src/components/ui/index.ts)
    - Export all UI primitives from a single entry point
    - _Requirements: 1.1_

- [x] 5. Build Feedback State Primitives
  - [x] 5.1 Create EmptyState component (src/components/ui/EmptyState.tsx)
    - Implement EmptyStateProps with icon, title, description, action
    - Centered layout with icon at 20px and 30-40% opacity
    - Title in 15-16px medium weight, description in 12-13px at 40% opacity
    - Optional action slot for CTA button
    - _Requirements: 11.3_

  - [x] 5.2 Create LoadingState component (src/components/ui/LoadingState.tsx)
    - Implement LoadingStateProps with optional message
    - Centered animated spinner (minimum 20px diameter)
    - Reduced opacity (40% or less of primary text color)
    - _Requirements: 11.1_

  - [x] 5.3 Create ErrorState component (src/components/ui/ErrorState.tsx)
    - Implement ErrorStateProps with title, message, onRetry
    - Centered warning icon in danger color
    - Error title, description, and retry button (secondary variant)
    - Retry button triggers onRetry callback
    - _Requirements: 11.4_

  - [x] 5.4 Write property test for Feedback State Pattern Consistency
    - **Property 7: Feedback State Pattern Consistency**
    - Render each feedback state component, verify structure matches spec (icon size, text sizes, opacity)
    - **Validates: Requirements 11.1, 11.3, 11.4, 11.5**

- [x] 6. Checkpoint — Foundation Complete
  - Ensure all UI primitive components compile without errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Migrate Global Layout and Navigation
  - [x] 7.1 Migrate Navbar component (src/components/Navbar.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply fixed height 44px, px 16px, 12px gap between nav items
    - Add backdrop-blur-[20px] and 1px border-bottom using border token
    - Apply consistent active-state styling (bg black/8% light, white/10% dark, font-weight 500)
    - _Requirements: 9.2, 9.5, 3.5, 3.7_

  - [x] 7.2 Migrate Layout/Sidebar component (src/components/Layout.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply sidebar width 240px expanded / 56px collapsed
    - Nav item height 32px with hover state (bg black/4% light, white/6% dark)
    - Active state: bg black/8% light, white/10% dark, font-weight 500
    - Animate collapse/expand transition within 200ms
    - Hide labels in collapsed state, center icons at 56px width
    - _Requirements: 9.3, 9.5, 9.6_

  - [x] 7.3 Migrate ThemeToggle component (src/components/ThemeToggle.tsx)
    - Replace hardcoded colors with semantic tokens
    - Ensure theme toggle adds/removes `.dark` class without page reload
    - _Requirements: 3.8_

- [x] 8. Migrate List Pages
  - [x] 8.1 Migrate WorkflowsListPage (src/pages/WorkflowsListPage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply PageHeader component with page-title style and action button
    - Apply consistent page padding (24px horizontal, 24px top)
    - Apply 12px gap between cards in grid, 16px in list layout
    - Integrate EmptyState, LoadingState, ErrorState components
    - Apply responsive stacking below 768px (single column, 16px padding)
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7, 9.1, 11.5_

  - [x] 8.2 Migrate DatasetsPage (src/pages/DatasetsPage.tsx)
    - Same token migration and layout consistency as 8.1
    - Replace inline loading/empty/error patterns with shared primitives
    - _Requirements: 5.1, 5.3, 5.6, 9.1, 11.5_

  - [x] 8.3 Migrate DashboardsListPage (src/pages/DashboardsListPage.tsx)
    - Same token migration and layout consistency as 8.1
    - Replace inline loading/empty/error patterns with shared primitives
    - _Requirements: 5.1, 5.3, 5.6, 9.1, 11.5_

  - [x] 8.4 Migrate ReportsPage (src/pages/ReportsPage.tsx)
    - Same token migration and layout consistency as 8.1
    - Replace inline loading/empty/error patterns with shared primitives
    - _Requirements: 5.1, 5.3, 5.6, 9.1, 11.5_

  - [x] 8.5 Migrate WorkspaceMembersPage (src/pages/WorkspaceMembersPage.tsx)
    - Same token migration and layout consistency as 8.1
    - Replace inline loading/empty/error patterns with shared primitives
    - _Requirements: 5.1, 5.3, 5.6, 9.1, 11.5_

  - [x] 8.6 Migrate WorkspaceProjectsPage (src/pages/WorkspaceProjectsPage.tsx)
    - Same token migration and layout consistency as 8.1
    - Replace inline loading/empty/error patterns with shared primitives
    - _Requirements: 5.1, 5.3, 5.6, 9.1, 11.5_

- [x] 9. Checkpoint — List Pages Complete
  - Ensure all list pages render correctly with tokens and shared primitives
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Migrate Detail Pages
  - [x] 10.1 Migrate DashboardPage (src/pages/DashboardPage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply PageHeader with back-navigation (left-chevron ghost button)
    - Apply consistent card styling, spacing, and typography
    - _Requirements: 5.1, 5.2, 5.4, 6.1, 6.2, 9.4_

  - [x] 10.2 Migrate DatasetDetailPage (src/pages/DatasetDetailPage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply PageHeader with back-navigation
    - Apply consistent card styling and typography
    - _Requirements: 5.1, 5.4, 6.1, 6.2, 9.4_

  - [x] 10.3 Migrate ReportDetailPage (src/pages/ReportDetailPage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply PageHeader with back-navigation
    - Apply consistent card styling and typography
    - _Requirements: 5.1, 5.4, 6.1, 6.2, 9.4_

  - [x] 10.4 Migrate WorkspaceProjectDetailPage (src/pages/WorkspaceProjectDetailPage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply PageHeader with back-navigation
    - Apply consistent card styling and typography
    - _Requirements: 5.1, 5.4, 6.1, 6.2, 9.4_

  - [x] 10.5 Migrate SettingsPage (src/pages/SettingsPage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply consistent form element styling using Input, Select, Textarea primitives
    - Apply consistent card and section spacing
    - _Requirements: 5.1, 5.2, 6.1, 7.1, 7.2, 7.3_

  - [x] 10.6 Migrate WorkspaceDashboardPage (src/pages/WorkspaceDashboardPage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply consistent card styling and typography
    - _Requirements: 5.1, 5.4, 6.1, 6.2_

- [x] 11. Migrate Workflow Editor Components
  - [x] 11.1 Migrate BaseNode component (src/components/nodes/BaseNode.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply border-radius 16px, shadow per design (light: shadow-lg, dark: shadow-xl)
    - Implement status indicator dot (1.5px circle): idle=muted, running=primary+pulse, success=green, error=red
    - Running state: blue border at 60% opacity with 3px outer glow at 12% opacity, animate-pulse on dot
    - _Requirements: 10.1, 10.5_

  - [x] 11.2 Migrate Toolbar component (src/components/flow/Toolbar.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply fixed height 44px, page-background at 95% opacity, backdrop-blur-xl
    - Apply 1px border-bottom at black/7% (light) or white/7% (dark)
    - _Requirements: 10.2_

  - [x] 11.3 Migrate NodePanel (src/components/panels/NodePanel.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply width 224px, page-background color, 1px border on canvas edge
    - Header: uppercase tracking-widest label at 10px, collapse/expand toggle
    - Collapsed state: 40px width with toggle button
    - _Requirements: 10.3, 10.6_

  - [x] 11.4 Migrate ConfigPanel (src/components/panels/ConfigPanel.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply width 256px, page-background color, 1px border on canvas edge
    - Header: 44px height, 16px horizontal padding, card-title style, ghost close button
    - Apply consistent form element styling for node configuration inputs
    - _Requirements: 10.3, 6.5_

  - [x] 11.5 Migrate ResultsPanel (src/components/panels/ResultsPanel.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply consistent panel styling matching ConfigPanel treatment
    - _Requirements: 10.3, 6.5_

  - [x] 11.6 Migrate FlowCanvas and canvas controls (src/components/flow/FlowCanvas.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply canvas controls styling: border-radius 10px, backdrop-blur 12px, 1px border at 8% opacity
    - Background at 85% opacity (light) or 90% opacity (dark)
    - _Requirements: 10.4_

  - [x] 11.7 Migrate remaining node type components
    - Migrate AnalysisNodes, BigDataNodes, ChartNode, DatabaseQueryNode, FileUploadNode, MLNodes, OutputNodes, TransformationNodes, UtilityNodes, VisualizationNodes
    - Replace hardcoded colors with semantic tokens in all node files
    - Ensure consistent icon sizing (14px inline, 16px standard, 20px decorative)
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [x] 12. Checkpoint — Workflow Editor Complete
  - Ensure workflow editor renders correctly with all token-based styling
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Migrate Modals and Overlays
  - [x] 13.1 Migrate AIInsightsModal (src/components/AIInsightsModal.tsx)
    - Replace with Modal primitive or apply consistent modal styling
    - Apply border-radius 16px, max-width 480px, correct header/body/footer padding
    - Add focus trap, Escape key close, backdrop click close
    - Add role="dialog" and aria-modal="true"
    - _Requirements: 6.3, 12.6, 12.7_

  - [x] 13.2 Migrate HistoryModal (src/components/HistoryModal.tsx)
    - Same modal consistency treatment as 13.1
    - _Requirements: 6.3, 12.6, 12.7_

  - [x] 13.3 Migrate WorkflowTemplateModal (src/components/WorkflowTemplateModal.tsx)
    - Same modal consistency treatment as 13.1
    - _Requirements: 6.3, 12.6, 12.7_

  - [x] 13.4 Migrate NotificationCenter (src/components/NotificationCenter.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply consistent popover/dropdown styling: border-radius 12px, border at 8% opacity, shadow-xl
    - Ensure toast notifications auto-dismiss after 4s, max 3 visible
    - Add role="alert" for notification banners
    - _Requirements: 6.4, 11.6, 12.7_

  - [x] 13.5 Migrate ProfileMenu (src/components/ProfileMenu.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply consistent popover/dropdown styling
    - Add role="menu" for dropdown
    - _Requirements: 6.4, 12.7_

- [x] 14. Apply Typography and Icon Consistency Across All Components
  - [x] 14.1 Audit and fix typography across all page and component files
    - Ensure page-title style (20px, bold, leading-7) on all top-level page headings
    - Ensure section-title style (15px, semibold) on all section headings
    - Ensure card-title style (13px, semibold) on all card/panel titles
    - Ensure body style (13px, normal) on paragraph text, table cells, list items
    - Ensure label style (12px, medium) on form labels, filter labels, metadata labels
    - Ensure caption style (11px, normal) on timestamps, helper text
    - Verify Inter font family is applied globally
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 14.2 Audit and fix icon consistency across all components
    - Standardize icon sizes to three tiers: 14px (inline/compact), 16px (standard), 20px (decorative/empty-state)
    - Apply consistent stroke-width 1.8 on all outline SVG icons
    - Ensure same icon used for same semantic action (delete, edit, share, back, close, settings, search, add, download)
    - Align icon color with parent text color (unless semantic color applies)
    - Vertically center icons within parent elements
    - Apply 6px gap between icon and adjacent text label
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 14.3 Write property test for Typography Scale Compliance
    - **Property 4: Typography Scale Compliance**
    - Parse component files, extract font-size/weight values, verify against defined scale
    - **Validates: Requirements 4.9**

  - [x] 14.4 Write property test for Icon Size and Stroke Consistency
    - **Property 6: Icon Size and Stroke Consistency**
    - Parse SVG elements in components, verify dimensions are 14/16/20px and strokeWidth is 1.8
    - **Validates: Requirements 8.1, 8.2**

- [x] 15. Accessibility Enhancements
  - [x] 15.1 Add keyboard navigation and focus indicators globally
    - Ensure all interactive elements are reachable via Tab in visual reading order
    - Apply 2px focus ring (primary at 40% opacity) on all focusable elements via global CSS utility
    - Ensure focus ring only shows on keyboard navigation (focus-visible)
    - _Requirements: 12.1, 12.2_

  - [x] 15.2 Add aria-labels to all icon-only buttons across the codebase
    - Audit all icon-only buttons and add descriptive aria-label (at least 2 words)
    - _Requirements: 12.3_

  - [x] 15.3 Add ARIA roles and aria-live regions
    - Add role="dialog" to all modals, role="menu" to dropdowns, role="alert" to notification banners
    - Add aria-describedby linking error messages to form inputs
    - Add aria-live="assertive" region for form validation errors (announce within 200ms)
    - Add aria-live="polite" for non-critical dynamic content updates (notifications, status changes)
    - _Requirements: 12.7, 12.8, 12.9_

  - [x]* 15.4 Write property test for Focus Indicator Visibility
    - **Property 8: Focus Indicator Visibility**
    - Render focusable elements, simulate keyboard focus, verify ring classes present
    - **Validates: Requirements 12.2**

- [x] 16. Migrate Remaining Pages and Components
  - [x] 16.1 Migrate AuthPage (src/pages/AuthPage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply consistent form styling using Input primitive
    - Apply consistent button styling using Button primitive
    - _Requirements: 1.6, 7.1, 2.1_

  - [x] 16.2 Migrate HelpPage (src/pages/HelpPage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply consistent typography and card styling
    - _Requirements: 1.6, 4.1, 6.1_

  - [x] 16.3 Migrate SharedWithMePage (src/pages/SharedWithMePage.tsx)
    - Replace hardcoded colors with semantic tokens
    - Apply consistent list page layout and feedback states
    - _Requirements: 1.6, 5.1, 11.5_

  - [x] 16.4 Migrate workspace feature components (src/features/workspaces/)
    - Replace hardcoded colors with semantic tokens across all workspace feature files
    - Apply consistent component styling
    - _Requirements: 1.6, 1.7_

- [x] 17. Final Validation and Hardcoded Color Cleanup
  - [x] 17.1 Run full codebase scan for remaining hardcoded colors
    - Scan all files in src/components/**, src/pages/**, src/features/** for hex, rgb, rgba literals
    - Replace remaining hardcoded values with token references or document as intentional exceptions
    - Verify at least 80% reduction in hardcoded color occurrences vs baseline
    - _Requirements: 1.6, 1.7, 1.9_

  - [x] 17.2 Write property test for No Hardcoded Semantic Colors
    - **Property 2: No Hardcoded Semantic Colors in Components**
    - Scan component files with regex, cross-reference against token values, flag violations
    - **Validates: Requirements 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

  - [x] 17.3 Verify responsive layout behavior
    - Ensure grid layouts stack to single column below 768px
    - Ensure horizontal page padding reduces to 16px below 768px
    - Ensure vertical spacing between sections reduces to 16px below 768px
    - _Requirements: 5.7_

  - [x] 17.4 Verify loading timeout behavior
    - Ensure pages transition from loading to error state after 15 seconds without response
    - _Requirements: 11.2_

- [x] 18. Final Checkpoint — All Requirements Validated
  - Ensure all tests pass, ask the user if questions arise.
  - Verify complete token coverage across all pages
  - Confirm dark mode toggle works without page reload on all pages

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties from the design document
- The token system (tasks 1.1–1.2) must be completed before any migration work begins
- UI primitives (tasks 2–5) must be completed before page migrations (tasks 7–16)
- Migration tasks within the same phase (e.g., 8.1–8.6) are independent and can be parallelized

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.1", "3.1", "3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "3.4", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "7.1", "7.2", "7.3"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6"] },
    { "id": 7, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6"] },
    { "id": 8, "tasks": ["11.7", "13.1", "13.2", "13.3", "13.4", "13.5"] },
    { "id": 9, "tasks": ["14.1", "14.2"] },
    { "id": 10, "tasks": ["14.3", "14.4", "15.1", "15.2", "15.3"] },
    { "id": 11, "tasks": ["15.4", "16.1", "16.2", "16.3", "16.4"] },
    { "id": 12, "tasks": ["17.1", "17.3", "17.4"] },
    { "id": 13, "tasks": ["17.2"] }
  ]
}
```
