# SearchAnyCars.com - Production-Grade Implementation Plan

## Current State Assessment

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 19 + TypeScript + Vite 8 + React Router 7 | SPA with basic pages |
| Backend | Express 5 (Node.js) | REST API, no auth, no middleware |
| Database | SQLite (better-sqlite3, WAL mode) | Single file, no migrations |
| Storage | Local filesystem (`uploads/`) | No CDN, no cloud storage |
| Auth | **None** | Admin page is completely unprotected |
| Payments | **None** | Reserve/test-drive modals are UI stubs |
| Real-time | **None** | No WebSocket, no SSE |
| Notifications | **None** | No email, SMS, or push |
| Search | SQL LIKE queries | No full-text search, no relevance ranking |

### Existing Routes (Frontend)
- `/` - Homepage with featured listings
- `/search` - Search page with filters (brand, fuel, transmission, ownership, seller, city, year range, price range, km driven)
- `/car/:id` - Car detail page with image gallery, specs, EMI calculator, test drive/reserve modals (UI only)
- `/wishlist` - Wishlist page (localStorage-backed)
- `/about`, `/how-it-works`, `/faq`, `/contact` - Static info pages
- `/admin` - Unprotected admin CRUD for listings and categories
- `/admin/car/new`, `/admin/car/:id/edit` - Listing create/edit forms

### Existing API Endpoints
- `GET /api/health`
- `POST /api/uploads/image` (multer, memory storage, local filesystem)
- CRUD: `/api/categories`
- CRUD: `/api/listings`
- `/api/filter-definitions`, `/api/category-filters/:categoryId`

### Key Technical Debt
1. No authentication or authorization on any endpoint
2. Admin API is publicly accessible
3. Wishlist stored in localStorage only - no sync, no cross-device
4. Test drive and reserve modals submit to nowhere (just `setSubmitted(true)`)
5. No input sanitization beyond basic `stripHtml` on 5 fields
6. No rate limiting, no CSRF protection
7. No pagination on listings API (returns all rows)
8. SQLite cannot handle concurrent writes at scale
9. No structured logging, no error tracking
10. Images stored locally with no backup or CDN

---

## PART 1: Feature Gap Analysis

### A. User Authentication & Accounts

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| A1 | Phone OTP login (primary - India market) | P0 | Medium |
| A2 | Email/password login with bcrypt | P0 | Medium |
| A3 | Google OAuth 2.0 social login | P1 | Medium |
| A4 | JWT access tokens + HTTP-only refresh tokens | P0 | Medium |
| A5 | User profile (name, phone, email, city, avatar) | P0 | Low |
| A6 | Address book for delivery/test-drive locations | P1 | Low |
| A7 | Session management (view/revoke active sessions) | P2 | Medium |
| A8 | Role-based access control (buyer, dealer, admin, super-admin) | P0 | Medium |
| A9 | Account deletion (GDPR/India DPDP Act compliance) | P1 | Medium |
| A10 | Email verification flow | P0 | Low |
| A11 | Password reset via email link | P0 | Low |
| A12 | Phone number change with re-verification | P1 | Low |
| A13 | Login activity audit log | P2 | Low |

### B. Booking System

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| B1 | Test drive booking with backend persistence | P0 | Medium |
| B2 | Time slot availability engine (per car, per city hub) | P0 | High |
| B3 | Home test drive scheduling with address capture | P1 | Medium |
| B4 | Hub-based test drive with hub selection | P1 | Medium |
| B5 | Booking confirmation + unique booking reference | P0 | Low |
| B6 | Booking status lifecycle (Pending > Confirmed > Completed/Cancelled/No-show) | P0 | Medium |
| B7 | Reschedule test drive | P1 | Medium |
| B8 | Cancel test drive with reason | P0 | Low |
| B9 | Car reservation with deposit payment | P0 | High |
| B10 | 48-hour reservation hold with auto-expiry | P0 | High |
| B11 | Reservation extension request | P2 | Medium |
| B12 | Purchase completion flow after reservation | P1 | High |
| B13 | Booking history page for users | P0 | Low |
| B14 | Admin booking management dashboard | P0 | Medium |
| B15 | Automated booking reminders (24h before, 1h before) | P1 | Medium |
| B16 | Post-test-drive feedback collection | P2 | Low |

### C. Messaging / Communication

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| C1 | In-app buyer-seller chat (text messages) | P1 | High |
| C2 | Chat with image/document sharing | P2 | Medium |
| C3 | Chat notification badges (unread count) | P1 | Medium |
| C4 | WhatsApp Business API integration (click-to-chat) | P0 | Medium |
| C5 | WhatsApp notification templates (booking confirmation, price drop) | P1 | High |
| C6 | Call-back request system | P1 | Low |
| C7 | Inquiry form on listing (lead capture) | P0 | Low |
| C8 | Chat moderation / spam filtering | P2 | Medium |
| C9 | Canned responses for dealers | P2 | Low |
| C10 | Chat history export | P3 | Low |

### D. Notification System

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| D1 | Notification preferences (per channel, per event type) | P0 | Medium |
| D2 | Email notifications via transactional email service (Postmark/SES) | P0 | Medium |
| D3 | SMS notifications via MSG91/Twilio (OTP, booking, payment) | P0 | Medium |
| D4 | Push notifications (Firebase Cloud Messaging for web) | P1 | High |
| D5 | In-app notification center (bell icon with dropdown) | P0 | Medium |
| D6 | Price drop alerts for wishlisted cars | P1 | Medium |
| D7 | New listing alerts (matching saved searches) | P2 | Medium |
| D8 | Booking status change notifications | P0 | Low |
| D9 | Payment receipt notifications | P0 | Low |
| D10 | Reservation expiry warning (6h, 1h before) | P0 | Medium |
| D11 | Notification template management (admin) | P2 | Medium |
| D12 | Delivery/read receipts for critical notifications | P3 | High |

### E. Payment Integration

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| E1 | Razorpay standard checkout integration | P0 | High |
| E2 | Razorpay webhook handler (payment.captured, refund.processed, etc.) | P0 | High |
| E3 | Reservation deposit payment flow | P0 | High |
| E4 | Refund processing (full refund on cancellation within hold period) | P0 | High |
| E5 | Partial refund handling | P1 | Medium |
| E6 | Payment receipt generation (PDF) | P1 | Medium |
| E7 | UPI deep-link payment (India-specific) | P1 | Medium |
| E8 | Payment retry for failed transactions | P1 | Medium |
| E9 | Payment ledger / transaction history (user-facing) | P0 | Medium |
| E10 | Admin payment dashboard with reconciliation | P1 | High |
| E11 | Escrow-style hold (deposit held, not settled until confirmation) | P2 | High |
| E12 | GST invoice generation | P1 | Medium |
| E13 | Idempotency key system for all payment operations | P0 | Medium |

### F. Review / Rating System

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| F1 | Post-purchase car review (star rating + text) | P1 | Medium |
| F2 | Dealer rating and review | P1 | Medium |
| F3 | Platform/service review | P2 | Low |
| F4 | Photo upload with reviews | P2 | Low |
| F5 | Review moderation queue (admin) | P1 | Medium |
| F6 | Verified purchase badge on reviews | P1 | Low |
| F7 | Review helpfulness voting (upvote/downvote) | P2 | Low |
| F8 | Review response by dealer | P2 | Low |
| F9 | Aggregate rating calculation and display | P1 | Low |
| F10 | Report abusive review | P2 | Low |

