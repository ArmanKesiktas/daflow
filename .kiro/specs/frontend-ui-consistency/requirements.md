# Requirements Document

## Introduction

This specification defines the requirements for a comprehensive UI/UX consistency audit and fix across the Daflow frontend application. The goal is to eliminate visual inconsistencies, centralize design tokens, and ensure the application presents a cohesive, professional appearance befitting a data analysis / workflow SaaS product.

The Daflow frontend currently uses React + TypeScript + Vite with Tailwind CSS. There is no component library (e.g., shadcn/ui) — all UI is custom-built with inline Tailwind classes and hardcoded color values. The existing design language follows an Apple-inspired aesthetic (clean, minimal, backdrop-blur surfaces) but lacks a centralized token system, leading to inconsistencies across pages.

**Scope:** This effort focuses exclusively on auditing and fixing existing UI. No new features are introduced.

## Glossary

- **Design_Token_System**: A centralized configuration (in `tailwind.config.js` and CSS custom properties) that defines all reusable values for colors, spacing, typography, shadows, and border-radius used across the application.
- **Component**: A reusable React UI element (button, input, card, modal, etc.) that follows the Design_Token_System.
- **Theme**: The light or dark visual mode of the application, toggled via the `useTheme` hook and the `dark` class on the HTML root element.
- **Daflow_UI**: The complete set of frontend pages, components, and visual elements in the Daflow application.
- **Tailwind_Config**: The `tailwind.config.js` file that defines the design token extensions for the project.
- **CSS_Variables**: Custom CSS properties defined in `index.css` under `:root` and `.dark` selectors that provide theme-aware token values.
- **Surface**: A container element (card, panel, modal, popover) that groups related content with a distinct background, border, and shadow.
- **Feedback_State**: A visual state that communicates system status to the user (loading, empty, error, success).

## Requirements

### Requirement 1: Centralized Design Token System

**User Story:** As a developer, I want all design values (colors, spacing, typography, shadows, radii) centralized in a single token system, so that I can maintain visual consistency without hunting through individual component files.

#### Acceptance Criteria

