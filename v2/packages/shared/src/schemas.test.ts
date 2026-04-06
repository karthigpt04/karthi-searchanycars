import { describe, it, expect } from "vitest";
import {
  paginationSchema,
  idParamSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  createBookingSchema,
  updateBookingStatusSchema,
  createCategorySchema,
  updateCategorySchema,
  listingSchema,
  createListingSchema,
  updateListingSchema,
  listingFilterSchema,
} from "./index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectSuccess(schema: { safeParse: (d: unknown) => { success: boolean } }, data: unknown) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(true);
}

function expectFailure(schema: { safeParse: (d: unknown) => { success: boolean } }, data: unknown) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(false);
}

// ---------------------------------------------------------------------------
// common.ts — paginationSchema
// ---------------------------------------------------------------------------

describe("paginationSchema", () => {
  it("accepts empty object (all optional)", () => {
    expectSuccess(paginationSchema, {});
  });

  it("accepts valid page and limit", () => {
    expectSuccess(paginationSchema, { page: 1, limit: 20 });
  });

  it("accepts cursor", () => {
    expectSuccess(paginationSchema, { cursor: 42 });
  });

  it("coerces string page to number", () => {
    const result = paginationSchema.parse({ page: "3" });
    expect(result.page).toBe(3);
  });

  it("coerces string limit to number", () => {
    const result = paginationSchema.parse({ limit: "50" });
    expect(result.limit).toBe(50);
  });

  it("rejects limit > 100", () => {
    expectFailure(paginationSchema, { limit: 101 });
  });

  it("rejects page = 0 (must be positive)", () => {
    expectFailure(paginationSchema, { page: 0 });
  });

  it("rejects negative limit", () => {
    expectFailure(paginationSchema, { limit: -5 });
  });

  it("rejects non-integer page", () => {
    expectFailure(paginationSchema, { page: 1.5 });
  });

  it("accepts limit = 100 (boundary)", () => {
    expectSuccess(paginationSchema, { limit: 100 });
  });

  it("accepts limit = 1 (boundary)", () => {
    expectSuccess(paginationSchema, { limit: 1 });
  });
});

// ---------------------------------------------------------------------------
// common.ts — idParamSchema
// ---------------------------------------------------------------------------

describe("idParamSchema", () => {
  it("accepts valid positive integer id", () => {
    expectSuccess(idParamSchema, { id: 1 });
  });

  it("coerces string id to number", () => {
    const result = idParamSchema.parse({ id: "99" });
    expect(result.id).toBe(99);
  });

  it("rejects id = 0", () => {
    expectFailure(idParamSchema, { id: 0 });
  });

  it("rejects negative id", () => {
    expectFailure(idParamSchema, { id: -1 });
  });

  it("rejects missing id", () => {
    expectFailure(idParamSchema, {});
  });

  it("rejects non-numeric string", () => {
    expectFailure(idParamSchema, { id: "abc" });
  });

  it("rejects float id", () => {
    expectFailure(idParamSchema, { id: 1.5 });
  });
});

// ---------------------------------------------------------------------------
// user.ts — registerSchema
// ---------------------------------------------------------------------------

describe("registerSchema", () => {
  const valid = { email: "a@b.com", password: "123456", name: "Alice" };

  it("accepts valid input", () => {
    expectSuccess(registerSchema, valid);
  });

  it("rejects missing email", () => {
    expectFailure(registerSchema, { password: "123456", name: "Alice" });
  });

  it("rejects missing password", () => {
    expectFailure(registerSchema, { email: "a@b.com", name: "Alice" });
  });

  it("rejects missing name", () => {
    expectFailure(registerSchema, { email: "a@b.com", password: "123456" });
  });

  it("rejects invalid email format", () => {
    expectFailure(registerSchema, { ...valid, email: "not-an-email" });
  });

  it("rejects password shorter than 6 chars", () => {
    expectFailure(registerSchema, { ...valid, password: "12345" });
  });

  it("accepts password of exactly 6 chars", () => {
    expectSuccess(registerSchema, { ...valid, password: "abcdef" });
  });

  it("rejects empty name", () => {
    expectFailure(registerSchema, { ...valid, name: "" });
  });

  it("rejects name longer than 200 chars", () => {
    expectFailure(registerSchema, { ...valid, name: "x".repeat(201) });
  });

  it("accepts name of exactly 200 chars", () => {
    expectSuccess(registerSchema, { ...valid, name: "x".repeat(200) });
  });
});

