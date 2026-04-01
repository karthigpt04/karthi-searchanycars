import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export function globalErrorHandler(
  error: Error,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Validation error",
      errors: error.flatten().fieldErrors,
    });
  }

  // Our AppError instances
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  // Fastify errors (rate limit, validation, etc.)
  const fastifyError = error as FastifyError;
  const statusCode = fastifyError.statusCode ?? 500;

  if (statusCode === 429) {
    return reply
      .status(429)
      .send({ message: "Too many requests, please try again later." });
  }

  if (fastifyError.validation) {
    return reply.status(400).send({
      message: "Validation error",
      errors: fastifyError.validation,
    });
  }

  // Unexpected errors — don't leak details in production
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message;

  reply.log.error(error);
  return reply.status(statusCode >= 400 ? statusCode : 500).send({ message });
}
