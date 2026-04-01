import type { FastifyInstance } from "fastify";

export async function healthPlugin(app: FastifyInstance) {
  app.get("/api/health", async () => {
    return { ok: true, service: "searchanycars-api" };
  });
}
