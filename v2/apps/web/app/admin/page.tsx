'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../src/lib/api';
import { formatINR, formatKM, PLACEHOLDER_CAR_IMAGE, carUrl } from '../../src/utils/format';

type Listing = Record<string, unknown> & {
  id: number; title: string; brand: string; model: string;
  listing_code: string; listing_price_inr: number; listing_status: string;
  fuel_type?: string; transmission_type?: string; total_km_driven?: number;
  location_city?: string; images?: string[]; featured_listing?: boolean;
  is_splus?: boolean; inspection_score?: number; ownership_type?: string;
  views_count?: number; lead_count?: number; slug?: string;
};

type Booking = Record<string, unknown> & {
  id: number; listing_id: number; name: string; phone: string; email?: string;
  preferred_date?: string; preferred_time?: string; location_preference?: string;
  status: string; notes?: string; created_at: string;
  listing_title?: string; listing?: { title: string; id: number };
  user?: { name: string; email: string };
};

const statuses = ['Active', 'Reserved', 'Sold', 'Draft'];

export default function AdminPage() {
  const [tab, setTab] = useState<'inventory' | 'bookings'>('inventory');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingStatusEdits, setBookingStatusEdits] = useState<Record<number, string>>({});
  const [bookingSaving, setBookingSaving] = useState<number | null>(null);
  const [bookingSaved, setBookingSaved] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getListings({ limit: 500 }).then((resp) => {
      const r = resp as Record<string, unknown>;
      const data = (Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []) as Listing[];
      if (!cancelled) setListings(data);
    }).catch(() => { if (!cancelled) setLoadError('Failed to load listings. Please refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (tab !== 'bookings') return;
    setBookingsLoading(true);
    api.getAdminBookings().then((data) => {
      setBookings(data as Booking[]);
    }).catch(() => {
      setMessage('Failed to load bookings.');
    }).finally(() => setBookingsLoading(false));
  }, [tab]);

  const handleDelete = async (id: number) => {
    try {
      await api.deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
      setMessage('Listing deleted successfully.');
      setDeleteConfirm(null);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to delete listing.');
    }
  };

  const handleBookingStatusUpdate = async (bookingId: number) => {
    const newStatus = bookingStatusEdits[bookingId];
    if (!newStatus) return;
    setBookingSaving(bookingId);
    try {
      await api.updateBookingStatus(bookingId, newStatus);
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b));
      setBookingStatusEdits((prev) => { const n = { ...prev }; delete n[bookingId]; return n; });
      setBookingSaved(bookingId);
      setTimeout(() => setBookingSaved(null), 2000);
    } catch {
      setMessage('Failed to update booking status.');
    } finally {
      setBookingSaving(null);
    }
  };

  const filtered = listings.filter((car) => {
    const matchSearch = !search ||
      car.title.toLowerCase().includes(search.toLowerCase()) ||
      car.brand.toLowerCase().includes(search.toLowerCase()) ||
      car.listing_code.toLowerCase().includes(search.toLowerCase()) ||
      (car.location_city ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || car.listing_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = statuses.reduce((acc, s) => {
    acc[s] = listings.filter((l) => l.listing_status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); } catch { return d; }
  };
  const formatDateTime = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
  };

  return (
    <main className="adm">
      {/* Admin Header */}
      <div className="adm-header">
        <div className="container">
          <div className="adm-header-row">
            <div>
              <h1 className="adm-title">{tab === 'inventory' ? 'Inventory Dashboard' : 'Test Drive Bookings'}</h1>
              <p className="adm-subtitle">
                {tab === 'inventory' ? `${listings.length} total listings` : `${bookings.length} total bookings`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="adm-tab-switcher">
                <button className={`adm-tab-btn ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')} type="button">Inventory</button>
                <button className={`adm-tab-btn ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')} type="button">Bookings</button>
              </div>
              <Link href="/admin/settings" className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>Site Settings</Link>
              <Link href="/admin/car/new" className="btn btn-primary btn-lg">+ List New Car</Link>
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

      {tab === 'inventory' ? (
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

          {/* Filters & Search */}
          <div className="container" style={{ marginTop: '1.5rem' }}>
            <div className="adm-toolbar">
              <div className="adm-search-box">
                <span className="adm-search-icon">&#128269;</span>
                <input
                  className="adm-search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, brand, code, city..."
                />
                {search && (
                  <button className="adm-search-clear" onClick={() => setSearch('')} type="button">&#10005;</button>
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
                        {car.listing_code} &middot; {car.brand} {car.model} &middot;{' '}
                        {car.fuel_type ?? '\u2014'} &middot; {car.transmission_type ?? '\u2014'} &middot;{' '}
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
                      {car.location_city ?? '\u2014'}
                    </span>
                    <span className="adm-td" style={{ width: 80 }}>
                      {car.views_count ?? 0}
                    </span>
                    <span className="adm-td" style={{ width: 80 }}>
                      {car.lead_count ?? 0}
                    </span>
                    <span className="adm-td" style={{ width: 150 }}>
                      <div className="adm-actions">
                        <Link href={`/admin/car/${car.id}/edit`} className="btn btn-sm btn-outline">
                          Edit
                        </Link>
                        <Link href={carUrl(car)} className="btn btn-sm btn-ghost" target="_blank">
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
                <Link href="/admin/car/new" className="btn btn-primary">+ List New Car</Link>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── Bookings Tab ── */
        <div className="container" style={{ marginTop: '1.5rem', marginBottom: '3rem' }}>
          {bookingsLoading ? (
            <div className="adm-table-card">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="adm-row-skeleton">
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 11, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : bookings.length > 0 ? (
            <div className="adm-table-card">
              <div className="adm-table-head">
                <span className="adm-th" style={{ width: 40 }}>#</span>
                <span className="adm-th" style={{ flex: 1.5 }}>Car</span>
                <span className="adm-th" style={{ flex: 1 }}>Customer</span>
                <span className="adm-th" style={{ width: 140 }}>Contact</span>
                <span className="adm-th" style={{ width: 120 }}>Date/Time</span>
                <span className="adm-th" style={{ width: 110 }}>Location</span>
                <span className="adm-th" style={{ width: 180 }}>Status</span>
                <span className="adm-th" style={{ width: 100 }}>Booked</span>
              </div>

              {bookings.map((b, i) => {
                const currentStatus = bookingStatusEdits[b.id] ?? b.status;
                const hasChanged = bookingStatusEdits[b.id] !== undefined && bookingStatusEdits[b.id] !== b.status;
                return (
                  <div key={b.id} className="adm-table-row">
                    <span className="adm-td" style={{ width: 40, color: 'var(--text-muted)' }}>{i + 1}</span>
                    <span className="adm-td" style={{ flex: 1.5 }}>
                      <Link href={`/car/${b.listing_id}`} className="adm-row-title" style={{ color: 'var(--navy)', textDecoration: 'none' }}>
                        {b.listing_title ?? (b.listing as Booking['listing'])?.title ?? `Listing #${b.listing_id}`}
                      </Link>
                    </span>
                    <span className="adm-td" style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{b.name ?? (b.user as Booking['user'])?.name ?? '\u2014'}</div>
                    </span>
                    <span className="adm-td" style={{ width: 140 }}>
                      <div style={{ fontSize: '0.82rem' }}>{b.phone ?? '\u2014'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.email ?? (b.user as Booking['user'])?.email ?? ''}</div>
                    </span>
                    <span className="adm-td" style={{ width: 120 }}>
                      <div style={{ fontSize: '0.82rem' }}>
                        {b.preferred_date ? formatDate(b.preferred_date) : '\u2014'}
                        {b.preferred_time ? `, ${b.preferred_time}` : ''}
                      </div>
                    </span>
                    <span className="adm-td" style={{ width: 110, fontSize: '0.82rem' }}>
                      {b.location_preference ?? '\u2014'}
                    </span>
                    <span className="adm-td" style={{ width: 180 }}>
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <select
                          className="adm-input"
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', flex: 1 }}
                          value={currentStatus}
                          onChange={(e) => setBookingStatusEdits((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        {hasChanged && (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleBookingStatusUpdate(b.id)}
                            disabled={bookingSaving === b.id}
                            type="button"
                          >
                            {bookingSaving === b.id ? '...' : 'Update'}
                          </button>
                        )}
                        {bookingSaved === b.id && <span style={{ color: 'var(--success)', fontSize: '1rem' }}>&#10003;</span>}
                      </div>
                      {b.notes && <span title={b.notes as string} style={{ cursor: 'help', fontSize: '0.82rem' }}>&#128221;</span>}
                    </span>
                    <span className="adm-td" style={{ width: 100, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {b.created_at ? formatDateTime(b.created_at) : '\u2014'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No bookings yet</h3>
              <p>Test drive bookings from customers will appear here.</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
