import type {
  Category,
  CategoryFilterDefinition,
  Listing,
  ListingPayload,
} from '../types'

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api')

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
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
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || `Image upload failed with ${response.status}`)
    }

    return (await response.json()) as { url: string; path: string; fileName: string }
  },
}
