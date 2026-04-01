# CLAUDE.md — CSS Fix: Pixel-Perfect Alignment with v1 Design

## What this is

This is NOT a new feature step. This is a **design fidelity audit and fix**. The v2 frontend has all the correct pages and components, but the CSS does not perfectly match the v1 design. Your job is to systematically compare every component and page between v1 and v2, identify every visual difference, and fix them until v2 looks identical to v1.

---

## Process

### Phase 1: Read the ENTIRE v1 CSS

Read `/searchanycars.com/src/index.css` — all 7000+ lines. This is the single source of truth for how the site should look. Every CSS property, every media query, every hover state, every transition, every shadow, every spacing value matters.

### Phase 2: Compare component by component

For each component/section listed below, do this:
1. Read the v1 CSS classes from `/searchanycars.com/src/index.css`
2. Read the v2 CSS from `v2/apps/web/app/globals.css`
3. Compare EVERY property — colors, padding, margin, font-size, font-weight, border-radius, box-shadow, background, display, gap, grid-template-columns, transitions, hover states, active states
4. Identify EVERY difference
5. Fix the v2 CSS to match v1 exactly

### Phase 3: Compare the JSX structure

For each component, also compare:
1. The v1 component JSX (class names used, element nesting, conditional classes)
2. The v2 component JSX
3. Ensure v2 uses the SAME class names as v1 where CSS classes are used
4. If v2 uses Tailwind utilities instead of CSS classes, and the result doesn't match v1, convert to using the CSS class from globals.css instead

---

## Components to audit (in order of visual importance)

### 1. Site Header
- v1: `/searchanycars.com/src/components/SiteHeader.tsx` + CSS `.site-header` through `.menu-toggle`
- v2: `v2/apps/web/src/components/SiteHeader.tsx` + globals.css
- Check: header height, background, border-bottom, brand icon size/color/radius, brand text font/size/color with coral "Any", nav link padding/font-size/hover/active states, S-Plus gold gradient link, S-Plus New teal gradient link, action buttons styling, wishlist icon, "Find Cars" button, mobile hamburger, mobile overlay nav

### 2. Site Footer
- v1: `/searchanycars.com/src/components/SiteFooter.tsx` + CSS `.site-footer` through `.footer-bottom`
- v2: `v2/apps/web/src/components/SiteFooter.tsx`
- Check: background color (navy-dark), padding, footer-grid columns, brand text styling, column title font, link font-size/color/hover, accordion chevron on mobile, footer-bottom border/padding, responsive breakpoints

### 3. Mobile Nav
- v1: `/searchanycars.com/src/components/MobileNav.tsx` + CSS `.mobile-nav` through `.mobile-nav-icon`
- v2: `v2/apps/web/src/components/MobileNav.tsx`
- Check: bottom position, background, height, grid columns, icon sizes, icon-wrap dimensions/border-radius, active state colors (navy for home, coral for search, gold gradient for splus, teal for new, red for wishlist, purple for account), label font-size, display:none on desktop/display:block below 768px

### 4. Car Card
- v1: `/searchanycars.com/src/components/CarCard.tsx` + CSS `.car-card` through `.car-footer`
- v2: `v2/apps/web/src/components/CarCard.tsx`
- Check: card border-radius, box-shadow, hover shadow/transform, image height, image object-fit, image hover scale, badge row positioning/colors, wishlist heart button position/size, photo count badge, title font-size/weight/line-clamp, price font-size/color/weight, EMI text, specs row dot separators (size/color/spacing), location pin icon, tag row chips (colors for assured/low-km/new/single-owner), popularity fire icon, footer border-top/padding, status dot colors (green=available, orange=reserved, red=sold), button sizing

### 5. Hero Section
- v1: CSS `.hero`, `.hero-content`, `.hero h1`, `.hero-subtitle`
- Check: gradient (135deg, navy-dark → navy → navy-light), padding, h1 font-size (clamp), h1 font-weight (800), h1 color white, subtitle font-size/color/opacity

### 6. Hero Search Widget
- v1: CSS `.hero-search`, `.search-tabs`, `.search-tab`, `.search-body`, `.search-budget-grid`, `.budget-chip`, `.search-brand-grid`, `.brand-chip`, `.search-city-row`, `.city-multi-select`, `.city-multi-select-trigger`, `.city-multi-dropdown`, `.city-dropdown-item`, `.city-selected-chips`, `.city-selected-chip`
- Check: search widget background/border-radius/shadow, tab styling/active state, budget chip sizes/colors/active state, brand chip with logo sizing, city dropdown styling, city selected chips

### 7. Trust Bar
- v1: CSS `.trust-bar`, `.trust-bar-grid`, `.trust-item`, `.trust-icon`, `.trust-icon-blue`, `.trust-icon-green`, `.trust-icon-orange`
- Check: background, grid layout, icon circle sizes/colors, text font-size, horizontal scroll on mobile

### 8. Section Headings
- v1: CSS `.section`, `.section-sm`, `.section-gray`, `.section-head`, `.section-head h2`, `.text-link`
- Check: section padding (4rem vs 2.5rem), gray background color, heading font-size (clamp), heading font-weight (700), "View All" link color/hover

### 9. Body Type Grid + Fuel Type Grid
- v1: CSS `.body-type-grid`, `.body-type-card`, `.fuel-type-grid`, `.fuel-type-card`
- Check: grid columns, card padding/border/radius/shadow, icon size, name font, count color, hover effects

