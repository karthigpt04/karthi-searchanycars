import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Listing } from '../types'
import { PriceRangeSlider } from '../components/PriceRangeSlider'
import {
  formatINR, formatKM, calculateMonthlyPayment,
  PLACEHOLDER_CAR_IMAGE, DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE,
  DEFAULT_TENURE_MONTHS,
} from '../utils/format'

const SPLUS_THRESHOLD = 4000000

const fuelTypes = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'LPG']
const transmissions = ['Manual', 'Automatic', 'AMT', 'CVT', 'DCT', 'Torque Converter']
const bodyTypes = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury Sedan', 'Luxury SUV', 'Coupe', 'Convertible', 'Pickup']
const ownerTypes = ['First', 'Second', 'Third', 'Fourth+']
const colors = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Brown', 'Beige', 'Green', 'Orange', 'Yellow', 'Maroon']
const cities = ['New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kolkata']

const budgetPresets = [
  { label: '₹40-60L', min: 4000000, max: 6000000 },
  { label: '₹60-80L', min: 6000000, max: 8000000 },
  { label: '₹80L-1Cr', min: 8000000, max: 10000000 },
  { label: '₹1-2Cr', min: 10000000, max: 20000000 },
  { label: '₹2Cr+', min: 20000000 },
]

const kmPresets = [
  { label: 'Under 10K', val: 10000 },
  { label: 'Under 20K', val: 20000 },
  { label: 'Under 30K', val: 30000 },
  { label: 'Under 50K', val: 50000 },
  { label: 'Under 1L', val: 100000 },
]

const quickTags = [
  { label: 'Low KM', key: 'lowkm' },
  { label: 'Single Owner', key: 'singleowner' },
  { label: 'Service History', key: 'servicehistory' },
  { label: 'Sunroof', key: 'sunroof' },
]

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
  { value: 'kmAsc', label: 'KM: Low to High' },
  { value: 'yearDesc', label: 'Year: Newest' },
]

