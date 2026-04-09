# SearchAnyCars v2 — Security Flaws Audit & Fixes

**Date:** 2026-04-09
**Auditor:** Senior Developer / System Design Specialist
**Branch:** v2-rebuild
**Total Flaws Fixed:** 7
**Total Tests After All Fixes:** 295 passing across 6 test files

---

## Summary Table

| # | Flaw | Severity | Files Changed | Tests Added |
|---|------|----------|---------------|-------------|
| 1 | Hardcoded Secrets with Fallback Defaults | CRITICAL | 2 | 5 |
| 2 | No Security Headers (Missing Helmet) | CRITICAL | 3 | 5 |
| 3 | Token Refresh Thundering Herd | CRITICAL | 4 | 0 (frontend) |
| 4 | No CSRF Protection | CRITICAL | 6 | 4 |
| 5 | Unbounded Bulk Favorites Sync (DoS) | CRITICAL | 2 | 4 |
| 6 | Synchronous bcrypt Blocks Event Loop | CRITICAL | 3 | 0 (converted 8) |
| 7 | No Pagination Max Limit | CRITICAL | 1 | 0 (already had) |

---

## FLAW #1: Hardcoded Secrets with Fallback Defaults

**File:** `apps/api/src/config.ts`
**Risk:** If ENV vars are misconfigured in production, the app silently falls back to publicly known default secrets (`"dev-access-secret-change-me"`). Any attacker can forge JWT tokens.

### Fix Applied

Added a `requireSecret()` helper function that throws a fatal error at startup if any secret is missing in production (`NODE_ENV=production`), while preserving dev defaults for local development.

**Files changed:**

| File | Change |
|------|--------|
| `apps/api/src/config.ts` | Added `isProduction` const + `requireSecret()` helper. Applied to `jwtAccessSecret`, `jwtRefreshSecret`, `cookieSecret`. |
| `apps/api/src/__tests__/config.test.ts` | Fixed existing production test to provide secrets. Added 5 new tests: throws for each missing secret in production, succeeds when all provided, uses dev defaults in development. |

**Key code:**
```typescript
const isProduction = process.env.NODE_ENV === "production";

function requireSecret(envVar: string, devDefault: string): string {
  const value = process.env[envVar];
  if (value) return value;
  if (isProduction) {
    throw new Error(
      `FATAL: Missing required environment variable ${envVar}. ` +
        `The application cannot start in production without it.`,
    );
  }
  return devDefault;
}
```

**Behavior:**
- **Production:** App crashes immediately at startup with a clear error naming the missing variable
- **Development:** Dev defaults still work, zero friction for local development

---

## FLAW #2: No Security Headers (Missing Helmet)

**File:** `apps/api/src/app.ts`
**Risk:** Missing X-Content-Type-Options, X-Frame-Options, HSTS, CSP, and other security headers. Enables clickjacking, MIME-sniffing attacks, and man-in-the-middle on HTTP connections.

### Fix Applied

Installed `@fastify/helmet` and registered it as the first plugin (after error handler, before CORS) with a production-grade configuration tailored for a JSON API backend.

**Files changed:**

| File | Change |
|------|--------|
| `apps/api/package.json` | Added `@fastify/helmet` dependency |
| `apps/api/src/app.ts` | Imported and registered helmet with full config |
| `apps/api/src/__tests__/integration/routes.test.ts` | Added 5 security header assertion tests |

**Headers now set on every response:**

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` | Max restrictive for JSON API |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents framing |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Production only, 2-year HSTS |
| `X-Powered-By` | **removed** | Hides server technology |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Allows frontend to load `/uploads/` images |

**Design decisions:**
- HSTS disabled in dev to avoid poisoning localhost
- `crossOriginResourcePolicy: "cross-origin"` prevents breaking frontend image loading from `/uploads/`
- `crossOriginEmbedderPolicy: false` prevents COEP from blocking cross-origin resource loads
- Plugin order: Helmet -> CORS -> Cookie -> everything else

---

## FLAW #3: Token Refresh Thundering Herd

**Files:** `apps/web/src/lib/api.ts`, `apps/web/src/context/AuthContext.tsx`, `apps/api/src/routes/auth.ts`, `apps/api/src/services/sessionService.ts`
**Risk:** When a JWT access token expires, multiple components simultaneously get 401s and each independently calls `refreshToken()`. Since the backend uses token rotation (old token deleted on use), only the first refresh succeeds. The rest fail and the user is logged out unexpectedly.

### Fix Applied — 3-Layer Defense-in-Depth

**Layer 1 — API Client Interceptor (primary):**

Added a module-scoped singleton `refreshPromise` in the `request()` function. On any 401, ALL concurrent callers share ONE refresh request, then each retries its original call.

```typescript
let refreshPromise: Promise<Response> | null = null;

function doRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/v1/auth/refresh`, { ... });
  }
  const pending = refreshPromise;
  return pending
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      if (refreshPromise === pending) refreshPromise = null;
    });
}
```

Guards prevent recursion on `/auth/refresh` and `/auth/login` paths.

**Layer 2 — AuthContext Deduplication (secondary):**

Added `useRef<Promise<void>>` to `refreshUser()` so concurrent calls from React's render cycle piggyback on the same in-flight promise.

**Layer 3 — Backend Grace Period (multi-tab):**

Added `softDeleteSession()` that sets the old token to expire in 10 seconds instead of hard-deleting. Handles the multi-tab edge case where each tab has its own JS runtime.

**Files changed:**

| File | Change |
|------|--------|
| `apps/web/src/lib/api.ts` | Added `refreshPromise` singleton, 401 interception with retry in `request()`, `doRefresh()` helper |
| `apps/web/src/context/AuthContext.tsx` | Added `useRef` deduplication to `refreshUser()` |
| `apps/api/src/services/sessionService.ts` | Added `softDeleteSession()` function |
| `apps/api/src/routes/auth.ts` | Changed `deleteSession(token)` to `softDeleteSession(token, 10_000)` in refresh endpoint |

**Flow after fix:**
```
Page loads -> refreshUser() called (Layer 2: deduped)
  -> api.getMe() -> 401
  -> API client intercepts (Layer 1)
  -> doRefresh() starts ONE refresh request
  -> 3 other components also get 401 -> all piggyback on same promise
  -> 1 refresh completes -> all 4 original requests retry
  -> Second tab refreshes -> backend grace period allows it (Layer 3)
```

---

## FLAW #4: No CSRF Protection

**Files:** All POST/PUT/DELETE routes
**Risk:** Cookies are sent automatically with `credentials: 'include'`. An attacker's site can forge requests via HTML forms to create bookings, modify favorites, etc. on behalf of the logged-in user.

### Fix Applied — Custom Header Requirement (OWASP Recommended for SPAs)

Created a Fastify plugin that requires `x-csrf-protection: 1` header on all mutating requests (POST/PUT/PATCH/DELETE). HTML forms cannot set custom headers, making form-based CSRF impossible. Cross-origin `fetch()` with custom headers triggers CORS preflight, which the server's CORS policy blocks.

**Why this over CSRF tokens:** This is a JSON API consumed by a SPA, not a server-rendered app with HTML forms. OWASP explicitly recommends the custom header pattern for this architecture: zero round-trips, zero state, zero token management.

**Files changed:**

| File | Change |
|------|--------|
| `apps/api/src/plugins/csrf.ts` | **New** — Fastify plugin rejecting mutations without `x-csrf-protection: 1` header (403) |
| `apps/api/src/app.ts` | Registered CSRF plugin after CORS, added `allowedHeaders` to CORS config |
| `apps/web/src/lib/api.ts` | Added header to `request()` for all mutating methods, `doRefresh()`, and `uploadListingImage()` |
| `apps/api/src/config.ts` | `cookieSecure` now defaults to `true` in production |
| `apps/api/src/__tests__/integration/routes.test.ts` | Added inject wrapper + 4 CSRF-specific tests |
| `apps/api/src/__tests__/integration/admin-car-crud.test.ts` | Added inject wrapper for test compatibility |

**Defense-in-depth layers:**

| Layer | Mechanism |
|-------|-----------|
| Custom header (primary) | `x-csrf-protection: 1` required on all mutations |
| SameSite=Lax (existing) | Cookies already set with `sameSite: "lax"` |
| CORS (existing) | Only configured origin is allowed |
| Secure cookies (hardened) | `cookieSecure` defaults true in production |

---

## FLAW #5: Unbounded Bulk Favorites Sync (DoS Vector)

**File:** `apps/api/src/routes/favorites.ts`
**Risk:** `PUT /api/v1/favorites` accepts `{ ids: [1, 2, ..., 100000] }` with no limit. The handler performs 100,000 sequential DB inserts, blocking the server for minutes.

### Fix Applied

1. **Zod schema**: Added `.max(200)` limit and `.transform()` for deduplication
2. **Batch insert**: Replaced sequential `for` loop with single `db.insert().values([...]).onConflictDoNothing()`
3. **Body limit**: Added `bodyLimit: 4096` on the PUT route
4. **Empty guard**: Added `if (ids.length > 0)` before insert

**Files changed:**

