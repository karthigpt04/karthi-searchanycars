import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

interface Props {
  carTitle: string
  listingId: number
  onClose: () => void
}

export const BookTestDriveModal = ({ carTitle, listingId, onClose }: Props) => {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [location, setLocation] = useState('home')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name || !phone || !date || !timeSlot) return
    if (!/^\+?[\d\s-]{10,15}$/.test(phone.replace(/\s/g, ''))) return

    setSubmitting(true)
    setError('')

    try {
      if (user) {
        // Logged in — send to backend API
        await api.createBooking({
          listingId,
          carTitle,
          name,
          phone,
          preferredDate: date,
          preferredTime: timeSlot,
          locationPreference: location,
        })
      }
      // Always show success (guest bookings are client-side only)
      setSubmitted(true)
    } catch {
      setError('Failed to submit booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
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

              {!user && (
                <p style={{ fontSize: '0.82rem', color: 'var(--warning)', background: '#FFF3E0', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  Sign in to save your booking and track its status.
                </p>
              )}

              {error && (
                <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</p>
              )}

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
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