// ---------------------------------------------------------------------------
// user.ts — loginSchema
// ---------------------------------------------------------------------------

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expectSuccess(loginSchema, { email: "a@b.com", password: "p" });
  });

  it("rejects missing email", () => {
    expectFailure(loginSchema, { password: "p" });
  });

  it("rejects missing password", () => {
    expectFailure(loginSchema, { email: "a@b.com" });
  });

  it("rejects invalid email", () => {
    expectFailure(loginSchema, { email: "bad", password: "p" });
  });

  it("rejects empty password", () => {
    expectFailure(loginSchema, { email: "a@b.com", password: "" });
  });
});

// ---------------------------------------------------------------------------
// user.ts — forgotPasswordSchema
// ---------------------------------------------------------------------------

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expectSuccess(forgotPasswordSchema, { email: "a@b.com" });
  });

  it("rejects missing email", () => {
    expectFailure(forgotPasswordSchema, {});
  });

  it("rejects invalid email", () => {
    expectFailure(forgotPasswordSchema, { email: "nope" });
  });
});

// ---------------------------------------------------------------------------
// user.ts — resetPasswordSchema
// ---------------------------------------------------------------------------

describe("resetPasswordSchema", () => {
  it("accepts valid token and password", () => {
    expectSuccess(resetPasswordSchema, { token: "abc123", password: "newpass" });
  });

  it("rejects empty token", () => {
    expectFailure(resetPasswordSchema, { token: "", password: "newpass" });
  });

  it("rejects short password", () => {
    expectFailure(resetPasswordSchema, { token: "abc", password: "12345" });
  });

  it("rejects missing token", () => {
    expectFailure(resetPasswordSchema, { password: "newpass" });
  });

  it("rejects missing password", () => {
    expectFailure(resetPasswordSchema, { token: "abc" });
  });
});

// ---------------------------------------------------------------------------
// user.ts — changePasswordSchema
// ---------------------------------------------------------------------------

describe("changePasswordSchema", () => {
  it("accepts valid input", () => {
    expectSuccess(changePasswordSchema, { currentPassword: "old", newPassword: "newpwd" });
  });

  it("rejects empty currentPassword", () => {
    expectFailure(changePasswordSchema, { currentPassword: "", newPassword: "newpwd" });
  });

  it("rejects newPassword shorter than 6", () => {
    expectFailure(changePasswordSchema, { currentPassword: "old", newPassword: "short" });
  });

  it("accepts newPassword of exactly 6 chars", () => {
    expectSuccess(changePasswordSchema, { currentPassword: "old", newPassword: "abcdef" });
  });
});

// ---------------------------------------------------------------------------
// booking.ts — createBookingSchema
// ---------------------------------------------------------------------------

describe("createBookingSchema", () => {
  const valid = { listingId: 1, name: "Bob", phone: "9876543210" };

  it("accepts minimal valid input", () => {
    expectSuccess(createBookingSchema, valid);
  });

  it("accepts all optional fields", () => {
    expectSuccess(createBookingSchema, {
      ...valid,
      email: "bob@test.com",
      preferredDate: "2025-06-15",
      preferredTime: "10:00",
      locationPreference: "hub",
      notes: "Some notes",
    });
  });

  it("rejects missing listingId", () => {
    expectFailure(createBookingSchema, { name: "Bob", phone: "123" });
  });

  it("rejects listingId = 0", () => {
    expectFailure(createBookingSchema, { ...valid, listingId: 0 });
  });

  it("rejects negative listingId", () => {
    expectFailure(createBookingSchema, { ...valid, listingId: -1 });
  });

  it("rejects non-integer listingId", () => {
    expectFailure(createBookingSchema, { ...valid, listingId: 1.5 });
  });

  it("rejects string listingId (no coerce)", () => {
    expectFailure(createBookingSchema, { ...valid, listingId: "1" });
  });

  it("rejects missing name", () => {
    expectFailure(createBookingSchema, { listingId: 1, phone: "123" });
  });

  it("rejects empty name", () => {
    expectFailure(createBookingSchema, { ...valid, name: "" });
  });

  it("rejects name over 200 chars", () => {
    expectFailure(createBookingSchema, { ...valid, name: "x".repeat(201) });
  });

  it("rejects missing phone", () => {
    expectFailure(createBookingSchema, { listingId: 1, name: "Bob" });
  });

  it("rejects empty phone", () => {
    expectFailure(createBookingSchema, { ...valid, phone: "" });
  });

  it("rejects phone over 20 chars", () => {
    expectFailure(createBookingSchema, { ...valid, phone: "1".repeat(21) });
  });

  it("rejects invalid email when provided", () => {
    expectFailure(createBookingSchema, { ...valid, email: "not-email" });
  });

  it("accepts valid locationPreference values", () => {
    for (const loc of ["hub", "home", "dealer"] as const) {
      expectSuccess(createBookingSchema, { ...valid, locationPreference: loc });
    }
  });

  it("rejects invalid locationPreference", () => {
    expectFailure(createBookingSchema, { ...valid, locationPreference: "office" });
  });
});