### G. Dealer Portal

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| G1 | Dealer registration with business verification | P0 | High |
| G2 | Dealer dashboard (listings, bookings, inquiries, analytics) | P0 | High |
| G3 | Bulk listing upload (CSV/Excel) | P1 | Medium |
| G4 | Dealer inventory management (add, edit, mark sold, remove) | P0 | Medium |
| G5 | Lead management (view, assign, follow-up tracking) | P1 | Medium |
| G6 | Dealer subscription plans (free tier, premium, enterprise) | P2 | High |
| G7 | Dealer verification badge system | P1 | Medium |
| G8 | Dealer performance analytics (views, leads, conversion) | P1 | Medium |
| G9 | Multi-location support for dealer chains | P2 | Medium |
| G10 | Dealer staff sub-accounts with permissions | P2 | High |
| G11 | Dealer payout/settlement reports | P2 | Medium |
| G12 | Dealer-specific URL / microsite | P3 | High |

### H. Analytics & Tracking

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| H1 | Server-side view tracking (deduplicated per user per listing per session) | P0 | Medium |
| H2 | Conversion funnel tracking (view > inquiry > test-drive > reserve > purchase) | P1 | High |
| H3 | Search analytics (popular searches, zero-result queries) | P1 | Medium |
| H4 | User behavior tracking (click heatmap, scroll depth) | P2 | Medium |
| H5 | GA4 integration (page views, events) | P0 | Low |
| H6 | Facebook Pixel / Meta Conversions API | P1 | Low |
| H7 | Admin analytics dashboard (KPIs, charts) | P1 | High |
| H8 | Listing performance reports (for dealers) | P1 | Medium |
| H9 | A/B testing framework | P3 | High |
| H10 | Automated daily/weekly email reports for admin | P2 | Medium |

### I. Content Management

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| I1 | Blog/article system with rich text editor | P2 | High |
| I2 | Banner/hero management (homepage, search page) | P1 | Medium |
| I3 | SEO meta tags per page (title, description, OG tags) | P0 | Medium |
| I4 | Dynamic sitemap.xml generation | P0 | Medium |
| I5 | robots.txt configuration | P0 | Low |
| I6 | Structured data / JSON-LD for car listings (Schema.org Vehicle) | P0 | Medium |
| I7 | Canonical URLs and pagination meta | P1 | Low |
| I8 | City-specific landing pages (used cars in Delhi, Mumbai, etc.) | P1 | Medium |
| I9 | Brand landing pages (used Honda cars, used Hyundai cars, etc.) | P1 | Medium |
| I10 | FAQ management (admin-editable) | P2 | Low |
| I11 | Testimonials management | P2 | Low |

### J. Comparison Tool

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| J1 | Add-to-compare button on car cards (max 3-4) | P1 | Low |
| J2 | Side-by-side comparison page (all specs) | P1 | Medium |
| J3 | Comparison highlight (green/red for better/worse) | P2 | Medium |
| J4 | Share comparison via URL | P2 | Low |
| J5 | Popular comparisons section | P3 | Medium |
| J6 | Comparison history (for logged-in users) | P3 | Low |

### K. Valuation Tool

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| K1 | Multi-step car valuation form (brand > model > variant > year > km > condition) | P1 | Medium |
| K2 | Valuation algorithm (based on listing data, depreciation curves) | P1 | High |
| K3 | Valuation report page with range (low - fair - high) | P1 | Medium |
| K4 | Lead capture on valuation (sell your car CTA) | P1 | Low |
| K5 | Valuation history for users | P2 | Low |
| K6 | Admin-adjustable valuation parameters | P2 | Medium |

### L. Financing Integration

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| L1 | Pre-approved loan check (soft inquiry with partner banks) | P2 | High |
| L2 | Loan application form | P2 | Medium |
| L3 | Partner bank API integration (HDFC, ICICI, etc.) | P2 | Very High |
| L4 | Loan eligibility calculator (income-based) | P1 | Medium |
| L5 | EMI comparison across banks | P2 | Medium |
| L6 | Loan status tracking | P3 | Medium |
| L7 | Insurance quote integration | P3 | High |

### M. Document Management

| # | Feature | Priority | Complexity |
|---|---------|----------|------------|
| M1 | KYC document upload (Aadhaar, PAN, driving license) | P1 | Medium |
| M2 | Document verification workflow (pending > verified > rejected) | P1 | High |
| M3 | RC transfer document generation | P2 | Medium |
| M4 | Sale agreement template generation | P2 | Medium |
| M5 | Document storage with encryption at rest | P0 | Medium |
| M6 | Document expiry alerts (insurance, PUC) | P3 | Low |
| M7 | Digital signature integration (Aadhaar e-sign) | P3 | Very High |

---

## PART 2: Conflict & Edge Case Analysis

### 1. Booking Conflicts

#### 1.1 Two users try to reserve the same car simultaneously
- **Scenario**: User A and User B both click "Reserve" on the same car within seconds. Both see it as available. Both initiate payment.
- **Impact**: Double reservation, one user's deposit taken for a car already reserved.
- **Frequency**: Medium-high for popular/underpriced listings.

#### 1.2 Payment gateway timeout during reservation deposit
- **Scenario**: User clicks "Pay 10,000 & Reserve", Razorpay processes the debit, but the callback/redirect times out. User sees an error, money is debited.
- **Impact**: User charged but reservation not recorded. Manual intervention required.
- **Frequency**: Common in India (3-5% of UPI transactions timeout).

#### 1.3 Reservation expires while user is completing payment
- **Scenario**: A 10-minute payment window is given. User takes 12 minutes (switching banks, OTP delays). Reservation lock expires. Another user reserves the car. First user's payment then succeeds.
- **Impact**: Orphaned payment for an already-reserved car.
- **Frequency**: Medium.

#### 1.4 Refund fails after cancellation
- **Scenario**: User cancels reservation within 48h (eligible for full refund). Refund API call to Razorpay fails (network error, insufficient balance in merchant account, Razorpay downtime).
- **Impact**: User's money stuck. Car re-listed but user not refunded.
- **Frequency**: Low but high severity.

#### 1.5 Test drive booked for a car that gets sold before the date
- **Scenario**: User books test drive for Saturday. Car is sold on Wednesday. User shows up at hub on Saturday.
- **Impact**: Bad user experience, wasted trip, trust damage.
- **Frequency**: Medium for high-demand cars.

#### 1.6 Double booking of test drive time slots
- **Scenario**: Two users book the same car at the same time slot at the same hub. Only one car exists.
- **Impact**: One user turned away, operational confusion.
- **Frequency**: Medium.

### 2. Inventory Conflicts

#### 2.1 Admin updates price while user is on checkout page
- **Scenario**: User loads car detail page showing 14.5L. Admin changes price to 15.0L. User clicks "Reserve" and sees 14.5L in modal. Payment is for 14.5L deposit.
- **Impact**: Stale price shown to user. Deposit amount may be based on old price tier.
- **Frequency**: Low-medium.

