import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { CarCard } from '../components/CarCard'
import type { Listing } from '../types'
import { WISHLIST_STORAGE_KEY } from '../utils/format'

export const WishlistPage = () => {
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [cars, setCars] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (wishlistIds.length === 0) {
      setCars([])
      setLoading(false)
      return
    }
    api.getListings({}).then((data) => {
      if (cancelled) return
      const matched = data.filter((c) => wishlistIds.includes(c.id))
      setCars(matched)
      // Clean up stale IDs that no longer exist
      const validIds = matched.map((c) => c.id)
      const staleRemoved = wishlistIds.filter((id) => validIds.includes(id))
      if (staleRemoved.length !== wishlistIds.length) {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(staleRemoved))
      }
    }).catch(() => { if (!cancelled) setError('Failed to load wishlist. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [wishlistIds])

  const toggleWishlist = (id: number) => {
    setWishlistIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next))
      return next
    })
    // Optimistically remove from displayed cars
    setCars((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>My Wishlist</h1>
          <p>Cars you've saved for later. You'll be notified of price drops.</p>
        </div>
      </div>
      <section className="section">
        <div className="container">
          {loading ? (
            <div className="card-grid">
              {[1, 2, 3].map((i) => (<div key={i} className="skeleton-card"><div className="skeleton-image" /><div className="skeleton-text-lg skeleton" /><div className="skeleton-text skeleton" /></div>))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()} type="button">Retry</button>
            </div>
          ) : cars.length > 0 ? (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{cars.length} car{cars.length !== 1 ? 's' : ''} in your wishlist</p>
              <div className="card-grid">
                {cars.map((car) => (<CarCard key={car.id} car={car} isWishlisted={true} onToggleWishlist={toggleWishlist} />))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>Your wishlist is empty</h3>
              <p>Browse our collection and tap the heart icon to save cars you love.</p>
              <Link to="/search" className="btn btn-primary">Browse Cars</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
