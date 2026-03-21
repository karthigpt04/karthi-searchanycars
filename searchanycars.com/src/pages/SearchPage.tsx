import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { CarCard } from '../components/CarCard'
import { PriceRangeSlider } from '../components/PriceRangeSlider'
import type { Listing } from '../types'
import { WISHLIST_STORAGE_KEY } from '../utils/format'

const cityOptions = [
  'New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Kolkata', 'Chandigarh', 'Kochi',
  'Coimbatore', 'Indore', 'Nagpur', 'Surat', 'Vizag', 'Mysuru', 'Bhopal', 'Thiruvananthapuram',
]
const fuelTypes = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'LPG']
const transmissions = ['Manual', 'Automatic', 'AMT', 'CVT', 'DCT']
const bodyTypes = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury Sedan', 'Luxury SUV', 'Coupe', 'Pickup']
const ownerTypes = ['First', 'Second', 'Third', 'Fourth+']
const sortOptions = [
  { value: 'latest', label: 'Recommended' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
]

const quickTags = [
  { label: 'Low KM', key: 'lowkm' },
  { label: 'Single Owner', key: 'singleowner' },
]

const budgetPresets = [
  { label: 'Under ₹2L', max: 200000 },
  { label: '₹2-5L', min: 200000, max: 500000 },
  { label: '₹5-10L', min: 500000, max: 1000000 },
  { label: '₹10-15L', min: 1000000, max: 1500000 },
  { label: '₹15-25L', min: 1500000, max: 2500000 },
  { label: '₹25L+', min: 2500000 },
]

export const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const [cars, setCars] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comparedIds, setComparedIds] = useState<number[]>([])
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [displayCount, setDisplayCount] = useState(12)
  const [wishlist, setWishlist] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]') } catch { return [] }
  })

  // Filters — initialized from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [brand, setBrand] = useState(searchParams.get('brand') || '')
  const [fuelType, setFuelType] = useState(searchParams.get('fuel_type') || '')
  const [transmission, setTransmission] = useState(searchParams.get('transmission_type') || '')
  const [bodyType, setBodyType] = useState(searchParams.get('body_style') || '')
  const [ownerType, setOwnerType] = useState(searchParams.get('ownership_type') || '')
  const [selectedCities, setSelectedCities] = useState<string[]>(() => {
    const param = searchParams.get('location_city') || ''
    return param ? param.split(',').map((c) => c.trim()).filter(Boolean) : []
  })
  const [priceMin, setPriceMin] = useState(searchParams.get('listing_price_min') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('listing_price_max') || '')
  const [yearMin, setYearMin] = useState(searchParams.get('model_year_min') || '')
  const [yearMax, setYearMax] = useState(searchParams.get('model_year_max') || '')
  const [kmMax, setKmMax] = useState(searchParams.get('total_km_driven_max') || '')
  const [sortBy, setSortBy] = useState('latest')
  const [activeQuickTags, setActiveQuickTags] = useState<string[]>([])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    budget: true, brand: true, fuel: true, transmission: true, body: true,
    year: false, km: false, owner: false, city: true,
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const fetchCars = useCallback(() => {
    setLoading(true)
    setError('')
    api.getListings({
      search: search || undefined,
      brand: brand || undefined,
      fuel_type: fuelType || undefined,
      transmission_type: transmission || undefined,
      ownership_type: ownerType || undefined,
      location_city: selectedCities.length > 0 ? selectedCities.join(',') : undefined,
      listing_price_min: priceMin || undefined,
      listing_price_max: priceMax || undefined,
      model_year_min: yearMin || undefined,
      model_year_max: yearMax || undefined,
      total_km_driven_max: kmMax || undefined,
      sortBy,
    }).then((data) => {
      let filtered = data
      if (bodyType) filtered = filtered.filter((c) => c.body_style === bodyType || c.vehicle_type === bodyType)
      if (activeQuickTags.includes('lowkm')) filtered = filtered.filter((c) => (c.total_km_driven ?? 0) < 30000)
      if (activeQuickTags.includes('singleowner')) filtered = filtered.filter((c) => c.ownership_type === 'First')
      setCars(filtered)
    }).catch(() => {
      setCars([])
      setError('Failed to load listings. Please try again.')
    }).finally(() => setLoading(false))
  }, [search, brand, fuelType, transmission, bodyType, ownerType, selectedCities, priceMin, priceMax, yearMin, yearMax, kmMax, sortBy, activeQuickTags])

  // Debounced fetch — waits 300ms after last filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCars(), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchCars])

  // Reset display count when filters change
  useEffect(() => { setDisplayCount(12) }, [search, brand, fuelType, transmission, bodyType, ownerType, selectedCities, priceMin, priceMax, yearMin, yearMax, kmMax, activeQuickTags])

  // Prevent body scrolling when mobile filter drawer is open
  useEffect(() => {
    if (mobileFilterOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileFilterOpen])

  const clearFilters = () => {
    setSearch(''); setBrand(''); setFuelType(''); setTransmission(''); setBodyType('')
    setOwnerType(''); setSelectedCities([]); setPriceMin(''); setPriceMax('')
    setYearMin(''); setYearMax(''); setKmMax(''); setActiveQuickTags([]); setSortBy('latest')
  }

  const toggleCompare = (id: number) => {
    setComparedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? [...prev.slice(1), id] : [...prev, id])
  }

  const toggleWishlist = (id: number) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const toggleQuickTag = (key: string) => {
    setActiveQuickTags((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key])
  }

  const activeFilterCount = [brand, fuelType, transmission, bodyType, ownerType, ...selectedCities, priceMin, priceMax, yearMin, yearMax, kmMax].filter(Boolean).length
  const displayedCars = cars.slice(0, displayCount)

  return (
    <main>
      <div className="section-sm section-gray">
        <div className="container">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {brand ? `Used ${brand} Cars` : 'Search Used Cars'}
            {selectedCities.length > 0 ? ` in ${selectedCities.join(', ')}` : ''}
          </h1>
        </div>
      </div>

      <section className="section-sm">
        <div className="container">
          <div className="quick-tags">
            {quickTags.map((tag) => (
              <button key={tag.key} className={`quick-tag ${activeQuickTags.includes(tag.key) ? 'active' : ''}`} onClick={() => toggleQuickTag(tag.key)} type="button">
                {tag.label}
              </button>
            ))}
          </div>

          <button className="mobile-filter-fab" onClick={() => setMobileFilterOpen(true)} type="button">
            ☰ Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </button>

          <div className="search-layout">
            {/* Filter Sidebar */}
            {mobileFilterOpen && <div className="filter-panel-backdrop" onClick={() => setMobileFilterOpen(false)} />}
            <aside className={`filter-panel ${mobileFilterOpen ? 'filter-panel-open' : ''}`}>
              <div className="filter-panel-mobile-header">
                <h3>Filters</h3>
                <button className="filter-panel-close" onClick={() => setMobileFilterOpen(false)} type="button">✕</button>
              </div>
              <div className="filter-header">
                <h3>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</h3>
                <button className="filter-clear" onClick={clearFilters} type="button">Clear All</button>
              </div>

              <div className="filter-section">
                <input className="filter-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cars, brands..." aria-label="Search cars" />
              </div>

              {/* Budget */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('budget')} type="button" aria-expanded={openSections.budget}>
                  Budget / Price <span className={`chevron ${openSections.budget ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.budget && (
                  <>
                    <div className="filter-chips" style={{ marginBottom: '0.5rem' }}>
                      {budgetPresets.map((b) => (
                        <button key={b.label} className={`filter-chip ${priceMin === String(b.min || '') && priceMax === String(b.max || '') ? 'active' : ''}`}
                          onClick={() => { setPriceMin(String(b.min || '')); setPriceMax(String(b.max || '')) }} type="button">{b.label}</button>
                      ))}
                    </div>
                    <PriceRangeSlider
                      min={0}
                      max={5000000}
                      valueMin={priceMin}
                      valueMax={priceMax}
                      onChangeMin={setPriceMin}
                      onChangeMax={setPriceMax}
                      theme="light"
                    />
                    <div className="filter-range">
                      <input className="filter-input" type="number" placeholder="Min ₹" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} aria-label="Minimum price" />
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                      <input className="filter-input" type="number" placeholder="Max ₹" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} aria-label="Maximum price" />
                    </div>
                  </>
                )}
              </div>

              {/* Brand */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('brand')} type="button" aria-expanded={openSections.brand}>
                  Brand <span className={`chevron ${openSections.brand ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.brand && <input className="filter-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., Hyundai, Tata..." aria-label="Brand filter" />}
              </div>

              {/* Fuel Type */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('fuel')} type="button" aria-expanded={openSections.fuel}>
                  Fuel Type <span className={`chevron ${openSections.fuel ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.fuel && (
                  <div className="filter-chips">
                    {fuelTypes.map((f) => <button key={f} className={`filter-chip ${fuelType === f ? 'active' : ''}`} onClick={() => setFuelType(fuelType === f ? '' : f)} type="button">{f}</button>)}
                  </div>
                )}
              </div>

              {/* Transmission */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('transmission')} type="button" aria-expanded={openSections.transmission}>
                  Transmission <span className={`chevron ${openSections.transmission ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.transmission && (
                  <div className="filter-chips">
                    {transmissions.map((t) => <button key={t} className={`filter-chip ${transmission === t ? 'active' : ''}`} onClick={() => setTransmission(transmission === t ? '' : t)} type="button">{t}</button>)}
                  </div>
                )}
              </div>

              {/* Body Type */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('body')} type="button" aria-expanded={openSections.body}>
                  Body Type <span className={`chevron ${openSections.body ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.body && (
                  <div className="filter-chips">
                    {bodyTypes.map((b) => <button key={b} className={`filter-chip ${bodyType === b ? 'active' : ''}`} onClick={() => setBodyType(bodyType === b ? '' : b)} type="button">{b}</button>)}
                  </div>
                )}
              </div>

              {/* Year */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('year')} type="button" aria-expanded={openSections.year}>
                  Year <span className={`chevron ${openSections.year ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.year && (
                  <div className="filter-range">
                    <input className="filter-input" type="number" placeholder="From" value={yearMin} onChange={(e) => setYearMin(e.target.value)} aria-label="Minimum year" />
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                    <input className="filter-input" type="number" placeholder="To" value={yearMax} onChange={(e) => setYearMax(e.target.value)} aria-label="Maximum year" />
                  </div>
                )}
              </div>

              {/* KM Driven */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('km')} type="button" aria-expanded={openSections.km}>
                  Kilometers <span className={`chevron ${openSections.km ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.km && (
                  <div className="filter-chips">
                    {[{ label: 'Under 10K', val: '10000' }, { label: 'Under 30K', val: '30000' }, { label: 'Under 50K', val: '50000' }, { label: 'Under 1L', val: '100000' }].map((opt) => (
                      <button key={opt.val} className={`filter-chip ${kmMax === opt.val ? 'active' : ''}`} onClick={() => setKmMax(kmMax === opt.val ? '' : opt.val)} type="button">{opt.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Owner */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('owner')} type="button" aria-expanded={openSections.owner}>
                  Owners <span className={`chevron ${openSections.owner ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.owner && (
                  <div className="filter-chips">
                    {ownerTypes.map((o) => <button key={o} className={`filter-chip ${ownerType === o ? 'active' : ''}`} onClick={() => setOwnerType(ownerType === o ? '' : o)} type="button">{o} Owner</button>)}
                  </div>
                )}
              </div>

              {/* City */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('city')} type="button" aria-expanded={openSections.city}>
                  City {selectedCities.length > 0 ? `(${selectedCities.length})` : ''} <span className={`chevron ${openSections.city ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.city && (
                  <div className="filter-chips filter-chips-city">
                    {cityOptions.map((c) => (
                      <button
                        key={c}
                        className={`filter-chip ${selectedCities.includes(c) ? 'active' : ''}`}
                        onClick={() => setSelectedCities((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                        type="button"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="filter-panel-apply">
                <button className="btn btn-primary" onClick={() => setMobileFilterOpen(false)} type="button" style={{ width: '100%' }}>
                  Show {cars.length} Cars
                </button>
              </div>
            </aside>

            {/* Results Area */}
            <div>
              <div className="results-bar">
                <div className="results-count">
                  {loading ? 'Searching...' : error ? <span style={{ color: 'var(--error)' }}>{error}</span> : <><strong>{cars.length}</strong> cars found</>}
                </div>
                {activeFilterCount > 0 && (
                  <div className="active-filters">
                    {brand && <span className="active-filter-pill">{brand} <button onClick={() => setBrand('')} type="button">✕</button></span>}
                    {fuelType && <span className="active-filter-pill">{fuelType} <button onClick={() => setFuelType('')} type="button">✕</button></span>}
                    {transmission && <span className="active-filter-pill">{transmission} <button onClick={() => setTransmission('')} type="button">✕</button></span>}
                    {bodyType && <span className="active-filter-pill">{bodyType} <button onClick={() => setBodyType('')} type="button">✕</button></span>}
                    {selectedCities.map((c) => (
                      <span key={c} className="active-filter-pill">{c} <button onClick={() => setSelectedCities((prev) => prev.filter((x) => x !== c))} type="button">✕</button></span>
                    ))}
                  </div>
                )}
                <div className="sort-pills">
                  {sortOptions.map((o) => (
                    <button key={o.value} className={`sort-pill ${sortBy === o.value ? 'active' : ''}`} onClick={() => setSortBy(o.value)} type="button">
                      {o.value === 'priceAsc' ? '↑ ' : o.value === 'priceDesc' ? '↓ ' : ''}{o.label}
                    </button>
                  ))}
                </div>
              </div>

              {comparedIds.length > 0 && (
                <div className="compare-banner">
                  <span><strong>Compare:</strong> {comparedIds.length}/3 cars selected</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => setComparedIds([])} type="button">Clear</button>
                </div>
              )}

              {loading ? (
                <div className="card-grid">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="skeleton-card"><div className="skeleton-image" /><div className="skeleton-text-lg skeleton" /><div className="skeleton-text skeleton" /><div className="skeleton-text skeleton" style={{ width: '50%' }} /></div>
                  ))}
                </div>
              ) : error ? (
                <div className="empty-state">
                  <h3>Something went wrong</h3>
                  <p>{error}</p>
                  <button className="btn btn-primary" onClick={fetchCars} type="button">Retry</button>
                </div>
              ) : displayedCars.length > 0 ? (
                <>
                  <div className="card-grid">
                    {displayedCars.map((car) => (
                      <CarCard key={car.id} car={car} showCompare compared={comparedIds.includes(car.id)} onToggleCompare={toggleCompare} isWishlisted={wishlist.includes(car.id)} onToggleWishlist={toggleWishlist} />
                    ))}
                  </div>
                  {cars.length > displayCount && (
                    <div className="load-more-row">
                      <button className="btn btn-outline" onClick={() => setDisplayCount((c) => c + 12)} type="button">Load More Cars</button>
                      <p className="showing-text">Showing {Math.min(displayCount, cars.length)} of {cars.length} cars</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <h3>No cars match your filters</h3>
                  <p>Try adjusting your filters or search with fewer constraints.</p>
                  <button className="btn btn-primary" onClick={clearFilters} type="button">Clear All Filters</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
