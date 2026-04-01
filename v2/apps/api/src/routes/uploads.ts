import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../plugins/auth.js";
import { uploadImage } from "../services/uploadService.js";
import { AppError } from "../errors.js";

export async function uploadRoutes(app: FastifyInstance) {
  // ─── POST /image — upload car image (admin) ───────────────────
  app.post("/image", { preHandler: [requireAdmin] }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      throw new AppError("No file uploaded", 400);
    }

    if (!data.mimetype.startsWith("image/")) {
      throw new AppError("Only image files are allowed", 400);
    }

    const buffer = await data.toBuffer();

    if (buffer.length > 6 * 1024 * 1024) {
      throw new AppError("File too large. Max 6MB", 400);
    }

    const result = await uploadImage(buffer, data.filename, data.mimetype);

    return reply.send(result);
  });
}
