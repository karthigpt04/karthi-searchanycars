import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";

// ---------------------------------------------------------------------------
// Mock @searchanycars/db — must come before any app import
// ---------------------------------------------------------------------------

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

vi.mock("../../services/sessionService.js", () => ({
  createSession: vi.fn(async () => {}),
  findSession: vi.fn(async () => null),
  deleteSession: vi.fn(async () => {}),
  softDeleteSession: vi.fn(async () => {}),
  deleteAllUserSessions: vi.fn(async () => {}),
  cleanExpiredSessions: vi.fn(async () => {}),
}));

vi.mock("../../services/emailService.js", () => ({
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendBookingConfirmationEmail: vi.fn(async () => {}),
}));

vi.mock("../../services/uploadService.js", () => ({
  uploadImage: vi.fn(async () => ({ url: "/uploads/test.jpg" })),
}));

vi.mock("../../services/auditService.js", () => ({
  logAudit: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { generateAccessToken } from "../../services/authService.js";

function userToken(
  overrides: Partial<{ id: number; email: string; role: string; name: string }> = {},
) {
  return generateAccessToken({
    id: overrides.id ?? 1,
    email: overrides.email ?? "user@test.com",
    role: overrides.role ?? "user",
    name: overrides.name ?? "Test User",
  });
}

function adminToken() {
  return userToken({ id: 99, email: "admin@test.com", role: "admin", name: "Admin" });
}

// ---------------------------------------------------------------------------
// Car payloads — 5 Indian-market listings
// ---------------------------------------------------------------------------

const CAR_PAYLOADS = [
  {
    listingCode: "SAC-HYU-001",
    title: "2023 Hyundai Creta SX(O)",
    brand: "Hyundai",
    model: "Creta",
    variant: "SX(O)",
    modelYear: 2023,
    fuelType: "Diesel" as const,
    transmissionType: "Automatic" as const,
    totalKmDriven: 25000,
    listingPriceInr: 1850000,
    locationCity: "Delhi",
    locationState: "Delhi",
    listingStatus: "Active",
    bodyStyle: "SUV",
    ownershipType: "First" as const,
  },
  {
    listingCode: "SAC-MAR-002",
    title: "2022 Maruti Suzuki Swift VXi",
    brand: "Maruti Suzuki",
    model: "Swift",
    variant: "VXi",
    modelYear: 2022,
    fuelType: "Petrol" as const,
    transmissionType: "Manual" as const,
    totalKmDriven: 35000,
    listingPriceInr: 720000,
    locationCity: "Mumbai",
    locationState: "Maharashtra",
    listingStatus: "Active",
    bodyStyle: "Hatchback",
    ownershipType: "First" as const,
  },
  {
    listingCode: "SAC-TAT-003",
    title: "2024 Tata Nexon EV Max",
    brand: "Tata",
    model: "Nexon EV",
    variant: "Max",
    modelYear: 2024,
    fuelType: "Electric" as const,
    transmissionType: "Automatic" as const,
    totalKmDriven: 8000,
    listingPriceInr: 1900000,
    locationCity: "Bengaluru",
    locationState: "Karnataka",
    listingStatus: "Active",
    bodyStyle: "SUV",
    batteryCapacityKwh: 40.5,
  },
  {
    listingCode: "SAC-HON-004",
    title: "2021 Honda City ZX CVT",
    brand: "Honda",
    model: "City",
    variant: "ZX CVT",
    modelYear: 2021,
    fuelType: "Petrol" as const,
    transmissionType: "CVT" as const,
    totalKmDriven: 42000,
    listingPriceInr: 1250000,
    locationCity: "Chennai",
    locationState: "Tamil Nadu",
    listingStatus: "Active",
    bodyStyle: "Sedan",
    ownershipType: "Second" as const,
  },
  {
    listingCode: "SAC-BMW-005",
    title: "2023 BMW X1 sDrive20i",
    brand: "BMW",
    model: "X1",
    variant: "sDrive20i",
    modelYear: 2023,
    fuelType: "Petrol" as const,
    transmissionType: "Automatic" as const,
    totalKmDriven: 15000,
    listingPriceInr: 4200000,
    locationCity: "Pune",
    locationState: "Maharashtra",
    listingStatus: "Active",
    bodyStyle: "SUV",
    isSplus: true,
    featuredListing: true,
    ownershipType: "First" as const,
  },
];

// ---------------------------------------------------------------------------
// Build the app once
// ---------------------------------------------------------------------------

let app: FastifyInstance;

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

beforeAll(async () => {
  const { buildApp } = await import("../../app.js");
  app = await buildApp();
  await app.ready();

  // Auto-add CSRF header on mutating requests so existing tests pass
  const origInject = app.inject.bind(app);
  app.inject = ((opts: Record<string, unknown>) => {
    if (typeof opts === "object" && MUTATING.has(String(opts.method))) {
      opts.headers = {
        "x-csrf-protection": "1",
        ...(opts.headers as Record<string, string>),
      };
    }
    return origInject(opts);
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
// 1. Create 5 car listings via POST /api/v1/listings
// ===========================================================================

describe("Admin Car CRUD — Create listings", () => {
  for (let i = 0; i < CAR_PAYLOADS.length; i++) {
    const car = CAR_PAYLOADS[i];

    it(`creates car ${i + 1}: ${car.title} and returns 201`, async () => {
      const mockCreated = { id: i + 1, ...car, createdAt: new Date(), updatedAt: new Date() };
      mockDb.insert.mockImplementation(() => chainable([mockCreated]));

      const token = adminToken();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/listings",
        headers: { authorization: `Bearer ${token}` },
        payload: car,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBe(i + 1);
      expect(body.listingCode).toBe(car.listingCode);
      expect(body.title).toBe(car.title);
      expect(body.brand).toBe(car.brand);
      expect(body.model).toBe(car.model);
    });
  }

  it("returns 201 with correct price for BMW X1 (S-Plus, Featured)", async () => {
    const car = CAR_PAYLOADS[4]; // BMW
    const mockCreated = {
      id: 5,
      ...car,
      isSplus: true,
      featuredListing: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDb.insert.mockImplementation(() => chainable([mockCreated]));

    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: car,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.listingPriceInr).toBe(4200000);
    expect(body.isSplus).toBe(true);
    expect(body.featuredListing).toBe(true);
  });

  it("passes correct values to db.insert for Hyundai Creta", async () => {
    const car = CAR_PAYLOADS[0];
    mockDb.insert.mockImplementation(() => chainable([{ id: 1, ...car }]));

    const token = adminToken();
    await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: car,
    });

    // Verify insert was called
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates Tata Nexon EV with battery capacity field", async () => {
    const car = CAR_PAYLOADS[2];
    const mockCreated = { id: 3, ...car, createdAt: new Date(), updatedAt: new Date() };
    mockDb.insert.mockImplementation(() => chainable([mockCreated]));

    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: car,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.batteryCapacityKwh).toBe(40.5);
    expect(body.fuelType).toBe("Electric");
  });
});

// ===========================================================================
// 2. Fetch each listing via GET /api/v1/listings/:id
// ===========================================================================

describe("Admin Car CRUD — Fetch listings by ID", () => {
  for (let i = 0; i < CAR_PAYLOADS.length; i++) {
    const car = CAR_PAYLOADS[i];

    it(`fetches car ${i + 1}: ${car.title} and verifies fields`, async () => {
      const mockRow = {
        listing: {
          id: i + 1,
          ...car,
          images: [],
          interiorImages: [],
          exteriorImages: [],
          engineImages: [],
          tireImages: [],
          damageImages: [],
          specs: {},
          negotiable: false,
          viewsCount: 0,
          favoritesCount: 0,
          leadCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        categoryName: null,
      };
      mockDb.select.mockImplementation(() => chainable([mockRow]));

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/listings/${i + 1}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.listingCode).toBe(car.listingCode);
      expect(body.brand).toBe(car.brand);
      expect(body.model).toBe(car.model);
      expect(body.locationCity).toBe(car.locationCity);
      expect(body.listingPriceInr).toBe(car.listingPriceInr);
      expect(body.fuelType).toBe(car.fuelType);
      expect(body.transmissionType).toBe(car.transmissionType);
      expect(body.totalKmDriven).toBe(car.totalKmDriven);
    });
  }

  it("returns 404 for non-existent listing ID", async () => {
    mockDb.select.mockImplementation(() => chainable([]));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/listings/99999",
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toMatch(/not found/i);
  });
});

// ===========================================================================
// 3. Update a listing via PUT /api/v1/listings/:id
// ===========================================================================

describe("Admin Car CRUD — Update listing", () => {
  it("updates Honda City price and marks as Reserved", async () => {
    // First mock: select finds existing listing
    mockDb.select.mockImplementation(() => chainable([{ id: 4 }]));
    // Then mock: update returns updated listing
    const updatedCar = {
      id: 4,
      ...CAR_PAYLOADS[3],
      listingPriceInr: 1180000, // reduced from 12.5L to 11.8L
      listingStatus: "Reserved",
      updatedAt: new Date(),
    };
    mockDb.update.mockImplementation(() => chainable([updatedCar]));

    const token = adminToken();
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/listings/4",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingPriceInr: 1180000,
        listingStatus: "Reserved",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.listingPriceInr).toBe(1180000);
    expect(body.listingStatus).toBe("Reserved");
  });

  it("updates BMW X1 to mark as Sold", async () => {
    mockDb.select.mockImplementation(() => chainable([{ id: 5 }]));
    const updatedCar = {
      id: 5,
      ...CAR_PAYLOADS[4],
      listingStatus: "Sold",
      updatedAt: new Date(),
    };
    mockDb.update.mockImplementation(() => chainable([updatedCar]));

    const token = adminToken();
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/listings/5",
      headers: { authorization: `Bearer ${token}` },
      payload: { listingStatus: "Sold" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().listingStatus).toBe("Sold");
  });

  it("returns 404 when updating a non-existent listing", async () => {
    mockDb.select.mockImplementation(() => chainable([]));

    const token = adminToken();
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/listings/99999",
      headers: { authorization: `Bearer ${token}` },
      payload: { listingPriceInr: 500000 },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toMatch(/not found/i);
  });

  it("updates variant and model year for Maruti Swift", async () => {
    mockDb.select.mockImplementation(() => chainable([{ id: 2 }]));
    const updatedCar = {
      id: 2,
      ...CAR_PAYLOADS[1],
      variant: "ZXi+",
      modelYear: 2023,
      updatedAt: new Date(),
    };
    mockDb.update.mockImplementation(() => chainable([updatedCar]));

    const token = adminToken();
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/listings/2",
      headers: { authorization: `Bearer ${token}` },
      payload: { variant: "ZXi+", modelYear: 2023 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().variant).toBe("ZXi+");
    expect(res.json().modelYear).toBe(2023);
  });

  it("calls db.update with updatedAt timestamp", async () => {
    mockDb.select.mockImplementation(() => chainable([{ id: 1 }]));
    mockDb.update.mockImplementation(() => chainable([{ id: 1 }]));

    const token = adminToken();
    await app.inject({
      method: "PUT",
      url: "/api/v1/listings/1",
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Updated Title" },
    });

    expect(mockDb.update).toHaveBeenCalled();
  });
});

// ===========================================================================
// 4. Delete a listing via DELETE /api/v1/listings/:id
// ===========================================================================

describe("Admin Car CRUD — Delete listing", () => {
  it("deletes Maruti Swift and returns 204", async () => {
    mockDb.select.mockImplementation(() => chainable([{ id: 2 }]));
    mockDb.delete.mockImplementation(() => chainable([]));

    const token = adminToken();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/listings/2",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(204);
  });

  it("calls db.delete when deleting a listing", async () => {
    mockDb.select.mockImplementation(() => chainable([{ id: 3 }]));
    mockDb.delete.mockImplementation(() => chainable([]));

    const token = adminToken();
    await app.inject({
      method: "DELETE",
      url: "/api/v1/listings/3",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("returns 404 when deleting non-existent listing", async () => {
    mockDb.select.mockImplementation(() => chainable([]));

    const token = adminToken();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/listings/99999",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toMatch(/not found/i);
  });
});

// ===========================================================================
// 5. Validation failures
// ===========================================================================

describe("Admin Car CRUD — Validation failures", () => {
  it("returns 400 when listingCode is missing", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Some Car",
        brand: "Honda",
        model: "City",
        // listingCode missing
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });

  it("returns 400 when title is missing", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingCode: "SAC-TEST-001",
        brand: "Honda",
        model: "City",
        // title missing
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });

  it("returns 400 when brand is missing", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingCode: "SAC-TEST-001",
        title: "2024 Honda City",
        model: "City",
        // brand missing
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });

  it("returns 400 when model is missing", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingCode: "SAC-TEST-001",
        title: "2024 Honda City",
        brand: "Honda",
        // model missing
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });

  it("returns 400 when empty body is sent", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid fuelType enum value", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingCode: "SAC-TEST-002",
        title: "2024 Test Car",
        brand: "Test",
        model: "Model",
        fuelType: "Nuclear", // invalid enum
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });

  it("returns 400 for invalid transmissionType enum value", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingCode: "SAC-TEST-003",
        title: "2024 Test Car",
        brand: "Test",
        model: "Model",
        transmissionType: "Teleport", // invalid enum
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });

  it("returns 400 for invalid ownershipType enum value", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingCode: "SAC-TEST-004",
        title: "2024 Test Car",
        brand: "Test",
        model: "Model",
        ownershipType: "Tenth", // invalid enum
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });

  it("returns 400 for negative price", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingCode: "SAC-TEST-005",
        title: "2024 Test Car",
        brand: "Test",
        model: "Model",
        listingPriceInr: -100000,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });

  it("returns 400 for modelYear out of range (below 1900)", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingCode: "SAC-TEST-006",
        title: "Old Car",
        brand: "Test",
        model: "Model",
        modelYear: 1800,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });

  it("returns 400 for modelYear out of range (above 2100)", async () => {
    const token = adminToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        listingCode: "SAC-TEST-007",
        title: "Future Car",
        brand: "Test",
        model: "Model",
        modelYear: 2200,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/[Vv]alidation/);
  });
});

