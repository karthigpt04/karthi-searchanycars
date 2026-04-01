import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { verifyAccessToken, type TokenPayload } from "../services/authService.js";
import { AppError } from "../errors.js";

declare module "fastify" {
  interface FastifyRequest {
    user: TokenPayload | null;
  }
}

async function authPlugin(app: FastifyInstance) {
  // Decorate every request with user = null
  app.decorateRequest("user", null);

  // Extract user from cookie OR Bearer header on every request
  app.addHook("onRequest", async (request: FastifyRequest) => {
    request.user = null;

    // Try cookie first
    let token = request.cookies?.access_token;

    // Fall back to Authorization: Bearer <token>
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        request.user = payload;
      }
    }
  });
}

export const authMiddleware = fp(authPlugin, {
  name: "auth-middleware",
  dependencies: ["@fastify/cookie"],
});

// Guards — use as preHandler hooks on routes
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    throw new AppError("Authentication required", 401);
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    throw new AppError("Authentication required", 401);
  }
  if (request.user.role !== "admin") {
    throw new AppError("Admin access required", 403);
  }
}
