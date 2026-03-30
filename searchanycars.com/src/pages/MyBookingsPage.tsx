import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

interface Booking {
  id: number
  listing_id: number
  car_title: string
  listing_title?: string
  brand?: string
  model?: string
  listing_price_inr?: number
  name: string
  phone: string
  preferred_date: string | null
  preferred_time: string | null
  location_preference: string
  notes: string | null
  status: string
  created_at: string
  location_city?: string
}

const statusColors: Record<string, string> = {
  pending: '#FF9800',
  confirmed: '#4CAF50',
  completed: '#2196F3',
  cancelled: '#F44336',
}

const statusBgs: Record<string, string> = {
  pending: '#FFF3E0',
  confirmed: '#E8F5E9',
  completed: '#E3F2FD',
  cancelled: '#FFEBEE',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const MyBookingsPage = () => {
  const { user, loading: authLoading } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    api.getBookings()
      .then((data) => {
        if (!cancelled) setBookings(data as unknown as Booking[])
      })
      .catch(() => { if (!cancelled) setError('Failed to load bookings') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, authLoading])

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    try {
      await api.cancelBooking(id)
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b))
    } catch {
      alert('Failed to cancel booking')
    }
  }

  if (!authLoading && !user) {
    return (
      <main>
        <div className="page-hero">
          <div className="container">
            <h1>My Bookings</h1>
            <p>Sign in to view your test drive bookings</p>
          </div>
        </div>
        <section className="section">
          <div className="container" style={{ textAlign: 'center' }}>
            <Link to="/login" className="btn btn-primary">Sign In</Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>My Bookings</h1>
          <p>Your test drive appointments</p>
        </div>
      </div>
      <section className="section">
        <div className="container">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card" style={{ height: 120, borderRadius: 12 }}>
                  <div className="skeleton" style={{ height: '100%', borderRadius: 12 }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()} type="button">Retry</button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <h3>No bookings yet</h3>
              <p>Browse cars and book a test drive to get started.</p>
              <Link to="/search" className="btn btn-primary">Browse Cars</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {bookings.map((b) => (
                <div key={b.id} style={{
                  background: 'var(--bg-white, #fff)',
                  borderRadius: 16,
                  padding: '1.25rem',
                  border: '1px solid var(--border, #E0E0E0)',
                  boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08))',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <Link to={`/car/${b.listing_id}`} style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy, #1A237E)', textDecoration: 'none' }}>
                        {b.car_title || b.listing_title || 'Car'}
                      </Link>
                      {b.brand && b.model && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #757575)', marginTop: 2 }}>{b.brand} {b.model}</p>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: 8,
                      background: statusBgs[b.status] || '#F5F5F5',
                      color: statusColors[b.status] || '#757575',
                    }}>
                      {statusLabels[b.status] || b.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary, #757575)' }}>
                    {b.preferred_date && (
                      <span>📅 {b.preferred_date}</span>
                    )}
                    {b.preferred_time && (
                      <span>🕐 {b.preferred_time}</span>
                    )}
                    <span>📍 {b.location_preference === 'home' ? 'Home Test Drive' : 'Visit Hub'}</span>
                    <span>📞 {b.phone}</span>
                  </div>

                  {b.notes && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #9E9E9E)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      Note: {b.notes}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light, #EEEEEE)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #9E9E9E)' }}>
                      Booked {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {b.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        type="button"
                        style={{
                          background: 'var(--error-bg, #FFEBEE)',
                          border: '1px solid var(--error, #F44336)',
                          color: 'var(--error, #F44336)',
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