#### 2.2 Car marked as sold but deposit refund hasn't completed
- **Scenario**: Reservation cancelled, car status changed back to "Active". But refund to original reserver hasn't processed. If a new user reserves, and the refund then fails, both users have claims.
- **Impact**: Financial dispute, potential double-claim.
- **Frequency**: Low but high impact.

#### 2.3 Dealer submits car that's already listed by another dealer
- **Scenario**: Same physical car (same VIN/registration number) listed by two dealers. Both claim ownership.
- **Impact**: Trust issue. Buyer confusion. Potential fraud vector.
- **Frequency**: Low (but a known problem in Indian used car market).

#### 2.4 Image upload fails midway through multi-image upload
- **Scenario**: Dealer uploading 15 images. Upload #8 fails. 7 images saved, 8 not. Dealer doesn't notice and publishes listing with incomplete images.
- **Impact**: Poor listing quality, missing damage/interior photos.
- **Frequency**: Medium (poor connectivity in many Indian cities).

#### 2.5 Admin deletes a car that has active bookings
- **Scenario**: Admin removes a listing (data cleanup, fraud detection). But 3 test drives are scheduled and 1 reservation is active with deposit paid.
- **Impact**: Orphaned bookings, unprompted refund needed, user confusion.
- **Frequency**: Low.

### 3. Real-Time Conflicts

#### 3.1 WebSocket connection drops
- **Scenario**: User's phone switches from WiFi to cellular. Socket disconnects. During the gap, a price drop notification or "car sold" event fires.
- **Impact**: User misses critical state change. May try to book a sold car.
- **Frequency**: High (mobile users in India frequently have connectivity issues).

#### 3.2 Server restarts during active WebSocket sessions
- **Scenario**: Deployment or crash causes server restart. All socket connections drop. Connected users lose real-time updates.
- **Impact**: Missed notifications, stale UI state until next API call.
- **Frequency**: Medium (every deployment).

#### 3.3 Multiple browser tabs open duplicate socket connections
- **Scenario**: User opens 5 car detail pages in tabs. Each tab opens a WebSocket. 5x resource usage. Duplicate notifications.
- **Impact**: Server resource waste. User sees 5 duplicate toast notifications.
- **Frequency**: High.

#### 3.4 View count inflation from bots/refreshes
- **Scenario**: Bot scrapes all listings, incrementing view counts. Or user refreshes page 50 times, inflating "342 people viewed this car" to 392.
- **Impact**: Misleading social proof. Distorted analytics.
- **Frequency**: High.

#### 3.5 Race condition: notification sent for price drop that gets reverted
- **Scenario**: Admin accidentally changes price from 14.5L to 4.5L (typo). System fires "Price Drop Alert!" to 67 wishlisted users. Admin corrects to 14.5L within 30 seconds.
- **Impact**: 67 users see a false price drop. Trust damage. Potential demand for honoring the wrong price.
- **Frequency**: Low but catastrophic.

### 4. Data Consistency Conflicts

#### 4.1 Wishlist migration from localStorage to database
- **Scenario**: Existing users have wishlists in localStorage. After auth is added, wishlist moves to DB. User logs in on a new device - localStorage wishlist is empty. User on old device still has localStorage wishlist but it's not synced.
- **Impact**: User "loses" their wishlist on new devices. Duplicate/stale data on old devices.
- **Frequency**: Affects every existing user on upgrade.

#### 4.2 User changes phone number - OTP re-verification
- **Scenario**: User changes phone from +91-98765 to +91-12345. OTP sent to new number. But booking confirmations are still being sent to old number until update completes.
- **Impact**: Missed communications during transition.
- **Frequency**: Low.

#### 4.3 Dealer account suspended
- **Scenario**: Dealer flagged for fraud. Account suspended. But they have 50 active listings, 12 scheduled test drives, and 2 active reservations with deposits.
- **Impact**: Need to handle cascade: hide listings, notify booked users, process refunds, prevent new interactions.
- **Frequency**: Rare but very complex.

#### 4.4 Price change while EMI calculation is in progress
- **Scenario**: User adjusts EMI sliders on car detail page. Meanwhile admin changes price. EMI calculation uses client-cached price.
- **Impact**: Misleading EMI figures. Not a financial risk (EMI calc is advisory) but erodes trust.
- **Frequency**: Low.

#### 4.5 Search results stale after cache invalidation lag
- **Scenario**: Car sold and status changed to "Sold". Search page cache (if Redis/CDN is added) still shows it as "Active" for 30 seconds. User clicks through and sees "Sold" on detail page.
- **Impact**: Frustrating UX. Wasted click.
- **Frequency**: Medium (depends on cache TTL).

### 5. Payment Conflicts

#### 5.1 Partial payment received
- **Scenario**: Deposit is 10,000. Razorpay reports 9,800 received (rare but possible with currency rounding or bank deduction).
- **Impact**: System expects exact amount. Reservation not confirmed. User thinks they paid.
- **Frequency**: Very rare.

#### 5.2 UPI timeout (India-specific, 5-minute window)
- **Scenario**: User selects UPI, opens payment app, but doesn't approve within 5 minutes. Payment expires on Razorpay side. User approves at minute 6. Bank may still debit.
- **Impact**: Money debited but Razorpay reports failure. Requires manual reconciliation.
- **Frequency**: Common (5-8% of UPI payments).

#### 5.3 Webhook arrives before redirect callback
- **Scenario**: Razorpay sends `payment.captured` webhook to server. Server marks reservation as confirmed. User's browser redirect hasn't completed yet. User sees "pending" on their screen while backend already says "confirmed".
- **Impact**: Confusing UX (temporary). Not a financial risk.
- **Frequency**: Very common (webhooks are faster than redirects).

#### 5.4 Duplicate webhook delivery from Razorpay
- **Scenario**: Razorpay retries webhook 3 times (network hiccup on first attempt). Server processes the same `payment.captured` event 3 times.
- **Impact**: Could create duplicate records, send duplicate confirmation emails/SMS.
- **Frequency**: Medium (Razorpay retries up to 24 hours).

#### 5.5 Refund initiated but Razorpay returns error, then processes it async
- **Scenario**: Refund API call returns 500. System marks refund as failed. But Razorpay actually processed it (response lost in transit). Refund webhook arrives later confirming the refund.
- **Impact**: System shows "refund failed" but money was returned. Admin may attempt another refund (double refund).
- **Frequency**: Low but dangerous.

---

## PART 3: Resolution Strategies

### 1. Booking Conflict Resolutions

#### 1.1 Simultaneous reservation (Pessimistic Locking + Status Machine)

```
Resolution: Pessimistic locking with SELECT ... FOR UPDATE
```

- When user clicks "Reserve", the server executes within a transaction:
  1. `SELECT * FROM listings WHERE id = ? AND listing_status = 'Active' FOR UPDATE` (PostgreSQL row lock)
  2. If status is Active, set `listing_status = 'Reserved'` and `reserved_by = userId` and `reserved_until = NOW() + 10min`
  3. Return `reservation_token` (UUID) to client
  4. Client has 10 minutes to complete payment using this token
