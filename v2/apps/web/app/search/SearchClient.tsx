'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../src/lib/api';
import { CarCard } from '../../src/components/CarCard';
import { PriceRangeSlider } from '../../src/components/PriceRangeSlider';
import { useWishlist } from '../../src/context/WishlistContext';

type Listing = Record<string, unknown> & { id: number; title: string };

const cityOptions = [
  'New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Kolkata', 'Chandigarh', 'Kochi',
  'Coimbatore', 'Indore', 'Nagpur', 'Surat', 'Vizag', 'Mysuru', 'Bhopal', 'Thiruvananthapuram',
];
const brandOptions = [
  'Maruti Suzuki', 'Hyundai', 'Tata', 'Honda', 'Kia', 'Mahindra',
  'Toyota', 'Volkswagen', 'Škoda', 'BMW', 'Mercedes-Benz', 'Audi',
  'Ford', 'Renault', 'Nissan', 'MG', 'Jeep', 'Volvo',
  'Lexus', 'Porsche', 'Jaguar', 'Land Rover', 'Mini', 'Citroën',
  'Isuzu', 'Mitsubishi', 'Fiat', 'Chevrolet', 'Rolls-Royce', 'Bentley',
];
const fuelTypes = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'LPG'];
const transmissions = ['Manual', 'Automatic', 'AMT', 'CVT', 'DCT'];
const bodyTypes = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury Sedan', 'Luxury SUV', 'Coupe', 'Pickup'];
const ownerTypes = ['First', 'Second', 'Third', 'Fourth+'];
const sortOptions = [
  { value: 'latest', label: 'Recommended' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
];
const quickTags = [
  { label: 'Low KM', key: 'lowkm' },
  { label: 'Single Owner', key: 'singleowner' },
];
const budgetPresets = [
  { label: 'Under ₹2L', min: 0, max: 200000 },
  { label: '₹2-5L', min: 200000, max: 500000 },
  { label: '₹5-10L', min: 500000, max: 1000000 },
  { label: '₹10-15L', min: 1000000, max: 1500000 },
  { label: '₹15-25L', min: 1500000, max: 2500000 },
  { label: '₹25L+', min: 2500000, max: 0 },
];

export function SearchClient() {
  const searchParams = useSearchParams();
  const [cars, setCars] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comparedIds, setComparedIds] = useState<number[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const { wishlistIds: wishlist, toggleWishlist: contextToggleWishlist } = useWishlist();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedFuels, setSelectedFuels] = useState<string[]>(() => {
    const param = searchParams.get('fuel_type') || '';
    return param ? param.split(',').map((s) => s.trim()).filter(Boolean) : [];
  });
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>(() => {
    const param = searchParams.get('transmission_type') || '';
    return param ? param.split(',').map((s) => s.trim()).filter(Boolean) : [];
  });
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>(() => {
    const param = searchParams.get('body_style') || '';
    return param ? param.split(',').map((s) => s.trim()).filter(Boolean) : [];
  });
  const [ownerType, setOwnerType] = useState(searchParams.get('ownership_type') || '');
  const [selectedCities, setSelectedCities] = useState<string[]>(() => {
    const param = searchParams.get('location_city') || '';
    return param ? param.split(',').map((c) => c.trim()).filter(Boolean) : [];
  });
  const [priceMin, setPriceMin] = useState(searchParams.get('listing_price_min') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('listing_price_max') || '');
  const [yearMin, setYearMin] = useState(searchParams.get('model_year_min') || '');
  const [yearMax, setYearMax] = useState(searchParams.get('model_year_max') || '');
  const [kmMax, setKmMax] = useState(searchParams.get('total_km_driven_max') || '');
  const [sortBy, setSortBy] = useState('latest');
  const [activeQuickTags, setActiveQuickTags] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    budget: true, brand: true, fuel: true, transmission: true, body: true,
    year: false, km: false, owner: false, city: true,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchCars = useCallback(() => {
    setLoading(true);
    setError('');
    const sortMap: Record<string, string> = { priceAsc: 'price_asc', priceDesc: 'price_desc', latest: 'newest' };
    // API handles: text search, brand, owner, city, price/year/km ranges, sort
    // Client-side handles: fuelType, transmission, bodyType (multi-select OR logic)
    api.getListings({
      search: search || undefined,
      brand: brand || undefined,
      ownershipType: ownerType || undefined,
      locationCity: selectedCities.length > 0 ? selectedCities.join(',') : undefined,
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined,
      yearMin: yearMin || undefined,
      yearMax: yearMax || undefined,
      kmMax: kmMax || undefined,
      sortBy: sortMap[sortBy] || 'newest',
      limit: 100,
    }).then((resp) => {
      const r = resp as Record<string, unknown>;
      let data = (Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []) as Listing[];
      // Client-side multi-select filters — OR within each, AND between them
      if (selectedFuels.length > 0) data = data.filter((c) => {
        const val = (c.fuel_type ?? c.fuelType ?? '') as string;
        return selectedFuels.includes(val);
      });
      if (selectedTransmissions.length > 0) data = data.filter((c) => {
        const val = (c.transmission_type ?? c.transmissionType ?? '') as string;
        return selectedTransmissions.includes(val);
      });
      if (selectedBodyTypes.length > 0) data = data.filter((c) => {
        const val = (c.body_style ?? c.bodyStyle ?? c.vehicle_type ?? c.vehicleType ?? '') as string;
        return selectedBodyTypes.includes(val);
      });
      if (activeQuickTags.includes('lowkm')) data = data.filter((c) => ((c.total_km_driven ?? c.totalKmDriven ?? 0) as number) < 30000);
      if (activeQuickTags.includes('singleowner')) data = data.filter((c) => c.ownership_type === 'First' || c.ownershipType === 'First');
      setCars(data);
    }).catch(() => {
      setCars([]);
      setError('Failed to load listings. Please try again.');
    }).finally(() => setLoading(false));
  }, [search, brand, selectedFuels, selectedTransmissions, selectedBodyTypes, ownerType, selectedCities, priceMin, priceMax, yearMin, yearMax, kmMax, sortBy, activeQuickTags]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCars(), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchCars]);

  useEffect(() => { setDisplayCount(12); }, [search, brand, selectedFuels, selectedTransmissions, selectedBodyTypes, ownerType, selectedCities, priceMin, priceMax, yearMin, yearMax, kmMax, activeQuickTags]);

  useEffect(() => {
    document.body.style.overflow = mobileFilterOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileFilterOpen]);

  const clearFilters = () => {
    setSearch(''); setBrand(''); setSelectedFuels([]); setSelectedTransmissions([]); setSelectedBodyTypes([]);
    setOwnerType(''); setSelectedCities([]); setPriceMin(''); setPriceMax('');
    setYearMin(''); setYearMax(''); setKmMax(''); setActiveQuickTags([]); setSortBy('latest');
  };

  const toggleCompare = (id: number) => {
    setComparedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? [...prev.slice(1), id] : [...prev, id]);
  };

  const toggleQuickTag = (key: string) => {
    setActiveQuickTags((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]);
  };

  const activeFilterCount = [brand, ...selectedFuels, ...selectedTransmissions, ...selectedBodyTypes, ownerType, ...selectedCities, priceMin, priceMax, yearMin, yearMax, kmMax].filter(Boolean).length;
  const displayedCars = cars.slice(0, displayCount);

  return (
    <main>
      {cars.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Used Cars for Sale',
          url: 'https://searchanycars.com/search',
          numberOfItems: cars.length,
          itemListElement: cars.slice(0, 10).map((car, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `https://searchanycars.com/car/${car.id}`,
            name: car.title,
          })),
        }) }} />
      )}
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
                          onClick={() => { setPriceMin(String(b.min || '')); setPriceMax(String(b.max || '')); }} type="button">{b.label}</button>
                      ))}
                    </div>
                    <PriceRangeSlider min={0} max={5000000} valueMin={priceMin} valueMax={priceMax} onChangeMin={setPriceMin} onChangeMax={setPriceMax} theme="light" />
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
                  Brand {brand ? `(${brand})` : ''} <span className={`chevron ${openSections.brand ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.brand && (
                  <>
                    <input className="filter-input" value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="Search brands..." aria-label="Search brands" />
                    <div className="filter-chips filter-chips-brand">
                      {brandOptions
                        .filter((b) => !brandSearch || b.toLowerCase().includes(brandSearch.toLowerCase()))
                        .map((b) => (
                          <button key={b} className={`filter-chip ${brand === b ? 'active' : ''}`}
                            onClick={() => { setBrand(brand === b ? '' : b); setBrandSearch(''); }} type="button">{b}</button>
                        ))}
                    </div>
                  </>
                )}
              </div>

              {/* Fuel Type */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('fuel')} type="button" aria-expanded={openSections.fuel}>
                  Fuel Type {selectedFuels.length > 0 ? `(${selectedFuels.length})` : ''} <span className={`chevron ${openSections.fuel ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.fuel && (
                  <div className="filter-chips">
                    {fuelTypes.map((f) => <button key={f} className={`filter-chip ${selectedFuels.includes(f) ? 'active' : ''}`} onClick={() => setSelectedFuels((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])} type="button">{f}</button>)}
                  </div>
                )}
              </div>

              {/* Transmission */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('transmission')} type="button" aria-expanded={openSections.transmission}>
                  Transmission {selectedTransmissions.length > 0 ? `(${selectedTransmissions.length})` : ''} <span className={`chevron ${openSections.transmission ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.transmission && (
                  <div className="filter-chips">
                    {transmissions.map((t) => <button key={t} className={`filter-chip ${selectedTransmissions.includes(t) ? 'active' : ''}`} onClick={() => setSelectedTransmissions((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])} type="button">{t}</button>)}
                  </div>
                )}
              </div>

              {/* Body Type */}
              <div className="filter-section">
                <button className="filter-section-title" onClick={() => toggleSection('body')} type="button" aria-expanded={openSections.body}>
                  Body Type {selectedBodyTypes.length > 0 ? `(${selectedBodyTypes.length})` : ''} <span className={`chevron ${openSections.body ? 'open' : ''}`}>▼</span>
                </button>
                {openSections.body && (
                  <div className="filter-chips">
                    {bodyTypes.map((b) => <button key={b} className={`filter-chip ${selectedBodyTypes.includes(b) ? 'active' : ''}`} onClick={() => setSelectedBodyTypes((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b])} type="button">{b}</button>)}
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
                      <button key={c} className={`filter-chip ${selectedCities.includes(c) ? 'active' : ''}`}
                        onClick={() => setSelectedCities((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} type="button">{c}</button>
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

            {/* Results */}
            <div>
              <div className="results-bar">
                <div className="results-count">
                  {loading ? 'Searching...' : error ? <span style={{ color: 'var(--error)' }}>{error}</span> : <><strong>{cars.length}</strong> cars found</>}
                </div>
                {activeFilterCount > 0 && (
                  <div className="active-filters">
                    {brand && <span className="active-filter-pill">{brand} <button onClick={() => setBrand('')} type="button">✕</button></span>}
                    {selectedFuels.map((f) => (
                      <span key={f} className="active-filter-pill">{f} <button onClick={() => setSelectedFuels((prev) => prev.filter((x) => x !== f))} type="button">✕</button></span>
                    ))}
                    {selectedTransmissions.map((t) => (
                      <span key={t} className="active-filter-pill">{t} <button onClick={() => setSelectedTransmissions((prev) => prev.filter((x) => x !== t))} type="button">✕</button></span>
                    ))}
                    {selectedBodyTypes.map((b) => (
                      <span key={b} className="active-filter-pill">{b} <button onClick={() => setSelectedBodyTypes((prev) => prev.filter((x) => x !== b))} type="button">✕</button></span>
                    ))}
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
                      <CarCard key={car.id} car={car} isWishlisted={wishlist.includes(car.id)} onToggleWishlist={contextToggleWishlist} />
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
  );
}
