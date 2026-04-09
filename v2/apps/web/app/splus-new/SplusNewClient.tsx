'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../src/lib/api';
import { CarCard } from '../../src/components/CarCard';
import { useWishlist } from '../../src/context/WishlistContext';
import { PriceRangeSlider } from '../../src/components/PriceRangeSlider';

type Listing = Record<string, unknown> & { id: number; title: string };

const brandOptions = [
  'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Jaguar', 'Land Rover',
  'Volvo', 'Lexus', 'Rolls-Royce', 'Bentley', 'Mini', 'Toyota',
  'Hyundai', 'Tata', 'Kia', 'Mahindra', 'Honda', 'Volkswagen', 'Škoda', 'Jeep',
];
const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
const bodyTypes = ['Luxury Sedan', 'Luxury SUV', 'SUV', 'Sedan', 'Coupe', 'Convertible'];
const carTypes = [
  { label: 'Unregistered', value: 'Unregistered' },
  { label: 'Demo', value: 'Demo' },
  { label: 'Display Model', value: 'Display' },
  { label: 'Test Drive', value: 'TestDrive' },
];
const sortOptions = [
  { value: 'latest', label: 'Recommended' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
];
const quickTags = [
  { label: 'Factory Fresh', key: 'factoryfresh' },
  { label: 'Full Warranty', key: 'fullwarranty' },
];
const budgetPresets = [
  { label: '₹10-20L', min: 1000000, max: 2000000 },
  { label: '₹20-40L', min: 2000000, max: 4000000 },
  { label: '₹40-60L', min: 4000000, max: 6000000 },
  { label: '₹60L-1Cr', min: 6000000, max: 10000000 },
  { label: '₹1Cr+', min: 10000000, max: 0 },
];
const highlights = [
  { icon: '◇', title: 'Zero KM' },
  { icon: '★', title: 'Full Factory Warranty' },
  { icon: '◈', title: 'First Registration' },
  { icon: '⟐', title: 'Authorized Dealers' },
];

export default function SplusNewClient() {
  const [cars, setCars] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comparedIds, setComparedIds] = useState<number[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const { wishlistIds: wishlist, toggleWishlist: contextToggleWishlist } = useWishlist();

  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([]);
  const [carType, setCarType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [activeQuickTags, setActiveQuickTags] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    type: true, budget: true, brand: true, fuel: true, body: true,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchCars = useCallback(() => {
    setLoading(true);
    setError('');
    const sortMap: Record<string, string> = { priceAsc: 'price_asc', priceDesc: 'price_desc', latest: 'newest' };
    // API handles: search, brand, price range, sort, isNewCar flag
    // Client-side handles: fuel, bodyType, carType (multi-select OR logic)
    api.getListings({
      isNewCar: 'true',
      search: search || undefined,
      brand: brand || undefined,
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined,
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
      if (selectedBodyTypes.length > 0) data = data.filter((c) => {
        const val = (c.body_style ?? c.bodyStyle ?? c.vehicle_type ?? c.vehicleType ?? '') as string;
        return selectedBodyTypes.includes(val);
      });
      if (carType) data = data.filter((c) => c.new_car_type === carType || c.newCarType === carType);
      if (activeQuickTags.includes('factoryfresh')) data = data.filter((c) => ((c.total_km_driven ?? c.totalKmDriven ?? 0) as number) === 0);
      if (activeQuickTags.includes('fullwarranty')) data = data.filter((c) => c.warranty_available === true || c.warrantyAvailable === true || c.is_new_car === true || c.isNewCar === true);
      setCars(data);
    }).catch(() => {
      setCars([]);
      setError('Failed to load listings. Please try again.');
    }).finally(() => setLoading(false));
  }, [search, brand, selectedFuels, selectedBodyTypes, carType, priceMin, priceMax, sortBy, activeQuickTags]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCars(), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchCars]);

  useEffect(() => { setDisplayCount(12); }, [search, brand, selectedFuels, selectedBodyTypes, carType, priceMin, priceMax, activeQuickTags]);

  useEffect(() => {
    document.body.style.overflow = mobileFilterOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileFilterOpen]);

  const clearFilters = () => {
    setSearch(''); setBrand(''); setBrandSearch(''); setSelectedFuels([]); setSelectedBodyTypes([]); setCarType('');
    setPriceMin(''); setPriceMax(''); setActiveQuickTags([]); setSortBy('latest');
  };

  const toggleCompare = (id: number) => {
    setComparedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? [...prev.slice(1), id] : [...prev, id]);
  };

  const toggleQuickTag = (key: string) => {
    setActiveQuickTags((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]);
  };

  const activeFilterCount = [brand, ...selectedFuels, ...selectedBodyTypes, carType, priceMin, priceMax].filter(Boolean).length;
  const displayedCars = cars.slice(0, displayCount);

  return (
    <main className="spn-page">
      {/* Teal-themed Hero */}
      <section className="spn-hero-compact">
        <div className="container">
          <div className="spn-hero-compact-inner">
            <div className="spn-hero-compact-left">
              <div className="spn-badge">S-Plus New</div>
              <h1>Factory Fresh. Zero Owners. Your Name First.</h1>
              <p>{cars.length} premium new cars available — 0 km driven</p>
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
                <span className="spn-highlight-title">{h.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Tags */}
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
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </button>

          <div className="spn-layout">
            {mobileFilterOpen && <div className="filter-panel-backdrop" onClick={() => setMobileFilterOpen(false)} />}
            <aside className={`spn-filter-panel ${mobileFilterOpen ? 'filter-panel-open' : ''}`}>
              <div className="spn-filter-header">
                <h3>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="spn-filter-clear-all" onClick={clearFilters} type="button">Clear All</button>
                  <button className="filter-panel-close" onClick={() => setMobileFilterOpen(false)} type="button">&#10005;</button>
                </div>
              </div>

              {/* Search */}
              <div className="spn-filter-section-item">
                <input className="spn-filter-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cars, brands..." aria-label="Search cars" />
              </div>

              {/* Car Type */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('type')} type="button" aria-expanded={openSections.type}>
                  Car Type <span className={`spn-chevron ${openSections.type ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.type && (
                  <div className="spn-filter-chips">
                    {carTypes.map((t) => (
                      <button key={t.value} className={`spn-filter-chip ${carType === t.value ? 'active' : ''}`} onClick={() => setCarType(carType === t.value ? '' : t.value)} type="button">{t.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Budget */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('budget')} type="button" aria-expanded={openSections.budget}>
                  Budget / Price <span className={`spn-chevron ${openSections.budget ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.budget && (
                  <>
                    <div className="spn-filter-chips" style={{ marginBottom: '0.5rem' }}>
                      {budgetPresets.map((b) => (
                        <button key={b.label} className={`spn-filter-chip ${priceMin === String(b.min || '') && priceMax === String(b.max || '') ? 'active' : ''}`}
                          onClick={() => { setPriceMin(String(b.min || '')); setPriceMax(String(b.max || '')); }} type="button">{b.label}</button>
                      ))}
                    </div>
                    <PriceRangeSlider min={0} max={200000000} valueMin={priceMin} valueMax={priceMax} onChangeMin={setPriceMin} onChangeMax={setPriceMax} theme="dark-green" />
                    <div className="spn-filter-range">
                      <input className="spn-filter-input" type="number" placeholder="Min ₹" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} aria-label="Minimum price" />
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                      <input className="spn-filter-input" type="number" placeholder="Max ₹" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} aria-label="Maximum price" />
                    </div>
                  </>
                )}
              </div>

              {/* Brand */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('brand')} type="button" aria-expanded={openSections.brand}>
                  Brand {brand ? `(${brand})` : ''} <span className={`spn-chevron ${openSections.brand ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.brand && (
                  <>
                    <input className="spn-filter-input" value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="Search brands..." aria-label="Search brands" />
                    <div className="spn-filter-chips" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {brandOptions
                        .filter((b) => !brandSearch || b.toLowerCase().includes(brandSearch.toLowerCase()))
                        .map((b) => (
                          <button key={b} className={`spn-filter-chip ${brand === b ? 'active' : ''}`}
                            onClick={() => { setBrand(brand === b ? '' : b); setBrandSearch(''); }} type="button">{b}</button>
                        ))}
                    </div>
                  </>
                )}
              </div>

              {/* Fuel Type */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('fuel')} type="button" aria-expanded={openSections.fuel}>
                  Fuel Type {selectedFuels.length > 0 ? `(${selectedFuels.length})` : ''} <span className={`spn-chevron ${openSections.fuel ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.fuel && (
                  <div className="spn-filter-chips">
                    {fuelTypes.map((f) => <button key={f} className={`spn-filter-chip ${selectedFuels.includes(f) ? 'active' : ''}`} onClick={() => setSelectedFuels((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])} type="button">{f}</button>)}
                  </div>
                )}
              </div>

              {/* Body Type */}
              <div className="spn-filter-section-item">
                <button className="spn-filter-title" onClick={() => toggleSection('body')} type="button" aria-expanded={openSections.body}>
                  Body Type {selectedBodyTypes.length > 0 ? `(${selectedBodyTypes.length})` : ''} <span className={`spn-chevron ${openSections.body ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.body && (
                  <div className="spn-filter-chips">
                    {bodyTypes.map((b) => <button key={b} className={`spn-filter-chip ${selectedBodyTypes.includes(b) ? 'active' : ''}`} onClick={() => setSelectedBodyTypes((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b])} type="button">{b}</button>)}
                  </div>
                )}
              </div>

              <div className="filter-panel-apply spn-filter-apply">
                <button className="btn btn-primary" onClick={() => setMobileFilterOpen(false)} type="button" style={{ width: '100%' }}>
                  Show {cars.length} Cars
                </button>
              </div>
            </aside>

            {/* Results */}
            <div>
              <div className="spn-results-bar">
                <div className="spn-results-info">
                  {loading ? 'Discovering factory-fresh cars...' : error ? <span style={{ color: 'var(--error)' }}>{error}</span> : <><strong>{cars.length}</strong> factory-fresh {cars.length === 1 ? 'car' : 'cars'} found</>}
                </div>
                {activeFilterCount > 0 && (
                  <div className="spn-active-filters">
                    {carType && <span className="spn-active-pill">{carType} <button onClick={() => setCarType('')} type="button">&#10005;</button></span>}
                    {brand && <span className="spn-active-pill">{brand} <button onClick={() => setBrand('')} type="button">&#10005;</button></span>}
                    {selectedFuels.map((f) => (
                      <span key={f} className="spn-active-pill">{f} <button onClick={() => setSelectedFuels((prev) => prev.filter((x) => x !== f))} type="button">&#10005;</button></span>
                    ))}
                    {selectedBodyTypes.map((b) => (
                      <span key={b} className="spn-active-pill">{b} <button onClick={() => setSelectedBodyTypes((prev) => prev.filter((x) => x !== b))} type="button">&#10005;</button></span>
                    ))}
                  </div>
                )}
                <div className="sort-pills sort-pills-dark">
                  {sortOptions.map((o) => (
                    <button key={o.value} className={`sort-pill sort-pill-emerald ${sortBy === o.value ? 'active' : ''}`} onClick={() => setSortBy(o.value)} type="button">
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
                      <button className="btn btn-outline" onClick={() => setDisplayCount((c) => c + 12)} type="button">Discover More Cars</button>
                      <p className="showing-text">Showing {Math.min(displayCount, cars.length)} of {cars.length} cars</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <h3>No cars match your criteria</h3>
                  <p>Try adjusting your filters or check back soon for new arrivals.</p>
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
