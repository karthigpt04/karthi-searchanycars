const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Site config
  getSiteConfig: () => request<Record<string, unknown>>('/api/v1/site-config'),

  // Auth
  login: (email: string, password: string) =>
    request<{ user: unknown; accessToken: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name: string) =>
    request<{ user: unknown; accessToken: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  logout: () => request<void>('/api/v1/auth/logout', { method: 'POST' }),
  getMe: () => request<{ user: unknown }>('/api/v1/auth/me'),
  refreshToken: () =>
    request<{ user: unknown }>('/api/v1/auth/refresh', { method: 'POST' }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  getUsers: () => request<Array<unknown>>('/api/v1/auth/users'),
  createUser: (data: { email: string; password: string; name: string; role: string }) =>
    request<{ user: unknown }>('/api/v1/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteUser: (id: number) =>
    request<void>(`/api/v1/auth/users/${id}`, { method: 'DELETE' }),
  updateUser: (id: number, data: Record<string, unknown>) =>
    request<{ user: unknown }>(`/api/v1/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Categories
  getCategories: () => request<Array<unknown>>('/api/v1/categories'),

  // Listings
  getListings: (query: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    return request<{ data: Array<unknown>; pagination: unknown }>(
      `/api/v1/listings?${params.toString()}`
    );
  },
  getListingById: (id: number) => request<unknown>(`/api/v1/listings/${id}`),

  // Favorites
  getFavorites: () => request<number[]>('/api/v1/favorites'),
  addFavorite: (listingId: number) =>
    request<{ message: string }>(`/api/v1/favorites/${listingId}`, {
      method: 'POST',
    }),
  removeFavorite: (listingId: number) =>
    request<{ message: string }>(`/api/v1/favorites/${listingId}`, {
      method: 'DELETE',
    }),
  syncFavorites: (ids: number[]) =>
    request<number[]>('/api/v1/favorites', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),

  // Bookings
  getBookings: () => request<Array<unknown>>('/api/v1/bookings'),
  createBooking: (data: {
    listingId: number;
    name: string;
    phone: string;
    email?: string;
    preferredDate?: string;
    preferredTime?: string;
    locationPreference?: string;
    notes?: string;
  }) =>
    request<{ id: number; message: string }>('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancelBooking: (id: number) =>
    request<{ message: string }>(`/api/v1/bookings/${id}`, {
      method: 'DELETE',
    }),

  // Admin Listings
  createListing: (data: Record<string, unknown>) =>
    request<unknown>('/api/v1/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateListing: (id: number, data: Record<string, unknown>) =>
    request<unknown>(`/api/v1/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteListing: (id: number) =>
    request<void>(`/api/v1/listings/${id}`, { method: 'DELETE' }),

  // Admin Bookings
  getAdminBookings: () => request<Array<unknown>>('/api/v1/admin/bookings'),
  updateBookingStatus: (id: number, status: string) =>
    request<unknown>(`/api/v1/admin/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Site Config (per-key)
  getSiteConfigKey: (key: string) => request<unknown>(`/api/v1/site-config/${key}`),
  updateSiteConfig: (key: string, value: unknown) =>
    request<unknown>(`/api/v1/site-config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  // Image upload
  uploadListingImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/api/v1/uploads/image`, {
      credentials: 'include',
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Image upload failed: ${res.status}`);
    return res.json() as Promise<{ url: string; thumbnail: string; card: string; full: string }>;
  },
};
