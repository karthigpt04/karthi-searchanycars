import { useState } from 'react'
import { api } from '../api/client'
import type { ListingPayload } from '../types'

const brands = ['Maruti Suzuki','Hyundai','Tata','Honda','Kia','Mahindra','Toyota','Volkswagen','Skoda','Renault','Ford','MG','Nissan','BMW','Mercedes-Benz','Audi','Volvo','Jeep','Citroën','Porsche','Other']
const fuelTypes = ['Petrol','Diesel','CNG','Electric','Hybrid','LPG']
const transmissions = ['Manual','Automatic','AMT','CVT','DCT']
const bodyTypes = ['Hatchback','Sedan','SUV','MUV','Coupe','Pickup','Wagon','Other']
const colors = ['White','Black','Silver','Grey','Red','Blue','Brown','Beige','Green','Orange','Yellow','Maroon']
const ownerTypes = ['First','Second','Third','Fourth+']
const states = ['Andhra Pradesh','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal']
const cities = ['New Delhi','Mumbai','Bengaluru','Chennai','Hyderabad','Pune','Ahmedabad','Jaipur','Lucknow','Kolkata','Chandigarh','Kochi','Coimbatore','Indore','Nagpur','Surat','Vizag','Mysuru','Bhopal','Thiruvananthapuram']

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 25 }, (_, i) => currentYear - i)