### 10. City Browse Grid
- v1: CSS `.city-browse-grid`, `.city-browse-card`, `.city-card-image`, `.city-card-overlay`, `.city-card-info`
- Check: grid columns, card aspect ratio, image cover, overlay gradient, text positioning, hover effects

### 11. Brand Browse Grid
- v1: CSS `.brand-browse-grid`, `.brand-browse-card`, `.brand-search-bar`, `.brand-search-input`
- Check: grid columns, card padding/border, logo image size, brand name font, search bar styling

### 12. Featured Tabs
- v1: CSS `.featured-tabs`, `.featured-tab`
- Check: tab pill styling, active state (navy background), font-size, padding

### 13. Budget Pills + S-Plus Banners + S-Plus New Banners
- v1: CSS `.budget-pills`, `.budget-pill`, `.splus-home-banner`, `.spn-home-banner` and all sub-classes
- Check: pill sizing/colors, banner gradients, badge styling, feature icons, button styling

### 14. How It Works + Reviews + Sell CTA
- v1: CSS `.how-it-works-grid`, `.how-step`, `.reviews-grid`, `.review-card`, `.sell-cta-section`
- Check: step numbering, icon circles, review stars color, avatar circle, CTA layout

### 15. Filter Sidebar (Search Page)
- v1: CSS `.search-layout`, `.filter-panel`, `.filter-section`, `.filter-section-title`, `.filter-chips`, `.filter-chip`, `.filter-input`, `.filter-range`, `.filter-header`, `.results-bar`, `.sort-pills`, `.sort-pill`, `.active-filter-pill`, `.quick-tags`, `.quick-tag`, `.compare-banner`, `.mobile-filter-fab`, `.filter-panel-backdrop`, `.filter-panel-open`
- Check: sidebar width (280px), section spacing, chip sizes/colors/active states, input styling, results bar layout, sort pill active state, mobile drawer animation

### 16. Car Detail Page (VDP)
- v1: CSS `.vdp-layout`, `.vdp-sidebar`, `.gallery`, `.gallery-main`, `.gallery-nav-btn`, `.gallery-thumbs`, `.quick-specs`, `.overview-grid`, `.specs-section`, `.features-section`, `.inspection-section`, `.emi-calculator`, `.warranty-section`, `.mobile-cta-bar`, `.fullscreen-gallery`
- Check: two-column layout widths, sidebar sticky behavior, gallery aspect ratio, thumbnail strip, nav arrow styling, quick spec strip, overview grid columns, specs accordion, EMI slider styling, warranty card layout, mobile sticky CTA

### 17. Modals
- v1: CSS `.modal-overlay`, `.modal`, `.modal-header`, `.modal-close`, `.modal-body`, `.modal-footer`, `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-row`, `.form-success`
- Check: overlay background, modal width/max-width/border-radius, header padding/border, close button, form field styling, success state icon

### 18. Login Page
- v1: CSS `.login-page`, `.login-card`, `.login-header`, `.login-tabs`, `.login-tab`, `.login-error`, `.login-form`, `.login-field`, `.login-submit`
- Check: centered card width, background, padding, tab active state, input styling, submit button

### 19. S-Plus Page Theme
- v1: CSS for `.splus-page`, `.splus-hero`, all `.sp-*` themed classes
- Check: gold color scheme, dark backgrounds, card styling variants, badge styling

### 20. S-Plus New Page Theme
- v1: CSS for `.spn-page`, `.spn-hero`, all `.spn-*` themed classes
- Check: teal color scheme, dark backgrounds, card styling variants

### 21. Buttons (Global)
- v1: CSS `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost`, `.btn-whatsapp`, `.btn-sm`, `.btn-lg`, `.btn-outline-white`
- Check: border-radius (999px for pills), padding, font-weight, font-size, colors, hover states, shadows, transitions

### 22. Responsive Breakpoints
- v1 uses these breakpoints: 1200px, 1024px, 900px, 768px, 600px, 480px, 400px, 360px
- For EACH component, check the responsive rules match v1

---

## How to fix

For each difference found:
1. If the v2 globals.css is missing a CSS class entirely — copy it from v1's index.css
2. If the v2 globals.css has the class but with wrong values — update the values to match v1 exactly
3. If the v2 component uses Tailwind utilities that don't match — replace with the CSS class from globals.css
4. If the v2 component uses different class names — update to match v1 class names

**The simplest and most reliable approach**: Take the ENTIRE v1 index.css content, and ensure every single rule exists in v2's globals.css. If a rule is missing, add it. If it conflicts with Tailwind, the CSS class should take precedence (add `!important` if needed, or ensure specificity is correct).

---

## Verification

After all fixes:
1. Open v2 at localhost:3000
2. For each page, visually inspect at desktop width (1280px+), tablet (768px), and mobile (375px)
3. The following must match v1 exactly:
   - Colors (navy #1A237E, coral #FF6B35, backgrounds, text colors)
   - Font sizes and weights (Inter body, Poppins headings)
   - Spacing (padding, margins, gaps)
   - Border radius (6px, 10px, 16px, 24px, 999px for pills)
   - Shadows (the exact shadow values from v1)
   - Hover/active states and transitions
   - Grid layouts and column counts at each breakpoint
   - Mobile-specific layouts (stacked grids, hidden elements, drawer behaviors)
4. `pnpm build` — zero errors

---

## What NOT to do

- Do NOT "improve" or "modernize" any design — match v1 exactly
- Do NOT remove CSS classes thinking they're unused — they might be used in components
- Do NOT change v1's class naming convention
- Do NOT modify `/searchanycars.com/`
- Do NOT add new features or pages