1. THE Design_Token_System SHALL define all color values as semantic tokens (primary, secondary, background, surface, border, text-primary, text-secondary, text-muted, success, warning, danger, info) in the Tailwind_Config and CSS_Variables.
2. THE Design_Token_System SHALL provide both light and dark mode values for every semantic color token via CSS_Variables under `:root` and `.dark` selectors.
3. THE Design_Token_System SHALL define spacing scale tokens (xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px, 2xl: 32px, 3xl: 48px) in the Tailwind_Config.
4. THE Design_Token_System SHALL define border-radius tokens (sm: 6px, md: 8px, lg: 12px, xl: 16px, 2xl: 20px, full: 9999px) in the Tailwind_Config.
5. THE Design_Token_System SHALL define shadow tokens with explicit CSS box-shadow values for both light and dark modes in the Tailwind_Config, where sm applies up to 2px blur, md applies up to 8px blur, lg applies up to 16px blur, and xl applies up to 32px blur.
6. IF a component file contains a hardcoded color value (hex, rgb, or rgba literal) that maps to an existing semantic token, THEN THE Daflow_UI SHALL replace it with the corresponding semantic design token reference.
7. THE Design_Token_System SHALL reduce the total number of unique hardcoded color value occurrences across all component files (src/components/**, src/pages/**, src/features/**) by at least 80 percent compared to a baseline count taken before token migration begins.
8. THE Design_Token_System SHALL define a typography scale in the Tailwind_Config covering font-size tokens (xs: 12px, sm: 14px, base: 16px, lg: 18px, xl: 20px, 2xl: 24px, 3xl: 30px) and font-weight tokens (normal: 400, medium: 500, semibold: 600, bold: 700).
9. IF a component file contains a hardcoded color value that does not map to any defined semantic token, THEN THE Daflow_UI SHALL either extend the token system with a new semantic token for that value or document the value as an intentional exception.

### Requirement 2: Button Consistency

**User Story:** As a user, I want all buttons across the application to look and behave consistently, so that I can predict interactive elements and their importance at a glance.

#### Acceptance Criteria

1. THE Daflow_UI SHALL define exactly five button variants: primary (filled blue), secondary (subtle background), ghost (transparent with hover), danger (filled red), and outline (bordered).
2. THE Daflow_UI SHALL apply consistent dimensions to all buttons: height 28px with horizontal padding 8px for small (icon buttons), height 32px with horizontal padding 12px for default, and height 36px with horizontal padding 16px for large (full-width CTA).
3. THE Daflow_UI SHALL apply consistent border-radius of 8px to all standard buttons and 6px to compact/toolbar buttons.
4. THE Daflow_UI SHALL apply consistent font-size of 12px with font-weight 500 to all button text.
5. THE Daflow_UI SHALL render all buttons with four interactive states: default, hover (background opacity increased by 10%), active (scale transform of 0.97), and disabled (reduced opacity of 0.45 and not-allowed cursor), with a transition duration of 150ms for all state changes.
6. WHEN a button enters loading state, THE Daflow_UI SHALL display a 14px loading spinner centered inside the button, hide the button text, maintain the button's original width, and disable further clicks until the action completes.
7. THE Daflow_UI SHALL use consistent icon sizing (16px width and height) inside icon buttons with centered alignment.
8. WHEN a back-navigation button is rendered, THE Daflow_UI SHALL use a consistent left-chevron icon at 16px with the ghost button variant.

### Requirement 3: Color System Consistency

**User Story:** As a user, I want the application colors to feel unified and intentional across all pages, so that the interface feels polished and professional.

#### Acceptance Criteria

1. THE Daflow_UI SHALL use a single primary blue (#0071E3 light / #4f8ef7 dark) for all primary-variant buttons, active navigation items, selected states, and focus rings across all pages.
2. THE Daflow_UI SHALL use a single danger red (#FF453A in both light and dark modes) for all destructive action buttons, error borders, and error state indicators.
3. THE Daflow_UI SHALL use a single success green (#30D158 in both light and dark modes) for all success indicators and positive state markers.
4. THE Daflow_UI SHALL use a single warning amber (#FF9F0A in both light and dark modes) for all warning indicators and caution state markers.
5. THE Daflow_UI SHALL use consistent background colors: page background (#F5F5F7 light / #111113 dark), surface/card (#FFFFFF light / #1C1C1E dark), and elevated surface (#FFFFFF at 95% opacity light / #1C1C1E at 95% opacity dark with backdrop-blur of 12px) for modals, popovers, dropdowns, and floating panels.
6. THE Daflow_UI SHALL use consistent text colors: primary text (#1d1d1f light / #FFFFFF dark), secondary text (primary text color at 60% opacity), and muted text (primary text color at 35% opacity).
7. THE Daflow_UI SHALL use consistent border colors: default (black at 8% opacity light / white at 8% opacity dark) and subtle (black at 5% opacity light / white at 5% opacity dark).
8. WHEN the application theme is toggled between light and dark mode, THE Daflow_UI SHALL switch all color values to their corresponding mode-specific values without requiring a page reload.

### Requirement 4: Typography Consistency

**User Story:** As a user, I want text hierarchy to be clear and consistent across all pages, so that I can quickly scan and understand content structure.

#### Acceptance Criteria

1. THE Design_Token_System SHALL define a typography scale with these levels: page-title (20px, weight 700, line-height 28px), section-title (15px, weight 600, line-height 22px), card-title (13px, weight 600, line-height 18px), body (13px, weight 400, line-height 20px), label (12px, weight 500, line-height 16px), caption (11px, weight 400, line-height 16px), and small (10px, weight 400, line-height 14px).
2. THE Daflow_UI SHALL apply the page-title style to all top-level page headings, defined as the single primary heading rendered at the top of each routed page view.
3. THE Daflow_UI SHALL apply the section-title style to all section headings within pages, defined as headings that subdivide a page into logical groups of content.
4. THE Daflow_UI SHALL apply the card-title style to all card component headings and panel titles within the interface.
5. THE Daflow_UI SHALL apply the body style to all paragraph text, table cell content, and list item text.
6. THE Daflow_UI SHALL apply the label style to all form labels, filter labels, and metadata labels.
7. THE Daflow_UI SHALL apply the caption style to all timestamps, helper text, and secondary descriptions.
8. THE Daflow_UI SHALL render all text elements using the Inter font family with system-ui and sans-serif as fallbacks, matching the Tailwind_Config fontFamily.sans definition, except for elements explicitly styled with the monospace font family (fontFamily.mono).
9. WHEN a page is rendered, THE Daflow_UI SHALL ensure that no text element uses a font-size or font-weight value outside the defined typography scale unless it belongs to a third-party embedded component.

### Requirement 5: Spacing and Layout Consistency

**User Story:** As a user, I want consistent spacing between elements across all pages, so that the interface feels organized and balanced.

#### Acceptance Criteria

1. THE Daflow_UI SHALL apply consistent page padding of 24px horizontal and 24px top on all list pages and detail pages.
2. THE Daflow_UI SHALL apply consistent vertical spacing of 24px between major page sections (header area, content area, footer area).
3. THE Daflow_UI SHALL apply consistent gap of 12px between cards in grid layouts and 16px between cards in list layouts.
4. THE Daflow_UI SHALL apply consistent internal padding of 16px on all four sides to all card and panel components.
5. THE Daflow_UI SHALL apply consistent toolbar/header height of 44px (11 tailwind units) across the main navbar, workflow editor toolbar, and workspace shell top bar.
6. THE Daflow_UI SHALL apply consistent vertical spacing of 12px between sibling items within a section (e.g., between list rows, between stacked cards within a content area).
7. WHILE the viewport width is below 768px, THE Daflow_UI SHALL stack grid layouts into a single column, reduce horizontal page padding to 16px, and reduce vertical spacing between major page sections to 16px.

### Requirement 6: Card, Panel, and Container Consistency

**User Story:** As a user, I want all cards, panels, and containers to share a unified visual treatment, so that the interface feels cohesive.

#### Acceptance Criteria

1. THE Daflow_UI SHALL apply consistent card styling: white background (surface token), 1px border (border token), border-radius of 12px, and shadow-sm in light mode.
2. WHILE dark mode is active, THE Daflow_UI SHALL apply consistent card styling: #1C1C1E background, 1px border at white/8% opacity, border-radius of 12px, and shadow-md (as defined in the Design_Token_System).
3. THE Daflow_UI SHALL apply consistent modal styling: centered overlay with black/40% backdrop and backdrop-blur-sm, content container with border-radius 16px, max-width of 480px, header section with 16px padding and border-bottom, body section with 24px padding, and footer section with 16px padding and border-top.
4. THE Daflow_UI SHALL apply consistent popover/dropdown styling: border-radius 12px, border at 8% opacity, shadow-xl, and the existing dropdown-popover animation.
5. THE Daflow_UI SHALL apply consistent panel styling (side panels like ConfigPanel, ResultsPanel): full viewport height minus navbar (44px), width between 280px and 400px, border-left or border-right (1px, border token), surface background, and a header of 44px height with 16px horizontal padding containing a title in card-title style and a ghost icon close button aligned right.

### Requirement 7: Form and Input Consistency

**User Story:** As a user, I want all form elements to look and behave the same way, so that I know how to interact with them regardless of which page I am on.

#### Acceptance Criteria

1. THE Daflow_UI SHALL apply consistent input styling: height 36px, border-radius 8px, 1px border (border token), background of black/4% light or white/6% dark, padding-x 12px, font-size 13px.
2. THE Daflow_UI SHALL apply consistent select styling matching the input height (36px), border-radius (8px), border (border token), background, padding-x (12px), and font-size (13px), with a right-aligned chevron indicator at 16px size and muted text color.
3. THE Daflow_UI SHALL apply consistent textarea styling matching input border, radius, and background with minimum height of 80px, padding of 12px, and vertical resize enabled.
4. WHEN an input, select, or textarea receives focus, THE Daflow_UI SHALL display a 2px focus ring using the primary color at 50% opacity on the border.
5. IF a form field has a validation error, THEN THE Daflow_UI SHALL display a red border (danger token) and an error message 4px below the field in caption style with danger color.
6. THE Daflow_UI SHALL apply consistent label styling: positioned above the input with 6px margin-bottom, using the label typography token, and secondary text color.
7. THE Daflow_UI SHALL apply consistent placeholder styling: muted text color (primary at 30% opacity).
8. IF a form field is disabled, THEN THE Daflow_UI SHALL render it with reduced opacity of 0.45, a not-allowed cursor, and no response to user interaction.
9. THE Daflow_UI SHALL apply consistent required-field indication: an asterisk character in danger color immediately after the label text.

### Requirement 8: Icon Consistency

**User Story:** As a user, I want icons to be visually consistent in size, weight, and meaning, so that I can quickly recognize actions and navigation elements.

#### Acceptance Criteria

1. THE Daflow_UI SHALL standardize icon sizes to three tiers: 14px for inline text and compact toolbar contexts, 16px for standard button and toolbar icons, and 20px for standalone decorative or empty-state icons.
2. THE Daflow_UI SHALL use consistent stroke-width of 1.8 for all outline-style SVG icons across the application.
3. THE Daflow_UI SHALL use the same icon for the same semantic action across all pages, including at minimum: delete, edit, share, back-navigation, close, settings, search, add/create, and download.
4. THE Daflow_UI SHALL align icon color with the text color of its parent element unless the icon has a specific semantic color (success, danger, warning, or info as defined in the Design_Token_System).
5. THE Daflow_UI SHALL vertically center all icons within their parent button or container such that the icon's vertical midpoint aligns with the adjacent text baseline-center within 1px tolerance.
6. WHEN an icon is rendered adjacent to a text label within the same element, THE Daflow_UI SHALL apply a horizontal gap of 6px between the icon and the text.
7. WHEN a standalone icon serves as an interactive element without a visible text label, THE Daflow_UI SHALL render the icon within a minimum tap target of 28px by 28px and display a hover state matching the ghost button hover treatment.

### Requirement 9: Page and Navigation Consistency

**User Story:** As a user, I want navigation patterns and page layouts to be predictable across the application, so that I always know where I am and how to get around.

#### Acceptance Criteria

1. THE Daflow_UI SHALL render a consistent page header structure on all list pages: page title (page-title style) on the left, primary action button on the right, with 16px vertical padding.
2. THE Daflow_UI SHALL render the main navbar at a fixed height of 44px with padding-x of 16px, 12px gap between nav items, backdrop-blur of 20px, and a 1px border-bottom (border token) across all global pages.
3. THE Daflow_UI SHALL render the workspace shell sidebar with consistent width (240px expanded, 56px collapsed), consistent nav item height (32px), hover state (background fill at black/4% light, white/6% dark), and active state as defined in criterion 5.
4. WHEN a user navigates to a sub-page (any page reached via a list-page item or detail link that is one level deeper in the navigation hierarchy), THE Daflow_UI SHALL display a left-chevron ghost button in the page header area that navigates back to the parent list page.
5. THE Daflow_UI SHALL apply consistent active-state styling to navigation items: background fill (black/8% light, white/10% dark) and font-weight 500.
6. WHEN the user clicks the sidebar collapse toggle, THE Daflow_UI SHALL animate the sidebar width transition between 240px (expanded) and 56px (collapsed) within 200ms, hiding nav item labels in collapsed state and showing only icons centered at 56px width.

### Requirement 10: Workflow Editor Screen Consistency

**User Story:** As a user, I want the workflow editor (canvas, toolbar, panels, nodes) to feel visually integrated with the rest of the application design language.

#### Acceptance Criteria

1. THE Daflow_UI SHALL render all workflow node cards using the BaseNode component with border-radius of 16px, shadow (light: 0 4px 16px rgba(0,0,0,0.10), dark: 0 8px 32px rgba(0,0,0,0.4)), and a status indicator dot (1.5px diameter circle) colored per node status (idle: muted, running: primary blue with pulse animation, success: green, error: red).
2. THE Daflow_UI SHALL render the workflow toolbar as a fixed-height 44px header with background using the page-background token at 95% opacity, backdrop-blur-xl, and a 1px border-bottom at black/7% (light) or white/7% (dark), matching the main navbar surface treatment.
3. THE Daflow_UI SHALL render side panels (NodePanel at 224px width, ConfigPanel at 256px width) with the page-background color (#F5F5F7 light / #111113 dark), a 1px border (black/7% light / white/7% dark) on the adjacent canvas edge, and a header section with uppercase tracking-widest label text at 10px and a collapse/expand toggle button.
4. THE Daflow_UI SHALL render canvas controls (zoom buttons, minimap) with border-radius of 10px, backdrop-filter blur of 12px, 1px border at 8% opacity, and background at 85% opacity (light) or 90% opacity (dark), as defined in the existing React Flow CSS overrides.
5. WHEN a node is in running state, THE Daflow_UI SHALL display a blue (#0071E3) border at 60% opacity with a 3px outer glow at 12% opacity, and an animated status dot using the CSS animate-pulse class, providing a visible pulsing indication of active execution.
6. WHILE a side panel is in collapsed state, THE Daflow_UI SHALL render the panel at 40px width with the same background and border styling as the expanded state, displaying only a toggle button and optional icon indicators vertically centered.

### Requirement 11: Empty, Loading, and Error State Consistency

**User Story:** As a user, I want consistent visual feedback when content is loading, empty, or has errored, so that I always understand the current state of the page.

#### Acceptance Criteria

1. WHEN a page or section is loading data, THE Daflow_UI SHALL display a loading indicator centered within the content area, rendered as an animated spinner (minimum 20px diameter) or skeleton placeholder with reduced opacity (40% or less of the primary text color).
2. IF a page or section does not receive a data response within 15 seconds, THEN THE Daflow_UI SHALL transition from the loading state to the error state.
3. WHEN a page or section has no data to display after a successful load, THE Daflow_UI SHALL display an empty state consisting of: a centered icon (20px, at 30–40% opacity of the primary text color), a title in 15–16px medium-weight font, and a description in 12–13px font at 40% opacity of the primary text color.
4. IF a page or section fails to load data, THEN THE Daflow_UI SHALL display an error state consisting of: a centered warning icon in the application's danger color, an error title, a one-sentence description indicating the failure reason, and a retry button (secondary variant) that re-triggers the original data fetch when clicked.
5. THE Daflow_UI SHALL apply the same loading, empty, and error state pattern across all list pages (workflows, datasets, dashboards, reports, members, projects).
6. WHEN a button triggers an action that fails, THE Daflow_UI SHALL display a toast notification using the existing react-hot-toast system with the toast-themed class, auto-dismissing after 4 seconds, with a maximum of 3 toasts visible simultaneously.

### Requirement 12: Accessibility Baseline

**User Story:** As a user with assistive technology, I want the application to meet basic accessibility standards, so that I can navigate and use all features effectively.

#### Acceptance Criteria

1. THE Daflow_UI SHALL ensure all interactive elements (buttons, links, inputs) are reachable via keyboard Tab navigation in a sequence that follows the visual layout reading order (left-to-right, top-to-bottom within each logical section).
2. THE Daflow_UI SHALL display a visible focus indicator (2px ring using primary color at 40% opacity) on all focusable elements when navigated via keyboard.
3. THE Daflow_UI SHALL provide aria-label attributes with a descriptive label of at least 2 words on all icon-only buttons that lack visible text labels.
4. THE Daflow_UI SHALL ensure a minimum contrast ratio of 4.5:1 between text and its background for all body text in both light and dark modes.
5. THE Daflow_UI SHALL ensure a minimum contrast ratio of 3:1 for all UI component boundaries (borders, focus indicators) against adjacent colors.
6. WHEN a modal or popover opens, THE Daflow_UI SHALL trap keyboard focus within the overlay and return focus to the trigger element when the overlay is dismissed by any method (Escape key, close button, or backdrop click).
7. THE Daflow_UI SHALL assign ARIA roles to overlay and notification components as follows: dialog role on modals, menu role on dropdowns, and alert role on notification banners.
8. WHEN form validation fails, THE Daflow_UI SHALL associate each error message with its corresponding input field using aria-describedby and announce the first error to screen readers via an aria-live="assertive" region within 200 milliseconds of the validation event.
9. WHEN dynamic content updates occur (notifications, status changes, loading completions), THE Daflow_UI SHALL announce the update to assistive technologies using an aria-live region with politeness level "polite" for non-critical updates and "assertive" for error or alert updates.
