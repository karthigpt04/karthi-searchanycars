# SearchAnyCars

## Overview

SearchAnyCars is India's used car marketplace platform. Built with **React + Express + SQLite**, it delivers a complete buying and selling experience with an admin dashboard, multi-page mobile-optimized UI, JWT authentication, and real-time updates via Server-Sent Events (SSE).

## Features

### Browsing & Discovery
- Browse by **body type**, **brand**, **city**, **fuel type**, and **budget**
- Full-text **search** with multi-filter sidebar (mobile: slide-up drawer)
- Sort results by price (ascending/descending) or model year
- **S-Plus Premium** section — dark luxury theme for certified pre-owned cars
- **S-Plus New** section — emerald theme for unregistered / unused / demo cars
- **Browse by City** with landmark images and multi-select city filters

### Car Detail
- Image gallery with **touch swipe** support
- Categorized galleries: interior, exterior, engine, tires, damage
- **EMI calculator** and detailed specs table
- Book Test Drive and Reserve Car modals

### Selling
- **Sell Your Car** — 4-step wizard form

### User Features
- **Wishlist** saved to localStorage
- User registration and login
- Mobile bottom navigation bar

### Admin Dashboard
- **Inventory management** — create, edit, delete car listings
- **Image upload** via multer (local filesystem storage)
- **Site settings** — 14 configurable sections (see Admin Dashboard below)
- **User management** — create, list, update, delete users

### Authentication & Security
- Email/password authentication with **JWT** (access + refresh tokens)
- HTTP-only cookie-based token storage with refresh token rotation
- Admin role-based access control
- **Helmet** security headers
- **Rate limiting** (global + stricter auth-specific limits)
- **CORS** configuration
- **XSS protection** — HTML stripping on user-submitted text fields
- Graceful server shutdown (SIGTERM / SIGINT)

### Real-Time
- **Server-Sent Events (SSE)** — clients receive live config update notifications

### Responsive Design
- **Mobile-first** responsive design tested on viewports from 375px to 1280px

## Tech Stack

| Layer        | Technology                                                        |
|--------------|-------------------------------------------------------------------|
| Frontend     | React 19, React Router 7, TypeScript, Vite 8                     |
| Backend      | Express 5, Node.js (ESM)                                         |
| Database     | SQLite via better-sqlite3                                         |
| Auth         | JWT (jsonwebtoken), bcryptjs, HTTP-only cookies                   |
| Security     | Helmet, express-rate-limit, CORS, HTML sanitization               |
| File Upload  | Multer (memory storage, local filesystem)                         |
| Real-Time    | Server-Sent Events (SSE)                                          |
| Logging      | Morgan (request logging)                                          |
| Dev Tools    | Concurrently, ESLint, TypeScript-ESLint, Vite plugin React        |

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd searchanycars.com

# Install dependencies
npm install

# Start development (frontend + backend concurrently)
npm run dev:full

# Open in browser
# Frontend:  http://localhost:5173
# API:       http://localhost:4000
```

The database (`searchanycars.db`) is auto-created on first run with seed data including sample car listings and a default admin account.

## Running on Your Phone (Local Network)

1. Ensure your phone and computer are on the **same WiFi network**.
2. Find your computer's local IP address:
   - **macOS:** `ipconfig getifaddr en0`
   - **Linux:** `hostname -I`
   - **Windows:** `ipconfig` (look for IPv4 Address)
3. Open `http://<YOUR_IP>:5173` on your phone's browser.

> Vite's dev server binds to `0.0.0.0` by default so it is accessible on your local network.

## Production Mode

```bash
# Build the frontend
npm run build

# Start the production server (serves API + static frontend)
NODE_ENV=production node server/index.js

# Everything runs on http://localhost:4000
```

In production mode, Express serves the built `dist/` folder and handles SPA fallback routing.

## Default Admin Login

| Field    | Value                        |
|----------|------------------------------|
| Email    | `admin@searchanycars.com`    |
| Password | `admin123`                   |
| Login    | `/login`                     |
| Dashboard| `/admin`                     |

> Change the default credentials via the `ADMIN_DEFAULT_EMAIL` and `ADMIN_DEFAULT_PASSWORD` environment variables before deploying.