- If another user tries at the same time, they block on `FOR UPDATE` until the first transaction commits, then see `listing_status = 'Reserved'` and get a 409 Conflict response
- If the first user's payment window expires (10 min), a cron job runs every minute to expire stale pre-reservations: `UPDATE listings SET listing_status = 'Active', reserved_by = NULL WHERE listing_status = 'Reserved' AND reserved_until < NOW()`

#### 1.2 Payment gateway timeout (Idempotency + Async Reconciliation)

```
Resolution: Idempotency keys + webhook-driven state machine
```

- Before creating Razorpay order, generate an idempotency key: `reserve:{listingId}:{userId}:{timestamp}`
- Store in `payments` table: `{ idempotency_key, razorpay_order_id, status: 'created', amount, listing_id, user_id }`
- Payment state machine: `created > attempted > captured > confirmed` OR `created > attempted > failed > refunded`
- **Never rely on redirect callback alone**. The webhook `payment.captured` is the source of truth.
- If redirect succeeds but webhook hasn't arrived: show "Payment received, confirming..." and poll `/api/reservations/:id/status` every 3 seconds for 30 seconds
- If redirect fails but webhook arrives: webhook handler confirms reservation. User sees confirmation on next page load or via push notification

#### 1.3 Reservation expires during payment (Saga with Compensation)

```
Resolution: Saga pattern with compensation transaction
```

- **Step 1**: Lock listing (10-min soft lock)
- **Step 2**: Create Razorpay order
- **Step 3**: User completes payment (may exceed 10-min window)
- **Compensation**: If payment succeeds AFTER lock expired AND another user has reserved:
  1. Auto-refund the late payment immediately
  2. Notify user: "Sorry, this car was reserved by another buyer. Full refund initiated."
  3. Log incident for audit
- **Prevention**: Extend lock by 2 minutes on each payment attempt detected (Razorpay sends `payment.authorized` before `payment.captured`). Maximum extension: 20 minutes total.

#### 1.4 Refund failure (Retry Queue + Manual Escalation)

```
Resolution: Exponential backoff retry + dead letter queue
```

- Refund attempts stored in `refund_requests` table with status: `pending > processing > completed > failed`
- On failure: retry with exponential backoff (1min, 5min, 30min, 2h, 24h) - max 5 attempts
- If all retries fail: move to `dead_letter_refunds` table, send alert to admin, mark as "Manual Review Required"
- Admin dashboard shows pending manual refunds with one-click retry
- User sees: "Refund is being processed. If not received within 5-7 business days, contact support."
- Weekly reconciliation job compares `refund_requests` with Razorpay refund webhooks to catch discrepancies

#### 1.5 Test drive for sold car (Event-Driven Cancellation)

```
Resolution: Event sourcing + proactive notification
```

- When listing status changes to "Sold" or "Reserved", fire event `listing.status_changed`
- Event handler queries all future test drive bookings for this listing
- For each booking: update status to "Cancelled - Car Sold", send SMS + push notification + email
- Notification includes: link to similar cars, apology, and option to book test drive for alternative car
- This runs synchronously within the sale transaction to prevent race conditions

#### 1.6 Double-booked test drive time slots (Optimistic Locking with Version)

```
Resolution: Unique constraint + optimistic concurrency
```

- `test_drive_slots` table with: `UNIQUE(listing_id, slot_date, slot_time)`
- On booking attempt: INSERT with the unique constraint. If constraint violation (duplicate), return 409.
- For car-level (not hub-level) test drives: max 1 booking per car per 2-hour slot
- For hub-level test drives: capacity per hub per slot (e.g., 5 simultaneous test drives), use `SELECT COUNT(*) WHERE hub_id = ? AND slot_date = ? AND slot_time = ? FOR UPDATE` and check against capacity

### 2. Inventory Conflict Resolutions

#### 2.1 Stale price on checkout (Optimistic Locking with Version Column)

```
Resolution: version column + price validation at payment time
```

- Add `version INTEGER DEFAULT 1` and `price_updated_at TIMESTAMP` columns to listings
- When user loads car detail page, include `version` in response
- When initiating reservation, client sends `{ listingId, expectedVersion, expectedPrice }`
- Server validates: if `current_version != expectedVersion` OR `current_price != expectedPrice`, return 409 with new price
- Frontend shows: "The price has been updated to X. Would you like to continue?"

#### 2.2 Car sold but refund pending (State Machine with Guard)

```
Resolution: Separate listing_status from financial_status
```

- Listing has `listing_status`: Active, Reserved, Sold, Delisted
- Reservation has `financial_status`: deposit_paid, refund_pending, refund_completed, refund_failed
- **Guard rule**: Listing can only go from "Reserved" back to "Active" when `financial_status = 'refund_completed'` OR admin explicitly overrides
- Until refund completes: listing shows as "Available Soon" (not bookable, but visible)

#### 2.3 Duplicate car listing detection

```
Resolution: VIN/Registration number deduplication + fuzzy matching
```

- `UNIQUE` constraint on `registration_number` (when provided)
- On listing creation: fuzzy match against `brand + model + year + city + km_driven` (within 5% km range)
- If potential duplicate found: flag for admin review before publishing
- Admin can merge, reject, or approve as separate listing

#### 2.4 Partial image upload failure (Resumable Upload + Draft State)

```
Resolution: Draft listings + individual image status tracking
```

- Listing has `publish_status`: draft, pending_review, published
- Each image upload tracked individually: `{ listing_id, image_url, upload_status: 'success'|'failed', position }`
- Failed uploads shown with retry button in the dealer's edit interface
- Listing cannot move from "draft" to "published" unless minimum image count (3) met
- Consider chunked/resumable upload protocol (tus.io) for large image sets

#### 2.5 Deleting car with active bookings (Soft Delete + Cascade Notification)

```
Resolution: Soft delete + booking cascade
```

- `DELETE` becomes `UPDATE listings SET listing_status = 'Delisted', delisted_at = NOW(), delist_reason = ?`
- Before delisting: server checks for active bookings/reservations
- If active reservation with deposit: block deletion, show admin "Cannot delete: active reservation by User X. Process refund first."
- If only test drive bookings: auto-cancel all, send notifications, then soft-delete
- Admin can force-delete only after all financial obligations cleared

### 3. Real-Time Conflict Resolutions

#### 3.1 WebSocket reconnection with event replay

```
Resolution: Last-event-ID pattern + server-side event buffer
```

- Each event has a monotonically increasing `event_id` (or timestamp)
- Client tracks last received `event_id`
- On reconnect: client sends `last_event_id` in handshake
- Server replays all events since that ID from a Redis-backed event buffer (retain last 1 hour)
- If gap too large (client offline > 1 hour): full state refresh via REST API instead

#### 3.2 Server restart recovery

```
Resolution: Redis-backed pub/sub + sticky sessions (optional)
```

- WebSocket state is ephemeral; all important state lives in PostgreSQL
- Use Redis pub/sub for broadcasting events between multiple server instances
- On server restart: clients auto-reconnect (socket.io handles this), replay missed events via 3.1 mechanism
- Critical state changes (car sold, reservation confirmed) are idempotent operations, so replaying is safe

#### 3.3 Multiple tabs / duplicate connections

```
Resolution: BroadcastChannel API + SharedWorker (or leader election)
```

