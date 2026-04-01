import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = postgres(connectionString);
const db = drizzle(client, { schema });

// ─── Seed data ──────────────────────────────────────────────────────

const defaultCategories = [
  { name: "Hatchback", slug: "hatchback", vehicleType: "Hatchback" },
  { name: "Sedan", slug: "sedan", vehicleType: "Sedan" },
  { name: "SUV", slug: "suv", vehicleType: "SUV" },
  { name: "MUV", slug: "muv", vehicleType: "MUV" },
  { name: "Coupe", slug: "coupe", vehicleType: "Coupe" },
  { name: "Pickup", slug: "pickup", vehicleType: "Pickup" },
  { name: "Luxury Sedan", slug: "luxury-sedan", vehicleType: "Luxury Sedan" },
  { name: "Luxury SUV", slug: "luxury-suv", vehicleType: "Luxury SUV" },
];

const defaultFilterDefinitions = [
  { key: "brand", label: "Brand", type: "text", options: [] },
  {
    key: "fuel_type",
    label: "Fuel Type",
    type: "select",
    options: ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"],
  },
  {
    key: "transmission_type",
    label: "Transmission",
    type: "select",
    options: ["Manual", "Automatic", "CVT", "DCT", "AMT"],
  },
  {
    key: "ownership_type",
    label: "Ownership Type",
    type: "select",
    options: ["First", "Second", "Third", "Fourth+"],
  },
  {
    key: "seller_type",
    label: "Seller Type",
    type: "select",
    options: ["Dealer", "Individual", "Certified Dealer"],
  },
  { key: "listing_price_min", label: "Min Price (INR)", type: "number", options: [] },
  { key: "listing_price_max", label: "Max Price (INR)", type: "number", options: [] },
  { key: "model_year_min", label: "Min Model Year", type: "number", options: [] },
  { key: "model_year_max", label: "Max Model Year", type: "number", options: [] },
  { key: "total_km_driven_max", label: "Max KM Driven", type: "number", options: [] },
  { key: "location_city", label: "City", type: "text", options: [] },
  {
    key: "body_style",
    label: "Body Type",
    type: "select",
    options: ["Hatchback", "Sedan", "SUV", "MUV", "Coupe", "Pickup"],
  },
  {
    key: "exterior_color",
    label: "Color",
    type: "select",
    options: ["White", "Black", "Silver", "Grey", "Red", "Blue", "Brown", "Beige"],
  },
];

