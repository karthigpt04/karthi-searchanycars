# CLAUDE.md — Step 02: Database Schema + Shared Types

## Project context

You are continuing the **SearchAnyCars.com v2** rebuild. Step 01 (monorepo scaffold) is complete. The v2 code lives in `/v2/`. The old v1 code at `/searchanycars.com/` is READ-ONLY reference.

This step sets up the database layer: Drizzle ORM schema for PostgreSQL, Zod validation schemas for shared types, and seed data for development.

---

## Reference: Old database schema

Read `/searchanycars.com/server/bootstrap.js` — it contains all the SQLite CREATE TABLE statements. The old schema has 10 tables, but the listings table has 193 columns. **Do NOT port all 193 columns.** The API only uses ~45 columns (check `listingUpsertColumns` in `/searchanycars.com/server/index.js`). Port only the columns that are actually used + a `specs_json` JSONB field for future extensibility.

Also read `/searchanycars.com/src/config/defaults.ts` for seed data (categories, filter definitions, budget brackets, brands, cities, sample listings).

---

## What you are building in this step

1. **Drizzle ORM schema** in `v2/packages/db/` — 9 PostgreSQL tables
2. **Zod validation schemas** in `v2/packages/shared/` — request/response validation for every entity
3. **TypeScript types** — inferred from Zod schemas (single source of truth)
4. **Database connection** — PostgreSQL via `postgres` driver with Drizzle
5. **Migration tooling** — Drizzle Kit for generating and running migrations
6. **Seed script** — populates development database with categories, filters, and 10 sample car listings

---

## Success criteria

1. `cd v2/packages/db && pnpm db:generate` creates migration SQL files without errors
2. `cd v2/packages/db && pnpm db:push` applies schema to a local or cloud PostgreSQL database
3. `cd v2/packages/db && pnpm db:seed` populates the database with seed data
4. `cd v2 && pnpm build` still passes with zero errors
5. Importing `@searchanycars/shared` from `apps/api` gives access to all Zod schemas and inferred types
6. Importing `@searchanycars/db` from `apps/api` gives access to the Drizzle client and table schemas
7. `/searchanycars.com/` folder remains untouched

---

## Database: PostgreSQL tables (9 tables)

### Table 1: `categories`

| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| name | varchar(100) | NOT NULL, UNIQUE |
| slug | varchar(100) | NOT NULL, UNIQUE |
| vehicle_type | varchar(100) | NOT NULL |
| description | text | DEFAULT '' |
| created_at | timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | NOT NULL, DEFAULT now() |

### Table 2: `filter_definitions`

| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| key | varchar(100) | NOT NULL, UNIQUE |
| label | varchar(100) | NOT NULL |
| type | varchar(20) | NOT NULL (text/number/select) |
| options | jsonb | NOT NULL, DEFAULT '[]' |

### Table 3: `category_filter_map`

| Column | Type | Constraints |
|--------|------|------------|
| category_id | integer | NOT NULL, FK → categories(id) ON DELETE CASCADE |
| filter_id | integer | NOT NULL, FK → filter_definitions(id) ON DELETE CASCADE |
| PRIMARY KEY | (category_id, filter_id) | composite |

### Table 4: `listings`

This is the core table. Port ONLY the columns that the API actually uses (from `listingUpsertColumns` in the old `server/index.js`) plus essential metadata columns. Use a `specs` JSONB column for all the 150+ feature flags (airbags, sunroof, etc.) instead of individual boolean columns.

| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| category_id | integer | FK → categories(id) ON DELETE SET NULL |
| listing_code | varchar(50) | NOT NULL, UNIQUE |
| title | varchar(300) | NOT NULL |
| brand | varchar(100) | NOT NULL |
| model | varchar(100) | NOT NULL |
| variant | varchar(200) | DEFAULT '' |
| model_year | integer | |
| registration_year | integer | |
| vehicle_type | varchar(50) | |
| body_style | varchar(50) | |
| exterior_color | varchar(50) | |
| interior_color | varchar(50) | |
| listing_price_inr | integer | NOT NULL, DEFAULT 0 |
| negotiable | boolean | NOT NULL, DEFAULT false |
| estimated_market_value_inr | integer | |
| ownership_type | varchar(20) | (First/Second/Third/Fourth+) |
| seller_type | varchar(30) | (Dealer/Individual/Certified Dealer) |
| registration_state | varchar(100) | |
| registration_city | varchar(100) | |
| total_km_driven | integer | |
| mileage_kmpl | real | |
| engine_type | varchar(100) | |
| engine_capacity_cc | integer | |
| power_bhp | integer | |
| transmission_type | varchar(20) | (Manual/Automatic/CVT/DCT/AMT) |
| fuel_type | varchar(20) | (Petrol/Diesel/Electric/Hybrid/CNG/LPG) |
| battery_capacity_kwh | real | |
| overall_condition_rating | real | |
| service_history_available | boolean | DEFAULT false |
| airbags_count | integer | |
| infotainment_screen_size | varchar(20) | |
| location_city | varchar(100) | |
| location_state | varchar(100) | |
| dealer_rating | real | |
| inspection_status | varchar(30) | |
| inspection_score | real | |
| listing_status | varchar(20) | NOT NULL, DEFAULT 'Active' |
| featured_listing | boolean | NOT NULL, DEFAULT false |
| is_splus | boolean | NOT NULL, DEFAULT false |
| is_new_car | boolean | NOT NULL, DEFAULT false |
| new_car_type | varchar(30) | |
| views_count | integer | DEFAULT 0 |
| favorites_count | integer | DEFAULT 0 |
| lead_count | integer | DEFAULT 0 |
| promotion_tier | varchar(20) | |
| images | jsonb | NOT NULL, DEFAULT '[]' |
| interior_images | jsonb | NOT NULL, DEFAULT '[]' |
| exterior_images | jsonb | NOT NULL, DEFAULT '[]' |
| engine_images | jsonb | NOT NULL, DEFAULT '[]' |
| tire_images | jsonb | NOT NULL, DEFAULT '[]' |
| damage_images | jsonb | NOT NULL, DEFAULT '[]' |
| additional_notes | text | |
| specs | jsonb | NOT NULL, DEFAULT '{}' |
| created_at | timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | NOT NULL, DEFAULT now() |

