import "dotenv/config";
import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import helmet from "@fastify/helmet";
import { config } from "./config.js";
import { healthPlugin } from "./plugins/health.js";
import { authMiddleware } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { listingRoutes } from "./routes/listings.js";
import { categoryRoutes } from "./routes/categories.js";
import { filterRoutes } from "./routes/filters.js";
import { uploadRoutes } from "./routes/uploads.js";
import { siteConfigRoutes } from "./routes/site-config.js";
import { favoriteRoutes } from "./routes/favorites.js";
import { bookingRoutes } from "./routes/bookings.js";
import { adminBookingRoutes } from "./routes/admin-bookings.js";
import { globalErrorHandler } from "./errors.js";
import { csrfProtection } from "./plugins/csrf.js";

export async function buildApp() {
  const app = Fastify({
    logger: config.isDev
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : true,
  });

  // Global error handler
  app.setErrorHandler(globalErrorHandler);

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    ...(config.isDev
      ? { hsts: false }
      : { hsts: { maxAge: 63072000, includeSubDomains: true, preload: true } }),
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  });

  // CORS — credentials: true for cookies
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-protection"],
  });

  // CSRF protection — require custom header on all mutating requests
  await app.register(csrfProtection);

  // Cookies
  await app.register(cookie, {
    secret: config.cookieSecret,
  });

  // Multipart (file uploads)
  await app.register(multipart, {
    limits: { fileSize: 6 * 1024 * 1024 },
  });

  // Static file serving for uploads
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), "uploads"),
    prefix: "/uploads/",
    decorateReply: false,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitTimeWindow,
  });

  // Auth middleware (decorates request.user)
  await app.register(authMiddleware);

  // Health check
  await app.register(healthPlugin);

  // Routes
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(listingRoutes, { prefix: "/api/v1/listings" });
  await app.register(categoryRoutes, { prefix: "/api/v1/categories" });
  await app.register(filterRoutes, { prefix: "/api/v1/filters" });
  await app.register(uploadRoutes, { prefix: "/api/v1/uploads" });
  await app.register(siteConfigRoutes, { prefix: "/api/v1/site-config" });
  await app.register(favoriteRoutes, { prefix: "/api/v1/favorites" });
  await app.register(bookingRoutes, { prefix: "/api/v1/bookings" });
  await app.register(adminBookingRoutes, { prefix: "/api/v1/admin/bookings" });

  return app;
}
