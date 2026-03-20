import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Category, ListingPayload } from '../types'
import { formatINR, calculateMonthlyPayment } from '../utils/format'

const emptyPayload: ListingPayload = {
  categoryId: null, listingCode: '', title: '', brand: '', model: '', variant: '',
  modelYear: new Date().getFullYear(), registrationYear: new Date().getFullYear(),
  vehicleType: '', bodyStyle: '', exteriorColor: '', interiorColor: '',
  listingPriceInr: 0, negotiable: false, estimatedMarketValueInr: null,
  ownershipType: 'First', sellerType: 'Dealer', registrationState: '', registrationCity: '',
  totalKmDriven: 0, mileageKmpl: null, engineType: '', engineCapacityCc: null,
  powerBhp: null, transmissionType: 'Automatic', fuelType: 'Petrol',
  batteryCapacityKwh: null, overallConditionRating: 8, serviceHistoryAvailable: false,
  airbagsCount: 2, infotainmentScreenSize: '8', locationCity: '', locationState: '',
  dealerRating: null, inspectionStatus: 'Pending', inspectionScore: null,
  listingStatus: 'Active', featuredListing: false, isSplus: false, isNewCar: false, newCarType: '', promotionTier: 'Standard',
  images: [], additionalNotes: '', specs: {},
}

const brands = ['Maruti Suzuki','Hyundai','Tata','Honda','Kia','Mahindra','Toyota','Volkswagen','Skoda','Renault','Ford','MG','Nissan','BMW','Mercedes-Benz','Audi','Volvo','Jeep','Citroën','Porsche']
const fuelTypes = ['Petrol','Diesel','CNG','Electric','Hybrid','LPG']
const transmissions = ['Manual','Automatic','AMT','CVT','DCT','Torque Converter']
const bodyTypes = ['Hatchback','Sedan','SUV','MUV','Minivan','Coupe','Convertible','Pickup','Wagon']
const colors = ['White','Black','Silver','Grey','Red','Blue','Brown','Beige','Green','Orange','Yellow','Maroon']
const ownerTypes = ['First','Second','Third','Fourth+']
const sellerTypes = ['Dealer','Individual','Certified Dealer']
const statusOptions = ['Active','Draft','Reserved','Sold','On Demand']
const promotionTiers = ['Standard','Featured','Premium']
const states = ['Andhra Pradesh','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal']

