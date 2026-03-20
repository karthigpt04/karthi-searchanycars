import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  carTitle: string
  onClose: () => void
}

export const BookTestDriveModal = ({ carTitle, onClose }: Props) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [location, setLocation] = useState('home')
  const [submitted, setSubmitted] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name || !phone || !date || !timeSlot) return
    if (!/^\+?[\d\s-]{10,15}$/.test(phone.replace(/\s/g, ''))) return
    setSubmitted(true)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Book Test Drive</h2>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        {submitted ? (
          <div className="modal-body">
            <div className="form-success">
              <div className="form-success-icon">✓</div>
              <h3>Test Drive Booked!</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Your test drive for <strong>{carTitle}</strong> has been scheduled. Our team will call you within 2 hours to confirm.
              </p>
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '1rem' }} type="button">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                for <strong>{carTitle}</strong>
              </p>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" pattern="[\d\s\+\-]{10,15}" required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Preferred Date *</label>
                  <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Time Slot *</label>
                  <select className="form-select" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} required>
                    <option value="">Select</option>
                    <option value="10am-12pm">10 AM - 12 PM</option>
                    <option value="12pm-2pm">12 PM - 2 PM</option>
                    <option value="2pm-4pm">2 PM - 4 PM</option>
                    <option value="4pm-6pm">4 PM - 6 PM</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location Preference</label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="radio" name="location" value="home" checked={location === 'home'} onChange={() => setLocation('home')} />
                    Home Test Drive
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="radio" name="location" value="hub" checked={location === 'hub'} onChange={() => setLocation('hub')} />
                    Visit Hub
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Confirm Booking</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
