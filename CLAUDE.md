# CLAUDE.md — Step 10: SEO Optimization

## Project context

You are continuing the **SearchAnyCars.com v2** rebuild. Steps 01-09 are complete — the entire app works locally. This step focuses ONLY on **SEO** — making the site discoverable by Google, Bing, and social media platforms.

The old codebase at `/searchanycars.com/` is READ-ONLY reference. All changes go in `v2/apps/web/`.

---

## Why this matters

SearchAnyCars is a car marketplace. The majority of traffic will come from Google searches like:
- "used Hyundai Creta Delhi"
- "second hand Honda City under 10 lakhs"
- "certified used cars Bengaluru"
- "used SUV automatic Pune"

If car detail pages and search pages don't have proper SEO, no one finds the site. This step is the difference between a website and a business.

---

## What you are building

### 1. Dynamic meta tags for every page
### 2. JSON-LD structured data (Organization, Vehicle, FAQPage, BreadcrumbList)
### 3. Dynamic sitemap.xml
### 4. robots.txt
### 5. Canonical URLs
### 6. Open Graph + Twitter Card tags
### 7. Favicon and app icons

---

## Part 1: Meta tags for every page

Add or update the `metadata` export in every page file. Use Next.js Metadata API.

### Homepage (`app/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'SearchAnyCars — Buy Certified Used Cars in India | Pre-Owned Cars with Warranty',
  description: 'Find 12,000+ quality-inspected used cars with warranty, easy financing, and doorstep delivery across India. Browse Hyundai, Maruti Suzuki, Tata, Honda, Kia, Mahindra & more.',
  keywords: ['used cars India', 'second hand cars', 'certified pre-owned cars', 'buy used car online', 'used car warranty', 'SearchAnyCars'],
  openGraph: {
    title: 'SearchAnyCars — Premium Certified Used Cars in India',
    description: 'Find certified pre-owned cars from trusted dealers across India. 200+ point inspection, 1-year warranty, 7-day money back guarantee.',
    url: 'https://searchanycars.com',
    siteName: 'SearchAnyCars',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SearchAnyCars — Premium Used Cars in India',
    description: 'Find certified pre-owned cars from trusted dealers across India.',
  },
  alternates: {
    canonical: 'https://searchanycars.com',
  },
}
```

### Car detail page (`app/car/[id]/page.tsx`)

This is the MOST important page for SEO — each car listing should be a rich result in Google.

Dynamic metadata using `generateMetadata`:
```typescript
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const car = await fetchListing(id);

  if (!car) {
    return { title: 'Car Not Found | SearchAnyCars' };
  }

  const title = `${car.title} — ${formatINR(car.listingPriceInr)} | SearchAnyCars`;
  const description = `Buy ${car.title} in ${car.locationCity || 'India'}. ${car.totalKmDriven ? formatKM(car.totalKmDriven) + ' driven' : ''}, ${car.fuelType || ''}, ${car.transmissionType || ''}. ${car.ownershipType ? car.ownershipType + ' owner' : ''}. Certified with ${car.inspectionScore ? car.inspectionScore + '/100 inspection score' : 'quality inspection'}. 1-year warranty included.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://searchanycars.com/car/${id}`,
      siteName: 'SearchAnyCars',
      type: 'website',
      locale: 'en_IN',
      images: car.images?.length > 0
        ? [{ url: car.images[0], width: 1200, height: 630, alt: car.title }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${car.title} — ${formatINR(car.listingPriceInr)}`,
      description,
      images: car.images?.[0] ? [car.images[0]] : [],
    },
    alternates: {
      canonical: `https://searchanycars.com/car/${id}`,
    },
  };
}
```

### Search page (`app/search/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'Search Used Cars — Browse by Brand, Budget, City | SearchAnyCars',
  description: 'Search and compare 12,000+ used cars across India. Filter by brand, budget, fuel type, transmission, city. All cars quality-inspected with 1-year warranty.',
  alternates: { canonical: 'https://searchanycars.com/search' },
}
```

### S-Plus page (`app/splus/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'S-Plus Premium Pre-Owned Cars — Luxury Collection | SearchAnyCars',
  description: 'Handpicked premium pre-owned luxury cars. BMW, Mercedes-Benz, Audi, Jaguar, Porsche & more. 300-point inspection, 2-year warranty, white-glove delivery.',
  alternates: { canonical: 'https://searchanycars.com/splus' },
}
```

### S-Plus New (`app/splus-new/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'S-Plus New — Brand New Unregistered Cars | SearchAnyCars',
  description: 'Premium unregistered, unused, and demo cars from authorized dealers. Full manufacturer warranty. Your name first on the RC. Factory-fresh condition.',
  alternates: { canonical: 'https://searchanycars.com/splus-new' },
}
```

### Sell page (`app/sell/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'Sell Your Car — Get Best Price | SearchAnyCars',
  description: 'Sell your car at the best price. Free listing, instant valuation, verified buyers across India. No middleman, no hassle.',
  alternates: { canonical: 'https://searchanycars.com/sell' },
}
```

### About page (`app/about/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'About SearchAnyCars — India\'s Trusted Used Car Platform',
  description: 'SearchAnyCars is India\'s most trusted used car marketplace. Quality-inspected cars with warranty, money-back guarantee, and free RC transfer.',
  alternates: { canonical: 'https://searchanycars.com/about' },
}
```

### How It Works (`app/how-it-works/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'How It Works — Buy a Used Car in 4 Simple Steps | SearchAnyCars',
  description: 'Browse certified cars, book a free test drive, reserve with a refundable deposit, and get doorstep delivery. We handle RC transfer and insurance.',
  alternates: { canonical: 'https://searchanycars.com/how-it-works' },
}
```

### FAQ page (`app/faq/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'Frequently Asked Questions — SearchAnyCars',
  description: 'Common questions about buying used cars on SearchAnyCars. Warranty, inspection, financing, return policy, RC transfer, and more.',
  alternates: { canonical: 'https://searchanycars.com/faq' },
}
```

### Contact page (`app/contact/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'Contact Us — SearchAnyCars',
  description: 'Get in touch with SearchAnyCars. Call, WhatsApp, or email us for any queries about buying or selling used cars in India.',
  alternates: { canonical: 'https://searchanycars.com/contact' },
}
```

### Login page (`app/login/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'Sign In | SearchAnyCars',
  description: 'Sign in to your SearchAnyCars account to manage bookings, wishlist, and more.',
  robots: { index: false, follow: false },
}
```

### Wishlist page (`app/wishlist/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'My Wishlist | SearchAnyCars',
  robots: { index: false, follow: false },
}
```

### My Bookings page (`app/my-bookings/page.tsx`)
```typescript
export const metadata: Metadata = {
  title: 'My Bookings | SearchAnyCars',
  robots: { index: false, follow: false },
}
```

### Password pages (forgot, reset, change)
```typescript
// All should have:
robots: { index: false, follow: false },
```

---

## Part 2: JSON-LD Structured Data

### Homepage — Organization + WebSite schema

Add to the homepage page component (inside the JSX, at the top of `<main>`):

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SearchAnyCars',
      url: 'https://searchanycars.com',
      logo: 'https://searchanycars.com/icon.png',
      description: 'India\'s most trusted used car marketplace. Quality-inspected cars with warranty and money-back guarantee.',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91-98765-43210',
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi'],
      },
      sameAs: [],
    }),
  }}
/>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'SearchAnyCars',
      url: 'https://searchanycars.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://searchanycars.com/search?search={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    }),
  }}
/>
```

