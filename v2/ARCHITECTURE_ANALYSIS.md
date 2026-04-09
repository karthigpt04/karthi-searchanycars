# SearchAnyCars v2 — Architecture Deep Dive & Critical Analysis

> **Author:** Senior Systems Engineer Review  
> **Date:** 2026-04-09  
> **Scope:** Full-stack architecture audit of the SearchAnyCars v2 monorepo  
> **Verdict:** Functional MVP with **7 critical**, **10 high**, and **15+ medium/low** issues that must be addressed before production.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Design](#5-database-design)
6. [Frontend-Backend Connection](#6-frontend-backend-connection)
7. [Authentication Flow](#7-authentication-flow)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Critical Flaws](#9-critical-flaws)
10. [High Severity Issues](#10-high-severity-issues)
11. [Medium & Low Issues](#11-medium--low-issues)
12. [Remediation Roadmap](#12-remediation-roadmap)
13. [Summary Scorecard](#13-summary-scorecard)

---

## 1. System Overview

SearchAnyCars v2 is a **used car marketplace** built as a TypeScript monorepo. It consists of a Next.js 15 frontend, Fastify 5 REST API, and PostgreSQL database managed via Drizzle ORM.

```
                    ┌─────────────────────────────────────────────┐
                    │              INTERNET / USERS                │
                    └─────────────────┬───────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────────────┐
                    │         Next.js 15 (App Router)             │
                    │         Port 3000                           │
                    │                                             │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
                    │  │  SSR     │  │  Client   │  │  Static  │  │
                    │  │  Pages   │  │Components │  │  Assets  │  │
                    │  └────┬─────┘  └────┬──────┘  └──────────┘  │
                    │       │             │                        │
                    │       │     ┌───────┴───────┐               │
                    │       │     │  api.ts        │               │
                    │       │     │  (40+ methods) │               │
                    │       │     └───────┬────────┘               │
                    └───────┼─────────────┼───────────────────────┘
                            │             │
                            │  fetch()    │  fetch() + cookies
                            │  SSR        │  CSR (credentials:'include')
                            ▼             ▼
                    ┌─────────────────────────────────────────────┐
                    │         Fastify 5 REST API                  │
                    │         Port 4000                           │
                    │                                             │
                    │  ┌─────────────────────────────────────┐    │
                    │  │  Middleware Stack                    │    │
                    │  │  CORS → Cookie → Multipart →        │    │
                    │  │  Static → RateLimit → Auth           │    │
                    │  └──────────────┬──────────────────────┘    │
                    │                 │                            │
                    │  ┌──────┐ ┌────┴───┐ ┌────────┐ ┌───────┐  │
                    │  │ Auth │ │Listings│ │Bookings│ │Config │  │
                    │  │Routes│ │ Routes │ │ Routes │ │Routes │  │
                    │  └──┬───┘ └───┬────┘ └───┬────┘ └───┬───┘  │
                    │     │         │           │          │       │
                    │     └─────────┴─────┬─────┴──────────┘      │
                    │                     │                        │
                    └─────────────────────┼────────────────────────┘
                                          │
                                          │  Drizzle ORM
                                          ▼
                    ┌─────────────────────────────────────────────┐
                    │           PostgreSQL Database                │
                    │                                             │
                    │  10 Tables:                                 │
                    │  users, sessions, listings, categories,     │
                    │  user_favorites, test_drive_bookings,       │
                    │  password_reset_tokens, site_config,        │
                    │  filter_definitions, category_filter_map    │
                    └─────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

**Build Tool:** Turborepo v2.4.0 with pnpm workspaces

```
v2/
├── turbo.json                    # Task pipeline (build → lint → test)
├── pnpm-workspace.yaml           # Workspace: apps/*, packages/*
├── tsconfig.base.json            # Shared TS config (ES2022, strict)
├── playwright.config.ts          # E2E test config
│
├── apps/
│   ├── api/                      # Fastify REST API (37 endpoints)
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── app.ts            # Fastify setup + middleware
│   │   │   ├── config.ts         # ENV var loader
│   │   │   ├── errors.ts         # Global error handler
│   │   │   ├── routes/           # 9 route modules
│   │   │   ├── services/         # Auth, session, email, upload
│   │   │   ├── plugins/          # Auth middleware, health check
│   │   │   └── __tests__/        # 237 tests
│   │   └── package.json
│   │
│   └── web/                      # Next.js 15 frontend (25 pages)
│       ├── app/                   # App Router pages
│       │   ├── page.tsx           # Homepage
│       │   ├── search/            # Search + filters
│       │   ├── car/[id]/          # Car detail (SSR + CSR)
│       │   ├── splus/             # Premium cars
│       │   ├── admin/             # Admin dashboard
│       │   ├── login/             # Auth pages
│       │   ├── layout.tsx         # Root layout + metadata
│       │   ├── sitemap.ts         # Dynamic sitemap
│       │   └── robots.ts         # Robots.txt
│       ├── src/
│       │   ├── components/        # 12+ React components
│       │   ├── context/           # Auth, Wishlist, SiteConfig
│       │   ├── lib/api.ts         # API client (40+ methods)
│       │   └── utils/format.ts    # Formatting helpers
│       └── package.json
│
├── packages/
│   ├── db/                        # Drizzle ORM + schema
│   │   ├── src/schema.ts          # 10 table definitions
│   │   ├── src/seed.ts            # Seed data
│   │   └── drizzle/               # Migrations
│   │
│   ├── shared/                    # Zod validation schemas
│   │   └── src/schemas/           # user, listing, booking, category
│   │
│   └── ui/                        # UI primitives (minimal)
│
└── tests/
    └── e2e/                       # Playwright tests (3 suites)
```

### Package Dependency Graph

```
                ┌──────────┐
                │  shared   │  (Zod schemas)
                └─────┬────┘
                      │ imported by
            ┌─────────┼─────────┐
            ▼                   ▼
      ┌──────────┐        ┌──────────┐
      │   api    │        │   web    │
      └────┬─────┘        └──────────┘
           │ imports
           ▼
      ┌──────────┐
      │    db    │  (Drizzle schema + migrations)
      └──────────┘
```

**Key Observation:** `web` does NOT import `db` or `shared` directly. The frontend only communicates via HTTP fetch to the API. This is correct for a decoupled architecture but means **type safety is lost across the network boundary** — the frontend has no compile-time guarantee that API responses match its expectations.

---

## 3. Frontend Architecture

### Tech Stack
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 15.1.0 |
| UI Library | React | 19.0.0 |
| Styling | Tailwind CSS | 4.0.0 |
| Language | TypeScript | 5.7.0 |
| State | React Context (3 contexts) | - |
| Testing | Vitest (unit), Playwright (e2e) | - |

### Page Architecture

```
app/
├── layout.tsx ──────────────────────────── Root layout (metadata, providers)
│   └── providers.tsx ───────────────────── Wraps: AuthProvider → WishlistProvider → SiteConfigProvider
│
├── page.tsx ────────────────────────────── Homepage (SSR, JSON-LD)
├── search/page.tsx ─────────────────────── Search page (SSR shell → CSR SearchClient)
├── car/[id]/page.tsx ───────────────────── Car detail (SSR fetch → CSR CarDetailClient)
├── splus/page.tsx ──────────────────────── Premium cars (CSR SplusClient)
├── splus-new/page.tsx ──────────────────── New cars (CSR SplusNewClient)
├── sell/page.tsx ───────────────────────── Sell form (static)
├── admin/page.tsx ──────────────────────── Admin dashboard (CSR, AdminGuard)
├── login/page.tsx ──────────────────────── Login (CSR LoginClient)
├── wishlist/page.tsx ───────────────────── Wishlist (CSR, AuthGuard)
└── my-bookings/page.tsx ────────────────── Bookings (CSR, AuthGuard)
```

### State Management (3 React Contexts)

```
┌──────────────────────────────────────────────────────┐
│                     Providers Tree                     │
│                                                       │
│  <AuthProvider>          ← User auth state            │
│    ├── user: { id, email, name, role, avatarUrl }     │
│    ├── login(), register(), logout()                  │
│    ├── refreshUser() ← auto-refresh on mount          │
│    └── isAdmin: boolean                               │
│                                                       │
│    <WishlistProvider>    ← Favorite car IDs           │
│      ├── wishlistIds: number[]                        │
│      ├── toggleWishlist(id)                           │
│      ├── isWishlisted(id)                             │
│      └── Dual storage: localStorage + server sync     │
│                                                       │
│      <SiteConfigProvider> ← Dynamic site content      │
│        ├── hero text, trust bar, budget brackets      │
│        ├── cities, reviews, nav items                 │
│        └── Fetched once on mount from /site-config    │
│                                                       │
│        {children}  ← All pages rendered here          │
│                                                       │
│      </SiteConfigProvider>                            │
│    </WishlistProvider>                                │
│  </AuthProvider>                                      │
└──────────────────────────────────────────────────────┘
```

### API Client (`src/lib/api.ts`)

The frontend communicates with the backend through a single API module with 40+ methods:

```
api.ts
│
├── request(path, options)    ← Base fetch wrapper
│   ├── Prepends API_BASE URL
│   ├── Sets credentials: 'include' (cookies)
│   ├── Sets Content-Type: application/json
│   └── Throws on non-2xx response
│
├── Auth Methods
│   ├── login(email, password)
│   ├── register(email, password, name)
│   ├── logout()
│   ├── getMe()
│   ├── refreshToken()
│   ├── forgotPassword(email)
│   ├── resetPassword(token, password)
│   └── changePassword(current, new)
│
├── Listing Methods
│   ├── getListings(filters)
│   ├── getListingById(id)
│   ├── createListing(data)
│   ├── updateListing(id, data)
│   └── deleteListing(id)
│
├── Favorites
│   ├── getFavorites()
│   ├── addFavorite(id)
│   ├── removeFavorite(id)
│   └── syncFavorites(ids)
│
├── Bookings
│   ├── getBookings()
│   ├── createBooking(data)
│   └── cancelBooking(id)
│
├── Admin
│   ├── getUsers(), createUser(), deleteUser(), updateUser()
│   ├── getAdminBookings(), updateBookingStatus()
│   ├── getSiteConfigKey(), updateSiteConfig()
│   └── uploadListingImage(file)
│
└── Public
    ├── getCategories()
    ├── getSiteConfig()
    └── getFilters()
```

---

## 4. Backend Architecture

### Tech Stack
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Fastify | 5.2.0 |
| ORM | Drizzle | 0.38.0 |
| Database | PostgreSQL | - |
| Auth | JWT (jsonwebtoken) | 9.0.0 |
| Password | bcryptjs | 2.4.3 |
| Image Processing | Sharp | 0.33.0 |
| Validation | Zod | 3.24.0 |
| Email | Nodemailer | 6.9.0 |

### Middleware Pipeline

```
Incoming Request
      │
      ▼
┌──────────────┐
│    CORS      │  credentials: true, origin from CORS_ORIGIN env
└──────┬───────┘
       ▼
┌──────────────┐
│   Cookie     │  @fastify/cookie, parses access_token & refresh_token
└──────┬───────┘
       ▼
┌──────────────┐
│  Multipart   │  @fastify/multipart, 6MB file limit
└──────┬───────┘
       ▼
┌──────────────┐
│   Static     │  Serves /uploads/ directory
└──────┬───────┘
       ▼
┌──────────────┐
│ Rate Limit   │  200/min (dev), 100/min (prod) — GLOBAL only
└──────┬───────┘
       ▼
┌──────────────┐
│    Auth      │  Decodes JWT from cookie/Bearer header
│  Middleware  │  Decorates request.user (or null)
└──────┬───────┘
       ▼
┌──────────────┐
│   Routes     │  37 endpoints across 9 route modules
└──────────────┘
```

### Route Map (37 Endpoints)

```
/api/health                          GET     Public    Health check

/api/v1/auth/
  ├── register                       POST    Public    Create account
  ├── login                          POST    Public    Sign in
  ├── logout                         POST    Auth      Sign out
  ├── me                             GET     Auth      Current user
  ├── refresh                        POST    Public    Refresh tokens
  ├── forgot-password                POST    Public    Request reset
  ├── reset-password                 POST    Public    Reset password
  ├── change-password                POST    Auth      Change password
  └── users/
      ├── (list)                     GET     Admin     List all users
      ├── (create)                   POST    Admin     Create user
      ├── :id                        PUT     Admin     Update user
      └── :id                        DELETE  Admin     Delete user

/api/v1/listings/
  ├── (list)                         GET     Public    Search + filter
  ├── :id                            GET     Public    Get single
  ├── (create)                       POST    Admin     Create listing
  ├── :id                            PUT     Admin     Update listing
  └── :id                            DELETE  Admin     Delete listing

/api/v1/categories/                  GET/POST/PUT/DELETE  Admin for writes

/api/v1/filters                      GET     Public    Available filters

/api/v1/favorites/
  ├── (list)                         GET     Auth      My favorites
  ├── :listingId                     POST    Auth      Add favorite
  ├── :listingId                     DELETE  Auth      Remove favorite
  └── (sync)                         PUT     Auth      Bulk sync

/api/v1/bookings/
  ├── (list)                         GET     Auth      My bookings
  ├── (create)                       POST    Auth      Book test drive
  └── :id                            DELETE  Auth      Cancel booking

/api/v1/admin/bookings/
  ├── (list)                         GET     Admin     All bookings
  └── :id/status                     PATCH   Admin     Update status

/api/v1/site-config/
  ├── (all)                          GET     Public    All config
  ├── :key                           GET     Public    Single key
  └── :key                           PUT     Admin     Update config

/api/v1/uploads/image                POST    Admin     Upload image
```

---

## 5. Database Design

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────────┐       ┌──────────────┐
│     users         │       │      sessions         │       │ password_    │
├──────────────────┤       ├──────────────────────┤       │ reset_tokens │
│ id (PK)          │──┐    │ id (PK)              │       ├──────────────┤
│ email (UNIQUE)   │  │    │ userId (FK) ─────────│───────│ id (PK)      │
│ phone (UNIQUE)   │  │    │ refreshToken (UNIQUE)│       │ userId (FK)  │
│ name             │  │    │ expiresAt            │       │ token (UNIQUE│
│ passwordHash     │  │    │ ipAddress            │       │ expiresAt    │
│ role (enum)      │  │    │ userAgent            │       │ used         │
│ googleId         │  │    │ createdAt            │       │ createdAt    │
│ emailVerified    │  │    └──────────────────────┘       └──────────────┘
│ avatarUrl        │  │
│ createdAt        │  │         1:N                            1:N
│ updatedAt        │  │
└──────────────────┘  │
         │            │
    1:N  │            │  1:N
         │            │
         ▼            ▼
┌──────────────────┐  ┌──────────────────────────────────────────────────┐
│  user_favorites   │  │                    listings                      │
├──────────────────┤  ├──────────────────────────────────────────────────┤
│ id (PK)          │  │ id (PK)                                          │
│ userId (FK)──────│  │ categoryId (FK) ──────────────┐                  │
│ listingId (FK)───│──│ listingCode (UNIQUE)          │                  │
│ createdAt        │  │ title, brand, model, variant  │                  │
│ UNIQUE(user,list)│  │ modelYear, registrationYear   │                  │
└──────────────────┘  │ bodyStyle, colors             │                  │
                      │ listingPriceInr               │                  │
         ▲            │ ownershipType, sellerType      │                  │
         │            │ totalKmDriven, mileageKmpl    │                  │
         │            │ fuelType, transmissionType    │                  │
         │            │ inspectionScore               │                  │
         │            │ listingStatus (enum)           │                  │
         │            │ isSplus, isNewCar              │                  │
         │            │ images[] (JSONB arrays)        │                  │
         │            │ specs (JSONB)                  │                  │
         │            │ 50+ columns total              │                  │
         │            │ createdAt, updatedAt           │                  │
         │            └────────────────────────────────┼──────────────────┘
         │                                             │
         │                                             ▼
         │            ┌──────────────────┐    ┌──────────────────┐
         │            │ test_drive_      │    │   categories     │
         │            │ bookings         │    ├──────────────────┤
         │            ├──────────────────┤    │ id (PK)          │
         │            │ id (PK)          │    │ name (UNIQUE)    │
         └────────────│ userId (FK)      │    │ slug (UNIQUE)    │
                      │ listingId (FK)───│    │ vehicleType      │
                      │ carTitle         │    │ description      │
                      │ name, phone      │    │ createdAt        │
                      │ email            │    │ updatedAt        │
                      │ preferredDate    │    └──────────────────┘
                      │ preferredTime    │             │
                      │ status (enum)    │             │ 1:N
                      │ notes            │             ▼
                      │ createdAt        │    ┌──────────────────┐
                      │ updatedAt        │    │ category_filter  │
                      └──────────────────┘    │ _map             │
                                              ├──────────────────┤
┌──────────────────┐                          │ categoryId (FK)  │
│  site_config     │                          │ filterId (FK)    │
├──────────────────┤                          │ PK(cat,filter)   │
│ key (PK varchar) │                          └──────────────────┘
│ value (JSONB)    │                                   │
│ updatedAt        │                                   │ N:1
└──────────────────┘                                   ▼
                                              ┌──────────────────┐
                                              │ filter_          │
                                              │ definitions      │
                                              ├──────────────────┤
                                              │ id (PK)          │
                                              │ key (UNIQUE)     │
                                              │ label            │
                                              │ type (enum)      │
                                              │ options (JSONB)  │
                                              └──────────────────┘
```

### Indexes on `listings` table

```
Existing:
  - listings_brand_idx          → brand column
  - listings_location_city_idx  → locationCity column
  - listings_status_idx         → listingStatus column
  - listings_price_idx          → listingPriceInr column
  - listings_category_idx       → categoryId column
  - listings_featured_idx       → partial: WHERE featuredListing = true
  - listings_splus_idx          → partial: WHERE isSplus = true
  - listings_search_idx         → GIN on title || brand || model || city (full-text)

MISSING (see Section 9):
  - users.email                 → No index (queried on every login!)
  - sessions.userId             → No index (queried on every token refresh)
  - user_favorites.userId       → No index (queried on every wishlist load)
  - test_drive_bookings.userId  → No index (queried on every booking list)
```

---

## 6. Frontend-Backend Connection

### Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│                                                                 │
│  ┌──────────────┐    ┌─────────────┐    ┌────────────────────┐  │
│  │  User Action  │───▶│  Component  │───▶│  api.method()      │  │
│  │  (click,form) │    │  Handler    │    │  from src/lib/api  │  │
│  └──────────────┘    └─────────────┘    └────────┬───────────┘  │
│                                                   │              │
│                                  fetch(url, {     │              │
│                                    credentials:   │              │
│                                    'include',     │              │
│                                    headers: {     │              │
│                                      Content-Type:│              │
│                                      application/ │              │
│                                      json         │              │
│                                    },             │              │
│                                    body: JSON     │              │
│                                  })               │              │
└───────────────────────────────────┼──────────────────────────────┘
                                    │
                          HTTP + httpOnly cookies
                          (access_token, refresh_token)
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                         BACKEND (Fastify)                         │
│                                                                   │
│  ┌────────────┐    ┌────────────┐    ┌──────────┐    ┌────────┐  │
│  │ Middleware  │───▶│ Auth Check │───▶│  Route   │───▶│Drizzle │  │
│  │ (CORS,     │    │ (JWT from  │    │ Handler  │    │  ORM   │  │
│  │  cookie,   │    │  cookie or │    │ (Zod     │    │  Query │  │
│  │  rate-lim) │    │  Bearer)   │    │  valid.) │    │        │  │
│  └────────────┘    └────────────┘    └──────────┘    └───┬────┘  │
│                                                          │       │
│                                                          ▼       │
│                                                    ┌──────────┐  │
│                                                    │PostgreSQL│  │
│                                                    └──────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Two Fetch Patterns

The app uses TWO distinct fetch patterns, which is architecturally important:

```
PATTERN 1: Server-Side Rendering (SSR)
═══════════════════════════════════════
Used by: car/[id]/page.tsx, homepage

  Next.js Server ──fetch()──▶ Fastify API ──▶ PostgreSQL
       │                                         │
       │◀─── JSON response ◀────────────────────┘
       │
       └──▶ Renders HTML with data ──▶ Browser


PATTERN 2: Client-Side Rendering (CSR)
═══════════════════════════════════════
Used by: search, splus, admin, wishlist, bookings

  Browser ──fetch() + cookies──▶ Fastify API ──▶ PostgreSQL
     │                                              │
     │◀─── JSON response ◀─────────────────────────┘
     │
     └──▶ React re-renders with data


KEY PROBLEM: SSR fetches do NOT have access to user cookies.
             Car detail SSR works (public endpoint).
             But SSR for authenticated pages is impossible
             with this architecture.
```

---

## 7. Authentication Flow

### Login → Session → Token Refresh Lifecycle

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Browser  │                    │  Fastify  │                    │PostgreSQL│
└─────┬────┘                    └─────┬────┘                    └─────┬────┘
      │                               │                               │
      │  POST /auth/login             │                               │
      │  { email, password }          │                               │
      │──────────────────────────────▶│                               │
      │                               │  SELECT * FROM users          │
      │                               │  WHERE email = ?              │
      │                               │──────────────────────────────▶│
      │                               │◀──────────────────────────────│
      │                               │                               │
      │                               │  bcrypt.compareSync()         │
      │                               │  (BLOCKING! see flaw #13)     │
      │                               │                               │
      │                               │  Generate JWT access (15m)    │
      │                               │  Generate JWT refresh (7d)    │
      │                               │                               │
      │                               │  INSERT INTO sessions         │
      │                               │  { userId, refreshToken,      │
      │                               │    ipAddress, userAgent }     │
      │                               │──────────────────────────────▶│
      │                               │◀──────────────────────────────│
      │                               │                               │
      │  Set-Cookie: access_token     │                               │
      │  Set-Cookie: refresh_token    │                               │
      │  { user, accessToken }        │                               │
      │◀──────────────────────────────│                               │
      │                               │                               │
      │  ─── 15 minutes later ───     │                               │
      │                               │                               │
      │  GET /auth/me                 │                               │
      │  Cookie: access_token=expired │                               │
      │──────────────────────────────▶│                               │
      │                               │  jwt.verify() → EXPIRED       │
      │  401 Unauthorized             │                               │
      │◀──────────────────────────────│                               │
      │                               │                               │
      │  POST /auth/refresh           │                               │
      │  Cookie: refresh_token=xyz    │                               │
      │──────────────────────────────▶│                               │
      │                               │  SELECT FROM sessions         │
      │                               │  WHERE refreshToken = xyz     │
      │                               │──────────────────────────────▶│
      │                               │◀──────────────────────────────│
      │                               │                               │
      │                               │  DELETE old session            │
      │                               │  INSERT new session            │
      │                               │  (token rotation)             │
      │                               │──────────────────────────────▶│
      │                               │                               │
      │  Set-Cookie: new tokens       │                               │
      │  { user }                     │                               │
      │◀──────────────────────────────│                               │
      │                               │                               │
```

### Wishlist Dual-Storage Sync

```
┌─────────────────────────────────────────────────────────────────┐
│                    WISHLIST SYNC FLOW                            │
│                                                                 │
│  ┌────────────┐         ┌────────────┐         ┌────────────┐   │
│  │ localStorage│         │   React    │         │   Server   │   │
│  │ (offline)   │         │  Context   │         │ (database) │   │
│  └──────┬─────┘         └──────┬─────┘         └──────┬─────┘   │
│         │                      │                      │          │
│  STEP 1: App loads (no user)                                     │
│         │───read IDs──────────▶│                      │          │
│         │                      │  wishlistIds = [1,3] │          │
│         │                      │                      │          │
│  STEP 2: User toggles car #5                                     │
│         │◀──write [1,3,5]──────│                      │          │
│         │                      │  (optimistic update) │          │
│         │                      │                      │          │
│  STEP 3: User logs in                                            │
│         │                      │──PUT /favorites──────▶│          │
│         │                      │  { ids: [1,3,5] }    │          │
│         │                      │                      │          │
│         │                      │◀─merged IDs──────────│          │
│         │◀──write merged───────│  [1,3,5,7]           │          │
│         │                      │  (server had #7 too) │          │
│         │                      │                      │          │
│  STEP 4: User toggles off #3                                     │
│         │◀──write [1,5,7]──────│                      │          │
│         │                      │──DELETE /favorites/3─▶│          │
│         │                      │                      │          │
│         │                      │  If DELETE fails:    │          │
│         │◀──revert [1,3,5,7]──│  (stale closure bug!)│          │
│         │                      │                      │          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Flow Diagrams

### Search Page — Full Request Lifecycle

```
User types "Hyundai Creta Delhi" and applies filters
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  SearchClient.tsx (CSR)                          │
│                                                  │
│  useEffect(() => {                               │
│    api.getListings({                             │
│      search: "Hyundai Creta Delhi",              │
│      brand: "Hyundai",                           │
│      location_city: "New Delhi",                 │
│      fuelType: "Petrol",                         │
│      page: 1,                                    │
│      limit: 20                                   │
│    })                                            │
│  }, [filters])                                   │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  GET /api/v1/listings?search=...&brand=...       │
│                                                  │
│  Route handler builds Drizzle query:             │
│  ┌────────────────────────────────────────────┐  │
│  │ SELECT *, COUNT(*) OVER() as total         │  │
│  │ FROM listings                              │  │
│  │ WHERE                                      │  │
│  │   to_tsvector('english', title || brand    │  │
│  │     || model || city)                      │  │
│  │   @@ plainto_tsquery('english', ?)         │  │
│  │   AND brand = 'Hyundai'                    │  │
│  │   AND location_city = 'New Delhi'          │  │
│  │   AND fuel_type = 'Petrol'                 │  │
│  │   AND listing_status = 'Active'            │  │
│  │ ORDER BY featured DESC, created_at DESC    │  │
│  │ LIMIT 20 OFFSET 0                         │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Returns: { data: [...], pagination: {...} }     │
└──────────────────────────────────────────────────┘
```

### Admin Listing Create — Image Upload Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Admin    │         │ Fastify  │         │   Disk   │
│  Browser  │         │   API    │         │ /uploads │
└─────┬────┘         └─────┬────┘         └─────┬────┘
      │                     │                     │
      │  POST /uploads/image│                     │
      │  (FormData + file)  │                     │
      │────────────────────▶│                     │
      │                     │                     │
      │                     │  Sharp processes:   │
      │                     │  ┌───────────────┐  │
      │                     │  │ thumbnail     │  │
      │                     │  │ (200x150)     │──│──▶ save
      │                     │  │               │  │
      │                     │  │ card          │  │
      │                     │  │ (400x300)     │──│──▶ save
      │                     │  │               │  │
      │                     │  │ full          │  │
      │                     │  │ (1200x900)    │──│──▶ save
      │                     │  └───────────────┘  │
      │                     │                     │
      │  { url, thumbnail,  │                     │
      │    card, full }     │                     │
      │◀────────────────────│                     │
      │                     │                     │
      │  Admin adds URL to  │                     │
      │  listing.images[]   │                     │
      │                     │                     │
      │  POST /listings     │                     │
      │  { ...data,         │                     │
      │    images: [url] }  │                     │
      │────────────────────▶│                     │
      │                     │  INSERT INTO        │
      │                     │  listings            │
```

---

## 9. Critical Flaws

### FLAW #1: Hardcoded Secrets with Fallback Defaults

**File:** `apps/api/src/config.ts:14-20`  
**Severity:** CRITICAL

```
Problem:
  jwtAccessSecret:  process.env.JWT_ACCESS_SECRET  || "dev-access-secret-change-me"
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me"
  cookieSecret:     process.env.COOKIE_SECRET      || "dev-cookie-secret-change-me"

Risk:
  If ENV vars are misconfigured in production, the app silently falls back
  to KNOWN defaults. Any attacker can forge JWT tokens.

Fix:
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('FATAL: JWT_ACCESS_SECRET is required');
  }
```

### FLAW #2: No Security Headers (Missing Helmet)

**File:** `apps/api/src/app.ts:33-37`  
**Severity:** CRITICAL

```
Missing:
  ✗ X-Content-Type-Options: nosniff
  ✗ X-Frame-Options: DENY
  ✗ Strict-Transport-Security (HSTS)
  ✗ Content-Security-Policy (CSP)
  ✗ X-XSS-Protection

Fix:
  npm install @fastify/helmet
  await app.register(helmet, { contentSecurityPolicy: { ... } });
```

### FLAW #3: Token Refresh Thundering Herd

**File:** `apps/web/src/context/AuthContext.tsx:41-55`  
**Severity:** CRITICAL

```
Problem:
  ┌────────────────────────────────────────────────┐
  │  Page loads → refreshUser() called             │
  │       ↓                                        │
  │  api.getMe() → 401 (token expired)             │
  │       ↓                                        │
  │  api.refreshToken() fires                      │
  │       ↓                                        │
  │  Meanwhile, 3 components also call API          │
  │  Each gets 401 → each calls refreshToken()     │
  │       ↓                                        │
  │  4 CONCURRENT refresh requests hit the server  │
  │  Only 1st succeeds (token rotation deletes     │
  │  the session). The other 3 FAIL → user is      │
  │  logged out unexpectedly.                      │
  └────────────────────────────────────────────────┘

Fix:
  Implement a refresh token mutex/queue:
  let refreshPromise: Promise<void> | null = null;

  function refreshToken() {
    if (!refreshPromise) {
      refreshPromise = api.refreshToken().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }
```

### FLAW #4: No CSRF Protection

**File:** All POST/PUT/DELETE routes  
**Severity:** CRITICAL

```
Problem:
  Cookies are sent automatically with credentials:'include'.
  Attacker's site can forge requests:

  <form action="https://searchanycars.com/api/v1/bookings" method="POST">
    <input name="listingId" value="123" />
    <input type="submit" />
  </form>

  This creates a booking on behalf of the logged-in user.

Fix:
  npm install @fastify/csrf-protection
  // OR use SameSite=Strict cookies (currently 'lax')
  // OR require a custom header (X-Requested-With) that
  //    cross-origin requests cannot set
```

### FLAW #5: Unbounded Bulk Favorites Sync (DoS Vector)

**File:** `apps/api/src/routes/favorites.ts:75-84`  
**Severity:** CRITICAL

```
Problem:
  PUT /api/v1/favorites
  Body: { ids: [1, 2, 3, ..., 100000] }  // No limit!

  for (const listingId of ids) {
    await db.insert(...).values({ userId, listingId });
    // 100,000 sequential DB inserts = server blocked for minutes
  }

Fix:
  const MAX_SYNC = 500;
  if (ids.length > MAX_SYNC) throw new AppError(`Max ${MAX_SYNC} items`, 400);

  // Use batch insert:
  await db.insert(userFavorites)
    .values(ids.map(id => ({ userId, listingId: id })))
    .onConflictDoNothing();
```

### FLAW #6: Synchronous bcrypt Blocks Event Loop

**File:** `apps/api/src/services/authService.ts:24-30`  
**Severity:** CRITICAL

```
Problem:
  hashPassword()   → bcrypt.hashSync()   // Blocks 200-500ms
  verifyPassword() → bcrypt.compareSync() // Blocks 200-500ms

  Fastify is single-threaded. During password hashing,
  ALL other requests are blocked. 10 concurrent logins
  = 5 seconds of total server freeze.

Fix:
  export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
```

### FLAW #7: No Pagination Max Limit

**File:** `apps/api/src/routes/listings.ts:18-20`  
**Severity:** CRITICAL

```
Problem:
  GET /api/v1/listings?limit=999999&page=1

  const limit = q.limit ?? 20;  // No max!
  // Returns entire database in one response

Fix:
  const limit = Math.min(q.limit ?? 20, 100);
```

---

## 10. High Severity Issues

### ISSUE #8: Timing Attack — Email Enumeration

**File:** `apps/api/src/routes/auth.ts:81-96`

```
Problem:
  Login with non-existent email → instant "Invalid email or password"
  Login with existing email → 200-500ms (bcrypt runs) → "Invalid email or password"

  Attacker measures response time to determine which emails exist.

Fix:
  Always hash a dummy password even when user not found:
  const user = await findByEmail(email);
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH); // constant-time
    throw new AppError("Invalid email or password", 401);
  }
```

### ISSUE #9: No Per-Route Rate Limiting on Auth

**File:** `apps/api/src/app.ts:56-60`

```
Problem:
  Global: 100 requests/minute (production)
  Login: shares the same 100/min pool

  Attacker can attempt 100 password guesses per minute.

Fix:
  app.register(authRoutes, {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' }
    }
  });
```

### ISSUE #10: Missing Database Indexes

**File:** `packages/db/src/schema.ts`

```
MISSING INDEXES (each causes full table scan):

  Table              Column       Queries Affected
  ─────────────────  ───────────  ─────────────────────────
  users              email        Every login, every register check
  sessions           userId       Every logout (delete all user sessions)
  user_favorites     userId       Every wishlist load
  test_drive_bookings userId      Every booking list
  password_reset_tokens userId    Every password reset

  With 10K users: negligible.
  With 1M users: these become 5-10 second queries.
```

### ISSUE #11: Password Reset Tokens Stored in Plaintext

**File:** `apps/api/src/routes/auth.ts:240-251`

```
Problem:
  Token is stored as-is in the database:
    { token: "abc123...", expiresAt: ..., used: false }

  If database is compromised, attacker has all valid reset tokens
  and can take over any account with a pending reset.

Fix:
  Store hash of token:
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.insert({ token: tokenHash, ... });

  On verification:
    const inputHash = crypto.createHash('sha256').update(inputToken).digest('hex');
    const record = await db.select().where(eq(tokens.token, inputHash));
```

### ISSUE #12: Access Token Returned in Response Body

**File:** `apps/api/src/routes/auth.ts:75,183`

```
Problem:
  Login response: { user: {...}, accessToken: "eyJ..." }

  Token is ALSO set in httpOnly cookie (correct).
  But returning it in the response body means:
    - If frontend stores it in localStorage → XSS can steal it
    - If frontend logs it → token appears in console/log aggregators

Fix:
  Remove accessToken from response body. Cookies are sufficient.
  Response: { user: {...} }  // Token is in Set-Cookie header
```

### ISSUE #13: API Response Schema Inconsistency

**File:** `apps/web/app/car/[id]/CarDetailClient.tsx:16-19`

```
Problem:
  function g(car: Listing, ...keys: string[]): unknown {
    for (const k of keys) {
      if (car[k] !== undefined && car[k] !== null) return car[k];
    }
    return null;
  }

  // Usage:
  g(car, 'totalKmDriven', 'total_km_driven')
  g(car, 'listingPriceInr', 'listing_price_inr')

  The API returns BOTH camelCase and snake_case for the same fields.
  This helper is a band-aid for an inconsistent API contract.

Fix:
  Standardize Drizzle ORM column mapping to always return camelCase.
  Or add a response serialization layer in the API.
```

---

## 11. Medium & Low Issues

| # | Severity | File | Issue |
|---|----------|------|-------|
| 14 | MEDIUM | `listings.ts:12-14`, `bookings.ts:9-11` | Naive HTML stripping with regex (`/<[^>]*>/g`) doesn't prevent XSS. Use a proper sanitizer like DOMPurify. |
| 15 | MEDIUM | `WishlistContext.tsx:96-121` | Stale closure in toggleWishlist error handler. `wishlistIds` captured at creation time is used for revert, but may be stale after multiple rapid toggles. |
| 16 | MEDIUM | `car/[id]/page.tsx:4-26` | SSR fetch uses `cache: 'no-store'` — every page visit makes a fresh API call. Should use ISR with `revalidate: 60` for car detail pages. |
| 17 | MEDIUM | No audit logging | Admin actions (create/delete users, update listings) have no audit trail. Critical for compliance. |
| 18 | MEDIUM | `sessionService.ts:20-34` | Sessions not bound to IP/User-Agent. Stolen refresh token works from any device. |
| 19 | MEDIUM | `bookings.ts:89` | Dead code: `body.name ? listing.title : listing.title` — both branches identical. |
| 20 | MEDIUM | No DB connection pooling config | Using default pool size. Under load, connection exhaustion causes 503s. |
| 21 | LOW | `AuthContext.tsx:71-78` | Failed logout doesn't clear cookies. User thinks they're logged out but session is still valid. |
| 22 | LOW | `api.ts:155-165` | No client-side file type validation before upload. |
| 23 | LOW | `AuthContext.tsx` | No post-login redirect. User always lands on home after login, not where they came from. |
| 24 | LOW | `WishlistContext.tsx:43` | Loading state never set to false for non-authenticated users. |
| 25 | LOW | `listings.ts:175-209` | No optimistic locking. Two admins editing the same listing lose each other's changes. |
| 26 | LOW | `CarDetailClient.tsx:340-356` | Modals lack ARIA labels, focus trap, and escape-key handling. WCAG 2.1 violation. |

---

## 12. Remediation Roadmap

### Phase 1: Security (Do Before Launch)

```
Priority  Task                                    Effort    Impact
────────  ──────────────────────────────────────  ────────  ──────
P0        Remove hardcoded secret defaults        30 min    Blocks token forgery
P0        Add @fastify/helmet                     30 min    Blocks clickjacking, MIME attacks
P0        Switch bcrypt to async                  20 min    Unblocks event loop
P0        Add CSRF protection                     1 hour    Blocks cross-site attacks
P0        Cap pagination limits                   15 min    Blocks data exfiltration
P0        Cap bulk favorites sync                 15 min    Blocks DoS
P1        Hash password reset tokens              30 min    Blocks DB-breach escalation
P1        Per-route auth rate limiting             1 hour    Blocks brute-force
P1        Fix timing attack on login              20 min    Blocks email enumeration
P1        Remove accessToken from response body   15 min    Reduces XSS impact
```

### Phase 2: Reliability (Do Before Scale)

```
Priority  Task                                    Effort    Impact
────────  ──────────────────────────────────────  ────────  ──────
P1        Add missing DB indexes                  30 min    10x faster queries at scale
P1        Fix token refresh thundering herd       1 hour    Prevents mass logout bugs
P1        Fix wishlist stale closure              30 min    Prevents data loss
P2        Standardize API response casing         2 hours   Removes g() hack, type safety
P2        Add ISR caching for car pages           30 min    60% fewer API calls
P2        Configure DB connection pooling         30 min    Prevents connection exhaustion
P2        Add error boundary to root layout       15 min    Prevents white screen of death
```

### Phase 3: Compliance & Quality (Do Before Growth)

```
Priority  Task                                    Effort    Impact
────────  ──────────────────────────────────────  ────────  ──────
P2        Add audit logging for admin actions     2 hours   Compliance, accountability
P2        Add email verification flow             4 hours   Prevents fake accounts
P2        Replace regex HTML stripping            30 min    Prevents stored XSS
P3        Add post-login redirect                 30 min    Better UX
P3        Add modal accessibility (ARIA)          2 hours   WCAG compliance
P3        Add optimistic locking for listings     1 hour    Prevents lost updates
P3        Bind sessions to IP/User-Agent          1 hour    Reduces token theft impact
```

---

## 13. Summary Scorecard

```
Category              Score   Grade   Notes
────────────────────  ──────  ──────  ────────────────────────────
Architecture           8/10    A-     Clean monorepo, good separation
Code Organization      7/10    B      Well-structured, needs type safety at boundary
Security               3/10    D      7 critical issues, must fix before production
Performance            5/10    C      Sync bcrypt, no caching, missing indexes
Error Handling         5/10    C      Basic coverage, race conditions in contexts
Testing                7/10    B      638 unit tests, E2E exists, good coverage
Database Design        6/10    B-     Good schema, missing indexes on FKs
API Design             7/10    B      RESTful, Zod validated, inconsistent casing
Frontend State         5/10    C      Context-only (fine for now), race conditions
SEO                    9/10    A      Comprehensive metadata, JSON-LD, sitemap
DevEx                  8/10    A-     Turborepo, pnpm, TypeScript strict, good DX
Scalability            4/10    D+     No caching layer, no CDN, no queue, no worker

OVERALL                6/10    C+     Functional MVP. NOT production-ready
                                      until security issues are resolved.
```

### Architecture Strengths

1. **Clean monorepo** — Turborepo + pnpm workspaces is the right choice
2. **Shared validation** — Zod schemas in `packages/shared` prevent drift
3. **Database-first design** — Drizzle ORM with proper migrations
4. **Dual auth** — Cookie + Bearer header support is flexible
5. **Comprehensive SEO** — JSON-LD, sitemap, robots, OG tags all present
6. **Good test coverage** — 638 unit tests + Playwright E2E

### Architecture Weaknesses

1. **No type safety across network boundary** — Frontend and API can drift
2. **No caching layer** — Every request hits PostgreSQL directly
3. **No background jobs** — Email, image processing done in request cycle
4. **No CDN for uploads** — Images served from application server
5. **Context-only state** — Will need migration to Zustand/Jotai at scale
6. **No observability** — No structured logging, metrics, or tracing

---

> **Bottom Line:** This is a well-structured MVP with solid foundations (monorepo, TypeScript, good testing). The architecture is clean and the developer experience is excellent. However, there are **7 critical security flaws** that absolutely must be fixed before any production deployment. The performance and scalability issues can be addressed incrementally as traffic grows, but the security issues are non-negotiable.
