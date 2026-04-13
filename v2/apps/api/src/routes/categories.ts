import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import {
  db,
  categories,
  filterDefinitions,
  categoryFilterMap,
} from "@searchanycars/db";
import { createCategorySchema, updateCategorySchema } from "@searchanycars/shared";
import { requireAdmin } from "../plugins/auth.js";
import { AppError } from "../errors.js";
import { logAudit } from "../services/auditService.js";

export async function categoryRoutes(app: FastifyInstance) {
  // ─── GET / — list all categories ──────────────────────────────
  app.get("/", async (_request, reply) => {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(categories.name);
    return reply.send(rows);
  });

  // ─── POST / — create category (admin) ─────────────────────────
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = createCategorySchema.parse(request.body);
    const [created] = await db.insert(categories).values(body).returning();
    logAudit({ actorId: request.user!.id, actorEmail: request.user!.email, action: "category.create", resourceType: "category", resourceId: String(created.id), ipAddress: request.ip, userAgent: request.headers["user-agent"] || "" });
    return reply.status(201).send(created);
  });

  // ─── PUT /:id — update category (admin) ────────────────────────
  app.put("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const body = updateCategorySchema.parse(request.body);

    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new AppError("Category not found", 404);
    }

    const [updated] = await db
      .update(categories)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    logAudit({ actorId: request.user!.id, actorEmail: request.user!.email, action: "category.update", resourceType: "category", resourceId: String(id), ipAddress: request.ip, userAgent: request.headers["user-agent"] || "" });
    return reply.send(updated);
  });

  // ─── DELETE /:id — delete category (admin) ─────────────────────
  app.delete(
    "/:id",
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);

      const existing = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new AppError("Category not found", 404);
      }

      await db.delete(categories).where(eq(categories.id, id));
      logAudit({ actorId: request.user!.id, actorEmail: request.user!.email, action: "category.delete", resourceType: "category", resourceId: String(id), ipAddress: request.ip, userAgent: request.headers["user-agent"] || "" });
      return reply.status(204).send();
    }
  );

  // ─── GET /filters/:categoryId — filters for category ──────────
  app.get("/filters/:categoryId", async (request, reply) => {
    const categoryId = Number(
      (request.params as { categoryId: string }).categoryId
    );

    const rows = await db
      .select({
        id: filterDefinitions.id,
        key: filterDefinitions.key,
        label: filterDefinitions.label,
        type: filterDefinitions.type,
        options: filterDefinitions.options,
      })
      .from(categoryFilterMap)
      .innerJoin(
        filterDefinitions,
        eq(categoryFilterMap.filterId, filterDefinitions.id)
      )
      .where(eq(categoryFilterMap.categoryId, categoryId));

    return reply.send(rows);
  });

  // ─── PUT /filters/:categoryId — set filters (admin) ───────────
  app.put(
    "/filters/:categoryId",
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      const categoryId = Number(
        (request.params as { categoryId: string }).categoryId
      );
      const { filterIds } = request.body as { filterIds: number[] };

      if (!Array.isArray(filterIds)) {
        throw new AppError("filterIds must be an array", 400);
      }

      // Transaction: delete old mappings, insert new ones
      await db.transaction(async (tx) => {
        await tx
          .delete(categoryFilterMap)
          .where(eq(categoryFilterMap.categoryId, categoryId));

        if (filterIds.length > 0) {
          await tx.insert(categoryFilterMap).values(
            filterIds.map((filterId) => ({ categoryId, filterId }))
          );
        }
      });

      logAudit({ actorId: request.user!.id, actorEmail: request.user!.email, action: "category.filters.update", resourceType: "category", resourceId: String(categoryId), details: { filterIds }, ipAddress: request.ip, userAgent: request.headers["user-agent"] || "" });
      return reply.send({ categoryId, filterIds });
    }
  );
}
