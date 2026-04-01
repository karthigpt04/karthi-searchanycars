'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CarCard } from '../../../src/components/CarCard';
import { BookTestDriveModal } from '../../../src/components/BookTestDriveModal';
import { ReserveCarModal } from '../../../src/components/ReserveCarModal';
import {
  formatINR, formatINRFull, formatKM, calculateMonthlyPayment,
  PLACEHOLDER_CAR_IMAGE, DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE, DEFAULT_TENURE_MONTHS,
} from '../../../src/utils/format';
import { useWishlist } from '../../../src/context/WishlistContext';

type Listing = Record<string, unknown> & { id: number; title: string };

function g(car: Listing, ...keys: string[]): unknown {
  for (const k of keys) { if (car[k] !== undefined && car[k] !== null) return car[k]; }
  return null;
}

export function CarDetailClient({ listing, similarCars }: { listing: Listing | null; similarCars: Listing[] }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showTestDrive, setShowTestDrive] = useState(false);
  const [showReserve, setShowReserve] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [downPayment, setDownPayment] = useState(20);
  const [tenure, setTenure] = useState(48);
  const [interestRate, setInterestRate] = useState(10.5);
  const [openSpecs, setOpenSpecs] = useState<Record<string, boolean>>({ engine: true });

  const { wishlistIds: wishlist, toggleWishlist } = useWishlist();

  if (!listing) {
    return (
      <main className="section">
        <div className="container">
          <div className="empty-state">
            <h3>Car Not Found</h3>
            <p>This listing may have been removed or sold.</p>
            <Link href="/search" className="btn btn-primary">Browse Cars</Link>
          </div>
        </div>
      </main>
    );
  }

  const car = listing;
  const price = (g(car, 'listing_price_inr', 'listingPriceInr') ?? 0) as number;
  const images = (car.images as string[] | undefined)?.length ? car.images as string[] : [PLACEHOLDER_CAR_IMAGE];
  const fuelType = g(car, 'fuel_type', 'fuelType') as string | null;
  const transmissionType = g(car, 'transmission_type', 'transmissionType') as string | null;
  const ownershipType = g(car, 'ownership_type', 'ownershipType') as string | null;
  const locationCity = g(car, 'location_city', 'locationCity') as string | null;
  const modelYear = g(car, 'model_year', 'modelYear') as number | null;
  const regYear = g(car, 'registration_year', 'registrationYear') as number | null;
  const kmDriven = (g(car, 'total_km_driven', 'totalKmDriven') ?? 0) as number;
  const regState = g(car, 'registration_state', 'registrationState') as string | null;
  const color = g(car, 'exterior_color', 'exteriorColor') as string | null;
  const mileage = g(car, 'mileage_kmpl', 'mileageKmpl') as number | null;
  const condRating = g(car, 'overall_condition_rating', 'overallConditionRating') as number | null;
  const inspScore = (g(car, 'inspection_score', 'inspectionScore') ?? 0) as number;
  const inspStatus = g(car, 'inspection_status', 'inspectionStatus') as string | null;
  const engineType = g(car, 'engine_type', 'engineType') as string | null;
  const engineCc = g(car, 'engine_capacity_cc', 'engineCapacityCc') as number | null;
  const powerBhp = g(car, 'power_bhp', 'powerBhp') as number | null;
  const airbags = g(car, 'airbags_count', 'airbagsCount') as number | null;
  const screen = g(car, 'infotainment_screen_size', 'infotainmentScreenSize') as string | null;
  const viewsCount = (g(car, 'views_count', 'viewsCount') ?? 0) as number;
  const favsCount = (g(car, 'favorites_count', 'favoritesCount') ?? 0) as number;

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const dist = touchStart - touchEnd;
    if (dist > minSwipeDistance && images.length > 1) setSelectedImage((i) => (i + 1) % images.length);
    if (dist < -minSwipeDistance && images.length > 1) setSelectedImage((i) => (i - 1 + images.length) % images.length);
  };

  const loanAmount = price * (1 - downPayment / 100);
  const monthlyEMI = calculateMonthlyPayment(loanAmount, interestRate, tenure);
  const totalPayable = monthlyEMI * tenure;
  const totalInterest = totalPayable - loanAmount;
  const isWishlisted = wishlist.includes(car.id);

  return (
    <main>
      <div className="section-sm">
        <div className="container">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <Link href="/" style={{ color: 'var(--text-secondary)' }}>Home</Link>{' / '}
            <Link href="/search" style={{ color: 'var(--text-secondary)' }}>Used Cars</Link>{' / '}
            <span>{car.title}</span>
          </div>

          <div className="vdp-layout">
            <div>
              {/* Gallery */}
              <div className="gallery">
                <div className="gallery-main" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                  <img src={images[selectedImage]} alt={`${car.title} - Photo ${selectedImage + 1}`} />
                  {images.length > 1 && (
                    <>
                      <button className="gallery-nav-btn prev" onClick={() => setSelectedImage((i) => (i - 1 + images.length) % images.length)} type="button" aria-label="Previous image">‹</button>
                      <button className="gallery-nav-btn next" onClick={() => setSelectedImage((i) => (i + 1) % images.length)} type="button" aria-label="Next image">›</button>
                    </>
                  )}
                  <span className="gallery-counter">{selectedImage + 1} / {images.length}</span>
                  <button className="gallery-fullscreen-btn" onClick={() => setFullscreen(true)} type="button" aria-label="Fullscreen">⛶</button>
                </div>
                {images.length > 1 && (
                  <div className="gallery-thumbs">
                    {images.map((img, i) => (
                      <button key={i} className={`gallery-thumb ${selectedImage === i ? 'active' : ''}`} onClick={() => setSelectedImage(i)} type="button">
                        <img src={img} alt={`Thumb ${i + 1}`} loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Specs */}
              <div className="quick-specs">
                {[
                  { icon: '📅', value: modelYear ?? '-', label: 'Year' },
                  { icon: '🛣️', value: formatKM(kmDriven), label: 'Driven' },
                  { icon: '⛽', value: fuelType ?? '-', label: 'Fuel' },
                  { icon: '⚙️', value: transmissionType ?? '-', label: 'Transmission' },
                  { icon: '👤', value: ownershipType ?? '-', label: 'Owner' },
                  { icon: '📍', value: regState ?? '-', label: 'Reg. State' },
                ].map((s) => (
                  <div key={s.label} className="quick-spec">
                    <span className="quick-spec-icon">{s.icon}</span>
                    <span className="quick-spec-value">{s.value}</span>
                    <span className="quick-spec-label">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Overview */}
              <div className="overview-section">
                <div className="detail-section-head"><h3>Car Overview</h3></div>
                <div className="overview-grid">
                  {([
                    ['Registration Year', regYear ?? '-'],
                    ['Manufacturing Year', modelYear ?? '-'],
                    ['Kilometers Driven', kmDriven ? formatKM(kmDriven) : '-'],
                    ['Fuel Type', fuelType ?? '-'],
                    ['Transmission', transmissionType ?? '-'],
                    ['Owners', ownershipType ? `${ownershipType} Owner` : '-'],
                    ['Registration State', regState ?? '-'],
                    ['Color', color ?? '-'],
                    ['Mileage', mileage ? `${mileage} kmpl` : '-'],
                    ['Insurance', inspStatus === 'Completed' ? 'Comprehensive' : '-'],
                    ['Condition Rating', condRating ? `${condRating}/10` : '-'],
                    ['Inspection Score', inspScore ? `${inspScore}/100` : '-'],
                  ] as [string, string | number][]).map(([label, value]) => (
                    <div key={label} className="overview-item">
                      <span className="overview-label">{label}</span>
                      <span className="overview-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Specs */}
              <div className="specs-section">
                <div className="detail-section-head"><h3>Detailed Specifications</h3></div>
                {[
                  { key: 'engine', title: 'Engine & Performance', specs: [['Engine', engineType ?? '-'], ['Capacity', engineCc ? `${engineCc} cc` : '-'], ['Power', powerBhp ? `${powerBhp} bhp` : '-'], ['Transmission', transmissionType ?? '-'], ['Fuel Type', fuelType ?? '-'], ['Mileage', mileage ? `${mileage} kmpl` : '-']] },
                  { key: 'safety', title: 'Safety Features', specs: [['Airbags', airbags ? `${airbags} Airbags` : '-'], ['ABS', 'Standard'], ['EBD', 'Yes'], ['Parking Sensors', 'Rear'], ['Reverse Camera', 'Yes'], ['ISOFIX', 'Yes']] },
                  { key: 'comfort', title: 'Comfort & Convenience', specs: [['AC Type', 'Automatic Climate Control'], ['Infotainment', screen ? `${screen}" Touchscreen` : '-'], ['Keyless Entry', 'Yes'], ['Push Start', 'Yes'], ['Cruise Control', 'Yes'], ['Steering', 'Power (EPS)']] },
                ].map((cat) => (
                  <div key={cat.key} className="specs-category">
                    <button className="specs-category-title" onClick={() => setOpenSpecs((p) => ({ ...p, [cat.key]: !p[cat.key] }))} type="button">
                      {cat.title} <span style={{ fontSize: '0.7rem' }}>{openSpecs[cat.key] ? '▲' : '▼'}</span>
                    </button>
                    {openSpecs[cat.key] && (
                      <div className="specs-category-body">
                        <div className="specs-category-grid">
                          {cat.specs.map(([label, value]) => (
                            <div key={label} className="spec-item"><span className="spec-label">{label}</span><span className="spec-value">{value}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="features-section">
                <div className="detail-section-head"><h3>Features</h3></div>
                {[
                  { title: 'Safety', features: ['ABS with EBD', `${airbags ?? 2} Airbags`, 'ISOFIX Child Seat Mounts', 'Rear Parking Sensors', 'Reverse Camera', 'Hill Assist'] },
                  { title: 'Comfort', features: ['Automatic Climate Control', 'Push Button Start', 'Keyless Entry', 'Cruise Control', 'Power Windows', 'Adjustable Steering'] },
                  { title: 'Infotainment', features: [`${screen ?? '8'}" Touchscreen`, 'Apple CarPlay', 'Android Auto', 'Bluetooth', 'USB Ports', 'Navigation'] },
                  { title: 'Exterior', features: ['LED Headlamps', 'DRLs', 'Alloy Wheels', 'Fog Lamps', 'Roof Rails', 'Chrome Accents'] },
                ].map((c) => (
                  <div key={c.title} className="features-category">
                    <h4>{c.title}</h4>
                    <div className="features-list">
                      {c.features.map((f) => <div key={f} className="feature-item"><span className="feature-check">✓</span>{f}</div>)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Inspection */}
              {inspScore > 0 && (
                <div className="inspection-section">
                  <div className="detail-section-head"><h3>Inspection Report</h3><button className="btn btn-sm btn-ghost" type="button">Download PDF</button></div>
                  <div className="inspection-score-card">
                    <div className="inspection-score-circle">{inspScore}</div>
                    <p style={{ fontWeight: 600 }}>Overall Score: {inspScore}/100</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>200+ Point Quality Inspection Completed</p>
                  </div>
                  <div className="inspection-categories">
                    {([['Exterior', inspScore >= 90 ? 'pass' : 'attention'], ['Interior', inspScore >= 85 ? 'pass' : 'attention'], ['Engine & Mechanical', inspScore >= 88 ? 'pass' : 'attention'], ['Electrical', 'pass'], ['Tyres & Brakes', inspScore >= 82 ? 'pass' : 'attention'], ['Documents', 'pass']] as [string, string][]).map(([name, status]) => (
                      <div key={name} className="inspection-cat">
                        <span className="inspection-cat-name">{name}</span>
                        <span className={`inspection-cat-status inspection-${status}`}>{status === 'pass' ? '✓ Pass' : '⚠ Attention'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EMI Calculator */}
              <div className="emi-calculator">
                <div className="detail-section-head"><h3>EMI Calculator</h3></div>
                <div className="emi-body">
                  <div className="emi-sliders">
                    <div className="emi-slider-group">
                      <label><span>Down Payment</span><strong>{downPayment}% ({formatINR(price * downPayment / 100)})</strong></label>
                      <input type="range" className="emi-slider" min={10} max={60} step={5} value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value))} />
                    </div>
                    <div className="emi-slider-group">
                      <label><span>Interest Rate</span><strong>{interestRate}% p.a.</strong></label>
                      <input type="range" className="emi-slider" min={7} max={16} step={0.5} value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} />
                    </div>
                    <div className="emi-slider-group">
                      <label><span>Tenure</span><strong>{tenure} months</strong></label>
                      <input type="range" className="emi-slider" min={12} max={72} step={6} value={tenure} onChange={(e) => setTenure(Number(e.target.value))} />
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

              {/* Warranty */}
              <div className="warranty-section">
                <div className="detail-section-head" style={{ background: 'transparent' }}><h3>Warranty & Trust</h3></div>
                <div className="warranty-grid">
                  {[
                    { icon: '🛡️', title: 'SearchAnyCars Assured', desc: 'Quality certified after 200+ point inspection' },
                    { icon: '📋', title: '1-Year Warranty', desc: 'Comprehensive warranty on engine & transmission' },
                    { icon: '🔄', title: '7-Day Money Back', desc: 'Full refund if not satisfied within 7 days' },
                    { icon: '📝', title: 'Free RC Transfer', desc: 'We handle all paperwork and RC transfer at no extra cost' },
                  ].map((item) => (
                    <div key={item.title} className="warranty-item">
                      <span className="warranty-icon">{item.icon}</span>
                      <div><h4>{item.title}</h4><p>{item.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="vdp-sidebar">
              <div className="vdp-sidebar-header">
                <h2 className="vdp-car-title">{car.title}</h2>
                <div className="vdp-price-row">
                  <span className="vdp-price">{formatINR(price)}</span>
                  <span className="vdp-price-badge">Fixed Price ✓</span>
                </div>
                <p className="vdp-emi-line">EMI from {formatINR(calculateMonthlyPayment(price * DEFAULT_LOAN_PERCENT, DEFAULT_INTEREST_RATE, DEFAULT_TENURE_MONTHS))}/month</p>
                {viewsCount > 100 && (
                  <p className="vdp-popularity">
                    👀 {viewsCount} people viewed this car
                    {favsCount > 20 && ` · ❤️ ${favsCount} shortlisted`}
                  </p>
                )}
              </div>
              <div className="vdp-sidebar-ctas">
                <button className="btn btn-primary btn-lg" onClick={() => setShowTestDrive(true)} type="button">Book Test Drive</button>
                <button className="btn btn-secondary" onClick={() => setShowReserve(true)} type="button">Reserve This Car</button>
              </div>
              <div className="vdp-sidebar-contact">
                <button className="btn btn-ghost btn-sm" type="button">📞 Call Us</button>
                <button className="btn btn-whatsapp btn-sm" type="button">💬 WhatsApp</button>
              </div>
              <div className="vdp-sidebar-actions">
                <button className="vdp-action-btn" onClick={() => toggleWishlist(car.id)} type="button">
                  {isWishlisted ? '❤️' : '♡'} {isWishlisted ? 'Saved' : 'Save'}
                </button>
                <button className="vdp-action-btn" type="button">↗ Share</button>
              </div>
            </aside>
          </div>

          {/* Similar Cars */}
          {similarCars.length > 0 && (
            <div className="similar-section">
              <div className="section-head">
                <h2>Similar Cars</h2>
                <Link href="/search" className="text-link">View More</Link>
              </div>
              <div className="card-grid">
                {similarCars.map((item) => (
                  <CarCard key={item.id} car={item} isWishlisted={wishlist.includes(item.id)} onToggleWishlist={toggleWishlist} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Mobile CTA */}
      <div className="mobile-cta-bar">
        <button className="btn btn-primary" onClick={() => setShowTestDrive(true)} type="button">Book Test Drive</button>
        <button className="btn btn-secondary" onClick={() => setShowReserve(true)} type="button">Reserve</button>
      </div>

      {/* Modals */}
      {showTestDrive && <BookTestDriveModal carTitle={car.title} listingId={car.id} onClose={() => setShowTestDrive(false)} />}
      {showReserve && <ReserveCarModal carTitle={car.title} carPrice={price} onClose={() => setShowReserve(false)} />}

      {/* Fullscreen Gallery */}
      {fullscreen && (
        <div className="fullscreen-gallery">
          <div className="fullscreen-gallery-top">
            <span style={{ color: '#fff' }}>{selectedImage + 1} / {images.length}</span>
            <button className="fullscreen-gallery-close" onClick={() => setFullscreen(false)} type="button">✕</button>
          </div>
          <div className="fullscreen-gallery-body">
            <button className="gallery-nav-btn prev" onClick={() => setSelectedImage((i) => (i - 1 + images.length) % images.length)} type="button">‹</button>
            <img src={images[selectedImage]} alt={`Full ${selectedImage + 1}`} />
            <button className="gallery-nav-btn next" onClick={() => setSelectedImage((i) => (i + 1) % images.length)} type="button">›</button>
          </div>
        </div>
      )}
    </main>
  );
}
