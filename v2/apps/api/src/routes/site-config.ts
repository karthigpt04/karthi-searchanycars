import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db, siteConfig } from "@searchanycars/db";
import { requireAdmin } from "../plugins/auth.js";
import { AppError } from "../errors.js";
import { logAudit } from "../services/auditService.js";

export async function siteConfigRoutes(app: FastifyInstance) {
  // ─── GET / — all config as { key: value } object ──────────────
  app.get("/", async (_request, reply) => {
    const rows = await db.select().from(siteConfig);
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return reply.send(result);
  });

  // ─── GET /:key — single config value ──────────────────────────
  app.get("/:key", async (request, reply) => {
    const key = (request.params as { key: string }).key;
    const rows = await db
      .select()
      .from(siteConfig)
      .where(eq(siteConfig.key, key))
      .limit(1);

    if (rows.length === 0) {
      throw new AppError("Config key not found", 404);
    }

    return reply.send({ key: rows[0].key, value: rows[0].value });
  });

  // ─── PUT /:key — upsert config value (admin) ──────────────────
  app.put(
    "/:key",
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      const key = (request.params as { key: string }).key;
      const { value } = request.body as { value: unknown };

      if (value === undefined) {
        throw new AppError("value is required", 400);
      }

      // Upsert: insert or update on conflict
      const existing = await db
        .select()
        .from(siteConfig)
        .where(eq(siteConfig.key, key))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(siteConfig).values({ key, value, updatedAt: new Date() });
      } else {
        await db
          .update(siteConfig)
          .set({ value, updatedAt: new Date() })
          .where(eq(siteConfig.key, key));
      }

      logAudit({ actorId: request.user!.id, actorEmail: request.user!.email, action: "config.upsert", resourceType: "config", resourceId: key, ipAddress: request.ip, userAgent: request.headers["user-agent"] || "" });
      return reply.send({ key, value });
    }
  );
}
