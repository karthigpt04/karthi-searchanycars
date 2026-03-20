# SearchAnyCars.com

India's most trusted used car broker platform. Browse 12,000+ quality-inspected used cars with warranty, easy financing, and doorstep delivery.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express 5
- **Database**: SQLite (via better-sqlite3)
- **Styling**: Custom CSS (no framework)

## Prerequisites

- Node.js 18+ (tested on v24)
- npm 9+

## Quick Start

```bash
cd searchanycars.com
npm install
npm run dev:full
```

This starts both the backend API (port 4000) and the Vite dev server (port 5173) concurrently.

Open **http://localhost:5173** in your browser.

## Run Individually

```bash
# Backend only (API + serves production build)
npm run server

# Frontend dev server only (hot reload)
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

After building, `npm start` serves both the API and the built frontend on **http://localhost:4000**.

## Environment Variables

Copy `.env.example` to `.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend server port |
| `VITE_API_URL` | `http://localhost:4000/api` | API base URL for frontend |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `DATABASE_PATH` | `./searchanycars.db` | SQLite database file path |
| `UPLOADS_DIR` | `./uploads` | Image upload directory |
| `MAX_IMAGE_SIZE_BYTES` | `6291456` | Max upload size (6 MB) |

## Project Structure

```
searchanycars.com/
├── src/                    # Frontend (React + TypeScript)
│   ├── pages/              # Page components
│   │   ├── HomePage.tsx        # Hero, search, browse sections
│   │   ├── SearchPage.tsx      # Filters, listing grid, sort
│   │   ├── CarDetailPage.tsx   # Gallery, specs, EMI calc, booking
│   │   ├── AboutPage.tsx
│   │   ├── HowItWorksPage.tsx
│   │   ├── FAQPage.tsx
│   │   ├── ContactPage.tsx
│   │   ├── WishlistPage.tsx
│   │   └── AdminPage.tsx
│   ├── components/         # Reusable components
│   │   ├── SiteHeader.tsx
│   │   ├── SiteFooter.tsx
│   │   ├── CarCard.tsx
│   │   ├── TrustBar.tsx
│   │   ├── MobileNav.tsx
│   │   ├── BookTestDriveModal.tsx
│   │   └── ReserveCarModal.tsx
│   ├── api/client.ts       # Type-safe API client
│   ├── utils/format.ts     # INR formatting, EMI calculation
│   ├── types.ts            # TypeScript interfaces
│   ├── App.tsx             # Router setup
│   ├── index.css           # Design system (navy + coral)
│   └── main.tsx            # Entry point
├── server/                 # Backend (Express + SQLite)
│   ├── index.js            # API routes
│   ├── bootstrap.js        # DB schema + 15 sample listings
│   ├── db.js               # SQLite connection
│   └── storage.js          # Image upload handler
├── package.json
├── vite.config.ts
└── tsconfig.app.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/categories` | List all categories |
| `GET` | `/api/listings` | Search listings (supports filters & sort) |
| `GET` | `/api/listings/:id` | Get single listing |
| `POST` | `/api/listings` | Create listing |
| `PUT` | `/api/listings/:id` | Update listing |
| `DELETE` | `/api/listings/:id` | Delete listing |
| `POST` | `/api/uploads/image` | Upload image |

### Listing Search Parameters

`GET /api/listings?brand=Hyundai&fuel_type=Petrol&listing_price_max=1500000&sortBy=priceAsc`

Supported filters: `search`, `categoryId`, `brand`, `fuel_type`, `transmission_type`, `ownership_type`, `seller_type`, `location_city`, `model_year_min`, `model_year_max`, `listing_price_min`, `listing_price_max`, `total_km_driven_max`

Sort options: `latest` (default), `priceAsc`, `priceDesc`

## Sample Data

The database auto-seeds on first run with:
- 8 vehicle categories
- 13 filter definitions
- 15 Indian car listings across 12 brands and 9 cities (₹3.8L – ₹52L)

Delete `searchanycars.db` to reset and re-seed.
