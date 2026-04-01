import type { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db, userFavorites, listings } from "@searchanycars/db";
import { requireAuth } from "../plugins/auth.js";
import { AppError } from "../errors.js";

const bulkSyncSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export async function favoriteRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook("preHandler", requireAuth);

  // ─── GET / — list user's favorite listing IDs ─────────────────
  app.get("/", async (request, reply) => {
    const rows = await db
      .select({ listingId: userFavorites.listingId })
      .from(userFavorites)
      .where(eq(userFavorites.userId, request.user!.id))
      .orderBy(desc(userFavorites.createdAt));

    return reply.send(rows.map((r) => r.listingId));
  });

  // ─── POST /:listingId — add favorite ──────────────────────────
  app.post("/:listingId", async (request, reply) => {
    const listingId = Number(
      (request.params as { listingId: string }).listingId
    );
    if (!listingId || listingId <= 0) {
      throw new AppError("Invalid listing ID", 400);
    }

    // Check listing exists
    const listing = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (listing.length === 0) {
      throw new AppError("Listing not found", 404);
    }

    // Insert with ON CONFLICT DO NOTHING (idempotent)
    await db
      .insert(userFavorites)
      .values({ userId: request.user!.id, listingId })
      .onConflictDoNothing();

    return reply.status(201).send({ message: "Added to favorites", listingId });
  });

  // ─── DELETE /:listingId — remove favorite ─────────────────────
  app.delete("/:listingId", async (request, reply) => {
    const listingId = Number(
      (request.params as { listingId: string }).listingId
    );

    await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, request.user!.id),
          eq(userFavorites.listingId, listingId)
        )
      );

    return reply.send({ message: "Removed from favorites", listingId });
  });

  // ─── PUT / — bulk sync (merge) ────────────────────────────────
  app.put("/", async (request, reply) => {
    const { ids } = bulkSyncSchema.parse(request.body);

    // Insert each with ON CONFLICT DO NOTHING
    for (const listingId of ids) {
      await db
        .insert(userFavorites)
        .values({ userId: request.user!.id, listingId })
        .onConflictDoNothing();
    }

    // Return full merged list
    const rows = await db
      .select({ listingId: userFavorites.listingId })
      .from(userFavorites)
      .where(eq(userFavorites.userId, request.user!.id))
      .orderBy(desc(userFavorites.createdAt));

    return reply.send(rows.map((r) => r.listingId));
  });
}
