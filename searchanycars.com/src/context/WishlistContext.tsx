import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'
import { WISHLIST_STORAGE_KEY } from '../utils/format'

interface WishlistContextType {
  wishlistIds: number[]
  isWishlisted: (id: number) => boolean
  toggleWishlist: (id: number) => void
  loading: boolean
}

const WishlistContext = createContext<WishlistContextType>({
  wishlistIds: [],
  isWishlisted: () => false,
  toggleWishlist: () => {},
  loading: false,
})

export const useWishlist = () => useContext(WishlistContext)

const getLocalIds = (): number[] => {
  try { return JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]') } catch { return [] }
}

const setLocalIds = (ids: number[]) => {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids))
}

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [wishlistIds, setWishlistIds] = useState<number[]>(getLocalIds)
  const [loading, setLoading] = useState(false)
  const [synced, setSynced] = useState(false)

  // When user logs in: merge localStorage into API, then load from API
  useEffect(() => {
    if (!user) {
      // Guest mode — use localStorage
      setWishlistIds(getLocalIds())
      setSynced(false)
      return
    }

    if (synced) return

    let cancelled = false
    setLoading(true)

    const syncWithServer = async () => {
      try {
        const localIds = getLocalIds()

        // If there are local IDs, merge them into the server first
        let serverIds: number[]
        if (localIds.length > 0) {
          serverIds = await api.syncFavorites(localIds)
        } else {
          serverIds = await api.getFavorites()
        }

        if (!cancelled) {
          setWishlistIds(serverIds)
          setLocalIds(serverIds) // Keep localStorage in sync as cache
          setSynced(true)
        }
      } catch {
        // API failed — fall back to localStorage
        if (!cancelled) {
          setWishlistIds(getLocalIds())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    syncWithServer()
    return () => { cancelled = true }
  }, [user, synced])

  const isWishlisted = useCallback(
    (id: number) => wishlistIds.includes(id),
    [wishlistIds],
  )

  const toggleWishlist = useCallback((id: number) => {
    const isCurrentlyWishlisted = wishlistIds.includes(id)
    const nextIds = isCurrentlyWishlisted
      ? wishlistIds.filter((x) => x !== id)
      : [...wishlistIds, id]

    // Optimistic update
    setWishlistIds(nextIds)
    setLocalIds(nextIds)

    // If logged in, also sync to API (fire-and-forget)
    if (user) {
      if (isCurrentlyWishlisted) {
        api.removeFavorite(id).catch(() => {
          // Revert on failure
          setWishlistIds(wishlistIds)
          setLocalIds(wishlistIds)
        })
      } else {
        api.addFavorite(id).catch(() => {
          setWishlistIds(wishlistIds)
          setLocalIds(wishlistIds)
        })
      }
    }
  }, [wishlistIds, user])

  return (
    <WishlistContext.Provider value={{ wishlistIds, isWishlisted, toggleWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  )
}
