# CLAUDE.md — Step 05: Favorites, Bookings, and Admin APIs

## Project context

You are continuing the **SearchAnyCars.com v2** rebuild. Steps 01-04 are complete. The Fastify API has auth, listings CRUD, categories, filters, image upload, site config, and paginated full-text search — all working. The old codebase at `/searchanycars.com/` is READ-ONLY reference.

This is the **final backend step**. After this, the API is complete and we move to the frontend.

---

## Reference: Old implementation

Read these sections from the old codebase:
- `/searchanycars.com/server/index.js` — search for "Favorites (Wishlist)" section (~line 350) and "Test Drive Bookings" section (~line 400). Study the favorite sync logic (bulk merge with PUT /favorites), booking creation with email notification, admin booking management, and the cancel-as-soft-delete pattern.
- `/searchanycars.com/src/api/client.ts` — check how the frontend calls favorites and bookings endpoints

Key patterns to replicate:
- **Favorites**: GET user's favorites, POST add, DELETE remove, PUT bulk sync (merge local IDs with server). Return listing IDs only (not full listing objects) for the list endpoint.
- **Bookings**: GET user's bookings (with listing details joined), POST create (with fire-and-forget email), DELETE cancel (soft delete — sets status to 'cancelled'). Admin: GET all bookings with user info joined, PATCH update status.
- **Admin booking status**: The old code used GET to avoid CORS issues — we fix this by using PATCH properly since our CORS is correctly configured.

---

## What you are building in this step

### Routes to create:

**Favorites** (prefix `/api/v1/favorites`) — all require auth:
- GET `/` — get current user's favorite listing IDs (array of numbers)
- POST `/:listingId` — add a listing to favorites
- DELETE `/:listingId` — remove a listing from favorites
- PUT `/` — bulk sync: body `{ ids: number[] }` merges with existing, returns full merged list

**Bookings** (prefix `/api/v1/bookings`) — require auth:
- GET `/` — get current user's bookings with listing details (title, brand, model, price, images, location)
- POST `/` — create a booking. Send confirmation email (fire-and-forget). Validate with `createBookingSchema`.
- DELETE `/:id` — cancel a booking (set status to 'cancelled'). User can only cancel their own unless admin.

**Admin bookings** (prefix `/api/v1/admin/bookings`) — require admin:
- GET `/` — get ALL bookings with user info (name, email, phone) and listing info joined
- PATCH `/:id/status` — update booking status. Validate with `updateBookingStatusSchema`. Body: `{ status: 'pending' | 'confirmed' | 'completed' | 'cancelled' }`

---

## Success criteria

1. POST `/api/v1/favorites/1` (as logged-in user) adds listing 1 to favorites, returns 201
2. GET `/api/v1/favorites` returns `[1]`
3. DELETE `/api/v1/favorites/1` removes it, returns 200
4. PUT `/api/v1/favorites` with `{ ids: [1, 2, 3] }` merges and returns the full list
5. POST `/api/v1/bookings` with valid body creates a booking, returns 201 with booking ID
6. GET `/api/v1/bookings` returns user's bookings with listing title, brand, images joined
7. DELETE `/api/v1/bookings/:id` sets status to 'cancelled'
8. GET `/api/v1/admin/bookings` (admin) returns all bookings with user name/email and listing title
9. PATCH `/api/v1/admin/bookings/:id/status` with `{ status: "confirmed" }` updates the status
10. Non-authenticated users get 401 on all endpoints
11. Non-admin users get 403 on admin endpoints
12. `cd v2 && pnpm build` passes with zero errors
13. `/searchanycars.com/` is untouched

---

## File structure

```
v2/apps/api/src/
├── routes/
│   ├── auth.ts              # (step 03 — do not modify)
│   ├── listings.ts          # (step 04 — do not modify)
│   ├── categories.ts        # (step 04 — do not modify)
│   ├── filters.ts           # (step 04 — do not modify)
│   ├── uploads.ts           # (step 04 — do not modify)
│   ├── site-config.ts       # (step 04 — do not modify)
│   ├── favorites.ts         # NEW
│   ├── bookings.ts          # NEW
│   └── admin-bookings.ts    # NEW
└── app.ts                   # MODIFY — register new routes
```

---

## Detailed specifications

### Favorites route (`v2/apps/api/src/routes/favorites.ts`)

Register as Fastify plugin with prefix `/api/v1/favorites`. All routes require `requireAuth` preHandler.

#### GET `/` — Get user's favorites

