import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { CarCard } from '../components/CarCard'
import { BookTestDriveModal } from '../components/BookTestDriveModal'
import { ReserveCarModal } from '../components/ReserveCarModal'
import type { Listing } from '../types'
import {
  formatINR, formatINRFull, formatKM, calculateMonthlyPayment,
  PLACEHOLDER_CAR_IMAGE, DEFAULT_LOAN_PERCENT,
  DEFAULT_INTEREST_RATE, DEFAULT_TENURE_MONTHS,
} from '../utils/format'
import { useWishlist } from '../context/WishlistContext'

export const CarDetailPage = () => {
  const { id } = useParams()
  const listingId = Number(id)

  const [car, setCar] = useState<Listing | null>(null)
  const [similarCars, setSimilarCars] = useState<Listing[]>([])
  const [selectedImage, setSelectedImage] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showTestDrive, setShowTestDrive] = useState(false)
  const [showReserve, setShowReserve] = useState(false)

  // Touch swipe for gallery
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // EMI Calculator
  const [downPayment, setDownPayment] = useState(20)
  const [tenure, setTenure] = useState(48)
  const [interestRate, setInterestRate] = useState(10.5)

  // Specs accordion
  const [openSpecs, setOpenSpecs] = useState<Record<string, boolean>>({ engine: true })

  const { wishlistIds: wishlist, toggleWishlist: contextToggleWishlist } = useWishlist()

  useEffect(() => {
    if (!Number.isFinite(listingId)) {
      const timer = setTimeout(() => setLoading(false), 0)
      return () => clearTimeout(timer)
    }
    let cancelled = false
    api.getListingById(listingId).then(async (listing) => {
      if (cancelled) return
      setCar(listing)
      const related = await api.getListings({ categoryId: listing.category_id ?? undefined })
      if (!cancelled) setSimilarCars(related.filter((c) => c.id !== listing.id).slice(0, 4))
    }).catch(() => { if (!cancelled) setCar(null) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [listingId])

  const toggleWishlist = (carId: number) => contextToggleWishlist(carId)

  if (loading) {
    return (
      <main className="section">
        <div className="container">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 24, width: '60%' }} />
            <div className="skeleton" style={{ height: 16, width: '40%' }} />
          </div>
        </div>
      </main>
    )
  }

  if (!car) {
    return (
      <main className="section">
        <div className="container">
          <div className="empty-state">
            <h3>Car Not Found</h3>
            <p>This listing may have been removed or sold.</p>
            <Link to="/search" className="btn btn-primary">Browse Cars</Link>
          </div>
        </div>
      </main>
    )
  }

  const images = car.images.length > 0 ? car.images : [PLACEHOLDER_CAR_IMAGE]

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe && images.length > 1) {
      setSelectedImage((i) => (i + 1) % images.length)
    }
    if (isRightSwipe && images.length > 1) {
      setSelectedImage((i) => (i - 1 + images.length) % images.length)
    }
  }

  const loanAmount = car.listing_price_inr * (1 - downPayment / 100)
  const monthlyEMI = calculateMonthlyPayment(loanAmount, interestRate, tenure)
  const totalPayable = monthlyEMI * tenure
  const totalInterest = totalPayable - loanAmount

  const isWishlisted = wishlist.includes(car.id)

  return (
    <main>
      <div className="section-sm">
        <div className="container">
          {/* Breadcrumb */}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <Link to="/" style={{ color: 'var(--text-secondary)' }}>Home</Link>
            {' / '}
            <Link to="/search" style={{ color: 'var(--text-secondary)' }}>Used Cars</Link>
            {' / '}
            <span>{car.title}</span>
          </div>

          <div className="vdp-layout">
            {/* Left Column */}
            <div>
              {/* Image Gallery */}
              <div className="gallery">
                <div className="gallery-main" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                  <img src={images[selectedImage]} alt={`${car.title} - Photo ${selectedImage + 1}`} />

                  {images.length > 1 && (
                    <>
                      <button
                        className="gallery-nav-btn prev"
                        onClick={() => setSelectedImage((i) => (i - 1 + images.length) % images.length)}
                        type="button"
                        aria-label="Previous image"
                      >
                        ‹
                      </button>
                      <button
                        className="gallery-nav-btn next"
                        onClick={() => setSelectedImage((i) => (i + 1) % images.length)}
                        type="button"
                        aria-label="Next image"
                      >
                        ›
                      </button>
                    </>
                  )}

                  <span className="gallery-counter">
                    {selectedImage + 1} / {images.length}
                  </span>

                  <button
                    className="gallery-fullscreen-btn"
                    onClick={() => setFullscreen(true)}
                    type="button"
                    aria-label="View fullscreen gallery"
                  >
                    ⛶
                  </button>
                </div>

                {images.length > 1 && (
                  <div className="gallery-thumbs">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        className={`gallery-thumb ${selectedImage === i ? 'active' : ''}`}
                        onClick={() => setSelectedImage(i)}
                        type="button"
                      >
                        <img src={img} alt={`Thumb ${i + 1}`} loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Specs Strip */}
              <div className="quick-specs">
                <div className="quick-spec">
                  <span className="quick-spec-icon">📅</span>
                  <span className="quick-spec-value">{car.model_year ?? '-'}</span>
                  <span className="quick-spec-label">Year</span>
                </div>
                <div className="quick-spec">
                  <span className="quick-spec-icon">🛣️</span>
                  <span className="quick-spec-value">{formatKM(car.total_km_driven ?? 0)}</span>
                  <span className="quick-spec-label">Driven</span>
                </div>
                <div className="quick-spec">
                  <span className="quick-spec-icon">⛽</span>
                  <span className="quick-spec-value">{car.fuel_type ?? '-'}</span>
                  <span className="quick-spec-label">Fuel</span>
                </div>
                <div className="quick-spec">
                  <span className="quick-spec-icon">⚙️</span>
                  <span className="quick-spec-value">{car.transmission_type ?? '-'}</span>
                  <span className="quick-spec-label">Transmission</span>
                </div>
                <div className="quick-spec">
                  <span className="quick-spec-icon">👤</span>
                  <span className="quick-spec-value">{car.ownership_type ?? '-'}</span>
                  <span className="quick-spec-label">Owner</span>
                </div>
                <div className="quick-spec">
                  <span className="quick-spec-icon">📍</span>
                  <span className="quick-spec-value">{car.registration_state ?? '-'}</span>
                  <span className="quick-spec-label">Reg. State</span>
                </div>
              </div>

              {/* Overview */}
              <div className="overview-section">
                <div className="detail-section-head">
                  <h3>Car Overview</h3>
                </div>
                <div className="overview-grid">
                  {[
                    ['Registration Year', car.registration_year ?? '-'],
                    ['Manufacturing Year', car.model_year ?? '-'],
                    ['Kilometers Driven', car.total_km_driven ? formatKM(car.total_km_driven) : '-'],
                    ['Fuel Type', car.fuel_type ?? '-'],
                    ['Transmission', car.transmission_type ?? '-'],
                    ['Owners', car.ownership_type ? `${car.ownership_type} Owner` : '-'],
                    ['Registration State', car.registration_state ?? '-'],
                    ['Color', car.exterior_color ?? '-'],
                    ['Mileage', car.mileage_kmpl ? `${car.mileage_kmpl} kmpl` : '-'],
                    ['Insurance', car.inspection_status === 'Completed' ? 'Comprehensive' : '-'],
                    ['Condition Rating', car.overall_condition_rating ? `${car.overall_condition_rating}/10` : '-'],
                    ['Inspection Score', car.inspection_score ? `${car.inspection_score}/100` : '-'],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="overview-item">
                      <span className="overview-label">{label}</span>
                      <span className="overview-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Specifications */}
              <div className="specs-section">
                <div className="detail-section-head">
                  <h3>Detailed Specifications</h3>
                </div>
                {[
                  {
                    key: 'engine',
                    title: 'Engine & Performance',
                    specs: [
                      ['Engine', car.engine_type ?? '-'],
                      ['Capacity', car.engine_capacity_cc ? `${car.engine_capacity_cc} cc` : '-'],
                      ['Power', car.power_bhp ? `${car.power_bhp} bhp` : '-'],
                      ['Transmission', car.transmission_type ?? '-'],
                      ['Fuel Type', car.fuel_type ?? '-'],
                      ['Mileage', car.mileage_kmpl ? `${car.mileage_kmpl} kmpl` : '-'],
                    ],
                  },
                  {
                    key: 'safety',
                    title: 'Safety Features',
                    specs: [
                      ['Airbags', car.airbags_count ? `${car.airbags_count} Airbags` : '-'],
                      ['ABS', car.specs?.abs ? 'Yes' : 'Standard'],
                      ['EBD', 'Yes'],
                      ['Parking Sensors', 'Rear'],
                      ['Reverse Camera', 'Yes'],
                      ['ISOFIX', 'Yes'],
                    ],
                  },
                  {
                    key: 'comfort',
                    title: 'Comfort & Convenience',
                    specs: [
                      ['AC Type', 'Automatic Climate Control'],
                      ['Infotainment', car.infotainment_screen_size ? `${car.infotainment_screen_size}" Touchscreen` : '-'],
                      ['Keyless Entry', 'Yes'],
                      ['Push Start', 'Yes'],
                      ['Cruise Control', 'Yes'],
                      ['Steering', 'Power (EPS)'],
                    ],
                  },
                ].map((category) => (
                  <div key={category.key} className="specs-category">
                    <button
                      className="specs-category-title"
                      onClick={() => setOpenSpecs((prev) => ({ ...prev, [category.key]: !prev[category.key] }))}
                      type="button"
                    >
                      {category.title}
                      <span style={{ fontSize: '0.7rem' }}>{openSpecs[category.key] ? '▲' : '▼'}</span>
                    </button>
                    {openSpecs[category.key] && (
                      <div className="specs-category-body">
                        <div className="specs-category-grid">
                          {category.specs.map(([label, value]) => (
                            <div key={String(label)} className="spec-item">
                              <span className="spec-label">{label}</span>
                              <span className="spec-value">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="features-section">
                <div className="detail-section-head">
                  <h3>Features</h3>
                </div>
                {[
                  { title: 'Safety', features: ['ABS with EBD', `${car.airbags_count ?? 2} Airbags`, 'ISOFIX Child Seat Mounts', 'Rear Parking Sensors', 'Reverse Camera', 'Hill Assist'] },
                  { title: 'Comfort', features: ['Automatic Climate Control', 'Push Button Start', 'Keyless Entry', 'Cruise Control', 'Power Windows', 'Adjustable Steering'] },
                  { title: 'Infotainment', features: [`${car.infotainment_screen_size ?? '8'}" Touchscreen`, 'Apple CarPlay', 'Android Auto', 'Bluetooth', 'USB Ports', 'Navigation'] },
                  { title: 'Exterior', features: ['LED Headlamps', 'DRLs', 'Alloy Wheels', 'Fog Lamps', 'Roof Rails', 'Chrome Accents'] },
                ].map((cat) => (
                  <div key={cat.title} className="features-category">
                    <h4>{cat.title}</h4>
                    <div className="features-list">
                      {cat.features.map((f) => (
                        <div key={f} className="feature-item">
                          <span className="feature-check">✓</span>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Inspection Report */}
              {car.inspection_score && (
                <div className="inspection-section">
                  <div className="detail-section-head">
                    <h3>Inspection Report</h3>
                    <button className="btn btn-sm btn-ghost" type="button">Download PDF</button>
                  </div>
                  <div className="inspection-score-card">
                    <div className="inspection-score-circle">{car.inspection_score}</div>
                    <p style={{ fontWeight: 600 }}>Overall Score: {car.inspection_score}/100</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>200+ Point Quality Inspection Completed</p>
                  </div>
                  <div className="inspection-categories">
                    {[
                      ['Exterior', car.inspection_score >= 90 ? 'pass' : 'attention'],
                      ['Interior', car.inspection_score >= 85 ? 'pass' : 'attention'],
                      ['Engine & Mechanical', car.inspection_score >= 88 ? 'pass' : 'attention'],
                      ['Electrical', 'pass'],
                      ['Tyres & Brakes', car.inspection_score >= 82 ? 'pass' : 'attention'],
                      ['Documents', 'pass'],
                    ].map(([name, status]) => (
                      <div key={String(name)} className="inspection-cat">
                        <span className="inspection-cat-name">{name}</span>
                        <span className={`inspection-cat-status inspection-${status}`}>
                          {status === 'pass' ? '✓ Pass' : '⚠ Attention'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EMI Calculator */}
              <div className="emi-calculator">
                <div className="detail-section-head">
                  <h3>EMI Calculator</h3>
                </div>
                <div className="emi-body">
                  <div className="emi-sliders">
                    <div className="emi-slider-group">
                      <label>
                        <span>Down Payment</span>
                        <strong>{downPayment}% ({formatINR(car.listing_price_inr * downPayment / 100)})</strong>
                      </label>
                      <input
                        type="range"
                        className="emi-slider"
                        min={10} max={60} step={5}
                        value={downPayment}
                        onChange={(e) => setDownPayment(Number(e.target.value))}
                      />
                    </div>
                    <div className="emi-slider-group">
                      <label>
                        <span>Interest Rate</span>
                        <strong>{interestRate}% p.a.</strong>
                      </label>
                      <input
                        type="range"
                        className="emi-slider"
                        min={7} max={16} step={0.5}
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                      />
                    </div>
                    <div className="emi-slider-group">
                      <label>
                        <span>Tenure</span>
                        <strong>{tenure} months</strong>
                      </label>
                      <input
                        type="range"
                        className="emi-slider"
                        min={12} max={72} step={6}
                        value={tenure}
                        onChange={(e) => setTenure(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
                <div className="emi-result">
                  <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Estimated Monthly EMI</p>
                  <p className="emi-monthly">{formatINRFull(monthlyEMI)}/month</p>
                  <div className="emi-breakdown">
                    <span>Loan: {formatINR(loanAmount)}</span>
                    <span>Interest: {formatINR(totalInterest)}</span>
                    <span>Total: {formatINR(totalPayable)}</span>
                  </div>
                </div>
              </div>

              {/* Warranty & Trust */}
              <div className="warranty-section">
                <div className="detail-section-head" style={{ background: 'transparent' }}>
                  <h3>Warranty & Trust</h3>
                </div>
                <div className="warranty-grid">
                  {[
                    { icon: '🛡️', title: 'SearchAnyCars Assured', desc: 'Quality certified after 200+ point inspection' },
                    { icon: '📋', title: '1-Year Warranty', desc: 'Comprehensive warranty on engine & transmission' },
                    { icon: '🔄', title: '7-Day Money Back', desc: 'Full refund if not satisfied within 7 days' },
                    { icon: '📝', title: 'Free RC Transfer', desc: 'We handle all paperwork and RC transfer at no extra cost' },
                  ].map((item) => (
                    <div key={item.title} className="warranty-item">
                      <span className="warranty-icon">{item.icon}</span>
                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <aside className="vdp-sidebar">
              <div className="vdp-sidebar-header">
                <h2 className="vdp-car-title">{car.title}</h2>
                <div className="vdp-price-row">
                  <span className="vdp-price">{formatINR(car.listing_price_inr)}</span>
                  <span className="vdp-price-badge">Fixed Price ✓</span>
                </div>
                <p className="vdp-emi-line">
                  EMI from {formatINR(calculateMonthlyPayment(car.listing_price_inr * DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE, DEFAULT_TENURE_MONTHS))}/month
                </p>
                {(car.views_count ?? 0) > 100 && (
                  <p className="vdp-popularity">
                    👀 {car.views_count} people viewed this car
                    {(car.favorites_count ?? 0) > 20 && ` · ❤️ ${car.favorites_count} shortlisted`}
                  </p>
                )}
              </div>

              <div className="vdp-sidebar-ctas">
                <button className="btn btn-primary btn-lg" onClick={() => setShowTestDrive(true)} type="button">
                  Book Test Drive
                </button>
                <button className="btn btn-secondary" onClick={() => setShowReserve(true)} type="button">
                  Reserve This Car
                </button>
              </div>

              <div className="vdp-sidebar-contact">
                <button className="btn btn-ghost btn-sm" type="button">📞 Call Us</button>
                <button className="btn btn-whatsapp btn-sm" type="button">💬 WhatsApp</button>
              </div>

              <div className="vdp-sidebar-actions">
                <button
                  className="vdp-action-btn"
                  onClick={() => toggleWishlist(car.id)}
                  type="button"
                >
                  {isWishlisted ? '❤️' : '♡'} {isWishlisted ? 'Saved' : 'Save'}
                </button>
                <button className="vdp-action-btn" type="button">
                  ↗ Share
                </button>
              </div>
            </aside>
          </div>

          {/* Similar Cars */}
          {similarCars.length > 0 && (
            <div className="similar-section">
              <div className="section-head">
                <h2>Similar Cars</h2>
                <Link to="/search" className="text-link">View More</Link>
              </div>
              <div className="card-grid">
                {similarCars.map((item) => (
                  <CarCard
                    key={item.id}
                    car={item}
                    isWishlisted={wishlist.includes(item.id)}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Mobile CTA */}
      <div className="mobile-cta-bar">
        <button className="btn btn-primary" onClick={() => setShowTestDrive(true)} type="button">
          Book Test Drive
        </button>
        <button className="btn btn-secondary" onClick={() => setShowReserve(true)} type="button">
          Reserve
        </button>
      </div>

      {/* Modals */}
      {showTestDrive && <BookTestDriveModal carTitle={car.title} listingId={car.id} onClose={() => setShowTestDrive(false)} />}
      {showReserve && <ReserveCarModal carTitle={car.title} carPrice={car.listing_price_inr} onClose={() => setShowReserve(false)} />}

      {/* Fullscreen Gallery */}
      {fullscreen && (
        <div className="fullscreen-gallery">
          <div className="fullscreen-gallery-top">
            <span style={{ color: '#fff' }}>{selectedImage + 1} / {images.length}</span>
            <button className="fullscreen-gallery-close" onClick={() => setFullscreen(false)} type="button">✕</button>
          </div>
          <div className="fullscreen-gallery-body">
            <button
              className="gallery-nav-btn prev"
              onClick={() => setSelectedImage((i) => (i - 1 + images.length) % images.length)}
              type="button"
            >‹</button>
            <img src={images[selectedImage]} alt={`Full ${selectedImage + 1}`} />
            <button
              className="gallery-nav-btn next"
              onClick={() => setSelectedImage((i) => (i + 1) % images.length)}
              type="button"
            >›</button>
          </div>
        </div>
      )}
    </main>
  )
}
