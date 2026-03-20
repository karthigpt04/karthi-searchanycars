# SearchAnyCars.com -- Database & Real-Time Architecture Plan

> Produced 2026-03-18. Based on audit of the current codebase: 4 SQLite tables
> (`categories`, `filter_definitions`, `category_filter_map`, `listings` with
> 140+ columns), Express 5 API in `server/index.js`, `better-sqlite3` driver,
> local-filesystem image storage, React 19 + Vite 8 frontend.

---

## Table of Contents

1. [Database Migration: SQLite to PostgreSQL](#1-database-migration-sqlite-to-postgresql)
2. [Complete Database Schema Design](#2-complete-database-schema-design)
3. [Caching Layer: Redis](#3-caching-layer-redis)
4. [Real-Time Architecture](#4-real-time-architecture)
5. [Search Architecture](#5-search-architecture)
6. [File Storage & CDN](#6-file-storage--cdn)

---

## 1. Database Migration: SQLite to PostgreSQL

### 1.1 Why PostgreSQL

| Capability | SQLite (current) | PostgreSQL (target) |
|---|---|---|
| **Concurrent writes** | Single-writer lock; WAL mode helps reads but writes are serialized | MVCC -- thousands of concurrent read/write transactions |
| **JSON storage** | `TEXT` columns with `JSON()` functions (limited) | Native `JSONB` with GIN indexes, containment operators (`@>`), path queries |
| **Full-text search** | No native FTS unless FTS5 extension compiled in | Built-in `tsvector`/`tsquery`, weighted ranking, dictionaries, GIN indexes |
| **Geospatial** | None | PostGIS extension: `GEOGRAPHY`, spatial indexes, `ST_DWithin`, `ST_Distance` |
| **ACID at scale** | ACID but single-file; no replication | Full ACID, streaming replication, logical replication |
| **Data types** | 5 storage classes only | `BOOLEAN`, `NUMERIC(12,2)`, `TIMESTAMPTZ`, `UUID`, `INET`, `JSONB`, arrays, enums |
| **Connection pooling** | N/A (in-process) | pgBouncer / `pg-pool` for thousands of connections |
| **Partitioning** | None | Declarative range/list/hash partitioning (for `page_views`, `audit_logs`) |

### 1.2 Migration Strategy

#### Phase 1 -- Schema Translation (zero-downtime prep)

```
SQLite Type       -->  PostgreSQL Type
-------------------------------------------------
INTEGER PK AUTO   -->  SERIAL  (or BIGSERIAL for listings/page_views)
TEXT              -->  VARCHAR(n), TEXT, or TIMESTAMPTZ (for dates)
REAL              -->  NUMERIC(12,2) for money, REAL for ratings
INTEGER 0/1       -->  BOOLEAN
TEXT JSON          -->  JSONB
TEXT dates         -->  TIMESTAMPTZ
```

Key transformations for the existing `listings` table:
- All `_inr` money columns: `REAL` --> `NUMERIC(12,2)` (prevents floating-point rounding)
- All boolean-like integers (`negotiable`, `loan_available`, `abs`, `ebd`, ...): `INTEGER DEFAULT 0` --> `BOOLEAN NOT NULL DEFAULT FALSE`
- All date strings (`registration_valid_till`, `insurance_valid_till`, `created_at`, ...): `TEXT` --> `TIMESTAMPTZ` or `DATE`
- All JSON text columns (`images_json`, `specs_json`, ...): `TEXT` --> `JSONB`
- Add `location_point GEOGRAPHY(Point, 4326)` via PostGIS for geo-queries

#### Phase 2 -- Data Migration

```bash
# 1. Export from SQLite
sqlite3 searchanycars.db ".mode csv" ".headers on" ".output listings.csv" "SELECT * FROM listings;"
# Repeat for categories, filter_definitions, category_filter_map

# 2. Transform with a Node.js migration script
#    - Convert 0/1 to true/false for booleans
#    - Parse date strings into ISO 8601
#    - Validate JSON columns parse correctly
#    - Generate location_point from location_city/location_state via geocoding API

# 3. Load into PostgreSQL
psql -c "\COPY listings FROM 'listings_transformed.csv' WITH CSV HEADER;"

# 4. Reset sequences
SELECT setval('listings_id_seq', (SELECT MAX(id) FROM listings));
```

#### Phase 3 -- Application Cut-over

Replace `better-sqlite3` with `pg` (node-postgres) + a thin query-builder layer:

```
Current:  db.prepare('SELECT ...').all(...)
Target:   pool.query('SELECT ...', [...params])
```

### 1.3 Connection Pooling

**Recommended: pgBouncer in transaction mode** in front of PostgreSQL.

```
Application (Node.js)
    |
    |-- pg-pool (min: 5, max: 20 per Node process)
    |
pgBouncer (max_client_conn: 2000, default_pool_size: 50)
    |
PostgreSQL (max_connections: 200)
```

- Node.js `pg-pool` config: `{ min: 5, max: 20, idleTimeoutMillis: 30000 }`
- pgBouncer sits on the same host as PostgreSQL or as a sidecar in Kubernetes
- Transaction-pooling mode allows connection reuse between statements

### 1.4 Read Replicas

```
                    ┌──────────────┐
   Writes --------->│  PG Primary  │
                    └──────┬───────┘
                           │ Streaming replication
              ┌────────────┼────────────┐
              v            v            v
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │Replica 1│ │Replica 2│ │Replica 3│
         └─────────┘ └─────────┘ └─────────┘
              ^            ^            ^
              └────────────┼────────────┘
                    Read queries
                  (search, browse,
                   analytics, reports)
```

- All `GET /api/listings`, search queries, and analytics reads go to replicas
- All writes (INSERT/UPDATE/DELETE), bookings, payments go to primary
- Application-level routing: use a read/write splitting wrapper around `pg-pool`

### 1.5 Backup Strategy

| Method | Frequency | Retention | Purpose |
|---|---|---|---|
| `pg_dump --format=custom` | Daily at 02:00 UTC | 30 days on S3 | Full logical backup; allows table-level restore |
| Continuous WAL archiving to S3 | Continuous (via `archive_command` or `pgBackRest`) | 7 days | Point-in-time recovery (PITR) to any second |
| Replica snapshot | Weekly | 4 weeks | Disaster recovery; can promote to primary |

```bash
# pg_dump cron (runs on replica to avoid primary load)
0 2 * * * pg_dump -h replica1 -Fc searchanycars | aws s3 cp - s3://sac-backups/pg/$(date +\%Y\%m\%d).dump

# WAL archiving in postgresql.conf
archive_mode = on
archive_command = 'pgbackrest --stanza=sac archive-push %p'
```

---

## 2. Complete Database Schema Design

### 2.1 Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram similarity for fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- GIN indexes on scalar types
```

### 2.2 Custom ENUM Types

```sql
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'dealer', 'admin', 'superadmin');
CREATE TYPE listing_status AS ENUM ('Draft', 'PendingApproval', 'Active', 'Sold', 'Reserved', 'Expired', 'Rejected', 'Archived');
CREATE TYPE booking_type AS ENUM ('test_drive', 'reservation', 'purchase');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_status AS ENUM ('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE payment_gateway AS ENUM ('razorpay', 'phonepe', 'paytm', 'manual');
CREATE TYPE dealer_status AS ENUM ('pending', 'active', 'suspended', 'rejected');
CREATE TYPE notification_type AS ENUM (
  'price_drop', 'new_match', 'booking_confirmed', 'booking_cancelled',
  'payment_received', 'payment_refunded', 'message_received',
  'review_approved', 'listing_approved', 'listing_rejected', 'system'
);
```

---

### 2.3 `users`

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  phone         VARCHAR(15) UNIQUE,                -- E.164 format: +919876543210
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,             -- bcrypt/argon2 hash
  name          VARCHAR(150) NOT NULL,
  role          user_role NOT NULL DEFAULT 'buyer',
  avatar_url    TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  location_point GEOGRAPHY(Point, 4326),           -- PostGIS for "near me"
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_email ON users (email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_city ON users (city);
CREATE INDEX idx_users_location ON users USING GIST (location_point);
```

---

### 2.4 `sessions`

```sql
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,          -- SHA-256 of session token
  device_info JSONB DEFAULT '{}',                   -- {ua, os, browser, device_type}
  ip          INET,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_token_hash ON sessions (token_hash);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);
```

---

### 2.5 `dealers`

```sql
CREATE TABLE dealers (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name   VARCHAR(255) NOT NULL,
  business_type   VARCHAR(50),                      -- 'individual_dealer', 'showroom', 'multi_brand'
  gstin           VARCHAR(15),                      -- GST number
  pan             VARCHAR(10),
  contact_phone   VARCHAR(15),
  contact_email   VARCHAR(255),
  address_line1   TEXT,
  address_line2   TEXT,
  city            VARCHAR(100) NOT NULL,
  state           VARCHAR(100) NOT NULL,
  pincode         VARCHAR(10),
  location_point  GEOGRAPHY(Point, 4326),
  logo_url        TEXT,
  rating          NUMERIC(2,1) DEFAULT 0.0,          -- 0.0 - 5.0
  review_count    INTEGER NOT NULL DEFAULT 0,
  commission_rate NUMERIC(4,2) NOT NULL DEFAULT 2.50, -- percentage
  status          dealer_status NOT NULL DEFAULT 'pending',
  verified_at     TIMESTAMPTZ,
  verified_by     BIGINT REFERENCES users(id),
  metadata        JSONB DEFAULT '{}',               -- flexible fields: years_in_business, specializations
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dealers_user_id ON dealers (user_id);
CREATE INDEX idx_dealers_city ON dealers (city);
CREATE INDEX idx_dealers_status ON dealers (status);
CREATE INDEX idx_dealers_location ON dealers USING GIST (location_point);
CREATE INDEX idx_dealers_rating ON dealers (rating DESC);
```

---

### 2.6 `categories` (migrated)

```sql
CREATE TABLE categories (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL UNIQUE,
  slug         VARCHAR(100) NOT NULL UNIQUE,
  vehicle_type VARCHAR(100) NOT NULL,
  description  TEXT DEFAULT '',
  icon_url     TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories (slug);
CREATE INDEX idx_categories_active ON categories (is_active) WHERE is_active = TRUE;
```

---

### 2.7 `filter_definitions` (migrated)

```sql
CREATE TABLE filter_definitions (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(100) NOT NULL UNIQUE,
  label       VARCHAR(150) NOT NULL,
  type        VARCHAR(20) NOT NULL,                -- 'text', 'number', 'select', 'range', 'boolean'
  options     JSONB NOT NULL DEFAULT '[]',         -- was TEXT options_json
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);
```

---

### 2.8 `category_filter_map` (migrated)

```sql
CREATE TABLE category_filter_map (
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  filter_id   INTEGER NOT NULL REFERENCES filter_definitions(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, filter_id)
);

CREATE INDEX idx_cfm_category ON category_filter_map (category_id);
CREATE INDEX idx_cfm_filter ON category_filter_map (filter_id);
```

---

### 2.9 `listings` (migrated + enhanced)

The existing 140+ column table migrated with type corrections, plus new columns for
dealer association, approval workflow, and price history.

```sql
CREATE TABLE listings (
  id                          BIGSERIAL PRIMARY KEY,
  category_id                 INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  dealer_id                   BIGINT REFERENCES dealers(id) ON DELETE SET NULL,  -- NEW: dealer FK
  listing_code                VARCHAR(20) NOT NULL UNIQUE,
  title                       VARCHAR(300) NOT NULL,
  brand                       VARCHAR(100) NOT NULL,
  model                       VARCHAR(100) NOT NULL,
  variant                     VARCHAR(150) DEFAULT '',
  model_year                  SMALLINT,
  registration_year           SMALLINT,
  vehicle_type                VARCHAR(50),
  body_style                  VARCHAR(50),
  exterior_color              VARCHAR(50),
  interior_color              VARCHAR(50),
  vin                         VARCHAR(20),
  engine_number               VARCHAR(30),
  registration_number_masked  VARCHAR(20),

  -- Pricing (all NUMERIC for financial precision)
  listing_price_inr           NUMERIC(12,2) NOT NULL,
  negotiable                  BOOLEAN NOT NULL DEFAULT FALSE,
  original_onroad_price_inr   NUMERIC(12,2),
  estimated_market_value_inr  NUMERIC(12,2),
  minimum_expected_price_inr  NUMERIC(12,2),
  price_per_km_inr            NUMERIC(8,2),
  emi_estimate_inr_month      NUMERIC(10,2),
  down_payment_estimate_inr   NUMERIC(12,2),
  loan_available              BOOLEAN DEFAULT FALSE,
  loan_interest_rate          NUMERIC(4,2),
  insurance_cost_estimate_inr NUMERIC(10,2),
  annual_maintenance_cost_inr NUMERIC(10,2),
  transfer_charges_inr        NUMERIC(10,2),
  rc_transfer_cost_inr        NUMERIC(10,2),
  documentation_charges_inr   NUMERIC(10,2),
  dealer_fees_inr             NUMERIC(10,2),
  delivery_charges_inr        NUMERIC(10,2),
  inspection_charges_inr      NUMERIC(10,2),
  extended_warranty_cost_inr  NUMERIC(10,2),
  accessory_value_added_inr   NUMERIC(10,2),
  price_history               JSONB NOT NULL DEFAULT '[]',    -- NEW: [{price, changed_at}]

  -- Ownership & registration
  previous_owners_count       SMALLINT,
  ownership_type              VARCHAR(20),
  ownership_category          VARCHAR(30),
  seller_type                 VARCHAR(30),
  ownership_transfer_ready    BOOLEAN DEFAULT FALSE,
  registration_state          VARCHAR(50),
  registration_city           VARCHAR(80),
  registration_valid_till     DATE,
  road_tax_paid               BOOLEAN DEFAULT FALSE,
  road_tax_valid_till         DATE,
  hypothecation_status        VARCHAR(30),
  bank_finance_name           VARCHAR(100),
  noc_available               BOOLEAN DEFAULT FALSE,
  pollution_valid_till        DATE,
  insurance_status            VARCHAR(30),
  insurance_type              VARCHAR(30),
  insurance_valid_till        DATE,
  accident_history            BOOLEAN DEFAULT FALSE,
  legal_case                  BOOLEAN DEFAULT FALSE,

  -- Usage & mileage
  total_km_driven             REAL,
  average_km_per_year         REAL,
  mileage_kmpl                REAL,
  city_mileage                REAL,
  highway_mileage             REAL,
  fuel_efficiency_rating      REAL,

  -- Engine & performance
  engine_type                 VARCHAR(50),
  engine_capacity_cc          REAL,
  power_bhp                   REAL,
  torque_nm                   REAL,
  cylinders_count             SMALLINT,
  transmission_type           VARCHAR(20),
  drivetrain                  VARCHAR(10),
  turbocharged                BOOLEAN DEFAULT FALSE,
  fuel_injection_type         VARCHAR(30),
  emission_standard           VARCHAR(20),
  fuel_type                   VARCHAR(20),
  fuel_tank_capacity_liters   REAL,

  -- EV/Hybrid
  battery_capacity_kwh        REAL,
  battery_health_percent      REAL,
  battery_range_km            REAL,
  charging_time               VARCHAR(50),
  fast_charging_supported     BOOLEAN DEFAULT FALSE,

  -- Condition
  overall_condition_rating    REAL,
  exterior_condition          VARCHAR(20),
  interior_condition          VARCHAR(20),
  engine_condition            VARCHAR(20),
  tire_condition              VARCHAR(20),
  brake_condition             VARCHAR(20),
  suspension_condition        VARCHAR(20),
  battery_condition           VARCHAR(20),
  flood_damage                BOOLEAN DEFAULT FALSE,
  accident_damage             BOOLEAN DEFAULT FALSE,
  repainted_panels            TEXT,
  rust_condition              VARCHAR(20),

  -- Service & maintenance
  service_history_available   BOOLEAN DEFAULT FALSE,
  authorized_service_maintained BOOLEAN DEFAULT FALSE,
  last_service_date           DATE,
  last_service_cost_inr       NUMERIC(10,2),
  major_repairs_done          BOOLEAN DEFAULT FALSE,
  warranty_remaining          BOOLEAN DEFAULT FALSE,
  extended_warranty_available BOOLEAN DEFAULT FALSE,

  -- Safety features (booleans)
  airbags_count               SMALLINT,
  abs                         BOOLEAN DEFAULT FALSE,
  ebd                         BOOLEAN DEFAULT FALSE,
  traction_control            BOOLEAN DEFAULT FALSE,
  esc                         BOOLEAN DEFAULT FALSE,
  hill_assist                 BOOLEAN DEFAULT FALSE,
  lane_assist                 BOOLEAN DEFAULT FALSE,
  adaptive_cruise_control     BOOLEAN DEFAULT FALSE,
  blind_spot_monitoring       BOOLEAN DEFAULT FALSE,
  rear_parking_sensors        BOOLEAN DEFAULT FALSE,
  rear_parking_camera         BOOLEAN DEFAULT FALSE,
  camera_360                  BOOLEAN DEFAULT FALSE,
  tpms                        BOOLEAN DEFAULT FALSE,
  isofix                      BOOLEAN DEFAULT FALSE,

  -- Comfort & interior
  air_conditioning_type       VARCHAR(20),
  heater                      BOOLEAN DEFAULT FALSE,
  leather_seats               BOOLEAN DEFAULT FALSE,
  seat_material               VARCHAR(30),
  seat_adjustment             VARCHAR(30),
  ventilated_seats            BOOLEAN DEFAULT FALSE,
  heated_seats                BOOLEAN DEFAULT FALSE,
  sunroof                     BOOLEAN DEFAULT FALSE,
  ambient_lighting            BOOLEAN DEFAULT FALSE,
  rear_ac_vents               BOOLEAN DEFAULT FALSE,
  cruise_control              BOOLEAN DEFAULT FALSE,
  keyless_entry               BOOLEAN DEFAULT FALSE,
  push_start_button           BOOLEAN DEFAULT FALSE,

  -- Infotainment
  infotainment_screen_size    VARCHAR(10),
  touchscreen                 BOOLEAN DEFAULT FALSE,
  apple_carplay               BOOLEAN DEFAULT FALSE,
  android_auto                BOOLEAN DEFAULT FALSE,
  bluetooth                   BOOLEAN DEFAULT FALSE,
  usb_ports_count             SMALLINT,
  navigation_system           BOOLEAN DEFAULT FALSE,
  premium_sound_system        BOOLEAN DEFAULT FALSE,
  speakers_count              SMALLINT,
  wireless_charging           BOOLEAN DEFAULT FALSE,

  -- Exterior
  alloy_wheels                BOOLEAN DEFAULT FALSE,
  wheel_size                  VARCHAR(10),
  fog_lamps                   BOOLEAN DEFAULT FALSE,
  led_headlights              BOOLEAN DEFAULT FALSE,
  drls                        BOOLEAN DEFAULT FALSE,
  roof_rails                  BOOLEAN DEFAULT FALSE,
  spoiler                     BOOLEAN DEFAULT FALSE,
  auto_headlights             BOOLEAN DEFAULT FALSE,
  rain_sensing_wipers         BOOLEAN DEFAULT FALSE,
  power_folding_mirrors       BOOLEAN DEFAULT FALSE,

  -- Wheels & tires
  tire_brand                  VARCHAR(50),
  tire_size                   VARCHAR(20),
  tire_condition_percent      REAL,
  spare_tire_available        BOOLEAN DEFAULT FALSE,
  wheel_material              VARCHAR(20),

  -- Location & logistics
  location_city               VARCHAR(100),
  location_state              VARCHAR(100),
  location_point              GEOGRAPHY(Point, 4326),  -- NEW: PostGIS
  pickup_available            BOOLEAN DEFAULT FALSE,
  delivery_available          BOOLEAN DEFAULT FALSE,
  test_drive_available        BOOLEAN DEFAULT FALSE,

  -- Seller info (denormalized for listings without a dealer record)
  seller_name                 VARCHAR(150),
  dealer_rating               REAL,
  dealer_verified             BOOLEAN DEFAULT FALSE,
  contact_number              VARCHAR(15),
  contact_email               VARCHAR(255),
  seller_address              TEXT,
  years_in_business           SMALLINT,

  -- Media (JSONB arrays)
  images                      JSONB NOT NULL DEFAULT '[]',          -- was images_json
  interior_images             JSONB NOT NULL DEFAULT '[]',
  exterior_images             JSONB NOT NULL DEFAULT '[]',
  engine_images               JSONB NOT NULL DEFAULT '[]',
  tire_images                 JSONB NOT NULL DEFAULT '[]',
  damage_images               JSONB NOT NULL DEFAULT '[]',
  view_360_url                TEXT,
  video_walkaround_url        TEXT,

  -- Inspection
  inspection_status           VARCHAR(20),
  inspection_score            REAL,
  inspection_report_url       TEXT,
  platform_certified          BOOLEAN DEFAULT FALSE,
  third_party_inspection_company VARCHAR(100),

  -- Listing metadata
  listing_status              listing_status NOT NULL DEFAULT 'Active',
  featured_listing            BOOLEAN NOT NULL DEFAULT FALSE,
  views_count                 INTEGER NOT NULL DEFAULT 0,
  favorites_count             INTEGER NOT NULL DEFAULT 0,
  lead_count                  INTEGER NOT NULL DEFAULT 0,
  promotion_tier              VARCHAR(20),

  -- Approval workflow -- NEW
  approved_by                 BIGINT REFERENCES users(id),
  approved_at                 TIMESTAMPTZ,
  rejection_reason            TEXT,

  -- Free-text
  reason_for_sale             TEXT,
  accessories_included        TEXT,
  modifications               TEXT,
  known_issues                TEXT,
  additional_notes            TEXT,
  specs                       JSONB NOT NULL DEFAULT '{}',         -- was specs_json

  -- Full-text search vector -- NEW
  search_vector               tsvector,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === INDEXES ===

-- Foreign keys
CREATE INDEX idx_listings_category_id ON listings (category_id);
CREATE INDEX idx_listings_dealer_id ON listings (dealer_id);

-- High-frequency filter columns
CREATE INDEX idx_listings_brand ON listings (brand);
CREATE INDEX idx_listings_fuel_type ON listings (fuel_type);
CREATE INDEX idx_listings_transmission ON listings (transmission_type);
CREATE INDEX idx_listings_price ON listings (listing_price_inr);
CREATE INDEX idx_listings_year ON listings (model_year);
CREATE INDEX idx_listings_km ON listings (total_km_driven);
CREATE INDEX idx_listings_city ON listings (location_city);
CREATE INDEX idx_listings_status ON listings (listing_status);
CREATE INDEX idx_listings_body_style ON listings (body_style);
CREATE INDEX idx_listings_ownership ON listings (ownership_type);
CREATE INDEX idx_listings_seller_type ON listings (seller_type);

-- Composite indexes for common query patterns
CREATE INDEX idx_listings_active_featured ON listings (listing_status, featured_listing)
  WHERE listing_status = 'Active';
CREATE INDEX idx_listings_active_price ON listings (listing_price_inr)
  WHERE listing_status = 'Active';
CREATE INDEX idx_listings_active_city_brand ON listings (location_city, brand)
  WHERE listing_status = 'Active';

-- Full-text search
CREATE INDEX idx_listings_search ON listings USING GIN (search_vector);

-- Geospatial
CREATE INDEX idx_listings_location ON listings USING GIST (location_point);

-- JSONB (for specs queries like specs @> '{"sunroof": true}')
CREATE INDEX idx_listings_specs ON listings USING GIN (specs);

-- Trigger to auto-update search_vector
CREATE OR REPLACE FUNCTION listings_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.model, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.variant, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location_city, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.fuel_type, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.body_style, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.additional_notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listings_search_vector
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION listings_search_vector_trigger();

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 2.10 `bookings`

```sql
CREATE TABLE bookings (
  id              BIGSERIAL PRIMARY KEY,
  listing_id      BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dealer_id       BIGINT REFERENCES dealers(id) ON DELETE SET NULL,
  type            booking_type NOT NULL,
  status          booking_status NOT NULL DEFAULT 'pending',
  deposit_amount  NUMERIC(12,2) DEFAULT 0.00,
  payment_id      BIGINT,                           -- FK added after payments table
  scheduled_at    TIMESTAMPTZ,
  location_notes  TEXT,                              -- e.g., "Showroom 4, HSR Layout"
  notes           TEXT,
  cancelled_by    BIGINT REFERENCES users(id),
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_listing ON bookings (listing_id);
CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE INDEX idx_bookings_dealer ON bookings (dealer_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_scheduled ON bookings (scheduled_at)
  WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_bookings_created ON bookings (created_at DESC);

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 2.11 `payments`

```sql
CREATE TABLE payments (
  id                  BIGSERIAL PRIMARY KEY,
  booking_id          BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount              NUMERIC(12,2) NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
  gateway             payment_gateway NOT NULL DEFAULT 'razorpay',
  gateway_payment_id  VARCHAR(100),                  -- razorpay payment ID
  gateway_order_id    VARCHAR(100),                  -- razorpay order ID
  gateway_signature   VARCHAR(255),                  -- razorpay signature for verification
  status              payment_status NOT NULL DEFAULT 'created',
  refund_id           VARCHAR(100),
  refund_amount       NUMERIC(12,2),
  refund_reason       TEXT,
  failure_reason      TEXT,
  metadata            JSONB DEFAULT '{}',            -- gateway-specific extra data
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from bookings to payments now
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id);

CREATE INDEX idx_payments_booking ON payments (booking_id);
CREATE INDEX idx_payments_user ON payments (user_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_gateway_pid ON payments (gateway_payment_id);
CREATE INDEX idx_payments_gateway_oid ON payments (gateway_order_id);
CREATE INDEX idx_payments_created ON payments (created_at DESC);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 2.12 `wishlists`

Replaces the current `localStorage`-based wishlist.

```sql
CREATE TABLE wishlists (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX idx_wishlists_listing ON wishlists (listing_id);
CREATE INDEX idx_wishlists_user_created ON wishlists (user_id, created_at DESC);
```

---

### 2.13 `saved_searches`

```sql
CREATE TABLE saved_searches (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(150),                         -- user-defined label
  filters     JSONB NOT NULL,                       -- {brand: "Hyundai", price_max: 1500000, ...}
  notify      BOOLEAN NOT NULL DEFAULT TRUE,        -- send notifications for new matches
  last_notified_at TIMESTAMPTZ,
  match_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_user ON saved_searches (user_id);
CREATE INDEX idx_saved_searches_notify ON saved_searches (notify) WHERE notify = TRUE;
CREATE INDEX idx_saved_searches_filters ON saved_searches USING GIN (filters);
```

---

### 2.14 `notifications`

```sql
CREATE TABLE notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',                   -- {listing_id, booking_id, ...}
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC)
  WHERE read = FALSE;
CREATE INDEX idx_notifications_user_all ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications (type);
```

---

### 2.15 `reviews`

```sql
CREATE TABLE reviews (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  BIGINT REFERENCES listings(id) ON DELETE SET NULL,
  dealer_id   BIGINT REFERENCES dealers(id) ON DELETE SET NULL,
  booking_id  BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(200),
  body        TEXT,
  images      JSONB DEFAULT '[]',
  approved    BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A user can review a booking only once
  CONSTRAINT uq_reviews_user_booking UNIQUE (user_id, booking_id)
);

CREATE INDEX idx_reviews_listing ON reviews (listing_id) WHERE approved = TRUE;
CREATE INDEX idx_reviews_dealer ON reviews (dealer_id) WHERE approved = TRUE;
CREATE INDEX idx_reviews_user ON reviews (user_id);
CREATE INDEX idx_reviews_pending ON reviews (approved, created_at) WHERE approved = FALSE;

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 2.16 `conversations` and `messages`

```sql
CREATE TABLE conversations (
  id              BIGSERIAL PRIMARY KEY,
  listing_id      BIGINT REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'open',  -- 'open', 'closed', 'archived'
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One conversation per buyer-seller-listing triple
  CONSTRAINT uq_conversations_triple UNIQUE (listing_id, buyer_id, seller_id)
);

CREATE INDEX idx_conversations_buyer ON conversations (buyer_id, last_message_at DESC);
CREATE INDEX idx_conversations_seller ON conversations (seller_id, last_message_at DESC);
CREATE INDEX idx_conversations_listing ON conversations (listing_id);

CREATE TABLE messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  attachments     JSONB DEFAULT '[]',                -- [{url, type, name}]
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at ASC);
CREATE INDEX idx_messages_unread ON messages (conversation_id, read)
  WHERE read = FALSE;
CREATE INDEX idx_messages_sender ON messages (sender_id);
```

---

### 2.17 `audit_logs`

Partitioned by month for efficient archival and pruning.

```sql
CREATE TABLE audit_logs (
  id          BIGSERIAL,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,                 -- 'create', 'update', 'delete', 'login', 'approve', etc.
  entity_type VARCHAR(50) NOT NULL,                 -- 'listing', 'booking', 'payment', 'user', etc.
  entity_id   BIGINT,
  changes     JSONB DEFAULT '{}',                   -- {field: {old, new}} for updates
  ip          INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions (automate via pg_partman or cron)
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- ... continue monthly, or use pg_partman for auto-creation

CREATE INDEX idx_audit_user ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs (action);
```

---

### 2.18 `price_alerts`

```sql
CREATE TABLE price_alerts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  old_price   NUMERIC(12,2) NOT NULL,
  new_price   NUMERIC(12,2) NOT NULL,
  price_diff  NUMERIC(12,2) GENERATED ALWAYS AS (old_price - new_price) STORED,
  notified    BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_alerts_user ON price_alerts (user_id, created_at DESC);
CREATE INDEX idx_price_alerts_listing ON price_alerts (listing_id);
CREATE INDEX idx_price_alerts_pending ON price_alerts (notified, created_at)
  WHERE notified = FALSE;
```

---

### 2.19 `page_views`

High-volume table, partitioned by month. Counters are denormalized into `listings.views_count`
and kept accurate via periodic aggregation or trigger-based increment.

```sql
CREATE TABLE page_views (
  id          BIGSERIAL,
  listing_id  BIGINT NOT NULL,                      -- no FK for insert performance
  user_id     BIGINT,                               -- NULL for anonymous
  session_id  UUID,
  ip          INET,
  user_agent  TEXT,
  referrer    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions (same pattern as audit_logs)
CREATE TABLE page_views_2026_01 PARTITION OF page_views
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE page_views_2026_02 PARTITION OF page_views
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE page_views_2026_03 PARTITION OF page_views
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX idx_page_views_listing ON page_views (listing_id, created_at DESC);
CREATE INDEX idx_page_views_user ON page_views (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_page_views_created ON page_views (created_at DESC);
```

---

### 2.20 Entity Relationship Summary

```
users ──┬──< sessions
        ├──< wishlists >──── listings
        ├──< saved_searches
        ├──< notifications
        ├──< reviews
        ├──< bookings >──── listings
        ├──< payments >──── bookings
        ├──< conversations (as buyer or seller)
        ├──< messages
        ├──< audit_logs
        ├──< price_alerts >── listings
        ├──< page_views >──── listings
        └──1 dealers ──< listings

categories ──< category_filter_map >── filter_definitions
categories ──< listings
```

---

## 3. Caching Layer: Redis

### 3.1 What to Cache

| Key Pattern | Data | TTL | Invalidation |
|---|---|---|---|
| `listing:{id}` | Full listing JSON | 5 min | On listing UPDATE/DELETE |
| `listings:count:{city}:{brand}:{fuel}` | Faceted filter counts | 2 min | On any listing status change |
| `listings:search:{hash}` | Search result page (IDs + total) | 60 sec | TTL only (short-lived) |
| `categories:all` | All active categories | 10 min | On category CRUD |
| `filters:category:{id}` | Filter definitions for category | 10 min | On category-filter mapping change |
| `session:{token_hash}` | User session object | Until expiry | On logout/session delete |
| `user:{id}:profile` | User profile data | 5 min | On profile update |
| `rate_limit:{ip}:{endpoint}` | Request counter | 1 min window | TTL auto-expiry |
| `popular_searches` | Top 50 search queries | 15 min | Rebuilt by analytics cron |
| `listing:{id}:viewers` | Active viewer count (SET) | Per-member 30 sec | INCR/DECR on focus/blur |
| `dealer:{id}:listings_count` | Dealer's active listing count | 5 min | On listing status change |

### 3.2 Cache Invalidation Strategy

**Hybrid: TTL + Event-Based**

```
                     ┌─────────────────┐
    API Write ──────>│  PostgreSQL      │
        │            └─────────────────┘
        │
        ▼
  After-commit hook
        │
        ├──> Redis DEL listing:{id}
        ├──> Redis DEL listings:count:*  (pattern delete via Lua script)
        └──> Redis PUBLISH channel:listings {type: 'invalidate', id}
```

- **Short TTL (60-120s)** for search results: tolerates brief staleness; no explicit invalidation needed
- **Medium TTL (5-10 min)** for individual listing cache: explicitly invalidated on write
- **Event-based** for real-time features: Redis pub/sub triggers Socket.IO broadcasts

### 3.3 Cache-Aside Pattern Implementation

```javascript
// Pseudocode for the cache-aside (lazy-loading) pattern

async function getListingById(id) {
  const cacheKey = `listing:${id}`;

  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss: query database
  const listing = await pool.query('SELECT * FROM listings WHERE id = $1', [id]);
  if (!listing.rows[0]) return null;

  // 3. Populate cache
  await redis.setex(cacheKey, 300, JSON.stringify(listing.rows[0]));

  return listing.rows[0];
}

// On write: invalidate
async function updateListing(id, data) {
  await pool.query('UPDATE listings SET ... WHERE id = $1', [id]);
  await redis.del(`listing:${id}`);
  await redis.publish('channel:listings', JSON.stringify({ type: 'updated', id }));
}
```

### 3.4 Redis Configuration

```
# redis.conf highlights
maxmemory 512mb
maxmemory-policy allkeys-lru
save 60 1000                    # RDB snapshot every 60s if 1000+ writes
appendonly yes                  # AOF for durability
appendfsync everysec
```

Use **Redis Sentinel** (3 nodes) or **Redis Cluster** for high availability. For managed
hosting, AWS ElastiCache or Upstash Redis (serverless) are good options for an Indian
deployment.

---

## 4. Real-Time Architecture

### 4.1 Technology Choice: Socket.IO

Socket.IO is chosen over raw WebSockets or SSE because:
- Automatic reconnection with exponential backoff
- Room abstraction maps directly to our use cases (per-listing, per-user, per-conversation)
- Built-in Redis adapter (`@socket.io/redis-adapter`) for multi-server scaling
- Fallback to HTTP long-polling for restrictive networks
- Client libraries for React (`socket.io-client`)

### 4.2 Architecture Diagram

```
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │  Browser 1   │     │  Browser 2   │     │  Browser N   │
 │ socket.io    │     │ socket.io    │     │ socket.io    │
 │ client       │     │ client       │     │ client       │
 └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
        │ WebSocket          │                     │
        ▼                    ▼                     ▼
 ┌─────────────────────────────────────────────────────────┐
 │              Load Balancer (sticky sessions)            │
 │          (NGINX / ALB with IP hash or cookie)           │
 └──────────┬───────────────┬──────────────┬───────────────┘
            ▼               ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ Node.js #1 │  │ Node.js #2 │  │ Node.js #3 │
     │ Express +  │  │ Express +  │  │ Express +  │
     │ Socket.IO  │  │ Socket.IO  │  │ Socket.IO  │
     └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                  ┌─────────────────┐
                  │  Redis Pub/Sub  │
                  │  (adapter sync) │
                  └────────┬────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Redis    │ │PostgreSQL│ │ S3/CDN   │
        │ Cache    │ │ Database │ │ Images   │
        └──────────┘ └──────────┘ └──────────┘
```

### 4.3 Room Design

| Room Name | Members | Purpose |
|---|---|---|
| `listing:{id}` | Anyone viewing that listing page | Viewer count, status changes, price updates |
| `user:{id}` | That user's active connections | Personal notifications, booking updates |
| `conversation:{id}` | Buyer + seller in that thread | Live chat messages, typing indicators, read receipts |
| `admin` | All admin-role users | New bookings, new listings, inquiries dashboard |
| `dealer:{id}` | Dealer's active connections | New leads, booking requests |
| `city:{name}` | Users browsing that city | New listings in that city (optional) |

### 4.4 Feature Implementations

#### 4.4.1 Real-Time Viewer Count ("X people viewing this car")

```
Client                              Server                          Redis
  │                                    │                              │
  │── join listing:42 ────────────────>│                              │
  │                                    │── SADD listing:42:viewers    │
  │                                    │   {sessionId} ──────────────>│
  │                                    │── SCARD listing:42:viewers ─>│
  │                                    │<── count: 7 ─────────────────│
  │<── viewer_count {id:42, count:7} ──│                              │
  │                                    │                              │
  │ [page blur / disconnect]           │                              │
  │── leave listing:42 ───────────────>│                              │
  │                                    │── SREM listing:42:viewers    │
  │                                    │   {sessionId} ──────────────>│
  │                                    │── broadcast updated count ──>│
```

- Redis SET with `EXPIRE` per member (30s) handles zombie sessions
- A heartbeat every 20s refreshes the member's TTL
- Broadcast new count to the `listing:{id}` room on join/leave

```javascript
// Server-side handler
io.on('connection', (socket) => {
  socket.on('view:listing', async (listingId) => {
    const room = `listing:${listingId}`;
    socket.join(room);

    const key = `listing:${listingId}:viewers`;
    await redis.sadd(key, socket.id);
    await redis.expire(key, 60);

    const count = await redis.scard(key);
    io.to(room).emit('viewer:count', { listingId, count });
  });

  socket.on('leave:listing', async (listingId) => {
    const room = `listing:${listingId}`;
    socket.leave(room);
    await redis.srem(`listing:${listingId}:viewers`, socket.id);

    const count = await redis.scard(`listing:${listingId}:viewers`);
    io.to(room).emit('viewer:count', { listingId, count });
  });

  socket.on('disconnect', async () => {
    // Clean up all rooms this socket was in
    // (Socket.IO handles room leave; Redis cleanup via TTL expiry)
  });
});
```

#### 4.4.2 Real-Time Booking Updates (car status changes instantly)

When a booking is created or a listing is sold/reserved:

```javascript
// In the booking creation API handler
async function createBooking(req, res) {
  const booking = await pool.query('INSERT INTO bookings ... RETURNING *', [...]);

  // If reservation, update listing status
  if (booking.type === 'reservation') {
    await pool.query("UPDATE listings SET listing_status = 'Reserved' WHERE id = $1", [booking.listing_id]);
    await redis.del(`listing:${booking.listing_id}`);
  }

  // Broadcast to everyone viewing this listing
  io.to(`listing:${booking.listing_id}`).emit('listing:status_changed', {
    listingId: booking.listing_id,
    newStatus: 'Reserved',
    message: 'This car has just been reserved',
  });

  // Notify the dealer
  io.to(`dealer:${listing.dealer_id}`).emit('booking:new', {
    bookingId: booking.id,
    listingTitle: listing.title,
    type: booking.type,
  });

  // Notify admins
  io.to('admin').emit('booking:new', { bookingId: booking.id });

  res.status(201).json(booking);
}
```

#### 4.4.3 Real-Time Notifications (price drops, new matches, confirmations)

```javascript
// Notification service - called from various API handlers
async function sendNotification(userId, notification) {
  // 1. Persist to database
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, notification.type, notification.title, notification.body, notification.data]
  );

  // 2. Push via Socket.IO if user is online
  io.to(`user:${userId}`).emit('notification:new', result.rows[0]);

  // 3. If user is offline, queue for push notification (FCM/APNs via future mobile app)
  const isOnline = (await io.in(`user:${userId}`).fetchSockets()).length > 0;
  if (!isOnline) {
    await pushNotificationQueue.add({ userId, notification });
  }
}

// Price drop trigger (called when listing price is updated)
async function onPriceChanged(listingId, oldPrice, newPrice) {
  if (newPrice >= oldPrice) return;

  // Find all users who wishlisted this listing
  const wishlisted = await pool.query(
    'SELECT user_id FROM wishlists WHERE listing_id = $1',
    [listingId]
  );

  // Create price alerts and notifications
  for (const { user_id } of wishlisted.rows) {
    await pool.query(
      `INSERT INTO price_alerts (user_id, listing_id, old_price, new_price)
       VALUES ($1, $2, $3, $4)`,
      [user_id, listingId, oldPrice, newPrice]
    );

    await sendNotification(user_id, {
      type: 'price_drop',
      title: 'Price Drop Alert',
      body: `A car in your wishlist dropped from ${formatINR(oldPrice)} to ${formatINR(newPrice)}`,
      data: { listing_id: listingId, old_price: oldPrice, new_price: newPrice },
    });
  }
}
```

#### 4.4.4 Live Chat / Messaging

```javascript
// Join conversation room on open
socket.on('chat:join', async (conversationId) => {
  // Verify user is buyer or seller in this conversation
  const conv = await pool.query(
    'SELECT * FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
    [conversationId, socket.userId]
  );
  if (!conv.rows[0]) return socket.emit('error', 'Unauthorized');

  socket.join(`conversation:${conversationId}`);

  // Mark unread messages as read
  await pool.query(
    `UPDATE messages SET read = TRUE, read_at = NOW()
     WHERE conversation_id = $1 AND sender_id != $2 AND read = FALSE`,
    [conversationId, socket.userId]
  );

  // Emit read receipt to other party
  socket.to(`conversation:${conversationId}`).emit('chat:read', {
    conversationId,
    readBy: socket.userId,
    readAt: new Date().toISOString(),
  });
});

// Send message
socket.on('chat:message', async ({ conversationId, body }) => {
  // Persist
  const msg = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, body)
     VALUES ($1, $2, $3) RETURNING *`,
    [conversationId, socket.userId, body]
  );

  // Update conversation last_message_at
  await pool.query(
    'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
    [conversationId]
  );

  // Broadcast to conversation room
  io.to(`conversation:${conversationId}`).emit('chat:message', msg.rows[0]);

  // Notify the other party if not in the room
  const conv = await pool.query('SELECT buyer_id, seller_id FROM conversations WHERE id = $1', [conversationId]);
  const recipientId = conv.rows[0].buyer_id === socket.userId
    ? conv.rows[0].seller_id
    : conv.rows[0].buyer_id;

  await sendNotification(recipientId, {
    type: 'message_received',
    title: 'New message',
    body: body.substring(0, 100),
    data: { conversation_id: conversationId },
  });
});

// Typing indicator
socket.on('chat:typing', ({ conversationId }) => {
  socket.to(`conversation:${conversationId}`).emit('chat:typing', {
    conversationId,
    userId: socket.userId,
  });
});
```

#### 4.4.5 Admin Dashboard Live Updates

```javascript
// Admin room: auto-join on connection if role is admin
io.on('connection', async (socket) => {
  if (socket.user?.role === 'admin' || socket.user?.role === 'superadmin') {
    socket.join('admin');
  }
});

// Broadcast events from API handlers:
// - booking:new       -> when any booking is created
// - listing:new       -> when a new listing is submitted for approval
// - payment:received  -> when a payment is captured
// - inquiry:new       -> when a buyer sends a message to a seller (lead count)
// - review:pending    -> when a new review needs moderation

// Example: in the listing creation handler
io.to('admin').emit('listing:pending_approval', {
  id: newListing.id,
  title: newListing.title,
  brand: newListing.brand,
  dealer: dealerName,
  submittedAt: new Date().toISOString(),
});
```

### 4.5 Socket.IO Authentication

```javascript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins },
  transports: ['websocket', 'polling'],
});

// Redis adapter for multi-server sync
const pubClient = redis.duplicate();
const subClient = redis.duplicate();
io.adapter(createAdapter(pubClient, subClient));

// Auth middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    // Allow anonymous connections (for viewer count)
    socket.userId = null;
    return next();
  }

  try {
    const session = await verifySessionToken(token);
    socket.userId = session.user_id;
    socket.user = session.user;
    socket.join(`user:${session.user_id}`);
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
});
```

---

## 5. Search Architecture

### 5.1 Recommended Approach: PostgreSQL Full-Text Search (Phase 1) + Elasticsearch (Phase 2)

For the initial production launch, PostgreSQL's built-in FTS is sufficient and avoids
the operational overhead of a separate Elasticsearch cluster. Elasticsearch can be added
later when query complexity or volume demands it.

### 5.2 Full-Text Search with tsvector

Already defined in the `listings` table above. Query usage:

```sql
-- Basic full-text search with ranking
SELECT id, title, brand, model, listing_price_inr,
       ts_rank(search_vector, query) AS rank
FROM listings, plainto_tsquery('english', 'Hyundai Creta white') AS query
WHERE search_vector @@ query
  AND listing_status = 'Active'
ORDER BY rank DESC
LIMIT 20;
```

### 5.3 Faceted Search (filter counts)

This is how to generate "Petrol (234)" counts for the search sidebar:

```sql
-- Fuel type facet counts for active listings in a given city
SELECT fuel_type, COUNT(*) AS count
FROM listings
WHERE listing_status = 'Active'
  AND location_city = 'Mumbai'
GROUP BY fuel_type
ORDER BY count DESC;

-- Transmission facet counts (same base filter)
SELECT transmission_type, COUNT(*) AS count
FROM listings
WHERE listing_status = 'Active'
  AND location_city = 'Mumbai'
GROUP BY transmission_type
ORDER BY count DESC;

-- Brand facet counts
SELECT brand, COUNT(*) AS count
FROM listings
WHERE listing_status = 'Active'
  AND location_city = 'Mumbai'
GROUP BY brand
ORDER BY count DESC;
```

**Optimization**: Run all facet queries in a single round-trip using a CTE:

```sql
WITH base AS (
  SELECT * FROM listings
  WHERE listing_status = 'Active'
    AND location_city = $1
    AND ($2::text IS NULL OR brand = $2)
    AND ($3::text IS NULL OR fuel_type = $3)
    AND ($4::numeric IS NULL OR listing_price_inr >= $4)
    AND ($5::numeric IS NULL OR listing_price_inr <= $5)
)
SELECT 'fuel_type' AS facet, fuel_type AS value, COUNT(*) AS count FROM base GROUP BY fuel_type
UNION ALL
SELECT 'transmission_type', transmission_type, COUNT(*) FROM base GROUP BY transmission_type
UNION ALL
SELECT 'brand', brand, COUNT(*) FROM base GROUP BY brand
UNION ALL
SELECT 'body_style', body_style, COUNT(*) FROM base GROUP BY body_style
UNION ALL
SELECT 'ownership_type', ownership_type, COUNT(*) FROM base GROUP BY ownership_type
ORDER BY facet, count DESC;
```

Cache these facet results in Redis with key `facets:{city}:{filter_hash}` and a 2-minute TTL.

### 5.4 Autocomplete / Typeahead

Using `pg_trgm` for fuzzy matching:

```sql
-- Create trigram indexes
CREATE INDEX idx_listings_brand_trgm ON listings USING GIN (brand gin_trgm_ops);
CREATE INDEX idx_listings_model_trgm ON listings USING GIN (model gin_trgm_ops);
CREATE INDEX idx_listings_title_trgm ON listings USING GIN (title gin_trgm_ops);

-- Autocomplete query
SELECT DISTINCT brand, model,
       similarity(brand || ' ' || model, $1) AS sim
FROM listings
WHERE listing_status = 'Active'
  AND (brand || ' ' || model) % $1       -- trigram similarity threshold
ORDER BY sim DESC
LIMIT 10;
```

Cache the top-500 brand+model combinations in Redis as a sorted set for instant
client-side suggestions before hitting the database.

### 5.5 Geo-Based Search ("cars near me")

Using PostGIS on the `location_point` column:

```sql
-- Find listings within 25km of user's location
SELECT id, title, brand, model, listing_price_inr,
       ST_Distance(location_point, ST_MakePoint($1, $2)::geography) AS distance_meters
FROM listings
WHERE listing_status = 'Active'
  AND ST_DWithin(location_point, ST_MakePoint($1, $2)::geography, 25000)  -- 25km radius
ORDER BY distance_meters ASC
LIMIT 20;

-- $1 = longitude, $2 = latitude (user's coordinates from browser Geolocation API)
```

The GIST index on `location_point` makes this efficient even with millions of rows.

### 5.6 Search Analytics

```sql
CREATE TABLE search_queries (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id),
  session_id  UUID,
  query_text  TEXT,
  filters     JSONB NOT NULL DEFAULT '{}',
  result_count INTEGER NOT NULL DEFAULT 0,
  city        VARCHAR(100),
  ip          INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_queries_created ON search_queries (created_at DESC);
CREATE INDEX idx_search_queries_text ON search_queries USING GIN (query_text gin_trgm_ops);
```

Aggregate nightly to produce:
- Top search terms (feed into autocomplete cache)
- Zero-result queries (inventory gaps)
- Popular filter combinations (optimize indexes)
- Search-to-lead conversion funnel

---

## 6. File Storage & CDN

### 6.1 AWS S3 Bucket Structure

```
s3://searchanycars-media/
├── listings/
│   ├── {listing_id}/
│   │   ├── original/          -- untouched uploads
│   │   │   ├── img-001.jpg
│   │   │   └── img-002.jpg
│   │   ├── large/             -- 1400px wide, 85% quality
│   │   │   ├── img-001.webp
│   │   │   └── img-002.webp
│   │   ├── medium/            -- 800px wide, 80% quality
│   │   │   ├── img-001.webp
│   │   │   └── img-002.webp
│   │   ├── thumb/             -- 400px wide, 75% quality
│   │   │   ├── img-001.webp
│   │   │   └── img-002.webp
│   │   └── og/                -- 1200x630 for social sharing
│   │       └── img-001.webp
│   ├── ...
├── avatars/
│   └── {user_id}/
│       └── avatar.webp
├── dealers/
│   └── {dealer_id}/
│       └── logo.webp
├── reviews/
│   └── {review_id}/
│       └── img-001.webp
└── inspections/
    └── {listing_id}/
        └── report.pdf
```

### 6.2 CloudFront CDN

```
User Request
    │
    ▼
CloudFront Edge (ap-south-1 / Mumbai)
    │
    ├── Cache HIT ──> Return cached image (TTL: 30 days)
    │
    └── Cache MISS ──> Origin: S3 bucket
                       │
                       └── Return + cache at edge
```

CloudFront configuration:
- **Distribution origin**: S3 bucket with OAC (Origin Access Control)
- **Cache policy**: CachingOptimized (TTL 86400-2592000 seconds)
- **Price class**: PriceClass_200 (covers India, Asia, Europe)
- **Custom domain**: `cdn.searchanycars.com`
- **Signed URLs**: Not needed for public listing images; used for inspection reports

URL pattern: `https://cdn.searchanycars.com/listings/{id}/large/img-001.webp`

### 6.3 Image Processing Pipeline (Sharp)

Replace the current raw filesystem write with a processing pipeline:

```javascript
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'ap-south-1' });
const BUCKET = 'searchanycars-media';

const VARIANTS = [
  { name: 'large',  width: 1400, quality: 85 },
  { name: 'medium', width: 800,  quality: 80 },
  { name: 'thumb',  width: 400,  quality: 75 },
  { name: 'og',     width: 1200, height: 630, quality: 80, fit: 'cover' },
];

async function processAndUploadImage(buffer, listingId, imageIndex) {
  const results = {};

  // 1. Validate input
  const metadata = await sharp(buffer).metadata();

  if (metadata.width < 800 || metadata.height < 600) {
    throw new Error('Image must be at least 800x600 pixels');
  }

  // 2. Blur detection (Laplacian variance)
  const { info } = await sharp(buffer)
    .greyscale()
    .convolve({ width: 3, height: 3, kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0] })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Calculate variance; reject if below threshold (implement per requirements)

  // 3. Upload original
  const originalKey = `listings/${listingId}/original/img-${String(imageIndex).padStart(3, '0')}.jpg`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: originalKey,
    Body: buffer,
    ContentType: 'image/jpeg',
  }));

  // 4. Generate and upload all variants
  for (const variant of VARIANTS) {
    const processed = await sharp(buffer)
      .resize({
        width: variant.width,
        height: variant.height,
        fit: variant.fit || 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: variant.quality })
      .composite([{
        // Watermark overlay
        input: Buffer.from(
          `<svg width="200" height="30">
            <text x="0" y="20" font-size="14" fill="rgba(255,255,255,0.4)"
                  font-family="sans-serif">SearchAnyCars.com</text>
          </svg>`
        ),
        gravity: 'southeast',
      }])
      .toBuffer();

    const key = `listings/${listingId}/${variant.name}/img-${String(imageIndex).padStart(3, '0')}.webp`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: processed,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=2592000', // 30 days
    }));

    results[variant.name] = `https://cdn.searchanycars.com/${key}`;
  }

  return results;
}
```

### 6.4 Signed URLs for Private Uploads

For direct-to-S3 uploads from the browser (bypasses the server for large files):

```javascript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function getUploadUrl(listingId, fileName, contentType) {
  const key = `listings/${listingId}/original/${fileName}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
  return { uploadUrl: signedUrl, key };
}

// After upload, trigger processing via S3 event -> SQS -> worker
// or call processAndUploadImage from an API endpoint
```

### 6.5 Image Quality Validation

| Check | Threshold | Action |
|---|---|---|
| Minimum resolution | 800x600px | Reject upload |
| Maximum file size | 6 MB | Reject upload (already enforced by multer) |
| Blur detection | Laplacian variance < 100 | Warn user, allow with flag |
| Aspect ratio | Between 4:3 and 16:9 | Warn user |
| File type | JPEG, PNG, WebP, HEIC | Reject others |
| Duplicate detection | Perceptual hash comparison | Warn if same image uploaded twice for a listing |

---

## Appendix A: Migration Checklist

1. [ ] Provision PostgreSQL 16+ on AWS RDS (ap-south-1) with Multi-AZ
2. [ ] Install extensions: `uuid-ossp`, `postgis`, `pg_trgm`, `btree_gin`
3. [ ] Run all CREATE TYPE and CREATE TABLE statements from Section 2
4. [ ] Export SQLite data, transform types, load into PostgreSQL
5. [ ] Verify row counts and data integrity
6. [ ] Replace `better-sqlite3` with `pg` + `pg-pool` in `server/db.js`
7. [ ] Rewrite all `db.prepare().all()` / `.get()` / `.run()` calls to `pool.query()`
8. [ ] Set up pgBouncer
9. [ ] Provision Redis (ElastiCache or Upstash)
10. [ ] Add Socket.IO with Redis adapter to the Express server
11. [ ] Set up AWS S3 bucket + CloudFront distribution
12. [ ] Replace `server/storage.js` with S3 upload + Sharp pipeline
13. [ ] Set up WAL archiving and daily pg_dump backups
14. [ ] Configure read replica and query routing
15. [ ] Load test with 10,000 concurrent connections

## Appendix B: New npm Dependencies

```json
{
  "dependencies": {
    "pg": "^8.13.0",
    "pg-pool": "^3.7.0",
    "ioredis": "^5.4.0",
    "socket.io": "^4.8.0",
    "@socket.io/redis-adapter": "^8.3.0",
    "@aws-sdk/client-s3": "^3.700.0",
    "@aws-sdk/s3-request-presigner": "^3.700.0",
    "sharp": "^0.33.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "razorpay": "^2.9.0"
  }
}
```
