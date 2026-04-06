import type { Metadata } from 'next';
import { CarDetailClient } from './CarDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  const price = car.listingPriceInr ?? car.listing_price_inr ?? 0;
  const fuel = car.fuelType ?? car.fuel_type ?? '';
  const trans = car.transmissionType ?? car.transmission_type ?? '';
  const city = car.locationCity ?? car.location_city ?? '';
  const km = car.totalKmDriven ?? car.total_km_driven ?? 0;

  const title = `${car.title} — ₹${(price / 100000).toFixed(2)} Lakh`;
  const desc = `Buy ${car.title} in ${city || 'India'}. ${km ? (km / 1000).toFixed(0) + 'k km driven' : ''}, ${fuel}, ${trans}. Certified with quality inspection. 1-year warranty included.`;

  return {
    title,
    description: desc,
    openGraph: {
      title, description: desc,
      url: `https://searchanycars.com/car/${id}`,
      siteName: 'SearchAnyCars', type: 'website', locale: 'en_IN',
      images: car.images?.length > 0 ? [{ url: car.images[0], width: 1200, height: 630, alt: car.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title, description: desc,
      images: car.images?.[0] ? [car.images[0]] : [],
    },
    alternates: { canonical: `https://searchanycars.com/car/${id}` },
  };
}

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await fetchListing(id);
  const similarCars = listing
    ? await fetchSimilar(listing.categoryId ?? listing.category_id ?? null, listing.id)
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
            modelDate: String(listing.modelYear ?? listing.model_year),
            vehicleModelDate: String(listing.modelYear ?? listing.model_year),
            mileageFromOdometer: { '@type': 'QuantitativeValue', value: listing.totalKmDriven ?? listing.total_km_driven, unitCode: 'KMT' },
            fuelType: listing.fuelType ?? listing.fuel_type,
            vehicleTransmission: listing.transmissionType ?? listing.transmission_type,
            color: listing.exteriorColor ?? listing.exterior_color,
            vehicleInteriorColor: listing.interiorColor ?? listing.interior_color,
            numberOfDoors: 4,
            vehicleConfiguration: listing.variant || undefined,
            offers: {
              '@type': 'Offer',
              price: listing.listingPriceInr ?? listing.listing_price_inr,
              priceCurrency: 'INR',
              availability: (listing.listingStatus ?? listing.listing_status) === 'Active' ? 'https://schema.org/InStock' : (listing.listingStatus ?? listing.listing_status) === 'Reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/SoldOut',
              itemCondition: (listing.isNewCar ?? listing.is_new_car) ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
              seller: { '@type': 'Organization', name: 'SearchAnyCars', url: 'https://searchanycars.com' },
            },
            image: listing.images || [],
            url: `https://searchanycars.com/car/${listing.id}`,
          }) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://searchanycars.com' },
              { '@type': 'ListItem', position: 2, name: 'Used Cars', item: 'https://searchanycars.com/search' },
              { '@type': 'ListItem', position: 3, name: listing.title, item: `https://searchanycars.com/car/${listing.id}` },
            ],
          }) }} />
        </>
      )}
      <CarDetailClient listing={listing} similarCars={similarCars} />
    </>
  );
}
