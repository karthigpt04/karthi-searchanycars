import { useState } from 'react'
import type { FormEvent } from 'react'
import { formatINR } from '../utils/format'

interface Props {
  carTitle: string
  carPrice: number
  onClose: () => void
}

export const ReserveCarModal = ({ carTitle, carPrice, onClose }: Props) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const depositAmount = carPrice >= 1500000 ? 20000 : carPrice >= 500000 ? 10000 : 5000

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name || !phone || !email) return
    setSubmitted(true)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Reserve This Car</h2>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        {submitted ? (
          <div className="modal-body">
            <div className="form-success">
              <div className="form-success-icon">✓</div>
              <h3>Car Reserved!</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <strong>{carTitle}</strong> has been reserved for you. Our team will contact you within 2 hours to complete the process.
              </p>
              <div style={{ background: 'var(--bg-light)', padding: '0.75rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Deposit Amount</span>
                  <strong>{formatINR(depositAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Hold Duration</span>
                  <strong>48 hours</strong>
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                100% refundable if cancelled within the hold period. Deposit will be applied to purchase price.
              </p>
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '1rem' }} type="button">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                for <strong>{carTitle}</strong>
              </p>

              <div style={{ background: '#FFF3E0', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--warning)' }}>Reservation Terms:</strong>
                <ul style={{ margin: '0.35rem 0 0 1.2rem', listStyle: 'disc', color: 'var(--text-secondary)' }}>
                  <li>Refundable deposit: <strong>{formatINR(depositAmount)}</strong></li>
                  <li>Car held for <strong>48 hours</strong></li>
                  <li>Deposit applied to purchase price</li>
                  <li>Full refund if cancelled within hold period</li>
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input className="form-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city" />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                Pay {formatINR(depositAmount)} & Reserve
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
