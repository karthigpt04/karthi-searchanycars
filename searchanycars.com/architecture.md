# SearchAnyCars.com — System Architecture

> A complete technical and non-technical guide to how SearchAnyCars works — from the moment a user opens the website to how data flows through every layer of the system.

---

## Table of Contents

1. [What is SearchAnyCars?](#1-what-is-searchanycars)
2. [The Big Picture](#2-the-big-picture)
3. [How a User's Journey Works](#3-how-a-users-journey-works)
4. [System Layers Explained](#4-system-layers-explained)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Database Architecture](#7-database-architecture)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Page-by-Page Breakdown](#9-page-by-page-breakdown)
10. [Component Hierarchy](#10-component-hierarchy)
11. [API Reference](#11-api-reference)
12. [File & Folder Structure](#12-file--folder-structure)
13. [Design System](#13-design-system)
14. [Security & Performance](#14-security--performance)
15. [Technology Stack](#15-technology-stack)
16. [Glossary](#16-glossary)

---

## 1. What is SearchAnyCars?

SearchAnyCars is an **online used car marketplace** built for the Indian market. Think of it as a trusted middleman between used car dealers and buyers.

**For Buyers:** Browse thousands of quality-inspected used cars, compare them, calculate EMIs, book test drives, and reserve cars — all from one website.

**For Admins:** Manage car listings, upload photos, set prices, track bookings, and organize inventory through a dedicated dashboard.

**The Key Idea:** Multiple dealers supply their cars, but the buyer sees everything under one trusted brand — "SearchAnyCars" — with consistent quality, fixed pricing, and guarantees.

---

## 2. The Big Picture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │   Home   │  │  Search  │  │  Detail  │  │  Admin   │  ...more  │
│  │   Page   │  │   Page   │  │   Page   │  │   Page   │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │              │              │                 │
│       └──────────────┴──────────────┴──────────────┘                │
│                              │                                      │
│                     React Frontend (SPA)                            │
│                     Runs in the browser                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    HTTP Requests (JSON)
                               │
┌──────────────────────────────┴──────────────────────────────────────┐
│                        EXPRESS SERVER                                │
│                        (Node.js, Port 4000)                         │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │  API Routes    │  │  File Upload   │  │  Static Files  │        │
│  │  /api/...      │  │  /uploads/...  │  │  /dist/...     │        │
│  └───────┬────────┘  └───────┬────────┘  └────────────────┘        │
│          │                   │                                      │
└──────────┴───────────────────┴──────────────────────────────────────┘
           │                   │
           │                   ▼
           │          ┌────────────────┐
           │          │  File System   │
           │          │  /uploads/     │
           │          │  (Car Photos)  │
           │          └────────────────┘
           │
           ▼
┌──────────────────────┐
│    SQLite Database    │
│  searchanycars.db     │
│                       │
│  ┌─────────────────┐  │
│  │   categories    │  │
│  │   listings      │  │
│  │   filters       │  │
│  │   filter_map    │  │
│  └─────────────────┘  │
└───────────────────────┘
```

**In plain English:**
1. The **user opens the website** in their browser
2. The browser loads a **React application** (the frontend)
3. The React app **sends requests** to the Express server for data
4. The Express server **reads from the database** and returns the information
5. The React app **displays the data** as beautiful car listings, filters, and forms

---

## 3. How a User's Journey Works

```
┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ LAND │───►│  BROWSE  │───►│ EVALUATE │───►│   BOOK   │───►│ RESERVE  │
│      │    │          │    │          │    │          │    │          │
│Opens │    │Filters   │    │Views car │    │Books a   │    │Pays a    │
│site  │    │by brand, │    │details,  │    │test      │    │deposit   │
│      │    │price,    │    │specs,    │    │drive     │    │to hold   │
│      │    │fuel,     │    │photos,   │    │          │    │the car   │
│      │    │city...   │    │EMI calc  │    │          │    │          │
└──────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘

  Homepage     Search Page    Car Detail      Test Drive      Reserve
    (/)         (/search)    (/car/:id)        Modal           Modal
```

**Step-by-step:**

| Step | What the User Does | What the System Does |
|------|-------------------|---------------------|
| 1. **Land** | Opens searchanycars.com | Loads the React app, fetches featured cars from API |
| 2. **Search** | Sets filters (brand, budget, fuel type...) | Sends filtered query to API, returns matching cars |
| 3. **Save** | Taps the heart icon on a car | Saves car ID to browser's localStorage (no login needed) |
| 4. **Evaluate** | Opens a car's detail page | Fetches full car data (140+ fields), shows gallery, specs, EMI |
| 5. **Calculate** | Adjusts EMI sliders | Calculates monthly payment in real-time (no server call) |
| 6. **Book** | Clicks "Book Test Drive" | Opens modal form, collects name/phone/date/time |
| 7. **Reserve** | Clicks "Reserve This Car" | Opens modal, shows deposit amount, collects details |
| 8. **Compare** | Selects up to 3 cars on search page | Stores selected IDs in memory for side-by-side comparison |

---

## 4. System Layers Explained

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   PRESENTATION LAYER  (What users see & interact)   │
│                                                     │
│   React Components → Pages → CSS Styles             │
│   Runs in: Browser                                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   APPLICATION LAYER   (Business logic & routing)    │
│                                                     │
│   Express Routes → Query Filters → Data Transform   │
│   Runs on: Node.js Server                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   DATA LAYER          (Storage & retrieval)          │
│                                                     │
│   SQLite Database → File System (Images)            │
│   Stored on: Server Disk                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Presentation** | React 19 + TypeScript + CSS | Show pages, handle user input, navigate between screens |
| **Application** | Express 5 + Node.js | Process API requests, apply business rules, validate data |
| **Data** | SQLite + File System | Store car listings, categories, images permanently |

---

## 5. Frontend Architecture

### 5.1 How the Frontend is Organized

```
src/
├── main.tsx                    ← App entry point (boots React)
├── App.tsx                     ← Route definitions (URL → Page)
├── index.css                   ← Global design system (colors, layouts)
│
├── pages/                      ← One file per page/screen
│   ├── HomePage.tsx               Hero, search, browse sections
│   ├── SearchPage.tsx             Filters + car grid
│   ├── CarDetailPage.tsx          Full car info + EMI + booking
│   ├── WishlistPage.tsx           Saved cars (from localStorage)
│   ├── AboutPage.tsx              Company story & values
│   ├── HowItWorksPage.tsx         6-step buyer guide
│   ├── FAQPage.tsx                12 Q&As with accordion
│   ├── ContactPage.tsx            Contact form + info
│   └── AdminPage.tsx              Inventory management
│
├── components/                 ← Reusable building blocks
│   ├── SiteHeader.tsx             Top navigation bar
│   ├── SiteFooter.tsx             Bottom links & info
│   ├── CarCard.tsx                Individual car listing card
│   ├── TrustBar.tsx               5 trust guarantee badges
│   ├── MobileNav.tsx              Bottom nav for phones
│   ├── BookTestDriveModal.tsx     Test drive booking popup
│   └── ReserveCarModal.tsx        Car reservation popup
│
├── api/
│   └── client.ts               ← All server communication
│
├── utils/
│   └── format.ts               ← Currency & number formatting
│
└── types.ts                    ← Data shape definitions
```

### 5.2 Routing Map

Every URL maps to a specific page:

```
URL Path              Page Component        What It Shows
─────────────────────────────────────────────────────────
/                  →  HomePage              Hero, browse, featured
/search            →  SearchPage            Filters + results grid
/search?brand=Tata →  SearchPage            Pre-filtered by Tata
/car/5             →  CarDetailPage         Full details for car #5
/wishlist          →  WishlistPage          User's saved cars
/about             →  AboutPage             Company info
/how-it-works      →  HowItWorksPage        Step-by-step guide
/faq               →  FAQPage              Questions & answers
/contact           →  ContactPage           Form + phone/email
/admin             →  AdminPage             Inventory dashboard
/*                 →  NotFoundPage          404 error
```

### 5.3 State Management Strategy

SearchAnyCars uses **no external state library** (no Redux, no Zustand). All state is managed through:

```
┌───────────────────────────────────────────────────────┐
│                STATE MANAGEMENT                        │
│                                                       │
│  ┌─────────────────┐   Most state lives here.        │
│  │  React useState  │   Filter values, form inputs,   │
│  │  (Component)     │   loading flags, modal open/    │
│  └────────┬────────┘   close, selected images, etc.  │
│           │                                           │
│  ┌────────▼────────┐   Wishlist persists across       │
│  │  localStorage    │   browser sessions. Stored as    │
│  │  (Browser)       │   JSON array of car IDs.        │
│  └────────┬────────┘   Key: "sac_wishlist"            │
│           │                                           │
│  ┌────────▼────────┐   Initial filter values from     │
│  │  URL Params      │   URL (e.g., ?brand=Hyundai).   │
│  │  (Address Bar)   │   Read on page load.            │
│  └─────────────────┘                                  │
└───────────────────────────────────────────────────────┘
```

### 5.4 How the API Client Works

All communication with the server goes through one file: `src/api/client.ts`

```
                    ┌──────────────────┐
                    │    api.client    │
                    │                  │
  Component ──────► │  getListings()   │ ──────► GET /api/listings?...
  calls api.*()     │  getListingById()│ ──────► GET /api/listings/:id
                    │  createListing() │ ──────► POST /api/listings
                    │  updateListing() │ ──────► PUT /api/listings/:id
                    │  deleteListing() │ ──────► DELETE /api/listings/:id
                    │                  │
                    │  getCategories() │ ──────► GET /api/categories
                    │  uploadImage()   │ ──────► POST /api/uploads/image
                    └──────────────────┘
                            │
                    Adds JSON headers,
                    handles errors,
                    parses response
```

---

## 6. Backend Architecture

### 6.1 Server Structure

```
server/
├── index.js          ← Main server file
│                       - Sets up Express app
│                       - Defines all API routes
│                       - Configures CORS, JSON parsing
│                       - Serves static files (frontend build + uploads)
│
├── bootstrap.js      ← Database initialization
│                       - Creates tables on first run
│                       - Seeds 8 categories
│                       - Seeds 13 filter definitions
│                       - Seeds 15 sample car listings
│
├── db.js             ← Database connection
│                       - Opens SQLite file
│                       - Enables WAL mode (faster writes)
│                       - Enables foreign key checks
│
└── storage.js        ← Image upload handler
                        - Generates unique filenames
                        - Organizes by year/month folders
                        - Returns public URL path
```

### 6.2 Request Processing Pipeline

When a user's browser sends a request, here's exactly what happens:

```
Browser Request
      │
      ▼
┌─────────────┐
│    CORS      │  Check: Is the request from an allowed origin?
│  Middleware   │  (localhost:5173 during development)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    JSON      │  Parse the request body (if POST/PUT)
│   Parser     │  Max size: 3 MB
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Route      │  Match URL to handler:
│  Matching    │    /api/listings → listings handler
│              │    /api/categories → categories handler
│              │    /uploads/* → serve static file
│              │    /* → serve frontend HTML (SPA fallback)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Handler    │  Business logic:
│   Function   │    - Build SQL query from URL params
│              │    - Execute query against SQLite
│              │    - Transform data (parse JSON fields)
│              │    - Return JSON response
└──────┬──────┘
       │
       ▼
  JSON Response
  back to Browser
```

### 6.3 Search Query Builder

When the search page sends a request like:
```
GET /api/listings?brand=Hyundai&fuel_type=Petrol&listing_price_max=1500000&sortBy=priceAsc
```

The server builds this SQL:

```sql
SELECT l.*, c.name as category_name, c.slug as category_slug
FROM listings l
LEFT JOIN categories c ON c.id = l.category_id
WHERE 1 = 1
  AND l.brand = 'Hyundai'
  AND l.fuel_type = 'Petrol'
  AND l.listing_price_inr <= 1500000
ORDER BY l.listing_price_inr ASC
```

**Supported Filter Parameters:**

| Parameter | SQL Logic | Example |
|-----------|----------|---------|
| `search` | `LIKE` on title, brand, model, city | `?search=creta` |
| `categoryId` | Exact match | `?categoryId=3` |
| `brand` | Exact match | `?brand=Hyundai` |
| `fuel_type` | Exact match | `?fuel_type=Diesel` |
| `transmission_type` | Exact match | `?transmission_type=Automatic` |
| `ownership_type` | Exact match | `?ownership_type=First` |
| `seller_type` | Exact match | `?seller_type=Dealer` |
| `location_city` | `LIKE` (partial match) | `?location_city=Mumbai` |
| `listing_price_min` | `>=` | `?listing_price_min=500000` |
| `listing_price_max` | `<=` | `?listing_price_max=1500000` |
| `model_year_min` | `>=` | `?model_year_min=2022` |
| `model_year_max` | `<=` | `?model_year_max=2024` |
| `total_km_driven_max` | `<=` | `?total_km_driven_max=30000` |
| `sortBy` | `ORDER BY` clause | `latest`, `priceAsc`, `priceDesc` |

### 6.4 Image Upload Flow

```
┌──────────┐    ┌───────────┐    ┌──────────────┐    ┌────────────────┐
│  Admin    │    │  Multer   │    │   storage.js │    │  File System   │
│  selects  │───►│  parses   │───►│  generates   │───►│                │
│  image    │    │  file     │    │  unique name │    │  /uploads/     │
│  file     │    │  from     │    │  & creates   │    │  listings/     │
│           │    │  form     │    │  year/month  │    │  2026/         │
│           │    │  data     │    │  folders     │    │  03/           │
│           │    │           │    │              │    │  abc-car.jpg   │
└──────────┘    └───────────┘    └──────────────┘    └────────────────┘
                                        │
                                        ▼
                              Returns: { url, path, fileName }
                              URL stored in listing's images_json
```

**File naming:** `{random-uuid}-{sanitized-original-name}.{extension}`
**Folder structure:** `/uploads/listings/{YYYY}/{MM}/`
**Size limit:** 6 MB per image
**Accepted types:** Any image/* MIME type

---

## 7. Database Architecture

### 7.1 Entity Relationship Diagram

```
┌─────────────────────┐          ┌─────────────────────────┐
│     categories      │          │    filter_definitions    │
│─────────────────────│          │─────────────────────────│
│ id (PK)             │          │ id (PK)                 │
│ name (UNIQUE)       │◄─────┐  │ key (UNIQUE)            │
│ slug (UNIQUE)       │      │  │ label                   │
│ vehicle_type        │      │  │ type (text/number/select)│
│ description         │      │  │ options_json            │
│ created_at          │      │  └────────────┬────────────┘
│ updated_at          │      │               │
└──────────┬──────────┘      │               │
           │                 │               │
           │            ┌────┴───────────────┴────┐
           │            │   category_filter_map    │
           │            │─────────────────────────│
           │            │ category_id (FK) ───────┤── Links to categories
           │            │ filter_id   (FK) ───────┤── Links to filter_definitions
           │            │ (composite PK)          │
           │            └─────────────────────────┘
           │
           │  One category can have
           │  many listings
           │
┌──────────▼──────────────────────────────────────────────────┐
│                        listings                              │
│──────────────────────────────────────────────────────────────│
│                                                              │
│  IDENTITY          PRICING           ENGINE & PERFORMANCE    │
│  ────────          ───────           ────────────────────    │
│  id (PK)           listing_price_inr  engine_type            │
│  listing_code      negotiable         engine_capacity_cc     │
│  title             estimated_value    power_bhp              │
│  brand             emi_estimate       torque_nm              │
│  model             down_payment       transmission_type      │
│  variant           transfer_charges   fuel_type              │
│  model_year        ...12 more         mileage_kmpl           │
│  category_id (FK)                     ...8 more              │
│                                                              │
│  CONDITION         FEATURES           MEDIA                  │
│  ─────────         ────────           ─────                  │
│  overall_rating    airbags_count      images_json            │
│  exterior_cond     abs, ebd, esc      interior_images_json   │
│  interior_cond     sunroof            exterior_images_json   │
│  engine_cond       apple_carplay      engine_images_json     │
│  accident_history  android_auto       damage_images_json     │
│  flood_damage      led_headlights     view_360_url           │
│  ...10 more        ...30+ more        video_walkaround_url   │
│                                                              │
│  LOCATION          STATUS             ENGAGEMENT             │
│  ────────          ──────             ──────────             │
│  location_city     listing_status     views_count            │
│  location_state    featured_listing   favorites_count        │
│  registration_*    promotion_tier     lead_count             │
│  seller_name       inspection_score   created_at             │
│  dealer_rating     inspection_status  updated_at             │
│                                                              │
│                 Total: 140+ columns                          │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 What Each Table Stores

| Table | Purpose | Row Count (Seed) | Key Fields |
|-------|---------|-----------------|------------|
| **categories** | Vehicle types (Hatchback, Sedan, SUV...) | 8 | name, slug, vehicle_type |
| **filter_definitions** | Available search filters | 13 | key, label, type, options |
| **category_filter_map** | Which filters apply to which category | 104 (8×13) | category_id, filter_id |
| **listings** | Every car on the platform | 15 | 140+ columns of vehicle data |

### 7.3 The Listings Table — Deep Dive

The `listings` table is the heart of the system. Here's how its **140+ columns** are organized:

```
┌──────────────────────────────────────────────────────────────┐
│                    LISTINGS TABLE (140+ columns)              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  VEHICLE IDENTITY (12 columns)                      │     │
│  │  id, listing_code, title, brand, model, variant,    │     │
│  │  model_year, registration_year, vehicle_type,       │     │
│  │  body_style, exterior_color, interior_color         │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  PRICING & FINANCIALS (18 columns)                  │     │
│  │  listing_price_inr, negotiable, estimated_value,    │     │
│  │  minimum_price, emi_estimate, down_payment,         │     │
│  │  loan_available, insurance_cost, transfer_charges,  │     │
│  │  rc_transfer_cost, documentation_charges,           │     │
│  │  dealer_fees, delivery_charges, inspection_charges, │     │
│  │  extended_warranty_cost, accessory_value...         │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  OWNERSHIP & LEGAL (18 columns)                     │     │
│  │  ownership_type, seller_type, registration_state,   │     │
│  │  registration_city, road_tax_paid, hypothecation,   │     │
│  │  noc_available, insurance_status, insurance_type,   │     │
│  │  insurance_valid_till, accident_history, legal_case  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  ENGINE & PERFORMANCE (16 columns)                  │     │
│  │  engine_type, engine_capacity_cc, power_bhp,        │     │
│  │  torque_nm, cylinders_count, transmission_type,     │     │
│  │  drivetrain, turbocharged, fuel_type, mileage_kmpl, │     │
│  │  city_mileage, highway_mileage, emission_standard   │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  CONDITION & SERVICE (16 columns)                   │     │
│  │  overall_condition_rating, exterior/interior/engine/ │     │
│  │  tire/brake/suspension/battery_condition,           │     │
│  │  flood_damage, accident_damage, repainted_panels,   │     │
│  │  service_history, last_service_date, warranty...    │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  SAFETY FEATURES (14 columns)                       │     │
│  │  airbags_count, abs, ebd, traction_control, esc,   │     │
│  │  hill_assist, lane_assist, adaptive_cruise_control, │     │
│  │  blind_spot_monitoring, parking_sensors/camera,     │     │
│  │  camera_360, tpms, isofix                          │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  COMFORT & INFOTAINMENT (22 columns)                │     │
│  │  ac_type, sunroof, leather_seats, ventilated_seats, │     │
│  │  keyless_entry, push_start, cruise_control,         │     │
│  │  touchscreen, apple_carplay, android_auto,          │     │
│  │  bluetooth, navigation, wireless_charging...        │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  EXTERIOR & WHEELS (14 columns)                     │     │
│  │  alloy_wheels, wheel_size, fog_lamps, led_lights,   │     │
│  │  drls, roof_rails, spoiler, auto_headlights,       │     │
│  │  rain_sensing_wipers, tire_brand/size/condition...  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  MEDIA (8 columns)                                  │     │
│  │  images_json, interior_images_json,                 │     │
│  │  exterior_images_json, engine_images_json,          │     │
│  │  tire_images_json, damage_images_json,              │     │
│  │  view_360_url, video_walkaround_url                 │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  ENGAGEMENT & STATUS (10 columns)                   │     │
│  │  listing_status, featured_listing, views_count,     │     │
│  │  favorites_count, lead_count, promotion_tier,       │     │
│  │  inspection_status, inspection_score,               │     │
│  │  created_at, updated_at                             │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 7.4 Database Performance

**8 Indexes** for fast searching:

| Index | Column | Speeds Up |
|-------|--------|-----------|
| `idx_listings_category_id` | category_id | Browsing by body type |
| `idx_listings_brand` | brand | Searching by brand |
| `idx_listings_fuel_type` | fuel_type | Filtering by fuel |
| `idx_listings_transmission_type` | transmission_type | Filtering by gearbox |
| `idx_listings_listing_price_inr` | listing_price_inr | Price range queries |
| `idx_listings_model_year` | model_year | Year range queries |
| `idx_listings_total_km_driven` | total_km_driven | KM driven filtering |
| `idx_listings_location_city` | location_city | City-based searching |

**Configuration:**
- **WAL mode** (Write-Ahead Logging) — allows reading while writing
- **Foreign keys enabled** — ensures data integrity between tables

---

## 8. Data Flow Diagrams

### 8.1 Searching for Cars

```
User types "Hyundai" in brand filter
         │
         ▼
┌─────────────────┐     GET /api/listings?brand=Hyundai
│  SearchPage.tsx  │────────────────────────────────────►┌──────────────┐
│                  │                                     │ Express      │
│  Sets brand      │                                     │ Server       │
│  state to        │◄────────────────────────────────────│              │
│  "Hyundai"       │     JSON: [{id:1, title:"2022      │ Builds SQL:  │
│                  │      Hyundai Creta SX(O)", ...},    │ WHERE brand  │
│  Renders         │      {id:14, title:"2021 Hyundai   │ = 'Hyundai'  │
│  CarCard for     │      i20 Asta(O)", ...}]           │              │
│  each result     │                                     │ Runs query   │
└─────────────────┘                                     │ on SQLite    │
                                                        └──────────────┘
```

### 8.2 Viewing a Car's Details

```
User clicks "View" on a car card
         │
         ▼
┌──────────────────┐     GET /api/listings/5
│ CarDetailPage.tsx │──────────────────────►┌──────────────┐
│                   │                       │ Express      │
│ Shows:            │◄──────────────────────│ Server       │
│ - Image gallery   │  Full listing JSON    │              │
│ - Price & EMI     │  (140+ fields)        │ SELECT * FROM│
│ - Specs & features│                       │ listings     │
│ - Inspection      │                       │ WHERE id = 5 │
│ - EMI calculator  │                       └──────────────┘
│ - Trust badges    │
│ - Similar cars    │     GET /api/listings?categoryId=3
│                   │──────────────────────►(fetches similar)
└──────────────────┘
```

### 8.3 Wishlist (No Server Needed)

```
User clicks heart (♡) on a car
         │
         ▼
┌──────────────────┐
│   CarCard.tsx     │
│                   │
│   Reads current   │◄──── localStorage.getItem('sac_wishlist')
│   wishlist array  │      Returns: [1, 7, 12]
│                   │
│   Adds/removes    │
│   car ID          │────► localStorage.setItem('sac_wishlist',
│                   │        JSON.stringify([1, 7, 12, 5]))
│   Heart turns     │
│   red (❤️)        │      No server call needed!
└──────────────────┘      Data persists in browser.
```

### 8.4 Admin Creates a New Listing

```
Admin fills form & clicks "Save"
         │
         ▼
┌──────────────────┐     POST /api/listings
│  AdminPage.tsx    │──────────────────────►┌──────────────┐
│                   │     Body: {           │ Express      │
│  Collects:        │       listingCode,    │ Server       │
│  - Title          │       title,          │              │
│  - Brand, Model   │       brand,          │ Validates    │
│  - Price          │       model,          │ required     │
│  - Photos         │       listingPriceInr,│ fields       │
│  - Specs          │       images: [...],  │              │
│                   │       ...             │ INSERT INTO  │
│                   │     }                 │ listings     │
│                   │                       │              │
│  Shows success    │◄──────────────────────│ Returns new  │
│  message          │  { id: 16, ... }      │ listing      │
└──────────────────┘                       └──────────────┘
```

---

## 9. Page-by-Page Breakdown

### Homepage (`/`)

```
┌─────────────────────────────────────────────────────┐
│                    HERO SECTION                      │
│  ┌───────────────────────────────────────────┐      │
│  │  "Find Your Perfect Used Car"              │      │
│  │  12,000+ quality-inspected cars            │      │
│  │                                            │      │
│  │  ┌──────────────────────────────────┐     │      │
│  │  │ [Search by Budget] [Search by Brand]│     │      │
│  │  ├──────────────────────────────────┤     │      │
│  │  │ Under ₹2L │ ₹2-3L │ ₹3-5L │ ₹5-8L│     │      │
│  │  │ ₹8-10L   │₹10-15L│₹15-20L│ 20L+ │     │      │
│  │  │                                  │     │      │
│  │  │ [All Cities ▼]    [Find Your Car]│     │      │
│  │  └──────────────────────────────────┘     │      │
│  └───────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────┤
│  🔍 200+ Point    🔄 7-Day Money   🛡️ 1-Year       │
│     Inspection       Back             Warranty       │
│  💰 Fixed Price   📋 Free RC Transfer               │
├─────────────────────────────────────────────────────┤
│  BROWSE BY BODY TYPE                                 │
│  🚗 Hatchback  🚘 Sedan  🚙 SUV  🚐 MUV  ...      │
├─────────────────────────────────────────────────────┤
│  BROWSE BY BRAND                                     │
│  Maruti  Hyundai  Tata  Honda  Kia  Mahindra  ...   │
├─────────────────────────────────────────────────────┤
│  FEATURED CARS                                       │
│  [Best Buys] [Newly Added] [All Cars]               │
│  ┌────────┐ ┌────────┐ ┌────────┐                   │
│  │Car Card│ │Car Card│ │Car Card│ ...               │
│  └────────┘ └────────┘ └────────┘                   │
├─────────────────────────────────────────────────────┤
│  BROWSE BY BUDGET  │  BROWSE BY FUEL TYPE            │
├─────────────────────────────────────────────────────┤
│  HOW IT WORKS: Browse → Test Drive → Reserve → Deliver│
├─────────────────────────────────────────────────────┤
│  CUSTOMER REVIEWS: ★★★★★ 4.8/5 rating               │
├─────────────────────────────────────────────────────┤
│  SELL YOUR CAR CTA                                   │
└─────────────────────────────────────────────────────┘
```

### Search Page (`/search`)

```
┌──────────────────────────────────────────────────────┐
│  Search Used Cars                                     │
│  [Assured] [Low KM] [Single Owner] [Newly Added]     │
├──────────┬───────────────────────────────────────────┤
│ FILTERS  │  15 cars found            Sort: [Recommended ▼]│
│          │                                            │
│ 🔍 Search│  ┌────────┐ ┌────────┐ ┌────────┐        │
│          │  │        │ │        │ │        │        │
│ Budget   │  │ Card 1 │ │ Card 2 │ │ Card 3 │        │
│ [Under₹2L]│  │        │ │        │ │        │        │
│ [₹2-5L]  │  └────────┘ └────────┘ └────────┘        │
│ [₹5-10L] │                                            │
│ Min [___] │  ┌────────┐ ┌────────┐ ┌────────┐        │
│ Max [___] │  │        │ │        │ │        │        │
│          │  │ Card 4 │ │ Card 5 │ │ Card 6 │        │
│ Brand    │  │        │ │        │ │        │        │
│ [_______]│  └────────┘ └────────┘ └────────┘        │
│          │                                            │
│ Fuel     │            [Load More Cars]                │
│ [Petrol] │          Showing 6 of 15 cars              │
│ [Diesel] │                                            │
│ [Electric]│                                            │
│          │                                            │
│ Transmis.│                                            │
│ [Manual] │                                            │
│ [Auto]   │                                            │
│          │                                            │
│ Body Type│                                            │
│ [SUV]    │                                            │
│ [Sedan]  │                                            │
│ ...      │                                            │
│          │                                            │
│ [Clear]  │                                            │
└──────────┴───────────────────────────────────────────┘
```

### Car Detail Page (`/car/:id`)

```
┌──────────────────────────────────────────────────────┐
│  Home / Used Cars / 2022 Hyundai Creta SX(O)         │
├────────────────────────────┬─────────────────────────┤
│                            │                         │
│  ┌──────────────────────┐  │  2022 Hyundai Creta     │
│  │                      │  │  SX(O)                   │
│  │    CAR PHOTO          │  │                         │
│  │    GALLERY            │  │  ₹14.50 Lakh            │
│  │                      │  │  Fixed Price ✓           │
│  │  ‹  [image]  ›       │  │  EMI from ₹24,800/mo    │
│  │         1/3          │  │                         │
│  │                      │  │  👀 342 people viewed    │
│  │  [thumb][thumb][thumb]│  │                         │
│  └──────────────────────┘  │  [Book Test Drive]       │
│                            │  [Reserve This Car]      │
│  📅 2022 │ 🛣️ 25K km │    │                         │
│  ⛽ Petrol│ ⚙️ Auto │     │  [📞 Call] [💬 WhatsApp] │
│  👤 First│ 📍 Delhi │     │                         │
│                            │  ♡ Save  ↗ Share        │
│  CAR OVERVIEW              │                         │
│  ┌────────┬────────┐       ├─────────────────────────┤
│  │Reg Year│ 2022   │       │                         │
│  │KM      │ 25,432 │       │                         │
│  │Fuel    │ Petrol │       │                         │
│  │Trans   │ Auto   │       │                         │
│  │Owners  │ 1st    │       │                         │
│  │Color   │ White  │       │                         │
│  └────────┴────────┘       │                         │
│                            │                         │
│  DETAILED SPECS            │                         │
│  ▼ Engine & Performance    │                         │
│  ► Safety Features         │                         │
│  ► Comfort & Convenience   │                         │
│                            │                         │
│  FEATURES                  │                         │
│  ✓ ABS  ✓ 6 Airbags       │                         │
│  ✓ CarPlay  ✓ Sunroof     │                         │
│                            │                         │
│  INSPECTION REPORT         │                         │
│  Score: 92/100             │                         │
│  Exterior: ✓ Pass          │                         │
│  Interior: ✓ Pass          │                         │
│                            │                         │
│  EMI CALCULATOR            │                         │
│  Down: [====●====] 20%     │                         │
│  Rate: [===●=====] 10.5%   │                         │
│  Term: [====●====] 48 mo   │                         │
│  ► ₹28,200/month           │                         │
│                            │                         │
│  WARRANTY & TRUST          │                         │
│  🛡️ Assured  📋 Warranty   │                         │
│  🔄 Returns  📝 RC Free    │                         │
├────────────────────────────┴─────────────────────────┤
│  SIMILAR CARS                                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Card   │ │ Card   │ │ Card   │ │ Card   │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
└──────────────────────────────────────────────────────┘
```

---

## 10. Component Hierarchy

```
App
├── SiteHeader
│   ├── Brand Logo (link to /)
│   ├── Navigation Links
│   │   ├── Buy Cars → /search
│   │   ├── How It Works → /how-it-works
│   │   ├── About Us → /about
│   │   ├── FAQs → /faq
│   │   └── Contact → /contact
│   ├── Wishlist Icon → /wishlist
│   ├── Find Cars Button → /search
│   └── Mobile Menu Toggle
│
├── <Routes>
│   ├── HomePage
│   │   ├── Hero Section (search tabs, budget chips, brand grid)
│   │   ├── TrustBar (5 trust badges)
│   │   ├── Body Type Grid (6 types)
│   │   ├── Brand Grid (10 brands)
│   │   ├── Featured Cars Grid
│   │   │   └── CarCard (×6)
│   │   ├── Budget Pills (8 ranges)
│   │   ├── Fuel Type Grid (4 types)
│   │   ├── How It Works (4 steps)
│   │   ├── Reviews Grid (3 reviews)
│   │   └── Sell CTA
│   │
│   ├── SearchPage
│   │   ├── Quick Tags Bar
│   │   ├── Filter Sidebar (9 collapsible sections)
│   │   ├── Results Bar (count, active pills, sort)
│   │   ├── Compare Banner (when cars selected)
│   │   ├── Card Grid
│   │   │   └── CarCard (×N, with compare toggle)
│   │   └── Load More Button
│   │
│   ├── CarDetailPage
│   │   ├── Image Gallery (main + thumbs + fullscreen)
│   │   ├── Quick Specs Strip (6 items)
│   │   ├── Overview Grid (12 data points)
│   │   ├── Specs Accordion (3 categories)
│   │   ├── Features Checklist (4 categories)
│   │   ├── Inspection Report (6 categories)
│   │   ├── EMI Calculator (3 sliders + result)
│   │   ├── Warranty Grid (4 items)
│   │   ├── VDP Sidebar (sticky: price, CTAs, contact)
│   │   ├── Similar Cars Grid
│   │   │   └── CarCard (×4)
│   │   ├── BookTestDriveModal (conditional)
│   │   └── ReserveCarModal (conditional)
│   │
│   ├── WishlistPage → CarCard (×N)
│   ├── AboutPage
│   ├── HowItWorksPage
│   ├── FAQPage
│   ├── ContactPage
│   └── AdminPage (Listings, Categories, Filters tabs)
│
├── SiteFooter (5-column layout)
└── MobileNav (bottom bar: Home, Search, Wishlist, Account)
```

---

## 11. API Reference

### Categories

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/categories` | List all vehicle categories |
| `POST` | `/api/categories` | Create a new category |
| `PUT` | `/api/categories/:id` | Update a category |
| `DELETE` | `/api/categories/:id` | Delete a category |

### Listings

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/listings` | Search cars with filters & sort |
| `GET` | `/api/listings/:id` | Get full details of one car |
| `POST` | `/api/listings` | Create a new listing |
| `PUT` | `/api/listings/:id` | Update a listing |
| `DELETE` | `/api/listings/:id` | Delete a listing |

### Filters

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/filter-definitions` | List all available filter types |
| `GET` | `/api/category-filters/:id` | Get filters for a category |
| `PUT` | `/api/category-filters/:id` | Update category-filter mapping |

### Uploads

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/uploads/image` | Upload a car photo |

### System

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | Server health check |

---

## 12. File & Folder Structure

```
searchanycars2/
│
├── CLAUDE.md                    ← Full product specification (775 lines)
├── README.md                    ← How to run the project
├── architecture.md              ← This file
│
└── searchanycars.com/           ← The application
    │
    ├── package.json              ← Dependencies & scripts
    ├── vite.config.ts            ← Build tool configuration
    ├── tsconfig.app.json         ← TypeScript settings (frontend)
    ├── tsconfig.node.json        ← TypeScript settings (Node)
    ├── eslint.config.js          ← Code quality rules
    ├── index.html                ← HTML shell (loads React)
    ├── .env.example              ← Environment variable template
    │
    ├── src/                      ← FRONTEND SOURCE CODE
    │   ├── main.tsx                 Entry point
    │   ├── App.tsx                  Route definitions
    │   ├── types.ts                 TypeScript interfaces
    │   ├── index.css                Design system (1400+ lines)
    │   ├── App.css                  (empty — merged into index.css)
    │   │
    │   ├── pages/                   9 page components
    │   │   ├── HomePage.tsx            260 lines
    │   │   ├── SearchPage.tsx          320 lines
    │   │   ├── CarDetailPage.tsx       380 lines
    │   │   ├── AdminPage.tsx           400 lines
    │   │   ├── WishlistPage.tsx        60 lines
    │   │   ├── AboutPage.tsx           50 lines
    │   │   ├── HowItWorksPage.tsx      70 lines
    │   │   ├── FAQPage.tsx             60 lines
    │   │   └── ContactPage.tsx         90 lines
    │   │
    │   ├── components/              7 reusable components
    │   │   ├── SiteHeader.tsx          50 lines
    │   │   ├── SiteFooter.tsx          70 lines
    │   │   ├── CarCard.tsx             110 lines
    │   │   ├── TrustBar.tsx            25 lines
    │   │   ├── MobileNav.tsx           25 lines
    │   │   ├── BookTestDriveModal.tsx   80 lines
    │   │   └── ReserveCarModal.tsx      90 lines
    │   │
    │   ├── api/
    │   │   └── client.ts            API communication (90 lines)
    │   │
    │   └── utils/
    │       └── format.ts            Currency & number formatting (40 lines)
    │
    ├── server/                   ← BACKEND SOURCE CODE
    │   ├── index.js                 API server (480 lines)
    │   ├── bootstrap.js             DB setup & seed data (1100 lines)
    │   ├── db.js                    Database connection (15 lines)
    │   └── storage.js               Image upload handler (35 lines)
    │
    ├── dist/                     ← PRODUCTION BUILD (generated)
    │   ├── index.html
    │   └── assets/
    │       ├── index-*.css          38 KB (design system)
    │       └── index-*.js           315 KB (app bundle)
    │
    ├── uploads/                  ← USER-UPLOADED IMAGES
    │   └── listings/
    │       └── {YYYY}/{MM}/         Organized by year/month
    │
    └── searchanycars.db          ← SQLite DATABASE FILE
```

---

## 13. Design System

### Color Palette

```
PRIMARY COLORS
──────────────────────────────────────────────
Navy Blue   ███████  #1A237E   Trust, authority
Navy Light  ███████  #283593   Hover states
Coral       ███████  #FF6B35   CTAs, highlights
Coral Dark  ███████  #E55A2B   Hover states

BACKGROUNDS
──────────────────────────────────────────────
White       ███████  #FFFFFF   Page background
Light Gray  ███████  #F5F5F5   Section backgrounds
Soft White  ███████  #FAFAFA   Subtle sections

TEXT
──────────────────────────────────────────────
Primary     ███████  #212121   Headings, body
Secondary   ███████  #757575   Descriptions
Muted       ███████  #9E9E9E   Hints, captions

STATUS
──────────────────────────────────────────────
Success     ███████  #4CAF50   Available, pass
Warning     ███████  #FF9800   Booked, attention
Error       ███████  #F44336   Sold, fail
Info        ███████  #2196F3   On-demand, links
```

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| **Headings** (h1-h6) | Poppins | 600-800 | 1.1rem - 3.2rem |
| **Body text** | Inter | 400-500 | 0.85rem - 1rem |
| **Prices** | Poppins | 700 | 1.2rem - 1.6rem |
| **Buttons** | Inter | 600 | 0.85rem - 1.05rem |
| **Small text** | Inter | 400-500 | 0.72rem - 0.82rem |

### Responsive Breakpoints

```
                  Mobile         Tablet         Desktop        Large
                320-767px      768-1023px     1024-1439px     1440px+
                ─────────      ──────────     ───────────     ──────
Car Grid:       1 column       2 columns      3 columns      3 columns
Body Types:     2 columns      3 columns      6 columns      6 columns
Brands:         2 columns      3 columns      5 columns      5 columns
Filter Panel:   Full width     Full width     280px sidebar  280px sidebar
VDP Layout:     Stacked        Stacked        2 columns      2 columns
Footer:         1 column       2 columns      5 columns      5 columns
Nav:            Hamburger      Hamburger      Horizontal     Horizontal
Bottom Nav:     Visible        Visible        Hidden         Hidden
Mobile CTA:     Visible        Visible        Hidden         Hidden
```

### Button System

| Class | Appearance | Usage |
|-------|-----------|-------|
| `.btn-primary` | Coral background, white text | Primary actions (Find Cars, Book Test Drive) |
| `.btn-secondary` | Navy background, white text | Secondary actions (Reserve, Compare) |
| `.btn-outline` | Navy border, transparent | Tertiary actions (Load More) |
| `.btn-ghost` | Light border, subtle | Cancel, minor actions |
| `.btn-whatsapp` | Green (#25D366) | WhatsApp contact |
| `.btn-sm` | Smaller padding | Inline actions |
| `.btn-lg` | Larger padding | Hero CTAs |

---

## 14. Security & Performance

### Current Security Measures

| Area | Status | Detail |
|------|--------|--------|
| CORS | ✅ Configured | Only allowed origins can call API |
| Input Validation | ✅ Basic | Required fields checked on create |
| File Upload Validation | ✅ Active | MIME type check, 6 MB size limit |
| SQL Injection | ✅ Protected | Parameterized queries throughout |
| JSON Size Limit | ✅ Active | 3 MB max request body |
| Authentication | ❌ Not implemented | Admin panel is publicly accessible |
| Rate Limiting | ❌ Not implemented | No request throttling |
| HTTPS | ❌ Not enforced | Depends on deployment |

### Performance Optimizations

| Optimization | Where | Impact |
|-------------|-------|--------|
| **Database indexes** | 8 key columns indexed | Fast search queries |
| **WAL mode** | SQLite configuration | Concurrent read/write |
| **Lazy image loading** | CarCard component | Faster initial page load |
| **Skeleton loaders** | Search, Home pages | Better perceived performance |
| **useCallback** | Search filter changes | Prevents unnecessary re-renders |
| **CSS-only animations** | Cards, modals | 60fps smooth transitions |
| **Gzipped bundle** | Vite build output | 7 KB CSS + 92 KB JS (compressed) |

### Production Bundle Size

| Asset | Raw Size | Gzipped |
|-------|----------|---------|
| CSS | 38.3 KB | 7.1 KB |
| JavaScript | 315 KB | 92.3 KB |
| HTML | 1.0 KB | 0.5 KB |
| **Total** | **354 KB** | **99.9 KB** |

---

## 15. Technology Stack

```
┌─────────────────────────────────────────────────────┐
│                   TECHNOLOGY STACK                    │
│                                                      │
│  FRONTEND                                            │
│  ─────────────────────────────────────────           │
│  React 19.2         UI Components & Pages            │
│  TypeScript 5.9     Type safety & IDE support        │
│  React Router 7     Client-side page navigation      │
│  Vite 8             Dev server & production build    │
│  CSS3               Custom design system             │
│  Inter + Poppins    Google Fonts typography           │
│                                                      │
│  BACKEND                                             │
│  ─────────────────────────────────────────           │
│  Node.js 24         JavaScript runtime               │
│  Express 5          HTTP server & routing             │
│  better-sqlite3     SQLite database driver            │
│  Multer 2           Multipart file upload parsing     │
│  CORS               Cross-origin request handling     │
│  dotenv             Environment variable loading      │
│                                                      │
│  DATABASE                                            │
│  ─────────────────────────────────────────           │
│  SQLite 3           Lightweight relational database   │
│                     Single-file, zero-configuration   │
│                     WAL mode for concurrent access    │
│                                                      │
│  DEV TOOLS                                           │
│  ─────────────────────────────────────────           │
│  ESLint 9           Code quality & style checking    │
│  Concurrently       Run frontend + backend together   │
└─────────────────────────────────────────────────────┘
```

### Why These Technologies?

| Choice | Reason |
|--------|--------|
| **React** | Component-based UI, largest ecosystem, excellent for SPAs |
| **TypeScript** | Catches bugs before they reach users, better IDE support |
| **Vite** | 10x faster builds than Webpack, instant hot reload |
| **Express** | Mature, minimal, flexible Node.js web framework |
| **SQLite** | Zero setup, single-file database, perfect for MVP/prototyping |
| **CSS (no framework)** | Full design control, smaller bundle, no dependency lock-in |

---

## 16. Glossary

| Term | Meaning |
|------|---------|
| **SPA** | Single Page Application — the entire app loads once, then navigates without full page reloads |
| **API** | Application Programming Interface — the endpoints the frontend calls to get data |
| **REST** | The architectural style of the API (GET for reading, POST for creating, etc.) |
| **Component** | A reusable piece of UI (e.g., a car card, a button, a modal) |
| **Route** | A URL path that maps to a specific page (e.g., `/search` → SearchPage) |
| **State** | Data that changes over time in the frontend (e.g., selected filters, form inputs) |
| **localStorage** | Browser storage that persists data between sessions (used for wishlist) |
| **Modal** | A popup dialog that appears over the page (e.g., test drive booking form) |
| **Skeleton Loader** | A grey placeholder animation shown while real content is loading |
| **EMI** | Equated Monthly Installment — the monthly payment for a car loan |
| **VDP** | Vehicle Detail Page — the full detail page for a single car |
| **WAL** | Write-Ahead Logging — a SQLite mode that allows reading while writing |
| **CORS** | Cross-Origin Resource Sharing — security mechanism for API access |
| **INR** | Indian Rupee (₹) — the currency used throughout the platform |
| **Lakh** | Indian number unit = 1,00,000 (100 thousand) |
| **Crore** | Indian number unit = 1,00,00,000 (10 million) |
| **SSR** | Server-Side Rendering — pre-rendering pages on the server (not used currently, recommended for production SEO) |
| **PWA** | Progressive Web App — web app that can be installed on phones (recommended for future) |

---

*This document was generated from a complete analysis of the SearchAnyCars.com codebase. Last updated: March 2026.*
