import type {
  Category,
  CategoryFilterDefinition,
  Listing,
  ListingPayload,
} from '../types'

const API_BASE = import.meta.env.PROD ? '/api' : '/api'

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Request failed with ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const api = {
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (payload: {
    name: string
    slug: string
    vehicleType: string
    description?: string
  }) => request<Category>('/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (
    id: number,
    payload: { name: string; slug: string; vehicleType: string; description?: string },
  ) => request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCategory: (id: number) => request<void>(`/categories/${id}`, { method: 'DELETE' }),

  getFilterDefinitions: () => request<CategoryFilterDefinition[]>('/filter-definitions'),
  getCategoryFilters: (categoryId: number) =>
    request<CategoryFilterDefinition[]>(`/category-filters/${categoryId}`),
  updateCategoryFilters: (categoryId: number, filterIds: number[]) =>
    request<{ categoryId: number; filterIds: number[] }>(`/category-filters/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ filterIds }),
    }),

  getListings: (query: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      }
    })

    return request<Listing[]>(`/listings?${params.toString()}`)
  },
  getListingById: (id: number) => request<Listing>(`/listings/${id}`),
  createListing: (payload: ListingPayload) =>
    request<Listing>('/listings', { method: 'POST', body: JSON.stringify(payload) }),
  updateListing: (id: number, payload: ListingPayload) =>
    request<Listing>(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteListing: (id: number) => request<void>(`/listings/${id}`, { method: 'DELETE' }),

  uploadListingImage: async (file: File) => {
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch(`${API_BASE}/uploads/image`, {
      credentials: 'include',
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || `Image upload failed with ${response.status}`)
    }

    return (await response.json()) as { url: string; path: string; fileName: string }
  },

  login: (email: string, password: string) =>
    request<{ user: unknown }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, name: string) =>
    request<{ user: unknown }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  refreshToken: () =>
    request<{ user: unknown }>('/auth/refresh', { method: 'POST' }),
  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),
  getMe: () =>
    request<{ user: unknown }>('/auth/me'),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  getUsers: () =>
    request<Array<unknown>>('/auth/users'),
  createUser: (data: { email: string; password: string; name: string; role: string }) =>
    request<{ user: unknown }>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    request<void>(`/auth/users/${id}`, { method: 'DELETE' }),
  updateUser: (id: number, data: Record<string, unknown>) =>
    request<{ user: unknown }>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getSiteConfig: () => request<Record<string, unknown>>('/site-config'),
  getSiteConfigKey: (key: string) => request<{ key: string; value: unknown }>(`/site-config/${key}`),
  updateSiteConfig: (key: string, value: unknown) =>
    request<{ key: string; value: unknown }>(`/site-config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  // Favorites (Wishlist)
  getFavorites: () => request<number[]>('/favorites'),
  addFavorite: (listingId: number) =>
    request<{ message: string; listingId: number }>(`/favorites/${listingId}`, { method: 'POST' }),
  removeFavorite: (listingId: number) =>
    request<{ message: string; listingId: number }>(`/favorites/${listingId}`, { method: 'DELETE' }),
  syncFavorites: (ids: number[]) =>
    request<number[]>('/favorites', { method: 'PUT', body: JSON.stringify({ ids }) }),

  // Test Drive Bookings
  getBookings: () => request<Array<Record<string, unknown>>>('/bookings'),
  createBooking: (data: {
    listingId: number
    carTitle?: string
    name: string
    phone: string
    email?: string
    preferredDate?: string
    preferredTime?: string
    locationPreference?: string
    notes?: string
  }) => request<{ id: number; message: string }>('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id: number) =>
    request<{ message: string }>(`/bookings/${id}`, { method: 'DELETE' }),

  // Admin Bookings
  getAdminBookings: () => request<Array<Record<string, unknown>>>('/admin/bookings'),
  updateBookingStatus: (id: number, status: string) =>
    request<{ message: string }>(`/admin/update-booking-status?bookingId=${id}&status=${encodeURIComponent(status)}`),
}
