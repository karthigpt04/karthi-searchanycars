import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_HEADER = "x-csrf-protection";

async function csrfPlugin(app: FastifyInstance) {
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!MUTATING_METHODS.has(request.method)) return;
      if (request.headers[CSRF_HEADER] !== "1") {
        return reply.status(403).send({ error: "CSRF validation failed" });
      }
    },
  );
}

export const csrfProtection = fp(csrfPlugin, { name: "csrf-protection" });
