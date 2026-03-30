import type React from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Listing } from '../types'
import { formatINR, formatKM, PLACEHOLDER_CAR_IMAGE } from '../utils/format'

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
  email?: string
  preferred_date: string | null
  preferred_time: string | null
  location_preference: string
  notes: string | null
  status: string
  created_at: string
  user_name?: string
  user_email?: string
  user_phone?: string
}

export const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'bookings'>('inventory')
  const [listings, setListings] = useState<Listing[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.getListings({}).then((data) => {
      if (!cancelled) setListings(data)
    }).catch(() => { if (!cancelled) setLoadError('Failed to load listings. Please refresh.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (activeTab !== 'bookings') return
    let cancelled = false
    setBookingsLoading(true)
    api.getAdminBookings()
      .then((data) => { if (!cancelled) setBookings(data as unknown as Booking[]) })
      .catch(() => { if (!cancelled) setMessage('Failed to load bookings') })
      .finally(() => { if (!cancelled) setBookingsLoading(false) })
    return () => { cancelled = true }
  }, [activeTab])

  // Track pending status changes per booking (before user clicks Update)
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({})
  // Track which bookings are currently being saved
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  // Track recently saved bookings (show checkmark)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  const handleStatusSave = async (bookingId: number) => {
    const newStatus = pendingStatus[bookingId]
    if (!newStatus) return

    setSavingIds((prev) => new Set(prev).add(bookingId))
    try {
      await api.updateBookingStatus(bookingId, newStatus)
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b))
      setPendingStatus((prev) => { const next = { ...prev }; delete next[bookingId]; return next })
      setSavedIds((prev) => new Set(prev).add(bookingId))
      setTimeout(() => setSavedIds((prev) => { const next = new Set(prev); next.delete(bookingId); return next }), 3000)
      setMessage(`Booking #${bookingId} updated to ${newStatus}`)
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Failed to update booking status. Please try again.')
    } finally {
      setSavingIds((prev) => { const next = new Set(prev); next.delete(bookingId); return next })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.deleteListing(id)
      setListings((prev) => prev.filter((l) => l.id !== id))
      setMessage('Listing deleted successfully.')
      setDeleteConfirm(null)
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Failed to delete listing.')
    }
  }

  const filtered = listings.filter((car) => {
    const matchSearch = !search ||
      car.title.toLowerCase().includes(search.toLowerCase()) ||
      car.brand.toLowerCase().includes(search.toLowerCase()) ||
      car.listing_code.toLowerCase().includes(search.toLowerCase()) ||
      (car.location_city ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || car.listing_status === statusFilter
    return matchSearch && matchStatus
  })

  const statuses = ['Active', 'Reserved', 'Sold', 'Draft']
  const statusCounts = statuses.reduce((acc, s) => {
    acc[s] = listings.filter((l) => l.listing_status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <main className="adm">
      {/* Admin Header */}
      <div className="adm-header">
        <div className="container">
          <div className="adm-header-row">
            <div>
              <h1 className="adm-title">Inventory Dashboard</h1>
              <p className="adm-subtitle">{listings.length} total listings</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to="/admin/settings" className="btn btn-outline btn-lg">Site Settings</Link>
              <Link to="/admin/car/new" className="btn btn-primary btn-lg">+ List New Car</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="container" style={{ display: 'flex', gap: '0.5rem', padding: '1rem 0', marginTop: '0.5rem' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory ({listings.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('bookings')}
        >
          Test Drive Bookings {bookings.length > 0 ? `(${bookings.length})` : ''}
        </button>
      </div>

      {activeTab === 'bookings' ? (
        <div className="container" style={{ paddingBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Test Drive Bookings</h2>
          {bookingsLoading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <div className="empty-state"><h3>No bookings yet</h3><p>Bookings will appear here when customers book test drives.</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Car</th>
                    <th style={thStyle}>Customer</th>
                    <th style={thStyle}>Contact</th>
                    <th style={thStyle}>Date / Time</th>
                    <th style={thStyle}>Location</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Booked</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
                      <td style={tdStyle}>{b.id}</td>
                      <td style={tdStyle}>
                        <Link to={`/car/${b.listing_id}`} style={{ color: 'var(--gold, #D4A853)', textDecoration: 'none', fontWeight: 600 }}>
                          {b.car_title || b.listing_title}
                        </Link>
                      </td>
                      <td style={tdStyle}>
                        <div>{b.user_name || b.name}</div>
                        {b.user_email && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.user_email}</div>}
                      </td>
                      <td style={tdStyle}>{b.phone || b.user_phone}</td>
                      <td style={tdStyle}>
                        {b.preferred_date || '—'}<br />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{b.preferred_time || ''}</span>
                      </td>
                      <td style={tdStyle}>{b.location_preference === 'home' ? 'Home' : 'Hub'}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            value={pendingStatus[b.id] ?? b.status}
                            onChange={(e) => setPendingStatus((prev) => ({ ...prev, [b.id]: e.target.value }))}
                            style={{
                              background: '#1E1E2E',
                              color: '#F0EDE6',
                              border: `2px solid ${pendingStatus[b.id] && pendingStatus[b.id] !== b.status ? '#D4A853' : '#3A3A4A'}`,
                              borderRadius: 8,
                              padding: '6px 10px',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          {pendingStatus[b.id] && pendingStatus[b.id] !== b.status && (
                            <button
                              type="button"
                              onClick={() => handleStatusSave(b.id)}
                              disabled={savingIds.has(b.id)}
                              style={{
                                background: '#D4A853',
                                color: '#0A0A0F',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: savingIds.has(b.id) ? 'wait' : 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {savingIds.has(b.id) ? 'Saving...' : 'Update'}
                            </button>
                          )}
                          {savedIds.has(b.id) && (
                            <span style={{ color: '#34D399', fontSize: '1rem' }} title="Saved">✓</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={tdStyle}>
                        {b.notes && <span title={b.notes} style={{ cursor: 'help' }}>📝</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Stats Strip */}
      <div className="adm-stats">
        <div className="container">
          <div className="adm-stats-grid">
            <div className="adm-stat-card">
              <span className="adm-stat-value">{listings.length}</span>
              <span className="adm-stat-label">Total Cars</span>
            </div>
            <div className="adm-stat-card adm-stat-green">
              <span className="adm-stat-value">{statusCounts['Active'] ?? 0}</span>
              <span className="adm-stat-label">Active</span>
            </div>
            <div className="adm-stat-card adm-stat-orange">
              <span className="adm-stat-value">{statusCounts['Reserved'] ?? 0}</span>
              <span className="adm-stat-label">Reserved</span>
            </div>
            <div className="adm-stat-card adm-stat-red">
              <span className="adm-stat-value">{statusCounts['Sold'] ?? 0}</span>
              <span className="adm-stat-label">Sold</span>
            </div>
            <div className="adm-stat-card">
              <span className="adm-stat-value">{listings.filter((l) => l.featured_listing).length}</span>
              <span className="adm-stat-label">Featured</span>
            </div>
            <div className="adm-stat-card" style={{ borderColor: '#D4AF37' }}>
              <span className="adm-stat-value">{listings.filter((l) => l.is_splus).length}</span>
              <span className="adm-stat-label">S-Plus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Toast */}
      {(message || loadError) && (
        <div className="container" style={{ marginTop: '1rem' }}>
          <div className={`adm-toast ${loadError ? 'adm-toast-error' : ''}`}>{loadError || message}</div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="container" style={{ marginTop: '1.5rem' }}>
        <div className="adm-toolbar">
          <div className="adm-search-box">
            <span className="adm-search-icon">🔍</span>
            <input
              className="adm-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, brand, code, city..."
            />
            {search && (
              <button className="adm-search-clear" onClick={() => setSearch('')} type="button">✕</button>
            )}
          </div>
          <div className="adm-status-filters">
            <button
              className={`adm-status-btn ${!statusFilter ? 'active' : ''}`}
              onClick={() => setStatusFilter('')}
              type="button"
            >
              All ({listings.length})
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                className={`adm-status-btn ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                type="button"
              >
                {s} ({statusCounts[s] ?? 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="container" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
        {loading ? (
          <div className="adm-table-card">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="adm-row-skeleton">
                <div className="skeleton" style={{ width: 60, height: 45, borderRadius: 6 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '30%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="adm-table-card">
            <div className="adm-table-head">
              <span className="adm-th" style={{ width: 80 }}>Image</span>
              <span className="adm-th" style={{ flex: 2 }}>Car Details</span>
              <span className="adm-th" style={{ width: 120 }}>Price</span>
              <span className="adm-th" style={{ width: 90 }}>Status</span>
              <span className="adm-th" style={{ width: 100 }}>City</span>
              <span className="adm-th" style={{ width: 80 }}>Views</span>
              <span className="adm-th" style={{ width: 80 }}>Leads</span>
              <span className="adm-th" style={{ width: 150 }}>Actions</span>
            </div>

            {filtered.map((car) => (
              <div key={car.id} className="adm-table-row">
                <span className="adm-td" style={{ width: 80 }}>
                  <img
                    src={car.images?.[0] ?? PLACEHOLDER_CAR_IMAGE}
                    alt=""
                    className="adm-row-img"
                  />
                </span>
                <span className="adm-td" style={{ flex: 2 }}>
                  <div className="adm-row-title">{car.title}</div>
                  <div className="adm-row-meta">
                    {car.listing_code} &middot; {car.brand} {car.model} &middot;
                    {car.fuel_type ?? '—'} &middot; {car.transmission_type ?? '—'} &middot;
                    {formatKM(car.total_km_driven ?? 0)}
                  </div>
                  <div className="adm-row-tags">
                    {car.featured_listing ? <span className="adm-tag adm-tag-coral">Featured</span> : null}
                    {car.is_splus ? <span className="adm-tag" style={{ background: '#D4AF37', color: '#0B0B0C' }}>S-Plus</span> : null}
                    {car.inspection_score ? <span className="adm-tag adm-tag-green">Inspected: {car.inspection_score}/100</span> : null}
                    {car.ownership_type === 'First' ? <span className="adm-tag adm-tag-blue">Single Owner</span> : null}
                  </div>
                </span>
                <span className="adm-td" style={{ width: 120 }}>
                  <div className="adm-row-price">{formatINR(car.listing_price_inr)}</div>
                </span>
                <span className="adm-td" style={{ width: 90 }}>
                  <span className={`adm-status-badge adm-status-${car.listing_status.toLowerCase()}`}>
                    {car.listing_status}
                  </span>
                </span>
                <span className="adm-td" style={{ width: 100 }}>
                  {car.location_city ?? '—'}
                </span>
                <span className="adm-td" style={{ width: 80 }}>
                  {car.views_count ?? 0}
                </span>
                <span className="adm-td" style={{ width: 80 }}>
                  {car.lead_count ?? 0}
                </span>
                <span className="adm-td" style={{ width: 150 }}>
                  <div className="adm-actions">
                    <Link to={`/admin/car/${car.id}/edit`} className="btn btn-sm btn-outline">
                      Edit
                    </Link>
                    <Link to={`/car/${car.id}`} className="btn btn-sm btn-ghost" target="_blank">
                      View
                    </Link>
                    {deleteConfirm === car.id ? (
                      <>
                        <button className="btn btn-sm" style={{ background: 'var(--error)', color: '#fff' }} onClick={() => handleDelete(car.id)} type="button">
                          Confirm
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setDeleteConfirm(null)} type="button">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }} onClick={() => setDeleteConfirm(car.id)} type="button">
                        Delete
                      </button>
                    )}
                  </div>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No listings found</h3>
            <p>{search || statusFilter ? 'Try adjusting your search or filters.' : 'Start by listing your first car.'}</p>
            <Link to="/admin/car/new" className="btn btn-primary">+ List New Car</Link>
          </div>
        )}
      </div>
      </>
      )}
    </main>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
}

const tdStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '0.88rem',
  verticalAlign: 'top',
}
