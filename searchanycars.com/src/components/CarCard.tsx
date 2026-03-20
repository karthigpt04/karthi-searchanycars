import { Link } from 'react-router-dom'
import type { Listing } from '../types'
import {
  formatINR, formatKM, calculateMonthlyPayment,
  PLACEHOLDER_CAR_IMAGE, DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE,
  DEFAULT_TENURE_MONTHS, LOW_KM_THRESHOLD,
} from '../utils/format'

interface CarCardProps {
  car: Listing
  showCompare?: boolean
  compared?: boolean
  onToggleCompare?: (id: number) => void
  onToggleWishlist?: (id: number) => void
  isWishlisted?: boolean
}

export const CarCard = ({
  car,
  showCompare = false,
  compared = false,
  onToggleCompare,
  onToggleWishlist,
  isWishlisted = false,
}: CarCardProps) => {
  const price = car.listing_price_inr
  const monthlyEMI = price > 0 ? calculateMonthlyPayment(price * DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE, DEFAULT_TENURE_MONTHS) : 0
  const isLowKM = (car.total_km_driven ?? 0) < LOW_KM_THRESHOLD && (car.total_km_driven ?? 0) > 0
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const isNew = car.created_at ? (new Date().getTime() - new Date(car.created_at).getTime()) < sevenDaysMs : false
  const imageCount = car.images?.length || 0
  const heroImage = car.images?.[0] ?? PLACEHOLDER_CAR_IMAGE

  return (
    <article className="car-card">
      <Link to={`/car/${car.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="car-image-wrap">
          <img src={heroImage} alt={car.title} className="car-image" loading="lazy" />
          <div className="car-badge-row">
            {car.featured_listing ? <span className="badge badge-coral">Featured</span> : null}
            {car.fuel_type === 'Electric' ? <span className="badge badge-green">EV</span> : null}
            {car.fuel_type === 'Hybrid' ? <span className="badge badge-green">Hybrid</span> : null}
            {car.is_splus ? <span className="badge badge-splus">S-Plus</span> : null}
            {car.is_new_car ? <span className="badge badge-spn">New Car</span> : null}
          </div>
          {imageCount > 0 && <span className="car-image-count">📷 {imageCount} photos</span>}
          <button
            className={`car-wishlist-btn ${isWishlisted ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWishlist?.(car.id) }}
            type="button"
            aria-label={isWishlisted ? `Remove ${car.title} from wishlist` : `Add ${car.title} to wishlist`}
          >
            {isWishlisted ? '❤️' : '♡'}
          </button>
        </div>
      </Link>

      <div className="car-content">
        <Link to={`/car/${car.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="car-title">{car.title}</h3>
        </Link>
        <div className="car-price-row">
          <span className="car-price">{formatINR(price)}</span>
          {monthlyEMI > 0 && <span className="car-emi">EMI from {formatINR(monthlyEMI)}/mo</span>}
        </div>
        <div className="car-specs-row">
          <span>{formatKM(car.total_km_driven ?? 0)}</span>
          <span className="dot" />
          <span>{car.fuel_type ?? '—'}</span>
          <span className="dot" />
          <span>{car.transmission_type ?? '—'}</span>
          <span className="dot" />
          <span>{car.ownership_type ? `${car.ownership_type} Owner` : '—'}</span>
        </div>
        <div className="car-location">📍 {car.location_city ?? car.registration_city ?? '—'}</div>
        <div className="car-tag-row">
          <span className="car-tag car-tag-assured">SearchAnyCars Assured ✓</span>
          {isLowKM && <span className="car-tag car-tag-low-km">Low KM</span>}
          {isNew && <span className="car-tag car-tag-new">Newly Added</span>}
          {car.ownership_type === 'First' && <span className="car-tag car-tag-low-km">Single Owner</span>}
        </div>
        {(car.views_count ?? 0) > 200 && <div className="car-popularity">🔥 {car.views_count} people viewed</div>}
      </div>

      <div className="car-footer">
        <div className={`car-status ${
          car.listing_status === 'Active' ? 'car-status-available' :
          car.listing_status === 'Reserved' ? 'car-status-booked' :
          car.listing_status === 'Sold' ? 'car-status-sold' : 'car-status-ondemand'
        }`}>
          <span className="status-dot" />
          {car.listing_status === 'Active' ? 'Available' : car.listing_status}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {showCompare && onToggleCompare && (
            <button
              className={`btn btn-sm ${compared ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => onToggleCompare(car.id)}
              type="button"
              aria-label={`Compare ${car.title}`}
            >
              {compared ? '✓ Added' : 'Compare'}
            </button>
          )}
          <Link to={`/car/${car.id}`} className="btn btn-primary btn-sm">View</Link>
        </div>
      </div>
    </article>
  )
}