const sampleListings = [
  {
    listingCode: "SAC-1001",
    title: "2022 Hyundai Creta SX(O)",
    brand: "Hyundai",
    model: "Creta",
    variant: "SX(O)",
    modelYear: 2022,
    registrationYear: 2022,
    vehicleType: "SUV",
    bodyStyle: "SUV",
    exteriorColor: "Polar White",
    interiorColor: "Black",
    listingPriceInr: 1450000,
    negotiable: false,
    estimatedMarketValueInr: 1520000,
    ownershipType: "First",
    sellerType: "Certified Dealer",
    registrationState: "Delhi",
    registrationCity: "New Delhi",
    totalKmDriven: 25432,
    mileageKmpl: 16.8,
    engineType: "1.5L Turbo Petrol",
    engineCapacityCc: 1482,
    powerBhp: 158,
    transmissionType: "Automatic",
    fuelType: "Petrol",
    overallConditionRating: 9,
    serviceHistoryAvailable: true,
    airbagsCount: 6,
    infotainmentScreenSize: "10.25",
    locationCity: "New Delhi",
    locationState: "Delhi",
    dealerRating: 4.8,
    inspectionStatus: "Completed",
    inspectionScore: 92,
    listingStatus: "Active",
    featuredListing: true,
    viewsCount: 342,
    favoritesCount: 67,
    leadCount: 28,
    promotionTier: "Premium",
    images: [
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1400&q=80",
    ],
    additionalNotes:
      "Top-spec Creta with panoramic sunroof, ADAS features, ventilated seats, and Bose sound system. Single owner, full Hyundai service history. Immaculate condition.",
    specs: {},
  },
  {
    listingCode: "SAC-1002",
    title: "2023 Maruti Suzuki Baleno Alpha",
    brand: "Maruti Suzuki",
    model: "Baleno",
    variant: "Alpha",
    modelYear: 2023,
    registrationYear: 2023,
    vehicleType: "Hatchback",
    bodyStyle: "Hatchback",
    exteriorColor: "Nexa Blue",
    interiorColor: "Black & Grey",
    listingPriceInr: 820000,
    negotiable: false,
    estimatedMarketValueInr: 870000,
    ownershipType: "First",
    sellerType: "Certified Dealer",
    registrationState: "Maharashtra",
    registrationCity: "Mumbai",
    totalKmDriven: 12800,
    mileageKmpl: 22.4,
    engineType: "1.2L DualJet Petrol",
    engineCapacityCc: 1197,
    powerBhp: 89,
    transmissionType: "Manual",
    fuelType: "Petrol",
    overallConditionRating: 9,
    serviceHistoryAvailable: true,
    airbagsCount: 6,
    infotainmentScreenSize: "9",
    locationCity: "Mumbai",
    locationState: "Maharashtra",
    dealerRating: 4.6,
    inspectionStatus: "Completed",
    inspectionScore: 95,
    listingStatus: "Active",
    featuredListing: true,
    viewsCount: 256,
    favoritesCount: 42,
    leadCount: 19,
    promotionTier: "Featured",
    images: [
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1400&q=80",
    ],
    additionalNotes:
      "Almost new Baleno Alpha with heads-up display, 360-degree camera, and SmartPlay Pro+ infotainment. Excellent fuel efficiency for city driving.",
    specs: {},
  },
  {
    listingCode: "SAC-1003",
    title: "2021 Tata Nexon XZ+ Dark Edition",
    brand: "Tata",
    model: "Nexon",
    variant: "XZ+ Dark Edition",
    modelYear: 2021,
    registrationYear: 2021,
    vehicleType: "SUV",
    bodyStyle: "SUV",
    exteriorColor: "Atlas Black",
    interiorColor: "Blackstone",
    listingPriceInr: 985000,
    negotiable: false,
    estimatedMarketValueInr: 1050000,
    ownershipType: "First",
    sellerType: "Dealer",
    registrationState: "Karnataka",
    registrationCity: "Bengaluru",
    totalKmDriven: 38500,
    mileageKmpl: 17.2,
    engineType: "1.2L Turbo Revotron",
    engineCapacityCc: 1199,
    powerBhp: 120,
    transmissionType: "Manual",
    fuelType: "Petrol",
    overallConditionRating: 8,
    serviceHistoryAvailable: true,
    airbagsCount: 4,
    infotainmentScreenSize: "7",
    locationCity: "Bengaluru",
    locationState: "Karnataka",
    dealerRating: 4.5,
    inspectionStatus: "Completed",
    inspectionScore: 88,
    listingStatus: "Active",
    featuredListing: true,
    viewsCount: 198,
    favoritesCount: 34,
    leadCount: 15,
    promotionTier: "Standard",
    images: [
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    ],
    additionalNotes:
      "5-star GNCAP rated compact SUV with Dark Edition styling. Features connected car tech, sunroof, and automatic climate control. Well maintained.",
    specs: {},
  },
  {
    listingCode: "SAC-1004",
    title: "2022 Honda City ZX CVT",
    brand: "Honda",
    model: "City",
    variant: "ZX CVT",
    modelYear: 2022,
    registrationYear: 2022,
    vehicleType: "Sedan",
    bodyStyle: "Sedan",
    exteriorColor: "Platinum White Pearl",
    interiorColor: "Black",
    listingPriceInr: 1280000,
    negotiable: false,
    estimatedMarketValueInr: 1350000,
    ownershipType: "First",
    sellerType: "Individual",
    registrationState: "Tamil Nadu",
    registrationCity: "Chennai",
    totalKmDriven: 18900,
    mileageKmpl: 18.4,
    engineType: "1.5L i-VTEC",
    engineCapacityCc: 1498,
    powerBhp: 121,
    transmissionType: "CVT",
    fuelType: "Petrol",
    overallConditionRating: 9,
    serviceHistoryAvailable: true,
    airbagsCount: 6,
    infotainmentScreenSize: "8",
    locationCity: "Chennai",
    locationState: "Tamil Nadu",
    dealerRating: 0,
    inspectionStatus: "Completed",
    inspectionScore: 91,
    listingStatus: "Active",
    featuredListing: true,
    viewsCount: 278,
    favoritesCount: 51,
    leadCount: 22,
    promotionTier: "Featured",
    images: [
      "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80",
    ],
    additionalNotes:
      "Top-spec City with lane watch camera, Honda Connect, LED headlamps, and sunroof. Smooth CVT transmission perfect for city and highway. Single owner.",
    specs: {},
  },
  {
    listingCode: "SAC-1005",
    title: "2023 Kia Seltos HTX+",
    brand: "Kia",
    model: "Seltos",
    variant: "HTX+",
    modelYear: 2023,
    registrationYear: 2023,
    vehicleType: "SUV",
    bodyStyle: "SUV",
    exteriorColor: "Gravity Grey",
    interiorColor: "Indigo Pera",
    listingPriceInr: 1590000,
    negotiable: false,
    estimatedMarketValueInr: 1650000,
    ownershipType: "First",
    sellerType: "Certified Dealer",
    registrationState: "Telangana",
    registrationCity: "Hyderabad",
    totalKmDriven: 9800,
    mileageKmpl: 16.5,
    engineType: "1.5L Turbo GDI",
    engineCapacityCc: 1497,
    powerBhp: 158,
    transmissionType: "DCT",
    fuelType: "Petrol",
    overallConditionRating: 10,
    serviceHistoryAvailable: true,
    airbagsCount: 6,
    infotainmentScreenSize: "10.25",
    locationCity: "Hyderabad",
    locationState: "Telangana",
    dealerRating: 4.9,
    inspectionStatus: "Completed",
    inspectionScore: 96,
    listingStatus: "Active",
    featuredListing: true,
    viewsCount: 410,
    favoritesCount: 89,
    leadCount: 35,
    promotionTier: "Premium",
    images: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0afe?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1400&q=80",
    ],
    additionalNotes:
      "Almost new Seltos with ADAS Level 2 features, ventilated seats, 360-degree camera, and Bose 8-speaker system. Under 10K km. Extended warranty available.",
    specs: {},
  },
];