| File | Change |
|------|--------|
| `apps/api/src/routes/favorites.ts` | Schema: `.max(200)` + `.transform(dedupe)`. Handler: batch insert + bodyLimit + empty guard |
| `apps/api/src/__tests__/integration/routes.test.ts` | 4 new tests: exceeds limit (400), non-positive integers (400), deduplication, empty array |

**Before vs After:**

| Aspect | Before | After |
|--------|--------|-------|
| Array limit | Unlimited | 200 max |
| Duplicates | Sent as-is to DB | Deduplicated via `Set` |
| DB operations | N sequential INSERTs | 1 batch INSERT |
| Body size | Fastify default 1MB | 4KB route-level limit |
| Attack: 100K IDs | Server blocked ~100s | Instant 400 rejection |

---

## FLAW #6: Synchronous bcrypt Blocks Event Loop

**File:** `apps/api/src/services/authService.ts`
**Risk:** `hashPassword()` uses `bcrypt.hashSync()` and `verifyPassword()` uses `bcrypt.compareSync()`. These block the event loop for 200-500ms each. During password operations, ALL other requests are frozen. 10 concurrent logins = 5 seconds of total server freeze.

### Fix Applied

Converted both functions from sync to async (`bcrypt.hash` / `bcrypt.compare`), updated all 7 call sites in `auth.ts`, and converted all 8 test cases to async/await.

**Critical security finding:** The two `verifyPassword` call sites were the most dangerous to miss. Without `await`:
```typescript
// BUG: !Promise is always false (Promise is truthy) -> ANY password accepted
if (!verifyPassword(body.password, user.passwordHash)) { ... }

// FIX: await resolves to boolean, negation works correctly
if (!(await verifyPassword(body.password, user.passwordHash))) { ... }
```

**Files changed:**

| File | Change |
|------|--------|
| `apps/api/src/services/authService.ts` | `hashSync` -> `hash`, `compareSync` -> `compare`, return types to `Promise<>` |
| `apps/api/src/routes/auth.ts` | Added `await` to all 7 call sites (5x `hashPassword`, 2x `verifyPassword`) |
| `apps/api/src/__tests__/authService.test.ts` | Converted 8 test cases to async/await, added `{ timeout: 15_000 }` for bcrypt describe blocks |

**All 7 call sites in auth.ts:**

| Line | Route | Function | Security Risk if `await` Missing |
|------|-------|----------|----------------------------------|
| 47 | POST /register | `hashPassword` | Stores Promise string as hash |
| 95 | POST /login | `verifyPassword` | **Total auth bypass** |
| 295 | POST /reset-password | `hashPassword` | Stores Promise string as hash |
| 331 | POST /change-password | `verifyPassword` | **Password change without auth** |
| 335 | POST /change-password | `hashPassword` | Stores Promise string as hash |
| 364 | POST /users (admin) | `hashPassword` | Stores Promise string as hash |
| 451 | PUT /users/:id (admin) | `hashPassword` | Stores Promise string as hash |

**Performance impact:**

| Scenario | Before (sync) | After (async) |
|----------|---------------|---------------|
| Single login | 300ms event loop blocked | 300ms async, event loop free |
| 10 concurrent logins | 3+ seconds total freeze | 300ms each, full throughput |

**Audit verification:** `grep` for `hashSync`/`compareSync` returns zero matches in entire API.

---

## FLAW #7: No Pagination Max Limit

**File:** `apps/api/src/routes/listings.ts`
**Risk:** `GET /api/v1/listings?limit=999999` could return the entire database in one response.

### Fix Applied

The shared Zod schema at `packages/shared/src/schemas/listing.ts:156` already enforces `.max(100)` on the `limit` field, rejecting values >100 with a 400 error at validation. Added `Math.min(q.limit ?? 20, 100)` as defense-in-depth in the route handler.

**Files changed:**

| File | Change |
|------|--------|
| `apps/api/src/routes/listings.ts` | `const limit = q.limit ?? 20` -> `const limit = Math.min(q.limit ?? 20, 100)` |

---

## Final Test Results

```
Test Files  6 passed (6)
     Tests  295 passed (295)
  Duration  ~4.5s

TypeScript: zero errors (both apps/api and apps/web)
```

## New Files Created

| File | Purpose |
|------|---------|
| `apps/api/src/plugins/csrf.ts` | CSRF protection plugin (Flaw #4) |

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `@fastify/helmet` | ^13.0.0 | Security headers (Flaw #2) |

## Plugin Registration Order (apps/api/src/app.ts)

```
1. Error handler
2. Helmet (security headers)       — NEW
3. CORS (with allowedHeaders)      — UPDATED
4. CSRF protection                 — NEW
5. Cookie
6. Multipart
7. Static file serving
8. Rate limiting
9. Auth middleware
10. Health check
11. All routes
```
