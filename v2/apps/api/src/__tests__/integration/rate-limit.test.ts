import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";

// ---------------------------------------------------------------------------
// Override rate limits BEFORE any app code imports config.ts.
// vi.hoisted() runs before all vi.mock() factories, ensuring that when
// config.ts first evaluates it reads our overridden env vars.
// ---------------------------------------------------------------------------
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT_STRICT_MAX = "2";
  process.env.AUTH_RATE_LIMIT_STRICT_EMAIL_MAX = "1";
  process.env.AUTH_RATE_LIMIT_MODERATE_MAX = "3";
  process.env.RATE_LIMIT_MAX = "5000";
});

// ---------------------------------------------------------------------------
// Mock @searchanycars/db — must come before any app import
// ---------------------------------------------------------------------------

// Helper: creates a chainable query builder that resolves to `returnValue`
function chainable(returnValue: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "from",
    "where",
    "limit",
    "offset",
    "orderBy",
    "leftJoin",
    "innerJoin",
    "returning",
    "values",
    "set",
    "onConflictDoNothing",
    "groupBy",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make the chain thenable so `await db.select()...` resolves
  chain.then = (resolve: (v: unknown) => void) => resolve(returnValue);
  return chain;
}

const mockDb = {
  select: vi.fn(() => chainable([])),
  insert: vi.fn(() => chainable([])),
  update: vi.fn(() => chainable([])),
  delete: vi.fn(() => chainable([])),
  transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
    await fn(mockDb);
  }),
  execute: vi.fn(async () => ({ rows: [{ "?column?": 1 }] })),
};

// Stub table objects — the routes reference column names off these
const stubTable = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop === "string") return prop;
      return undefined;
    },
  },
);

vi.mock("@searchanycars/db", () => ({
  db: mockDb,
  users: stubTable,
  listings: stubTable,
  categories: stubTable,
  sessions: stubTable,
  passwordResetTokens: stubTable,
  userFavorites: stubTable,
  testDriveBookings: stubTable,
  siteConfig: stubTable,
  filterDefinitions: stubTable,
  categoryFilterMap: stubTable,
  auditLogs: stubTable,
}));

// Mock session service (used by auth routes)
vi.mock("../../services/sessionService.js", () => ({
  createSession: vi.fn(async () => {}),
  findSession: vi.fn(async () => null),
  deleteSession: vi.fn(async () => {}),
  softDeleteSession: vi.fn(async () => {}),
  deleteAllUserSessions: vi.fn(async () => {}),
  cleanExpiredSessions: vi.fn(async () => {}),
}));

// Mock email service
vi.mock("../../services/emailService.js", () => ({
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendBookingConfirmationEmail: vi.fn(async () => {}),
}));

// Mock upload service
vi.mock("../../services/uploadService.js", () => ({
  uploadImage: vi.fn(async () => ({ url: "/uploads/test.jpg" })),
}));

// Mock audit service
vi.mock("../../services/auditService.js", () => ({
  logAudit: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { generateAccessToken } from "../../services/authService.js";

function userToken() {
  return generateAccessToken({
    id: 1,
    email: "user@test.com",
    role: "user",
    name: "Test User",
  });
}

// ---------------------------------------------------------------------------
// Build the app once
// ---------------------------------------------------------------------------
let app: FastifyInstance;
let rawInject: FastifyInstance["inject"];
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

beforeAll(async () => {
  const { buildApp } = await import("../../app.js");
  app = await buildApp();
  await app.ready();

  rawInject = app.inject.bind(app);
  app.inject = ((opts: Record<string, unknown>) => {
    if (typeof opts === "object" && MUTATING.has(String(opts.method))) {
      opts.headers = {
        "x-csrf-protection": "1",
        ...(opts.headers as Record<string, string>),
      };
    }
    return rawInject(opts);
  }) as typeof app.inject;
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.select.mockImplementation(() => chainable([]));
  mockDb.insert.mockImplementation(() => chainable([]));
  mockDb.update.mockImplementation(() => chainable([]));
  mockDb.delete.mockImplementation(() => chainable([]));
});

// ===========================================================================
// Rate limiting tests
// ===========================================================================

describe("Per-route auth rate limiting", () => {
  describe("POST /login — strict limit (max: 2)", () => {
    it("allows requests within the limit then returns 429 after exceeding", async () => {
      // First request should NOT be rate limited (get 401 = invalid creds)
      const first = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "test@test.com", password: "secret123" },
      });
      expect(first.statusCode).not.toBe(429);

      // Second request still within limit
      const second = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "test@test.com", password: "secret123" },
      });
      expect(second.statusCode).not.toBe(429);

      // Third request should be rate limited
      const third = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "test@test.com", password: "secret123" },
      });
      expect(third.statusCode).toBe(429);
    });

    it("429 response includes rate limit headers", async () => {
      // The counter already has 3 from the previous test (state persists in-process),
      // so this request should immediately be 429.
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "test@test.com", password: "secret123" },
      });
      expect(res.statusCode).toBe(429);
      expect(res.headers["x-ratelimit-limit"]).toBeDefined();
      expect(res.headers["retry-after"]).toBeDefined();
    });
  });

  describe("POST /forgot-password — strictEmail limit (max: 1)", () => {
    it("returns 200 on first request then 429 on second", async () => {
      // First request succeeds
      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        payload: { email: "test@test.com" },
      });
      expect(res1.statusCode).toBe(200);

      // Second request: rate limited
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        payload: { email: "test@test.com" },
      });
      expect(res2.statusCode).toBe(429);
    });
  });

  describe("POST /register — strict limit (max: 2)", () => {
    it("returns 429 after exceeding the limit", async () => {
      // Send 2 requests (within limit)
      for (let i = 0; i < 2; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/v1/auth/register",
          payload: { email: `user${i}@test.com`, password: "secret123", name: "Test" },
        });
        expect(res.statusCode).not.toBe(429);
      }

      // Third request should be rate limited
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { email: "overflow@test.com", password: "secret123", name: "Test" },
      });
      expect(res.statusCode).toBe(429);
    });
  });

  describe("GET /me — inherits global limit (not strictly limited)", () => {
    it("is NOT rate limited at the auth strict level", async () => {
      const token = userToken();
      // Send 5 requests — should all succeed (not hit a 429)
      // because /me uses the global 5000/min limit, not the strict 2/min
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: "GET",
          url: "/api/v1/auth/me",
          headers: { authorization: `Bearer ${token}` },
        });
        // Might be 404 (mock returns empty), but should NOT be 429
        expect(res.statusCode).not.toBe(429);
      }
    });
  });

  describe("POST /refresh — moderate limit (max: 3)", () => {
    it("returns 429 after exceeding the moderate limit", async () => {
      // Send 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/v1/auth/refresh",
          cookies: { refresh_token: "some-token" },
        });
        expect(res.statusCode).not.toBe(429);
      }

      // Fourth request should be rate limited
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        cookies: { refresh_token: "some-token" },
      });
      expect(res.statusCode).toBe(429);
    });
  });
});
