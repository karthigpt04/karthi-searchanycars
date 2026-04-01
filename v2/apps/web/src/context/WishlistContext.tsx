'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const WISHLIST_STORAGE_KEY = 'sac_wishlist';

interface WishlistContextType {
  wishlistIds: number[];
  isWishlisted: (id: number) => boolean;
  toggleWishlist: (id: number) => void;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlistIds: [],
  isWishlisted: () => false,
  toggleWishlist: () => {},
  loading: false,
});

export const useWishlist = () => useContext(WishlistContext);

const getLocalIds = (): number[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const setLocalIds = (ids: number[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
};

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setWishlistIds(getLocalIds());
  }, []);

  // When user logs in: merge localStorage into API, then load from API
  useEffect(() => {
    if (!user) {
      setWishlistIds(getLocalIds());
      setSynced(false);
      return;
    }

    if (synced) return;

    let cancelled = false;
    setLoading(true);

    const syncWithServer = async () => {
      try {
        const localIds = getLocalIds();
        let serverIds: number[];
        if (localIds.length > 0) {
          serverIds = await api.syncFavorites(localIds);
        } else {
          serverIds = await api.getFavorites();
        }
        if (!cancelled) {
          setWishlistIds(serverIds);
          setLocalIds(serverIds);
          setSynced(true);
        }
      } catch {
        if (!cancelled) setWishlistIds(getLocalIds());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    syncWithServer();
    return () => {
      cancelled = true;
    };
  }, [user, synced]);

  const isWishlisted = useCallback(
    (id: number) => wishlistIds.includes(id),
    [wishlistIds]
  );

  const toggleWishlist = useCallback(
    (id: number) => {
      const isCurrentlyWishlisted = wishlistIds.includes(id);
      const nextIds = isCurrentlyWishlisted
        ? wishlistIds.filter((x) => x !== id)
        : [...wishlistIds, id];

      setWishlistIds(nextIds);
      setLocalIds(nextIds);

      if (user) {
        if (isCurrentlyWishlisted) {
          api.removeFavorite(id).catch(() => {
            setWishlistIds(wishlistIds);
            setLocalIds(wishlistIds);
          });
        } else {
          api.addFavorite(id).catch(() => {
            setWishlistIds(wishlistIds);
            setLocalIds(wishlistIds);
          });
        }
      }
    },
    [wishlistIds, user]
  );

  return (
    <WishlistContext.Provider value={{ wishlistIds, isWishlisted, toggleWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};