- Use `BroadcastChannel` API: only one tab maintains the WebSocket connection (elected "leader")
- Leader tab broadcasts received events to all other tabs via BroadcastChannel
- If leader tab closes: another tab detects (via heartbeat) and takes over as leader
- Fallback for unsupported browsers: accept duplicate connections but deduplicate notifications client-side using event_id

#### 3.4 View count inflation

```
Resolution: Server-side deduplication with rate limiting
```

- `POST /api/listings/:id/view` instead of auto-increment
- Deduplicate by: `(user_id OR fingerprint, listing_id, 1-hour window)`
- Fingerprint for anonymous users: hash of (IP + User-Agent + Accept-Language)
- Bot detection: rate limit to max 60 view events per minute per IP; check User-Agent against known bot list
- Batch write view counts: accumulate in Redis, flush to PostgreSQL every 60 seconds

#### 3.5 Accidental price change notification

```
Resolution: Debounced price-change event + confirmation window
```

- Price changes do NOT immediately trigger notifications
- After admin saves price: start a 5-minute "cooling period"
- If price changes again within 5 minutes: reset the timer (debounce)
- After 5 minutes with no further changes: fire `listing.price_changed` event
- Admin UI shows: "Price drop notifications will be sent in 5 minutes. Click to cancel."
- Also: require admin confirmation for price changes > 20% ("Are you sure? This will notify 67 users.")

### 4. Data Consistency Conflict Resolutions

#### 4.1 Wishlist migration (Merge Strategy)

```
Resolution: Client-side merge on first login + one-time migration
```

- After user logs in for the first time:
  1. Read localStorage wishlist IDs
  2. Fetch server-side wishlist (initially empty)
  3. Union merge: `serverWishlist = union(localStorageIds, serverIds)`
  4. POST merged wishlist to server
  5. Clear localStorage wishlist
  6. From now on: all wishlist operations go through API
- For anonymous users: continue using localStorage (backwards compatible)
- Migration is idempotent: if run twice, union merge produces same result

#### 4.2 Phone number change

```
Resolution: Pending verification pattern
```

- Phone change request stores new number in `pending_phone` column
- OTP sent to new number
- Until verified: all communications go to OLD number
- On OTP verification: atomically swap `phone = pending_phone, pending_phone = NULL`
- Rate limit: max 3 phone changes per 24 hours

#### 4.3 Dealer suspension cascade

```
Resolution: Choreography-based saga with defined order
```

1. Set `dealer.status = 'suspended'`
2. Set all dealer's Active listings to `listing_status = 'Suspended'` (not visible in search but data preserved)
3. Query all active reservations for dealer's listings
4. For each reservation with deposit: initiate refund, notify user
5. Query all scheduled test drives: cancel and notify users
6. Disable dealer's login (JWT blacklist / flag check on each request)
7. Send dealer suspension email with reason and appeal process
8. All steps logged in `audit_log` table for compliance
- If dealer reinstated: reverse steps 2 and 6; steps 3-5 are irreversible (users must rebook)

#### 4.4 Price change during EMI calculation

```
Resolution: Client-side version check + non-blocking refresh
```