export const SPlusPage = () => {
  const [allCars, setAllCars] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [displayCount, setDisplayCount] = useState(12)
  const [wishlist, setWishlist] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('sac_wishlist') || '[]') } catch { return [] }
  })

  // Filters
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [transmission, setTransmission] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [ownerType, setOwnerType] = useState('')
  const [color, setColor] = useState('')
  const [city, setCity] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [kmMax, setKmMax] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [activeQuickTags, setActiveQuickTags] = useState<string[]>([])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileFiltersOpen])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    budget: true, brand: true, fuel: true, transmission: true, body: true,
    year: false, km: true, owner: false, city: false, color: false,
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Load all S-Plus eligible cars once
  useEffect(() => {
    let cancelled = false
    api.getListings({}).then((data) => {
      if (cancelled) return
      setAllCars(data.filter((c) => c.is_splus || c.listing_price_inr >= SPLUS_THRESHOLD))
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Derive filtered + sorted cars
  const getFilteredCars = useCallback(() => {
    let result = [...allCars]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        (c.location_city ?? '').toLowerCase().includes(q)
      )
    }
    if (brand) result = result.filter((c) => c.brand === brand)
    if (fuelType) result = result.filter((c) => c.fuel_type === fuelType)
    if (transmission) result = result.filter((c) => c.transmission_type === transmission)
    if (bodyType) result = result.filter((c) => c.body_style === bodyType || c.vehicle_type === bodyType)
    if (ownerType) result = result.filter((c) => c.ownership_type === ownerType)
    if (color) result = result.filter((c) => (c.exterior_color ?? '').toLowerCase().includes(color.toLowerCase()))
    if (city) result = result.filter((c) => c.location_city === city)
    if (priceMin) result = result.filter((c) => c.listing_price_inr >= Number(priceMin))
    if (priceMax) result = result.filter((c) => c.listing_price_inr <= Number(priceMax))
    if (yearMin) result = result.filter((c) => (c.model_year ?? 0) >= Number(yearMin))
    if (yearMax) result = result.filter((c) => (c.model_year ?? 9999) <= Number(yearMax))
    if (kmMax) result = result.filter((c) => (c.total_km_driven ?? 0) <= Number(kmMax))

    // Quick tags
    if (activeQuickTags.includes('lowkm')) result = result.filter((c) => (c.total_km_driven ?? 0) < 30000)
    if (activeQuickTags.includes('singleowner')) result = result.filter((c) => c.ownership_type === 'First')
    if (activeQuickTags.includes('servicehistory')) result = result.filter((c) => c.service_history_available)
    if (activeQuickTags.includes('sunroof')) result = result.filter((c) => (c.additional_notes ?? '').toLowerCase().includes('sunroof'))

    // Sort
    if (sortBy === 'priceAsc') result.sort((a, b) => a.listing_price_inr - b.listing_price_inr)
    else if (sortBy === 'priceDesc') result.sort((a, b) => b.listing_price_inr - a.listing_price_inr)
    else if (sortBy === 'kmAsc') result.sort((a, b) => (a.total_km_driven ?? 0) - (b.total_km_driven ?? 0))
    else if (sortBy === 'yearDesc') result.sort((a, b) => (b.model_year ?? 0) - (a.model_year ?? 0))
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return result
  }, [allCars, search, brand, fuelType, transmission, bodyType, ownerType, color, city, priceMin, priceMax, yearMin, yearMax, kmMax, sortBy, activeQuickTags])

  const [filteredCars, setFilteredCars] = useState<Listing[]>([])

  // Debounced filter application
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

  const toggleQuickTag = (key: string) => {
    setActiveQuickTags((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key])
  }

  const clearFilters = () => {
    setSearch(''); setBrand(''); setFuelType(''); setTransmission(''); setBodyType('')
    setOwnerType(''); setColor(''); setCity(''); setPriceMin(''); setPriceMax('')
    setYearMin(''); setYearMax(''); setKmMax(''); setActiveQuickTags([]); setSortBy('newest')
  }

  const brands = [...new Set(allCars.map((c) => c.brand))].sort()
  const activeFilterCount = [brand, fuelType, transmission, bodyType, ownerType, color, city, priceMin, priceMax, yearMin, yearMax, kmMax].filter(Boolean).length + activeQuickTags.length
  const displayedCars = filteredCars.slice(0, displayCount)

  const FilterChevron = ({ open }: { open: boolean }) => (
    <span className={`sp-chevron ${open ? 'open' : ''}`}>&#9660;</span>
  )

  return (
    <main className="splus-page">
      {/* Compact Hero + Trust */}
      <section className="splus-hero-compact">
        <div className="container">
          <div className="splus-hero-compact-inner">
            <div className="splus-hero-compact-left">
              <div className="splus-badge-label">S-Plus</div>
              <h1>Luxury. Curated. Certified.</h1>
              <p>{allCars.length} premium cars from {brands.length} luxury brands</p>
            </div>
            <div className="splus-hero-compact-right">
              <div className="splus-compact-badge">
                <span className="splus-compact-icon">&#9670;</span>
                <span>300-Point Inspection</span>
              </div>
              <div className="splus-compact-badge">
                <span className="splus-compact-icon">&#9733;</span>
                <span>2-Year Warranty</span>
              </div>
              <div className="splus-compact-badge">
                <span className="splus-compact-icon">&#9826;</span>
                <span>White-Glove Delivery</span>
              </div>
              <div className="splus-compact-badge">
                <span className="splus-compact-icon">&#8635;</span>
                <span>7-Day Return</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Tags */}
      <section className="splus-quicktags-section">
        <div className="container">
          <div className="splus-quicktags">
            {quickTags.map((tag) => (
              <button
                key={tag.key}
                className={`sp-quick-tag ${activeQuickTags.includes(tag.key) ? 'active' : ''}`}
                onClick={() => toggleQuickTag(tag.key)}
                type="button"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Layout: Sidebar + Results */}
      <section className="splus-main-section">
        <div className="container">
          {/* Mobile filter toggle */}
          <button
            className="sp-mobile-filter-toggle"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            type="button"
          >
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''} {mobileFiltersOpen ? '▲' : '▼'}
          </button>

          <div className="splus-layout">
            {mobileFiltersOpen && <div className="filter-panel-backdrop" onClick={() => setMobileFiltersOpen(false)} style={{ background: 'rgba(0,0,0,0.7)' }} />}
            {/* Filter Sidebar */}
            <aside className={`sp-filter-panel ${mobileFiltersOpen ? 'open filter-panel-open' : ''}`}>
              <div className="sp-filter-header">
                <h3>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="sp-filter-clear" onClick={clearFilters} type="button">Clear All</button>
                  <button className="filter-panel-close" onClick={() => setMobileFiltersOpen(false)} type="button" aria-label="Close filters">✕</button>
                </div>
              </div>

              {/* Search */}
              <div className="sp-filter-section">
                <input
                  className="sp-filter-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cars, brands, models..."
                />
              </div>

              {/* Budget / Price */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('budget')} type="button">
                  Budget / Price <FilterChevron open={openSections.budget} />
                </button>
                {openSections.budget && (
                  <>
                    <div className="sp-filter-chips">
                      {budgetPresets.map((b) => (
                        <button
                          key={b.label}
                          className={`sp-filter-chip ${priceMin === String(b.min) && priceMax === String(b.max || '') ? 'active' : ''}`}
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
                      theme="dark"
                    />
                    <div className="sp-filter-range">
                      <input className="sp-filter-input" type="number" placeholder="Min ₹" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
                      <span className="sp-range-sep">–</span>
                      <input className="sp-filter-input" type="number" placeholder="Max ₹" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
                    </div>
                  </>
                )}
              </div>

              {/* Brand */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('brand')} type="button">
                  Brand <FilterChevron open={openSections.brand} />
                </button>
                {openSections.brand && (
                  <select className="sp-filter-select" value={brand} onChange={(e) => setBrand(e.target.value)}>
                    <option value="">All Brands</option>
                    {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
              </div>

              {/* Fuel Type */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('fuel')} type="button">
                  Fuel Type <FilterChevron open={openSections.fuel} />
                </button>
                {openSections.fuel && (
                  <div className="sp-filter-chips">
                    {fuelTypes.map((f) => (
                      <button key={f} className={`sp-filter-chip ${fuelType === f ? 'active' : ''}`} onClick={() => setFuelType(fuelType === f ? '' : f)} type="button">{f}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Transmission */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('transmission')} type="button">
                  Transmission <FilterChevron open={openSections.transmission} />
                </button>
                {openSections.transmission && (
                  <div className="sp-filter-chips">
                    {transmissions.map((t) => (
                      <button key={t} className={`sp-filter-chip ${transmission === t ? 'active' : ''}`} onClick={() => setTransmission(transmission === t ? '' : t)} type="button">{t}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Body Type */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('body')} type="button">
                  Body Type <FilterChevron open={openSections.body} />
                </button>
                {openSections.body && (
                  <div className="sp-filter-chips">
                    {bodyTypes.map((b) => (
                      <button key={b} className={`sp-filter-chip ${bodyType === b ? 'active' : ''}`} onClick={() => setBodyType(bodyType === b ? '' : b)} type="button">{b}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Year */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('year')} type="button">
                  Model Year <FilterChevron open={openSections.year} />
                </button>
                {openSections.year && (
                  <div className="sp-filter-range">
                    <input className="sp-filter-input" type="number" placeholder="From" value={yearMin} onChange={(e) => setYearMin(e.target.value)} min={2000} max={2030} />
                    <span className="sp-range-sep">–</span>
                    <input className="sp-filter-input" type="number" placeholder="To" value={yearMax} onChange={(e) => setYearMax(e.target.value)} min={2000} max={2030} />
                  </div>
                )}
              </div>

              {/* Kilometers */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('km')} type="button">
                  Kilometers Driven <FilterChevron open={openSections.km} />
                </button>
                {openSections.km && (
                  <div className="sp-filter-chips">
                    {kmPresets.map((opt) => (
                      <button key={opt.val} className={`sp-filter-chip ${kmMax === String(opt.val) ? 'active' : ''}`} onClick={() => setKmMax(kmMax === String(opt.val) ? '' : String(opt.val))} type="button">{opt.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Owners */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('owner')} type="button">
                  Ownership <FilterChevron open={openSections.owner} />
                </button>
                {openSections.owner && (
                  <div className="sp-filter-chips">
                    {ownerTypes.map((o) => (
                      <button key={o} className={`sp-filter-chip ${ownerType === o ? 'active' : ''}`} onClick={() => setOwnerType(ownerType === o ? '' : o)} type="button">{o} Owner</button>
                    ))}
                  </div>
                )}
              </div>

              {/* City */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('city')} type="button">
                  City <FilterChevron open={openSections.city} />
                </button>
                {openSections.city && (
                  <select className="sp-filter-select" value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="">All Cities</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>

              {/* Exterior Color */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('color')} type="button">
                  Exterior Color <FilterChevron open={openSections.color} />
                </button>
                {openSections.color && (
                  <div className="sp-filter-chips">
                    {colors.map((c) => (
                      <button key={c} className={`sp-filter-chip ${color === c ? 'active' : ''}`} onClick={() => setColor(color === c ? '' : c)} type="button">{c}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="filter-panel-apply" style={{ background: 'var(--sp-bg-card)', borderColor: 'var(--sp-border)' }}>
                <button className="splus-btn-gold" onClick={() => setMobileFiltersOpen(false)} type="button" style={{ width: '100%', textAlign: 'center' }}>
                  Show Cars
                </button>
              </div>
            </aside>

            {/* Results */}
            <div className="sp-results">
              {/* Results Bar */}
              <div className="sp-results-bar">
                <div className="sp-results-info">
                  {loading ? 'Loading premium cars...' : <><strong>{filteredCars.length}</strong> premium {filteredCars.length === 1 ? 'car' : 'cars'} found</>}
                </div>
                {activeFilterCount > 0 && (
                  <div className="sp-active-filters">
                    {brand && <span className="sp-active-pill">{brand} <button onClick={() => setBrand('')} type="button">&#10005;</button></span>}
                    {fuelType && <span className="sp-active-pill">{fuelType} <button onClick={() => setFuelType('')} type="button">&#10005;</button></span>}
                    {transmission && <span className="sp-active-pill">{transmission} <button onClick={() => setTransmission('')} type="button">&#10005;</button></span>}
                    {bodyType && <span className="sp-active-pill">{bodyType} <button onClick={() => setBodyType('')} type="button">&#10005;</button></span>}
                    {ownerType && <span className="sp-active-pill">{ownerType} Owner <button onClick={() => setOwnerType('')} type="button">&#10005;</button></span>}
                    {color && <span className="sp-active-pill">{color} <button onClick={() => setColor('')} type="button">&#10005;</button></span>}
                    {city && <span className="sp-active-pill">{city} <button onClick={() => setCity('')} type="button">&#10005;</button></span>}
                  </div>
                )}
                <div className="sort-pills sort-pills-dark">
                  {sortOptions.map((o) => (
                    <button key={o.value} className={`sort-pill sort-pill-gold ${sortBy === o.value ? 'active' : ''}`} onClick={() => setSortBy(o.value)} type="button">
                      {o.value === 'priceAsc' ? '↑ ' : o.value === 'priceDesc' ? '↓ ' : ''}{o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Car Grid */}
              {loading ? (
                <div className="splus-car-grid">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="splus-card splus-skeleton">
                      <div className="splus-skeleton-img" />
                      <div className="splus-skeleton-body">
                        <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 12 }} />
                        <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 14, width: '40%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCars.length === 0 ? (
                <div className="splus-empty">
                  <h3>No premium cars match your filters</h3>
                  <p>Try adjusting your filters or removing some constraints.</p>
                  <button className="splus-btn-gold" onClick={clearFilters} type="button">Clear All Filters</button>
                </div>
              ) : (
                <>
                  <div className="splus-car-grid">
                    {displayedCars.map((car) => (
                      <SPlusCard
                        key={car.id}
                        car={car}
                        isWishlisted={wishlist.includes(car.id)}
                        onToggleWishlist={toggleWishlist}
                      />
                    ))}
                  </div>
                  {filteredCars.length > displayCount && (
                    <div className="sp-load-more">
                      <button className="splus-btn-gold" onClick={() => setDisplayCount((c) => c + 12)} type="button" style={{ background: 'transparent', border: '1px solid var(--sp-gold)', color: 'var(--sp-gold)' }}>
                        Load More Premium Cars
                      </button>
                      <p className="sp-showing-text">Showing {Math.min(displayCount, filteredCars.length)} of {filteredCars.length} cars</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Concierge CTA */}
      <section className="splus-concierge">
        <div className="container">
          <div className="splus-concierge-content">
            <div className="splus-concierge-text">
              <div className="splus-badge-label" style={{ marginBottom: '1rem' }}>S-Plus Concierge</div>
              <h2>Your Personal Car Advisor</h2>
              <p>
                Get dedicated assistance from our premium car experts. From shortlisting to delivery,
                we handle everything so you can focus on choosing your dream car.
              </p>
              <ul className="splus-concierge-list">
                <li>Dedicated advisor on call</li>
                <li>Private viewings at your location</li>
                <li>Priority paperwork processing</li>
                <li>Premium financing options</li>
              </ul>
            </div>
            <div className="splus-concierge-action">
              <Link to="/contact" className="splus-btn-gold">
                Connect with Advisor
              </Link>
              <span className="splus-concierge-note">Available Mon–Sat, 10 AM – 7 PM</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

const SPlusCard = ({
  car,
  isWishlisted,
  onToggleWishlist,
}: {
  car: Listing
  isWishlisted: boolean
  onToggleWishlist: (id: number) => void
}) => {
  const price = car.listing_price_inr
  const monthlyEMI = price > 0
    ? calculateMonthlyPayment(price * DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE, DEFAULT_TENURE_MONTHS)
    : 0
  const heroImage = car.images?.[0] ?? PLACEHOLDER_CAR_IMAGE
  const imageCount = car.images?.length || 0

  return (
    <article className="splus-card">
      <Link to={`/car/${car.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="splus-card-img-wrap">
          <img src={heroImage} alt={car.title} className="splus-card-img" loading="lazy" />
          <span className="splus-card-badge">S-Plus</span>
          {imageCount > 0 && <span className="splus-card-photo-count">📷 {imageCount}</span>}
          <button
            className={`splus-card-wishlist ${isWishlisted ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWishlist(car.id) }}
            type="button"
          >
            {isWishlisted ? '❤️' : '♡'}
          </button>
        </div>
        <div className="splus-card-body">
          <h3 className="splus-card-title">{car.title}</h3>
          <div className="splus-card-price-row">
            <span className="splus-card-price">{formatINR(price)}</span>
            {monthlyEMI > 0 && <span className="splus-card-emi">EMI {formatINR(monthlyEMI)}/mo</span>}
          </div>
          <div className="splus-card-specs">
            <span>{car.model_year ?? '—'}</span>
            <span className="splus-dot" />
            <span>{formatKM(car.total_km_driven ?? 0)}</span>
            <span className="splus-dot" />
            <span>{car.fuel_type ?? '—'}</span>
          </div>
          <div className="splus-card-quick-info">
            <span className="splus-card-location-tag">📍 {car.location_city ?? '—'}</span>
            <span className="splus-card-certified">✓ Certified</span>
          </div>
        </div>
      </Link>
    </article>
  )
}