// ---------------------------------------------------------------------------
// booking.ts — updateBookingStatusSchema
// ---------------------------------------------------------------------------

describe("updateBookingStatusSchema", () => {
  it("accepts all valid status values", () => {
    for (const status of ["pending", "confirmed", "completed", "cancelled"] as const) {
      expectSuccess(updateBookingStatusSchema, { status });
    }
  });

  it("rejects invalid status", () => {
    expectFailure(updateBookingStatusSchema, { status: "unknown" });
  });

  it("rejects missing status", () => {
    expectFailure(updateBookingStatusSchema, {});
  });

  it("rejects empty string status", () => {
    expectFailure(updateBookingStatusSchema, { status: "" });
  });
});

// ---------------------------------------------------------------------------
// category.ts — createCategorySchema
// ---------------------------------------------------------------------------

describe("createCategorySchema", () => {
  const valid = { name: "SUV", slug: "suv", vehicleType: "Car" };

  it("accepts valid input", () => {
    expectSuccess(createCategorySchema, valid);
  });

  it("accepts optional description", () => {
    expectSuccess(createCategorySchema, { ...valid, description: "Sport utility" });
  });

  it("rejects missing name", () => {
    expectFailure(createCategorySchema, { slug: "suv", vehicleType: "Car" });
  });

  it("rejects empty name", () => {
    expectFailure(createCategorySchema, { ...valid, name: "" });
  });

  it("rejects name over 100 chars", () => {
    expectFailure(createCategorySchema, { ...valid, name: "x".repeat(101) });
  });

  it("rejects missing slug", () => {
    expectFailure(createCategorySchema, { name: "SUV", vehicleType: "Car" });
  });

  it("rejects empty slug", () => {
    expectFailure(createCategorySchema, { ...valid, slug: "" });
  });

  it("rejects missing vehicleType", () => {
    expectFailure(createCategorySchema, { name: "SUV", slug: "suv" });
  });
});

// ---------------------------------------------------------------------------
// category.ts — updateCategorySchema (partial)
// ---------------------------------------------------------------------------

describe("updateCategorySchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expectSuccess(updateCategorySchema, {});
  });

  it("accepts only name", () => {
    expectSuccess(updateCategorySchema, { name: "Sedan" });
  });

  it("accepts only slug", () => {
    expectSuccess(updateCategorySchema, { slug: "sedan" });
  });

  it("accepts only description", () => {
    expectSuccess(updateCategorySchema, { description: "Four door" });
  });

  it("still validates constraints — rejects empty name", () => {
    expectFailure(updateCategorySchema, { name: "" });
  });

  it("still validates constraints — rejects name over 100 chars", () => {
    expectFailure(updateCategorySchema, { name: "x".repeat(101) });
  });
});

// ---------------------------------------------------------------------------
// listing.ts — listingSchema (full listing)
// ---------------------------------------------------------------------------

