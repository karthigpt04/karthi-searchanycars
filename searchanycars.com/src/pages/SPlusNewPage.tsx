import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useWishlist } from '../context/WishlistContext'
import type { Listing } from '../types'
import { PriceRangeSlider } from '../components/PriceRangeSlider'
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

const budgetPresets = [
  { label: '₹10-25L', min: 1000000, max: 2500000 },
  { label: '₹25-50L', min: 2500000, max: 5000000 },
  { label: '₹50-80L', min: 5000000, max: 8000000 },
  { label: '₹80L-1Cr', min: 8000000, max: 10000000 },
  { label: '₹1Cr+', min: 10000000 },
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
  const { wishlistIds: wishlist, toggleWishlist: contextToggleWishlist } = useWishlist()

  // Filters
  const [search, setSearch] = useState('')
  const [carType, setCarType] = useState('')
  const [brand, setBrand] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'showcase'>('grid')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    type: true, budget: true, brand: true, fuel: true, body: true,
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileFiltersOpen])

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
    if (priceMin) result = result.filter((c) => c.listing_price_inr >= Number(priceMin))
    if (priceMax) result = result.filter((c) => c.listing_price_inr <= Number(priceMax))

    if (sortBy === 'priceAsc') result.sort((a, b) => a.listing_price_inr - b.listing_price_inr)
    else if (sortBy === 'priceDesc') result.sort((a, b) => b.listing_price_inr - a.listing_price_inr)
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return result
  }, [allCars, search, carType, brand, fuelType, bodyType, priceMin, priceMax, sortBy])

  const [filteredCars, setFilteredCars] = useState<Listing[]>([])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilteredCars(getFilteredCars())
      setDisplayCount(12)
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [getFilteredCars])

  const toggleWishlist = (id: number) => contextToggleWishlist(id)

  const clearFilters = () => {
    setSearch(''); setCarType(''); setBrand(''); setFuelType(''); setBodyType(''); setPriceMin(''); setPriceMax(''); setSortBy('newest')
  }

  const brands = [...new Set(allCars.map((c) => c.brand))].sort()
  const activeFilterCount = [carType, brand, fuelType, bodyType, priceMin, priceMax].filter(Boolean).length
  const displayedCars = filteredCars.slice(0, displayCount)

  const FilterChevron = ({ open }: { open: boolean }) => (
    <span className={`spn-chevron ${open ? 'open' : ''}`}>&#9660;</span>
  )

  return (
    <main className="spn-page">
      {/* Hero — Compact (matches S-Plus) */}
      <section className="spn-hero-compact">
        <div className="container">
          <div className="spn-hero-compact-inner">
            <div className="spn-hero-compact-left">
              <div className="spn-badge">S-Plus New</div>
              <h1>Factory Fresh. Zero Owners. <span className="spn-hero-accent">Your Name First.</span></h1>
              <p>{allCars.length} premium new cars from {brands.length} brands — 0 km driven</p>
            </div>
            <div className="spn-hero-compact-right">
              <div className="spn-compact-badge">
                <span className="spn-compact-icon">&#9670;</span>
                <span>Full Manufacturer Warranty</span>
              </div>
              <div className="spn-compact-badge">
                <span className="spn-compact-icon">&#9733;</span>
                <span>Authorized Dealers</span>
              </div>
              <div className="spn-compact-badge">
                <span className="spn-compact-icon">&#9826;</span>
                <span>Unregistered &amp; Unused</span>
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

      {/* Main Layout: Sidebar + Results (matches S-Plus) */}
      <section className="spn-main-section">
        <div className="container">
          {/* Mobile filter toggle */}
          <button
            className="spn-mobile-filter-toggle"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            type="button"
          >
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''} {mobileFiltersOpen ? '▲' : '▼'}
          </button>

          <div className="spn-layout">
            {/* Backdrop for mobile filters */}
            {mobileFiltersOpen && <div className="filter-panel-backdrop" onClick={() => setMobileFiltersOpen(false)} style={{ background: 'rgba(0,0,0,0.7)' }} />}

            {/* Filter Sidebar */}
            <aside className={`spn-filter-panel ${mobileFiltersOpen ? 'open' : ''}`}>
              <div className="spn-filter-header">
                <h3>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="spn-filter-clear-all" onClick={clearFilters} type="button">Clear All</button>
                  <button className="filter-panel-close" onClick={() => setMobileFiltersOpen(false)} type="button" aria-label="Close filters">✕</button>
                </div>
              </div>

              {/* Search */}
              <div className="spn-filter-section-item">
                <input
                  className="spn-filter-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cars, brands, models..."
                />
              </div>

              {/* Car Type */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('type')} type="button">
                  Car Type <FilterChevron open={openSections.type} />
                </button>
                {openSections.type && (
                  <div className="spn-filter-chips">
                    {carTypes.filter((t) => t.value !== '').map((t) => (
                      <button key={t.value} className={`spn-filter-chip ${carType === t.value ? 'active' : ''}`} onClick={() => setCarType(carType === t.value ? '' : t.value)} type="button">{t.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Budget / Price */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('budget')} type="button">
                  Budget / Price <FilterChevron open={openSections.budget} />
                </button>
                {openSections.budget && (
                  <>
                    <div className="spn-filter-chips">
                      {budgetPresets.map((b) => (
                        <button
                          key={b.label}
                          className={`spn-filter-chip ${priceMin === String(b.min) && priceMax === String(b.max || '') ? 'active' : ''}`}
                          onClick={() => {
                            setPriceMin(String(b.min))
                            setPriceMax(b.max ? String(b.max) : '')
                          }}
                          type="button"
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <PriceRangeSlider
                      min={0}
                      max={200000000}
                      valueMin={priceMin}
                      valueMax={priceMax}
                      onChangeMin={setPriceMin}
                      onChangeMax={setPriceMax}
                      theme="dark-green"
                    />
                    <div className="spn-filter-range">
                      <input className="spn-filter-input" type="number" placeholder="Min ₹" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
                      <span className="spn-range-sep">–</span>
                      <input className="spn-filter-input" type="number" placeholder="Max ₹" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
                    </div>
                  </>
                )}
              </div>

              {/* Brand */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('brand')} type="button">
                  Brand <FilterChevron open={openSections.brand} />
                </button>
                {openSections.brand && (
                  <select className="spn-filter-select-full" value={brand} onChange={(e) => setBrand(e.target.value)}>
                    <option value="">All Brands</option>
                    {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
              </div>

              {/* Fuel Type */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('fuel')} type="button">
                  Fuel Type <FilterChevron open={openSections.fuel} />
                </button>
                {openSections.fuel && (
                  <div className="spn-filter-chips">
                    {fuelTypes.map((f) => (
                      <button key={f} className={`spn-filter-chip ${fuelType === f ? 'active' : ''}`} onClick={() => setFuelType(fuelType === f ? '' : f)} type="button">{f}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Body Type */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('body')} type="button">
                  Body Type <FilterChevron open={openSections.body} />
                </button>
                {openSections.body && (
                  <div className="spn-filter-chips">
                    {bodyTypes.map((b) => (
                      <button key={b} className={`spn-filter-chip ${bodyType === b ? 'active' : ''}`} onClick={() => setBodyType(bodyType === b ? '' : b)} type="button">{b}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="filter-panel-apply" style={{ background: 'var(--spn-bg-card)', borderColor: 'var(--spn-border)' }}>
                <button className="spn-btn-primary" onClick={() => setMobileFiltersOpen(false)} type="button" style={{ width: '100%', textAlign: 'center' }}>
                  Show Cars
                </button>
              </div>
            </aside>

            {/* Results */}
            <div className="spn-results">
              {/* Results Bar */}
              <div className="spn-results-bar">
                <div className="spn-results-info">
                  {loading ? 'Discovering...' : <><strong>{filteredCars.length}</strong> factory-fresh {filteredCars.length === 1 ? 'car' : 'cars'}</>}
                </div>
                {activeFilterCount > 0 && (
                  <div className="spn-active-filters">
                    {carType && <span className="spn-active-pill">{carType} <button onClick={() => setCarType('')} type="button">&#10005;</button></span>}
                    {brand && <span className="spn-active-pill">{brand} <button onClick={() => setBrand('')} type="button">&#10005;</button></span>}
                    {fuelType && <span className="spn-active-pill">{fuelType} <button onClick={() => setFuelType('')} type="button">&#10005;</button></span>}
                    {bodyType && <span className="spn-active-pill">{bodyType} <button onClick={() => setBodyType('')} type="button">&#10005;</button></span>}
                  </div>
                )}
                <div className="spn-results-actions">
                  <div className="sort-pills sort-pills-dark">
                    {sortOptions.map((o) => (
                      <button key={o.value} className={`sort-pill sort-pill-emerald ${sortBy === o.value ? 'active' : ''}`} onClick={() => setSortBy(o.value)} type="button">
                        {o.value === 'priceAsc' ? '↑ ' : o.value === 'priceDesc' ? '↓ ' : ''}{o.label}
                      </button>
                    ))}
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

              {/* Car Grid */}
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
          </div>
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
          {imageCount > 0 && <span className="spn-card-photo-count">📷 {imageCount}</span>}
          <button
            className={`spn-card-wishlist ${isWishlisted ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWishlist(car.id) }}
            type="button"
          >
            {isWishlisted ? '❤️' : '♡'}
          </button>
        </div>
        <div className="spn-card-body">
          <h3 className="spn-card-title">{car.title}</h3>
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
          <div className="spn-card-quick-info">
            <span className="spn-card-warranty-tag">✓ Full Warranty</span>
            <span className="spn-card-km-tag">0 km</span>
          </div>
        </div>
      </Link>
    </article>
  )
}
