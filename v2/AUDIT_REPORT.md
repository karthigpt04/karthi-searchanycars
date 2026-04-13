# SearchAnyCars v2 — Comprehensive System Audit Report

**Date**: April 10, 2026
**Auditor**: Senior Software Developer & System Analyst
**Codebase**: `/home/tw10520/searchanycars/v2` (branch: `v2-rebuild`)
**Stack**: pnpm monorepo · Turborepo · Fastify 5 · Next.js 15 · Drizzle ORM · PostgreSQL · Zod · Tailwind CSS v4

---

## Overall Ratings

| Dimension | Score | Grade |
|---|---|---|
| **Architecture & Structure** | 8.5/10 | A- |
| **Security** | 6.0/10 | C+ |
| **Code Quality & Patterns** | 7.5/10 | B+ |
| **Performance & Scalability** | 5.5/10 | C |
| **SEO & Frontend UX** | 8.0/10 | A- |
| **Data Model & Business Logic** | 6.5/10 | B- |
| **Testing** | 7.0/10 | B |
| **DevOps & Deployment Readiness** | 3.0/10 | D |
| **OVERALL** | **6.5/10** | **B-** |

**Verdict**: Solid MVP foundation with strong architecture, but **not production-ready** without addressing critical security flaws, performance bottlenecks, and data integrity gaps.

---

## Table of Contents

