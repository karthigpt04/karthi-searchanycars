'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../src/lib/api';
import { CarCard } from '../../src/components/CarCard';
import { useWishlist } from '../../src/context/WishlistContext';

type Listing = Record<string, unknown> & { id: number; title: string };

export default function WishlistClient() {
  const { wishlistIds, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const [cars, setCars] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (wishlistLoading) return;
    if (wishlistIds.length === 0) { setCars([]); setLoading(false); return; }
    let cancelled = false;
    api.getListings({ limit: 100 }).then((resp) => {
      if (cancelled) return;
      const r = resp as Record<string, unknown>;
      const data = (Array.isArray(r.data) ? r.data : []) as Listing[];
      setCars(data.filter((c) => wishlistIds.includes(c.id)));
    }).catch(() => { if (!cancelled) setError('Failed to load wishlist.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wishlistIds, wishlistLoading]);

  const handleToggle = (id: number) => { toggleWishlist(id); setCars((prev) => prev.filter((c) => c.id !== id)); };

  return (
    <main>
      <div className="page-hero"><div className="container"><h1>My Wishlist</h1><p>Cars you&apos;ve saved for later.</p></div></div>
      <section className="section"><div className="container">
        {loading || wishlistLoading ? (
          <div className="card-grid">{[1, 2, 3].map((i) => (<div key={i} className="skeleton-card"><div className="skeleton-image" /><div className="skeleton-text-lg skeleton" /><div className="skeleton-text skeleton" /></div>))}</div>
        ) : error ? (
          <div className="empty-state"><h3>Something went wrong</h3><p>{error}</p></div>
        ) : cars.length > 0 ? (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{cars.length} car{cars.length !== 1 ? 's' : ''} in your wishlist</p>
            <div className="card-grid">{cars.map((car) => (<CarCard key={car.id} car={car} isWishlisted onToggleWishlist={handleToggle} />))}</div>
          </>
        ) : (
          <div className="empty-state"><h3>Your wishlist is empty</h3><p>Browse our collection and tap the heart icon to save cars.</p><Link href="/search" className="btn btn-primary">Browse Cars</Link></div>
        )}
      </div></section>
    </main>
  );
}