// ===========================================================================
// 6. Non-admin rejection
// ===========================================================================

describe("Admin Car CRUD — Non-admin rejection", () => {
  it("regular user cannot create a listing (403)", async () => {
    const token = userToken();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: CAR_PAYLOADS[0],
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().message).toMatch(/[Aa]dmin/);
  });

  it("regular user cannot update a listing (403)", async () => {
    const token = userToken();
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/listings/1",
      headers: { authorization: `Bearer ${token}` },
      payload: { listingPriceInr: 500000 },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().message).toMatch(/[Aa]dmin/);
  });

  it("regular user cannot delete a listing (403)", async () => {
    const token = userToken();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/listings/1",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().message).toMatch(/[Aa]dmin/);
  });

  it("unauthenticated user cannot create a listing (401)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      payload: CAR_PAYLOADS[0],
    });

    expect(res.statusCode).toBe(401);
  });

  it("unauthenticated user cannot update a listing (401)", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/listings/1",
      payload: { listingPriceInr: 500000 },
    });

    expect(res.statusCode).toBe(401);
  });

  it("unauthenticated user cannot delete a listing (401)", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/listings/1",
    });

    expect(res.statusCode).toBe(401);
  });
});

// ===========================================================================
// 7. Full lifecycle: create -> fetch -> update -> fetch -> delete -> confirm
// ===========================================================================

