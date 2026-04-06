'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../src/lib/api';
import { CarCard } from '../../src/components/CarCard';
import { useWishlist } from '../../src/context/WishlistContext';
import { PriceRangeSlider } from '../../src/components/PriceRangeSlider';

type Listing = Record<string, unknown> & { id: number; title: string };

const cityOptions = [
  'New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Kolkata', 'Chandigarh', 'Kochi',
  'Coimbatore', 'Indore', 'Nagpur', 'Surat', 'Vizag', 'Mysuru', 'Bhopal', 'Thiruvananthapuram',
];
const fuelTypes = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'LPG'];
const transmissions = ['Manual', 'Automatic', 'AMT', 'CVT', 'DCT'];
const bodyTypes = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury Sedan', 'Luxury SUV', 'Coupe', 'Pickup'];
const ownerTypes = ['First', 'Second', 'Third', 'Fourth+'];
const colors = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Brown'];
const sortOptions = [
  { value: 'latest', label: 'Recommended' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
];
const quickTags = [
  { label: 'Low KM', key: 'lowkm' },
  { label: 'Single Owner', key: 'singleowner' },
  { label: 'Under 30K km', key: 'under30k' },
];
const budgetPresets = [
  { label: '₹15-25L', min: 1500000, max: 2500000 },
  { label: '₹25-40L', min: 2500000, max: 4000000 },
  { label: '₹40-60L', min: 4000000, max: 6000000 },
  { label: '₹60L-1Cr', min: 6000000, max: 10000000 },
  { label: '₹1Cr+', min: 10000000, max: 0 },
];

export default function SplusClient() {
  const [cars, setCars] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comparedIds, setComparedIds] = useState<number[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const { wishlistIds: wishlist, toggleWishlist: contextToggleWishlist } = useWishlist();

  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [ownerType, setOwnerType] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [kmMax, setKmMax] = useState('');
  const [color, setColor] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [activeQuickTags, setActiveQuickTags] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    budget: true, brand: true, fuel: true, transmission: true, body: true,
    year: false, km: true, owner: false, city: false, color: false,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchCars = useCallback(() => {
    setLoading(true);
    setError('');
    const sortMap: Record<string, string> = { priceAsc: 'price_asc', priceDesc: 'price_desc', latest: 'newest' };
    api.getListings({
      isSplus: 'true',
      search: search || undefined,
      brand: brand || undefined,
      fuelType: fuelType || undefined,
      transmissionType: transmission || undefined,
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
      if (bodyType) data = data.filter((c) => c.body_style === bodyType || c.bodyStyle === bodyType || c.vehicle_type === bodyType || c.vehicleType === bodyType);
      if (color) data = data.filter((c) => ((c.exterior_color ?? c.exteriorColor ?? '') as string).toLowerCase().includes(color.toLowerCase()));
      if (activeQuickTags.includes('lowkm')) data = data.filter((c) => ((c.total_km_driven ?? c.totalKmDriven ?? 0) as number) < 30000);
      if (activeQuickTags.includes('singleowner')) data = data.filter((c) => c.ownership_type === 'First' || c.ownershipType === 'First');
      if (activeQuickTags.includes('under30k')) data = data.filter((c) => ((c.total_km_driven ?? c.totalKmDriven ?? 0) as number) < 30000);
      setCars(data);
    }).catch(() => {
      setCars([]);
      setError('Failed to load listings. Please try again.');
    }).finally(() => setLoading(false));
  }, [search, brand, fuelType, transmission, bodyType, ownerType, selectedCities, priceMin, priceMax, yearMin, yearMax, kmMax, color, sortBy, activeQuickTags]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCars(), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchCars]);

  useEffect(() => { setDisplayCount(12); }, [search, brand, fuelType, transmission, bodyType, ownerType, selectedCities, priceMin, priceMax, yearMin, yearMax, kmMax, color, activeQuickTags]);

  useEffect(() => {
    document.body.style.overflow = mobileFilterOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileFilterOpen]);

  const clearFilters = () => {
    setSearch(''); setBrand(''); setFuelType(''); setTransmission(''); setBodyType('');
    setOwnerType(''); setSelectedCities([]); setPriceMin(''); setPriceMax('');
    setYearMin(''); setYearMax(''); setKmMax(''); setColor(''); setActiveQuickTags([]); setSortBy('latest');
  };

  const toggleCompare = (id: number) => {
    setComparedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? [...prev.slice(1), id] : [...prev, id]);
  };

  const toggleQuickTag = (key: string) => {
    setActiveQuickTags((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]);
  };

  const activeFilterCount = [brand, fuelType, transmission, bodyType, ownerType, color, ...selectedCities, priceMin, priceMax, yearMin, yearMax, kmMax].filter(Boolean).length;
  const displayedCars = cars.slice(0, displayCount);

  return (
    <main className="splus-page">
      {/* Gold-themed Hero */}
      <section className="splus-hero-compact">
        <div className="container">
          <div className="splus-hero-compact-inner">
            <div className="splus-hero-compact-left">
              <div className="splus-badge-label">S-Plus Premium</div>
              <h1>Luxury. Curated. Certified.</h1>
              <p>{cars.length} premium cars available</p>
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

          <div className="splus-layout">
            {mobileFilterOpen && <div className="filter-panel-backdrop" onClick={() => setMobileFilterOpen(false)} />}
            <aside className={`sp-filter-panel ${mobileFilterOpen ? 'filter-panel-open' : ''}`}>
              <div className="sp-filter-header">
                <h3>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="sp-filter-clear" onClick={clearFilters} type="button">Clear All</button>
                  <button className="filter-panel-close" onClick={() => setMobileFilterOpen(false)} type="button">&#10005;</button>
                </div>
              </div>

              {/* Search */}
              <div className="sp-filter-section">
                <input className="sp-filter-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cars, brands..." aria-label="Search cars" />
              </div>

              {/* Budget */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('budget')} type="button" aria-expanded={openSections.budget}>
                  Budget / Price <span className={`sp-chevron ${openSections.budget ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.budget && (
                  <>
                    <div className="sp-filter-chips" style={{ marginBottom: '0.5rem' }}>
                      {budgetPresets.map((b) => (
                        <button key={b.label} className={`sp-filter-chip ${priceMin === String(b.min || '') && priceMax === String(b.max || '') ? 'active' : ''}`}
                          onClick={() => { setPriceMin(String(b.min || '')); setPriceMax(String(b.max || '')); }} type="button">{b.label}</button>
                      ))}
                    </div>
                    <PriceRangeSlider min={0} max={200000000} valueMin={priceMin} valueMax={priceMax} onChangeMin={setPriceMin} onChangeMax={setPriceMax} theme="dark" />
                    <div className="sp-filter-range">
                      <input className="sp-filter-input" type="number" placeholder="Min ₹" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} aria-label="Minimum price" />
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                      <input className="sp-filter-input" type="number" placeholder="Max ₹" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} aria-label="Maximum price" />
                    </div>
                  </>
                )}
              </div>

              {/* Brand */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('brand')} type="button" aria-expanded={openSections.brand}>
                  Brand <span className={`sp-chevron ${openSections.brand ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.brand && <input className="sp-filter-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., BMW, Mercedes..." aria-label="Brand filter" />}
              </div>

              {/* Fuel Type */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('fuel')} type="button" aria-expanded={openSections.fuel}>
                  Fuel Type <span className={`sp-chevron ${openSections.fuel ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.fuel && (
                  <div className="sp-filter-chips">
                    {fuelTypes.map((f) => <button key={f} className={`sp-filter-chip ${fuelType === f ? 'active' : ''}`} onClick={() => setFuelType(fuelType === f ? '' : f)} type="button">{f}</button>)}
                  </div>
                )}
              </div>

              {/* Transmission */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('transmission')} type="button" aria-expanded={openSections.transmission}>
                  Transmission <span className={`sp-chevron ${openSections.transmission ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.transmission && (
                  <div className="sp-filter-chips">
                    {transmissions.map((t) => <button key={t} className={`sp-filter-chip ${transmission === t ? 'active' : ''}`} onClick={() => setTransmission(transmission === t ? '' : t)} type="button">{t}</button>)}
                  </div>
                )}
              </div>

              {/* Body Type */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('body')} type="button" aria-expanded={openSections.body}>
                  Body Type <span className={`sp-chevron ${openSections.body ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.body && (
                  <div className="sp-filter-chips">
                    {bodyTypes.map((b) => <button key={b} className={`sp-filter-chip ${bodyType === b ? 'active' : ''}`} onClick={() => setBodyType(bodyType === b ? '' : b)} type="button">{b}</button>)}
                  </div>
                )}
              </div>

              {/* Year */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('year')} type="button" aria-expanded={openSections.year}>
                  Year <span className={`sp-chevron ${openSections.year ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.year && (
                  <div className="sp-filter-range">
                    <input className="sp-filter-input" type="number" placeholder="From" value={yearMin} onChange={(e) => setYearMin(e.target.value)} aria-label="Minimum year" />
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                    <input className="sp-filter-input" type="number" placeholder="To" value={yearMax} onChange={(e) => setYearMax(e.target.value)} aria-label="Maximum year" />
                  </div>
                )}
              </div>

              {/* KM Driven */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('km')} type="button" aria-expanded={openSections.km}>
                  Kilometers <span className={`sp-chevron ${openSections.km ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.km && (
                  <div className="sp-filter-chips">
                    {[{ label: 'Under 10K', val: '10000' }, { label: 'Under 30K', val: '30000' }, { label: 'Under 50K', val: '50000' }, { label: 'Under 1L', val: '100000' }].map((opt) => (
                      <button key={opt.val} className={`sp-filter-chip ${kmMax === opt.val ? 'active' : ''}`} onClick={() => setKmMax(kmMax === opt.val ? '' : opt.val)} type="button">{opt.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Owner */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('owner')} type="button" aria-expanded={openSections.owner}>
                  Owners <span className={`sp-chevron ${openSections.owner ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.owner && (
                  <div className="sp-filter-chips">
                    {ownerTypes.map((o) => <button key={o} className={`sp-filter-chip ${ownerType === o ? 'active' : ''}`} onClick={() => setOwnerType(ownerType === o ? '' : o)} type="button">{o} Owner</button>)}
                  </div>
                )}
              </div>

              {/* City */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('city')} type="button" aria-expanded={openSections.city}>
                  City {selectedCities.length > 0 ? `(${selectedCities.length})` : ''} <span className={`sp-chevron ${openSections.city ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.city && (
                  <div className="sp-filter-chips sp-filter-chips-city">
                    {cityOptions.map((c) => (
                      <button key={c} className={`sp-filter-chip ${selectedCities.includes(c) ? 'active' : ''}`}
                        onClick={() => setSelectedCities((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} type="button">{c}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Color */}
              <div className="sp-filter-section">
                <button className="sp-filter-title" onClick={() => toggleSection('color')} type="button" aria-expanded={openSections.color}>
                  Exterior Color <span className={`sp-chevron ${openSections.color ? 'open' : ''}`}>&#9660;</span>
                </button>
                {openSections.color && (
                  <div className="sp-filter-chips">
                    {colors.map((c) => <button key={c} className={`sp-filter-chip ${color === c ? 'active' : ''}`} onClick={() => setColor(color === c ? '' : c)} type="button">{c}</button>)}
                  </div>
                )}
              </div>

              <div className="filter-panel-apply sp-filter-apply">
                <button className="btn btn-primary" onClick={() => setMobileFilterOpen(false)} type="button" style={{ width: '100%' }}>
                  Show {cars.length} Cars
                </button>
              </div>
            </aside>

            {/* Results */}
            <div>
              <div className="sp-results-bar">
                <div className="sp-results-info">
                  {loading ? 'Loading premium cars...' : error ? <span style={{ color: 'var(--error)' }}>{error}</span> : <><strong>{cars.length}</strong> premium {cars.length === 1 ? 'car' : 'cars'} found</>}
                </div>
                {activeFilterCount > 0 && (
                  <div className="sp-active-filters">
                    {brand && <span className="sp-active-pill">{brand} <button onClick={() => setBrand('')} type="button">&#10005;</button></span>}
                    {fuelType && <span className="sp-active-pill">{fuelType} <button onClick={() => setFuelType('')} type="button">&#10005;</button></span>}
                    {transmission && <span className="sp-active-pill">{transmission} <button onClick={() => setTransmission('')} type="button">&#10005;</button></span>}
                    {bodyType && <span className="sp-active-pill">{bodyType} <button onClick={() => setBodyType('')} type="button">&#10005;</button></span>}
                    {ownerType && <span className="sp-active-pill">{ownerType} Owner <button onClick={() => setOwnerType('')} type="button">&#10005;</button></span>}
                    {color && <span className="sp-active-pill">{color} <button onClick={() => setColor('')} type="button">&#10005;</button></span>}
                    {selectedCities.map((c) => (
                      <span key={c} className="sp-active-pill">{c} <button onClick={() => setSelectedCities((prev) => prev.filter((x) => x !== c))} type="button">&#10005;</button></span>
                    ))}
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
                      <button className="btn btn-outline" onClick={() => setDisplayCount((c) => c + 12)} type="button">Load More Premium Cars</button>
                      <p className="showing-text">Showing {Math.min(displayCount, cars.length)} of {cars.length} cars</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <h3>No premium cars match your filters</h3>
                  <p>Try adjusting your filters or removing some constraints.</p>
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
