import type { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { db, testDriveBookings, listings, users } from "@searchanycars/db";
import { createBookingSchema } from "@searchanycars/shared";
import { requireAuth } from "../plugins/auth.js";
import { sendBookingConfirmationEmail } from "../services/emailService.js";
import { AppError } from "../errors.js";

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

export async function bookingRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook("preHandler", requireAuth);

  // ─── GET / — user's bookings with listing details ─────────────
  app.get("/", async (request, reply) => {
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
        listingImages: listings.images,
        listingLocationCity: listings.locationCity,
      })
      .from(testDriveBookings)
      .leftJoin(listings, eq(testDriveBookings.listingId, listings.id))
      .where(eq(testDriveBookings.userId, request.user!.id))
      .orderBy(desc(testDriveBookings.createdAt));

    const result = rows.map((r) => ({
      id: r.id,
      listingId: r.listingId,
      carTitle: r.carTitle,
      name: r.name,
      phone: r.phone,
      email: r.email,
      preferredDate: r.preferredDate,
      preferredTime: r.preferredTime,
      locationPreference: r.locationPreference,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      listing: {
        title: r.listingTitle,
        brand: r.listingBrand,
        model: r.listingModel,
        listingPriceInr: r.listingPriceInr,
        images: r.listingImages,
        locationCity: r.listingLocationCity,
      },
    }));

    return reply.send(result);
  });

  // ─── POST / — create booking ──────────────────────────────────
  app.post("/", async (request, reply) => {
    const body = createBookingSchema.parse(request.body);

    // Check listing exists
    const listingRows = await db
      .select({ id: listings.id, title: listings.title })
      .from(listings)
      .where(eq(listings.id, body.listingId))
      .limit(1);

    if (listingRows.length === 0) {
      throw new AppError("Listing not found", 404);
    }

    const listing = listingRows[0];
    const carTitle = stripHtml(body.name ? listing.title : listing.title);

    const [booking] = await db
      .insert(testDriveBookings)
      .values({
        userId: request.user!.id,
        listingId: body.listingId,
        carTitle,
        name: stripHtml(body.name),
        phone: stripHtml(body.phone),
        email: body.email || null,
        preferredDate: body.preferredDate || null,
        preferredTime: body.preferredTime || null,
        locationPreference: body.locationPreference || "hub",
        notes: body.notes ? stripHtml(body.notes) : null,
      })
      .returning({ id: testDriveBookings.id });

    // Fire-and-forget email
    const userRows = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, request.user!.id))
      .limit(1);

    if (userRows[0]?.email) {
      sendBookingConfirmationEmail(userRows[0].email, {
        carTitle,
        name: stripHtml(body.name),
        phone: stripHtml(body.phone),
        preferredDate: body.preferredDate,
        preferredTime: body.preferredTime,
        locationPreference: body.locationPreference || "hub",
        notes: body.notes,
      }).catch((err) =>
        request.log.error(err, "[Email] Booking confirmation failed")
      );
    }

    return reply
      .status(201)
      .send({ id: booking.id, message: "Booking created successfully" });
  });

  // ─── DELETE /:id — cancel booking ─────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);

    const rows = await db
      .select({
        id: testDriveBookings.id,
        userId: testDriveBookings.userId,
      })
      .from(testDriveBookings)
      .where(eq(testDriveBookings.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new AppError("Booking not found", 404);
    }

    const booking = rows[0];
    if (booking.userId !== request.user!.id && request.user!.role !== "admin") {
      throw new AppError("Not authorized", 403);
    }

    await db
      .update(testDriveBookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(testDriveBookings.id, id));

    return reply.send({ message: "Booking cancelled" });
  });
}