## Admin Dashboard

### Inventory Management (`/admin`)

- View all car listings with search and status filters
- Create new listings (`/admin/car/new`)
- Edit existing listings (`/admin/car/:id/edit`)
- Delete listings
- Upload images for each listing

### Site Settings (`/admin/settings`)

The site settings page has **14 configurable tabs**:

| # | Tab                 | What It Controls                                                 |
|---|---------------------|------------------------------------------------------------------|
| 1 | **Hero Section**    | Homepage hero title, subtitle                                    |
| 2 | **Trust Bar**       | Trust icons, labels, and colors shown below the hero             |
| 3 | **Cities**          | City names, slugs, listing counts, and landmark image URLs       |
| 4 | **Customer Reviews**| Reviewer name, city, car purchased, review text, and star rating |
| 5 | **Body Types**      | Body type names, emojis, and listing counts                      |
| 6 | **Fuel Types**      | Fuel type names, emojis, and listing counts                      |
| 7 | **Budget Brackets** | Budget range labels with min/max price values                    |
| 8 | **Navigation**      | Reorder, add, or remove header navigation links                  |
| 9 | **Footer**          | Brand text, column titles, and footer links                      |
| 10| **Sell CTA**        | "Sell Your Car" call-to-action title, description, button text   |
| 11| **S-Plus Banner**   | Badge text, title, description, and feature list                 |
| 12| **S-Plus New Banner**| Same as above, for the S-Plus New section                       |
| 13| **Contact Info**    | Phone number, WhatsApp number, email, and physical address       |
| 14| **Site Name**       | The global site/brand name                                       |

All site config changes are broadcast in real-time to connected clients via SSE.

### User Management

- Create user accounts (admin or regular role)
- List all registered users
- Update user name, role, or password
- Delete users (admins cannot delete themselves)
- API endpoints: `/api/auth/users`

## Project Structure

