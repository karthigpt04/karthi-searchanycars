import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function errorResponse(status: number, body = '') {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  };
}

function noContentResponse() {
  return {
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
    text: () => Promise.resolve(''),
  };
}

const API_BASE = 'http://localhost:4000';

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// getSiteConfig
// ---------------------------------------------------------------------------
describe('api.getSiteConfig', () => {
  it('calls GET /api/v1/site-config', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ hero: {} }));
    const result = await api.getSiteConfig();
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/site-config`);
    expect(init.credentials).toBe('include');
    expect(result).toEqual({ hero: {} });
  });
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------
describe('api.login', () => {
  it('sends POST with email and password', async () => {
    const payload = { user: { id: 1 }, accessToken: 'tok' };
    mockFetch.mockResolvedValueOnce(jsonResponse(payload));
    const result = await api.login('a@b.com', 'pass123');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/auth/login`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'pass123' });
    expect(result).toEqual(payload);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));
    await expect(api.login('a@b.com', 'wrong')).rejects.toThrow('Unauthorized');
  });
});

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------
describe('api.register', () => {
  it('sends POST with email, password, name', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ user: {}, accessToken: 'tok' }));
    await api.register('a@b.com', 'pass', 'Alice');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/auth/register`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'pass', name: 'Alice' });
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------
describe('api.logout', () => {
  it('sends POST to logout endpoint', async () => {
    mockFetch.mockResolvedValueOnce(noContentResponse());
    await api.logout();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/auth/logout`);
    expect(init.method).toBe('POST');
  });
});

// ---------------------------------------------------------------------------
// getMe
// ---------------------------------------------------------------------------
describe('api.getMe', () => {
  it('calls GET /api/v1/auth/me', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ user: { id: 1 } }));
    const result = await api.getMe();
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/auth/me`);
    expect(result).toEqual({ user: { id: 1 } });
  });
});

// ---------------------------------------------------------------------------
// getListings
// ---------------------------------------------------------------------------
describe('api.getListings', () => {
  it('builds query params from object', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: [], pagination: {} }));
    await api.getListings({ status: 'active', page: 1, limit: 10 });
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain('/api/v1/listings?');
    expect(url).toContain('status=active');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=10');
  });

  it('skips undefined and empty string values', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: [], pagination: {} }));
    await api.getListings({ status: undefined, brand: '', city: 'Delhi' });
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).not.toContain('status=');
    expect(url).not.toContain('brand=');
    expect(url).toContain('city=Delhi');
  });

  it('handles empty query object', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: [], pagination: {} }));
    await api.getListings({});
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toBe(`${API_BASE}/api/v1/listings?`);
  });
});

// ---------------------------------------------------------------------------
// getListingById
// ---------------------------------------------------------------------------
describe('api.getListingById', () => {
  it('calls GET /api/v1/listings/:id', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 5, title: 'Honda City' }));
    const result = await api.getListingById(5);
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/listings/5`);
    expect(result).toEqual({ id: 5, title: 'Honda City' });
  });
});

// ---------------------------------------------------------------------------
// createListing
// ---------------------------------------------------------------------------
describe('api.createListing', () => {
  it('sends POST with listing data', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 10 }));
    await api.createListing({ title: 'Test Car', brand: 'Honda' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/listings`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ title: 'Test Car', brand: 'Honda' });
  });
});

// ---------------------------------------------------------------------------
// updateListing
// ---------------------------------------------------------------------------
describe('api.updateListing', () => {
  it('sends PUT with id and data', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 3 }));
    await api.updateListing(3, { title: 'Updated' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/listings/3`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ title: 'Updated' });
  });
});

// ---------------------------------------------------------------------------
// deleteListing
// ---------------------------------------------------------------------------
describe('api.deleteListing', () => {
  it('sends DELETE and returns undefined for 204', async () => {
    mockFetch.mockResolvedValueOnce(noContentResponse());
    const result = await api.deleteListing(7);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/listings/7`);
    expect(init.method).toBe('DELETE');
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// uploadListingImage
// ---------------------------------------------------------------------------
describe('api.uploadListingImage', () => {
  it('sends FormData without Content-Type header', async () => {
    const file = new File(['data'], 'car.jpg', { type: 'image/jpeg' });
    mockFetch.mockResolvedValueOnce(jsonResponse({ url: '/img.jpg', thumbnail: '/t.jpg', card: '/c.jpg', full: '/f.jpg' }));
    await api.uploadListingImage(file);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/uploads/image`);
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    // Should NOT have Content-Type (browser sets it with boundary for FormData)
    expect(init.headers).toBeUndefined();
  });

  it('throws on non-ok response', async () => {
    const file = new File(['data'], 'car.jpg', { type: 'image/jpeg' });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 413 });
    await expect(api.uploadListingImage(file)).rejects.toThrow('Image upload failed: 413');
  });
});

// ---------------------------------------------------------------------------
// updateSiteConfig
// ---------------------------------------------------------------------------
describe('api.updateSiteConfig', () => {
  it('sends PUT with { value } body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));
    await api.updateSiteConfig('hero', { title: 'New Title' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/site-config/hero`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ value: { title: 'New Title' } });
  });
});

// ---------------------------------------------------------------------------
// getSiteConfigKey
// ---------------------------------------------------------------------------
describe('api.getSiteConfigKey', () => {
  it('calls GET /api/v1/site-config/:key', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ title: 'Hello' }));
    const result = await api.getSiteConfigKey('hero');
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/site-config/hero`);
    expect(result).toEqual({ title: 'Hello' });
  });
});