export const AdminCarFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const listingId = Number(id)

  const [form, setForm] = useState<ListingPayload>(emptyPayload)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [autoTitle, setAutoTitle] = useState(true)
  const [autoCode, setAutoCode] = useState(true)
  const [autoEMI, setAutoEMI] = useState(true)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true, pricing: true, engine: false, condition: false,
    features: false, location: false, media: true, status: true, notes: false,
  })
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  const set = (key: keyof ListingPayload, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Load categories + existing listing
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const cats = await api.getCategories()
      if (cancelled) return
      setCategories(cats)

      if (isEditing && Number.isFinite(listingId)) {
        try {
          const listing = await api.getListingById(listingId)
          if (cancelled) return
          setForm({
            categoryId: listing.category_id,
            listingCode: listing.listing_code,
            title: listing.title,
            brand: listing.brand,
            model: listing.model,
            variant: listing.variant ?? '',
            modelYear: listing.model_year,
            registrationYear: listing.registration_year,
            vehicleType: listing.vehicle_type ?? '',
            bodyStyle: listing.body_style ?? '',
            exteriorColor: listing.exterior_color ?? '',
            interiorColor: listing.interior_color ?? '',
            listingPriceInr: listing.listing_price_inr,
            negotiable: Boolean(listing.negotiable),
            estimatedMarketValueInr: listing.estimated_market_value_inr,
            ownershipType: listing.ownership_type ?? 'First',
            sellerType: listing.seller_type ?? 'Dealer',
            registrationState: listing.registration_state ?? '',
            registrationCity: listing.registration_city ?? '',
            totalKmDriven: listing.total_km_driven ?? 0,
            mileageKmpl: listing.mileage_kmpl,
            engineType: listing.engine_type ?? '',
            engineCapacityCc: listing.engine_capacity_cc,
            powerBhp: listing.power_bhp,
            transmissionType: listing.transmission_type ?? 'Automatic',
            fuelType: listing.fuel_type ?? 'Petrol',
            batteryCapacityKwh: listing.battery_capacity_kwh,
            overallConditionRating: listing.overall_condition_rating ?? 8,
            serviceHistoryAvailable: Boolean(listing.service_history_available),
            airbagsCount: listing.airbags_count ?? 2,
            infotainmentScreenSize: listing.infotainment_screen_size ?? '8',
            locationCity: listing.location_city ?? '',
            locationState: listing.location_state ?? '',
            dealerRating: listing.dealer_rating,
            inspectionStatus: listing.inspection_status ?? 'Pending',
            inspectionScore: listing.inspection_score,
            listingStatus: listing.listing_status,
            featuredListing: Boolean(listing.featured_listing),
            isSplus: Boolean(listing.is_splus),
            isNewCar: Boolean(listing.is_new_car),
            newCarType: listing.new_car_type ?? '',
            promotionTier: listing.promotion_tier ?? 'Standard',
            images: listing.images,
            additionalNotes: listing.additional_notes ?? '',
            specs: listing.specs,
          })
          setAutoTitle(false)
          setAutoCode(false)
        } catch {
          setMessage('Failed to load listing.')
          setMessageType('error')
        }
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [isEditing, listingId])

  // Auto-generate title
  useEffect(() => {
    if (!autoTitle) return
    const parts = [form.modelYear, form.brand, form.model, form.variant].filter(Boolean)
    if (parts.length >= 2) set('title', parts.join(' '))
  }, [form.modelYear, form.brand, form.model, form.variant, autoTitle])

  // Auto-generate listing code
  useEffect(() => {
    if (!autoCode || isEditing) return
    set('listingCode', `SAC-${Date.now().toString(36).toUpperCase().slice(-6)}`)
  }, [autoCode, isEditing])

  // Auto-fill body style from category
  useEffect(() => {
    if (!form.categoryId) return
    const cat = categories.find((c) => c.id === form.categoryId)
    if (cat) {
      set('vehicleType', cat.vehicle_type)
      set('bodyStyle', cat.vehicle_type)
    }
  }, [form.categoryId, categories])

  const autoEMIValue = autoEMI && form.listingPriceInr > 0
    ? calculateMonthlyPayment(form.listingPriceInr * 0.8, 10.5, 48)
    : null

  const uploadImage = async (index: number, file: File | null) => {
    if (!file) return
    setUploadingIndex(index)
    try {
      const uploaded = await api.uploadListingImage(file)
      setForm((prev) => {
        const imgs = [...prev.images]
        imgs[index] = uploaded.url
        return { ...prev, images: imgs }
      })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed.')
      setMessageType('error')
    } finally {
      setUploadingIndex(null)
    }
  }

  const addImageSlot = () => {
    setForm((prev) => ({ ...prev, images: [...prev.images, ''] }))
  }

  const removeImage = (index: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.brand || !form.model || !form.listingCode) {
      setMessage('Please fill required fields: Title, Brand, Model, Listing Code.')
      setMessageType('error')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, images: form.images.filter(Boolean) }
      if (isEditing) {
        await api.updateListing(listingId, payload)
        setMessage('Listing updated successfully!')
      } else {
        await api.createListing(payload)
        setMessage('Listing created successfully!')
      }
      setMessageType('success')
      setTimeout(() => navigate('/admin'), 1500)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save.')
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="adm">
        <div className="adm-header"><div className="container"><h1 className="adm-title">Loading...</h1></div></div>
      </main>
    )
  }

  const SectionHeader = ({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) => (
    <button className="adm-section-toggle" onClick={() => toggleSection(id)} type="button">
      <div>
        <span className="adm-section-title">{title}</span>
        {subtitle && <span className="adm-section-subtitle">{subtitle}</span>}
      </div>
      <span className="adm-section-chevron">{openSections[id] ? '▲' : '▼'}</span>
    </button>
  )

  return (
    <main className="adm">
      {/* Header */}
      <div className="adm-header">
        <div className="container">
          <div className="adm-header-row">
            <div>
              <Link to="/admin" className="adm-back-link">← Back to Inventory</Link>
              <h1 className="adm-title">{isEditing ? 'Edit Listing' : 'List New Car'}</h1>
              {isEditing && <p className="adm-subtitle">Editing: {form.title || 'Untitled'}</p>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/admin" className="btn btn-ghost">Cancel</Link>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={saving} type="button">
                {saving ? 'Saving...' : isEditing ? 'Update Listing' : 'Publish Listing'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="container" style={{ marginTop: '1rem' }}>
          <div className={`adm-toast ${messageType === 'error' ? 'adm-toast-error' : ''}`}>
            {message}
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '0.5rem' }} type="button">✕</button>
          </div>
        </div>
      )}

      <form className="container" style={{ marginTop: '1.5rem', marginBottom: '3rem' }} onSubmit={handleSubmit}>
        <div className="adm-form-layout">
          {/* Left Column — Main Fields */}
          <div className="adm-form-main">

            {/* BASIC INFO */}
            <div className="adm-form-card">
              <SectionHeader id="basic" title="Basic Information" subtitle="Brand, model, year, and identity" />
              {openSections.basic && (
                <div className="adm-form-body">
                  <div className="adm-field-row-3">
                    <div className="adm-field">
                      <label className="adm-label">Brand *</label>
                      <select className="adm-input" value={form.brand} onChange={(e) => set('brand', e.target.value)} required>
                        <option value="">Select Brand</option>
                        {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Model *</label>
                      <input className="adm-input" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="e.g., Creta, City" required />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Variant</label>
                      <input className="adm-input" value={form.variant} onChange={(e) => set('variant', e.target.value)} placeholder="e.g., SX(O), ZX CVT" />
                    </div>
                  </div>

                  <div className="adm-field-row-3">
                    <div className="adm-field">
                      <label className="adm-label">Manufacturing Year</label>
                      <input className="adm-input" type="number" value={form.modelYear ?? ''} onChange={(e) => set('modelYear', e.target.value ? Number(e.target.value) : null)} min={2000} max={2030} />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Registration Year</label>
                      <input className="adm-input" type="number" value={form.registrationYear ?? ''} onChange={(e) => set('registrationYear', e.target.value ? Number(e.target.value) : null)} min={2000} max={2030} />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Category</label>
                      <select className="adm-input" value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Select Category</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="adm-field-row-2">
                    <div className="adm-field">
                      <div className="adm-label-row">
                        <label className="adm-label">Title *</label>
                        <label className="adm-auto-toggle">
                          <input type="checkbox" checked={autoTitle} onChange={(e) => setAutoTitle(e.target.checked)} />
                          Auto-generate
                        </label>
                      </div>
                      <input className="adm-input" value={form.title} onChange={(e) => { setAutoTitle(false); set('title', e.target.value) }} placeholder="e.g., 2022 Hyundai Creta SX(O)" required />
                      {autoTitle && <span className="adm-hint">Auto-generated from Year + Brand + Model + Variant</span>}
                    </div>
                    <div className="adm-field">
                      <div className="adm-label-row">
                        <label className="adm-label">Listing Code *</label>
                        <label className="adm-auto-toggle">
                          <input type="checkbox" checked={autoCode} onChange={(e) => setAutoCode(e.target.checked)} />
                          Auto-generate
                        </label>
                      </div>
                      <input className="adm-input" value={form.listingCode} onChange={(e) => { setAutoCode(false); set('listingCode', e.target.value) }} placeholder="SAC-XXXXX" required />
                      {autoCode && !isEditing && <span className="adm-hint">Auto-generated unique code</span>}
                    </div>
                  </div>

                  <div className="adm-field-row-3">
                    <div className="adm-field">
                      <label className="adm-label">Body Type</label>
                      <select className="adm-input" value={form.bodyStyle} onChange={(e) => set('bodyStyle', e.target.value)}>
                        <option value="">Select</option>
                        {bodyTypes.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Exterior Color</label>
                      <select className="adm-input" value={form.exteriorColor} onChange={(e) => set('exteriorColor', e.target.value)}>
                        <option value="">Select Color</option>
                        {colors.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Interior Color</label>
                      <input className="adm-input" value={form.interiorColor} onChange={(e) => set('interiorColor', e.target.value)} placeholder="e.g., Black" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PRICING */}
            <div className="adm-form-card">
              <SectionHeader id="pricing" title="Pricing & Ownership" subtitle="Price, EMI, ownership details" />
              {openSections.pricing && (
                <div className="adm-form-body">
                  <div className="adm-field-row-3">
                    <div className="adm-field">
                      <label className="adm-label">Listing Price (INR) *</label>
                      <input className="adm-input" type="number" value={form.listingPriceInr || ''} onChange={(e) => set('listingPriceInr', Number(e.target.value))} placeholder="e.g., 1450000" required />
                      {form.listingPriceInr > 0 && <span className="adm-hint">{formatINR(form.listingPriceInr)}</span>}
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Estimated Market Value</label>
                      <input className="adm-input" type="number" value={form.estimatedMarketValueInr ?? ''} onChange={(e) => set('estimatedMarketValueInr', e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <div className="adm-field">
                      <div className="adm-label-row">
                        <label className="adm-label">EMI Estimate</label>
                        <label className="adm-auto-toggle">
                          <input type="checkbox" checked={autoEMI} onChange={(e) => setAutoEMI(e.target.checked)} />
                          Auto-calculate
                        </label>
                      </div>
                      {autoEMI ? (
                        <div className="adm-auto-value">{autoEMIValue ? `${formatINR(autoEMIValue)}/mo (80% loan, 10.5%, 48mo)` : '—'}</div>
                      ) : (
                        <input className="adm-input" type="number" placeholder="Manual EMI amount" />
                      )}
                    </div>
                  </div>
                  <div className="adm-field-row-3">
                    <div className="adm-field">
                      <label className="adm-label">Ownership</label>
                      <select className="adm-input" value={form.ownershipType} onChange={(e) => set('ownershipType', e.target.value)}>
                        {ownerTypes.map((o) => <option key={o} value={o}>{o} Owner</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Seller Type</label>
                      <select className="adm-input" value={form.sellerType} onChange={(e) => set('sellerType', e.target.value)}>
                        {sellerTypes.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Negotiable</label>
                      <div className="adm-toggle-row">
                        <button type="button" className={`adm-toggle-btn ${!form.negotiable ? 'active' : ''}`} onClick={() => set('negotiable', false)}>Fixed Price</button>
                        <button type="button" className={`adm-toggle-btn ${form.negotiable ? 'active' : ''}`} onClick={() => set('negotiable', true)}>Negotiable</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ENGINE & PERFORMANCE */}
            <div className="adm-form-card">
              <SectionHeader id="engine" title="Engine & Performance" subtitle="Fuel, transmission, power specs" />
              {openSections.engine && (
                <div className="adm-form-body">
                  <div className="adm-field-row-3">
                    <div className="adm-field">
                      <label className="adm-label">Fuel Type</label>
                      <select className="adm-input" value={form.fuelType} onChange={(e) => set('fuelType', e.target.value)}>
                        {fuelTypes.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Transmission</label>
                      <select className="adm-input" value={form.transmissionType} onChange={(e) => set('transmissionType', e.target.value)}>
                        {transmissions.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Engine Type</label>
                      <input className="adm-input" value={form.engineType} onChange={(e) => set('engineType', e.target.value)} placeholder="e.g., 1.5L Turbo Petrol" />
                    </div>
                  </div>
                  <div className="adm-field-row-4">
                    <div className="adm-field">
                      <label className="adm-label">Engine CC</label>
                      <input className="adm-input" type="number" value={form.engineCapacityCc ?? ''} onChange={(e) => set('engineCapacityCc', e.target.value ? Number(e.target.value) : null)} placeholder="e.g., 1498" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Power (BHP)</label>
                      <input className="adm-input" type="number" value={form.powerBhp ?? ''} onChange={(e) => set('powerBhp', e.target.value ? Number(e.target.value) : null)} placeholder="e.g., 158" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Mileage (kmpl)</label>
                      <input className="adm-input" type="number" step="0.1" value={form.mileageKmpl ?? ''} onChange={(e) => set('mileageKmpl', e.target.value ? Number(e.target.value) : null)} placeholder="e.g., 16.8" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">KM Driven</label>
                      <input className="adm-input" type="number" value={form.totalKmDriven || ''} onChange={(e) => set('totalKmDriven', Number(e.target.value))} placeholder="e.g., 25000" />
                    </div>
                  </div>
                  {form.fuelType === 'Electric' && (
                    <div className="adm-field-row-2">
                      <div className="adm-field">
                        <label className="adm-label">Battery Capacity (kWh)</label>
                        <input className="adm-input" type="number" value={form.batteryCapacityKwh ?? ''} onChange={(e) => set('batteryCapacityKwh', e.target.value ? Number(e.target.value) : null)} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CONDITION & INSPECTION */}
            <div className="adm-form-card">
              <SectionHeader id="condition" title="Condition & Inspection" subtitle="Ratings, service history, inspection" />
              {openSections.condition && (
                <div className="adm-form-body">
                  <div className="adm-field-row-3">
                    <div className="adm-field">
                      <label className="adm-label">Overall Condition (1–10)</label>
                      <input className="adm-input" type="number" min={1} max={10} value={form.overallConditionRating ?? ''} onChange={(e) => set('overallConditionRating', e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Inspection Status</label>
                      <select className="adm-input" value={form.inspectionStatus} onChange={(e) => set('inspectionStatus', e.target.value)}>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Inspection Score (0–100)</label>
                      <input className="adm-input" type="number" min={0} max={100} value={form.inspectionScore ?? ''} onChange={(e) => set('inspectionScore', e.target.value ? Number(e.target.value) : null)} />
                    </div>
                  </div>
                  <div className="adm-field-row-3">
                    <div className="adm-field">
                      <label className="adm-label">Service History</label>
                      <div className="adm-toggle-row">
                        <button type="button" className={`adm-toggle-btn ${form.serviceHistoryAvailable ? 'active' : ''}`} onClick={() => set('serviceHistoryAvailable', true)}>Available</button>
                        <button type="button" className={`adm-toggle-btn ${!form.serviceHistoryAvailable ? 'active' : ''}`} onClick={() => set('serviceHistoryAvailable', false)}>Not Available</button>
                      </div>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Airbags Count</label>
                      <input className="adm-input" type="number" min={0} max={10} value={form.airbagsCount ?? ''} onChange={(e) => set('airbagsCount', e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Infotainment Screen</label>
                      <input className="adm-input" value={form.infotainmentScreenSize} onChange={(e) => set('infotainmentScreenSize', e.target.value)} placeholder='e.g., 10.25"' />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LOCATION */}
            <div className="adm-form-card">
              <SectionHeader id="location" title="Location & Registration" subtitle="City, state, registration details" />
              {openSections.location && (
                <div className="adm-form-body">
                  <div className="adm-field-row-3">
                    <div className="adm-field">
                      <label className="adm-label">Location City</label>
                      <input className="adm-input" value={form.locationCity} onChange={(e) => set('locationCity', e.target.value)} placeholder="e.g., New Delhi" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Location State</label>
                      <select className="adm-input" value={form.locationState} onChange={(e) => set('locationState', e.target.value)}>
                        <option value="">Select State</option>
                        {states.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Dealer Rating</label>
                      <input className="adm-input" type="number" step="0.1" min={0} max={5} value={form.dealerRating ?? ''} onChange={(e) => set('dealerRating', e.target.value ? Number(e.target.value) : null)} placeholder="0–5" />
                    </div>
                  </div>
                  <div className="adm-field-row-2">
                    <div className="adm-field">
                      <label className="adm-label">Registration State</label>
                      <input className="adm-input" value={form.registrationState} onChange={(e) => set('registrationState', e.target.value)} placeholder="e.g., Delhi" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Registration City</label>
                      <input className="adm-input" value={form.registrationCity} onChange={(e) => set('registrationCity', e.target.value)} placeholder="e.g., New Delhi" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MEDIA / IMAGES */}
            <div className="adm-form-card">
              <SectionHeader id="media" title="Photos" subtitle="Upload car images (min 3 recommended)" />
              {openSections.media && (
                <div className="adm-form-body">
                  <div className="adm-image-grid">
                    {form.images.map((img, i) => (
                      <div key={i} className="adm-image-slot">
                        {img ? (
                          <div className="adm-image-preview">
                            <img src={img} alt={`Photo ${i + 1}`} />
                            <button className="adm-image-remove" onClick={() => removeImage(i)} type="button">✕</button>
                            <span className="adm-image-num">#{i + 1}</span>
                          </div>
                        ) : (
                          <div className="adm-image-empty">
                            {uploadingIndex === i ? (
                              <span className="adm-uploading">Uploading...</span>
                            ) : (
                              <>
                                <span style={{ fontSize: '1.5rem' }}>📷</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Photo #{i + 1}</span>
                              </>
                            )}
                          </div>
                        )}
                        <div className="adm-image-controls">
                          <input className="adm-input" style={{ fontSize: '0.78rem' }} value={img} onChange={(e) => {
                            setForm((prev) => { const imgs = [...prev.images]; imgs[i] = e.target.value; return { ...prev, images: imgs } })
                          }} placeholder="Paste URL" />
                          <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
                            Upload
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadImage(i, e.target.files?.[0] ?? null)} />
                          </label>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="adm-image-add" onClick={addImageSlot}>
                      <span style={{ fontSize: '1.5rem' }}>+</span>
                      <span>Add Photo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* NOTES */}
            <div className="adm-form-card">
              <SectionHeader id="notes" title="Description & Notes" subtitle="Public description and internal notes" />
              {openSections.notes && (
                <div className="adm-form-body">
                  <div className="adm-field">
                    <label className="adm-label">Public Description</label>
                    <textarea className="adm-input" rows={5} value={form.additionalNotes} onChange={(e) => set('additionalNotes', e.target.value)} placeholder="Describe the car's highlights, condition, features..." />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar — Status & Quick Info */}
          <div className="adm-form-sidebar">
            <div className="adm-form-card">
              <SectionHeader id="status" title="Listing Status" />
              {openSections.status && (
                <div className="adm-form-body">
                  <div className="adm-field">
                    <label className="adm-label">Status</label>
                    <select className="adm-input" value={form.listingStatus} onChange={(e) => set('listingStatus', e.target.value)}>
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="adm-field">
                    <label className="adm-label">Promotion Tier</label>
                    <select className="adm-input" value={form.promotionTier} onChange={(e) => set('promotionTier', e.target.value)}>
                      {promotionTiers.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="adm-field">
                    <label className="adm-label">Featured</label>
                    <div className="adm-toggle-row">
                      <button type="button" className={`adm-toggle-btn ${form.featuredListing ? 'active' : ''}`} onClick={() => set('featuredListing', true)}>Yes</button>
                      <button type="button" className={`adm-toggle-btn ${!form.featuredListing ? 'active' : ''}`} onClick={() => set('featuredListing', false)}>No</button>
                    </div>
                  </div>
                  <div className="adm-field">
                    <label className="adm-label">S-Plus Premium</label>
                    <div className="adm-toggle-row">
                      <button type="button" className={`adm-toggle-btn ${form.isSplus ? 'active' : ''}`} onClick={() => set('isSplus', true)}>Yes</button>
                      <button type="button" className={`adm-toggle-btn ${!form.isSplus ? 'active' : ''}`} onClick={() => set('isSplus', false)}>No</button>
                    </div>
                    {form.listingPriceInr >= 4000000 && !form.isSplus && (
                      <span className="adm-hint" style={{ color: 'var(--warning)' }}>Price is above ₹40L — consider marking as S-Plus</span>
                    )}
                  </div>
                  <div className="adm-field">
                    <label className="adm-label">New Car (Unregistered/Unused)</label>
                    <div className="adm-toggle-row">
                      <button type="button" className={`adm-toggle-btn ${form.isNewCar ? 'active' : ''}`} onClick={() => set('isNewCar', true)}>Yes</button>
                      <button type="button" className={`adm-toggle-btn ${!form.isNewCar ? 'active' : ''}`} onClick={() => set('isNewCar', false)}>No</button>
                    </div>
                  </div>
                  {form.isNewCar && (
                    <div className="adm-field">
                      <label className="adm-label">New Car Type</label>
                      <select className="adm-input" value={form.newCarType} onChange={(e) => set('newCarType', e.target.value)}>
                        <option value="">Select Type</option>
                        <option value="Unregistered">Unregistered</option>
                        <option value="Demo">Demo Car</option>
                        <option value="Unused">Unused / Display</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Summary */}
            <div className="adm-form-card">
              <div className="adm-form-body">
                <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Quick Summary</h4>
                <div className="adm-summary">
                  <div className="adm-summary-row"><span>Brand</span><strong>{form.brand || '—'}</strong></div>
                  <div className="adm-summary-row"><span>Model</span><strong>{form.model || '—'}</strong></div>
                  <div className="adm-summary-row"><span>Year</span><strong>{form.modelYear ?? '—'}</strong></div>
                  <div className="adm-summary-row"><span>Price</span><strong>{form.listingPriceInr ? formatINR(form.listingPriceInr) : '—'}</strong></div>
                  <div className="adm-summary-row"><span>Fuel</span><strong>{form.fuelType}</strong></div>
                  <div className="adm-summary-row"><span>Transmission</span><strong>{form.transmissionType}</strong></div>
                  <div className="adm-summary-row"><span>City</span><strong>{form.locationCity || '—'}</strong></div>
                  <div className="adm-summary-row"><span>Photos</span><strong>{form.images.filter(Boolean).length}</strong></div>
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={saving} type="submit">
              {saving ? 'Saving...' : isEditing ? 'Update Listing' : 'Publish Listing'}
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
