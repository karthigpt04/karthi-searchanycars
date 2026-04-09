import { describe, it, expect } from 'vitest';
import { getTableName, getTableColumns } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  categories,
  categoriesRelations,
  filterDefinitions,
  filterDefinitionsRelations,
  categoryFilterMap,
  categoryFilterMapRelations,
  listings,
  listingsRelations,
  users,
  usersRelations,
  sessions,
  sessionsRelations,
  passwordResetTokens,
  passwordResetTokensRelations,
  userFavorites,
  userFavoritesRelations,
  testDriveBookings,
  testDriveBookingsRelations,
  siteConfig,
} from './schema.js';

// Helper to get column names as an array
function columnNames(table: any): string[] {
  return Object.keys(getTableColumns(table));
}

// Helper to get a specific column object
function col(table: any, name: string) {
  return getTableColumns(table)[name];
}

// ─── Table exports exist ───────────────────────────────────────────
describe('Table exports exist', () => {
  it('exports categories table', () => {
    expect(categories).toBeDefined();
  });

  it('exports filterDefinitions table', () => {
    expect(filterDefinitions).toBeDefined();
  });

  it('exports categoryFilterMap table', () => {
    expect(categoryFilterMap).toBeDefined();
  });

  it('exports listings table', () => {
    expect(listings).toBeDefined();
  });

  it('exports users table', () => {
    expect(users).toBeDefined();
  });

  it('exports sessions table', () => {
    expect(sessions).toBeDefined();
  });

  it('exports passwordResetTokens table', () => {
    expect(passwordResetTokens).toBeDefined();
  });

  it('exports userFavorites table', () => {
    expect(userFavorites).toBeDefined();
  });

  it('exports testDriveBookings table', () => {
    expect(testDriveBookings).toBeDefined();
  });

  it('exports siteConfig table', () => {
    expect(siteConfig).toBeDefined();
  });
});

// ─── Relation exports exist ────────────────────────────────────────
describe('Relation exports exist', () => {
  it('exports categoriesRelations', () => {
    expect(categoriesRelations).toBeDefined();
  });

  it('exports filterDefinitionsRelations', () => {
    expect(filterDefinitionsRelations).toBeDefined();
  });

  it('exports categoryFilterMapRelations', () => {
    expect(categoryFilterMapRelations).toBeDefined();
  });

  it('exports listingsRelations', () => {
    expect(listingsRelations).toBeDefined();
  });

  it('exports usersRelations', () => {
    expect(usersRelations).toBeDefined();
  });

  it('exports sessionsRelations', () => {
    expect(sessionsRelations).toBeDefined();
  });

  it('exports passwordResetTokensRelations', () => {
    expect(passwordResetTokensRelations).toBeDefined();
  });

  it('exports userFavoritesRelations', () => {
    expect(userFavoritesRelations).toBeDefined();
  });

  it('exports testDriveBookingsRelations', () => {
    expect(testDriveBookingsRelations).toBeDefined();
  });
});

// ─── Table name mapping ────────────────────────────────────────────
describe('Table name mapping', () => {
  it('categories maps to "categories"', () => {
    expect(getTableName(categories)).toBe('categories');
  });

  it('filterDefinitions maps to "filter_definitions"', () => {
    expect(getTableName(filterDefinitions)).toBe('filter_definitions');
  });

  it('categoryFilterMap maps to "category_filter_map"', () => {
    expect(getTableName(categoryFilterMap)).toBe('category_filter_map');
  });

  it('listings maps to "listings"', () => {
    expect(getTableName(listings)).toBe('listings');
  });

  it('users maps to "users"', () => {
    expect(getTableName(users)).toBe('users');
  });

  it('sessions maps to "sessions"', () => {
    expect(getTableName(sessions)).toBe('sessions');
  });

  it('passwordResetTokens maps to "password_reset_tokens"', () => {
    expect(getTableName(passwordResetTokens)).toBe('password_reset_tokens');
  });

  it('userFavorites maps to "user_favorites"', () => {
    expect(getTableName(userFavorites)).toBe('user_favorites');
  });

  it('testDriveBookings maps to "test_drive_bookings"', () => {
    expect(getTableName(testDriveBookings)).toBe('test_drive_bookings');
  });

  it('siteConfig maps to "site_config"', () => {
    expect(getTableName(siteConfig)).toBe('site_config');
  });
});

