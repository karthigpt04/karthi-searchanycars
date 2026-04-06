'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';

interface Booking { id: number; listingId: number; carTitle: string; name: string; phone: string; preferredDate: string | null; preferredTime: string | null; locationPreference: string; notes: string | null; status: string; createdAt: string; listing?: { title?: string; brand?: string; model?: string }; }

const statusColors: Record<string, string> = { pending: '#FF9800', confirmed: '#4CAF50', completed: '#2196F3', cancelled: '#F44336' };
const statusBgs: Record<string, string> = { pending: '#FFF3E0', confirmed: '#E8F5E9', completed: '#E3F2FD', cancelled: '#FFEBEE' };
const statusLabels: Record<string, string> = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

export default function BookingsClient() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    api.getBookings().then((data) => { if (!cancelled) setBookings(data as unknown as Booking[]); })
      .catch(() => { if (!cancelled) setError('Failed to load bookings'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this booking?')) return;
    try { await api.cancelBooking(id); setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b)); } catch { alert('Failed to cancel'); }
  };

  if (!authLoading && !user) {
    return (<main><div className="page-hero"><div className="container"><h1>My Bookings</h1><p>Sign in to view your bookings</p></div></div><section className="section"><div className="container" style={{ textAlign: 'center' }}><Link href="/login" className="btn btn-primary">Sign In</Link></div></section></main>);
  }

  return (
    <main>
      <div className="page-hero"><div className="container"><h1>My Bookings</h1><p>Your test drive appointments</p></div></div>
      <section className="section"><div className="container">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>{[1, 2, 3].map((i) => (<div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />))}</div>
        ) : error ? (
          <div className="empty-state"><h3>Something went wrong</h3><p>{error}</p></div>
        ) : bookings.length === 0 ? (
          <div className="empty-state"><h3>No bookings yet</h3><p>Browse cars and book a test drive.</p><Link href="/search" className="btn btn-primary">Browse Cars</Link></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookings.map((b) => (
              <div key={b.id} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <Link href={`/car/${b.listingId}`} style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', textDecoration: 'none' }}>{b.carTitle || 'Car'}</Link>
                    {b.listing?.brand && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>{b.listing.brand} {b.listing.model}</p>}
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 12px', borderRadius: 8, background: statusBgs[b.status] || '#F5F5F5', color: statusColors[b.status] || '#757575' }}>{statusLabels[b.status] || b.status}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {b.preferredDate && <span>📅 {b.preferredDate}</span>}
                  {b.preferredTime && <span>🕐 {b.preferredTime}</span>}
                  <span>📍 {b.locationPreference === 'home' ? 'Home Test Drive' : 'Visit Hub'}</span>
                  <span>📞 {b.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Booked {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {b.status === 'pending' && <button onClick={() => handleCancel(b.id)} type="button" style={{ background: 'var(--error-bg)', border: '1px solid var(--error)', color: 'var(--error)', padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Cancel Booking</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div></section>
    </main>
  );
}
