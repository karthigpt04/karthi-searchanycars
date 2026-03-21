# QA Test Report — SearchAnyCars Mobile & Desktop

**Date:** 2026-03-21
**Tested by:** Automated QA Suite (Playwright) + Manual Review

---

## Test Summary

| Suite | Tests | Pass | Fail | Status |
|-------|-------|------|------|--------|
| Mobile UI (3 viewports x 11 pages) | 33 | 33 | 0 | PASS |
| Tablet (768px x 11 pages) | 11 | 11 | 0 | PASS |
| Desktop (1280px x 12 pages) | 12 | 12 | 0 | PASS |
| Mobile Functional | 10 | 10 | 0 | PASS |
| Desktop Functional | 8 | 8 | 0 | PASS |
| API Endpoints | 6 | 6 | 0 | PASS |
| CSS/Visual Regression | 10 | 10 | 0 | PASS |
| **TOTAL** | **90** | **90** | **0** | **ALL PASS** |

---

## Bugs Found & Fixed

### BUG-001: Mobile nav labels too small (8.8px)
- **Severity:** Medium
- **Found in:** Visual regression test — text readability
- **Description:** Bottom nav labels rendered at 0.55rem (8.8px) at 480px and 0.48rem (7.68px) at 375px, below the 9px minimum for readability
- **Root cause:** Over-aggressive size reduction in responsive breakpoints
- **Fix:** Changed to 0.625rem (10px) at 480px and 0.5625rem (9px) at 375px
- **Status:** FIXED & VERIFIED

### BUG-002: 6 broken city images (Unsplash 404s)
- **Severity:** High
- **Found in:** Visual test — image loading
- **Description:** City images for Hyderabad, Pune, Ahmedabad, Coimbatore, Vizag, and Mysuru returned HTTP 404 from Unsplash
- **Root cause:** Invalid/removed Unsplash photo IDs
- **Fix:** Replaced all 6 broken URLs with verified working Unsplash image IDs. Added `onError` fallback handler on city images to show placeholder if image fails to load.
- **Status:** FIXED & VERIFIED

### BUG-003: Header backdrop not clickable (menu can't close)
- **Severity:** High
- **Found in:** Mobile functional test — hamburger menu close
- **Description:** The mobile menu nav panel (z-index 150) intercepted clicks on the backdrop (z-index 140), preventing users from tapping outside to close the menu
- **Root cause:** Nav panel covered 75% of viewport with higher z-index than backdrop; both used same stacking context
- **Fix:** Changed nav to `width: 72%; max-width: 300px; z-index: 200` and backdrop to `z-index: 199`. Now the backdrop is between the nav and other content, clickable in the exposed area.
- **Status:** FIXED & VERIFIED

### BUG-004: Horizontal overflow at 768px on home page
- **Severity:** Medium
- **Found in:** Overflow test at tablet viewport
- **Description:** `document.documentElement.scrollWidth` (922px) exceeded viewport (768px) causing horizontal scroll
- **Root cause:** `html` element didn't have `overflow-x: hidden`, allowing content bleed
- **Fix:** Added `html { overflow-x: hidden; }` to base styles
- **Status:** FIXED & VERIFIED

---

## Test Coverage Details

### Pages Tested
- `/` (Home)
- `/search` (Search/Browse Cars)
- `/splus` (S-Plus Premium)
- `/splus-new` (S-Plus New Cars)
- `/sell` (Sell Your Car — new)
- `/car/1` (Car Detail)
- `/about` (About Us)
- `/how-it-works` (How It Works)
- `/faq` (FAQs)
- `/contact` (Contact)
- `/wishlist` (Wishlist)
- `/admin` (Admin Dashboard — desktop only)

### Viewports Tested
- 375px (iPhone SE)
- 390px (iPhone 14)
- 412px (Pixel 5)
- 768px (iPad Mini)
- 1280px (Desktop)

### Functional Tests Passed
- Hamburger menu: opens, shows 8 links, backdrop closes menu
- City select dropdown: opens, shows 20 cities with car counts
- Search filter drawer: FAB visible, drawer opens full-screen, close button works
- Sort pills: interactive, active state changes on click
- S-Plus filter panel: toggle works, X close button works
- S-Plus New filter panel: toggle works, X close button works
- Sell car form: 4-step wizard navigates correctly
- Car detail gallery: touch swipe changes images
- Bottom nav: 6 colorful icons, navigation works
- Footer accordion: collapsible on mobile

### API Tests Passed
- GET /api/listings (200, returns array)
- GET /api/listings/1 (200, returns object with all fields)
- GET /api/categories (200, returns array)
- GET /api/listings?brand=Hyundai (200, filtered results)
- POST + DELETE /api/listings (201 create, 204 delete)
- GET /api/listings/99999 (404)