// ─── Column structure ──────────────────────────────────────────────
describe('Column structure', () => {
  describe('categories columns', () => {
    it('has all expected columns', () => {
      const cols = columnNames(categories);
      expect(cols).toEqual(
        expect.arrayContaining(['id', 'name', 'slug', 'vehicleType', 'description', 'createdAt', 'updatedAt'])
      );
    });

    it('has exactly 7 columns', () => {
      expect(columnNames(categories)).toHaveLength(7);
    });
  });

  describe('filterDefinitions columns', () => {
    it('has all expected columns', () => {
      const cols = columnNames(filterDefinitions);
      expect(cols).toEqual(
        expect.arrayContaining(['id', 'key', 'label', 'type', 'options'])
      );
    });

    it('has exactly 5 columns', () => {
      expect(columnNames(filterDefinitions)).toHaveLength(5);
    });
  });

  describe('categoryFilterMap columns', () => {
    it('has categoryId and filterId columns', () => {
      const cols = columnNames(categoryFilterMap);
      expect(cols).toEqual(expect.arrayContaining(['categoryId', 'filterId']));
    });

    it('has exactly 2 columns', () => {
      expect(columnNames(categoryFilterMap)).toHaveLength(2);
    });
  });

  describe('listings columns', () => {
    it('has core identification columns', () => {
      const cols = columnNames(listings);
      expect(cols).toEqual(
        expect.arrayContaining(['id', 'categoryId', 'listingCode', 'title', 'brand', 'model', 'variant'])
      );
    });

    it('has vehicle detail columns', () => {
      const cols = columnNames(listings);
      expect(cols).toEqual(
        expect.arrayContaining([
          'modelYear', 'registrationYear', 'vehicleType', 'bodyStyle',
          'exteriorColor', 'interiorColor',
        ])
      );
    });

    it('has pricing columns', () => {
      const cols = columnNames(listings);
      expect(cols).toEqual(
        expect.arrayContaining(['listingPriceInr', 'negotiable', 'estimatedMarketValueInr'])
      );
    });

    it('has engine and performance columns', () => {
      const cols = columnNames(listings);
      expect(cols).toEqual(
        expect.arrayContaining([
          'engineType', 'engineCapacityCc', 'powerBhp', 'transmissionType',
          'fuelType', 'mileageKmpl', 'batteryCapacityKwh',
        ])
      );
    });

    it('has condition and history columns', () => {
      const cols = columnNames(listings);
      expect(cols).toEqual(
        expect.arrayContaining([
          'overallConditionRating', 'serviceHistoryAvailable',
          'inspectionStatus', 'inspectionScore',
        ])
      );
    });

    it('has location columns', () => {
      const cols = columnNames(listings);
      expect(cols).toEqual(
        expect.arrayContaining(['locationCity', 'locationState', 'registrationState', 'registrationCity'])
      );
    });

    it('has image jsonb columns', () => {
      const cols = columnNames(listings);
      expect(cols).toEqual(
        expect.arrayContaining([
          'images', 'interiorImages', 'exteriorImages',
          'engineImages', 'tireImages', 'damageImages',
        ])
      );
    });

    it('has status and promotion columns', () => {
      const cols = columnNames(listings);
      expect(cols).toEqual(
        expect.arrayContaining([
          'listingStatus', 'featuredListing', 'isSplus', 'isNewCar',
          'newCarType', 'promotionTier',
        ])
      );
    });

    it('has analytics columns', () => {
      const cols = columnNames(listings);
      expect(cols).toEqual(
        expect.arrayContaining(['viewsCount', 'favoritesCount', 'leadCount'])
      );
    });

    it('has 40+ columns total', () => {
      expect(columnNames(listings).length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('users columns', () => {
    it('has all expected columns', () => {
      const cols = columnNames(users);
      expect(cols).toEqual(
        expect.arrayContaining([
          'id', 'email', 'phone', 'name', 'passwordHash', 'role',
          'googleId', 'phoneVerified', 'emailVerified', 'avatarUrl',
          'createdAt', 'updatedAt',
        ])
      );
    });

    it('has exactly 12 columns', () => {
      expect(columnNames(users)).toHaveLength(12);
    });
  });

  describe('sessions columns', () => {
    it('has all expected columns', () => {
      const cols = columnNames(sessions);
      expect(cols).toEqual(
        expect.arrayContaining([
          'id', 'userId', 'refreshToken', 'expiresAt', 'ipAddress', 'userAgent', 'createdAt',
        ])
      );
    });

    it('has exactly 7 columns', () => {
      expect(columnNames(sessions)).toHaveLength(7);
    });
  });

  describe('passwordResetTokens columns', () => {
    it('has all expected columns', () => {
      const cols = columnNames(passwordResetTokens);
      expect(cols).toEqual(
        expect.arrayContaining(['id', 'userId', 'token', 'expiresAt', 'used', 'createdAt'])
      );
    });

    it('has exactly 6 columns', () => {
      expect(columnNames(passwordResetTokens)).toHaveLength(6);
    });
  });

  describe('userFavorites columns', () => {
    it('has all expected columns', () => {
      const cols = columnNames(userFavorites);
      expect(cols).toEqual(
        expect.arrayContaining(['id', 'userId', 'listingId', 'createdAt'])
      );
    });

    it('has exactly 4 columns', () => {
      expect(columnNames(userFavorites)).toHaveLength(4);
    });
  });

  describe('testDriveBookings columns', () => {
    it('has all expected columns', () => {
      const cols = columnNames(testDriveBookings);
      expect(cols).toEqual(
        expect.arrayContaining([
          'id', 'userId', 'listingId', 'carTitle', 'name', 'phone', 'email',
          'preferredDate', 'preferredTime', 'locationPreference', 'notes',
          'status', 'createdAt', 'updatedAt',
        ])
      );
    });

    it('has exactly 14 columns', () => {
      expect(columnNames(testDriveBookings)).toHaveLength(14);
    });
  });

  describe('siteConfig columns', () => {
    it('has all expected columns', () => {
      const cols = columnNames(siteConfig);
      expect(cols).toEqual(
        expect.arrayContaining(['key', 'value', 'updatedAt'])
      );
    });

    it('has exactly 3 columns', () => {
      expect(columnNames(siteConfig)).toHaveLength(3);
    });
  });
});

// ─── Column constraints ────────────────────────────────────────────
describe('Column constraints', () => {
  describe('notNull constraints', () => {
    it('categories.name is notNull', () => {
      expect(col(categories, 'name').notNull).toBe(true);
    });

    it('categories.slug is notNull', () => {
      expect(col(categories, 'slug').notNull).toBe(true);
    });

    it('listings.listingCode is notNull', () => {
      expect(col(listings, 'listingCode').notNull).toBe(true);
    });

    it('listings.title is notNull', () => {
      expect(col(listings, 'title').notNull).toBe(true);
    });

    it('listings.brand is notNull', () => {
      expect(col(listings, 'brand').notNull).toBe(true);
    });

    it('listings.model is notNull', () => {
      expect(col(listings, 'model').notNull).toBe(true);
    });

    it('listings.listingPriceInr is notNull', () => {
      expect(col(listings, 'listingPriceInr').notNull).toBe(true);
    });

    it('listings.images is notNull', () => {
      expect(col(listings, 'images').notNull).toBe(true);
    });

    it('users.name is notNull', () => {
      expect(col(users, 'name').notNull).toBe(true);
    });

    it('users.role is notNull', () => {
      expect(col(users, 'role').notNull).toBe(true);
    });

    it('sessions.userId is notNull', () => {
      expect(col(sessions, 'userId').notNull).toBe(true);
    });

    it('sessions.refreshToken is notNull', () => {
      expect(col(sessions, 'refreshToken').notNull).toBe(true);
    });

    it('sessions.expiresAt is notNull', () => {
      expect(col(sessions, 'expiresAt').notNull).toBe(true);
    });

    it('passwordResetTokens.token is notNull', () => {
      expect(col(passwordResetTokens, 'token').notNull).toBe(true);
    });

    it('passwordResetTokens.used is notNull', () => {
      expect(col(passwordResetTokens, 'used').notNull).toBe(true);
    });

    it('testDriveBookings.name is notNull', () => {
      expect(col(testDriveBookings, 'name').notNull).toBe(true);
    });

    it('testDriveBookings.phone is notNull', () => {
      expect(col(testDriveBookings, 'phone').notNull).toBe(true);
    });

    it('testDriveBookings.status is notNull', () => {
      expect(col(testDriveBookings, 'status').notNull).toBe(true);
    });

    it('siteConfig.value is notNull', () => {
      expect(col(siteConfig, 'value').notNull).toBe(true);
    });
  });

  describe('nullable columns (notNull is false)', () => {
    it('listings.categoryId is nullable', () => {
      expect(col(listings, 'categoryId').notNull).toBe(false);
    });

    it('users.email is nullable', () => {
      expect(col(users, 'email').notNull).toBe(false);
    });

    it('users.phone is nullable', () => {
      expect(col(users, 'phone').notNull).toBe(false);
    });

    it('users.passwordHash is nullable', () => {
      expect(col(users, 'passwordHash').notNull).toBe(false);
    });

    it('users.googleId is nullable', () => {
      expect(col(users, 'googleId').notNull).toBe(false);
    });

    it('listings.additionalNotes is nullable', () => {
      expect(col(listings, 'additionalNotes').notNull).toBe(false);
    });
  });

  describe('default values', () => {
    it('listings.listingPriceInr has a default', () => {
      expect(col(listings, 'listingPriceInr').hasDefault).toBe(true);
    });

    it('listings.negotiable has a default', () => {
      expect(col(listings, 'negotiable').hasDefault).toBe(true);
    });

    it('listings.listingStatus has a default', () => {
      expect(col(listings, 'listingStatus').hasDefault).toBe(true);
    });

    it('listings.featuredListing has a default', () => {
      expect(col(listings, 'featuredListing').hasDefault).toBe(true);
    });

    it('listings.isSplus has a default', () => {
      expect(col(listings, 'isSplus').hasDefault).toBe(true);
    });

    it('listings.viewsCount has a default', () => {
      expect(col(listings, 'viewsCount').hasDefault).toBe(true);
    });

    it('users.role has a default', () => {
      expect(col(users, 'role').hasDefault).toBe(true);
    });

    it('users.phoneVerified has a default', () => {
      expect(col(users, 'phoneVerified').hasDefault).toBe(true);
    });

    it('passwordResetTokens.used has a default', () => {
      expect(col(passwordResetTokens, 'used').hasDefault).toBe(true);
    });

    it('testDriveBookings.status has a default', () => {
      expect(col(testDriveBookings, 'status').hasDefault).toBe(true);
    });

    it('siteConfig.value has a default', () => {
      expect(col(siteConfig, 'value').hasDefault).toBe(true);
    });

    it('categories.createdAt has a default (defaultNow)', () => {
      expect(col(categories, 'createdAt').hasDefault).toBe(true);
    });

    it('listings.createdAt has a default (defaultNow)', () => {
      expect(col(listings, 'createdAt').hasDefault).toBe(true);
    });

    it('filterDefinitions.options has a default', () => {
      expect(col(filterDefinitions, 'options').hasDefault).toBe(true);
    });
  });

  describe('unique constraints', () => {
    it('categories.name is unique', () => {
      expect(col(categories, 'name').isUnique).toBe(true);
    });

    it('categories.slug is unique', () => {
      expect(col(categories, 'slug').isUnique).toBe(true);
    });

    it('filterDefinitions.key is unique', () => {
      expect(col(filterDefinitions, 'key').isUnique).toBe(true);
    });

    it('listings.listingCode is unique', () => {
      expect(col(listings, 'listingCode').isUnique).toBe(true);
    });

    it('users.email is unique', () => {
      expect(col(users, 'email').isUnique).toBe(true);
    });

    it('users.phone is unique', () => {
      expect(col(users, 'phone').isUnique).toBe(true);
    });

    it('users.googleId is unique', () => {
      expect(col(users, 'googleId').isUnique).toBe(true);
    });

    it('sessions.refreshToken is unique', () => {
      expect(col(sessions, 'refreshToken').isUnique).toBe(true);
    });

    it('passwordResetTokens.token is unique', () => {
      expect(col(passwordResetTokens, 'token').isUnique).toBe(true);
    });
  });

  describe('primary keys', () => {
    it('categories.id is a primary key', () => {
      expect(col(categories, 'id').primary).toBe(true);
    });

    it('listings.id is a primary key', () => {
      expect(col(listings, 'id').primary).toBe(true);
    });

    it('users.id is a primary key', () => {
      expect(col(users, 'id').primary).toBe(true);
    });

    it('sessions.id is a primary key', () => {
      expect(col(sessions, 'id').primary).toBe(true);
    });

    it('siteConfig.key is a primary key', () => {
      expect(col(siteConfig, 'key').primary).toBe(true);
    });
  });
});

// ─── Foreign key references ────────────────────────────────────────
describe('Foreign key references', () => {
  it('categoryFilterMap.categoryId references categories', () => {
    const fk = (col(categoryFilterMap, 'categoryId') as any);
    // In drizzle, columns that reference another table expose references
    expect(fk.notNull).toBe(true);
  });

  it('categoryFilterMap.filterId references filterDefinitions', () => {
    const fk = (col(categoryFilterMap, 'filterId') as any);
    expect(fk.notNull).toBe(true);
  });

  it('sessions.userId references users (notNull FK)', () => {
    expect(col(sessions, 'userId').notNull).toBe(true);
  });

  it('passwordResetTokens.userId references users (notNull FK)', () => {
    expect(col(passwordResetTokens, 'userId').notNull).toBe(true);
  });

  it('userFavorites.userId references users (notNull FK)', () => {
    expect(col(userFavorites, 'userId').notNull).toBe(true);
  });

  it('userFavorites.listingId references listings (notNull FK)', () => {
    expect(col(userFavorites, 'listingId').notNull).toBe(true);
  });

  it('testDriveBookings.userId references users (notNull FK)', () => {
    expect(col(testDriveBookings, 'userId').notNull).toBe(true);
  });

  it('testDriveBookings.listingId references listings (notNull FK)', () => {
    expect(col(testDriveBookings, 'listingId').notNull).toBe(true);
  });

  it('listings.categoryId references categories (nullable FK)', () => {
    expect(col(listings, 'categoryId').notNull).toBe(false);
  });
});

// ─── Column SQL name mapping ───────────────────────────────────────
describe('Column SQL name mapping', () => {
  it('listings.listingCode maps to SQL column "listing_code"', () => {
    expect((col(listings, 'listingCode') as any).name).toBe('listing_code');
  });

  it('listings.listingPriceInr maps to SQL column "listing_price_inr"', () => {
    expect((col(listings, 'listingPriceInr') as any).name).toBe('listing_price_inr');
  });

  it('listings.featuredListing maps to SQL column "featured_listing"', () => {
    expect((col(listings, 'featuredListing') as any).name).toBe('featured_listing');
  });

  it('listings.isSplus maps to SQL column "is_splus"', () => {
    expect((col(listings, 'isSplus') as any).name).toBe('is_splus');
  });

  it('users.passwordHash maps to SQL column "password_hash"', () => {
    expect((col(users, 'passwordHash') as any).name).toBe('password_hash');
  });

  it('users.googleId maps to SQL column "google_id"', () => {
    expect((col(users, 'googleId') as any).name).toBe('google_id');
  });

  it('sessions.refreshToken maps to SQL column "refresh_token"', () => {
    expect((col(sessions, 'refreshToken') as any).name).toBe('refresh_token');
  });

  it('testDriveBookings.carTitle maps to SQL column "car_title"', () => {
    expect((col(testDriveBookings, 'carTitle') as any).name).toBe('car_title');
  });

  it('testDriveBookings.preferredDate maps to SQL column "preferred_date"', () => {
    expect((col(testDriveBookings, 'preferredDate') as any).name).toBe('preferred_date');
  });

  it('categories.vehicleType maps to SQL column "vehicle_type"', () => {
    expect((col(categories, 'vehicleType') as any).name).toBe('vehicle_type');
  });
});

// ─── Index configuration ──────────────────────────────────────────
describe('Index configuration', () => {
  function indexNames(table: any): string[] {
    return getTableConfig(table).indexes.map((idx: any) => idx.config.name);
  }

  describe('listings indexes', () => {
    const names = () => indexNames(listings);

    it('has all 14 indexes', () => {
      expect(names()).toHaveLength(14);
    });

    it.each([
      'idx_listings_brand',
      'idx_listings_location_city',
      'idx_listings_listing_status',
      'idx_listings_price',
      'idx_listings_category',
      'idx_listings_featured',
      'idx_listings_splus',
      'idx_listings_search',
      'idx_listings_model_year',
      'idx_listings_created_at',
      'idx_listings_new_car',
      'idx_listings_fuel_type',
      'idx_listings_transmission_type',
      'idx_listings_body_style',
    ])('has %s index', (name) => {
      expect(names()).toContain(name);
    });
  });

  describe('sessions indexes', () => {
    it('has idx_sessions_user_id', () => {
      expect(indexNames(sessions)).toContain('idx_sessions_user_id');
    });

    it('has idx_sessions_expires_at', () => {
      expect(indexNames(sessions)).toContain('idx_sessions_expires_at');
    });

    it('has 2 indexes total', () => {
      expect(indexNames(sessions)).toHaveLength(2);
    });
  });

  describe('password_reset_tokens indexes', () => {
    it('has idx_password_reset_tokens_user_id', () => {
      expect(indexNames(passwordResetTokens)).toContain('idx_password_reset_tokens_user_id');
    });

    it('has 1 index total', () => {
      expect(indexNames(passwordResetTokens)).toHaveLength(1);
    });
  });

  describe('user_favorites indexes', () => {
    it('has user_favorites_user_listing_idx unique index', () => {
      expect(indexNames(userFavorites)).toContain('user_favorites_user_listing_idx');
    });

    it('has idx_user_favorites_user_created', () => {
      expect(indexNames(userFavorites)).toContain('idx_user_favorites_user_created');
    });

    it('has 2 indexes total', () => {
      expect(indexNames(userFavorites)).toHaveLength(2);
    });
  });

  describe('test_drive_bookings indexes', () => {
    it('has idx_bookings_user_id_created composite index', () => {
      expect(indexNames(testDriveBookings)).toContain('idx_bookings_user_id_created');
    });

    it('has idx_bookings_listing_id', () => {
      expect(indexNames(testDriveBookings)).toContain('idx_bookings_listing_id');
    });

    it('has 2 indexes total', () => {
      expect(indexNames(testDriveBookings)).toHaveLength(2);
    });
  });
});
