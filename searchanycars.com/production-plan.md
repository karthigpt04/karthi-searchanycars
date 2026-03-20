# SearchAnyCars.com — Production Implementation Plan

> A complete blueprint to transform SearchAnyCars from a prototype into a secure, real-time, production-grade used car marketplace.

**Current State:** React 19 SPA + Express 5 API + SQLite. No authentication, no payments, no real-time features, wishlist in localStorage, admin publicly accessible.

**Target State:** Fully authenticated multi-role platform with real-time updates, secure payments, encrypted PII, live messaging, dealer portal, and scalable cloud infrastructure.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database: SQLite → PostgreSQL](#2-database-sqlite--postgresql)
3. [Complete Database Schema](#3-complete-database-schema)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Data Privacy & Encryption](#5-data-privacy--encryption)
6. [Real-Time Architecture](#6-real-time-architecture)
7. [Payment System](#7-payment-system)
8. [Booking & Reservation Engine](#8-booking--reservation-engine)
9. [Messaging & Notifications](#9-messaging--notifications)
10. [Search & Performance](#10-search--performance)
11. [File Storage & CDN](#11-file-storage--cdn)
12. [API Security Hardening](#12-api-security-hardening)
13. [Cloud Infrastructure (AWS)](#13-cloud-infrastructure-aws)
14. [CI/CD Pipeline](#14-cicd-pipeline)
15. [Monitoring & Observability](#15-monitoring--observability)
16. [Conflict & Edge Case Analysis](#16-conflict--edge-case-analysis)
17. [Resolution Strategies](#17-resolution-strategies)
18. [Feature Gap Analysis](#18-feature-gap-analysis)
19. [Implementation Roadmap (24 Weeks)](#19-implementation-roadmap-24-weeks)
20. [Cost Estimation](#20-cost-estimation)
21. [Team Requirements](#21-team-requirements)

---

## 1. System Architecture Overview

```
                            ┌─────────────────────┐
                            │    Cloudflare CDN    │
                            │  DDoS + WAF + SSL    │
                            └──────────┬──────────┘
                                       │
                            ┌──────────▼──────────┐
                            │   AWS ALB (HTTPS)    │
                            │  SSL Termination     │
                            └────┬────────────┬────┘
                                 │            │
                    ┌────────────▼──┐  ┌──────▼────────────┐
                    │  ECS Fargate   │  │  ECS Fargate       │
                    │  Node.js API   │  │  Node.js API       │
                    │  + Socket.IO   │  │  + Socket.IO       │
                    │  Instance 1    │  │  Instance 2        │
                    └───┬──┬──┬─────┘  └────┬──┬──┬────────┘
                        │  │  │              │  │  │
           ┌────────────┘  │  └──────┐  ┌───┘  │  └────────────┐
           │               │         │  │      │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌▼──▼──────▼──┐  ┌────────▼────────┐
    │ PostgreSQL   │ │   Redis      │ │    AWS S3    │  │  External APIs   │
    │ RDS Multi-AZ │ │ ElastiCache  │ │  + CloudFront│  │                  │
    │              │ │              │ │   (Images)   │  │ Razorpay (Pay)   │
    │ Primary +    │ │ Cache +      │ │              │  │ MSG91 (SMS/OTP)  │
    │ Read Replica │ │ Pub/Sub +    │ │              │  │ SES (Email)      │
    │              │ │ Sessions +   │ │              │  │ Google OAuth     │
    │              │ │ Rate Limits  │ │              │  │ WhatsApp API     │
    └──────────────┘ └──────────────┘ └──────────────┘  └──────────────────┘
```

### Technology Stack

| Layer | Current | Production |
|-------|---------|------------|
| **Frontend** | React 19 + Vite (SPA) | Next.js 14 (SSR for SEO) |
| **Backend** | Express 5, single process | Express 5 / Fastify, containerized, multi-instance |
| **Database** | SQLite (single file) | PostgreSQL 16 (RDS Multi-AZ) |
| **Cache** | None | Redis 7 (ElastiCache) |
| **Real-Time** | None | Socket.IO + Redis Adapter |
| **Search** | SQL LIKE queries | PostgreSQL tsvector + GIN indexes → Elasticsearch at scale |
| **Storage** | Local filesystem | AWS S3 + CloudFront CDN |
| **Payments** | None (modals are UI-only) | Razorpay (UPI, cards, net banking) |
| **Auth** | None (admin is public) | JWT (RS256) + OTP + Google OAuth |
| **SMS** | None | MSG91 (DLT-compliant for India) |
| **Email** | None | AWS SES |
| **Hosting** | Local Node.js | AWS ECS Fargate + ALB |
| **CI/CD** | None | GitHub Actions |
| **Monitoring** | None | CloudWatch + Sentry |

---

## 2. Database: SQLite → PostgreSQL

### Why PostgreSQL

| Capability | SQLite | PostgreSQL |
|-----------|--------|------------|
| Concurrent writes | Single writer | Thousands of concurrent connections |
| JSON queries | Text only | Native JSONB with GIN indexes |
| Full-text search | None | Built-in tsvector + ts_rank |
| Geo-spatial | None | PostGIS (cars near me) |
| Row-level security | None | Built-in RLS policies |
| Backups | Manual file copy | Automated WAL + point-in-time recovery |
| Read replicas | Not possible | Streaming replication |

### Migration Strategy

```
Phase 1: Schema Translation
  SQLite TEXT     → PostgreSQL TEXT / VARCHAR
  SQLite INTEGER  → PostgreSQL INTEGER / BOOLEAN / BIGINT
  SQLite REAL     → PostgreSQL NUMERIC(12,2) (money) / DOUBLE PRECISION
  SQLite TEXT (JSON) → PostgreSQL JSONB

Phase 2: Data Export
  $ sqlite3 searchanycars.db .dump > dump.sql
  Transform with migration script (type conversions, boolean mapping)
  Import into PostgreSQL

Phase 3: Application Cut-Over
  Replace better-sqlite3 with pg + pg-pool
  Update all queries to use $1 parameterized syntax
  Enable connection pooling (pool size: 20)
```

### Connection Architecture

```
Application (N instances)
        │
        ▼
  ┌──────────────┐
  │  pgBouncer    │  2000 client connections → 200 PG connections
  │  (Transaction │  Prevents connection exhaustion
  │   pooling)    │
  └──────┬───────┘
         │
    ┌────▼────┐     ┌───────────┐
    │ Primary  │────►│  Replica   │
    │ (Writes) │     │  (Reads)   │
    └──────────┘     └───────────┘
```

**All search/browse queries → Read Replica**
**All writes (create, update, delete, bookings) → Primary**

---

## 3. Complete Database Schema

### 16 Tables

```sql
-- =============================================
-- 1. USERS
-- =============================================
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    phone           TEXT,                           -- encrypted (AES-256-GCM)
    phone_hmac      TEXT UNIQUE,                    -- HMAC for lookup
    phone_last4     VARCHAR(4),                     -- for display
    email           TEXT,                           -- encrypted
    email_hmac      TEXT UNIQUE,                    -- HMAC for lookup
    password_hash   TEXT,                           -- bcrypt, null for OTP-only users
    name            TEXT NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(20) NOT NULL DEFAULT 'customer',
        -- 'super_admin','admin','manager','sales_exec','content_mgr','dealer','customer'
    city            TEXT,
    verified        BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- 2. SESSIONS & TOKENS
-- =============================================
CREATE TABLE refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    family_id       UUID NOT NULL,                  -- for rotation tracking
    device_info     TEXT,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);

CREATE TABLE otp_requests (
    id              BIGSERIAL PRIMARY KEY,
    phone_hmac      TEXT NOT NULL,
    otp_hash        TEXT NOT NULL,                  -- bcrypt hash
    attempts        INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ NOT NULL,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_otp_phone ON otp_requests(phone_hmac);

-- =============================================
-- 3. DEALERS
-- =============================================
CREATE TABLE dealers (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    business_name   TEXT NOT NULL,
    contact_person  TEXT,
    phone           TEXT,                           -- encrypted
    email           TEXT,                           -- encrypted
    city            TEXT,
    state           TEXT,
    address         TEXT,
    gst_number      TEXT,
    commission_rate NUMERIC(5,2) DEFAULT 5.00,      -- percentage
    rating          NUMERIC(3,2) DEFAULT 0,
    total_sold      INTEGER DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, active, suspended
    onboarded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. LISTINGS (migrated 140+ columns + new fields)
-- =============================================
-- [Existing 140+ columns migrated from SQLite]
-- New additions:
ALTER TABLE listings ADD COLUMN dealer_id       BIGINT REFERENCES dealers(id);
ALTER TABLE listings ADD COLUMN approved_by     BIGINT REFERENCES users(id);
ALTER TABLE listings ADD COLUMN approved_at     TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN price_history   JSONB DEFAULT '[]';
ALTER TABLE listings ADD COLUMN search_vector   tsvector;
-- Full-text search index
CREATE INDEX idx_listings_search ON listings USING GIN(search_vector);
-- Auto-update search vector
CREATE TRIGGER listings_search_update
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english',
        title, brand, model, variant, location_city);

-- =============================================
-- 5. BOOKINGS
-- =============================================
CREATE TABLE bookings (
    id              BIGSERIAL PRIMARY KEY,
    listing_id      BIGINT NOT NULL REFERENCES listings(id),
    user_id         BIGINT NOT NULL REFERENCES users(id),
    type            VARCHAR(20) NOT NULL,           -- 'test_drive', 'reservation'
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
        -- pending, confirmed, completed, cancelled, expired, no_show
    deposit_amount  NUMERIC(12,2),
    scheduled_date  DATE,
    scheduled_time  VARCHAR(20),
    location_pref   VARCHAR(20),                    -- 'home', 'hub'
    assigned_to     BIGINT REFERENCES users(id),    -- sales executive
    notes           TEXT,
    expires_at      TIMESTAMPTZ,                    -- for reservations
    completed_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    cancel_reason   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bookings_listing ON bookings(listing_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- =============================================
-- 6. PAYMENTS
-- =============================================
CREATE TABLE payments (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT REFERENCES bookings(id),
    user_id             BIGINT NOT NULL REFERENCES users(id),
    amount              NUMERIC(12,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'INR',
    type                VARCHAR(20) NOT NULL,       -- 'deposit', 'balance', 'refund'
    status              VARCHAR(20) NOT NULL DEFAULT 'created',
        -- created, authorized, captured, failed, refunded
    gateway             VARCHAR(20) DEFAULT 'razorpay',
    gateway_order_id    TEXT,
    gateway_payment_id  TEXT,
    gateway_signature   TEXT,
    refund_id           TEXT,
    idempotency_key     UUID UNIQUE,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_gateway_order ON payments(gateway_order_id);

-- =============================================
-- 7. WISHLISTS (replaces localStorage)
-- =============================================
CREATE TABLE wishlists (
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id  BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
);

-- =============================================
-- 8. SAVED SEARCHES
-- =============================================
CREATE TABLE saved_searches (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT,
    filters     JSONB NOT NULL,
    notify      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 9. NOTIFICATIONS
-- =============================================
CREATE TABLE notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(30) NOT NULL,
        -- price_drop, new_match, booking_confirmed, test_drive_reminder,
        -- reservation_expiring, car_sold, message_received
    title       TEXT NOT NULL,
    body        TEXT,
    data        JSONB DEFAULT '{}',
    channel     VARCHAR(20) DEFAULT 'in_app',       -- in_app, sms, email, push, whatsapp
    read        BOOLEAN DEFAULT FALSE,
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- =============================================
-- 10. REVIEWS
-- =============================================
CREATE TABLE reviews (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    listing_id  BIGINT REFERENCES listings(id),
    booking_id  BIGINT REFERENCES bookings(id),
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       TEXT,
    body        TEXT,
    approved    BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 11. CONVERSATIONS & MESSAGES
-- =============================================
CREATE TABLE conversations (
    id              BIGSERIAL PRIMARY KEY,
    listing_id      BIGINT REFERENCES listings(id),
    buyer_id        BIGINT NOT NULL REFERENCES users(id),
    seller_id       BIGINT NOT NULL REFERENCES users(id),
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller ON conversations(seller_id);

CREATE TABLE messages (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       BIGINT NOT NULL REFERENCES users(id),
    body            TEXT NOT NULL,
    read            BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- =============================================
-- 12. AUDIT LOGS (partitioned by month)
-- =============================================
CREATE TABLE audit_logs (
    id          BIGSERIAL,
    user_id     BIGINT,
    user_role   VARCHAR(20),
    action      VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30),
    entity_id   BIGINT,
    changes     JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (example)
CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- =============================================
-- 13. PAGE VIEWS (high-volume, partitioned)
-- =============================================
CREATE TABLE page_views (
    id          BIGSERIAL,
    listing_id  BIGINT NOT NULL,
    user_id     BIGINT,
    session_id  TEXT,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- =============================================
-- 14. PRICE ALERTS
-- =============================================
CREATE TABLE price_alerts (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id  BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    old_price   NUMERIC(12,2) NOT NULL,
    new_price   NUMERIC(12,2) NOT NULL,
    notified    BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 15. USER CONSENTS
-- =============================================
CREATE TABLE user_consents (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type    VARCHAR(30) NOT NULL,
        -- marketing_sms, marketing_email, marketing_whatsapp, analytics, third_party
    granted         BOOLEAN NOT NULL,
    granted_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    ip_address      INET,
    version         INTEGER DEFAULT 1
);
```

---

## 4. Authentication & Authorization

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOWS                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  FLOW 1: OTP LOGIN (Primary — Indian customers)     │     │
│  │                                                     │     │
│  │  User enters phone → POST /api/auth/otp/send        │     │
│  │    → Rate limit check (3 per 15min per phone)       │     │
│  │    → Generate 6-digit OTP                           │     │
│  │    → Store bcrypt(OTP) in otp_requests table        │     │
│  │    → Send via MSG91 SMS                             │     │
│  │                                                     │     │
│  │  User enters OTP → POST /api/auth/otp/verify        │     │
│  │    → Validate against stored hash                   │     │
│  │    → Upsert user in users table                     │     │
│  │    → Issue JWT access token (15min, httpOnly cookie) │     │
│  │    → Issue refresh token (30 days, httpOnly cookie)  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  FLOW 2: EMAIL + PASSWORD (Admin/Dealer accounts)   │     │
│  │                                                     │     │
│  │  POST /api/auth/login { email, password }           │     │
│  │    → Find user by email_hmac                        │     │
│  │    → bcrypt.compare(password, hash)                 │     │
│  │    → Check failed_attempts & locked_until           │     │
│  │    → Issue JWT pair (same as OTP flow)              │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  FLOW 3: GOOGLE OAUTH (Optional — customers)       │     │
│  │                                                     │     │
│  │  Frontend: Google Sign-In SDK → id_token            │     │
│  │  POST /api/auth/google { idToken }                  │     │
│  │    → Verify with google-auth-library                │     │
│  │    → Check aud, iss, email_verified                 │     │
│  │    → Upsert user → Issue JWT pair                   │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### JWT Architecture

| Token | Type | Expiry | Storage | Content |
|-------|------|--------|---------|---------|
| **Access Token** | JWT (RS256) | 15 minutes | httpOnly secure cookie | `{ sub, role, permissions, iat, exp }` |
| **Refresh Token** | Opaque (random 128 chars) | 30 days | httpOnly secure cookie, path=/api/auth/refresh | Hash stored in DB |
| **CSRF Token** | Random | Session | Non-httpOnly cookie (readable by JS) | Sent as X-CSRF-Token header |

**Token Rotation:** Each refresh issues a new refresh token and invalidates the old one. If a previously-used token is presented → revoke entire token family (replay attack detected).

### RBAC Permission Matrix

| Permission | Super Admin | Admin | Manager | Sales | Content | Dealer | Customer |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Manage admin users | ✅ | — | — | — | — | — | — |
| View all listings | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ (public) |
| Create/edit listing | ✅ | ✅ | ✅ | — | ✅ (content) | Own | — |
| Delete listing | ✅ | ✅ | ✅ | — | — | Own | — |
| Manage pricing | ✅ | ✅ | ✅ | — | — | Own | — |
| View all leads/bookings | ✅ | ✅ | ✅ | Assigned | — | Own | — |
| Process payments/refunds | ✅ | ✅ | — | — | — | — | — |
| View analytics | ✅ | ✅ | ✅ | — | — | Own (limited) | — |
| Book test drive | — | — | — | — | — | — | ✅ |
| Reserve car | — | — | — | — | — | — | ✅ |
| Save to wishlist | — | — | — | — | — | — | ✅ |
| Send messages | — | — | — | ✅ | — | ✅ | ✅ |
| View audit logs | ✅ | ✅ | — | — | — | — | — |

---

## 5. Data Privacy & Encryption

### PII Encryption Strategy

```
┌──────────────────────────────────────────────────────┐
│              PII ENCRYPTION ARCHITECTURE              │
│                                                      │
│  Phone: +91 98765 43210                              │
│         │                                            │
│         ├──► AES-256-GCM encrypt → phone_encrypted   │
│         │    (for authorized decryption)              │
│         │                                            │
│         ├──► HMAC-SHA256 → phone_hmac                │
│         │    (for exact-match lookup without decrypt) │
│         │                                            │
│         └──► Last 4 digits → phone_last4: "3210"     │
│              (for display: ****3210)                  │
│                                                      │
│  Keys:                                               │
│    ENCRYPTION_KEY → AWS Secrets Manager               │
│    HMAC_KEY       → AWS Secrets Manager               │
│    Rotation: quarterly, with key_version tracking     │
└──────────────────────────────────────────────────────┘
```

### Fields Requiring Encryption

| Field | Classification | Encryption | Storage |
|-------|---------------|------------|---------|
| Phone number | Sensitive PII | AES-256-GCM + HMAC | Encrypted + HMAC + last4 |
| Email | PII | AES-256-GCM + HMAC | Encrypted + HMAC |
| Aadhaar | Highly Sensitive | AES-256-GCM | Separate restricted table |
| PAN | Sensitive | AES-256-GCM | Separate restricted table |
| Full name | PII | AES-256-GCM | Encrypted |
| Password | Auth credential | bcrypt (cost 12) | One-way hash only |
| IP addresses | PII (GDPR) | Truncate after 90 days | Pseudonymize |

### Data Retention & Deletion

| Data | Retention | Deletion Method |
|------|-----------|-----------------|
| Active accounts | Indefinite | User-requested or admin-initiated |
| Inactive accounts | 24 months | Auto-notify at 22mo, delete at 24mo |
| OTP records | 15 minutes | TTL auto-delete |
| Refresh tokens | 30 days | Cron job cleans expired daily |
| Audit logs | 3 years | Archive to S3 after 1 year |
| Analytics data | 1 year identifiable | Anonymize, then retain aggregates |
| Sold listings | 5 years | Archive, restrict access |

### Right to Deletion

1. User requests deletion → `POST /api/account/delete-request`
2. 30-day grace period (user can cancel)
3. After 30 days: replace all PII with `[DELETED]`, retain anonymized transaction records, delete sessions/tokens, delete profile images
4. Audit log records the deletion event (without PII)

---

## 6. Real-Time Architecture

### Socket.IO + Redis Pub/Sub

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Browser 1 │  │ Browser 2 │  │ Browser 3 │
│ (Delhi)   │  │ (Mumbai)  │  │ (Admin)   │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │              │
      │     WebSocket connections    │
      │              │              │
┌─────▼──────────────▼──────────────▼─────┐
│              ALB (sticky sessions)       │
└────────┬───────────────────┬────────────┘
         │                   │
┌────────▼────────┐ ┌───────▼─────────┐
│  Node Instance 1 │ │  Node Instance 2 │
│  Socket.IO       │ │  Socket.IO       │
│                  │ │                  │
│  @socket.io/     │ │  @socket.io/     │
│  redis-adapter   │ │  redis-adapter   │
└────────┬────────┘ └───────┬─────────┘
         │                   │
         └─────────┬─────────┘
                   │
          ┌────────▼────────┐
          │   Redis Pub/Sub  │
          │                  │
          │  Channels:       │
          │  listing:5:viewers│
          │  user:42:notify  │
          │  admin:feed      │
          │  chat:conv:17    │
          └──────────────────┘
```

### Real-Time Features

| Feature | Implementation | Update Frequency |
|---------|---------------|-----------------|
| **Viewer count** ("8 people viewing") | Redis SET per listing, INCR on join, DECR on leave. Broadcast count to listing room every 5s. | Every 5 seconds |
| **Car status changes** | When booking created → emit `status_changed` to listing room. All viewers see "Reserved" instantly. | Immediate |
| **Price drop alerts** | On price update → query wishlists table → emit to each user's room → create notification record. | Immediate |
| **Booking confirmations** | On payment success → emit to user room + admin room. | Immediate |
| **Live chat** | Per-conversation room. Message persisted to DB, then emitted. Typing indicators via volatile emit. Read receipts. | Immediate |
| **Admin dashboard feed** | Admin room receives: new bookings, new inquiries, new listings, status changes. | Immediate |
| **New listing matches** | On new listing → check saved_searches table → match against filters → notify matching users. | Within 1 minute (batched) |

### Handling Edge Cases

| Edge Case | Solution |
|-----------|----------|
| Socket disconnects | Client auto-reconnects (Socket.IO built-in). Missed events replayed from notification queue. |
| Server restarts | Redis adapter ensures cross-instance communication. Viewer counts reconstructed from Redis SETs. |
| Multiple tabs | Deduplicate via `socket.id` in Redis SET. One connection per tab is fine; viewer count uses unique user IDs. |
| View count bots | Rate-limit view increments to 1 per user per listing per 5 minutes. Use fingerprinting. |

---

## 7. Payment System

### Razorpay Integration Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Browser  │────►│  Our Server   │────►│   Razorpay    │────►│   Bank   │
│           │     │               │     │               │     │          │
│ 1. Click  │     │ 2. Create     │     │               │     │          │
│    Reserve│     │    Order      │     │               │     │          │
│           │◄────│ 3. Return     │     │               │     │          │
│           │     │    order_id   │     │               │     │          │
│ 4. Open   │─────────────────────────►│               │     │          │
│    Razorpay│                    │     │ 5. Process    │────►│ 6. Debit │
│    Checkout│◄────────────────────────│    Payment    │◄────│          │
│           │     │               │     │               │     │          │
│ 7. Send   │────►│ 8. Verify     │     │               │     │          │
│    result  │     │    Signature  │     │               │     │          │
│           │◄────│ 9. Confirm    │     │               │     │          │
│           │     │    booking    │     │               │     │          │
│           │     │               │◄────│10. Webhook    │     │          │
│           │     │11. Double     │     │   (backup)    │     │          │
│           │     │    verify     │     │               │     │          │
└──────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

### Deposit Amounts

| Car Price Range | Deposit | Hold Duration |
|----------------|---------|---------------|
| Under ₹5 Lakh | ₹5,000 | 48 hours |
| ₹5-15 Lakh | ₹10,000 | 48 hours |
| ₹15-30 Lakh | ₹20,000 | 72 hours |
| Above ₹30 Lakh | ₹30,000 | 72 hours |

### Payment Security

- **Never store card data** — Razorpay handles all sensitive payment info (PCI DSS Level 1)
- **Signature verification** — HMAC-SHA256 with `crypto.timingSafeEqual()` (constant-time comparison)
- **Idempotency** — UUID idempotency key on every payment creation, unique constraint in DB
- **Webhook verification** — Verify `X-Razorpay-Signature` header against raw request body
- **Duplicate webhook handling** — Store `event_id`, skip if already processed

---

## 8. Booking & Reservation Engine

### State Machine

```
                    ┌──────────┐
                    │ AVAILABLE │
                    └─────┬────┘
                          │ User clicks "Reserve"
                          ▼
                    ┌──────────┐
          Timeout   │ PAYMENT   │  Payment fails
         ┌─────────│ PENDING   │──────────┐
         │         └─────┬────┘           │
         │               │ Payment success│
         ▼               ▼                ▼
  ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ AVAILABLE │    │ RESERVED  │    │ AVAILABLE │
  │ (restored)│    │ (48-72hr) │    │ (restored)│
  └──────────┘    └─────┬────┘    └──────────┘
                        │
              ┌─────────┼──────────┐
              │         │          │
        Expires    Completes   Cancelled
              │         │          │
              ▼         ▼          ▼
        ┌─────────┐ ┌────────┐ ┌──────────┐
        │AVAILABLE│ │  SOLD  │ │AVAILABLE  │
        │+ Refund │ │        │ │+ Refund   │
        └─────────┘ └────────┘ └──────────┘
```

### Reservation Locking

```sql
-- Use SELECT FOR UPDATE to prevent double-booking
BEGIN;
SELECT id, listing_status FROM listings
WHERE id = $1 AND listing_status = 'Active'
FOR UPDATE;

-- If row returned and status is Active:
UPDATE listings SET listing_status = 'Reserved' WHERE id = $1;
INSERT INTO bookings (listing_id, user_id, type, status, deposit_amount, expires_at)
VALUES ($1, $2, 'reservation', 'confirmed', $3, NOW() + INTERVAL '48 hours');
COMMIT;

-- If row not returned or status != Active:
ROLLBACK;
-- Return error: "Car is no longer available"
```

### Expiration Cron

```
Every 5 minutes:
  1. Find bookings WHERE type='reservation' AND status='confirmed'
     AND expires_at < NOW()
  2. For each expired booking:
     - Update booking status → 'expired'
     - Update listing status → 'Active'
     - Initiate refund via Razorpay
     - Notify user via SMS/email/push
     - Emit real-time status change to listing room
```

---

## 9. Messaging & Notifications

### Notification Channels

| Channel | Provider | Use Cases |
|---------|----------|-----------|
| **In-App** | Socket.IO + DB | All notifications (primary) |
| **SMS** | MSG91 | OTP, booking confirmations, test drive reminders |
| **Email** | AWS SES | Booking details, price drops, newsletters |
| **Push** | Firebase Cloud Messaging | Price drops, new matches (mobile PWA) |
| **WhatsApp** | WhatsApp Business API (Interakt) | Booking confirmations, delivery updates |

### Notification Events

| Event | Channels | Template |
|-------|----------|----------|
| OTP sent | SMS | "Your OTP is {code}. Valid for 5 minutes." |
| Booking confirmed | SMS + Email + In-App + WhatsApp | "Your {type} for {car} is confirmed." |
| Test drive reminder | SMS + In-App | "Reminder: Test drive for {car} tomorrow at {time}" |
| Reservation expiring | SMS + Email + In-App | "Your reservation for {car} expires in 6 hours." |
| Price drop | Email + In-App + Push | "{car} price dropped from {old} to {new}!" |
| New listing match | Email + In-App + Push | "New car matching your saved search: {car}" |
| Car sold | In-App | "The {car} you were viewing has been sold." |
| Message received | In-App + Push | "New message from SearchAnyCars about {car}" |

### Live Chat Architecture

```
Buyer                    Server                    Seller/Admin
  │                        │                            │
  │ send_message           │                            │
  ├───────────────────────►│                            │
  │                        │ 1. Validate & persist      │
  │                        │    to messages table        │
  │                        │                            │
  │                        │ 2. Emit to conversation room│
  │                        ├───────────────────────────►│
  │                        │                            │ new_message
  │                        │                            │
  │                        │ 3. If recipient offline:   │
  │                        │    Queue push notification │
  │                        │    Send email after 5min   │
  │                        │                            │
  │ typing_start           │                            │
  ├───────────────────────►│ (volatile — no persistence)│
  │                        ├───────────────────────────►│
  │                        │                            │ user_typing
```

---

## 10. Search & Performance

### Full-Text Search (PostgreSQL)

```sql
-- Search query with weighted ranking
SELECT l.*, ts_rank(l.search_vector,
    plainto_tsquery('english', $1)) AS rank
FROM listings l
WHERE l.search_vector @@ plainto_tsquery('english', $1)
  AND l.listing_status = 'Active'
ORDER BY rank DESC, l.featured_listing DESC
LIMIT 20 OFFSET $2;
```

### Faceted Search (Filter Counts)

```sql
-- Single query returning all facet counts
WITH base AS (
    SELECT * FROM listings
    WHERE listing_status = 'Active'
      AND listing_price_inr BETWEEN $1 AND $2
)
SELECT
    'fuel_type' AS facet,
    fuel_type AS value,
    COUNT(*) AS count
FROM base GROUP BY fuel_type
UNION ALL
SELECT
    'transmission_type',
    transmission_type,
    COUNT(*)
FROM base GROUP BY transmission_type
UNION ALL
SELECT
    'body_style',
    body_style,
    COUNT(*)
FROM base GROUP BY body_style;
```

### Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Homepage load | < 2s on 4G | SSR + CDN + optimized images |
| Search response | < 500ms | PostgreSQL indexes + Redis cache (60s TTL) |
| Detail page load | < 1.5s | CDN for images + Redis cache for listing data |
| Image loading | Progressive | WebP + blur placeholder (LQIP) + lazy load |
| Time to Interactive | < 3s | Code splitting + tree shaking |
| Lighthouse score | 90+ | SSR + optimized bundle + proper caching headers |

### SSR Migration (Vite → Next.js)

```
Current: Vite SPA (client-side only)
  - No SEO (Google sees empty page)
  - No social media previews (no meta tags)
  - Slower perceived load (JS must execute before content)

Target: Next.js with App Router
  - Server-rendered listing pages (SEO-critical)
  - Dynamic meta tags per car (Open Graph for sharing)
  - Streaming SSR for fast first-byte
  - Static generation for /about, /faq, /how-it-works
  - API routes co-located (optional)
```

---

## 11. File Storage & CDN

### S3 + CloudFront Architecture

```
Admin uploads image
        │
        ▼
  ┌──────────────┐
  │  Sharp Pipeline │
  │  (Node.js)      │
  │                  │
  │  1. Validate     │  Reject if: not image, < 800x600,
  │     (file-type)  │  blurry, wrong aspect ratio
  │                  │
  │  2. Process      │  Generate 4 variants:
  │     (sharp)      │    large: 1400px wide, WebP, q80
  │                  │    medium: 800px wide, WebP, q75
  │  3. Watermark    │    thumb: 300px wide, WebP, q70
  │     (composite)  │    og: 1200x630, for social sharing
  │                  │
  │  4. Strip EXIF   │  Remove GPS, camera data (privacy)
  └───────┬──────────┘
          │
          ▼
  ┌──────────────┐     ┌──────────────┐
  │   AWS S3      │────►│  CloudFront   │
  │               │     │  CDN          │
  │  /listings/   │     │               │
  │  {id}/        │     │  Edge cache   │
  │  large.webp   │     │  30-day TTL   │
  │  medium.webp  │     │  Immutable    │
  │  thumb.webp   │     │  content hash │
  │  og.webp      │     │  in filename  │
  └──────────────┘     └──────────────┘
```

---

## 12. API Security Hardening

### Security Headers (via `helmet`)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self';
    img-src 'self' https://cdn.searchanycars.com data:;
    connect-src 'self' wss://searchanycars.com;
    frame-ancestors 'none'
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Rate Limiting Tiers

| Tier | Limit | Window | Applied To |
|------|-------|--------|-----------|
| Public (unauthenticated) | 60 req | 1 min | Per IP |
| Authenticated (customer) | 120 req | 1 min | Per user ID |
| Admin | 500 req | 1 min | Per user ID |
| OTP send | 3 req | 15 min | Per phone |
| OTP verify | 5 attempts | 15 min | Per phone |
| Login | 5 attempts | 15 min | Per email |
| Image upload | 30 uploads | 1 hour | Per user ID |
| Search | 30 req | 1 min | Per IP |

### Input Validation (Zod)

```
Every API endpoint validated with Zod schemas:
  - Type checking (string, number, enum)
  - Range validation (price > 0, year 2000-2030)
  - Format validation (phone: /^\+91[6-9]\d{9}$/, email regex)
  - Length limits (title < 200 chars, notes < 5000 chars)
  - Sanitization (HTML stripped from all text fields)
  - 400 response with structured error details on failure
```

---

## 13. Cloud Infrastructure (AWS)

```
┌─────────────────────────────────────────────────────────┐
│                        AWS VPC                           │
│                   (ap-south-1, Mumbai)                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │              PUBLIC SUBNET (AZ-a, AZ-b)         │     │
│  │                                                 │     │
│  │  ┌─────────────┐        ┌─────────────┐        │     │
│  │  │    ALB       │        │  NAT Gateway │        │     │
│  │  │  (HTTPS)     │        │  (outbound)  │        │     │
│  │  └──────┬──────┘        └──────┬──────┘        │     │
│  └─────────┼───────────────────────┼───────────────┘     │
│            │                       │                      │
│  ┌─────────┼───────────────────────┼───────────────┐     │
│  │         │  PRIVATE SUBNET (AZ-a, AZ-b)          │     │
│  │         │                       │                │     │
│  │  ┌──────▼──────┐  ┌────────────▼────────────┐   │     │
│  │  │ ECS Fargate  │  │  ECS Fargate            │   │     │
│  │  │ API + Socket │  │  API + Socket           │   │     │
│  │  │ Instance 1   │  │  Instance 2             │   │     │
│  │  └──────┬──────┘  └──────┬──────────────────┘   │     │
│  │         │                 │                       │     │
│  │  ┌──────▼─────────────────▼────────────────┐     │     │
│  │  │           PRIVATE DATA SUBNET            │     │     │
│  │  │                                          │     │     │
│  │  │  ┌──────────────┐  ┌──────────────┐     │     │     │
│  │  │  │ RDS Postgres  │  │ ElastiCache   │     │     │     │
│  │  │  │ Multi-AZ      │  │ Redis         │     │     │     │
│  │  │  │ Primary +     │  │ Cluster       │     │     │     │
│  │  │  │ Standby       │  │               │     │     │     │
│  │  │  └──────────────┘  └──────────────┘     │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  └───────────────────────────────────────────────────┘     │
│                                                            │
│  External:  S3 (images) + CloudFront (CDN)                │
│             SES (email) + SNS (SMS trigger)                │
│             Secrets Manager (keys)                         │
│             CloudWatch (monitoring)                        │
└────────────────────────────────────────────────────────────┘
```

---

## 14. CI/CD Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   Push    │───►│   Lint    │───►│   Test   │───►│  Build   │───►│  Deploy  │
│  to main  │    │  + Type   │    │  Unit +  │    │  Docker  │    │  Staging │
│           │    │  Check    │    │  API     │    │  Image   │    │  → Prod  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                      │
                               ┌──────▼──────┐
                               │  Security   │
                               │  Scan       │
                               │  (npm audit │
                               │  + Snyk)    │
                               └─────────────┘
```

### Deployment Strategy

- **Staging:** Auto-deploy on push to `develop` branch
- **Production:** Deploy on push to `main` (after PR review + CI pass)
- **Strategy:** Blue-green deployment via ECS (zero-downtime)
- **Rollback:** Instant — ECS reverts to previous task definition
- **DB Migrations:** Run before deploy via `node-pg-migrate`, with rollback scripts

---

## 15. Monitoring & Observability

### Dashboards

| Dashboard | Metrics |
|-----------|---------|
| **Business** | Active listings, bookings/day, conversion rate, revenue, GMV |
| **Application** | API latency (p50/p95/p99), error rate, throughput |
| **Infrastructure** | CPU, memory, disk, DB connections, Redis memory |
| **Real-Time** | Active WebSocket connections, messages/sec, viewer counts |
| **Security** | Failed logins, rate limit hits, blocked requests |

### Alerting Rules

| Alert | Condition | Severity | Notification |
|-------|-----------|----------|-------------|
| API error rate > 5% | 5-minute window | Critical | PagerDuty + Slack |
| API latency p95 > 2s | 5-minute window | Warning | Slack |
| DB connections > 80% | Threshold | Warning | Slack |
| Disk space < 20% | Threshold | Warning | Email |
| Payment failure rate > 10% | 15-minute window | Critical | PagerDuty + Slack + SMS |
| Zero bookings in 24hr | Cron check | Warning | Slack |

---

## 16. Conflict & Edge Case Analysis

### Booking Conflicts

| # | Conflict | Impact | Probability |
|---|----------|--------|-------------|
| 1 | Two users reserve the same car simultaneously | One user's payment goes through for a car that's already reserved | High |
| 2 | Payment gateway times out during deposit | Car locked but payment status unknown | Medium |
| 3 | Reservation expires while user is completing payment | User pays for an expired hold | Medium |
| 4 | Refund fails after cancellation | User's money stuck | Low |
| 5 | Test drive booked for a car that gets sold | User arrives, car is gone | Medium |
| 6 | Double booking of same time slot for test drives | Two customers show up at same time | Medium |

### Inventory Conflicts

| # | Conflict | Impact | Probability |
|---|----------|--------|-------------|
| 7 | Admin updates price while user is on checkout page | User sees different price than what they pay | High |
| 8 | Car marked as sold but refund hasn't completed | Car can't be re-listed until refund settles | Low |
| 9 | Same car submitted by two different dealers | Duplicate listing confusion | Medium |
| 10 | Image upload fails midway (3 of 10 uploaded) | Listing has incomplete photos | Medium |
| 11 | Admin deletes a car that has active bookings | Orphaned bookings, angry customers | Low |

### Real-Time Conflicts

| # | Conflict | Impact | Probability |
|---|----------|--------|-------------|
| 12 | WebSocket connection drops | User misses status update, sees stale data | High |
| 13 | Server restarts lose viewer counts | Counts reset to zero temporarily | Medium |
| 14 | Multiple browser tabs inflate view count | Inaccurate popularity metrics | High |
| 15 | Notification sent for price drop that gets reverted | User sees phantom price drop | Low |

### Payment Conflicts

| # | Conflict | Impact | Probability |
|---|----------|--------|-------------|
| 16 | UPI timeout (5-minute window common in India) | Status unknown — paid or not? | High |
| 17 | Webhook arrives before redirect callback | Server processes completion before frontend knows | Medium |
| 18 | Duplicate webhook delivery from Razorpay | Double-processing (double credit, double notification) | Medium |
| 19 | Partial payment received (rare) | Booking in limbo — not fully paid, not failed | Low |

---

## 17. Resolution Strategies

### Conflict 1: Simultaneous Reservation (Critical)

```sql
-- PESSIMISTIC LOCKING via SELECT FOR UPDATE
BEGIN;
  -- This acquires a row-level lock. Second request blocks until first commits.
  SELECT id FROM listings
  WHERE id = $1 AND listing_status = 'Active'
  FOR UPDATE NOWAIT;
  -- NOWAIT: if lock is held, immediately return error instead of waiting

  -- If we get here, we have the lock
  UPDATE listings SET listing_status = 'Reserved' WHERE id = $1;
  INSERT INTO bookings (...) VALUES (...);
COMMIT;

-- Second user gets: ERROR: could not obtain lock on row
-- Frontend shows: "This car was just reserved. Check back soon."
```

### Conflict 2: Payment Gateway Timeout

```
1. Create booking with status = 'payment_pending'
2. Lock car with listing_status = 'Payment Processing' (5-min TTL)
3. Create Razorpay order → save order_id
4. If frontend callback arrives → verify signature → confirm booking
5. If no callback within 5 minutes:
   - Cron job checks: call Razorpay Orders API to fetch actual status
   - If paid → confirm booking (idempotent)
   - If not paid → release lock, cancel booking
6. If webhook arrives (backup) → same verification + idempotent update
```

### Conflict 7: Stale Price on Checkout

```
1. When creating order, include listing price as of that moment
2. Store price_at_booking in bookings table
3. On payment verification, compare:
   - If current_price == price_at_booking → proceed
   - If current_price < price_at_booking → proceed (customer benefits)
   - If current_price > price_at_booking → notify customer, require re-confirmation
4. Use optimistic locking: listings table has version column
   - Checkout sends version → if mismatch, reject with "Price has changed"
```

### Conflict 14: Multi-Tab View Count Inflation

```
1. Viewer count uses Redis SET (not counter)
   - Key: viewers:listing:{id}
   - Members: user_id or session_id (unique per user)
2. On Socket.IO join:
   SADD viewers:listing:5 "user:42"
   SCARD viewers:listing:5 → broadcast count
3. On Socket.IO leave:
   SREM viewers:listing:5 "user:42"
   SCARD viewers:listing:5 → broadcast count
4. Multiple tabs from same user = same member in SET = counted once
5. Expire SET members after 5 minutes of no heartbeat
```

### Conflict 16: UPI Timeout

```
UPI payments have a 5-minute completion window:

1. Create Razorpay order, lock car (5-min hold)
2. User initiates UPI payment → opens UPI app
3. Timer starts (5 minutes)

CASE A: Payment completes within 5 minutes
  → Webhook/callback received → verify → confirm booking → release hold ✓

CASE B: Payment not completed within 5 minutes
  → DO NOT immediately cancel
  → Extend hold to 10 minutes
  → Run reconciliation: poll Razorpay Orders API
  → If paid → confirm (late success)
  → If not paid after 10 minutes → release hold, mark booking expired

CASE C: UPI shows "pending" for hours (bank-side delay)
  → Webhook will arrive when bank settles
  → If car was re-listed and reserved by someone else:
    → Initiate automatic refund to first user
    → Notify: "Payment received but car is no longer available. Full refund initiated."
```

### Conflict 18: Duplicate Webhooks

```
1. Every Razorpay webhook includes event_id
2. Store event_id in payments table (UNIQUE constraint)
3. On webhook:
   - Try INSERT event_id → if succeeds, process normally
   - If UNIQUE constraint violation → webhook already processed → return 200 (idempotent)
4. All payment status updates use idempotent state transitions:
   - Only allow: created → captured (never captured → captured)
   - Only allow: captured → refunded (never refunded → captured)
```

---

## 18. Feature Gap Analysis

### What Needs to Be Built

| Module | Features Needed | Priority | Complexity |
|--------|----------------|----------|------------|
| **Authentication** | OTP login, email/password, Google OAuth, JWT, session management, rate limiting, account lockout | P0 | High |
| **Booking System** | Test drive scheduling, car reservation, status machine, expiration cron, calendar view | P0 | High |
| **Payment** | Razorpay integration, deposit collection, refund processing, webhook handling, receipt generation | P0 | High |
| **Database** | PostgreSQL migration, 16 new tables, connection pooling, read replicas | P0 | High |
| **Real-Time** | Socket.IO setup, viewer counts, status broadcasts, notification delivery, Redis pub/sub | P1 | High |
| **Notifications** | In-app, SMS (MSG91), email (SES), push (FCM), WhatsApp, templates | P1 | Medium |
| **Messaging** | Buyer-seller chat, conversation threads, typing indicators, read receipts | P1 | Medium |
| **Dealer Portal** | Separate login, listing submission, own inventory view, sales dashboard | P1 | Medium |
| **Wishlist** | Migrate from localStorage to DB, sync across devices, price drop alerts | P1 | Low |
| **Reviews** | Post-purchase reviews, star ratings, admin approval, display on listings | P2 | Low |
| **Analytics** | View tracking, conversion funnel, popular cars dashboard, search analytics | P2 | Medium |
| **SEO/SSR** | Next.js migration, dynamic meta tags, sitemap, structured data | P2 | High |
| **Comparison** | Side-by-side car compare (up to 3), spec diff highlighting | P2 | Low |
| **Valuation** | "What's my car worth?" tool, based on make/model/year/km data | P3 | Medium |
| **Financing** | Bank partner API integration, loan application, pre-approval | P3 | High |
| **Document Management** | KYC upload, RC transfer tracking, insurance docs | P3 | Medium |

---

## 19. Implementation Roadmap (24 Weeks)

### Phase 1: Foundation (Weeks 1-3)

```
┌─────────────────────────────────────────────────────┐
│  PHASE 1: DATABASE + AUTH                            │
│  Team: 2 backend + 1 frontend                       │
│                                                      │
│  Week 1:                                             │
│  ├── PostgreSQL schema creation (all 16 tables)      │
│  ├── Data migration script (SQLite → PostgreSQL)     │
│  ├── Replace better-sqlite3 with pg-pool             │
│  └── Update all queries to PostgreSQL syntax          │
│                                                      │
│  Week 2:                                             │
│  ├── JWT auth middleware (RS256)                      │
│  ├── OTP login flow (MSG91 integration)              │
│  ├── Email/password login (bcrypt)                   │
│  ├── Refresh token rotation                          │
│  └── RBAC middleware + protect all endpoints          │
│                                                      │
│  Week 3:                                             │
│  ├── Frontend: Login/Register UI                     │
│  ├── Frontend: Auth context + protected routes       │
│  ├── Wishlist migration (localStorage → DB)          │
│  ├── Security headers (helmet)                       │
│  ├── Input validation (zod) on all endpoints         │
│  └── Rate limiting                                   │
│                                                      │
│  Deliverable: Authenticated platform with PostgreSQL  │
└─────────────────────────────────────────────────────┘
```

### Phase 2: Bookings + Payments (Weeks 4-7)

```
┌─────────────────────────────────────────────────────┐
│  PHASE 2: BOOKING ENGINE + RAZORPAY                  │
│  Team: 2 backend + 1 frontend                       │
│                                                      │
│  Week 4-5:                                           │
│  ├── Booking API (test drives + reservations)        │
│  ├── Pessimistic locking for reservations            │
│  ├── Razorpay order creation + payment verification  │
│  ├── Webhook endpoint with signature verification    │
│  ├── Reservation expiration cron job                 │
│  └── Refund processing flow                          │
│                                                      │
│  Week 6-7:                                           │
│  ├── Frontend: Booking flow UI (replaces mock modals)│
│  ├── Frontend: Razorpay Checkout integration         │
│  ├── Frontend: My Bookings page                      │
│  ├── Frontend: Booking status tracking               │
│  ├── Admin: Booking management dashboard             │
│  └── UPI timeout handling + reconciliation           │
│                                                      │
│  Deliverable: Live booking + payment system           │
└─────────────────────────────────────────────────────┘
```

### Phase 3: Real-Time + Notifications (Weeks 8-10)

```
┌─────────────────────────────────────────────────────┐
│  PHASE 3: REAL-TIME FEATURES                         │
│  Team: 1 backend + 1 frontend + 0.5 DevOps          │
│                                                      │
│  Week 8:                                             │
│  ├── Redis setup (ElastiCache)                       │
│  ├── Socket.IO server with Redis adapter             │
│  ├── Real-time viewer count per listing              │
│  ├── Live booking status updates                     │
│  └── Caching layer (listing data, filter counts)     │
│                                                      │
│  Week 9-10:                                          │
│  ├── Notification system (DB + delivery)             │
│  ├── MSG91 SMS integration (booking, reminders)      │
│  ├── AWS SES email integration                       │
│  ├── In-app notification UI + bell icon              │
│  ├── Price drop alerts (wishlist → notification)     │
│  ├── New listing match notifications                 │
│  └── Admin real-time dashboard feed                  │
│                                                      │
│  Deliverable: Real-time platform with notifications   │
└─────────────────────────────────────────────────────┘
```

### Phase 4: Messaging + Dealers (Weeks 11-14)

```
┌─────────────────────────────────────────────────────┐
│  PHASE 4: COMMUNICATION + DEALER PORTAL              │
│  Team: 2 backend + 2 frontend                       │
│                                                      │
│  Week 11-12:                                         │
│  ├── Conversation + Message tables                   │
│  ├── Live chat API + Socket.IO rooms                 │
│  ├── Typing indicators + read receipts               │
│  ├── Frontend: Chat UI component                     │
│  ├── WhatsApp Business API integration               │
│  └── Chat notification delivery                      │
│                                                      │
│  Week 13-14:                                         │
│  ├── Dealer registration + approval workflow         │
│  ├── Dealer portal: own listings CRUD                │
│  ├── Dealer portal: leads + booking view             │
│  ├── Dealer portal: sales dashboard                  │
│  ├── Admin: dealer management + commission tracking  │
│  └── Row-level security enforcement                  │
│                                                      │
│  Deliverable: Full communication + dealer ecosystem   │
└─────────────────────────────────────────────────────┘
```

### Phase 5: SEO + Analytics (Weeks 15-18)

```
┌─────────────────────────────────────────────────────┐
│  PHASE 5: SEO + ANALYTICS + CONTENT                  │
│  Team: 1 backend + 2 frontend + 0.5 DevOps          │
│                                                      │
│  Week 15-16:                                         │
│  ├── Next.js migration (SSR for SEO)                 │
│  ├── Dynamic meta tags per listing                   │
│  ├── Structured data (Schema.org/Car)                │
│  ├── XML sitemap generation                          │
│  ├── SEO-friendly URLs (/used-hyundai-creta-delhi)   │
│  └── Social sharing (Open Graph tags)                │
│                                                      │
│  Week 17-18:                                         │
│  ├── Analytics tracking (page views, conversions)    │
│  ├── Admin analytics dashboard (charts, funnels)     │
│  ├── PostgreSQL full-text search optimization        │
│  ├── Blog/CMS for SEO content                        │
│  ├── Review/rating system                            │
│  └── Car comparison tool (side-by-side)              │
│                                                      │
│  Deliverable: SEO-optimized, data-driven platform     │
└─────────────────────────────────────────────────────┘
```

### Phase 6: Scale + Advanced (Weeks 19-24)

```
┌─────────────────────────────────────────────────────┐
│  PHASE 6: SCALE + ADVANCED FEATURES                  │
│  Team: 2 backend + 1 frontend + 1 DevOps            │
│                                                      │
│  Week 19-20:                                         │
│  ├── AWS infrastructure (ECS, RDS, ElastiCache)      │
│  ├── CI/CD pipeline (GitHub Actions)                 │
│  ├── S3 + CloudFront image migration                 │
│  ├── Sharp image processing pipeline                 │
│  ├── Monitoring + alerting (CloudWatch + Sentry)     │
│  └── Load testing + performance optimization         │
│                                                      │
│  Week 21-22:                                         │
│  ├── Car valuation tool ("What's my car worth?")     │
│  ├── Financing partner integration                   │
│  ├── Document management (KYC, RC transfer)          │
│  ├── PWA setup (offline, installable)                │
│  └── PII encryption implementation                   │
│                                                      │
│  Week 23-24:                                         │
│  ├── Security audit + penetration testing            │
│  ├── GDPR/IT Act compliance verification             │
│  ├── Disaster recovery testing                       │
│  ├── Performance optimization pass                   │
│  ├── User acceptance testing                         │
│  └── Production launch preparation                   │
│                                                      │
│  Deliverable: Production-ready, scalable platform     │
└─────────────────────────────────────────────────────┘
```

---

## 20. Cost Estimation (Monthly)

### Phase 1 — Startup (0-1K users)

| Service | Spec | Monthly Cost |
|---------|------|-------------|
| ECS Fargate | 2 tasks, 0.5 vCPU, 1GB each | ~$30 |
| RDS PostgreSQL | db.t3.micro, single AZ | ~$15 |
| ElastiCache Redis | cache.t3.micro | ~$13 |
| S3 | 20GB storage | ~$1 |
| CloudFront | 100GB transfer | ~$9 |
| Route 53 | 1 hosted zone | ~$1 |
| SES | 5K emails | ~$1 |
| MSG91 | 5K SMS | ~$15 |
| Cloudflare | Free plan | $0 |
| Sentry | Free tier | $0 |
| **Total** | | **~$85/month** |

### Phase 2 — Growth (1K-10K users)

| Service | Spec | Monthly Cost |
|---------|------|-------------|
| ECS Fargate | 4 tasks, 1 vCPU, 2GB each | ~$120 |
| RDS PostgreSQL | db.t3.medium, Multi-AZ | ~$130 |
| ElastiCache Redis | cache.t3.small, replica | ~$50 |
| S3 | 100GB storage | ~$3 |
| CloudFront | 500GB transfer | ~$45 |
| ALB | Standard | ~$25 |
| SES | 50K emails | ~$5 |
| MSG91 | 50K SMS | ~$75 |
| Cloudflare | Pro plan | ~$20 |
| Sentry | Team plan | ~$26 |
| **Total** | | **~$500/month** |

### Phase 3 — Scale (10K-100K users)

| Addition | Cost |
|----------|------|
| Elasticsearch | ~$300 |
| Read replicas (2) | ~$200 |
| Larger Fargate tasks | ~$200 |
| WhatsApp API | ~$100 |
| **Total** | **~$1,300/month** |

---

## 21. Team Requirements

### Minimum Viable Team

| Role | Count | Responsibilities |
|------|-------|-----------------|
| **Backend Engineer (Senior)** | 1 | Architecture, auth, payments, real-time, database |
| **Backend Engineer (Mid)** | 1 | API endpoints, notifications, dealer portal, crons |
| **Frontend Engineer (Senior)** | 1 | Next.js migration, SSR, real-time UI, chat UI |
| **Frontend Engineer (Mid)** | 1 | Pages, components, booking flow, admin dashboard |
| **DevOps Engineer (Part-time)** | 0.5 | AWS setup, CI/CD, monitoring, security |
| **QA Engineer (Part-time)** | 0.5 | Testing, edge cases, security testing |
| **Total** | **~4.5 FTEs** | **24 weeks to production** |

### Key Hires by Phase

| Phase | Must Have |
|-------|----------|
| Phase 1 (DB + Auth) | Senior Backend + Mid Backend |
| Phase 2 (Bookings) | + Senior Frontend |
| Phase 3 (Real-Time) | + DevOps (part-time) |
| Phase 4 (Messaging) | + Mid Frontend |
| Phase 5 (SEO) | Existing team |
| Phase 6 (Scale) | + QA (part-time) |

---

## Summary

This plan transforms SearchAnyCars from a prototype into a production-grade platform through 6 phases over 24 weeks. The critical path is:

```
PostgreSQL ──► Authentication ──► Bookings + Payments ──► Real-Time ──► Launch
  (Week 1)      (Week 2-3)        (Week 4-7)            (Week 8-10)   (Week 24)
```

**Non-negotiable before launch:**
1. Authentication (no public admin access)
2. PostgreSQL (SQLite can't handle concurrent users)
3. Payment processing (bookings must be real)
4. HTTPS + security headers
5. Input validation on every endpoint
6. Audit logging

**Can launch without (add post-launch):**
- SSR/Next.js (use prerendering as interim)
- Elasticsearch (PostgreSQL tsvector is good enough to start)
- Dealer portal (admin manages dealer inventory initially)
- WhatsApp integration
- Car valuation tool

---

*This plan was generated from a comprehensive analysis of the SearchAnyCars.com codebase, competitive research (Carvana, Spinny, Cars24, CarDekho), and production architecture best practices. Last updated: March 2026.*
