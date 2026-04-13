import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "@searchanycars/db";

export async function healthPlugin(app: FastifyInstance) {
  app.get("/api/health", async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { ok: true, service: "searchanycars-api", db: "ok" };
    } catch (err) {
      app.log.error({ err }, "health check failed");
      return reply.status(503).send({ ok: false, service: "searchanycars-api", db: "down" });
    }
  });
}
