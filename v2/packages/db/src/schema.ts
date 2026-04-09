import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  real,
  jsonb,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Table 1: categories ────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  vehicleType: varchar("vehicle_type", { length: 100 }).notNull(),
  description: text("description").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  filterMap: many(categoryFilterMap),
  listings: many(listings),
}));

// ─── Table 2: filter_definitions ────────────────────────────────────
export const filterDefinitions = pgTable("filter_definitions", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  options: jsonb("options").notNull().default([]),
});

export const filterDefinitionsRelations = relations(
  filterDefinitions,
  ({ many }) => ({
    categoryMap: many(categoryFilterMap),
  })
);

// ─── Table 3: category_filter_map ───────────────────────────────────
export const categoryFilterMap = pgTable(
  "category_filter_map",
  {
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    filterId: integer("filter_id")
      .notNull()
      .references(() => filterDefinitions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.filterId] })]
);

export const categoryFilterMapRelations = relations(
  categoryFilterMap,
  ({ one }) => ({
    category: one(categories, {
      fields: [categoryFilterMap.categoryId],
      references: [categories.id],
    }),
    filter: one(filterDefinitions, {
      fields: [categoryFilterMap.filterId],
      references: [filterDefinitions.id],
    }),
  })
);

// ─── Table 4: listings ──────────────────────────────────────────────
export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    listingCode: varchar("listing_code", { length: 50 }).notNull().unique(),
    title: varchar("title", { length: 300 }).notNull(),
    brand: varchar("brand", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    variant: varchar("variant", { length: 200 }).default(""),
    modelYear: integer("model_year"),
    registrationYear: integer("registration_year"),
    vehicleType: varchar("vehicle_type", { length: 50 }),
    bodyStyle: varchar("body_style", { length: 50 }),
    exteriorColor: varchar("exterior_color", { length: 50 }),
    interiorColor: varchar("interior_color", { length: 50 }),
    listingPriceInr: integer("listing_price_inr").notNull().default(0),
    negotiable: boolean("negotiable").notNull().default(false),
    estimatedMarketValueInr: integer("estimated_market_value_inr"),
    ownershipType: varchar("ownership_type", { length: 20 }),
    sellerType: varchar("seller_type", { length: 30 }),
    registrationState: varchar("registration_state", { length: 100 }),
    registrationCity: varchar("registration_city", { length: 100 }),
    totalKmDriven: integer("total_km_driven"),
    mileageKmpl: real("mileage_kmpl"),
    engineType: varchar("engine_type", { length: 100 }),
    engineCapacityCc: integer("engine_capacity_cc"),
    powerBhp: integer("power_bhp"),
    transmissionType: varchar("transmission_type", { length: 20 }),
    fuelType: varchar("fuel_type", { length: 20 }),
    batteryCapacityKwh: real("battery_capacity_kwh"),
    overallConditionRating: real("overall_condition_rating"),
    serviceHistoryAvailable: boolean("service_history_available").default(false),
    airbagsCount: integer("airbags_count"),
    infotainmentScreenSize: varchar("infotainment_screen_size", { length: 20 }),
    locationCity: varchar("location_city", { length: 100 }),
    locationState: varchar("location_state", { length: 100 }),
    dealerRating: real("dealer_rating"),
    inspectionStatus: varchar("inspection_status", { length: 30 }),
    inspectionScore: real("inspection_score"),
    listingStatus: varchar("listing_status", { length: 20 })
      .notNull()
      .default("Active"),
    featuredListing: boolean("featured_listing").notNull().default(false),
    isSplus: boolean("is_splus").notNull().default(false),
    isNewCar: boolean("is_new_car").notNull().default(false),
    newCarType: varchar("new_car_type", { length: 30 }),
    viewsCount: integer("views_count").default(0),
    favoritesCount: integer("favorites_count").default(0),
    leadCount: integer("lead_count").default(0),
    promotionTier: varchar("promotion_tier", { length: 20 }),
    images: jsonb("images").notNull().default([]),
    interiorImages: jsonb("interior_images").notNull().default([]),
    exteriorImages: jsonb("exterior_images").notNull().default([]),
    engineImages: jsonb("engine_images").notNull().default([]),
    tireImages: jsonb("tire_images").notNull().default([]),
    damageImages: jsonb("damage_images").notNull().default([]),
    additionalNotes: text("additional_notes"),
    specs: jsonb("specs").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_listings_brand").on(t.brand),
    index("idx_listings_location_city").on(t.locationCity),
    index("idx_listings_listing_status").on(t.listingStatus),
    index("idx_listings_price").on(t.listingPriceInr),
    index("idx_listings_category").on(t.categoryId),
    index("idx_listings_featured")
      .on(t.featuredListing)
      .where(sql`featured_listing = true`),
    index("idx_listings_splus")
      .on(t.isSplus)
      .where(sql`is_splus = true`),
    index("idx_listings_search").using(
      "gin",
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' || coalesce(location_city, ''))`
    ),
    // ── Indexes added for ISSUE #10 ──
    index("idx_listings_model_year").on(t.modelYear),
    index("idx_listings_created_at").on(t.createdAt),
    index("idx_listings_new_car")
      .on(t.isNewCar)
      .where(sql`is_new_car = true`),
    index("idx_listings_fuel_type").on(t.fuelType),
    index("idx_listings_transmission_type").on(t.transmissionType),
    index("idx_listings_body_style").on(t.bodyStyle),
  ]
);

export const listingsRelations = relations(listings, ({ one, many }) => ({
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  favorites: many(userFavorites),
  bookings: many(testDriveBookings),
}));

// ─── Table 5: users ─────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }).unique(),
  name: varchar("name", { length: 200 }).notNull().default(""),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 10 }).notNull().default("user"),
  googleId: varchar("google_id", { length: 255 }).unique(),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
  favorites: many(userFavorites),
  bookings: many(testDriveBookings),
}));

// ─── Table 6: sessions ──────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshToken: text("refresh_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_sessions_user_id").on(t.userId),
  index("idx_sessions_expires_at").on(t.expiresAt),
]);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ─── Table 7: password_reset_tokens ─────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_password_reset_tokens_user_id").on(t.userId),
]);

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  })
);

// ─── Table 8: user_favorites ────────────────────────────────────────
export const userFavorites = pgTable(
  "user_favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_favorites_user_listing_idx").on(t.userId, t.listingId),
    index("idx_user_favorites_user_created").on(t.userId, t.createdAt),
  ]
);

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [userFavorites.listingId],
    references: [listings.id],
  }),
}));

// ─── Table 9: test_drive_bookings ───────────────────────────────────
export const testDriveBookings = pgTable("test_drive_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  listingId: integer("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  carTitle: varchar("car_title", { length: 300 }).notNull().default(""),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  preferredDate: varchar("preferred_date", { length: 20 }),
  preferredTime: varchar("preferred_time", { length: 20 }),
  locationPreference: varchar("location_preference", { length: 20 }).default(
    "hub"
  ),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("idx_bookings_user_id_created").on(t.userId, t.createdAt),
  index("idx_bookings_listing_id").on(t.listingId),
]);

export const testDriveBookingsRelations = relations(
  testDriveBookings,
  ({ one }) => ({
    user: one(users, {
      fields: [testDriveBookings.userId],
      references: [users.id],
    }),
    listing: one(listings, {
      fields: [testDriveBookings.listingId],
      references: [listings.id],
    }),
  })
);

// ─── Table 10: site_config ──────────────────────────────────────────
export const siteConfig = pgTable("site_config", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