```
searchanycars.com/
├── src/                          # Frontend (React + TypeScript)
│   ├── api/client.ts             # API client with auth token handling
│   ├── components/               # Reusable UI components
│   │   ├── AdminGuard.tsx        # Route guard for admin pages
│   │   ├── BookTestDriveModal.tsx # Test drive booking modal
│   │   ├── CarCard.tsx           # Car listing card
│   │   ├── MobileNav.tsx         # Bottom navigation bar (mobile)
│   │   ├── PriceRangeSlider.tsx  # Price range filter slider
│   │   ├── ReserveCarModal.tsx   # Car reservation modal
│   │   ├── SiteFooter.tsx        # Global footer
│   │   ├── SiteHeader.tsx        # Global header / navbar
│   │   └── TrustBar.tsx          # Trust indicators bar
│   ├── config/defaults.ts        # Default site configuration values
│   ├── context/                  # React context providers
│   │   ├── AuthContext.tsx        # Authentication state
│   │   └── SiteConfigContext.tsx  # Site configuration state + SSE
│   ├── pages/                    # Page-level components
│   │   ├── AboutPage.tsx
│   │   ├── AdminCarFormPage.tsx  # Create / edit car form
│   │   ├── AdminPage.tsx         # Admin inventory dashboard
│   │   ├── AdminSettingsPage.tsx # Admin site settings (14 tabs)
│   │   ├── CarDetailPage.tsx     # Single car detail view
│   │   ├── ContactPage.tsx
│   │   ├── FAQPage.tsx
│   │   ├── HomePage.tsx          # Landing page
│   │   ├── HowItWorksPage.tsx
│   │   ├── LoginPage.tsx         # Login / register
│   │   ├── SPlusNewPage.tsx      # S-Plus New listings (emerald theme)
│   │   ├── SPlusPage.tsx         # S-Plus Premium listings (dark theme)
│   │   ├── SearchPage.tsx        # Search results with filters
│   │   ├── SellCarPage.tsx       # 4-step sell-your-car wizard
│   │   └── WishlistPage.tsx      # User wishlist (localStorage)
│   ├── utils/format.ts           # Number/currency formatting utilities
│   └── index.css                 # All application styles
├── server/                       # Backend (Express + SQLite)
│   ├── index.js                  # Main server — routes, middleware, startup
│   ├── config.js                 # Environment variable configuration
│   ├── db.js                     # SQLite database connection
│   ├── bootstrap.js              # Schema creation + seed data
│   ├── storage.js                # Image upload handler (local filesystem)
│   ├── middleware/
│   │   ├── auth.js               # extractUser, requireAuth, requireAdmin
│   │   ├── errorHandler.js       # Global error handler
│   │   ├── requestLogger.js      # Morgan request logging
│   │   └── security.js           # Helmet, CORS, rate limiting
│   ├── routes/
│   │   ├── auth.js               # Auth endpoints (login, register, etc.)
│   │   └── sse.js                # Server-Sent Events endpoint + broadcast
│   └── services/
│       ├── authService.js        # Password hashing, JWT, cookies
│       └── sessionService.js     # Refresh token session management
├── public/                       # Static assets served by Vite
├── dist/                         # Production build output (generated)
├── uploads/                      # Uploaded images (generated at runtime)
├── .env.example                  # Environment variable template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## API Reference

### Authentication

| Method   | Endpoint                 | Auth     | Description                     |
|----------|--------------------------|----------|---------------------------------|
| `POST`   | `/api/auth/register`     | Public   | Register a new user             |
| `POST`   | `/api/auth/login`        | Public   | Login and receive JWT tokens    |
| `POST`   | `/api/auth/refresh`      | Cookie   | Refresh access token            |
| `POST`   | `/api/auth/logout`       | Cookie   | Logout and clear session        |
| `GET`    | `/api/auth/me`           | User     | Get current user profile        |

### User Management (Admin)

| Method   | Endpoint                 | Auth     | Description                     |
|----------|--------------------------|----------|---------------------------------|
| `POST`   | `/api/auth/users`        | Admin    | Create a new user               |
| `GET`    | `/api/auth/users`        | Admin    | List all users                  |
| `PUT`    | `/api/auth/users/:id`    | Admin    | Update user name/role/password  |
| `DELETE` | `/api/auth/users/:id`    | Admin    | Delete a user                   |

### Listings

| Method   | Endpoint                 | Auth     | Description                     |
|----------|--------------------------|----------|---------------------------------|
| `GET`    | `/api/listings`          | Public   | List all cars (supports filters and sorting) |
| `GET`    | `/api/listings/:id`      | Public   | Get a single car listing        |
| `POST`   | `/api/listings`          | Admin    | Create a new listing            |
| `PUT`    | `/api/listings/:id`      | Admin    | Update an existing listing      |
| `DELETE` | `/api/listings/:id`      | Admin    | Delete a listing                |

**Listing query parameters:** `search`, `categoryId`, `brand`, `fuel_type`, `transmission_type`, `ownership_type`, `seller_type`, `location_city`, `model_year_min`, `model_year_max`, `listing_price_min`, `listing_price_max`, `total_km_driven_max`, `listing_status`, `is_splus`, `is_new_car`, `new_car_type`, `sortBy` (`priceAsc` | `priceDesc`).

### Categories

| Method   | Endpoint                 | Auth     | Description                     |
|----------|--------------------------|----------|---------------------------------|
| `GET`    | `/api/categories`        | Public   | List all vehicle categories     |
| `POST`   | `/api/categories`        | Admin    | Create a category               |
| `PUT`    | `/api/categories/:id`    | Admin    | Update a category               |
| `DELETE` | `/api/categories/:id`    | Admin    | Delete a category               |

### Filters

| Method   | Endpoint                              | Auth     | Description                          |
|----------|---------------------------------------|----------|--------------------------------------|
| `GET`    | `/api/filter-definitions`             | Public   | List all filter definitions          |
| `GET`    | `/api/category-filters/:categoryId`   | Public   | Get filters for a specific category  |
| `PUT`    | `/api/category-filters/:categoryId`   | Admin    | Update category filter assignments   |

### Site Configuration

| Method   | Endpoint                 | Auth     | Description                     |
|----------|--------------------------|----------|---------------------------------|
| `GET`    | `/api/site-config`       | Public   | Get all site configuration      |
| `GET`    | `/api/site-config/:key`  | Public   | Get a single config value       |
| `PUT`    | `/api/site-config/:key`  | Admin    | Update a config value (broadcasts SSE) |

### Other

| Method   | Endpoint                 | Auth     | Description                     |
|----------|--------------------------|----------|---------------------------------|
| `GET`    | `/api/health`            | Public   | Health check                    |
| `GET`    | `/api/events`            | Public   | SSE stream for real-time updates|
| `POST`   | `/api/uploads/image`     | Admin    | Upload an image file            |

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable                  | Default                                      | Description                                  |
|---------------------------|----------------------------------------------|----------------------------------------------|
| `VITE_API_URL`            | `http://localhost:4000/api`                  | Frontend API base URL                        |
| `PORT`                    | `4000`                                       | Backend server port                          |
| `NODE_ENV`                | `development`                                | Environment (`development` or `production`)  |
| `CORS_ORIGINS`            | `http://localhost:5173`                      | Comma-separated allowed origins              |
| `DATABASE_PATH`           | `./searchanycars.db`                         | SQLite database file path                    |
| `UPLOADS_DIR`             | `./uploads`                                  | Directory for uploaded images                |
| `MAX_IMAGE_SIZE_BYTES`    | `6291456` (6 MB)                             | Maximum image upload size                    |
| `JWT_ACCESS_SECRET`       | dev default (change in production)           | Secret for signing access tokens             |
| `JWT_REFRESH_SECRET`      | dev default (change in production)           | Secret for signing refresh tokens            |
| `JWT_ACCESS_EXPIRY`       | `15m`                                        | Access token lifetime                        |
| `JWT_REFRESH_EXPIRY`      | `7d`                                         | Refresh token lifetime                       |
| `ADMIN_DEFAULT_EMAIL`     | `admin@searchanycars.com`                    | Default admin account email                  |
| `ADMIN_DEFAULT_PASSWORD`  | `admin123`                                   | Default admin account password               |
| `COOKIE_SECURE`           | `false`                                      | Set to `true` for HTTPS-only cookies         |
| `COOKIE_DOMAIN`           | (none)                                       | Cookie domain scope                          |
| `CSRF_SECRET`             | dev default (change in production)           | CSRF token signing secret                    |
| `RATE_LIMIT_WINDOW_MS`    | `900000` (15 min)                            | Rate limit window in milliseconds            |
| `RATE_LIMIT_MAX`          | `200`                                        | Max requests per window                      |

