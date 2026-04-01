import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db, testDriveBookings, listings, users } from "@searchanycars/db";
import { updateBookingStatusSchema } from "@searchanycars/shared";
import { requireAdmin } from "../plugins/auth.js";
import { AppError } from "../errors.js";

export async function adminBookingRoutes(app: FastifyInstance) {
  // All routes require admin
  app.addHook("preHandler", requireAdmin);

  // ─── GET / — all bookings with user + listing info ────────────
  app.get("/", async (_request, reply) => {
    const rows = await db
      .select({
        id: testDriveBookings.id,
        listingId: testDriveBookings.listingId,
        carTitle: testDriveBookings.carTitle,
        name: testDriveBookings.name,
        phone: testDriveBookings.phone,
        email: testDriveBookings.email,
        preferredDate: testDriveBookings.preferredDate,
        preferredTime: testDriveBookings.preferredTime,
        locationPreference: testDriveBookings.locationPreference,
        notes: testDriveBookings.notes,
        status: testDriveBookings.status,
        createdAt: testDriveBookings.createdAt,
        updatedAt: testDriveBookings.updatedAt,
        listingTitle: listings.title,
        listingBrand: listings.brand,
        listingModel: listings.model,
        listingPriceInr: listings.listingPriceInr,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
      })
      .from(testDriveBookings)
      .leftJoin(listings, eq(testDriveBookings.listingId, listings.id))
      .leftJoin(users, eq(testDriveBookings.userId, users.id))
      .orderBy(desc(testDriveBookings.createdAt));

    return reply.send(rows);
  });

  // ─── PATCH /:id/status — update booking status ────────────────
  app.patch("/:id/status", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const { status } = updateBookingStatusSchema.parse(request.body);

    const existing = await db
      .select({ id: testDriveBookings.id })
      .from(testDriveBookings)
      .where(eq(testDriveBookings.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new AppError("Booking not found", 404);
    }

    await db
      .update(testDriveBookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(testDriveBookings.id, id));

    return reply.send({ message: "Booking status updated", id, status });
  });
}
