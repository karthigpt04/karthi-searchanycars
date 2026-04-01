import { z } from "zod";

export const createBookingSchema = z.object({
  listingId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(20),
  email: z.string().email().optional(),
  preferredDate: z.string().max(20).optional(),
  preferredTime: z.string().max(20).optional(),
  locationPreference: z.enum(["hub", "home", "dealer"]).optional(),
  notes: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

export type UpdateBookingStatusInput = z.infer<
  typeof updateBookingStatusSchema
>;