- EMI calculator uses the price from the initial page load (acceptable: it's advisory)
- Add a lightweight polling endpoint: `GET /api/listings/:id/price-check?v=3` (returns only `{ price, version }`)
- Poll every 60 seconds while user is on the page
- If price changed: show a non-intrusive banner "Price has been updated" with refresh button
- EMI calculator auto-recalculates if price field changes

#### 4.5 Stale search results

```
Resolution: Short cache TTL + cache-aside pattern + stale-while-revalidate
```

- Cache listing search results in Redis with 30-second TTL
- On listing status change: invalidate relevant cache keys (by brand, city, price range)
- Use `stale-while-revalidate` pattern: serve cached results immediately, trigger async refresh
- On car detail page: always fetch fresh (no cache or 5-second cache)
- Search result cards show a subtle "Just sold" badge if status changed since cache was built (compare `updated_at`)

### 5. Payment Conflict Resolutions

#### 5.1 Partial payment

```
Resolution: Tolerance threshold + manual review
```

- Accept payment if within 2% of expected amount (covers rounding/bank fees)
- If below 2% threshold: mark as "Partial Payment - Under Review"
- Admin reviews and either: accepts (rare edge case), or initiates full refund and asks user to retry

#### 5.2 UPI timeout

```
Resolution: Webhook-driven reconciliation + pending state
```

- After UPI payment initiated: show "Waiting for payment confirmation..." with 8-minute timeout on client
- If client timeout: show "Payment status unclear. We'll notify you within 15 minutes."
- Server-side: Razorpay webhook `payment.captured` may arrive up to 30 minutes late for UPI
- Reconciliation cron (every 5 minutes): for all `status = 'attempted'` payments older than 10 minutes, call `GET /v1/orders/{order_id}` Razorpay API to check actual status
- If paid: confirm reservation, notify user
- If not paid after 30 minutes: expire, release lock

#### 5.3 Webhook before redirect

```
Resolution: Dual confirmation path
```

- Webhook handler: updates `payments` table status. Sends confirmation notification.
- Redirect handler: checks `payments` table. If already confirmed by webhook, show success page immediately.
- If redirect happens first: show "Verifying payment..." screen. Poll `/api/payments/:id/status` every 2 seconds (max 30 seconds). Webhook will update status, next poll will catch it.
- Net effect: user always sees confirmation within seconds, regardless of order.

#### 5.4 Duplicate webhook delivery

```
Resolution: Idempotency via unique event ID
```

- Every Razorpay webhook has a unique `event_id` in the payload
- `webhook_events` table: `UNIQUE(event_id)`
- On webhook receipt:
  1. Verify signature (HMAC-SHA256)
  2. `INSERT INTO webhook_events (event_id, event_type, payload, received_at) ON CONFLICT (event_id) DO NOTHING`
  3. If insert succeeded (new event): process it
  4. If insert failed (duplicate): return 200 OK (acknowledge) but skip processing
- This makes webhook handling fully idempotent

#### 5.5 Refund API error but async processing

```
Resolution: Refund status reconciliation
```

- On refund API failure: mark as `refund_status = 'uncertain'` (not 'failed')
- Schedule reconciliation check in 10 minutes
- Reconciliation: call `GET /v1/payments/{payment_id}/refunds` Razorpay API
- If refund exists on Razorpay: update local status to match
- If no refund on Razorpay: retry the refund
- **Critical rule**: never auto-retry a refund that's in 'uncertain' state without first checking Razorpay (prevents double refund)

---

## PART 4: Implementation Phases

### Phase 1: Foundation - Auth + Database Migration (Weeks 1-3)

**Goal**: Establish authentication, migrate to PostgreSQL, set up proper infrastructure.

**Team**: 2 backend engineers, 1 frontend engineer, 1 DevOps (part-time)

#### Week 1: PostgreSQL Migration + Project Structure

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Set up PostgreSQL (local Docker + cloud instance) | DevOps | - | 1 |
| Write migration scripts (SQLite schema to PostgreSQL) | BE-1 | PG setup | 2 |
| Migrate seed data + write migration runner (node-pg-migrate) | BE-1 | Migrations | 1 |
| Replace `better-sqlite3` with `pg` / `postgres.js` in server | BE-2 | Migrations | 2 |
| Convert all raw SQL to parameterized queries (already done, verify `FOR UPDATE` support) | BE-2 | pg driver | 1 |
| Add pagination to `/api/listings` (cursor-based or offset) | BE-1 | pg driver | 1 |
| Add structured logging (pino) | BE-2 | - | 0.5 |
| Add request rate limiting (express-rate-limit) | BE-2 | - | 0.5 |
| Set up environment config (dotenv-safe with required vars) | BE-1 | - | 0.5 |
| Frontend: pagination component for search results | FE-1 | API pagination | 1 |

**Risks**:
- SQLite to PostgreSQL type differences (INTEGER vs BIGINT, TEXT vs VARCHAR, BOOLEAN)
- JSON column handling changes (`json_extract` vs `jsonb` operators)
- Existing clients break if API contract changes (add API versioning: `/api/v1/`)

#### Week 2: Authentication System

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Design `users` table schema (id, phone, email, password_hash, role, verified, etc.) | BE-1 | PG | 0.5 |
| Implement phone OTP login (MSG91 or similar) | BE-1 | users table | 2 |
| Implement email/password registration + login (bcrypt) | BE-2 | users table | 1.5 |
| JWT access token (15min) + refresh token (7d, HTTP-only cookie) | BE-1 | - | 1.5 |
| Auth middleware: `requireAuth`, `requireRole('admin')`, `optionalAuth` | BE-2 | JWT | 1 |
| Protect admin routes with `requireRole('admin')` | BE-2 | middleware | 0.5 |
| Google OAuth 2.0 integration | BE-1 | users table | 1 |
| Frontend: Login/Register modal/page | FE-1 | - | 2 |
| Frontend: Auth context provider (store user, token, refresh logic) | FE-1 | API | 1 |
| Frontend: Protected route wrapper | FE-1 | AuthContext | 0.5 |
| Email verification flow (send link, verify endpoint) | BE-2 | Email service | 1 |

**Risks**:
- OTP provider rate limits during testing
- JWT secret rotation strategy not defined
- Session invalidation on password change

#### Week 3: User Profile + Wishlist Migration + Security Hardening

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| User profile API (GET/PUT /api/v1/users/me) | BE-1 | Auth | 1 |
| Wishlist API (GET/POST/DELETE /api/v1/wishlist) | BE-1 | Auth | 1 |
| Frontend: wishlist migration logic (localStorage > server on login) | FE-1 | Wishlist API | 1 |
| Frontend: profile page (name, phone, email, city) | FE-1 | Profile API | 1 |
| CORS tightening (specific origins only) | BE-2 | - | 0.5 |
| Helmet.js security headers | BE-2 | - | 0.5 |
| CSRF token for state-changing requests | BE-2 | - | 1 |
| Input validation library (Zod for request body validation) | BE-1 | - | 1 |
| API error standardization (error codes, consistent format) | BE-2 | - | 1 |
| Integration testing for auth flows | BE-1 | All auth | 1 |
| Frontend: update all API calls to include auth headers | FE-1 | AuthContext | 1 |

**Phase 1 Deliverables**:
- PostgreSQL with proper migrations
- Phone OTP + Email/Password + Google OAuth login
- JWT-based auth with refresh tokens
- Protected admin routes
- Server-side wishlist with localStorage migration
- Paginated search API
- Rate limiting + security headers

---

### Phase 2: Booking System + Payments (Weeks 4-7)

**Goal**: Make test drive bookings and car reservations functional with real payment processing.

**Team**: 2 backend engineers, 1 frontend engineer, 1 QA engineer

#### Week 4: Test Drive Booking Backend

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Design booking schema: `test_drive_bookings`, `booking_slots`, `hubs` tables | BE-1 | Phase 1 | 1 |
| Hub management API (CRUD for test drive locations) | BE-1 | Schema | 1 |
| Time slot availability engine (per car, per hub, per day) | BE-2 | Schema | 2 |
| Test drive booking API (POST /api/v1/bookings/test-drive) | BE-1 | Slots | 1 |
| Booking status lifecycle (Pending > Confirmed > Completed/Cancelled/No-show) | BE-2 | Booking API | 1 |
| Cancel/reschedule test drive API | BE-1 | Lifecycle | 1 |
| Unique constraint on (listing_id, slot_date, slot_time) to prevent double booking | BE-2 | Schema | 0.5 |
| Admin: booking management API (list, filter, update status) | BE-2 | Lifecycle | 1 |

#### Week 5: Test Drive Booking Frontend + Reservation Backend

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Frontend: redesign BookTestDriveModal to fetch real slots from API | FE-1 | Slot API | 2 |
| Frontend: booking confirmation page with reference number | FE-1 | Booking API | 1 |
| Frontend: "My Bookings" page (upcoming, past, cancelled) | FE-1 | Booking API | 1.5 |
| Design reservation schema: `reservations` table with status machine | BE-1 | Phase 1 | 1 |
| Implement reservation lock (pessimistic locking, 10-min window) | BE-1 | Schema | 2 |
| Reservation expiry cron job (release stale locks) | BE-2 | Lock | 1 |
| Reservation cancellation + refund trigger | BE-2 | Lock | 1 |

#### Week 6: Razorpay Integration

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Razorpay account setup (test mode + live mode) | BE-1 | - | 0.5 |
| Create Razorpay order API (POST /api/v1/payments/create-order) | BE-1 | Reservation | 1 |
| Razorpay checkout integration (frontend) | FE-1 | Order API | 1.5 |
| Payment verification endpoint (POST /api/v1/payments/verify) | BE-1 | Checkout | 1 |
| Webhook handler (payment.captured, payment.failed, refund.processed) | BE-2 | - | 2 |
| Idempotency key system for payments | BE-2 | Webhook | 1 |
| Webhook signature verification (HMAC-SHA256) | BE-2 | Webhook | 0.5 |
| `payments` table + `webhook_events` table (deduplication) | BE-1 | Schema | 0.5 |
| Refund API integration (POST /api/v1/payments/:id/refund) | BE-1 | Webhook | 1 |
| Failed refund retry queue (with exponential backoff) | BE-2 | Refund | 1 |

#### Week 7: Payment Polish + Integration Testing

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Frontend: ReserveCarModal rewrite (Razorpay checkout flow) | FE-1 | Payment API | 2 |
| Frontend: payment status page (success/failure/pending) | FE-1 | Verification | 1 |
| Frontend: transaction history page | FE-1 | Payment API | 1 |
| Payment reconciliation cron (check Razorpay for uncertain payments) | BE-1 | Razorpay API | 1 |
| UPI timeout handling (poll Razorpay after 5 min) | BE-2 | Reconciliation | 1 |
| Saga: handle "payment after lock expiry" (auto-refund) | BE-1 | Reservation + Payment | 1 |
| E2E test: full reservation flow (browse > reserve > pay > confirm) | QA | All | 2 |
| E2E test: cancellation + refund flow | QA | All | 1 |
| E2E test: edge cases (timeout, double-click, back button) | QA | All | 1 |
| Load test: concurrent reservation attempts on same car | QA | All | 1 |

**Phase 2 Deliverables**:
- Functional test drive booking with real time slots
- Car reservation with Razorpay deposit payment
- Automatic reservation expiry
- Refund processing with retry mechanism
- Webhook-driven payment confirmation
- Idempotent payment handling
- Admin booking management

**Risks**:
- Razorpay test mode has different behavior than live mode
- UPI timeout handling is hard to test without real banks
- Load testing concurrent reservations requires careful transaction isolation level tuning

---

### Phase 3: Real-Time Features + Notifications (Weeks 8-10)

**Goal**: Add live updates, notification system, and communication foundations.

**Team**: 2 backend engineers, 1 frontend engineer

#### Week 8: WebSocket Infrastructure + View Tracking

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Set up Socket.IO with Redis adapter (for multi-instance) | BE-1 | Phase 2 | 1.5 |
| Client-side socket connection manager (with BroadcastChannel for multi-tab) | FE-1 | Socket.IO | 2 |
| Event replay on reconnect (last-event-ID pattern) | BE-1 | Socket.IO | 1.5 |
| Real-time listing status updates (sold, price change) | BE-2 | Socket.IO | 1 |
| Server-side view tracking API (deduplicated, batched writes) | BE-2 | Phase 1 | 1.5 |
| Bot detection for view tracking (User-Agent check, rate limit) | BE-2 | View tracking | 1 |
| Redis pub/sub for event broadcasting across server instances | BE-1 | Redis | 1 |

#### Week 9: Notification System

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Design `notifications` table + `notification_preferences` table | BE-1 | Phase 1 | 0.5 |
| Notification service abstraction (strategy pattern: email, SMS, push, in-app) | BE-1 | Schema | 2 |
| Email notifications via AWS SES or Postmark (transactional) | BE-2 | Service | 1.5 |
| SMS notifications via MSG91 (OTP + transactional) | BE-2 | Service | 1.5 |
| In-app notification API (GET /api/v1/notifications, PATCH /mark-read) | BE-1 | Schema | 1 |
| Frontend: notification bell icon with unread count badge | FE-1 | API | 1 |
| Frontend: notification dropdown / page | FE-1 | API | 1 |
| Notification preferences API + UI | BE-1/FE-1 | Schema | 1 |

#### Week 10: Price Drop Alerts + Event System

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Price change event system (debounced, 5-min cooling period) | BE-1 | Notifications | 1.5 |
| Price drop alert for wishlisted cars (query users, batch notify) | BE-2 | Events + Wishlist | 1.5 |
| Booking status change notifications (confirmed, cancelled, reminder) | BE-2 | Events | 1 |
| Reservation expiry warning (6h before, 1h before) | BE-1 | Reservations | 1 |
| Real-time "car reserved" / "car sold" banner on listing page | FE-1 | Socket.IO | 1 |
| Test drive reminder notifications (24h before, 1h before) | BE-2 | Bookings + Cron | 1 |
| Firebase Cloud Messaging setup (web push notifications) | BE-1 | - | 1.5 |
| Frontend: push notification permission request + service worker | FE-1 | FCM | 1 |

**Phase 3 Deliverables**:
- WebSocket-powered real-time updates (car status, price changes)
- Multi-tab deduplication
- Event replay on reconnection
- Email + SMS + In-app + Push notification channels
- Price drop alerts for wishlist
- Booking reminders
- Deduplicated view tracking

---

### Phase 4: Messaging + Dealer Portal (Weeks 11-14)

**Goal**: Enable buyer-seller communication and give dealers self-service tools.

**Team**: 2 backend engineers, 2 frontend engineers

#### Week 11-12: Dealer Portal

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Dealer registration flow (business details, GST, address proof) | BE-1 | Auth | 2 |
| Admin dealer verification workflow (approve/reject with notes) | BE-1 | Registration | 1.5 |
| Dealer dashboard page (listings count, views, leads, bookings) | FE-1 | APIs | 3 |
| Dealer inventory management (add/edit/mark-sold/delist) | FE-1 | Existing CRUD | 2 |
| Dealer-specific listing creation (pre-fill dealer info, auto-link) | BE-2 | Auth + Listings | 1.5 |
| Lead management API (inquiry tracking, status updates) | BE-2 | Dealer schema | 2 |
| Dealer analytics API (views over time, lead conversion) | BE-1 | Analytics | 1.5 |
| Bulk listing upload (CSV parsing + validation + preview) | BE-2 | Listings API | 2 |
| Frontend: bulk upload wizard with error reporting | FE-2 | Bulk API | 2 |
| Dealer verification badge display on listings | FE-2 | Dealer data | 0.5 |

#### Week 13-14: Messaging System

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Design `conversations` + `messages` tables | BE-1 | Phase 3 | 0.5 |
| Conversation creation API (buyer initiates on listing) | BE-1 | Schema | 1 |
| Message send/receive API | BE-1 | Conversations | 1.5 |
| Real-time message delivery via Socket.IO | BE-2 | Socket.IO | 1.5 |
| Frontend: chat interface (conversation list + message thread) | FE-1 | APIs | 3 |
| Frontend: chat notification badge (unread messages) | FE-2 | Socket.IO | 1 |
| WhatsApp Business API integration (outbound messages) | BE-2 | - | 2 |
| Click-to-WhatsApp on car detail page (pre-filled message) | FE-2 | WhatsApp | 0.5 |
| Chat moderation: profanity filter + report mechanism | BE-1 | Messages | 1 |
| Inquiry form on listing (non-chat lead capture) | BE-2/FE-2 | Leads | 1 |
| Dealer: lead inbox with conversation history | FE-1 | Chat + Leads | 2 |

**Phase 4 Deliverables**:
- Dealer self-registration and admin verification
- Dealer dashboard with analytics
- Dealer inventory management + bulk upload
- In-app buyer-seller chat with real-time delivery
- WhatsApp integration (click-to-chat + outbound notifications)
- Lead management for dealers
- Chat moderation

---

### Phase 5: Analytics + SEO + Content (Weeks 15-18)

**Goal**: Improve discoverability, add content features, and build analytics infrastructure.

**Team**: 1 backend engineer, 2 frontend engineers, 1 SEO/content specialist (part-time)

#### Week 15-16: SEO + Content

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| SSR or pre-rendering setup (Next.js migration or prerender.io) | FE-1 | - | 3 |
| Dynamic meta tags per page (title, description, OG image) | FE-1 | SSR | 1.5 |
| JSON-LD structured data for car listings (Schema.org Vehicle) | FE-2 | - | 1 |
| Dynamic sitemap.xml generation (all active listings) | BE-1 | - | 1 |
| robots.txt configuration | BE-1 | - | 0.5 |
| Canonical URLs for listing pages | FE-2 | - | 0.5 |
| City landing pages (/used-cars-in-delhi, /used-cars-in-mumbai) | FE-1/BE-1 | - | 2 |
| Brand landing pages (/used-hyundai-cars, /used-maruti-cars) | FE-2/BE-1 | - | 2 |
| Banner management system (admin CRUD for homepage/search banners) | BE-1/FE-2 | - | 2 |
| Blog system (admin CRUD with rich text editor, TipTap/Quill) | BE-1/FE-1 | - | 3 |

#### Week 17-18: Analytics + Tracking

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| GA4 integration (page views, custom events) | FE-2 | - | 1 |
| Facebook Pixel + Meta Conversions API (server-side) | BE-1/FE-2 | - | 1.5 |
| Conversion funnel tracking (view > inquiry > test-drive > reserve > purchase) | BE-1 | All phases | 2 |
| Search analytics (top queries, zero-result queries, popular filters) | BE-1 | Search API | 1.5 |
| Admin analytics dashboard (Chart.js / Recharts) | FE-1 | Analytics APIs | 3 |
| Listing performance reports for dealers | FE-2 | Dealer portal | 2 |
| Automated weekly email reports (admin) | BE-1 | Email service | 1 |
| Full-text search upgrade (PostgreSQL tsvector or Elasticsearch) | BE-1 | PostgreSQL | 2 |
| Search relevance tuning (boost featured, recency, condition) | BE-1 | Full-text search | 1 |

**Phase 5 Deliverables**:
- SEO-optimized pages (SSR/pre-render, structured data, sitemaps)
- City and brand landing pages
- Blog/content management
- Banner management
- GA4 + Facebook tracking
- Admin analytics dashboard
- Full-text search with relevance ranking

---

### Phase 6: Advanced Features + Scale (Weeks 19-24)

**Goal**: Build differentiation features and prepare for scale.

**Team**: 2 backend engineers, 2 frontend engineers, 1 DevOps

#### Week 19-20: Comparison + Valuation Tools

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Comparison tool: add-to-compare button (max 4 cars) | FE-1 | - | 1 |
| Comparison page: side-by-side spec display | FE-1 | - | 2 |
| Comparison: highlight better/worse values | FE-2 | - | 1 |
| Share comparison via URL | FE-2 | - | 0.5 |
| Valuation form (multi-step: brand > model > variant > year > km > condition) | FE-1 | - | 2 |
| Valuation algorithm (depreciation model based on historical listing data) | BE-1 | Listing data | 3 |
| Valuation report page | FE-2 | Algorithm | 1 |
| Sell-your-car lead capture on valuation | BE-2/FE-2 | Valuation | 1 |

#### Week 21-22: Reviews + Document Management

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Review system schema (reviews, ratings, responses) | BE-1 | Phase 1 | 0.5 |
| Review CRUD API (create after purchase, edit, delete) | BE-1 | Schema | 1.5 |
| Review moderation queue (admin approve/reject) | BE-2 | Reviews | 1 |
| Aggregate rating calculation + display | BE-2/FE-2 | Reviews | 1 |
| Frontend: review display on listing + dealer pages | FE-1 | API | 2 |
| Frontend: review submission form with star rating | FE-2 | API | 1 |
| KYC document upload API (with encryption at rest) | BE-1 | Auth | 2 |
| Document verification workflow (admin) | BE-2 | Upload | 1.5 |
| Frontend: document upload UI in user profile | FE-1 | API | 1 |
| PDF receipt generation (for payments + reservations) | BE-2 | Payments | 1.5 |

#### Week 23-24: Scale + Infrastructure

| Task | Owner | Depends On | Days |
|------|-------|-----------|------|
| Move image uploads to S3/Cloudflare R2 with CDN | DevOps/BE-1 | - | 2 |
| Redis caching layer (search results, listing detail) | BE-1 | Redis | 2 |
| Database read replicas setup | DevOps | PostgreSQL | 1 |
| Connection pooling optimization (PgBouncer) | DevOps/BE-2 | PostgreSQL | 1 |
| API response compression (brotli/gzip) | BE-2 | - | 0.5 |
| Image optimization pipeline (sharp: resize, WebP conversion, lazy loading) | BE-1 | S3 | 1.5 |
| Error tracking (Sentry integration) | BE-2 | - | 1 |
| Health check + uptime monitoring (Uptime Robot or Better Stack) | DevOps | - | 0.5 |
| Financing: loan eligibility calculator UI | FE-1 | - | 1.5 |
| Financing: partner bank API skeleton (mock for now) | BE-2 | - | 1 |
| Load testing (k6 or Artillery) - 500 concurrent users target | DevOps/BE-1 | All | 2 |
| Security audit (OWASP top 10 checklist) | BE-1/BE-2 | All | 2 |
| Performance audit (Lighthouse, Core Web Vitals) | FE-1/FE-2 | All | 1 |
| Documentation: API docs (Swagger/OpenAPI), deployment runbook | All | All | 2 |

**Phase 6 Deliverables**:
- Car comparison tool (up to 4 cars)
- Car valuation tool with algorithmic pricing
- Review and rating system with moderation
- KYC document upload and verification
- Cloud storage (S3/R2) with CDN for images
- Redis caching
- Error tracking (Sentry)
- Load-tested to 500 concurrent users
- Security audit complete

---

## Dependency Graph (Critical Path)

```
Phase 1 (Auth + DB) ──> Phase 2 (Bookings + Pay) ──> Phase 3 (Real-time + Notif)
                                                              │
                                                              v
                                                    Phase 4 (Chat + Dealer)
                                                              │
                                                              v
                                              Phase 5 (SEO + Analytics)  ──> Phase 6 (Scale)
```

Key dependencies:
- Everything depends on Phase 1 (auth + PostgreSQL)
- Payments (Phase 2) must be done before real-time notifications about payments (Phase 3)
- WebSocket infrastructure (Phase 3) must exist before chat (Phase 4)
- Dealer portal (Phase 4) can start in parallel with Phase 3 backend work
- SEO/SSR (Phase 5) can start earlier if React framework migration (to Next.js) is prioritized
- Phase 6 scaling work can be pulled forward if traffic demands it

## Total Effort Summary

| Phase | Weeks | Backend Days | Frontend Days | DevOps Days | QA Days |
|-------|-------|-------------|---------------|-------------|---------|
| 1 | 3 | 30 | 15 | 3 | 0 |
| 2 | 4 | 40 | 15 | 0 | 10 |
| 3 | 3 | 30 | 12 | 0 | 0 |
| 4 | 4 | 30 | 25 | 0 | 0 |
| 5 | 4 | 20 | 25 | 0 | 0 |
| 6 | 6 | 30 | 20 | 10 | 5 |
| **Total** | **24** | **180** | **112** | **13** | **15** |

**Minimum team**: 2 backend + 2 frontend + 1 part-time DevOps + 1 part-time QA = ~4.5 FTEs

## Technology Additions Required

| Category | Current | Target |
|----------|---------|--------|
| Database | SQLite | PostgreSQL 16 |
| Cache | None | Redis 7 |
| Auth | None | JWT + bcrypt + OTP (MSG91) + OAuth (Google) |
| Payments | None | Razorpay |
| Real-time | None | Socket.IO + Redis adapter |
| Email | None | AWS SES or Postmark |
| SMS | None | MSG91 |
| Push | None | Firebase Cloud Messaging |
| Storage | Local filesystem | S3 / Cloudflare R2 + CDN |
| Search | SQL LIKE | PostgreSQL FTS or Elasticsearch |
| Monitoring | None | Sentry + Pino structured logging |
| Task Queue | None | BullMQ (Redis-based) for background jobs |
| Cron | None | node-cron or BullMQ repeatable jobs |
| Validation | Manual | Zod |
| SSR | None | Next.js or Prerender.io |
| Testing | None | Vitest + Playwright |
