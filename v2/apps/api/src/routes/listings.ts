import type { FastifyInstance } from "fastify";
import { eq, and, gte, lte, sql, desc, asc, ilike, or, count } from "drizzle-orm";
import { db, listings, categories } from "@searchanycars/db";
import {
  listingFilterSchema,
  createListingSchema,
  updateListingSchema,
} from "@searchanycars/shared";
import { requireAdmin } from "../plugins/auth.js";
import { AppError } from "../errors.js";

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

export async function listingRoutes(app: FastifyInstance) {
  // ─── GET / — paginated list with filters + search ─────────────
  app.get("/", async (request, reply) => {
    const q = listingFilterSchema.parse(request.query);
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [];

    // Default: only Active for non-admin
    if (q.listingStatus) {
      conditions.push(eq(listings.listingStatus, q.listingStatus));
    } else if (!request.user || request.user.role !== "admin") {
      conditions.push(eq(listings.listingStatus, "Active"));
    }

    // Full-text search using PostgreSQL ts_vector
    if (q.search) {
      conditions.push(
        sql`to_tsvector('english', coalesce(${listings.title}, '') || ' ' || coalesce(${listings.brand}, '') || ' ' || coalesce(${listings.model}, '') || ' ' || coalesce(${listings.locationCity}, '')) @@ plainto_tsquery('english', ${q.search})`
      );
    }

    if (q.brand) conditions.push(eq(listings.brand, q.brand));
    if (q.fuelType) conditions.push(eq(listings.fuelType, q.fuelType));
    if (q.transmissionType)
      conditions.push(eq(listings.transmissionType, q.transmissionType));
    if (q.ownershipType)
      conditions.push(eq(listings.ownershipType, q.ownershipType));
    if (q.sellerType)
      conditions.push(eq(listings.sellerType, q.sellerType));
    if (q.bodyStyle)
      conditions.push(eq(listings.bodyStyle, q.bodyStyle));
    if (q.categoryId)
      conditions.push(eq(listings.categoryId, q.categoryId));

    // Location city — supports comma-separated
    if (q.locationCity) {
      const cities = q.locationCity
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cities.length === 1) {
        conditions.push(ilike(listings.locationCity, `%${cities[0]}%`));
      } else if (cities.length > 1) {
        conditions.push(
          or(...cities.map((c) => ilike(listings.locationCity, `%${c}%`)))!
        );
      }
    }

    if (q.priceMin) conditions.push(gte(listings.listingPriceInr, q.priceMin));
    if (q.priceMax) conditions.push(lte(listings.listingPriceInr, q.priceMax));
    if (q.yearMin) conditions.push(gte(listings.modelYear, q.yearMin));
    if (q.yearMax) conditions.push(lte(listings.modelYear, q.yearMax));
    if (q.kmMax) conditions.push(lte(listings.totalKmDriven, q.kmMax));

    if (q.isSplus !== undefined)
      conditions.push(eq(listings.isSplus, q.isSplus));
    if (q.isNewCar !== undefined)
      conditions.push(eq(listings.isNewCar, q.isNewCar));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Sort
    let orderBy;
    switch (q.sortBy) {
      case "price_asc":
        orderBy = [asc(listings.listingPriceInr)];
        break;
      case "price_desc":
        orderBy = [desc(listings.listingPriceInr)];
        break;
      case "year_desc":
        orderBy = [desc(listings.modelYear)];
        break;
      case "km_asc":
        orderBy = [asc(listings.totalKmDriven)];
        break;
      default:
        orderBy = [desc(listings.createdAt)];
    }

    // Parallel: data + count
    const [data, [{ total }]] = await Promise.all([
      db
        .select()
        .from(listings)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(listings)
        .where(where),
    ]);

    return reply.send({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // ─── GET /:id — single listing ────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);

    const rows = await db
      .select({
        listing: listings,
        categoryName: categories.name,
      })
      .from(listings)
      .leftJoin(categories, eq(listings.categoryId, categories.id))
      .where(eq(listings.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new AppError("Listing not found", 404);
    }

    return reply.send({
      ...rows[0].listing,
      categoryName: rows[0].categoryName,
    });
  });

  // ─── POST / — create listing (admin) ──────────────────────────
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = createListingSchema.parse(request.body);

    // Sanitize text fields
    const sanitized = {
      ...body,
      title: stripHtml(body.title),
      brand: stripHtml(body.brand),
      model: stripHtml(body.model),
      variant: body.variant ? stripHtml(body.variant) : undefined,
      additionalNotes: body.additionalNotes
        ? stripHtml(body.additionalNotes)
        : undefined,
    };

    try {
      const [created] = await db
        .insert(listings)
        .values(sanitized)
        .returning();

      return reply.status(201).send(created);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("duplicate key value")
      ) {
        throw new AppError(
          "A listing with this code already exists",
          409
        );
      }
      throw err;
    }
  });

  // ─── PUT /:id — update listing (admin) ─────────────────────────
  app.put("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const body = updateListingSchema.parse(request.body);

    const existing = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new AppError("Listing not found", 404);
    }

    // Sanitize text fields if present
    const sanitized: Record<string, unknown> = {
      ...body,
      updatedAt: new Date(),
    };
    if (body.title) sanitized.title = stripHtml(body.title);
    if (body.brand) sanitized.brand = stripHtml(body.brand);
    if (body.model) sanitized.model = stripHtml(body.model);
    if (body.variant) sanitized.variant = stripHtml(body.variant);
    if (body.additionalNotes)
      sanitized.additionalNotes = stripHtml(body.additionalNotes);

    const [updated] = await db
      .update(listings)
      .set(sanitized)
      .where(eq(listings.id, id))
      .returning();

    return reply.send(updated);
  });

  // ─── DELETE /:id — delete listing (admin) ──────────────────────
  app.delete(
    "/:id",
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);

      const existing = await db
        .select({ id: listings.id })
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new AppError("Listing not found", 404);
      }

      await db.delete(listings).where(eq(listings.id, id));
      return reply.status(204).send();
    }
  );
}
