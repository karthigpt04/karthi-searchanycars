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
