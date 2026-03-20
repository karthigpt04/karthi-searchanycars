import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Listing } from '../types'
import {
  formatINR, calculateMonthlyPayment,
  PLACEHOLDER_CAR_IMAGE, DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE,
  DEFAULT_TENURE_MONTHS,
} from '../utils/format'

const carTypes = [
  { label: 'All', value: '' },
  { label: 'Unregistered', value: 'Unregistered' },
  { label: 'Demo Cars', value: 'Demo' },
  { label: 'Unused / Display', value: 'Unused' },
]

const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid']
const bodyTypes = ['Luxury Sedan', 'Luxury SUV', 'SUV', 'Sedan', 'Coupe', 'Convertible']

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
]

const highlights = [
  { icon: '◇', title: 'Factory Fresh', desc: 'Zero or near-zero kilometers' },
  { icon: '★', title: 'Full Warranty', desc: 'Complete manufacturer warranty' },
  { icon: '◈', title: 'Unregistered', desc: 'First registration in your name' },
  { icon: '⟐', title: 'Concierge', desc: 'White-glove delivery experience' },
]

export const SPlusNewPage = () => {
  const [allCars, setAllCars] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [displayCount, setDisplayCount] = useState(12)
  const [wishlist, setWishlist] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('sac_wishlist') || '[]') } catch { return [] }
  })

  // Filters
  const [search, setSearch] = useState('')
  const [carType, setCarType] = useState('')
  const [brand, setBrand] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'showcase'>('grid')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    api.getListings({ is_new_car: 1 }).then((data) => {
      if (cancelled) return
      setAllCars(data)
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const getFilteredCars = useCallback(() => {
    let result = [...allCars]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q)
      )
    }
    if (carType) result = result.filter((c) => c.new_car_type === carType)
    if (brand) result = result.filter((c) => c.brand === brand)
    if (fuelType) result = result.filter((c) => c.fuel_type === fuelType)
    if (bodyType) result = result.filter((c) => c.body_style === bodyType || c.vehicle_type === bodyType)

    if (sortBy === 'priceAsc') result.sort((a, b) => a.listing_price_inr - b.listing_price_inr)
    else if (sortBy === 'priceDesc') result.sort((a, b) => b.listing_price_inr - a.listing_price_inr)
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return result
  }, [allCars, search, carType, brand, fuelType, bodyType, sortBy])

  const [filteredCars, setFilteredCars] = useState<Listing[]>([])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilteredCars(getFilteredCars())
      setDisplayCount(12)
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [getFilteredCars])

  const toggleWishlist = (id: number) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem('sac_wishlist', JSON.stringify(next))
      return next
    })
  }

  const clearFilters = () => {
    setSearch(''); setCarType(''); setBrand(''); setFuelType(''); setBodyType(''); setSortBy('newest')
  }

  const brands = [...new Set(allCars.map((c) => c.brand))].sort()
  const activeFilterCount = [carType, brand, fuelType, bodyType].filter(Boolean).length
  const displayedCars = filteredCars.slice(0, displayCount)

  return (
    <main className="spn-page">
      {/* Hero — Cinematic Reveal */}
      <section className="spn-hero">
        <div className="spn-hero-bg" />
        <div className="container">
          <div className="spn-hero-content">
            <div className="spn-hero-eyebrow">
              <span className="spn-badge">S-Plus New</span>
              <span className="spn-hero-divider" />
              <span className="spn-hero-tagline">Factory Fresh. Zero Owners. Your Name First.</span>
            </div>
            <h1 className="spn-hero-title">
              The New Car Experience,<br />
              <span className="spn-hero-accent">Reimagined.</span>
            </h1>
            <p className="spn-hero-subtitle">
              Premium unregistered, unused, and demo cars from authorized dealers.
              Brand new cars at exceptional value — with full manufacturer warranty.
            </p>
            <div className="spn-hero-stats">
              <div className="spn-hero-stat">
                <span className="spn-hero-stat-num">{allCars.length}</span>
                <span className="spn-hero-stat-label">Cars Available</span>
              </div>
              <div className="spn-hero-stat">
                <span className="spn-hero-stat-num">{brands.length}</span>
                <span className="spn-hero-stat-label">Premium Brands</span>
              </div>
              <div className="spn-hero-stat">
                <span className="spn-hero-stat-num">0 km</span>
                <span className="spn-hero-stat-label">Driven</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Strip */}
      <section className="spn-highlights">
        <div className="container">
          <div className="spn-highlights-grid">
            {highlights.map((h) => (
              <div key={h.title} className="spn-highlight-item">
                <span className="spn-highlight-icon">{h.icon}</span>
                <div>
                  <span className="spn-highlight-title">{h.title}</span>
                  <span className="spn-highlight-desc">{h.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="spn-filter-section">
        <div className="container">
          <div className="spn-filter-bar">
            {/* Car Type Tabs */}
            <div className="spn-type-tabs">
              {carTypes.map((t) => (
                <button
                  key={t.value}
                  className={`spn-type-tab ${carType === t.value ? 'active' : ''}`}
                  onClick={() => setCarType(t.value)}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="spn-filter-row">
              <input
                className="spn-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by brand, model..."
              />
              <select className="spn-filter-select" value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">All Brands</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select className="spn-filter-select" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                <option value="">All Fuel Types</option>
                {fuelTypes.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="spn-filter-select" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
                <option value="">All Body Types</option>
                {bodyTypes.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select className="spn-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {activeFilterCount > 0 && (
                <button className="spn-filter-clear" onClick={clearFilters} type="button">
                  Clear ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="spn-view-toggle">
              <button
                className={`spn-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                type="button"
                aria-label="Grid view"
              >
                ▦
              </button>
              <button
                className={`spn-view-btn ${viewMode === 'showcase' ? 'active' : ''}`}
                onClick={() => setViewMode('showcase')}
                type="button"
                aria-label="Showcase view"
              >
                ▬
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="spn-results-section">
        <div className="container">
          <div className="spn-results-header">
            <span className="spn-results-count">
              {loading ? 'Discovering...' : <><strong>{filteredCars.length}</strong> factory-fresh {filteredCars.length === 1 ? 'car' : 'cars'}</>}
            </span>
          </div>

          {loading ? (
            <div className={`spn-grid ${viewMode}`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="spn-card spn-skeleton">
                  <div className="spn-skeleton-img" />
                  <div className="spn-skeleton-body">
                    <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 12 }} />
                    <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 14, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCars.length === 0 ? (
            <div className="spn-empty">
              <h3>No cars match your criteria</h3>
              <p>Try adjusting your filters or check back soon for new arrivals.</p>
              <button className="spn-btn-primary" onClick={clearFilters} type="button">Clear All Filters</button>
            </div>
          ) : (
            <>
              <div className={`spn-grid ${viewMode}`}>
                {displayedCars.map((car) => (
                  <NewCarCard
                    key={car.id}
                    car={car}
                    isWishlisted={wishlist.includes(car.id)}
                    onToggleWishlist={toggleWishlist}
                    viewMode={viewMode}
                  />
                ))}
              </div>
              {filteredCars.length > displayCount && (
                <div className="spn-load-more">
                  <button className="spn-btn-outline" onClick={() => setDisplayCount((c) => c + 12)} type="button">
                    Discover More
                  </button>
                  <p className="spn-showing">{Math.min(displayCount, filteredCars.length)} of {filteredCars.length}</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="spn-how-section">
        <div className="container">
          <h2 className="spn-section-title">How S-Plus New Works</h2>
          <div className="spn-how-grid">
            {[
              { num: '01', title: 'Browse & Select', desc: 'Explore our curated collection of factory-fresh, unregistered cars from authorized dealers.' },
              { num: '02', title: 'Private Viewing', desc: 'Schedule a private viewing at the dealer or have the car brought to your preferred location.' },
              { num: '03', title: 'Seamless Purchase', desc: 'Your dedicated advisor handles all paperwork, registration, and financing options.' },
              { num: '04', title: 'White-Glove Delivery', desc: 'Your brand new car is delivered to your doorstep with full ceremony and documentation.' },
            ].map((step) => (
              <div key={step.num} className="spn-how-step">
                <span className="spn-how-num">{step.num}</span>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Concierge CTA */}
      <section className="spn-cta-section">
        <div className="container">
          <div className="spn-cta-content">
            <div className="spn-cta-text">
              <span className="spn-badge">Concierge Service</span>
              <h2>Your Personal New Car Advisor</h2>
              <p>
                Not finding what you're looking for? Our concierge team can source any make and model
                from our network of authorized dealers. Tell us what you want — we'll make it happen.
              </p>
              <ul className="spn-cta-perks">
                <li>Dedicated advisor for your purchase</li>
                <li>Access to exclusive dealer inventory</li>
                <li>Custom orders and special configurations</li>
                <li>Premium financing and insurance packages</li>
              </ul>
            </div>
            <div className="spn-cta-action">
              <Link to="/contact" className="spn-btn-primary">
                Speak with an Advisor
              </Link>
              <span className="spn-cta-note">Available Mon–Sat, 10 AM – 7 PM</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

const NewCarCard = ({
  car,
  isWishlisted,
  onToggleWishlist,
  viewMode,
}: {
  car: Listing
  isWishlisted: boolean
  onToggleWishlist: (id: number) => void
  viewMode: 'grid' | 'showcase'
}) => {
  const price = car.listing_price_inr
  const monthlyEMI = price > 0
    ? calculateMonthlyPayment(price * DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE, DEFAULT_TENURE_MONTHS)
    : 0
  const heroImage = car.images?.[0] ?? PLACEHOLDER_CAR_IMAGE
  const imageCount = car.images?.length || 0
  const typeLabel = car.new_car_type === 'Demo' ? 'Demo Car' : car.new_car_type === 'Unused' ? 'Unused' : 'Unregistered'

  if (viewMode === 'showcase') {
    return (
      <article className="spn-card spn-card-showcase">
        <Link to={`/car/${car.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="spn-showcase-layout">
            <div className="spn-card-img-wrap spn-showcase-img">
              <img src={heroImage} alt={car.title} className="spn-card-img" loading="lazy" />
              <span className="spn-card-type-badge">{typeLabel}</span>
              {imageCount > 0 && <span className="spn-card-photo-count">{imageCount} photos</span>}
              <button
                className={`spn-card-wishlist ${isWishlisted ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWishlist(car.id) }}
                type="button"
              >
                {isWishlisted ? '❤️' : '♡'}
              </button>
            </div>
            <div className="spn-showcase-body">
              <div className="spn-card-header">
                <span className="spn-badge spn-badge-sm">S-Plus New</span>
                <span className="spn-card-year">{car.model_year}</span>
              </div>
              <h3 className="spn-card-title">{car.title}</h3>
              <p className="spn-card-desc">{car.additional_notes}</p>
              <div className="spn-card-specs-row">
                <span>{car.engine_type ?? '—'}</span>
                <span className="spn-dot" />
                <span>{car.power_bhp ? `${car.power_bhp} bhp` : '—'}</span>
                <span className="spn-dot" />
                <span>{car.transmission_type ?? '—'}</span>
                <span className="spn-dot" />
                <span>{car.fuel_type ?? '—'}</span>
              </div>
              <div className="spn-card-features">
                <span className="spn-feature-tag">Full Warranty</span>
                <span className="spn-feature-tag">0 km</span>
                <span className="spn-feature-tag">{car.airbags_count ?? 6} Airbags</span>
                {car.location_city && <span className="spn-feature-tag">{car.location_city}</span>}
              </div>
              <div className="spn-card-price-section">
                <div className="spn-card-price">{formatINR(price)}</div>
                {monthlyEMI > 0 && <div className="spn-card-emi">EMI from {formatINR(monthlyEMI)}/mo</div>}
              </div>
              <div className="spn-card-actions">
                <Link to={`/car/${car.id}`} className="spn-btn-primary spn-btn-sm">View Details</Link>
                <Link to="/contact" className="spn-btn-outline spn-btn-sm">Enquire Now</Link>
              </div>
            </div>
          </div>
        </Link>
      </article>
    )
  }

  return (
    <article className="spn-card">
      <Link to={`/car/${car.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="spn-card-img-wrap">
          <img src={heroImage} alt={car.title} className="spn-card-img" loading="lazy" />
          <span className="spn-card-type-badge">{typeLabel}</span>
          <span className="spn-card-badge-new">S-Plus New</span>
          {imageCount > 0 && <span className="spn-card-photo-count">{imageCount} photos</span>}
          <button
            className={`spn-card-wishlist ${isWishlisted ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWishlist(car.id) }}
            type="button"
          >
            {isWishlisted ? '❤️' : '♡'}
          </button>
        </div>
      </Link>
      <div className="spn-card-body">
        <Link to={`/car/${car.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="spn-card-title">{car.title}</h3>
        </Link>
        <div className="spn-card-price-row">
          <span className="spn-card-price">{formatINR(price)}</span>
          {monthlyEMI > 0 && <span className="spn-card-emi">EMI {formatINR(monthlyEMI)}/mo</span>}
        </div>
        <div className="spn-card-specs-row">
          <span>{car.fuel_type ?? '—'}</span>
          <span className="spn-dot" />
          <span>{car.transmission_type ?? '—'}</span>
          <span className="spn-dot" />
          <span>{car.power_bhp ? `${car.power_bhp} bhp` : '—'}</span>
        </div>
        <div className="spn-card-features">
          <span className="spn-feature-tag">Full Warranty</span>
          <span className="spn-feature-tag">0 km</span>
        </div>
        <div className="spn-card-footer">
          <span className="spn-card-location">{car.location_city ?? '—'}</span>
          <Link to={`/car/${car.id}`} className="spn-btn-outline spn-btn-sm">View</Link>
        </div>
      </div>
    </article>
  )
}
