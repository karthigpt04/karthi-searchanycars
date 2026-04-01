import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { healthPlugin } from "./plugins/health.js";
import { authMiddleware } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { globalErrorHandler } from "./errors.js";

export async function buildApp() {
  const app = Fastify({
    logger: config.isDev
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : true,
  });

  // Global error handler
  app.setErrorHandler(globalErrorHandler);

  // CORS — credentials: true for cookies
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Cookies
  await app.register(cookie, {
    secret: config.cookieSecret,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.isDev ? 200 : 100,
    timeWindow: "1 minute",
  });

  // Auth middleware (decorates request.user)
  await app.register(authMiddleware);

  // Health check
  await app.register(healthPlugin);

  // Auth routes under /api/v1/auth
  await app.register(authRoutes, { prefix: "/api/v1/auth" });

  return app;
}