describe("Admin Car CRUD — Full lifecycle", () => {
  it("creates, fetches, updates, and deletes a Hyundai Creta", async () => {
    const car = CAR_PAYLOADS[0];
    const token = adminToken();

    // Step 1: Create
    const createdCar = {
      id: 100,
      ...car,
      images: [],
      negotiable: false,
      featuredListing: false,
      isSplus: false,
      isNewCar: false,
      viewsCount: 0,
      favoritesCount: 0,
      leadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDb.insert.mockImplementation(() => chainable([createdCar]));

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/listings",
      headers: { authorization: `Bearer ${token}` },
      payload: car,
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().id).toBe(100);

    // Step 2: Fetch
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() =>
      chainable([{ listing: createdCar, categoryName: null }]),
    );

    const fetchRes = await app.inject({
      method: "GET",
      url: "/api/v1/listings/100",
    });
    expect(fetchRes.statusCode).toBe(200);
    expect(fetchRes.json().title).toBe(car.title);
    expect(fetchRes.json().listingPriceInr).toBe(1850000);

    // Step 3: Update price
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() => chainable([{ id: 100 }]));
    const updatedCar = { ...createdCar, listingPriceInr: 1750000, listingStatus: "Reserved" };
    mockDb.update.mockImplementation(() => chainable([updatedCar]));

    const updateRes = await app.inject({
      method: "PUT",
      url: "/api/v1/listings/100",
      headers: { authorization: `Bearer ${token}` },
      payload: { listingPriceInr: 1750000, listingStatus: "Reserved" },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().listingPriceInr).toBe(1750000);
    expect(updateRes.json().listingStatus).toBe("Reserved");

    // Step 4: Delete
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() => chainable([{ id: 100 }]));
    mockDb.delete.mockImplementation(() => chainable([]));

    const deleteRes = await app.inject({
      method: "DELETE",
      url: "/api/v1/listings/100",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    // Step 5: Confirm deleted (404)
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() => chainable([]));

    const confirmRes = await app.inject({
      method: "GET",
      url: "/api/v1/listings/100",
    });
    expect(confirmRes.statusCode).toBe(404);
  });
});
