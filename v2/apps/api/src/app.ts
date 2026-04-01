import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { healthPlugin } from "./plugins/health.js";

export async function buildApp() {
  const app = Fastify({
    logger: config.isDev
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : true,
  });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(healthPlugin);

  return app;
}