**Indexes on listings:**
- `idx_listings_brand` on (brand)
- `idx_listings_location_city` on (location_city)
- `idx_listings_listing_status` on (listing_status)
- `idx_listings_price` on (listing_price_inr)
- `idx_listings_category` on (category_id)
- `idx_listings_featured` on (featured_listing) WHERE featured_listing = true
- `idx_listings_splus` on (is_splus) WHERE is_splus = true

**Full-text search index** (PostgreSQL-specific):
Create a generated tsvector column or a GIN index on `to_tsvector('english', title || ' ' || brand || ' ' || model || ' ' || coalesce(location_city, ''))` for fast search.

### Table 5: `users`

| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| email | varchar(255) | UNIQUE |
| phone | varchar(20) | UNIQUE |
| name | varchar(200) | NOT NULL, DEFAULT '' |
| password_hash | text | |
| role | varchar(10) | NOT NULL, DEFAULT 'user', CHECK (admin/user) |
| google_id | varchar(255) | UNIQUE |
| phone_verified | boolean | NOT NULL, DEFAULT false |
| email_verified | boolean | NOT NULL, DEFAULT false |
| avatar_url | text | |
| created_at | timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | NOT NULL, DEFAULT now() |

### Table 6: `sessions`

| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| user_id | integer | NOT NULL, FK → users(id) ON DELETE CASCADE |
| refresh_token | text | NOT NULL, UNIQUE |
| expires_at | timestamp | NOT NULL |
| ip_address | varchar(45) | |
| user_agent | text | |
| created_at | timestamp | NOT NULL, DEFAULT now() |

### Table 7: `password_reset_tokens`

| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| user_id | integer | NOT NULL, FK → users(id) ON DELETE CASCADE |
| token | text | NOT NULL, UNIQUE |
| expires_at | timestamp | NOT NULL |
| used | boolean | NOT NULL, DEFAULT false |
| created_at | timestamp | NOT NULL, DEFAULT now() |

### Table 8: `user_favorites`

| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| user_id | integer | NOT NULL, FK → users(id) ON DELETE CASCADE |
| listing_id | integer | NOT NULL, FK → listings(id) ON DELETE CASCADE |
| created_at | timestamp | NOT NULL, DEFAULT now() |
| UNIQUE | (user_id, listing_id) | |

### Table 9: `test_drive_bookings`

| Column | Type | Constraints |
|--------|------|------------|
| id | serial | PRIMARY KEY |
| user_id | integer | NOT NULL, FK → users(id) ON DELETE CASCADE |
| listing_id | integer | NOT NULL, FK → listings(id) ON DELETE CASCADE |
| car_title | varchar(300) | NOT NULL, DEFAULT '' |
| name | varchar(200) | NOT NULL |
| phone | varchar(20) | NOT NULL |
| email | varchar(255) | |
| preferred_date | varchar(20) | |
| preferred_time | varchar(20) | |
| location_preference | varchar(20) | DEFAULT 'hub' |
| notes | text | |
| status | varchar(20) | NOT NULL, DEFAULT 'pending', CHECK (pending/confirmed/completed/cancelled) |
| created_at | timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | NOT NULL, DEFAULT now() |

### Site config table (Table 10):

| Column | Type | Constraints |
|--------|------|------------|
| key | varchar(100) | PRIMARY KEY |
| value | jsonb | NOT NULL, DEFAULT '{}' |
| updated_at | timestamp | NOT NULL, DEFAULT now() |

---

## Files to create / modify

### `v2/packages/db/src/schema.ts`

Define all 10 tables using Drizzle's `pgTable` function. Use proper PostgreSQL types (serial, varchar, integer, boolean, jsonb, timestamp). Define all indexes. Define all foreign key relations using Drizzle's `relations()`.

