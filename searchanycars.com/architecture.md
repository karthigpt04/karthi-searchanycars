# SearchAnyCars -- System Architecture

> A comprehensive guide to how SearchAnyCars is built, how data flows, and how
> every piece fits together. Written so that both engineers and non-technical
> stakeholders can follow along.

---

## Table of Contents

1. [Big Picture](#1-big-picture)
2. [Middleware Chain](#2-middleware-chain)
3. [Authentication Flow](#3-authentication-flow)
4. [Admin Dashboard Controls](#4-admin-dashboard-controls)
5. [Real-Time SSE Flow](#5-real-time-sse-flow)
6. [Security Layers](#6-security-layers)
7. [Page Sitemap](#7-page-sitemap)
8. [Mobile Responsive Breakpoints](#8-mobile-responsive-breakpoints)
9. [Data Flow Trace -- How a Car Listing Gets Displayed](#9-data-flow-trace----how-a-car-listing-gets-displayed)
10. [Database Tables Overview](#10-database-tables-overview)
11. [File Structure](#11-file-structure)
12. [Technology Choices](#12-technology-choices)

---

## 1. Big Picture

Think of the system as a restaurant. The **browser** is the customer placing an
order, **Express** is the waiter who takes the order and brings back the food,
and **SQLite** is the kitchen where all the ingredients (data) are stored and
prepared.

```
+---------------------------------------------------------+
|                    USER'S BROWSER                        |
|                                                         |
|  React 19 SPA  +  React Router  +  CSS Design System   |
|  (TypeScript)      (client-side     (Navy + Coral       |
|                     routing)         palette)            |
+-----------------------+---------------------------------+
                        |
                        | HTTP / HTTPS
                        | JSON + Cookies
                        |
+-----------------------v---------------------------------+
|                   EXPRESS 5 SERVER                       |
|                   (Node.js, ESM)                        |
|                                                         |
|  +----------+  +--------+  +--------+  +----------+    |
|  | Security |  |  Auth  |  |  API   |  |   SSE    |    |
|  | (Helmet, |  | (JWT,  |  | Routes |  | (live    |    |
|  |  CORS,   |  | bcrypt,|  | CRUD   |  |  config  |    |
|  |  Rate    |  | cookie)|  | logic) |  |  push)   |    |
|  | Limiter) |  +--------+  +--------+  +----------+    |
|  +----------+                                           |
|                                                         |
+-----------------------+---------------------------------+
                        |
                        | SQL queries
                        | (better-sqlite3)
                        |
+-----------------------v---------------------------------+
|                      SQLite                             |
|                  (searchanycars.db)                     |
|                                                         |
|  WAL mode  |  Foreign keys ON  |  Auto-bootstrap       |
|                                                         |
|  Tables: categories, listings, filter_definitions,      |
|          category_filter_map, site_config, users,       |
|          sessions                                       |
+---------------------------------------------------------+
                        |
                        | File system
                        |
+-----------------------v---------------------------------+
|                  LOCAL FILE STORAGE                      |
|                                                         |
|  uploads/listings/YYYY/MM/<uuid>-<name>.<ext>           |
|  (car images, organized by upload date)                 |
+---------------------------------------------------------+
```

**In plain English:** A visitor opens the website in their browser. The browser
downloads a single-page React application that handles all the page transitions
locally. Whenever the app needs data (car listings, filters, user info), it
sends a request to the Express server. The server checks security rules, looks
up the data in a SQLite database file, and sends back JSON. Images are stored
as files on the server and served as static assets.

---

## 2. Middleware Chain

Every request to the server passes through a series of checkpoints, like going
through airport security. Each checkpoint does one specific job before passing
the request to the next one.

```
Incoming HTTP Request
        |
        v
+------------------+
| 1. Request       |    Logs every request. In development it uses
|    Logger        |    a short "dev" format; in production it uses
|    (morgan)      |    the full "combined" format for auditing.
+--------+---------+
         |
         v
+------------------+
| 2. Security      |    Sets 11+ HTTP security headers (Helmet),
|    Headers       |    configures CORS (who can call the API),
|    (helmet+cors) |    and enforces rate limits (200 req / 15 min).
+--------+---------+
         |
         v
+------------------+
| 3. Body Parser   |    Reads JSON from the request body.
|    (express.json)|    Max size: 3 MB.
+--------+---------+
         |
         v
+------------------+
| 4. Cookie Parser |    Reads cookies from the request.
|    (cookie-      |    This is how the server finds the
|     parser)      |    access_token and refresh_token.
+--------+---------+
         |
         v
+------------------+
| 5. Extract User  |    Reads the access_token cookie, verifies
|    (extractUser) |    the JWT, and attaches `req.user` so all
|                  |    downstream handlers know who is calling.
+--------+---------+
         |
         v
+------------------+
| 6. Static Files  |    Serves uploaded images from /uploads
|    (express.     |    and the built React app from /dist.
|     static)      |
+--------+---------+
         |
         v
+------------------+
| 7. Route         |    The actual API endpoints (listings,
|    Handlers      |    categories, auth, SSE, site-config).
|                  |    Admin routes add `requireAdmin` guard.
+--------+---------+
         |
         v
+------------------+
| 8. SPA Fallback  |    Any non-API, non-upload GET request
|    (catch-all)   |    returns index.html so React Router
|                  |    can handle client-side routes.
+--------+---------+
         |
         v
+------------------+
| 9. Error Handler |    Catches any unhandled errors. In dev
|    (last)        |    mode it includes the stack trace;
|                  |    in production it sends a clean message.
+------------------+
```

**Analogy:** Think of this like a factory assembly line. Each station does one
thing -- stamp the passport, check the bag, scan the ticket -- and then passes
you along. If anything goes wrong at any station, the error handler at the end
catches it.

---

## 3. Authentication Flow

Authentication is how the system knows who you are. It uses JWT (JSON Web
Tokens) stored in HTTP-only cookies -- think of them as wristbands at a
concert that prove you paid for entry.

### Login Flow

```
  Browser                        Server                        Database
    |                              |                              |
    |  POST /api/auth/login        |                              |
    |  { email, password }         |                              |
    |----------------------------->|                              |
    |                              |  1. Rate limit check         |
    |                              |     (max 20 per 15 min)      |
    |                              |                              |
    |                              |  2. Look up user by email    |
    |                              |------------------------------>|
    |                              |  3. User row returned        |
    |                              |<------------------------------|
    |                              |                              |
    |                              |  4. bcrypt.compare           |
    |                              |     (password vs hash)       |
    |                              |     12 salt rounds           |
    |                              |                              |
    |                              |  5. Generate tokens:         |
    |                              |     access_token  (15 min)   |
    |                              |     refresh_token (7 days)   |
    |                              |                              |
    |                              |  6. Store session            |
    |                              |     (token, IP, user-agent)  |
    |                              |------------------------------>|
    |                              |                              |
    |  Set-Cookie: access_token    |                              |
    |  Set-Cookie: refresh_token   |                              |
    |  { user: { id, email,        |                              |
    |    name, role } }            |                              |
    |<-----------------------------|                              |
```

### Token Refresh Flow (automatic, silent)

```
  Browser                        Server                        Database
    |                              |                              |
    |  access_token EXPIRED        |                              |
    |                              |                              |
    |  POST /api/auth/refresh      |                              |
    |  Cookie: refresh_token       |                              |
    |----------------------------->|                              |
    |                              |  1. Verify refresh JWT       |
    |                              |  2. Find session in DB       |
    |                              |------------------------------>|
    |                              |<------------------------------|
    |                              |                              |
    |                              |  3. DELETE old session        |
    |                              |  4. Generate NEW tokens      |
    |                              |  5. Store NEW session         |
    |                              |  (token rotation)            |
    |                              |------------------------------>|
    |                              |                              |
    |  Set-Cookie: NEW access      |                              |
    |  Set-Cookie: NEW refresh     |                              |
    |<-----------------------------|                              |
```

**Why two tokens?** The access token is short-lived (15 minutes) so that if
it is somehow stolen, the damage window is small. The refresh token lasts
longer (7 days) but is rotated on every use -- once a refresh token is used,
it is deleted and a new one is issued. This is like getting a new concert
wristband every time you re-enter.

### Cookie Security Settings

| Setting    | Value       | Why                                           |
|------------|-------------|-----------------------------------------------|
| httpOnly   | true        | JavaScript cannot read the cookie (XSS proof)  |
| secure     | configurable| Only sent over HTTPS in production              |
| sameSite   | lax         | Prevents cross-site request forgery             |
| path       | /           | Available to all routes                         |
| maxAge     | 15min / 7d  | access_token / refresh_token                    |

---

## 4. Admin Dashboard Controls

The admin dashboard at `/admin/settings` is the mission control center of the
website. It has **14 tabs**, each controlling a different part of what visitors
see. Think of it like the control board in a TV studio -- each knob changes
what appears on screen, live.

```
+-----------------------------------------------------------------------+
|                     ADMIN SETTINGS DASHBOARD                          |
|  /admin/settings                                                      |
+-----------------------------------------------------------------------+
|                                                                       |
|  +------------+  +-----------+  +----------+  +-----------+           |
|  | 1. Hero    |  | 2. Trust  |  | 3. Cities|  | 4. Reviews|           |
|  |  Section   |  |    Bar    |  |          |  |           |           |
|  +------------+  +-----------+  +----------+  +-----------+           |
|                                                                       |
|  +------------+  +-----------+  +----------+  +-----------+           |
|  | 5. Body    |  | 6. Fuel   |  | 7. Budget|  | 8. Nav    |           |
|  |   Types    |  |   Types   |  |  Brackets|  |   Items   |           |
|  +------------+  +-----------+  +----------+  +-----------+           |
|                                                                       |
|  +------------+  +-----------+  +----------+  +-----------+           |
|  | 9. Footer  |  | 10. Sell  |  | 11.S-Plus|  | 12.S-Plus |           |
|  |            |  |    CTA    |  |  Banner  |  | New Banner|           |
|  +------------+  +-----------+  +----------+  +-----------+           |
|                                                                       |
|  +------------+  +-----------+                                        |
|  |13. Contact |  |14. Site   |                                        |
|  |    Info    |  |   Name    |                                        |
|  +------------+  +-----------+                                        |
|                                                                       |
+-----------------------------------------------------------------------+
```

### What Each Tab Controls

| #  | Tab              | What It Changes                                     | Data Type     |
|----|------------------|-----------------------------------------------------|---------------|
| 1  | Hero Section     | Homepage headline and subtitle text                 | Object        |
| 2  | Trust Bar        | The row of trust badges (inspection, warranty, etc) | Array         |
| 3  | Cities           | Browse-by-city cards with images and counts          | Array         |
| 4  | Reviews          | Customer testimonials shown on homepage              | Array         |
| 5  | Body Types       | Vehicle category quick-filter chips                  | Array         |
| 6  | Fuel Types       | Fuel type quick-filter chips                         | Array         |
| 7  | Budget Brackets  | Price range quick-filter buttons                     | Array         |
| 8  | Navigation       | Header menu items and their paths                    | Array         |
| 9  | Footer           | Footer columns, links, and brand text                | Object        |
| 10 | Sell CTA         | "Sell Your Car" call-to-action section                | Object        |
| 11 | S-Plus Banner    | Premium pre-owned section banner and features        | Object        |
| 12 | S-Plus New       | Premium new/unregistered cars section banner          | Object        |
| 13 | Contact Info     | Phone, WhatsApp, email, and address                  | Object        |
| 14 | Site Name        | The brand name shown across the site                 | String        |

### How Settings Get Saved

```
  Admin clicks "Save"            Server                      Database
        |                          |                            |
        |  PUT /api/site-config    |                            |
        |  /:key                   |                            |
        |  { value: {...} }        |                            |
        |------------------------->|                            |
        |                          |  requireAdmin check        |
        |                          |                            |
        |                          |  UPSERT into site_config   |
        |                          |  (insert or update)        |
        |                          |--------------------------->|
        |                          |                            |
        |                          |  broadcast SSE event       |
        |                          |  { type: "config-updated", |
        |                          |    key: "hero" }           |
        |                          |- - - - - - - - - - - ->    |
        |                          |     (to all connected      |
        |                          |      browsers)             |
        |  200 OK { key, value }   |                            |
        |<-------------------------|                            |
```

---

## 5. Real-Time SSE Flow

SSE (Server-Sent Events) is a one-way live connection from the server to the
browser. Think of it like a radio broadcast -- the server is the radio station
and every open browser tab is a radio tuned in.

Currently used for: pushing site configuration changes in real time so that
when an admin updates settings, all visitors see the change without refreshing.

```
  Browser A           Browser B           Server             Admin
  (visitor)           (visitor)                              Dashboard
     |                   |                   |                   |
     |  GET /api/events  |                   |                   |
     |------------------>|                   |                   |
     |  Connection held  |  GET /api/events  |                   |
     |  open (streaming) |------------------>|                   |
     |                   |  Connection held  |                   |
     |                   |  open (streaming) |                   |
     |                   |                   |                   |
     |  data: {"type":   |  data: {"type":   |                   |
     |   "connected"}    |   "connected"}    |                   |
     |<- - - - - - - - - | <- - - - - - - - -|                   |
     |                   |                   |                   |
     |                   |                   |  PUT /api/        |
     |                   |                   |  site-config/hero |
     |                   |                   |<------------------|
     |                   |                   |                   |
     |                   |                   |  broadcast()      |
     |                   |                   |                   |
     |  data: {"type":   |  data: {"type":   |                   |
     |   "config-        |   "config-        |                   |
     |    updated",      |    updated",      |                   |
     |    "key":"hero"}  |    "key":"hero"}  |                   |
     |<- - - - - - - - - |<- - - - - - - - - |                   |
     |                   |                   |                   |
     |  (React re-       |  (React re-       |                   |
     |   fetches config) |   fetches config) |                   |
```

**How it works under the hood:**
1. The server keeps a `Set` of all connected response objects.
2. When a browser connects, its response object is added to the set.
3. When `broadcast()` is called, it loops through every connection and writes
   the event data.
4. When a browser disconnects, its response is removed from the set.

---

## 6. Security Layers

Security is layered like an onion -- multiple defenses so that if one layer
is bypassed, the next one still protects the system.

```
+================================================================+
|  LAYER 1: NETWORK                                              |
|  +----------------------------------------------------------+  |
|  | Rate Limiting                                             |  |
|  | - Global: 200 requests per 15 minutes per IP              |  |
|  | - Auth endpoints: 20 requests per 15 minutes per IP       |  |
|  | - Prevents brute force attacks and DDoS                   |  |
|  +----------------------------------------------------------+  |
+================================================================+
         |
+================================================================+
|  LAYER 2: HTTP HEADERS                                         |
|  +----------------------------------------------------------+  |
|  | Helmet.js (11+ security headers)                          |  |
|  | - X-Content-Type-Options: nosniff                         |  |
|  | - X-Frame-Options: SAMEORIGIN                             |  |
|  | - X-XSS-Protection                                        |  |
|  | - Strict-Transport-Security                               |  |
|  | - Referrer-Policy                                         |  |
|  +----------------------------------------------------------+  |
+================================================================+
         |
+================================================================+
|  LAYER 3: CORS (Cross-Origin Resource Sharing)                 |
|  +----------------------------------------------------------+  |
|  | Controls which websites can call the API.                 |  |
|  | credentials: true (cookies are sent)                      |  |
|  | Configurable origins via CORS_ORIGINS env variable.       |  |
|  +----------------------------------------------------------+  |
+================================================================+
         |
+================================================================+
|  LAYER 4: AUTHENTICATION                                       |
|  +----------------------------------------------------------+  |
|  | JWT Tokens in HTTP-only cookies                           |  |
|  | - access_token: 15 min lifetime                           |  |
|  | - refresh_token: 7 day lifetime, rotated on use           |  |
|  | - Cookies: httpOnly, sameSite=lax, secure in production   |  |
|  +----------------------------------------------------------+  |
+================================================================+
         |
+================================================================+
|  LAYER 5: AUTHORIZATION                                        |
|  +----------------------------------------------------------+  |
|  | Role-based access control (RBAC):                         |  |
|  |                                                           |  |
|  |   extractUser --> reads token, sets req.user              |  |
|  |   requireAuth --> blocks if no user (401)                 |  |
|  |   requireAdmin -> blocks if role != 'admin' (403)        |  |
|  |                                                           |  |
|  |   Public routes:  GET listings, categories, search        |  |
|  |   Auth routes:    GET /auth/me, wishlist                  |  |
|  |   Admin routes:   POST/PUT/DELETE listings, settings      |  |
|  +----------------------------------------------------------+  |
+================================================================+
         |
+================================================================+
|  LAYER 6: INPUT VALIDATION & SANITIZATION                      |
|  +----------------------------------------------------------+  |
|  | - HTML tag stripping on text fields (anti-XSS)            |  |
|  | - Required field checks (listingCode, title, brand, etc)  |  |
|  | - Numeric validation (price must be non-negative)         |  |
|  | - Image MIME type validation (must start with "image/")   |  |
|  | - File size limit: 6 MB per image (Multer)                |  |
|  | - JSON body limit: 3 MB                                   |  |
|  +----------------------------------------------------------+  |
+================================================================+
         |
+================================================================+
|  LAYER 7: PASSWORD STORAGE                                     |
|  +----------------------------------------------------------+  |
|  | bcrypt with 12 salt rounds                                |  |
|  | (Even if the database is stolen, passwords are unusable)  |  |
|  +----------------------------------------------------------+  |
+================================================================+
         |
+================================================================+
|  LAYER 8: DATABASE SAFETY                                      |
|  +----------------------------------------------------------+  |
|  | - Parameterized queries (no SQL injection possible)       |  |
|  | - Foreign key constraints (data integrity)                |  |
|  | - WAL journaling mode (crash-safe writes)                 |  |
|  | - UNIQUE constraints on listing codes, emails             |  |
|  +----------------------------------------------------------+  |
+================================================================+
```

---

## 7. Page Sitemap

Every page a visitor or admin can reach, organized by who can see it.

```
                          searchanycars.com
                                |
                +---------------+----------------+
                |                                |
         PUBLIC PAGES                      PROTECTED PAGES
                |                                |
    +-----------+-----------+            +-------+-------+
    |           |           |            |               |
  BROWSE      INFO        AUTH         ADMIN          USER
    |           |           |            |               |
    |           |           |            |               |
+---+---+   +--+--+    +---+---+   +----+----+    +----+----+
|       |   |     |    |       |   |         |    |         |
v       v   v     v    v       v   v         v    v         v

/           /about     /login     /admin        /wishlist
Homepage    About Us              Inventory
                                  Dashboard
/search     /how-it-              (listings
Search &    works      /sell      management,
Browse      How It     Sell Your  stats)
            Works      Car
/car/:id                          /admin/car/new
Car Detail  /faq                  Add New
Page        FAQ                   Listing

/splus      /contact              /admin/car/:id/edit
S-Plus      Contact               Edit Listing
Premium     Us
                                  /admin/settings
/splus-new                        Site Settings
S-Plus New                        (14 tabs)
(Unregistered)

/*  (404 Not Found -- catch-all)
```

### Route Protection Summary

| Route Pattern          | Guard         | Who Can Access           |
|------------------------|---------------|--------------------------|
| `/`                    | None          | Everyone                 |
| `/search`              | None          | Everyone                 |
| `/splus`               | None          | Everyone                 |
| `/splus-new`           | None          | Everyone                 |
| `/car/:id`             | None          | Everyone                 |
| `/about`               | None          | Everyone                 |
| `/how-it-works`        | None          | Everyone                 |
| `/faq`                 | None          | Everyone                 |
| `/contact`             | None          | Everyone                 |
| `/sell`                | None          | Everyone                 |
| `/wishlist`            | None          | Everyone (client-side)   |
| `/login`               | None          | Everyone                 |
| `/admin`               | AdminGuard    | Admin only               |
| `/admin/car/new`       | AdminGuard    | Admin only               |
| `/admin/car/:id/edit`  | AdminGuard    | Admin only               |
| `/admin/settings`      | AdminGuard    | Admin only               |

---

## 8. Mobile Responsive Breakpoints

The site adapts to different screen sizes like water filling different shaped
containers. Here are the breakpoints -- think of them as "size categories."

```
  Phone (tiny)     Phone       Tablet       Small Desktop    Desktop
   <= 375px      <= 480px     <= 768px       <= 1024px       > 1024px
  +--------+   +----------+  +----------+  +-------------+  +----------------+
  |        |   |          |  |          |  |             |  |                |
  | 1 col  |   | 1 col    |  | 2 col    |  | 2-3 col     |  | Full layout    |
  | Tiny   |   | Compact  |  | Tablet   |  | Grid cards  |  | 4 col grids    |
  | text   |   | inputs   |  | nav hides|  |             |  | Desktop nav    |
  |        |   | 16px min |  | Sidebar  |  |             |  | Sidebar + Main |
  +--------+   +----------+  | collapses|  +-------------+  +----------------+
                              +----------+
```

### Breakpoint Details

| Breakpoint  | Target             | Key Changes                                        |
|-------------|--------------------|----------------------------------------------------|
| `<= 375px`  | Small phones       | Minimal padding, 1-column layouts, smallest         |
|             | (iPhone SE)        | font sizes, compact hero section                    |
| `<= 480px`  | Standard phones    | All inputs forced to 16px (prevents iOS zoom),      |
|             |                    | login page compact, single-column forms              |
| `<= 640px`  | Large phones       | S-Plus grids go to 2 columns, hero text shrinks,    |
|             |                    | compact hero banners for S-Plus and S-Plus New       |
| `<= 768px`  | Tablets (portrait) | Desktop header hides, MobileNav appears,             |
|             |                    | car card grids go to 1-2 columns, admin form         |
|             |                    | fields stack vertically, footer collapses             |
| `<= 900px`  | Tablets/small      | S-Plus/S-Plus New layouts switch from sidebar +      |
|             | laptops            | main to single-column stacked view                   |
| `<= 1024px` | Tablets landscape  | Car card grids to 2 columns, admin car form          |
|             | / small laptops    | goes single-column, S-Plus grids to 2 columns        |
| `> 1024px`  | Desktop            | Full multi-column layouts, desktop navigation,       |
|             |                    | sidebar filters visible, 3-4 column card grids       |

### Mobile Navigation

On screens `<= 768px`, the desktop header navigation is replaced by a
`MobileNav` component -- a bottom tab bar that stays fixed at the bottom of
the screen, giving thumb-friendly access to key pages.

---

## 9. Data Flow Trace -- How a Car Listing Gets Displayed

Let us trace what happens from the moment a visitor opens the homepage to seeing
a car card, step by step:

```
Step 1: BROWSER LOADS HOMEPAGE
+-----------------------------------+
| Browser requests /                |
| Server sends dist/index.html      |
| Browser downloads JS, CSS bundles |
+-----------------------------------+
         |
         v
Step 2: REACT APP INITIALIZES
+-----------------------------------+
| SiteConfigProvider loads           |
|   GET /api/site-config             |
|   (hero text, trust bar, cities,   |
|    body types, fuel types, etc.)   |
|                                    |
| AuthProvider loads                 |
|   GET /api/auth/me                 |
|   (checks if user is logged in)   |
+-----------------------------------+
         |
         v
Step 3: HOMEPAGE COMPONENT MOUNTS
+-----------------------------------+
| HomePage calls:                    |
|   api.getListings({})              |
|   --> GET /api/listings            |
|                                    |
| Also fetches:                      |
|   api.getCategories()              |
|   --> GET /api/categories          |
+-----------------------------------+
         |
         v
Step 4: SERVER PROCESSES REQUEST
+-----------------------------------+
| Express receives GET /api/listings |
|                                    |
| 1. Middleware chain runs           |
|    (log, security, parse, auth)    |
|                                    |
| 2. mapWhere() builds SQL WHERE     |
|    clause from query params:       |
|    - search, brand, fuel_type,     |
|      transmission, ownership,      |
|      seller_type, city, price      |
|      range, year range, km max,    |
|      is_splus, is_new_car, etc.    |
|                                    |
| 3. SQL query runs:                 |
|    SELECT l.*, c.name, c.slug      |
|    FROM listings l                 |
|    LEFT JOIN categories c          |
|    WHERE [filters]                 |
|    ORDER BY model_year DESC        |
+-----------------------------------+
         |
         v
Step 5: DATA TRANSFORMATION
+-----------------------------------+
| toListing() converts each row:     |
|                                    |
| - images_json (string)             |
|   --> images (array)               |
| - interior_images_json             |
|   --> interiorImages (array)       |
| - specs_json (string)              |
|   --> specs (object)               |
|                                    |
| Server responds with JSON array    |
+-----------------------------------+
         |
         v
Step 6: REACT RENDERS CAR CARDS
+-----------------------------------+
| HomePage receives listing array    |
|                                    |
| For each listing, renders a        |
| <CarCard> component showing:       |
|   - First image (or placeholder)   |
|   - Title (brand + model + year)   |
|   - Price (formatted as INR)       |
|   - KM driven                      |
|   - Fuel type & transmission       |
|   - Location city                  |
|   - S-Plus badge (if applicable)   |
|   - Featured badge (if applicable) |
|                                    |
| Cards link to /car/:id for detail  |
+-----------------------------------+
```

### When a User Clicks a Car Card

```
/car/42  -->  CarDetailPage mounts
              |
              api.getListingById(42)
              --> GET /api/listings/42
              |
              Server returns single listing with ALL fields:
              - 190+ columns of vehicle data
              - Multiple image categories (interior, exterior, engine, etc.)
              - Inspection score, dealer info, financing estimates
              - Full specs object
              |
              CarDetailPage renders:
              - Image gallery with categories
              - Price + EMI estimate
              - Vehicle specifications table
              - Condition report
              - Seller information
              - Book Test Drive modal
              - Reserve Car modal
```

---

## 10. Database Tables Overview

The database has 7 tables. Think of each table as a filing cabinet drawer, each
holding a different type of document.

```
+-------------------+       +--------------------+
|    categories     |       | filter_definitions |
+-------------------+       +--------------------+
| id (PK)           |       | id (PK)            |
| name              |       | key                |
| slug              |<---+  | label              |
| vehicle_type      |    |  | type               |
| description       |    |  | options_json       |
| created_at        |    |  +--------+-----------+
| updated_at        |    |           |
+--------+----------+    |           |
         |               |  +--------+-----------+
         |               |  | category_filter_map|
         |               |  +--------------------+
         |               +--| category_id (FK)   |
         |                  | filter_id (FK)     |
         |                  +--------------------+
         |
         |  (one category has many listings)
         |
+--------v---------------------------------------------+
|                      listings                        |
+------------------------------------------------------+
| id (PK)                                              |
| category_id (FK) -----> categories.id                |
| listing_code (UNIQUE)                                |
|                                                      |
| IDENTITY:    title, brand, model, variant            |
| YEAR:        model_year, registration_year           |
| TYPE:        vehicle_type, body_style                |
| COLOR:       exterior_color, interior_color          |
| IDS:         vin, engine_number, reg_number_masked   |
|                                                      |
| PRICING:     listing_price_inr, negotiable,          |
|              original_onroad_price, market_value,     |
|              emi_estimate, down_payment, loan_*       |
|                                                      |
| OWNERSHIP:   ownership_type, seller_type,            |
|              registration_state/city, road_tax_*,     |
|              hypothecation, noc, insurance_*          |
|                                                      |
| PERFORMANCE: total_km_driven, mileage_kmpl,          |
|              engine_type/capacity/power/torque,       |
|              transmission, drivetrain, fuel_type      |
|                                                      |
| EV FIELDS:   battery_capacity, battery_health,       |
|              battery_range, charging_time             |
|                                                      |
| CONDITION:   overall_rating, exterior/interior/       |
|              engine/tire/brake/suspension condition,   |
|              flood_damage, accident_damage, rust       |
|                                                      |
| FEATURES:    airbags, abs, esc, sunroof, leather,    |
|              carplay, android_auto, 360_camera,       |
|              wireless_charging, led_headlights, ...   |
|              (40+ feature flags)                      |
|                                                      |
| MEDIA:       images_json, interior_images_json,      |
|              exterior_images_json, engine_images_json,|
|              tire_images_json, damage_images_json,    |
|              view_360_url, video_walkaround_url       |
|                                                      |
| INSPECTION:  inspection_status, inspection_score,    |
|              inspection_report_url, certified         |
|                                                      |
| LISTING:     listing_status (Active/Reserved/Sold/   |
|              Draft), featured_listing, is_splus,      |
|              is_new_car, new_car_type, promotion_tier |
|                                                      |
| METRICS:     views_count, favorites_count, lead_count|
|                                                      |
| TIMESTAMPS:  created_at, updated_at                  |
+------------------------------------------------------+
  Indexes: category_id, brand, fuel_type, transmission,
           price, model_year, km_driven, city,
           is_splus, is_new_car


+-------------------+        +-------------------+
|   site_config     |        |      users        |
+-------------------+        +-------------------+
| key (PK)          |        | id (PK)           |
| value (JSON text) |        | email (UNIQUE)    |
| updated_at        |        | phone (UNIQUE)    |
+-------------------+        | name              |
                              | password_hash     |
  Stores all 14 admin         | role (admin/user) |
  settings as key-value       | google_id         |
  pairs. Each value is        | phone_verified    |
  a JSON string.              | email_verified    |
                              | avatar_url        |
                              | created_at        |
                              | updated_at        |
                              +--------+----------+
                                       |
                                       |  (one user has many sessions)
                                       |
                              +--------v----------+
                              |     sessions      |
                              +-------------------+
                              | id (PK)           |
                              | user_id (FK)      |
                              | refresh_token     |
                              |   (UNIQUE)        |
                              | expires_at        |
                              | ip_address        |
                              | user_agent        |
                              | created_at        |
                              +-------------------+
```

### Table Summary

| Table                 | Purpose                                 | Rows (typical) |
|-----------------------|-----------------------------------------|----------------|
| `categories`          | Vehicle types (Hatchback, Sedan, SUV..) | 8              |
| `filter_definitions`  | Reusable filter configs                 | 13             |
| `category_filter_map` | Links categories to their filters       | ~50            |
| `listings`            | Car listings with 190+ data fields      | Hundreds-1000s |
| `site_config`         | Admin-editable site content (14 keys)   | 14             |
| `users`               | Admin and regular user accounts         | 1-100          |
| `sessions`            | Active login sessions                   | 1-50           |

---

## 11. File Structure

```
searchanycars.com/
|
|-- package.json                 # Project dependencies and scripts
|-- vite.config.ts               # Vite build tool configuration
|-- tsconfig.json                # TypeScript compiler settings
|-- .env                         # Environment variables (secrets, ports)
|
|-- server/                      # ---- BACKEND (Node.js + Express) ----
|   |
|   |-- index.js                 # Main server file: creates Express app,
|   |                            # registers all middleware and routes,
|   |                            # defines all API endpoints (listings,
|   |                            # categories, filters, site-config,
|   |                            # uploads, health check), SPA fallback,
|   |                            # and graceful shutdown handling.
|   |
|   |-- config.js                # Centralized configuration: reads env
|   |                            # variables for port, JWT secrets, rate
|   |                            # limits, cookie settings, admin defaults.
|   |
|   |-- db.js                    # Database connection: opens SQLite file
|   |                            # using better-sqlite3, enables WAL mode
|   |                            # and foreign key constraints.
|   |
|   |-- bootstrap.js             # Database initialization: creates all
|   |                            # tables if they don't exist, seeds
|   |                            # default categories, filters, sample
|   |                            # car listings, and admin user account.
|   |
|   |-- storage.js               # Image upload handler: saves files to
|   |                            # uploads/listings/YYYY/MM/ with UUID
|   |                            # filenames for uniqueness.
|   |
|   |-- middleware/
|   |   |-- auth.js              # Auth middleware: extractUser (reads JWT
|   |   |                        # from cookie), requireAuth (blocks
|   |   |                        # unauthenticated), requireAdmin (blocks
|   |   |                        # non-admin users).
|   |   |
|   |   |-- security.js          # Security middleware: Helmet headers,
|   |   |                        # CORS configuration, rate limiting
|   |   |                        # (global + strict auth limiter).
|   |   |
|   |   |-- requestLogger.js     # Request logging: Morgan in "dev" mode
|   |   |                        # for development, "combined" for prod.
|   |   |
|   |   |-- errorHandler.js      # Global error handler: returns clean
|   |   |                        # JSON errors; includes stack traces
|   |   |                        # only in development mode.
|   |
|   |-- routes/
|   |   |-- auth.js              # Auth routes: login, register, refresh
|   |   |                        # token, logout, get current user, and
|   |   |                        # admin user management (CRUD).
|   |   |
|   |   |-- sse.js               # Server-Sent Events: maintains set of
|   |   |                        # connected clients, broadcasts events
|   |   |                        # (currently config-updated).
|   |
|   |-- services/
|       |-- authService.js       # Auth logic: password hashing (bcrypt,
|       |                        # 12 rounds), JWT generation/verification
|       |                        # (access + refresh tokens), cookie
|       |                        # setting/clearing with security flags.
|       |
|       |-- sessionService.js    # Session management: create, find,
|                                # delete sessions; clean expired ones.
|                                # Tracks IP and user-agent per session.
|
|-- src/                         # ---- FRONTEND (React + TypeScript) ----
|   |
|   |-- main.tsx                 # React entry point: renders <App>
|   |-- App.tsx                  # Root component: sets up providers
|   |                            # (SiteConfig, Auth), defines all routes,
|   |                            # renders Header, Footer, MobileNav.
|   |
|   |-- index.css                # Complete design system: CSS variables,
|   |                            # Navy (#1A237E) + Coral (#FF6B35) theme,
|   |                            # all component styles, responsive
|   |                            # breakpoints (375/480/640/768/900/1024).
|   |
|   |-- types.ts                 # TypeScript interfaces: Category,
|   |                            # Listing (75+ fields), ListingPayload,
|   |                            # CategoryFilterDefinition.
|   |
|   |-- api/
|   |   |-- client.ts            # API client: fetch wrapper with
|   |                            # credentials, JSON headers, error
|   |                            # handling. All server calls go through
|   |                            # this module.
|   |
|   |-- config/
|   |   |-- defaults.ts          # Default site configuration: SiteConfig
|   |                            # TypeScript interface + fallback values
|   |                            # for all 14 settings keys.
|   |
|   |-- context/
|   |   |-- AuthContext.tsx       # Auth state: provides user, loading,
|   |   |                        # isAdmin, login(), register(), logout(),
|   |   |                        # refreshUser() to entire app tree.
|   |   |
|   |   |-- SiteConfigContext.tsx # Site config state: fetches config from
|   |                            # server, merges with defaults, provides
|   |                            # config + refreshConfig() to all pages.
|   |
|   |-- components/
|   |   |-- AdminGuard.tsx       # Route guard: redirects to /login if
|   |   |                        # user is not an admin.
|   |   |-- CarCard.tsx          # Car listing card: image, price, specs,
|   |   |                        # badges (S-Plus, Featured).
|   |   |-- SiteHeader.tsx       # Desktop navigation header.
|   |   |-- MobileNav.tsx        # Bottom tab bar for mobile screens.
|   |   |-- SiteFooter.tsx       # Footer with links, contact info.
|   |   |-- TrustBar.tsx         # Trust badges row (inspection, warranty).
|   |   |-- BookTestDriveModal.tsx  # Test drive booking form modal.
|   |   |-- ReserveCarModal.tsx  # Car reservation form modal.
|   |   |-- PriceRangeSlider.tsx # Interactive price range filter.
|   |
|   |-- pages/
|       |-- HomePage.tsx         # Landing page: hero, brands, budget
|       |                        # brackets, body types, fuel types,
|       |                        # featured listings, browse by city,
|       |                        # reviews, sell CTA.
|       |
|       |-- SearchPage.tsx       # Search & browse: filters sidebar,
|       |                        # listing grid, sort options.
|       |
|       |-- CarDetailPage.tsx    # Single car view: image gallery, specs,
|       |                        # condition, pricing, seller info.
|       |
|       |-- SPlusPage.tsx        # S-Plus premium pre-owned section.
|       |-- SPlusNewPage.tsx     # S-Plus new/unregistered/demo cars.
|       |
|       |-- LoginPage.tsx        # Login / register form.
|       |-- AdminPage.tsx        # Inventory dashboard: stats strip,
|       |                        # listing table, search, status filter.
|       |-- AdminCarFormPage.tsx # Add/edit car: comprehensive form with
|       |                        # all 190+ listing fields.
|       |-- AdminSettingsPage.tsx# 14-tab site settings editor.
|       |
|       |-- WishlistPage.tsx     # Saved cars (client-side storage).
|       |-- SellCarPage.tsx      # Sell your car inquiry form.
|       |-- AboutPage.tsx        # About the company.
|       |-- HowItWorksPage.tsx   # How the service works.
|       |-- FAQPage.tsx          # Frequently asked questions.
|       |-- ContactPage.tsx      # Contact information and form.
|
|-- uploads/                     # ---- UPLOADED FILES ----
|   |-- listings/
|       |-- 2025/
|           |-- 01/
|               |-- <uuid>-<name>.jpg
|
|-- dist/                        # ---- BUILD OUTPUT ----
|   |-- index.html               # Built SPA entry point
|   |-- assets/                  # Compiled JS + CSS bundles
|
|-- searchanycars.db             # ---- DATABASE FILE ----
                                 # Single SQLite file with all data
```

---

## 12. Technology Choices

Each technology was chosen for a specific reason. Here is every major piece,
what it does, and a real-world analogy.

### Backend

| Technology       | Version | What It Does                        | Analogy                                |
|------------------|---------|-------------------------------------|----------------------------------------|
| **Node.js**      | 18+     | Runs JavaScript on the server       | The engine of a car                    |
| **Express**      | 5.x     | Web framework for handling requests | The steering wheel and pedals          |
| **SQLite**       | via better-sqlite3 | Embedded database (single file) | A filing cabinet that never loses papers |
| **better-sqlite3** | 12.x  | Synchronous, fast SQLite driver     | The hand that opens the filing cabinet |
| **bcryptjs**     | 3.x     | Password hashing (12 salt rounds)   | A shredder that makes passwords unreadable |
| **jsonwebtoken** | 9.x     | Creates and verifies JWT tokens     | A tamper-proof concert wristband       |
| **cookie-parser**| 1.x     | Reads cookies from requests         | Reading the stamp on your hand at re-entry |
| **helmet**       | 8.x     | Sets security HTTP headers          | A helmet on a motorcycle rider         |
| **cors**         | 2.x     | Controls cross-origin access        | A bouncer checking the guest list      |
| **express-rate-limit** | 8.x | Limits requests per IP          | A queue manager at a busy counter      |
| **multer**       | 2.x     | Handles file uploads (images)       | The mailroom that receives packages    |
| **morgan**       | 1.x     | Logs HTTP requests                  | A security camera recording visitors   |
| **dotenv**       | 17.x   | Loads environment variables         | Reading the instruction manual at startup |

### Frontend

| Technology         | Version | What It Does                        | Analogy                               |
|--------------------|---------|-------------------------------------|---------------------------------------|
| **React**          | 19.x   | UI component library                | LEGO blocks for building interfaces   |
| **React Router**   | 7.x    | Client-side page navigation         | A GPS that changes the view without reloading |
| **TypeScript**     | 5.9    | Type-safe JavaScript                | Spell-check for code                  |
| **Vite**           | 8.x    | Build tool & dev server             | A fast oven that bakes the code       |
| **CSS (custom)**   | --      | Full design system, no framework    | Hand-tailored clothing, not off-the-rack |

### Design System

| Token            | Value           | Usage                              |
|------------------|-----------------|------------------------------------|
| Primary Navy     | `#1A237E`       | Header, buttons, text accents      |
| Primary Coral    | `#FF6B35`       | CTAs, highlights, badges           |
| Font Family      | Inter           | All text (with system fallbacks)   |
| Border Radius    | 6-24px          | Cards, buttons, inputs             |
| Shadow System    | sm/md/lg/xl     | Elevation for cards and modals     |

### Infrastructure

| Aspect               | Choice                    | Why                                        |
|----------------------|---------------------------|--------------------------------------------|
| Database             | SQLite (single file)      | Zero setup, no separate DB server needed   |
| File Storage         | Local filesystem          | Simple, no cloud dependency                |
| Image Organization   | `uploads/YYYY/MM/uuid`   | Prevents filename collisions, easy to find |
| API Style            | REST (JSON)               | Simple, widely understood                  |
| Session Storage      | Database-backed           | Survives server restarts                   |
| Real-time Updates    | SSE (not WebSocket)       | Simpler for one-way server-to-client push  |
| Auth Storage         | HTTP-only cookies         | Safer than localStorage (XSS-proof)        |
| Build Output         | Static files in `/dist`   | Served by same Express server              |
| Dev Workflow         | `dev:full` (concurrent)   | Vite HMR + Express server simultaneously   |

### NPM Scripts

| Script       | Command                     | Purpose                                   |
|--------------|-----------------------------|-------------------------------------------|
| `dev`        | `vite`                      | Start Vite dev server (frontend only)     |
| `server`     | `node server/index.js`      | Start Express server (backend only)       |
| `build`      | `vite build`                | Build production frontend to `dist/`      |
| `dev:full`   | `concurrently server + dev` | Run both frontend and backend together    |
| `start`      | `node server/index.js`      | Production start (serves built frontend)  |
| `lint`       | `eslint .`                  | Check code quality                        |
| `preview`    | `vite preview`              | Preview production build locally          |

---

## Summary

SearchAnyCars is a full-stack, single-server web application. The React
frontend communicates with an Express API that stores data in a SQLite
database file. Authentication uses JWT tokens in HTTP-only cookies with
automatic refresh token rotation. The admin dashboard provides 14 configurable
content sections that update the live site in real time via Server-Sent Events.
The entire application -- frontend, backend, database, and uploaded images --
runs on a single server with zero external service dependencies.