### Car detail page — Vehicle + BreadcrumbList schema

Add to the car detail page component:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Vehicle',
      name: car.title,
      brand: { '@type': 'Brand', name: car.brand },
      model: car.model,
      modelDate: String(car.modelYear),
      vehicleModelDate: String(car.modelYear),
      mileageFromOdometer: {
        '@type': 'QuantitativeValue',
        value: car.totalKmDriven,
        unitCode: 'KMT',
      },
      fuelType: car.fuelType,
      vehicleTransmission: car.transmissionType,
      color: car.exteriorColor,
      vehicleInteriorColor: car.interiorColor,
      numberOfDoors: 4,
      vehicleConfiguration: car.variant || undefined,
      offers: {
        '@type': 'Offer',
        price: car.listingPriceInr,
        priceCurrency: 'INR',
        availability: car.listingStatus === 'Active'
          ? 'https://schema.org/InStock'
          : car.listingStatus === 'Reserved'
          ? 'https://schema.org/LimitedAvailability'
          : 'https://schema.org/SoldOut',
        itemCondition: 'https://schema.org/UsedCondition',
        seller: {
          '@type': 'Organization',
          name: 'SearchAnyCars',
          url: 'https://searchanycars.com',
        },
      },
      image: car.images || [],
      url: `https://searchanycars.com/car/${car.id}`,
    }),
  }}
/>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://searchanycars.com' },
        { '@type': 'ListItem', position: 2, name: 'Used Cars', item: 'https://searchanycars.com/search' },
        { '@type': 'ListItem', position: 3, name: car.title, item: `https://searchanycars.com/car/${car.id}` },
      ],
    }),
  }}
/>
```

### FAQ page — FAQPage schema

Add to the FAQ page component. This enables Google to show expandable Q&A directly in search results:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    }),
  }}
/>
```

If the FAQ data is hardcoded in the component, extract it into a data array so you can map it for both the UI rendering and the JSON-LD schema.

### Search page — ItemList schema (for search result rich snippets)

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Used Cars for Sale',
      url: 'https://searchanycars.com/search',
      numberOfItems: cars.length,
      itemListElement: cars.slice(0, 10).map((car, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://searchanycars.com/car/${car.id}`,
        name: car.title,
      })),
    }),
  }}