const defaultSiteConfig: Record<string, unknown> = {
  site_name: "SearchAnyCars",
  hero: {
    title: "Find Your Perfect Used Car",
    subtitle:
      "Browse 12,000+ quality-inspected used cars with warranty, easy financing, and doorstep delivery across India",
  },
  trust_bar: [
    { icon: "magnify", label: "200+ Point Inspection" },
    { icon: "refresh", label: "7-Day Money Back" },
    { icon: "shield", label: "1-Year Warranty" },
    { icon: "currency", label: "Fixed Price — No Haggling" },
    { icon: "document", label: "Free RC Transfer" },
  ],
  budget_brackets: [
    { label: "Under ₹2L", max: 200000 },
    { label: "₹2-3L", min: 200000, max: 300000 },
    { label: "₹3-5L", min: 300000, max: 500000 },
    { label: "₹5-8L", min: 500000, max: 800000 },
    { label: "₹8-10L", min: 800000, max: 1000000 },
    { label: "₹10-15L", min: 1000000, max: 1500000 },
    { label: "₹15-20L", min: 1500000, max: 2000000 },
    { label: "Above ₹20L", min: 2000000 },
  ],
  body_types: [
    { name: "Hatchback", count: "420+" },
    { name: "Sedan", count: "380+" },
    { name: "SUV", count: "520+" },
    { name: "MUV", count: "180+" },
    { name: "Luxury Sedan", count: "95+" },
    { name: "Luxury SUV", count: "75+" },
  ],
  fuel_types: [
    { name: "Petrol", count: "580+" },
    { name: "Diesel", count: "320+" },
    { name: "CNG", count: "95+" },
    { name: "Electric", count: "45+" },
  ],
  cities: [
    { name: "New Delhi", slug: "new-delhi", count: "1,200+" },
    { name: "Mumbai", slug: "mumbai", count: "1,800+" },
    { name: "Bengaluru", slug: "bengaluru", count: "950+" },
    { name: "Chennai", slug: "chennai", count: "720+" },
    { name: "Hyderabad", slug: "hyderabad", count: "680+" },
    { name: "Pune", slug: "pune", count: "540+" },
    { name: "Ahmedabad", slug: "ahmedabad", count: "420+" },
    { name: "Jaipur", slug: "jaipur", count: "380+" },
    { name: "Lucknow", slug: "lucknow", count: "310+" },
    { name: "Kolkata", slug: "kolkata", count: "650+" },
    { name: "Chandigarh", slug: "chandigarh", count: "290+" },
    { name: "Kochi", slug: "kochi", count: "260+" },
  ],
  nav_items: [
    { label: "Home", path: "/" },
    { label: "Buy Cars", path: "/search" },
    { label: "S-Plus", path: "/splus" },
    { label: "S-Plus New", path: "/splus-new" },
    { label: "How It Works", path: "/how-it-works" },
    { label: "About Us", path: "/about" },
    { label: "FAQs", path: "/faq" },
    { label: "Contact", path: "/contact" },
  ],
  contact_info: {
    phone: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    email: "hello@searchanycars.com",
    address: "Koramangala, Bengaluru, Karnataka 560034",
  },
};