export const SellCarPage = () => {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Seller contact info
  const [sellerName, setSellerName] = useState('')
  const [sellerPhone, setSellerPhone] = useState('')

  // Car info
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [variant, setVariant] = useState('')
  const [year, setYear] = useState(currentYear)
  const [regYear, setRegYear] = useState(currentYear)
  const [fuelType, setFuelType] = useState('Petrol')
  const [transmission, setTransmission] = useState('Manual')
  const [bodyType, setBodyType] = useState('')
  const [color, setColor] = useState('')
  const [kmDriven, setKmDriven] = useState('')
  const [ownership, setOwnership] = useState('First')
  const [price, setPrice] = useState('')
  const [negotiable, setNegotiable] = useState(true)
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [regState, setRegState] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([''])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  const handleImageUpload = async (file: File, index: number) => {
    setUploadingIndex(index)
    try {
      const result = await api.uploadListingImage(file)
      setImages(prev => {
        const next = [...prev]
        next[index] = result.url
        return next
      })
    } catch {
      setError('Image upload failed. Try a smaller image.')
    } finally {
      setUploadingIndex(null)
    }
  }

  const addImageSlot = () => setImages(prev => [...prev, ''])
  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i))

  const canProceedStep1 = brand && model && year
  const canProceedStep2 = fuelType && transmission && kmDriven && ownership
  const canProceedStep3 = price && city && state
  const canSubmit = sellerName && sellerPhone

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    const title = `${year} ${brand} ${model}${variant ? ' ' + variant : ''}`
    const code = `SELL-${Date.now().toString(36).toUpperCase()}`
    const payload: ListingPayload = {
      categoryId: null,
      listingCode: code,
      title,
      brand,
      model,
      variant,
      modelYear: year,
      registrationYear: regYear,
      vehicleType: bodyType || 'Sedan',
      bodyStyle: bodyType,
      exteriorColor: color,
      interiorColor: '',
      listingPriceInr: Number(price) || 0,
      negotiable,
      estimatedMarketValueInr: null,
      ownershipType: ownership,
      sellerType: 'Individual',
      registrationState: regState || state,
      registrationCity: city,
      totalKmDriven: Number(kmDriven) || 0,
      mileageKmpl: null,
      engineType: '',
      engineCapacityCc: null,
      powerBhp: null,
      transmissionType: transmission,
      fuelType,
      batteryCapacityKwh: null,
      overallConditionRating: null,
      serviceHistoryAvailable: false,
      airbagsCount: null,
      infotainmentScreenSize: '',
      locationCity: city,
      locationState: state,
      dealerRating: null,
      inspectionStatus: 'Pending',
      inspectionScore: null,
      listingStatus: 'Draft',
      featuredListing: false,
      isSplus: false,
      isNewCar: false,
      newCarType: '',
      promotionTier: 'Standard',
      images: images.filter(Boolean),
      additionalNotes: `Seller: ${sellerName} | Phone: ${sellerPhone}\n${description}`,
      specs: {},
    }
    try {
      await api.createListing(payload)
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <main>
        <div className="sell-page-hero">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="form-success-icon">✓</div>
            <h1 style={{ color: '#fff', marginBottom: '0.75rem' }}>Car Listed Successfully!</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem', maxWidth: 500, margin: '0 auto 1.5rem' }}>
              Our team will review your listing and get back to you within 24 hours. We'll contact you at <strong style={{ color: '#fff' }}>{sellerPhone}</strong>.
            </p>
            <a href="/" className="btn btn-primary btn-lg">Back to Home</a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <div className="sell-page-hero">
        <div className="container">
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, marginBottom: '0.35rem' }}>Sell Your Car</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>Get the best price. Free listing. We handle everything.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="sell-progress">
        <div className="container">
          <div className="sell-steps">
            {['Car Details', 'Specs & Condition', 'Pricing & Location', 'Photos & Contact'].map((label, i) => (
              <button
                key={label}
                className={`sell-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}
                onClick={() => { if (i + 1 < step) setStep(i + 1) }}
                type="button"
              >
                <span className="sell-step-num">{step > i + 1 ? '✓' : i + 1}</span>
                <span className="sell-step-label">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="section-sm">
        <div className="container-narrow">
          {error && <div className="adm-toast adm-toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          {/* STEP 1: Car Details */}
          {step === 1 && (
            <div className="sell-form-card">
              <h2 className="sell-form-title">What car are you selling?</h2>

              <div className="sell-field">
                <label className="sell-label">Brand *</label>
                <select className="sell-input" value={brand} onChange={e => setBrand(e.target.value)}>
                  <option value="">Select Brand</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="sell-row-2">
                <div className="sell-field">
                  <label className="sell-label">Model *</label>
                  <input className="sell-input" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g., Creta, City, Nexon" />
                </div>
                <div className="sell-field">
                  <label className="sell-label">Variant</label>
                  <input className="sell-input" value={variant} onChange={e => setVariant(e.target.value)} placeholder="e.g., SX(O), ZX, XZ+" />
                </div>
              </div>

              <div className="sell-row-2">
                <div className="sell-field">
                  <label className="sell-label">Manufacturing Year *</label>
                  <select className="sell-input" value={year} onChange={e => setYear(Number(e.target.value))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="sell-field">
                  <label className="sell-label">Registration Year</label>
                  <select className="sell-input" value={regYear} onChange={e => setRegYear(Number(e.target.value))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="sell-row-2">
                <div className="sell-field">
                  <label className="sell-label">Body Type</label>
                  <select className="sell-input" value={bodyType} onChange={e => setBodyType(e.target.value)}>
                    <option value="">Select Type</option>
                    {bodyTypes.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="sell-field">
                  <label className="sell-label">Exterior Color</label>
                  <select className="sell-input" value={color} onChange={e => setColor(e.target.value)}>
                    <option value="">Select Color</option>
                    {colors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="sell-nav">
                <div />
                <button className="btn btn-primary" disabled={!canProceedStep1} onClick={() => setStep(2)} type="button">
                  Next: Specs &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Specs & Condition */}
          {step === 2 && (
            <div className="sell-form-card">
              <h2 className="sell-form-title">Engine & Condition</h2>

              <div className="sell-row-2">
                <div className="sell-field">
                  <label className="sell-label">Fuel Type *</label>
                  <div className="sell-chip-row">
                    {fuelTypes.map(f => (
                      <button key={f} className={`sell-chip ${fuelType === f ? 'active' : ''}`} onClick={() => setFuelType(f)} type="button">{f}</button>
                    ))}
                  </div>
                </div>
                <div className="sell-field">
                  <label className="sell-label">Transmission *</label>
                  <div className="sell-chip-row">
                    {transmissions.map(t => (
                      <button key={t} className={`sell-chip ${transmission === t ? 'active' : ''}`} onClick={() => setTransmission(t)} type="button">{t}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sell-row-2">
                <div className="sell-field">
                  <label className="sell-label">Kilometers Driven *</label>
                  <input className="sell-input" type="number" value={kmDriven} onChange={e => setKmDriven(e.target.value)} placeholder="e.g., 45000" />
                </div>
                <div className="sell-field">
                  <label className="sell-label">Ownership *</label>
                  <div className="sell-chip-row">
                    {ownerTypes.map(o => (
                      <button key={o} className={`sell-chip ${ownership === o ? 'active' : ''}`} onClick={() => setOwnership(o)} type="button">{o}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sell-field">
                <label className="sell-label">Registration State</label>
                <select className="sell-input" value={regState} onChange={e => setRegState(e.target.value)}>
                  <option value="">Select State</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="sell-nav">
                <button className="btn btn-ghost" onClick={() => setStep(1)} type="button">&larr; Back</button>
                <button className="btn btn-primary" disabled={!canProceedStep2} onClick={() => setStep(3)} type="button">
                  Next: Pricing &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Pricing & Location */}
          {step === 3 && (
            <div className="sell-form-card">
              <h2 className="sell-form-title">Pricing & Location</h2>

              <div className="sell-field">
                <label className="sell-label">Expected Price (₹) *</label>
                <input className="sell-input sell-input-price" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g., 850000" />
                {Number(price) > 0 && (
                  <span className="sell-price-display">
                    ₹{Number(price) >= 10000000 ? (Number(price) / 10000000).toFixed(2) + ' Cr' : Number(price) >= 100000 ? (Number(price) / 100000).toFixed(1) + ' Lakh' : Number(price).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <label className="sell-checkbox">
                <input type="checkbox" checked={negotiable} onChange={e => setNegotiable(e.target.checked)} />
                <span>Price is negotiable</span>
              </label>

              <div className="sell-row-2">
                <div className="sell-field">
                  <label className="sell-label">State *</label>
                  <select className="sell-input" value={state} onChange={e => setState(e.target.value)}>
                    <option value="">Select State</option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sell-field">
                  <label className="sell-label">City *</label>
                  <select className="sell-input" value={city} onChange={e => setCity(e.target.value)}>
                    <option value="">Select City</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="sell-nav">
                <button className="btn btn-ghost" onClick={() => setStep(2)} type="button">&larr; Back</button>
                <button className="btn btn-primary" disabled={!canProceedStep3} onClick={() => setStep(4)} type="button">
                  Next: Photos &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Photos & Contact */}
          {step === 4 && (
            <div className="sell-form-card">
              <h2 className="sell-form-title">Photos & Your Details</h2>

              <div className="sell-field">
                <label className="sell-label">Car Photos</label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Upload clear photos of your car. More photos = faster sale!</p>
                <div className="sell-image-grid">
                  {images.map((img, i) => (
                    <div key={i} className="sell-image-slot">
                      {img ? (
                        <div className="sell-image-preview">
                          <img src={img} alt={`Car photo ${i + 1}`} />
                          <button className="sell-image-remove" onClick={() => removeImage(i)} type="button">✕</button>
                        </div>
                      ) : (
                        <label className="sell-image-upload">
                          {uploadingIndex === i ? (
                            <span className="sell-uploading">Uploading...</span>
                          ) : (
                            <>
                              <span style={{ fontSize: '1.5rem' }}>📷</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Add Photo</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], i) }}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                  {images.length < 10 && (
                    <button className="sell-image-add" onClick={addImageSlot} type="button">+ More</button>
                  )}
                </div>
              </div>

              <div className="sell-field">
                <label className="sell-label">Additional Notes</label>
                <textarea className="sell-input sell-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Any modifications, service history, or other details..." rows={3} />
              </div>

              <div className="sell-divider" />

              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Your Contact Details</h3>

              <div className="sell-row-2">
                <div className="sell-field">
                  <label className="sell-label">Your Name *</label>
                  <input className="sell-input" value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="sell-field">
                  <label className="sell-label">Phone Number *</label>
                  <input className="sell-input" type="tel" value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} placeholder="10-digit mobile number" />
                </div>
              </div>

              <div className="sell-nav">
                <button className="btn btn-ghost" onClick={() => setStep(3)} type="button">&larr; Back</button>
                <button
                  className="btn btn-primary btn-lg"
                  disabled={!canSubmit || saving}
                  onClick={handleSubmit}
                  type="button"
                >
                  {saving ? 'Submitting...' : 'List My Car for Sale'}
                </button>
              </div>
            </div>
          )}

          {/* Summary Preview */}
          {brand && model && (
            <div className="sell-summary">
              <h4>Your Car</h4>
              <p className="sell-summary-title">{year} {brand} {model} {variant}</p>
              <div className="sell-summary-specs">
                {fuelType && <span>{fuelType}</span>}
                {transmission && <span>{transmission}</span>}
                {kmDriven && <span>{Number(kmDriven).toLocaleString('en-IN')} km</span>}
                {ownership && <span>{ownership} Owner</span>}
                {city && <span>{city}</span>}
              </div>
              {Number(price) > 0 && (
                <p className="sell-summary-price">
                  ₹{Number(price) >= 100000 ? (Number(price) / 100000).toFixed(1) + ' Lakh' : Number(price).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