## Security

- **Helmet** — sets secure HTTP headers (X-Frame-Options, Strict-Transport-Security, etc.)
- **CORS** — configurable allowed origins via `CORS_ORIGINS`
- **Rate Limiting** — global limit of 200 requests per 15 minutes on all `/api/` routes; stricter limit of 20 requests per 15 minutes on auth endpoints (login, register)
- **JWT with HTTP-only Cookies** — tokens are never exposed to client-side JavaScript
- **Refresh Token Rotation** — old refresh tokens are invalidated on each refresh
- **Password Hashing** — bcryptjs with automatic salting
- **XSS Prevention** — HTML tags are stripped from user-submitted text fields before database storage
- **Input Validation** — required fields, type checks, and size limits enforced on all write endpoints
- **Admin Role Enforcement** — middleware guards on all administrative endpoints
- **Graceful Shutdown** — SIGTERM/SIGINT handlers close HTTP server and database connection cleanly

## Browser Support

Tested on:
- **Chrome** (desktop and Android)
- **Safari** (iOS)
- **Firefox** (desktop)

Viewports: **375px** (mobile) through **1280px** (desktop).

## Scripts

| Script         | Command                    | Description                                       |
|----------------|----------------------------|---------------------------------------------------|
| `dev`          | `npm run dev`              | Start Vite dev server (frontend only, port 5173)  |
| `server`       | `npm run server`           | Start Express backend (port 4000)                 |
| `dev:full`     | `npm run dev:full`         | Start frontend + backend concurrently             |
| `build`        | `npm run build`            | Build frontend for production (`dist/`)           |
| `start`        | `npm run start`            | Start production server (serves API + built frontend) |
| `lint`         | `npm run lint`             | Run ESLint across the project                     |
| `preview`      | `npm run preview`          | Preview the production build via Vite             |