### `v2/packages/db/src/index.ts`

Export the Drizzle client instance and all table schemas. The client should use `postgres` (the `postgres` npm package, NOT `pg`) as the driver. Connection URL comes from `DATABASE_URL` env var.

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export * from './schema.js';
```

### `v2/packages/db/drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### `v2/packages/db/package.json` — Add scripts

Add these scripts to the existing package.json:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/seed.ts",
    "lint": "echo 'db: no lint configured yet'",
    "build": "echo 'db: consumed via transpilePackages — no build needed'"
  }
}
```

### `v2/packages/db/src/seed.ts`

Seed script that populates the database for development. Port the seed data from:
- Categories: read `defaultCategories` from `/searchanycars.com/server/bootstrap.js` (8 categories: Hatchback, Sedan, SUV, MUV, Coupe, Pickup, Luxury Sedan, Luxury SUV)
- Filter definitions: read `defaultFilterDefinitions` from the same file (13 filters)
- Category-filter map: all categories get all filters
- Sample listings: port at least the first 5 sample listings from the `sampleListings` array in bootstrap.js, adapting the data to the new schema (images as JSONB arrays, specs as JSONB object)
- Admin user: create a default admin with email `admin@searchanycars.com` and a bcrypt-hashed password (use the same `bcryptjs` library)
- Site config: port the `defaultConfig` from `/searchanycars.com/src/config/defaults.ts` as key-value pairs

The seed script must be idempotent — running it multiple times should not create duplicates (use upsert or check-before-insert).

### `v2/packages/shared/src/index.ts`

Export all Zod schemas and inferred TypeScript types.

### `v2/packages/shared/src/schemas/listing.ts`

Zod schemas for listing:
- `listingSchema` — full listing type (matches DB row)
- `createListingSchema` — input validation for POST (required: listingCode, title, brand, model)
- `updateListingSchema` — partial input for PUT
- `listingFilterSchema` — query param validation for GET /listings (search, brand, fuel_type, etc.)
- Inferred types: `Listing`, `CreateListingInput`, `UpdateListingInput`, `ListingFilter`

### `v2/packages/shared/src/schemas/user.ts`

- `registerSchema` — { email, password (min 6), name }
- `loginSchema` — { email, password }
- `forgotPasswordSchema` — { email }
- `resetPasswordSchema` — { token, password }
- `changePasswordSchema` — { currentPassword, newPassword }
- Inferred types for each

### `v2/packages/shared/src/schemas/booking.ts`

- `createBookingSchema` — { listingId, name, phone, email?, preferredDate?, preferredTime?, locationPreference?, notes? }
- `updateBookingStatusSchema` — { status: enum(pending/confirmed/completed/cancelled) }
- Inferred types

### `v2/packages/shared/src/schemas/category.ts`

- `createCategorySchema` — { name, slug, vehicleType, description? }
- `updateCategorySchema` — same fields, partial
- Inferred types

### `v2/packages/shared/src/schemas/common.ts`

- `paginationSchema` — { page?, limit?, cursor? } for paginated queries
- `idParamSchema` — { id: z.coerce.number().int().positive() }

---

## Environment setup

The agent must handle the database connection. Two options:

**Option A (recommended for development):** Use a free cloud PostgreSQL:
- Railway: `railway add --plugin postgresql` → gets `DATABASE_URL`
- Neon: free tier at neon.tech
- Supabase: free tier

**Option B (local):** If PostgreSQL is installed locally:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/searchanycars
```

Create a `.env` file in `v2/packages/db/` with the `DATABASE_URL`. Add `.env` to `.gitignore` (should already be there from step 01).

---

## Verification steps

```bash
cd v2

# 1. Install any new dependencies
pnpm install

# 2. Generate migration files
cd packages/db
pnpm db:generate

# 3. Push schema to database
pnpm db:push

# 4. Run seed script
pnpm db:seed

# 5. Verify with Drizzle Studio (opens a UI to browse the database)
pnpm db:studio
# → verify all tables exist
# → verify seed data is present (8 categories, 13 filters, 5+ listings, 1 admin user)

# 6. Go back to root and verify full build
cd ../..
pnpm build

# 7. Verify imports work — the api app should be able to import from @searchanycars/db and @searchanycars/shared
```

---

## What NOT to do

- Do NOT create 193 columns on the listings table — use only the ~50 columns specified above + specs JSONB
- Do NOT modify any files in `/searchanycars.com/`
- Do NOT add API routes (that's step 03)
- Do NOT modify `apps/web` or `apps/api` source code beyond what's needed for imports to work
- Do NOT hardcode the DATABASE_URL — always read from env var
- Do NOT use `pg` package — use `postgres` (postgres.js) as the driver for Drizzle

---

## Notes for next step

After this step, `03-api-core-auth.md` will:
- Build the Fastify auth system using the users/sessions tables from this schema
- Add JWT dual auth (cookie for web, Bearer for mobile)
- Wire up Redis for session caching
- Use the Zod schemas from packages/shared for request validation