Query `user_favorites` where `user_id = request.user.id`, ordered by `created_at DESC`. Return array of listing IDs: `[3, 1, 5]`.

#### POST `/:listingId` — Add favorite

Parse `listingId` from params (validate as positive integer). Check listing exists (404 if not). Insert into `user_favorites` with `ON CONFLICT DO NOTHING` (idempotent). Return 201 `{ message: "Added to favorites", listingId }`.

#### DELETE `/:listingId` — Remove favorite

Delete from `user_favorites` where user_id and listing_id match. Return 200 `{ message: "Removed from favorites", listingId }`.

#### PUT `/` — Bulk sync favorites

Body: `{ ids: number[] }` (validate with Zod — array of positive integers).

This is the sync endpoint used by the mobile app. It merges the provided IDs with existing server-side favorites. Logic:
1. Insert each ID with `ON CONFLICT DO NOTHING` (won't duplicate)
2. Query the full merged list
3. Return the complete array of listing IDs

This does NOT delete server-side favorites that aren't in the provided list — it's a merge, not a replace. This matches the old behavior.

### Bookings route (`v2/apps/api/src/routes/bookings.ts`)

Register with prefix `/api/v1/bookings`. All routes require `requireAuth`.

#### GET `/` — Get user's bookings

Join `test_drive_bookings` with `listings` to include listing details. Return:
```json
[
  {
    "id": 1,
    "listingId": 3,
    "carTitle": "2022 Hyundai Creta SX(O)",
    "name": "Karthi",
    "phone": "+91 9876543210",
    "email": "karthi@example.com",
    "preferredDate": "2026-04-15",
    "preferredTime": "10:00 AM",
    "locationPreference": "hub",
    "notes": null,
    "status": "pending",
    "createdAt": "2026-04-01T...",
    "listing": {
      "title": "2022 Hyundai Creta SX(O)",
      "brand": "Hyundai",
      "model": "Creta",
      "listingPriceInr": 1450000,
      "images": ["..."],
      "locationCity": "New Delhi"
    }
  }
]
```

Order by `created_at DESC`.

#### POST `/` — Create booking

Validate with `createBookingSchema` from `@searchanycars/shared`. Required: `listingId`, `name`, `phone`. Optional: `carTitle`, `email`, `preferredDate`, `preferredTime`, `locationPreference`, `notes`.

1. Check listing exists (404 if not)
2. Sanitize text inputs (strip HTML from name, phone, notes)
3. Insert into `test_drive_bookings`
4. Send confirmation email (fire-and-forget — catch and log errors, don't fail the request):
   - Look up user's email from the users table
   - If email exists and email service is configured, call `sendBookingConfirmationEmail`
5. Return 201 `{ id: booking.id, message: "Booking created successfully" }`

#### DELETE `/:id` — Cancel booking

1. Find the booking by ID
2. If not found → 404
3. If `booking.user_id !== request.user.id` AND `request.user.role !== 'admin'` → 403
4. Update status to 'cancelled' and set `updated_at`
5. Return 200 `{ message: "Booking cancelled" }`

### Admin bookings route (`v2/apps/api/src/routes/admin-bookings.ts`)

Register with prefix `/api/v1/admin/bookings`. All routes require `requireAdmin`.

#### GET `/` — Get all bookings

Join `test_drive_bookings` with `listings` AND `users` to include both listing and user info:
```json
[
  {
    "id": 1,
    "listingId": 3,
    "carTitle": "...",
    "name": "Karthi",
    "phone": "+91 9876543210",
    "status": "pending",
    "createdAt": "...",
    "listingTitle": "2022 Hyundai Creta SX(O)",
    "listingBrand": "Hyundai",
    "listingModel": "Creta",
    "listingPriceInr": 1450000,
    "userName": "Karthi",
    "userEmail": "karthi@example.com",
    "userPhone": "+91 9876543210"
  }
]
```

Order by `created_at DESC`.

#### PATCH `/:id/status` — Update booking status

Validate body with `updateBookingStatusSchema`: `{ status: 'pending' | 'confirmed' | 'completed' | 'cancelled' }`.

1. Find booking (404 if not found)
2. Update status and `updated_at`
3. Return 200 `{ message: "Booking status updated", id, status }`

### Update `v2/apps/api/src/app.ts`

Register the 3 new route plugins:
```typescript
import { favoriteRoutes } from './routes/favorites.js';
import { bookingRoutes } from './routes/bookings.js';
import { adminBookingRoutes } from './routes/admin-bookings.js';

// In createApp():
await app.register(favoriteRoutes, { prefix: '/api/v1/favorites' });
await app.register(bookingRoutes, { prefix: '/api/v1/bookings' });
await app.register(adminBookingRoutes, { prefix: '/api/v1/admin/bookings' });
```

---

## Verification steps

```bash
cd v2
pnpm install
cd apps/api && pnpm dev

# Login as regular user (use the test user from step 03, or register a new one)
curl -s -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@test.com","password":"test123","name":"Car Buyer"}' \
  -c user-cookies.txt

# Login as admin
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@searchanycars.com","password":"admin123"}' \
  -c admin-cookies.txt

# === FAVORITES ===

# Add favorite
curl -s -X POST http://localhost:4000/api/v1/favorites/1 -b user-cookies.txt
# → 201

# Add another
curl -s -X POST http://localhost:4000/api/v1/favorites/3 -b user-cookies.txt

# List favorites
curl -s http://localhost:4000/api/v1/favorites -b user-cookies.txt
# → [3, 1] or [1, 3]

# Bulk sync
curl -s -X PUT http://localhost:4000/api/v1/favorites \
  -H "Content-Type: application/json" \
  -b user-cookies.txt \
  -d '{"ids": [1, 2, 5]}'
# → merged list including 1, 2, 3, 5

# Remove favorite
curl -s -X DELETE http://localhost:4000/api/v1/favorites/3 -b user-cookies.txt

# === BOOKINGS ===

# Create booking
curl -s -X POST http://localhost:4000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -b user-cookies.txt \
  -d '{"listingId":1,"name":"Car Buyer","phone":"+91 9876543210","preferredDate":"2026-04-15","preferredTime":"10:00 AM"}'
# → 201 { id: 1, message: "Booking created successfully" }

# List my bookings
curl -s http://localhost:4000/api/v1/bookings -b user-cookies.txt
# → array with booking + listing details

# Cancel booking
curl -s -X DELETE http://localhost:4000/api/v1/bookings/1 -b user-cookies.txt
# → { message: "Booking cancelled" }

# === ADMIN BOOKINGS ===

# Create another booking first (as the user)
curl -s -X POST http://localhost:4000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -b user-cookies.txt \
  -d '{"listingId":2,"name":"Car Buyer","phone":"+91 9876543210"}'

# Admin: list all bookings
curl -s http://localhost:4000/api/v1/admin/bookings -b admin-cookies.txt
# → all bookings with user info

# Admin: update booking status
curl -s -X PATCH http://localhost:4000/api/v1/admin/bookings/2/status \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{"status":"confirmed"}'
# → { message: "Booking status updated", id: 2, status: "confirmed" }

# === AUTH CHECKS ===

# Unauthenticated → 401
curl -s http://localhost:4000/api/v1/favorites
# → 401

# Non-admin → 403 on admin route
curl -s http://localhost:4000/api/v1/admin/bookings -b user-cookies.txt
# → 403

# Full build
cd ../..
pnpm build
```

---

## What NOT to do

- Do NOT modify `/searchanycars.com/`
- Do NOT modify any routes from steps 03-04
- Do NOT modify `apps/web/` (frontend starts in step 06)
- Do NOT add WebSocket/SSE for real-time updates — keep it simple with REST
- Do NOT over-engineer the booking system — no calendar integration, no payment, just the CRUD

---

## API completion summary

After this step, the complete API has these endpoint groups:

| Prefix | Endpoints | Auth |
|--------|-----------|------|
| `/api/health` | 1 | Public |
| `/api/v1/auth/*` | 12 | Mixed |
| `/api/v1/listings/*` | 5 | Public read, Admin write |
| `/api/v1/categories/*` | 4 + 2 filter mapping | Public read, Admin write |
| `/api/v1/filters/*` | 1 | Public |
| `/api/v1/uploads/*` | 1 | Admin |
| `/api/v1/site-config/*` | 3 | Public read, Admin write |
| `/api/v1/favorites/*` | 4 | Auth required |
| `/api/v1/bookings/*` | 3 | Auth required |
| `/api/v1/admin/bookings/*` | 2 | Admin required |
| **Total** | **~37 endpoints** | |

This is the complete backend. Steps 06-10 are all frontend + deployment.

---

## Notes for next step

Step 06 (`06-nextjs-layout-homepage.md`) will:
- Build the Next.js layout (header, footer, navigation) matching the v1 design
- Build the SSR homepage (hero, search widget, budget brackets, brands, featured cars, trust bar)
- Connect to the API using server components + TanStack Query
- All styled with Tailwind matching the Navy + Coral design system