// ---------------------------------------------------------------------------
// getAdminBookings
// ---------------------------------------------------------------------------
describe('api.getAdminBookings', () => {
  it('calls GET /api/v1/admin/bookings', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([{ id: 1 }]));
    const result = await api.getAdminBookings();
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/admin/bookings`);
    expect(result).toEqual([{ id: 1 }]);
  });
});

// ---------------------------------------------------------------------------
// updateBookingStatus
// ---------------------------------------------------------------------------
describe('api.updateBookingStatus', () => {
  it('sends PATCH with status', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 2, status: 'confirmed' }));
    await api.updateBookingStatus(2, 'confirmed');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/admin/bookings/2/status`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ status: 'confirmed' });
  });
});

// ---------------------------------------------------------------------------
// Error handling (request helper)
// ---------------------------------------------------------------------------
describe('error handling', () => {
  it('throws with body text when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(400, 'Bad Request'));
    await expect(api.getSiteConfig()).rejects.toThrow('Bad Request');
  });

  it('throws with default message when body is empty', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500, ''));
    await expect(api.getSiteConfig()).rejects.toThrow('Request failed: 500');
  });

  it('throws on 403 forbidden', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(403, 'Forbidden'));
    await expect(api.getMe()).rejects.toThrow('Forbidden');
  });

  it('throws on 404 not found', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(404, 'Not Found'));
    await expect(api.getListingById(999)).rejects.toThrow('Not Found');
  });
});

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------
describe('api.getFavorites', () => {
  it('calls GET /api/v1/favorites', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([1, 2, 3]));
    const result = await api.getFavorites();
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/favorites`);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe('api.addFavorite', () => {
  it('sends POST to /api/v1/favorites/:id', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'ok' }));
    await api.addFavorite(5);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/favorites/5`);
    expect(init.method).toBe('POST');
  });
});

describe('api.removeFavorite', () => {
  it('sends DELETE to /api/v1/favorites/:id', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'ok' }));
    await api.removeFavorite(5);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/favorites/5`);
    expect(init.method).toBe('DELETE');
  });
});

describe('api.syncFavorites', () => {
  it('sends PUT with ids array', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([1, 2]));
    await api.syncFavorites([1, 2]);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/favorites`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ ids: [1, 2] });
  });
});

// ---------------------------------------------------------------------------
// Bookings (user)
// ---------------------------------------------------------------------------
describe('api.getBookings', () => {
  it('calls GET /api/v1/bookings', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.getBookings();
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/bookings`);
  });
});

describe('api.createBooking', () => {
  it('sends POST with booking data', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, message: 'ok' }));
    await api.createBooking({ listingId: 3, name: 'Bob', phone: '9999' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/bookings`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({ listingId: 3, name: 'Bob', phone: '9999' });
  });
});

describe('api.cancelBooking', () => {
  it('sends DELETE to /api/v1/bookings/:id', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'ok' }));
    await api.cancelBooking(4);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/bookings/4`);
    expect(init.method).toBe('DELETE');
  });
});

// ---------------------------------------------------------------------------
// Auth extras
// ---------------------------------------------------------------------------
describe('api.refreshToken', () => {
  it('sends POST to /api/v1/auth/refresh', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ user: {} }));
    await api.refreshToken();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/auth/refresh`);
    expect(init.method).toBe('POST');
  });
});

describe('api.forgotPassword', () => {
  it('sends POST with email', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'sent' }));
    await api.forgotPassword('a@b.com');
    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com' });
  });
});

describe('api.resetPassword', () => {
  it('sends POST with token and password', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'ok' }));
    await api.resetPassword('tok123', 'newpass');
    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ token: 'tok123', password: 'newpass' });
  });
});

describe('api.changePassword', () => {
  it('sends POST with current and new password', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'ok' }));
    await api.changePassword('old', 'new');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/auth/change-password`);
    expect(JSON.parse(init.body)).toEqual({ currentPassword: 'old', newPassword: 'new' });
  });
});

// ---------------------------------------------------------------------------
// Users (admin)
// ---------------------------------------------------------------------------
describe('api.getUsers', () => {
  it('calls GET /api/v1/auth/users', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.getUsers();
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/auth/users`);
  });
});

describe('api.createUser', () => {
  it('sends POST with user data', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ user: {} }));
    await api.createUser({ email: 'a@b.com', password: 'p', name: 'A', role: 'admin' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/auth/users`);
    expect(init.method).toBe('POST');
  });
});

describe('api.deleteUser', () => {
  it('sends DELETE to /api/v1/auth/users/:id', async () => {
    mockFetch.mockResolvedValueOnce(noContentResponse());
    await api.deleteUser(3);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/auth/users/3`);
    expect(init.method).toBe('DELETE');
  });
});

describe('api.updateUser', () => {
  it('sends PUT with user data', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ user: {} }));
    await api.updateUser(2, { name: 'Updated' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/auth/users/2`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ name: 'Updated' });
  });
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
describe('api.getCategories', () => {
  it('calls GET /api/v1/categories', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.getCategories();
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/categories`);
  });
});

// ---------------------------------------------------------------------------
// Content-Type header is set by default
// ---------------------------------------------------------------------------
describe('request headers', () => {
  it('includes Content-Type application/json by default', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.getSiteConfig();
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('includes credentials: include', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.getSiteConfig();
    const [, init] = mockFetch.mock.calls[0];
    expect(init.credentials).toBe('include');
  });
});
