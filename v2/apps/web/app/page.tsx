'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../src/lib/api';
import { CarCard } from '../src/components/CarCard';
import { TrustBar } from '../src/components/TrustBar';
import { useSiteConfig } from '../src/context/SiteConfigContext';
import { useWishlist } from '../src/context/WishlistContext';
import {
  brands,
  LOGO_BASE,
  CITY_IMAGES,
  howItWorksSteps,
} from '../src/data/homepage';

type Listing = Record<string, unknown> & { id: number; title: string };

export default function HomePage() {
  const router = useRouter();
  const { config } = useSiteConfig();
  const { wishlistIds, toggleWishlist } = useWishlist();

  const [allCars, setAllCars] = useState<Listing[]>([]);
  const [featuredCars, setFeaturedCars] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Hero search state
  const [searchTab, setSearchTab] = useState<'budget' | 'brand'>('budget');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showAllHeroBrands, setShowAllHeroBrands] = useState(false);

  // Featured tabs
  const [featuredTab, setFeaturedTab] = useState('best');

  // Brand browse
  const [brandSearch, setBrandSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getListings({})
      .then((resp) => {
        if (cancelled) return;
        const r = resp as Record<string, unknown>;
        const data = (Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []) as Listing[];
        setAllCars(data);
        setFeaturedCars(
          data
            .filter(
              (c: Listing) => c.featured_listing || c.featuredListing
            )
            .slice(0, 6)
        );
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load cars.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCity = (cityName: string) => {
    setSelectedCities((prev) =>
      prev.includes(cityName) ? prev.filter((c) => c !== cityName) : [...prev, cityName]
    );
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedBudget) {
      const bracket = config.budget_brackets.find((b) => b.label === selectedBudget);
      if (bracket?.min) params.set('listing_price_min', String(bracket.min));
      if (bracket?.max) params.set('listing_price_max', String(bracket.max));
    }
    if (selectedCities.length > 0) params.set('location_city', selectedCities.join(','));
    router.push(`/search?${params.toString()}`);
  };

  const displayedFeatured =
    featuredTab === 'best'
      ? featuredCars
      : featuredTab === 'new'
        ? [...allCars]
            .sort(
              (a, b) =>
                new Date(String(b.created_at ?? b.createdAt ?? 0)).getTime() -
                new Date(String(a.created_at ?? a.createdAt ?? 0)).getTime()
            )
            .slice(0, 6)
        : [...allCars].slice(0, 6);

  return (
    <main>
      {/* ═══ Hero Section ═══ */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>{config.hero.title}</h1>
            <p className="hero-subtitle">{config.hero.subtitle}</p>

            <div className="hero-search">
              <div className="search-tabs">
                <button
                  className={`search-tab ${searchTab === 'budget' ? 'active' : ''}`}
                  onClick={() => setSearchTab('budget')}
                  type="button"
                >
                  Search by Budget
                </button>
                <button
                  className={`search-tab ${searchTab === 'brand' ? 'active' : ''}`}
                  onClick={() => setSearchTab('brand')}
                  type="button"
                >
                  Search by Brand
                </button>
              </div>

              <div className="search-body">
                {searchTab === 'budget' ? (
                  <>
                    <div className="search-budget-grid">
                      {config.budget_brackets.map((b) => (
                        <button
                          key={b.label}
                          className={`budget-chip ${selectedBudget === b.label ? 'active' : ''}`}
                          onClick={() =>
                            setSelectedBudget(selectedBudget === b.label ? '' : b.label)
                          }
                          type="button"
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <div className="search-city-row" style={{ marginTop: '0.75rem' }}>
                      <div className="city-multi-select">
                        <button
                          className="city-multi-select-trigger"
                          onClick={() => setShowCityDropdown((prev) => !prev)}
                          type="button"
                        >
                          <span>
                            {selectedCities.length === 0
                              ? '📍 Select Cities'
                              : `📍 ${selectedCities.length} ${selectedCities.length === 1 ? 'city' : 'cities'}`}
                          </span>
                          <span className={`chevron ${showCityDropdown ? 'open' : ''}`}>
                            ▼
                          </span>
                        </button>
                        {selectedCities.length > 0 && (
                          <div className="city-selected-chips">
                            {selectedCities.map((c) => (
                              <span key={c} className="city-selected-chip">
                                {c}{' '}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCity(c);
                                  }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {showCityDropdown && (
                          <div className="city-multi-dropdown">
                            <div className="city-dropdown-header">
                              <span className="city-dropdown-title">Choose Cities</span>
                              {selectedCities.length > 0 && (
                                <button
                                  className="city-dropdown-clear"
                                  type="button"
                                  onClick={() => setSelectedCities([])}
                                >
                                  Clear all
                                </button>
                              )}
                            </div>
                            <div className="city-dropdown-list">
                              {config.cities.map((c) => (
                                <label
                                  key={c.name}
                                  className={`city-dropdown-item ${selectedCities.includes(c.name) ? 'selected' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedCities.includes(c.name)}
                                    onChange={() => toggleCity(c.name)}
                                  />
                                  <span className="city-dropdown-name">{c.name}</span>
                                  <span className="city-dropdown-count">{c.count}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button className="btn btn-primary" onClick={handleSearch} type="button">
                        Find Your Car
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="search-brand-grid">
                      {(showAllHeroBrands ? brands : brands.slice(0, 10)).map((b) => (
                        <Link
                          key={b.name}
                          href={`/search?brand=${encodeURIComponent(b.name)}`}
                          className="brand-chip"
                        >
                          <img
                            className="brand-logo-img"
                            src={`${LOGO_BASE}/${b.slug}.png`}
                            alt={b.name}
                          />
                          <span className="brand-label">{b.name}</span>
                        </Link>
                      ))}
                    </div>
                    <button
                      className="brand-show-more-btn"
                      onClick={() => setShowAllHeroBrands((prev) => !prev)}
                      type="button"
                    >
                      {showAllHeroBrands ? 'Show Less' : `Show All ${brands.length} Brands`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Trust Bar ═══ */}
      <TrustBar />

      {/* ═══ Browse by Body Type ═══ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Browse by Body Type</h2>
            <Link href="/search" className="text-link">
              View All
            </Link>
          </div>
          <div className="body-type-grid">
            {config.body_types.map((t) => (
              <Link
                key={t.name}
                href={`/search?body_style=${encodeURIComponent(t.name)}`}
                className="body-type-card"
              >
                <span className="body-type-icon">{t.icon}</span>
                <span className="body-type-name">{t.name}</span>
                <span className="body-type-count">{t.count} cars</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Browse by City ═══ */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-head">
            <h2>Browse by City</h2>
          </div>
          <div className="city-browse-grid">
            {config.cities.slice(0, 12).map((c) => (
              <Link
                key={c.name}
                href={`/search?location_city=${encodeURIComponent(c.name)}`}
                className="city-browse-card"
              >
                <div className="city-card-image">
                  <img
                    src={c.image || CITY_IMAGES[c.slug] || ''}
                    alt={c.name}
                    loading="lazy"
                  />
                  <div className="city-card-overlay" />
                </div>
                <div className="city-card-info">
                  <span className="city-card-name">{c.name}</span>
                  <span className="city-card-count">{c.count} cars</span>
                </div>
              </Link>
            ))}
          </div>
          {config.cities.length > 12 && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link href="/search" className="btn btn-outline">
                View All Cities
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══ Browse by Brand ═══ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Browse by Brand</h2>
          </div>
          <div className="brand-search-bar">
            <span className="brand-search-icon">🔍</span>
            <input
              className="brand-search-input"
              type="text"
              placeholder="Search brands..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              aria-label="Search car brands"
            />
            {brandSearch && (
              <button
                className="brand-search-clear"
                onClick={() => setBrandSearch('')}
                type="button"
              >
                ✕
              </button>
            )}
          </div>
          <div className="brand-browse-grid">
            {(brandSearch
              ? brands.filter((b) =>
                  b.name.toLowerCase().includes(brandSearch.toLowerCase())
                )
              : showAllBrands
                ? brands
                : brands.slice(0, 12)
            ).map((b) => (
              <Link
                key={b.name}
                href={`/search?brand=${encodeURIComponent(b.name)}`}
                className="brand-browse-card"
              >
                <img
                  className="brand-logo-img brand-logo-img-lg"
                  src={`${LOGO_BASE}/${b.slug}.png`}
                  alt={b.name}
                />
                <span className="brand-name">{b.name}</span>
              </Link>
            ))}
          </div>
          {!brandSearch && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowAllBrands((prev) => !prev)}
                type="button"
              >
                {showAllBrands ? 'Show Less' : `Show All ${brands.length} Brands`}
              </button>
            </div>
          )}
          {brandSearch &&
            brands.filter((b) =>
              b.name.toLowerCase().includes(brandSearch.toLowerCase())
            ).length === 0 && (
              <p
                style={{
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  marginTop: '1rem',
                  fontSize: '0.9rem',
                }}
              >
                No brands matching &ldquo;{brandSearch}&rdquo;
              </p>
            )}
        </div>
      </section>

      {/* ═══ Featured Cars ═══ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Featured Cars</h2>
            <Link href="/search" className="text-link">
              Browse All
            </Link>
          </div>

          <div className="featured-tabs">
            {[
              { key: 'best', label: 'Best Buys' },
              { key: 'new', label: 'Newly Added' },
              { key: 'all', label: 'All Cars' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`featured-tab ${featuredTab === tab.key ? 'active' : ''}`}
                onClick={() => setFeaturedTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-text-lg skeleton" />
                  <div className="skeleton-text skeleton" />
                  <div className="skeleton-text skeleton" style={{ width: '40%' }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <h3>Could not load cars</h3>
              <p>{error}</p>
              <button
                className="btn btn-primary"
                onClick={() => window.location.reload()}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : displayedFeatured.length === 0 ? (
            <div className="empty-state">
              <h3>No featured cars available</h3>
              <p>Check back soon for new listings.</p>
              <Link href="/search" className="btn btn-primary">
                Browse All Cars
              </Link>
            </div>
          ) : (
            <div className="card-grid">
              {displayedFeatured.map((car: Listing) => (
                <CarCard
                  key={car.id}
                  car={car}
                  isWishlisted={wishlistIds.includes(car.id)}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ Browse by Budget ═══ */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-head">
            <h2>Browse by Budget</h2>
          </div>
          <div className="budget-pills">
            {config.budget_brackets.map((b) => (
              <Link
                key={b.label}
                href={`/search?${[
                  b.min ? `listing_price_min=${b.min}` : '',
                  b.max ? `listing_price_max=${b.max}` : '',
                ]
                  .filter(Boolean)
                  .join('&')}`}
                className="budget-pill"
              >
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ S-Plus Premium Banner ═══ */}
      <section className="splus-home-banner">
        <div className="container">
          <div className="splus-home-banner-content">
            <div className="splus-home-banner-text">
              <div className="splus-badge-label">{config.splus_banner.badge}</div>
              <h2>{config.splus_banner.title}</h2>
              <p>{config.splus_banner.description}</p>
              <Link href="/splus" className="splus-btn-gold">
                Explore S-Plus Collection
              </Link>
            </div>
            <div className="splus-home-banner-features">
              {config.splus_banner.features.map((f) => (
                <div key={f.label} className="splus-home-feature">
                  <span className="splus-home-feature-icon">{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ S-Plus New Banner ═══ */}
      <section className="spn-home-banner">
        <div className="container">
          <div className="spn-home-banner-content">
            <div className="spn-home-banner-text">
              <div className="spn-badge" style={{ marginBottom: '0.5rem' }}>
                {config.spn_banner.badge}
              </div>
              <h2>{config.spn_banner.title}</h2>
              <p>{config.spn_banner.description}</p>
              <Link
                href="/splus-new"
                className="spn-btn-primary"
                style={{ display: 'inline-block' }}
              >
                Explore New Cars
              </Link>
            </div>
            <div className="spn-home-banner-features">
              {config.spn_banner.features.map((f) => (
                <div key={f.label} className="spn-home-feature">
                  <span className="spn-home-feature-icon">{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Browse by Fuel Type ═══ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Browse by Fuel Type</h2>
          </div>
          <div className="fuel-type-grid">
            {config.fuel_types.map((f) => (
              <Link
                key={f.name}
                href={`/search?fuel_type=${encodeURIComponent(f.name)}`}
                className="fuel-type-card"
              >
                <span className="fuel-type-icon">{f.icon}</span>
                <span className="fuel-type-name">{f.name}</span>
                <span className="fuel-type-count">{f.count} cars</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-head" style={{ justifyContent: 'center' }}>
            <h2>How It Works</h2>
          </div>
          <div className="how-it-works-grid">
            {howItWorksSteps.map((step) => (
              <div key={step.num} className="how-step">
                <div className="how-step-icon">{step.icon}</div>
                <span className="how-step-num">{step.num}</span>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Customer Reviews ═══ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>What Our Customers Say</h2>
            <span style={{ color: '#FFC107', fontSize: '1.1rem' }}>
              ★★★★★{' '}
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                4.8/5 rating
              </span>
            </span>
          </div>
          <div className="reviews-grid">
            {config.reviews.map((r) => (
              <div key={r.name} className="review-card">
                <div className="review-stars">{'★'.repeat(r.rating)}</div>
                <p className="review-text">&ldquo;{r.text}&rdquo;</p>
                <div className="review-author">
                  <div className="review-avatar">{r.name[0]}</div>
                  <div>
                    <div className="review-name">{r.name}</div>
                    <div className="review-meta">
                      {r.city} &middot; Bought {r.car}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Sell Your Car CTA ═══ */}
      <section className="section">
        <div className="container">
          <div className="sell-cta-section">
            <div>
              <h2>{config.sell_cta.title}</h2>
              <p>{config.sell_cta.description}</p>
            </div>
            <Link href="/sell" className="btn btn-primary btn-lg">
              Sell Your Car &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
