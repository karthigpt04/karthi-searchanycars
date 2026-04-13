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
  listingPriceInr?: number;
  totalKmDriven?: number;
  fuelType?: string;
  transmissionType?: string;
  ownershipType?: string;
  locationCity?: string;
  registrationCity?: string;
  images?: string[];
  featuredListing?: boolean;
  isSplus?: boolean;
  isNewCar?: boolean;
  listingStatus?: string;
  viewsCount?: number;
  createdAt?: string;
  slug?: string | null;
}

interface CarCardProps {
  car: Listing;
  isWishlisted?: boolean;
  onToggleWishlist?: (id: number) => void;
}

export const CarCard = ({ car, isWishlisted = false, onToggleWishlist }: CarCardProps) => {
  const price = car.listingPriceInr ?? 0;
  const monthlyEMI =
    price > 0
      ? calculateMonthlyPayment(price * DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE, DEFAULT_TENURE_MONTHS)
      : 0;
  const kmDriven = car.totalKmDriven ?? 0;
  const isLowKM = kmDriven < LOW_KM_THRESHOLD && kmDriven > 0;
  const createdAt = car.createdAt;
  const isNew = createdAt
    ? new Date().getTime() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false;
  const images = car.images ?? [];
  const heroImage = images[0] ?? PLACEHOLDER_CAR_IMAGE;
  const fuelType = car.fuelType;
  const transmissionType = car.transmissionType;
  const ownershipType = car.ownershipType;
  const locationCity = car.locationCity ?? car.registrationCity;
  const featured = car.featuredListing;
  const isSplus = car.isSplus;
  const isNewCar = car.isNewCar;
  const listingStatus = car.listingStatus ?? 'Active';
  const viewsCount = car.viewsCount ?? 0;
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