1. [Architecture & Structure](#1-architecture--structure)
2. [Security](#2-security)
3. [Code Quality & Patterns](#3-code-quality--patterns)
4. [Performance & Scalability](#4-performance--scalability)
5. [SEO & Frontend UX](#5-seo--frontend-ux)
6. [Data Model & Business Logic](#6-data-model--business-logic)
7. [Testing](#7-testing)
8. [DevOps & Deployment Readiness](#8-devops--deployment-readiness)
9. [Priority Action Plan](#9-priority-action-plan)
10. [Conclusion](#10-conclusion)

---

## 1. Architecture & Structure

**Score: 8.5/10 — A-**

### Strengths

- **Well-organized monorepo**: pnpm workspaces + Turborepo with 5 packages (`apps/api`, `apps/web`, `packages/db`, `packages/shared`, `packages/ui`)
- **Clean separation of concerns**: Shared Zod schemas validate on both API and client; shared DB package prevents schema drift
- **Modern stack choices**: Fastify 5 (high-perf), Next.js 15 App Router (SSR/SSG), Drizzle ORM (type-safe), React 19
- **TypeScript strict mode** across all packages with composite builds
- **Workspace dependency graph** is clean:
  ```
  apps/api  → packages/db, packages/shared
  apps/web  → (standalone)
  packages/db → drizzle-orm, postgres
  packages/shared → zod
  ```

### Weaknesses

- `packages/ui` is an empty stub — dead weight in the dependency graph
- No shared ESLint config across monorepo
- API and Web tsconfig diverge (Web doesn't extend `tsconfig.base.json`)
- No shared type exports between API responses and Web consumption

### Workspace Breakdown

| Package | Purpose | LOC | Dependencies |
|---|---|---|---|
| `apps/api` | Fastify REST API | ~5,543 | fastify, drizzle-orm, bcryptjs, jsonwebtoken, sharp, nodemailer |
| `apps/web` | Next.js frontend | ~3,755 | next 15, react 19, tailwindcss 4 |
| `packages/db` | Drizzle schema + client | ~1,638 | drizzle-orm, postgres |
| `packages/shared` | Zod validation schemas | ~1,245 | zod |
| `packages/ui` | Shared components (stub) | ~0 | react |

---

## 2. Security

**Score: 6.0/10 — C+**

### CRITICAL Issues (Fix Before Any Production Deployment)

#### 2.1 — Database credentials exposed in `.env`

Real Neon PostgreSQL credentials are committed to the repository. The connection string with username and password is visible in git history.

**Risk**: Complete database compromise if repo is accessed by unauthorized parties.
**Fix**: Rotate password immediately. Use a secrets manager (AWS Secrets Manager, Vault, etc.). Ensure `.env` is in `.gitignore`.

#### 2.2 — Weak HTML sanitization (XSS vulnerability)

`stripHtml()` in `routes/listings.ts:12` and `routes/bookings.ts:9` uses regex:
```typescript
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}
```

This is trivially bypassable:
```
<img src=x onerror=alert(1)>  →  "alert(1)" executes
<svg/onload=alert(1)>         →  "alert(1)" executes
```

**Fix**: Replace with DOMPurify or `html-escaper` library. Extract to shared utility to eliminate the duplication.

#### 2.3 — JWT secrets use placeholder values

```
JWT_ACCESS_SECRET=dev-access-secret-change-in-prod
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-prod
COOKIE_SECRET=dev-cookie-secret-change-in-prod
```

**Risk**: If deployed as-is, all JWTs can be forged by anyone.
**Fix**: Generate cryptographic secrets: `openssl rand -hex 32`

#### 2.4 — Password minimum is 6 characters

`packages/shared/src/schemas/user.ts` sets `password: z.string().min(6)`.

**Fix**: Increase to minimum 8-12 characters. Consider complexity requirements.

### HIGH Issues

| Issue | Location | Risk |
|---|---|---|
| No session invalidation on password change | `routes/auth.ts:317` | Compromised sessions persist after password change |
| Email enumeration via 409 on register | `routes/auth.ts:54` | Attacker can discover valid emails |
| No audit logging for admin operations | All admin routes | Cannot detect or investigate attacks |
| CORS silently defaults to localhost:3000 in prod | `config.ts:18` | Fails open if CORS_ORIGIN env not set |
| No account lockout after failed logins | Auth routes | Brute force possible within rate limits |
| No secret rotation mechanism | Auth service | Can't rotate JWT secrets without invalidating all tokens |

### MEDIUM Issues

| Issue | Location | Risk |
|---|---|---|
| CSRF uses constant value (`"1"`) not per-session token | `plugins/csrf.ts` | Weaker CSRF protection |
| 7-day refresh token expiry | `authService.ts:31` | Long window if token stolen |
| File upload accepts any extension | `uploadService.ts` | Potential for malicious file types |
| No rate limiting per user on password reset | Auth routes | Spam attacks possible |
| SameSite=Lax instead of Strict on auth cookies | `authService.ts:107` | Marginal CSRF exposure |

### Positive Security Patterns

- bcrypt with 12 salt rounds + timing-attack mitigation (DUMMY_HASH for non-existent users)
- JWT access (15m) + refresh (7d) with httpOnly secure cookies
- Token rotation with 10s grace period for concurrent requests
- CSRF protection via custom `x-csrf-protection` header requirement on mutations
- Helmet.js with HSTS (2-year max-age, preload), CSP, frame denial, X-Content-Type-Options
- Per-route rate limiting (5 req/min strict on auth, 3/min on forgot-password)
- Password reset tokens stored as SHA-256 hashes (not plaintext)
- Production error responses hide stack traces and internal details

---

## 3. Code Quality & Patterns

**Score: 7.5/10 — B+**

### Strengths

- **TypeScript strict mode** everywhere; `any` types limited to test mocking
- **Centralized error handling**: `AppError` class with HTTP status codes + global Fastify error handler
- **Consistent RESTful API design** with proper HTTP verbs and status codes
- **Zod validation** on every endpoint — type-safe request parsing
- **Clean service layer**: Auth, session, email, upload services separate from route handlers
- **Good async patterns**: Token refresh deduplication prevents thundering herd on frontend

### Issues

| Problem | Severity | Location |
|---|---|---|
| DRY violation: `stripHtml()` duplicated in 2 files | Medium | `listings.ts:12`, `bookings.ts:9` |
| No frontend response validation — API responses cast with `as` | Medium | `api.ts`, `AuthContext.tsx` |
| Silent error swallowing in AuthContext | Medium | `AuthContext.tsx:52-58` — `catch {}` with no logging |
| Type definitions scattered — `ListingPayload` inline in component | Low | `AdminCarForm.tsx:11-22` |
| No ESLint on API (only `tsc --noEmit`) | Low | `apps/api/package.json` |
| No Prettier config, no pre-commit hooks | Low | Root directory |
| ESLint disables `@next/next/no-img-element` | Low | `eslint.config.mjs` |
| Background email with `.catch(() => {})` hides delivery failures | Low | Auth routes |

### Error Handling Assessment

```
API Layer:     [==========] Excellent — centralized, production-safe
Service Layer: [========--] Good — timing-attack safe, proper error wrapping
Frontend API:  [=======---] Good — 401 retry, but silent catches
UI Components: [=====-----] Fair — no error boundaries, minimal error states
```

---

## 4. Performance & Scalability

**Score: 5.5/10 — C**

### CRITICAL Performance Issues

#### 4.1 — Massive API payload sizes

`GET /api/v1/listings` returns ALL 63 columns including 6 JSONB image arrays per listing. Each image array can be 5-50KB.

```
100 listings × 6 image arrays × 10-50KB = 3-30MB per request
```

The frontend only needs ~10 fields for card display (title, brand, price, first image, location, fuel, transmission).

**Fix**: Create a `listingSummary` select that returns only card-display fields. Use full select only for detail pages.

#### 4.2 — Client-side filtering instead of server-side

`SearchClient.tsx:95-142` fetches 100 listings then filters by fuel/transmission/body type in JavaScript. Only 12 are displayed initially. ~88 items are fetched and discarded.

**Fix**: Send fuel, transmission, and body type as query params. The DB already has indexes on these columns.

#### 4.3 — No HTTP compression

No `@fastify/compress` registered in `app.ts`. All JSON payloads sent uncompressed.

**Fix**: One-line addition: `await app.register(import('@fastify/compress'))`. Estimated 60-70% payload reduction.

#### 4.4 — No image optimization

All car images use raw `<img>` tags instead of Next.js `<Image>`. No automatic WebP conversion, no responsive sizing, no priority hints for LCP images.

**Fix**: Replace `<img>` with `next/image` in CarCard, CarDetailClient, and admin components.

#### 4.5 — 7,975-line monolithic CSS

`globals.css` is a single file loaded on every page. Includes all component styles (car-card, buttons, filters, modals, admin, etc.). Estimated 40-60KB gzipped. Not code-split.

### Scalability Blockers

| Blocker | Impact | Fix |
|---|---|---|
| File uploads stored on local disk (`./uploads/`) | Can't scale to multiple servers | Use S3/GCS with CDN |
| Rate limiting in-memory (default `@fastify/rate-limit`) | Each instance has independent counters | Use Redis store |
| No DB connection pooling configured | Will exhaust PostgreSQL `max_connections` (100) | Add `{ max: 20 }` to postgres client |
| No cache headers on static API data | Categories, filters, site-config hit DB on every page load | Add `Cache-Control` headers |
| Offset-based pagination | Degrades on large datasets (page 100 scans 2000 rows) | Consider cursor-based |
| Full-text search reconstructs tsvector per query | Doesn't leverage pre-computed GIN index efficiently | Use stored generated column |

### Missing Infrastructure

- No Redis (needed for rate limiting, caching, session store)
- No CDN for static assets and images
- No background job queue (email, image processing, cleanup)
- No APM/monitoring (no request timing, no error tracking)

---

## 5. SEO & Frontend UX

**Score: 8.0/10 — A-**

### SEO Implementation (Excellent)

| Feature | Status | Notes |
|---|---|---|
| Dynamic metadata on all pages | Done | Next.js Metadata API |
| JSON-LD: Organization | Done | Homepage |
| JSON-LD: WebSite + SearchAction | Done | Homepage |
| JSON-LD: Vehicle | Done | Car detail pages |
| JSON-LD: BreadcrumbList | Done | Car detail pages |
| JSON-LD: FAQPage | Done | FAQ page |
| `sitemap.ts` | Done | Static + dynamic listings + brand/city pages |
| `robots.ts` | Done | Blocks admin, auth, API routes |
| Canonical URLs | Done | All public pages |
| OG/Twitter cards | Done | Dynamic images on car detail |
| `noindex` on private pages | Done | Login, wishlist, bookings, password pages |
| Favicon + Apple icon | Done | Dynamic navy "S" icon |
| `metadataBase` in root layout | Done | `https://searchanycars.com` |

### Frontend Architecture (Strong)

- Clean server/client component split (`*Client.tsx` pattern)
- Context-based state management: `AuthContext`, `WishlistContext`, `SiteConfigContext`
- Responsive design with mobile nav drawer
- Comprehensive form handling with validation and error states
- Configurable site content via `SiteConfigContext` (hero, trust bar, cities, reviews, etc.)

### User Flows Coverage

| Flow | Status | Quality |
|---|---|---|
| Search with filters | Complete | 14 filter types, debounced API calls |
| Car detail view | Complete | Gallery, specs, EMI calculator, similar cars |
| Auth (login/register/reset) | Complete | Tab-based, error handling |
| Test drive booking | Complete | Modal form with validation |
| Wishlist management | Complete | Local + server sync |
| Admin dashboard | Complete | Inventory, bookings, settings |

### Frontend Issues

| Issue | Severity |
|---|---|
| No `next/image` — raw `<img>` tags everywhere | High |
| No skip-to-main-content link | Medium |
| No visible focus rings in CSS | Medium |
| No React error boundary wrapping contexts | Medium |
| `CarCard` not memoized (100 cards re-render on filter change) | Medium |
| No lazy loading of admin routes | Low |
| Some emoji content lacks ARIA labels | Low |

### Accessibility Assessment

```
Semantic HTML:     [========--] Good — header, main, nav, footer, section, article
ARIA Labels:       [=======---] Good — search inputs, buttons, wishlist
Form Labels:       [========--] Good — 65 label elements found
Keyboard Nav:      [=====-----] Fair — buttons typed, no visible focus rings
Color Contrast:    [========--] Good — navy on white meets WCAG AA
Screen Reader:     [======----] Fair — missing skip link, some emoji without labels
```

---

## 6. Data Model & Business Logic

**Score: 6.5/10 — B-**

### Schema Overview (10 tables)

| Table | Purpose | Rows Est. | Key Indexes |
|---|---|---|---|
| `categories` | Vehicle types | ~10 | name (unique), slug (unique) |
| `filter_definitions` | Available filters | ~20 | key (unique) |
| `category_filter_map` | M:M junction | ~50 | Composite PK |
| `listings` | Car inventory (63 cols) | ~5,000+ | 13 indexes incl. GIN full-text |
| `users` | User accounts | ~1,000+ | email (unique), phone (unique) |
| `sessions` | Refresh tokens | Growing | user_id, expires_at |
| `password_reset_tokens` | One-time tokens | Growing | user_id, token (unique) |
| `user_favorites` | Wishlist M:M | Growing | (userId, listingId) unique |
| `test_drive_bookings` | Bookings | Growing | (userId, createdAt), listing_id |
| `site_config` | KV config store | ~20 | key (PK) |

### Schema Strengths
- Well-normalized relational design
- 63-column listing entity covers comprehensive vehicle data
- GIN full-text search index on title + brand + model + city
- Proper foreign keys with cascade behavior
- Composite keys on junction tables
- Unique constraints preventing duplicates (email, phone, listing code)

### Critical Business Logic Flaws

#### 6.1 — Duplicate bookings possible

No `UNIQUE(userId, listingId)` constraint or application-level dedup on `testDriveBookings`. A user can book the same car dozens of times by clicking rapidly.

**Fix**: Add unique constraint or application-level check-before-insert in a transaction.

#### 6.2 — Metrics never updated (viewsCount, favoritesCount, leadCount)

These fields exist on listings with default `0` but **no code anywhere increments them**. They are completely non-functional decorative fields.

**Fix**: Increment `viewsCount` on `GET /listings/:id`, sync `favoritesCount` when favorites change, define what triggers `leadCount`.

#### 6.3 — Hard delete on listings cascades to bookings

```sql
testDriveBookings.listingId → listings.id ON DELETE CASCADE
```

Deleting a listing destroys all associated booking records — the audit trail is lost.

**Fix**: Change to `SET NULL` on delete, or implement soft delete for listings.

#### 6.4 — No expired session cleanup

`cleanExpiredSessions()` function exists in `sessionService.ts` but is **never called**. The sessions table will grow indefinitely.

**Fix**: Call on refresh, or set up a periodic cleanup job.

#### 6.5 — No CHECK constraints on status fields

`listingStatus` and booking `status` are `VARCHAR(20)` with no database-level validation. Invalid status values can bypass the application layer entirely.

**Fix**: Add `CHECK (listing_status IN ('Active', 'Inactive', ...))` constraints.

### Data Integrity Issues

| Issue | Severity |
|---|---|
| Listing cascade deletes bookings (audit trail loss) | Critical |
| No duplicate booking prevention | Critical |
| Metrics fields never updated | High |
| No CHECK constraints on status columns | Medium |
| Phone/email nullable on users (ambiguous for auth) | Medium |
| No price validation at DB level (negatives possible) | Medium |
| JSONB image arrays have no schema validation | Low |
| Admin bookings endpoint has no pagination | Medium |

### Foreign Key Cascade Risk Assessment

| Relationship | Cascade | Risk |
|---|---|---|
| `sessions` → `users` | DELETE | Expected (user deletion invalidates sessions) |
| `password_reset_tokens` → `users` | DELETE | Expected |
| `user_favorites` → `users` | DELETE | Acceptable |
| `user_favorites` → `listings` | DELETE | Acceptable |
| `test_drive_bookings` → `users` | DELETE | **Risky** — loses booking history |
| `test_drive_bookings` → `listings` | DELETE | **Risky** — loses booking history |
| `listings` → `categories` | SET NULL | Safe |
| `category_filter_map` → both | DELETE | Acceptable |

### Missing Domain Features

- No email verification flow (emailVerified always true)
- No booking capacity/availability checking
- No admin notifications on new bookings
- No booking reminders or cancellation policies
- No "logout all devices" endpoint
- No soft delete for any entity
- No listing draft/scheduled publish states
- No saved searches or search alerts
- No dealer/seller management

---

## 7. Testing

**Score: 7.0/10 — B**

### Test Framework
- **Unit/Integration**: Vitest v4.1.2
- **E2E**: Playwright v1.59.1

### Coverage Map

| Area | Files | LOC | Quality |
|---|---|---|---|
| API auth service | 1 | 336 | Excellent — timing attacks, edge cases, cookies |
| API config | 1 | ~100 | Good — env validation |
| API errors | 1 | 228 | Good — all error types |
| API upload service | 1 | ~150 | Good — file validation |
| API integration (routes) | 1 | ~400 | Moderate — mocks DB entirely |
| API integration (rate limit) | 1 | ~200 | Good — tier testing |
| Web API client | 1 | 522 | Strong — 401 retry, CSRF, errors |
| Web format utils | 1 | 325 | Excellent — boundary conditions |
| DB schema | 1 | 767 | Thorough — all tables, relations |
| Shared Zod schemas | 1 | 993 | Comprehensive — validation rules |
| E2E (admin, public, user, SEO) | 4 | ~800 | Present but fragile |

### Strengths
- Auth service tests cover timing-attack mitigation, unicode passwords, token rotation
- Format utility tests cover boundary conditions (lakhs/crores formatting, NaN, Infinity)
- API client tests verify refresh deduplication and CSRF header injection
- Schema tests validate all 10 tables and their relationships

### Gaps

| Gap | Impact |
|---|---|
| **Zero React component tests** | High — AdminCarForm, SearchClient, CarCard untested |
| **Integration tests mock entire DB** | Medium — constraint violations, transactions untested |
| **No code coverage reporting** | Medium — can't track coverage trends |
| **E2E tests use serial execution with shared state** | Medium — fragile, order-dependent |
| **No load/stress testing** | Medium — performance regressions undetected |
| **No API contract/snapshot tests** | Low — response format changes undetected |

---

## 8. DevOps & Deployment Readiness

**Score: 3.0/10 — D**

| Requirement | Status |
|---|---|
| Dockerfile | Missing |
| docker-compose | Missing |
| CI/CD pipeline (GitHub Actions, etc.) | Missing |
| Environment validation (fail on missing vars) | Missing |
| Health check endpoint | Present (`GET /api/health`) |
| Secret management | Plaintext `.env` files |
| Monitoring / APM | Missing |
| Log aggregation | Missing |
| Backup strategy | Missing |
| SSL/TLS for database connection | Not configured |
| CDN for static assets | Missing |
| Staging environment | Missing |
| Blue/green or canary deployment | Missing |
| Dependency vulnerability scanning | Missing |

### What Exists
- Turborepo build orchestration (`turbo.json`)
- Build scripts: `pnpm build` builds all packages
- Dev scripts: `pnpm dev` starts all services
- Health endpoint: `GET /api/health → { ok: true, service: "searchanycars-api" }`

### What's Needed for Production
1. Multi-stage Dockerfile for API (node:20-slim, build then copy dist)
2. Multi-stage Dockerfile for Web (nextjs standalone output)
3. docker-compose for local dev (app + postgres + redis)
4. GitHub Actions: lint → test → build → deploy
5. Environment validation at startup (crash if required vars missing)
6. Structured JSON logging (currently uses Pino with pino-pretty in dev)
7. Error tracking (Sentry or similar)
8. Database migration CI step

---

## 9. Priority Action Plan

### Week 1 — Critical (Must-Fix Before Any Deployment)

| # | Task | Effort | Impact |
|---|---|---|---|
| 1 | Rotate database credentials, add `.env` to `.gitignore` | 30 min | Critical security |
| 2 | Replace `stripHtml()` with DOMPurify | 1 hr | XSS prevention |
| 3 | Generate cryptographic JWT/cookie secrets | 15 min | Token forgery prevention |
| 4 | Increase password minimum to 8+ chars | 15 min | Brute force resistance |
| 5 | Add session invalidation to change-password | 15 min | Session hijacking prevention |
| 6 | Fix email enumeration (generic response on register conflict) | 30 min | Information leakage |

### Week 2 — High Priority

| # | Task | Effort | Impact |
|---|---|---|---|
| 7 | Optimize listing query — select only needed fields for list view | 2 hr | 90% payload reduction |
| 8 | Add `@fastify/compress` | 15 min | 60-70% response size reduction |
| 9 | Add DB connection pooling (`{ max: 20 }`) | 15 min | Connection exhaustion prevention |
| 10 | Add duplicate booking prevention (unique constraint) | 1 hr | Data integrity |
| 11 | Implement expired session cleanup | 1 hr | DB growth prevention |
| 12 | Add audit logging for admin operations | 3 hr | Security monitoring |
| 13 | Move fuel/transmission/body filtering to server-side | 2 hr | Bandwidth + UX improvement |

### Week 3 — Medium Priority

| # | Task | Effort | Impact |
|---|---|---|---|
| 14 | Replace `<img>` with `next/image` across all components | 3 hr | Core Web Vitals improvement |
| 15 | Add `Cache-Control` headers for categories/filters/site-config | 1 hr | Reduced DB load |
| 16 | Add CHECK constraints on status columns | 1 hr | Data integrity |
| 17 | Change booking FKs to `SET NULL` on listing delete | 1 hr | Audit trail preservation |
| 18 | Set up ESLint + Prettier + pre-commit hooks | 2 hr | Code quality enforcement |
| 19 | Add React error boundary component | 1 hr | Graceful failure handling |
| 20 | Add skip-to-content link + focus ring CSS | 30 min | Accessibility |

### Month 1 — Production Readiness

| # | Task | Effort | Impact |
|---|---|---|---|
| 21 | Dockerize both apps (multi-stage builds) | 4 hr | Deployment enablement |
| 22 | Set up CI/CD pipeline (GitHub Actions) | 4 hr | Automated quality gates |
| 23 | Implement Redis for rate limiting + caching | 4 hr | Horizontal scaling |
| 24 | Move file uploads to S3/GCS with CDN | 4 hr | Scalable storage |
| 25 | Add React component tests (CarCard, SearchClient, AdminCarForm) | 6 hr | Frontend regression prevention |
| 26 | Add code coverage reporting | 1 hr | Coverage visibility |
| 27 | Implement metrics increment (viewsCount, favoritesCount) | 2 hr | Working analytics |
| 28 | Add environment validation at startup | 1 hr | Fail-fast on misconfiguration |
| 29 | Set up error tracking (Sentry) | 2 hr | Production debugging |
| 30 | Add structured logging with request IDs | 2 hr | Observability |

---

## 10. Conclusion

SearchAnyCars v2 has a **strong architectural foundation**. The monorepo structure with shared validation schemas, type-safe ORM, and modern framework choices (Fastify 5, Next.js 15, React 19, Drizzle) are all excellent decisions. The SEO implementation is thorough — JSON-LD structured data, dynamic sitemaps, and proper meta tags are all in place. The frontend UX flows are well-designed with comprehensive search filtering, booking modals, and admin tools.

However, the system has **serious gaps in three areas** that make it unsuitable for production deployment:

1. **Security**: XSS vulnerability via regex sanitization, exposed database credentials, placeholder JWT secrets, and no session invalidation on password change. These are straightforward fixes but non-negotiable before going live.

2. **Performance**: 3-30MB API payloads from returning all 63 columns on list queries, client-side filtering of 100 items to show 12, no HTTP compression, and no image optimization. Under real traffic, this will create poor user experience and high infrastructure costs.

3. **Data Integrity**: Duplicate bookings possible, metrics fields non-functional, hard deletes destroying audit trails, and no expired session cleanup. These erode trust in the data over time.

**The good news**: The architecture doesn't need rethinking — it needs hardening. Most critical fixes are under 2 hours of work. The 30-item action plan above, executed over 4 weeks, would bring this system to production-grade quality.

---

*Report generated on April 10, 2026. Findings based on static code analysis of the `v2-rebuild` branch.*
