'use client';

import { useState } from 'react';
import Link from 'next/link';

const brands = ['Maruti Suzuki','Hyundai','Tata','Honda','Kia','Mahindra','Toyota','Volkswagen','Skoda','Renault','Ford','MG','Nissan','BMW','Mercedes-Benz','Audi','Volvo','Jeep','Citroën','Porsche','Other'];
const fuelTypes = ['Petrol','Diesel','CNG','Electric','Hybrid','LPG'];
const transmissions = ['Manual','Automatic','AMT','CVT','DCT'];
const bodyTypes = ['Hatchback','Sedan','SUV','MUV','Coupe','Pickup','Wagon','Other'];
const colors = ['White','Black','Silver','Grey','Red','Blue','Brown','Beige','Green','Orange','Yellow','Maroon'];
const ownerTypes = ['First','Second','Third','Fourth+'];
const states = ['Andhra Pradesh','Bihar','Delhi','Goa','Gujarat','Haryana','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'];
const cities = ['New Delhi','Mumbai','Bengaluru','Chennai','Hyderabad','Pune','Ahmedabad','Jaipur','Lucknow','Kolkata','Chandigarh','Kochi'];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 25 }, (_, i) => currentYear - i);

export default function SellClient() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [brand, setBrand] = useState(''); const [model, setModel] = useState(''); const [variant, setVariant] = useState('');
  const [year, setYear] = useState(currentYear); const [regYear, setRegYear] = useState(currentYear);
  const [fuelType, setFuelType] = useState('Petrol'); const [transmission, setTransmission] = useState('Manual');
  const [bodyType, setBodyType] = useState(''); const [color, setColor] = useState('');
  const [kmDriven, setKmDriven] = useState(''); const [ownership, setOwnership] = useState('First');
  const [price, setPrice] = useState(''); const [negotiable, setNegotiable] = useState(true);
  const [state, setState] = useState(''); const [city, setCity] = useState('');
  const [regState, setRegState] = useState(''); const [description, setDescription] = useState('');
  const [sellerName, setSellerName] = useState(''); const [sellerPhone, setSellerPhone] = useState('');

  if (submitted) {
    return (<main><div className="sell-page-hero"><div className="container" style={{ textAlign: 'center' }}><div className="form-success-icon">✓</div><h1 style={{ color: '#fff', marginBottom: '0.75rem' }}>Car Listed Successfully!</h1><p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>Our team will review your listing and contact you within 24 hours.</p><Link href="/" className="btn btn-primary btn-lg">Back to Home</Link></div></div></main>);
  }

  return (
    <main>
      <div className="sell-page-hero"><div className="container"><h1 style={{ color: '#fff', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, marginBottom: '0.35rem' }}>Sell Your Car</h1><p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>Get the best price. Free listing. We handle everything.</p></div></div>
      <div className="sell-progress"><div className="container"><div className="sell-steps">
        {['Car Details', 'Specs & Condition', 'Pricing & Location', 'Photos & Contact'].map((label, i) => (
          <button key={label} className={`sell-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`} onClick={() => { if (i + 1 < step) setStep(i + 1); }} type="button">
            <span className="sell-step-num">{step > i + 1 ? '✓' : i + 1}</span><span className="sell-step-label">{label}</span>
          </button>
        ))}
      </div></div></div>

      <section className="section-sm"><div className="container-narrow">
        {step === 1 && (
          <div className="sell-form-card"><h2 className="sell-form-title">What car are you selling?</h2>
            <div className="sell-field"><label className="sell-label">Brand *</label><select className="sell-input" value={brand} onChange={e => setBrand(e.target.value)}><option value="">Select Brand</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
            <div className="sell-row-2"><div className="sell-field"><label className="sell-label">Model *</label><input className="sell-input" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g., Creta" /></div><div className="sell-field"><label className="sell-label">Variant</label><input className="sell-input" value={variant} onChange={e => setVariant(e.target.value)} placeholder="e.g., SX(O)" /></div></div>
            <div className="sell-row-2"><div className="sell-field"><label className="sell-label">Year *</label><select className="sell-input" value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div><div className="sell-field"><label className="sell-label">Reg Year</label><select className="sell-input" value={regYear} onChange={e => setRegYear(Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div></div>
            <div className="sell-row-2"><div className="sell-field"><label className="sell-label">Body Type</label><select className="sell-input" value={bodyType} onChange={e => setBodyType(e.target.value)}><option value="">Select</option>{bodyTypes.map(b => <option key={b} value={b}>{b}</option>)}</select></div><div className="sell-field"><label className="sell-label">Color</label><select className="sell-input" value={color} onChange={e => setColor(e.target.value)}><option value="">Select</option>{colors.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
            <div className="sell-nav"><div /><button className="btn btn-primary" disabled={!brand || !model} onClick={() => setStep(2)} type="button">Next: Specs &rarr;</button></div>
          </div>
        )}
        {step === 2 && (
          <div className="sell-form-card"><h2 className="sell-form-title">Engine & Condition</h2>
            <div className="sell-row-2"><div className="sell-field"><label className="sell-label">Fuel Type *</label><div className="sell-chip-row">{fuelTypes.map(f => <button key={f} className={`sell-chip ${fuelType === f ? 'active' : ''}`} onClick={() => setFuelType(f)} type="button">{f}</button>)}</div></div><div className="sell-field"><label className="sell-label">Transmission *</label><div className="sell-chip-row">{transmissions.map(t => <button key={t} className={`sell-chip ${transmission === t ? 'active' : ''}`} onClick={() => setTransmission(t)} type="button">{t}</button>)}</div></div></div>
            <div className="sell-row-2"><div className="sell-field"><label className="sell-label">KM Driven *</label><input className="sell-input" type="number" value={kmDriven} onChange={e => setKmDriven(e.target.value)} placeholder="e.g., 45000" /></div><div className="sell-field"><label className="sell-label">Ownership *</label><div className="sell-chip-row">{ownerTypes.map(o => <button key={o} className={`sell-chip ${ownership === o ? 'active' : ''}`} onClick={() => setOwnership(o)} type="button">{o}</button>)}</div></div></div>
            <div className="sell-field"><label className="sell-label">Reg State</label><select className="sell-input" value={regState} onChange={e => setRegState(e.target.value)}><option value="">Select</option>{states.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="sell-nav"><button className="btn btn-ghost" onClick={() => setStep(1)} type="button">&larr; Back</button><button className="btn btn-primary" disabled={!fuelType || !kmDriven} onClick={() => setStep(3)} type="button">Next: Pricing &rarr;</button></div>
          </div>
        )}
        {step === 3 && (
          <div className="sell-form-card"><h2 className="sell-form-title">Pricing & Location</h2>
            <div className="sell-field"><label className="sell-label">Expected Price (₹) *</label><input className="sell-input sell-input-price" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g., 850000" /></div>
            <label className="sell-checkbox"><input type="checkbox" checked={negotiable} onChange={e => setNegotiable(e.target.checked)} /><span>Price is negotiable</span></label>
            <div className="sell-row-2"><div className="sell-field"><label className="sell-label">State *</label><select className="sell-input" value={state} onChange={e => setState(e.target.value)}><option value="">Select</option>{states.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="sell-field"><label className="sell-label">City *</label><select className="sell-input" value={city} onChange={e => setCity(e.target.value)}><option value="">Select</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
            <div className="sell-nav"><button className="btn btn-ghost" onClick={() => setStep(2)} type="button">&larr; Back</button><button className="btn btn-primary" disabled={!price || !city || !state} onClick={() => setStep(4)} type="button">Next: Photos &rarr;</button></div>
          </div>
        )}
        {step === 4 && (
          <div className="sell-form-card"><h2 className="sell-form-title">Photos & Contact</h2>
            <div className="sell-field"><label className="sell-label">Additional Notes</label><textarea className="sell-input sell-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Service history, modifications..." rows={3} /></div>
            <div className="sell-divider" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Your Contact Details</h3>
            <div className="sell-row-2"><div className="sell-field"><label className="sell-label">Name *</label><input className="sell-input" value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="Full name" /></div><div className="sell-field"><label className="sell-label">Phone *</label><input className="sell-input" type="tel" value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} placeholder="10-digit mobile" /></div></div>
            <div className="sell-nav"><button className="btn btn-ghost" onClick={() => setStep(3)} type="button">&larr; Back</button><button className="btn btn-primary btn-lg" disabled={!sellerName || !sellerPhone} onClick={() => setSubmitted(true)} type="button">List My Car for Sale</button></div>
          </div>
        )}
        {brand && model && (<div className="sell-summary"><h4>Your Car</h4><p className="sell-summary-title">{year} {brand} {model} {variant}</p><div className="sell-summary-specs">{fuelType && <span>{fuelType}</span>}{transmission && <span>{transmission}</span>}{kmDriven && <span>{Number(kmDriven).toLocaleString('en-IN')} km</span>}{city && <span>{city}</span>}</div></div>)}
      </div></section>
    </main>
  );
}