/>
```

---

## Part 3: Sitemap

Create `v2/apps/web/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SITE_URL = 'https://searchanycars.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/splus`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/splus-new`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/sell`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/how-it-works`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Dynamic car listing pages — fetch all active listings from API
  let carPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/api/v1/listings?limit=5000&listingStatus=Active`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const listings = data.data || data;
      carPages = listings.map((car: { id: number; updatedAt?: string; updated_at?: string }) => ({
        url: `${SITE_URL}/car/${car.id}`,
        lastModified: car.updatedAt || car.updated_at ? new Date(car.updatedAt || car.updated_at!) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch {
    // API unavailable during build — skip dynamic pages silently
  }

  // Brand-specific search pages (for SEO — Google indexes brand searches)
  const topBrands = [
    'Maruti Suzuki', 'Hyundai', 'Tata', 'Honda', 'Kia', 'Mahindra',
    'Toyota', 'Volkswagen', 'Skoda', 'BMW', 'Mercedes-Benz', 'Audi',
  ];
  const brandPages: MetadataRoute.Sitemap = topBrands.map((brand) => ({
    url: `${SITE_URL}/search?brand=${encodeURIComponent(brand)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // City-specific search pages
  const topCities = [
    'New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad',
    'Pune', 'Ahmedabad', 'Jaipur', 'Kolkata', 'Kochi',
  ];
  const cityPages: MetadataRoute.Sitemap = topCities.map((city) => ({
    url: `${SITE_URL}/search?location_city=${encodeURIComponent(city)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...carPages, ...brandPages, ...cityPages];
}
```

This sitemap includes:
- 9 static pages
- Every active car listing (dynamic)
- 12 brand-specific search URLs (so Google indexes "used Hyundai cars" etc.)
- 10 city-specific search URLs (so Google indexes "used cars Delhi" etc.)

---

## Part 4: Robots.txt

Create `v2/apps/web/app/robots.ts`:

```typescript
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/login',
          '/forgot-password',
          '/reset-password',
          '/change-password',
          '/my-bookings',
        ],
      },
    ],
    sitemap: 'https://searchanycars.com/sitemap.xml',
  };
}
```

---

## Part 5: Root layout metadata base

Update `v2/apps/web/app/layout.tsx` — ensure `metadataBase` is set:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://searchanycars.com'),
  title: {
    default: 'SearchAnyCars — Buy Certified Used Cars in India',
    template: '%s | SearchAnyCars',
  },
  description: 'Find certified pre-owned cars from trusted dealers across India. 200+ point inspection, 1-year warranty, 7-day money back guarantee.',
  keywords: ['used cars', 'second hand cars', 'India', 'buy car online', 'certified pre-owned', 'used car warranty'],
  authors: [{ name: 'SearchAnyCars' }],
  creator: 'SearchAnyCars',
  publisher: 'SearchAnyCars',
  formatDetection: { telephone: true, email: true },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'SearchAnyCars',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@searchanycars',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}
```

---

## Part 6: Favicon and App Icons

### Dynamic favicon (`v2/apps/web/app/icon.tsx`)

```tsx
import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          background: '#1A237E',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: 6,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
```

### Apple touch icon (`v2/apps/web/app/apple-icon.tsx`)

```tsx
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 96,
          background: '#1A237E',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: 32,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
```

---

## Part 7: Error and Loading pages

### Global error boundary (`v2/apps/web/app/error.tsx`)

```tsx
'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="section">
      <div className="container">
        <div className="empty-state">
          <h2>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button className="btn btn-primary" onClick={reset} style={{ marginTop: '1rem' }}>
            Try Again
          </button>
        </div>
      </div>
    </main>
  );
}
```

### Global loading state (`v2/apps/web/app/loading.tsx`)

```tsx
export default function Loading() {
  return (
    <main className="section">
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <div className="skeleton" style={{ width: 200, height: 24, margin: '0 auto 1rem', borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 300, height: 16, margin: '0 auto', borderRadius: 8 }} />
      </div>
    </main>
  );
}
```

---

## Success criteria

1. `pnpm build` — zero errors
2. **Homepage** view-source: contains `<title>SearchAnyCars — Buy Certified Used Cars in India`, Organization JSON-LD, WebSite JSON-LD with SearchAction
3. **Car detail** `/car/1` view-source: contains dynamic `<title>` with car name + price, Vehicle JSON-LD with brand/model/price/mileage, BreadcrumbList JSON-LD, OG image tag
4. **FAQ** view-source: contains FAQPage JSON-LD
5. **Search** view-source: contains ItemList JSON-LD
6. `/sitemap.xml` returns valid XML with static pages + dynamic car listings + brand URLs + city URLs
7. `/robots.txt` blocks /admin/, /api/, auth pages. References sitemap.
8. Favicon shows navy "S" in browser tab
9. Private pages (login, bookings, wishlist, password pages) have `robots: noindex, nofollow`
10. All public pages have canonical URL set
11. OG tags present on homepage, car detail, search, splus pages
12. `/searchanycars.com/` untouched

---

## What NOT to do

- Do NOT add deployment configs (that's step 11)
- Do NOT add analytics or tracking scripts
- Do NOT modify backend API
- Do NOT modify `/searchanycars.com/`
- Do NOT modify page content or styling — only add metadata, JSON-LD, and the small utility files (sitemap, robots, icons, error, loading)