describe("listingSchema", () => {
  const validListing = {
    id: 1,
    categoryId: null,
    listingCode: "SAC-001",
    title: "2022 Honda City ZX",
    brand: "Honda",
    model: "City",
    variant: null,
    modelYear: 2022,
    registrationYear: 2022,
    vehicleType: "Car",
    bodyStyle: "Sedan",
    exteriorColor: "White",
    interiorColor: "Black",
    listingPriceInr: 1200000,
    negotiable: true,
    estimatedMarketValueInr: null,
    ownershipType: "First",
    sellerType: "Dealer",
    registrationState: null,
    registrationCity: null,
    totalKmDriven: 25000,
    mileageKmpl: 18.5,
    engineType: "Petrol",
    engineCapacityCc: 1498,
    powerBhp: 121,
    transmissionType: "Manual",
    fuelType: "Petrol",
    batteryCapacityKwh: null,
    overallConditionRating: 8.5,
    serviceHistoryAvailable: true,
    airbagsCount: 6,
    infotainmentScreenSize: "8-inch",
    locationCity: "Mumbai",
    locationState: "Maharashtra",
    dealerRating: 4.2,
    inspectionStatus: "passed",
    inspectionScore: 85.5,
    listingStatus: "active",
    featuredListing: false,
    isSplus: false,
    isNewCar: false,
    newCarType: null,
    viewsCount: 150,
    favoritesCount: 12,
    leadCount: 5,
    promotionTier: null,
    images: ["img1.jpg"],
    interiorImages: [],
    exteriorImages: [],
    engineImages: [],
    tireImages: [],
    damageImages: [],
    additionalNotes: null,
    specs: {},
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
  };

  it("accepts a fully populated listing", () => {
    expectSuccess(listingSchema, validListing);
  });

  it("coerces createdAt string to Date", () => {
    const result = listingSchema.parse(validListing);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("coerces updatedAt string to Date", () => {
    const result = listingSchema.parse(validListing);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects missing required fields (id)", () => {
    const { id, ...rest } = validListing;
    expectFailure(listingSchema, rest);
  });

  it("rejects missing images (required array)", () => {
    const { images, ...rest } = validListing;
    expectFailure(listingSchema, rest);
  });

  it("accepts nullable fields as null", () => {
    expectSuccess(listingSchema, { ...validListing, variant: null, modelYear: null, categoryId: null });
  });
});

// ---------------------------------------------------------------------------
// listing.ts — createListingSchema
// ---------------------------------------------------------------------------

describe("createListingSchema", () => {
  const minimal = {
    listingCode: "SAC-123",
    title: "2022 Honda City",
    brand: "Honda",
    model: "City",
  };

  it("accepts minimal required fields", () => {
    expectSuccess(createListingSchema, minimal);
  });

  it("accepts all optional fields", () => {
    expectSuccess(createListingSchema, {
      ...minimal,
      categoryId: 1,
      variant: "ZX",
      modelYear: 2022,
      registrationYear: 2022,
      vehicleType: "Car",
      bodyStyle: "Sedan",
      exteriorColor: "White",
      interiorColor: "Black",
      listingPriceInr: 1200000,
      negotiable: true,
      estimatedMarketValueInr: 1100000,
      ownershipType: "First",
      sellerType: "Dealer",
      registrationState: "MH",
      registrationCity: "Mumbai",
      totalKmDriven: 25000,
      mileageKmpl: 18.5,
      engineType: "Petrol",
      engineCapacityCc: 1498,
      powerBhp: 121,
      transmissionType: "Manual",
      fuelType: "Petrol",
      batteryCapacityKwh: 0,
      overallConditionRating: 8.5,
      serviceHistoryAvailable: true,
      airbagsCount: 6,
      infotainmentScreenSize: "8-inch",
      locationCity: "Mumbai",
      locationState: "Maharashtra",
      dealerRating: 4.2,
      inspectionStatus: "passed",
      inspectionScore: 85.5,
      listingStatus: "active",
      featuredListing: true,
      isSplus: false,
      isNewCar: false,
      newCarType: "launch",
      promotionTier: "gold",
      images: ["img1.jpg", "img2.jpg"],
      interiorImages: [],
      exteriorImages: [],
      engineImages: [],
      tireImages: [],
      damageImages: [],
      additionalNotes: "Clean car",
      specs: { abs: true },
    });
  });

  it("rejects missing listingCode", () => {
    const { listingCode, ...rest } = minimal;
    expectFailure(createListingSchema, rest);
  });

  it("rejects empty listingCode", () => {
    expectFailure(createListingSchema, { ...minimal, listingCode: "" });
  });

  it("rejects listingCode over 50 chars", () => {
    expectFailure(createListingSchema, { ...minimal, listingCode: "x".repeat(51) });
  });

  it("rejects missing title", () => {
    const { title, ...rest } = minimal;
    expectFailure(createListingSchema, rest);
  });

  it("rejects empty title", () => {
    expectFailure(createListingSchema, { ...minimal, title: "" });
  });

  it("rejects title over 300 chars", () => {
    expectFailure(createListingSchema, { ...minimal, title: "x".repeat(301) });
  });

  it("rejects missing brand", () => {
    const { brand, ...rest } = minimal;
    expectFailure(createListingSchema, rest);
  });

  it("rejects empty brand", () => {
    expectFailure(createListingSchema, { ...minimal, brand: "" });
  });

  it("rejects missing model", () => {
    const { model, ...rest } = minimal;
    expectFailure(createListingSchema, rest);
  });

  it("rejects empty model", () => {
    expectFailure(createListingSchema, { ...minimal, model: "" });
  });

  // Enum validation
  it("accepts all valid ownershipType values", () => {
    for (const val of ["First", "Second", "Third", "Fourth+"]) {
      expectSuccess(createListingSchema, { ...minimal, ownershipType: val });
    }
  });

  it("rejects invalid ownershipType", () => {
    expectFailure(createListingSchema, { ...minimal, ownershipType: "Fifth" });
  });

  it("accepts all valid sellerType values", () => {
    for (const val of ["Dealer", "Individual", "Certified Dealer"]) {
      expectSuccess(createListingSchema, { ...minimal, sellerType: val });
    }
  });

  it("rejects invalid sellerType", () => {
    expectFailure(createListingSchema, { ...minimal, sellerType: "Private" });
  });

  it("accepts all valid transmissionType values", () => {
    for (const val of ["Manual", "Automatic", "CVT", "DCT", "AMT"]) {
      expectSuccess(createListingSchema, { ...minimal, transmissionType: val });
    }
  });

  it("rejects invalid transmissionType", () => {
    expectFailure(createListingSchema, { ...minimal, transmissionType: "DSG" });
  });

  it("accepts all valid fuelType values", () => {
    for (const val of ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"]) {
      expectSuccess(createListingSchema, { ...minimal, fuelType: val });
    }
  });

  it("rejects invalid fuelType", () => {
    expectFailure(createListingSchema, { ...minimal, fuelType: "Hydrogen" });
  });

  // Numeric constraints
  it("rejects modelYear below 1900", () => {
    expectFailure(createListingSchema, { ...minimal, modelYear: 1899 });
  });

  it("rejects modelYear above 2100", () => {
    expectFailure(createListingSchema, { ...minimal, modelYear: 2101 });
  });

  it("accepts modelYear at boundaries", () => {
    expectSuccess(createListingSchema, { ...minimal, modelYear: 1900 });
    expectSuccess(createListingSchema, { ...minimal, modelYear: 2100 });
  });

  it("rejects negative listingPriceInr", () => {
    expectFailure(createListingSchema, { ...minimal, listingPriceInr: -1 });
  });

  it("accepts listingPriceInr = 0", () => {
    expectSuccess(createListingSchema, { ...minimal, listingPriceInr: 0 });
  });

  it("rejects negative totalKmDriven", () => {
    expectFailure(createListingSchema, { ...minimal, totalKmDriven: -100 });
  });

  it("rejects overallConditionRating above 10", () => {
    expectFailure(createListingSchema, { ...minimal, overallConditionRating: 10.1 });
  });

  it("rejects overallConditionRating below 0", () => {
    expectFailure(createListingSchema, { ...minimal, overallConditionRating: -0.1 });
  });

  it("accepts overallConditionRating at boundaries", () => {
    expectSuccess(createListingSchema, { ...minimal, overallConditionRating: 0 });
    expectSuccess(createListingSchema, { ...minimal, overallConditionRating: 10 });
  });

  it("rejects dealerRating above 5", () => {
    expectFailure(createListingSchema, { ...minimal, dealerRating: 5.1 });
  });

  it("rejects inspectionScore above 100", () => {
    expectFailure(createListingSchema, { ...minimal, inspectionScore: 100.1 });
  });

  it("accepts inspectionScore at boundaries", () => {
    expectSuccess(createListingSchema, { ...minimal, inspectionScore: 0 });
    expectSuccess(createListingSchema, { ...minimal, inspectionScore: 100 });
  });

  it("rejects negative engineCapacityCc", () => {
    expectFailure(createListingSchema, { ...minimal, engineCapacityCc: -1 });
  });

  it("rejects negative powerBhp", () => {
    expectFailure(createListingSchema, { ...minimal, powerBhp: -1 });
  });

  it("rejects negative airbagsCount", () => {
    expectFailure(createListingSchema, { ...minimal, airbagsCount: -1 });
  });

  // Boolean fields
  it("rejects non-boolean negotiable", () => {
    expectFailure(createListingSchema, { ...minimal, negotiable: "yes" });
  });

  it("accepts boolean negotiable", () => {
    expectSuccess(createListingSchema, { ...minimal, negotiable: true });
    expectSuccess(createListingSchema, { ...minimal, negotiable: false });
  });

  // Array fields
  it("accepts empty images array", () => {
    expectSuccess(createListingSchema, { ...minimal, images: [] });
  });

  it("rejects non-string items in images array", () => {
    expectFailure(createListingSchema, { ...minimal, images: [123] });
  });

  // categoryId
  it("rejects categoryId = 0", () => {
    expectFailure(createListingSchema, { ...minimal, categoryId: 0 });
  });

  it("rejects negative categoryId", () => {
    expectFailure(createListingSchema, { ...minimal, categoryId: -1 });
  });
});

// ---------------------------------------------------------------------------
// listing.ts — updateListingSchema (partial)
// ---------------------------------------------------------------------------

describe("updateListingSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expectSuccess(updateListingSchema, {});
  });

  it("accepts only brand", () => {
    expectSuccess(updateListingSchema, { brand: "Toyota" });
  });

  it("accepts only listingPriceInr", () => {
    expectSuccess(updateListingSchema, { listingPriceInr: 500000 });
  });

  it("accepts only boolean fields", () => {
    expectSuccess(updateListingSchema, { featuredListing: true, isSplus: false });
  });

  it("still validates enum constraints", () => {
    expectFailure(updateListingSchema, { fuelType: "Nuclear" });
  });

  it("still validates numeric constraints", () => {
    expectFailure(updateListingSchema, { overallConditionRating: 11 });
  });

  it("still validates min length on brand", () => {
    expectFailure(updateListingSchema, { brand: "" });
  });
});

