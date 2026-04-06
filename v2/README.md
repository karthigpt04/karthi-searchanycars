# SearchAnyCars v2

A full-stack car marketplace built with **Next.js 15**, **Fastify 5**, **Drizzle ORM**, and **PostgreSQL**.

Browse, search, and buy certified pre-owned cars. Features include user auth, wishlist, test drive bookings, an admin dashboard for inventory/booking/settings management, and full SEO optimization.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| Backend | Fastify 5, Zod validation |
| Database | PostgreSQL, Drizzle ORM |
| Auth | JWT (access + refresh tokens), bcrypt, httpOnly cookies |
| Monorepo | pnpm workspaces, Turborepo |
| Testing | Vitest (638 tests) |
| Image Processing | Sharp |

## Project Structure

```
v2/
├── apps/
│   ├── api/              # Fastify REST API (37 endpoints)
│   │   └── src/
│   │       ├── routes/   # auth, listings, bookings, categories, favorites, uploads, site-config, admin-bookings, filters
│   │       ├── services/ # authService, emailService, sessionService, uploadService
│   │       └── plugins/  # auth middleware, health check
│   └── web/              # Next.js frontend (25 pages)
│       ├── app/          # App Router pages + SEO (sitemap, robots, icons)
│       └── src/          # Components, context, utils, API client
├── packages/
│   ├── db/               # Drizzle schema (10 tables), migrations, seed
│   ├── shared/           # Zod schemas shared between API and web
│   └── ui/               # Shared UI primitives
├── turbo.json
└── pnpm-workspace.yaml
```

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9 (`corepack enable && corepack prepare pnpm@latest --activate`)
- **PostgreSQL** >= 14 (running locally or via Docker)

## Getting Started

### 1. Clone and install dependencies

```bash
cd v2
pnpm install
```

### 2. Set up the database

Create a PostgreSQL database:

```bash
createdb searchanycars
```

### 3. Configure environment variables

Create `v2/apps/api/.env`:

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/searchanycars

# Optional (defaults shown)
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development

# JWT (change in production)
JWT_ACCESS_SECRET=dev-access-secret-change-me
JWT_REFRESH_SECRET=dev-refresh-secret-change-me

# Cookies
COOKIE_SECRET=dev-cookie-secret-change-me
COOKIE_SECURE=false

# SMTP (optional — emails are logged to console if not set)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=user@example.com
# SMTP_PASS=password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

Create `v2/apps/web/.env.local` (optional):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. Push the database schema and seed

```bash
# Push schema to database
pnpm --filter @searchanycars/db db:push

# Seed with sample data
pnpm --filter @searchanycars/db db:seed
```

### 5. Run in development

```bash
pnpm dev
```

This starts both services via Turborepo:
- **API** at [http://localhost:4000](http://localhost:4000)
- **Web** at [http://localhost:3000](http://localhost:3000)

### 6. Build for production

```bash
pnpm build
```

### 7. Start production servers

```bash
# API
pnpm --filter @searchanycars/api start

# Web
pnpm --filter @searchanycars/web start
```

## Running Tests

```bash
# Run all tests across all packages
pnpm test

# Run tests for a specific package
pnpm --filter @searchanycars/shared test
pnpm --filter @searchanycars/db test
pnpm --filter @searchanycars/api test
pnpm --filter @searchanycars/web test
```

**Test coverage:**

| Package | Tests | What's tested |
|---------|-------|--------------|
| `packages/shared` | 166 | Zod schema validation (listing, user, booking, category, common) |
| `packages/db` | 129 | Table structure, columns, constraints, FKs, indexes |
| `apps/api` | 237 | Config, errors, auth service, upload service, 124 integration tests |
| `apps/web` | 106 | Format utils, API client methods |
| **Total** | **638** | |

## Database Management

```bash
# Generate a new migration after schema changes
pnpm --filter @searchanycars/db db:generate

# Push schema directly (dev only — no migration file)
pnpm --filter @searchanycars/db db:push

# Open Drizzle Studio (visual DB browser)
pnpm --filter @searchanycars/db db:studio

# Re-seed the database
pnpm --filter @searchanycars/db db:seed
```

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/listings` | List/search cars (with filters, pagination) |
| GET | `/api/v1/listings/:id` | Get car details |
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/categories/:id/filters` | Get filters for a category |
| GET | `/api/v1/site-config` | Get all site configuration |
| GET | `/api/v1/site-config/:key` | Get a specific config key |
| GET | `/api/health` | Health check |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| POST | `/api/v1/auth/change-password` | Change password (authenticated) |

### User (authenticated)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/favorites` | Get user's favorite listing IDs |
| POST | `/api/v1/favorites/:listingId` | Add to favorites |
| DELETE | `/api/v1/favorites/:listingId` | Remove from favorites |
| PUT | `/api/v1/favorites` | Sync favorites (bulk) |
| GET | `/api/v1/bookings` | Get user's bookings |
| POST | `/api/v1/bookings` | Book a test drive |
| DELETE | `/api/v1/bookings/:id` | Cancel a booking |

### Admin (admin role required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/listings` | Create listing |
| PUT | `/api/v1/listings/:id` | Update listing |
| DELETE | `/api/v1/listings/:id` | Delete listing |
| GET | `/api/v1/admin/bookings` | List all bookings |
| PATCH | `/api/v1/admin/bookings/:id/status` | Update booking status |
| PUT | `/api/v1/site-config/:key` | Update site config |
| GET | `/api/v1/auth/users` | List all users |
| POST | `/api/v1/auth/users` | Create user |
| PUT | `/api/v1/auth/users/:id` | Update user |
| DELETE | `/api/v1/auth/users/:id` | Delete user |
| POST | `/api/v1/uploads/image` | Upload car image |

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage with featured cars, city browser, reviews |
| `/search` | Search/filter cars by brand, price, fuel, city, etc. |
| `/car/:id` | Car detail page with gallery, specs, booking |
| `/splus` | S-Plus premium pre-owned luxury collection |
| `/splus-new` | S-Plus new unregistered cars |
| `/sell` | Sell your car form |
| `/login` | Sign in / register |
| `/wishlist` | Saved cars |
| `/my-bookings` | User's test drive bookings |
| `/about` | About the company |
| `/how-it-works` | How buying works |
| `/faq` | Frequently asked questions |
| `/contact` | Contact form |
| `/admin` | Admin dashboard (inventory + bookings) |
| `/admin/car/new` | Add new car listing |
| `/admin/car/:id/edit` | Edit existing listing |
| `/admin/settings` | Site configuration (14 config tabs) |

## SEO

- Dynamic `<title>`, `<meta description>`, Open Graph, and Twitter Card tags on every page
- JSON-LD structured data: Organization, WebSite (with SearchAction), Vehicle, BreadcrumbList, FAQPage, ItemList
- Dynamic `sitemap.xml` with static pages + all active listings + brand/city search URLs
- `robots.txt` blocking admin/API/auth pages
- Canonical URLs on all public pages
- Dynamic favicon (navy "S")

## License

Private — all rights reserved.