// ─── Seed functions ─────────────────────────────────────────────────

async function seedCategories() {
  console.log("Seeding categories...");
  for (const cat of defaultCategories) {
    const existing = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.slug, cat.slug))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.categories).values(cat);
    }
  }
  console.log(`  ✓ ${defaultCategories.length} categories`);
}

async function seedFilterDefinitions() {
  console.log("Seeding filter definitions...");
  for (const f of defaultFilterDefinitions) {
    const existing = await db
      .select()
      .from(schema.filterDefinitions)
      .where(eq(schema.filterDefinitions.key, f.key))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.filterDefinitions).values(f);
    }
  }
  console.log(`  ✓ ${defaultFilterDefinitions.length} filter definitions`);
}

async function seedCategoryFilterMap() {
  console.log("Seeding category-filter map...");
  const allCategories = await db.select().from(schema.categories);
  const allFilters = await db.select().from(schema.filterDefinitions);

  for (const cat of allCategories) {
    for (const filter of allFilters) {
      const existing = await db
        .select()
        .from(schema.categoryFilterMap)
        .where(eq(schema.categoryFilterMap.categoryId, cat.id))
        .limit(1);
      // Only insert if this specific pair doesn't exist — check properly
      const pair = await db
        .select()
        .from(schema.categoryFilterMap)
        .where(eq(schema.categoryFilterMap.categoryId, cat.id))
        .then((rows) => rows.find((r) => r.filterId === filter.id));
      if (!pair) {
        await db
          .insert(schema.categoryFilterMap)
          .values({ categoryId: cat.id, filterId: filter.id });
      }
    }
  }
  console.log(
    `  ✓ ${allCategories.length * allFilters.length} category-filter mappings`
  );
}

async function seedListings() {
  console.log("Seeding sample listings...");
  // Build a slug→id map for categories
  const allCategories = await db.select().from(schema.categories);
  const bodyToCategoryId: Record<string, number> = {};
  for (const cat of allCategories) {
    bodyToCategoryId[cat.vehicleType] = cat.id;
  }

  for (const listing of sampleListings) {
    const existing = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.listingCode, listing.listingCode))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.listings).values({
        ...listing,
        categoryId: bodyToCategoryId[listing.vehicleType] ?? null,
      });
    }
  }
  console.log(`  ✓ ${sampleListings.length} sample listings`);
}

async function seedAdminUser() {
  console.log("Seeding admin user...");
  const adminEmail = "admin@searchanycars.com";
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);

  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.insert(schema.users).values({
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "admin",
      emailVerified: true,
    });
  }
  console.log("  ✓ admin user (admin@searchanycars.com)");
}

async function seedSiteConfig() {
  console.log("Seeding site config...");
  for (const [key, value] of Object.entries(defaultSiteConfig)) {
    const existing = await db
      .select()
      .from(schema.siteConfig)
      .where(eq(schema.siteConfig.key, key))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.siteConfig).values({ key, value });
    }
  }
  console.log(`  ✓ ${Object.keys(defaultSiteConfig).length} config entries`);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...\n");

  await seedCategories();
  await seedFilterDefinitions();
  await seedCategoryFilterMap();
  await seedListings();
  await seedAdminUser();
  await seedSiteConfig();

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