// ---------------------------------------------------------------------------
// listing.ts — listingFilterSchema (coercion)
// ---------------------------------------------------------------------------

describe("listingFilterSchema", () => {
  it("accepts empty object", () => {
    expectSuccess(listingFilterSchema, {});
  });

  it("accepts all string filters", () => {
    expectSuccess(listingFilterSchema, {
      search: "Honda",
      brand: "Honda",
      model: "City",
      fuelType: "Petrol",
      transmissionType: "Manual",
      bodyStyle: "Sedan",
      ownershipType: "First",
      sellerType: "Dealer",
      locationCity: "Mumbai",
      exteriorColor: "White",
      listingStatus: "active",
    });
  });

  // Coercion: string -> number
  it("coerces string priceMin to number", () => {
    const result = listingFilterSchema.parse({ priceMin: "100000" });
    expect(result.priceMin).toBe(100000);
  });

  it("coerces string priceMax to number", () => {
    const result = listingFilterSchema.parse({ priceMax: "500000" });
    expect(result.priceMax).toBe(500000);
  });

  it("coerces string yearMin to number", () => {
    const result = listingFilterSchema.parse({ yearMin: "2020" });
    expect(result.yearMin).toBe(2020);
  });

  it("coerces string yearMax to number", () => {
    const result = listingFilterSchema.parse({ yearMax: "2025" });
    expect(result.yearMax).toBe(2025);
  });

  it("coerces string kmMax to number", () => {
    const result = listingFilterSchema.parse({ kmMax: "50000" });
    expect(result.kmMax).toBe(50000);
  });

  it("coerces string categoryId to number", () => {
    const result = listingFilterSchema.parse({ categoryId: "3" });
    expect(result.categoryId).toBe(3);
  });

  it("coerces string page to number", () => {
    const result = listingFilterSchema.parse({ page: "2" });
    expect(result.page).toBe(2);
  });

  it("coerces string limit to number", () => {
    const result = listingFilterSchema.parse({ limit: "25" });
    expect(result.limit).toBe(25);
  });

  // Coercion: string -> boolean
  it("coerces string 'true' to boolean for featuredListing", () => {
    const result = listingFilterSchema.parse({ featuredListing: "true" });
    expect(result.featuredListing).toBe(true);
  });

  it("coerces string 'false' to boolean for isSplus (z.coerce.boolean treats non-empty string as true)", () => {
    // z.coerce.boolean() uses Boolean() which treats any non-empty string as true
    const result = listingFilterSchema.parse({ isSplus: "false" });
    expect(result.isSplus).toBe(true);
  });

  it("coerces string 'true' to boolean for isNewCar", () => {
    const result = listingFilterSchema.parse({ isNewCar: "true" });
    expect(result.isNewCar).toBe(true);
  });

  // Constraints on coerced values
  it("rejects negative priceMin", () => {
    expectFailure(listingFilterSchema, { priceMin: -1 });
  });

  it("rejects negative priceMax", () => {
    expectFailure(listingFilterSchema, { priceMax: -1 });
  });

  it("rejects negative kmMax", () => {
    expectFailure(listingFilterSchema, { kmMax: -1 });
  });

  it("rejects categoryId = 0", () => {
    expectFailure(listingFilterSchema, { categoryId: 0 });
  });

  it("rejects page = 0", () => {
    expectFailure(listingFilterSchema, { page: 0 });
  });

  it("rejects limit > 100", () => {
    expectFailure(listingFilterSchema, { limit: 101 });
  });

  // sortBy enum
  it("accepts all valid sortBy values", () => {
    for (const val of ["price_asc", "price_desc", "year_desc", "km_asc", "newest"]) {
      expectSuccess(listingFilterSchema, { sortBy: val });
    }
  });

  it("rejects invalid sortBy", () => {
    expectFailure(listingFilterSchema, { sortBy: "random" });
  });

  // Non-numeric string coercion should fail
  it("rejects non-numeric string for priceMin", () => {
    expectFailure(listingFilterSchema, { priceMin: "abc" });
  });

  it("rejects non-numeric string for page", () => {
    expectFailure(listingFilterSchema, { page: "abc" });
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("registerSchema rejects null email", () => {
    expectFailure(registerSchema, { email: null, password: "123456", name: "A" });
  });

  it("registerSchema rejects undefined password (missing key)", () => {
    expectFailure(registerSchema, { email: "a@b.com", name: "A" });
  });

  it("createBookingSchema rejects null as name", () => {
    expectFailure(createBookingSchema, { listingId: 1, name: null, phone: "123" });
  });

  it("paginationSchema handles undefined gracefully", () => {
    expectSuccess(paginationSchema, { page: undefined, limit: undefined });
  });

  it("createListingSchema rejects number where string expected for brand", () => {
    expectFailure(createListingSchema, {
      listingCode: "SAC-1",
      title: "Test",
      brand: 123,
      model: "M",
    });
  });

  it("createListingSchema rejects string where number expected for listingPriceInr", () => {
    expectFailure(createListingSchema, {
      listingCode: "SAC-1",
      title: "Test",
      brand: "B",
      model: "M",
      listingPriceInr: "100000",
    });
  });

  it("idParamSchema rejects null id", () => {
    expectFailure(idParamSchema, { id: null });
  });

  it("updateBookingStatusSchema rejects number status", () => {
    expectFailure(updateBookingStatusSchema, { status: 1 });
  });

  it("listingFilterSchema accepts priceMin = 0 (boundary)", () => {
    expectSuccess(listingFilterSchema, { priceMin: 0 });
  });

  it("listingFilterSchema accepts kmMax = 0 (boundary)", () => {
    expectSuccess(listingFilterSchema, { kmMax: 0 });
  });
});
