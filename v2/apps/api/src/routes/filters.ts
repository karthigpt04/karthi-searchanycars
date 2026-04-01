import type { FastifyInstance } from "fastify";
import { db, filterDefinitions } from "@searchanycars/db";

export async function filterRoutes(app: FastifyInstance) {
  // ─── GET / — list all filter definitions ──────────────────────
  app.get("/", async (_request, reply) => {
    const rows = await db.select().from(filterDefinitions);
    return reply.send(rows);
  });
}
