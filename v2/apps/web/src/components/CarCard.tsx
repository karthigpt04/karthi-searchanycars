'use client';

import Link from 'next/link';
import {
  formatINR,
  formatKM,
  calculateMonthlyPayment,
  PLACEHOLDER_CAR_IMAGE,
  DEFAULT_LOAN_PERCENT,
  DEFAULT_INTEREST_RATE,
  DEFAULT_TENURE_MONTHS,
  LOW_KM_THRESHOLD,
  carUrl,
} from '../utils/format';

interface Listing {
  id: number;
  title: string;
  listing_price_inr?: number;
  listingPriceInr?: number;
  total_km_driven?: number;
  totalKmDriven?: number;
  fuel_type?: string;
  fuelType?: string;
  transmission_type?: string;
  transmissionType?: string;
  ownership_type?: string;
  ownershipType?: string;
  location_city?: string;
  locationCity?: string;
  registration_city?: string;
  registrationCity?: string;
  images?: string[];
  featured_listing?: boolean;
  featuredListing?: boolean;
  is_splus?: boolean;
  isSplus?: boolean;
  is_new_car?: boolean;
  isNewCar?: boolean;
  listing_status?: string;
  listingStatus?: string;
  views_count?: number;
  viewsCount?: number;
  created_at?: string;
  createdAt?: string;
  slug?: string | null;
}

interface CarCardProps {
  car: Listing;
  isWishlisted?: boolean;
  onToggleWishlist?: (id: number) => void;
}

export const CarCard = ({ car, isWishlisted = false, onToggleWishlist }: CarCardProps) => {
  const price = car.listing_price_inr ?? car.listingPriceInr ?? 0;
  const monthlyEMI =
    price > 0
      ? calculateMonthlyPayment(price * DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE, DEFAULT_TENURE_MONTHS)
      : 0;
  const kmDriven = car.total_km_driven ?? car.totalKmDriven ?? 0;
  const isLowKM = kmDriven < LOW_KM_THRESHOLD && kmDriven > 0;
  const createdAt = car.created_at ?? car.createdAt;
  const isNew = createdAt
    ? new Date().getTime() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false;
  const images = car.images ?? [];
  const heroImage = images[0] ?? PLACEHOLDER_CAR_IMAGE;
  const fuelType = car.fuel_type ?? car.fuelType;
  const transmissionType = car.transmission_type ?? car.transmissionType;
  const ownershipType = car.ownership_type ?? car.ownershipType;
  const locationCity = car.location_city ?? car.locationCity ?? car.registration_city ?? car.registrationCity;
  const featured = car.featured_listing ?? car.featuredListing;
  const isSplus = car.is_splus ?? car.isSplus;
  const isNewCar = car.is_new_car ?? car.isNewCar;
  const listingStatus = car.listing_status ?? car.listingStatus ?? 'Active';
  const viewsCount = car.views_count ?? car.viewsCount ?? 0;
  const url = carUrl(car);

  return (
    <article className="car-card">
      <div className="car-image-wrap">
        <Link href={url} style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%', height: '100%' }}>
          <img src={heroImage} alt={car.title} className="car-image" loading="lazy" />
        </Link>
        <div className="car-badge-row">
          {featured ? <span className="badge badge-coral">Featured</span> : null}
          {fuelType === 'Electric' ? <span className="badge badge-green">EV</span> : null}
          {fuelType === 'Hybrid' ? <span className="badge badge-green">Hybrid</span> : null}
          {isSplus ? <span className="badge badge-splus">S-Plus</span> : null}
          {isNewCar ? <span className="badge badge-spn">New Car</span> : null}
        </div>
        {images.length > 0 && (
          <span className="car-image-count">📷 {images.length} photos</span>
        )}
        <button
          className={`car-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={() => onToggleWishlist?.(car.id)}
          type="button"
          aria-label={
            isWishlisted
              ? `Remove ${car.title} from wishlist`
              : `Add ${car.title} to wishlist`
          }
        >
          {isWishlisted ? '❤️' : '♡'}
        </button>
      </div>

      <div className="car-content">
        <Link href={url} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="car-title">{car.title}</h3>
        </Link>
        <div className="car-price-row">
          <span className="car-price">{formatINR(price)}</span>
          {monthlyEMI > 0 && (
            <span className="car-emi">EMI from {formatINR(monthlyEMI)}/mo</span>
          )}
        </div>
        <div className="car-specs-row">
          <span>{formatKM(kmDriven)}</span>
          <span className="dot" />
          <span>{fuelType ?? '—'}</span>
          <span className="dot" />
          <span>{transmissionType ?? '—'}</span>
          <span className="dot" />
          <span>{ownershipType ? `${ownershipType} Owner` : '—'}</span>
        </div>
        <div className="car-location">📍 {locationCity ?? '—'}</div>
        <div className="car-tag-row">
          <span className="car-tag car-tag-assured">SearchAnyCars Assured ✓</span>
          {isLowKM && <span className="car-tag car-tag-low-km">Low KM</span>}
          {isNew && <span className="car-tag car-tag-new">Newly Added</span>}
          {ownershipType === 'First' && (
            <span className="car-tag car-tag-low-km">Single Owner</span>
          )}
        </div>
        {viewsCount > 200 && (
          <div className="car-popularity">🔥 {viewsCount} people viewed</div>
        )}
      </div>

      <div className="car-footer">
        <div
          className={`car-status ${
            listingStatus === 'Active'
              ? 'car-status-available'
              : listingStatus === 'Reserved'
                ? 'car-status-booked'
                : listingStatus === 'Sold'
                  ? 'car-status-sold'
                  : 'car-status-ondemand'
          }`}
        >
          <span className="status-dot" />
          {listingStatus === 'Active' ? 'Available' : listingStatus}
        </div>
        <Link href={url} className="btn btn-primary btn-sm">
          View
        </Link>
      </div>
    </article>
  );
};
