# SearchAnyCars.com Info

## Goal
Build a production-style used-car listing platform for SearchAnyCars.com:

- Real database persistence
- Search page with category-aware filters
- Admin panel for managing listings and categories

## Final Architecture

### Frontend
- React + TypeScript + Vite
- Routes:
  - `/` Home
  - `/search` Search listings
  - `/car/:id` Listing detail
  - `/admin` Admin management

### Backend
- Express API in `server/index.js`
- SQLite database in `data/searchanycars.db` for local dev
- DB bootstrap and seed logic in `server/bootstrap.js`

### Media Storage
- Admin image uploads are handled by backend endpoint `POST /api/uploads/image`
- Files are stored under `public/uploads/listings/<year>/<month>/...`

## Database Design Decisions

A normalized + extensible model was implemented:

1. `categories`
- Vehicle categories (Hatchback, Sedan, SUV, MUV, Coupe, Pickup, Van)
- Includes slug and vehicle type

2. `filter_definitions`
- Master list of available filters (brand, fuel type, transmission, owner type, price range, year range, km, city)

3. `category_filter_map`
- Mapping table that defines which filters are active for each category
- Enables category-specific search controls

4. `listings`
- Main listing table with broad schema based on your reference sections:
  - Vehicle identity
  - Pricing (INR)
  - Ownership
  - Registration/legal
  - Usage/mileage
  - Engine/performance
  - Fuel/battery
  - Condition
  - Service/maintenance
  - Safety
  - Comfort/interior
  - Infotainment
  - Exterior
  - Wheels/tires
  - Location/logistics
  - Seller info
  - Inspection/metadata
- Media stored as JSON arrays (`images_json`, etc.)
- `specs_json` included for extensible custom fields

## Admin Functionalities Implemented (`/admin`)

### Listings Tab
- Create listing
- Edit listing
- Delete listing
- Set category, pricing, drivetrain/fuel basics, status, media URLs

### Categories Tab
- Create category
- Delete category

### Category Filters Tab
- Select category
- Enable/disable filter definitions for that category
- Save mapping to DB

## Search Behavior

Search page pulls data from backend and supports:

- Category selection
- Dynamic filter rendering based on selected category mapping
- Query filters to API (brand, fuel, transmission, owner/seller, location, year range, price range, km range)
- Sorting

## Home Page Behavior

- Shows featured listings from DB
- Quick ad form creates a draft listing directly in database

## Car Detail Page Behavior

- Loads listing from DB by ID
- Gallery + specs + EMI estimator
- Similar cars from same category

## API Endpoints

- `GET /api/health`
- `POST /api/uploads/image` (multipart field: `image`)
- `GET/POST/PUT/DELETE /api/categories`
- `GET /api/filter-definitions`
- `GET /api/category-filters/:categoryId`
- `PUT /api/category-filters/:categoryId`
- `GET/POST/PUT/DELETE /api/listings`
- `GET /api/listings/:id`

## Key Implementation Notes

- INR pricing is used across search/admin/display data.
- SQLite bootstraps schema and sample data automatically.
- Category-filter mapping controls what filter UI appears in search, ensuring consistency between admin definitions and user-facing filters.
- Admin listing form supports direct image file upload and stores resulting image URLs in listing records.
