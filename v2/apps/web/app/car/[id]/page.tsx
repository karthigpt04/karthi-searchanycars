import type { Metadata } from 'next';
import { formatINR, formatKM } from '../../../src/utils/format';
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
  const listing = await fetchListing(id);
  if (!listing) return { title: 'Car Not Found — SearchAnyCars' };

  const price = listing.listingPriceInr ?? listing.listing_price_inr ?? 0;
  const km = listing.totalKmDriven ?? listing.total_km_driven ?? 0;
  const fuel = listing.fuelType ?? listing.fuel_type ?? '';
  const trans = listing.transmissionType ?? listing.transmission_type ?? '';
  const owner = listing.ownershipType ?? listing.ownership_type ?? '';
  const city = listing.locationCity ?? listing.location_city ?? '';

  return {
    title: `${listing.title} - ${formatINR(price)} | SearchAnyCars`,
    description: `Buy ${listing.title} in ${city}. ${formatKM(km)} driven, ${fuel}, ${trans}. ${owner} owner.`,
    openGraph: {
      images: listing.images?.[0] ? [listing.images[0]] : [],
    },
  };
}

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await fetchListing(id);
  const similarCars = listing
    ? await fetchSimilar(listing.categoryId ?? listing.category_id ?? null, listing.id)
    : [];

  return <CarDetailClient listing={listing} similarCars={similarCars} />;
}
