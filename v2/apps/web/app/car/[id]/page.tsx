import type { Metadata } from 'next';
import { CarDetailClient } from './CarDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function fetchListing(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/listings/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchSimilar(categoryId: number | null, excludeId: number) {
  try {
    const params = categoryId ? `?categoryId=${categoryId}&limit=4` : '?limit=4';
    const res = await fetch(`${API_BASE}/api/v1/listings${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
    return items.filter((c: Record<string, unknown>) => c.id !== excludeId).slice(0, 4);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const car = await fetchListing(id);
  if (!car) return { title: 'Car Not Found' };

  const price = car.listingPriceInr ?? 0;
  const fuel = car.fuelType ?? '';
  const trans = car.transmissionType ?? '';
  const city = car.locationCity ?? '';
  const km = car.totalKmDriven ?? 0;

  const title = `${car.title} — ₹${(price / 100000).toFixed(2)} Lakh`;
  const desc = `Buy ${car.title} in ${city || 'India'}. ${km ? (km / 1000).toFixed(0) + 'k km driven' : ''}, ${fuel}, ${trans}. Certified with quality inspection. 1-year warranty included.`;

  return {
    title,
    description: desc,
    openGraph: {
      title, description: desc,
      url: `${SITE_URL}/car/${id}`,
      siteName: 'SearchAnyCars', type: 'website', locale: 'en_IN',
      images: car.images?.length > 0 ? [{ url: car.images[0], width: 1200, height: 630, alt: car.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title, description: desc,
      images: car.images?.[0] ? [car.images[0]] : [],
    },
    alternates: { canonical: `${SITE_URL}/car/${id}` },
  };
}

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await fetchListing(id);
  const similarCars = listing
    ? await fetchSimilar(listing.categoryId ?? null, listing.id)
    : [];

  return (
    <>
      {listing && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Vehicle',
            name: listing.title,
            brand: { '@type': 'Brand', name: listing.brand },
            model: listing.model,
            modelDate: String(listing.modelYear),
            vehicleModelDate: String(listing.modelYear),
            mileageFromOdometer: { '@type': 'QuantitativeValue', value: listing.totalKmDriven, unitCode: 'KMT' },
            fuelType: listing.fuelType,
            vehicleTransmission: listing.transmissionType,
            color: listing.exteriorColor,
            vehicleInteriorColor: listing.interiorColor,
            numberOfDoors: 4,
            vehicleConfiguration: listing.variant || undefined,
            offers: {
              '@type': 'Offer',
              price: listing.listingPriceInr,
              priceCurrency: 'INR',
              availability: listing.listingStatus === 'Active' ? 'https://schema.org/InStock' : listing.listingStatus === 'Reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/SoldOut',
              itemCondition: listing.isNewCar ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
              seller: { '@type': 'Organization', name: 'SearchAnyCars', url: SITE_URL },
            },
            image: listing.images || [],
            url: `${SITE_URL}/car/${listing.id}`,
          }) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Used Cars', item: `${SITE_URL}/search` },
              { '@type': 'ListItem', position: 3, name: listing.title, item: `${SITE_URL}/car/${listing.id}` },
            ],
          }) }} />
        </>
      )}
      <CarDetailClient listing={listing} similarCars={similarCars} />
    </>
  );
}
