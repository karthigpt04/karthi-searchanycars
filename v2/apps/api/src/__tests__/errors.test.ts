import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError, z } from "zod";
import { AppError, globalErrorHandler } from "../errors.js";

function createMockReply() {
  const reply: any = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    log: { error: vi.fn() },
  };
  return reply;
}

function createMockRequest(): any {
  return {};
}

describe("AppError", () => {
  it("should be an instance of Error", () => {
    const err = new AppError("test", 400);
    expect(err).toBeInstanceOf(Error);
  });

  it("should be an instance of AppError", () => {
    const err = new AppError("test", 400);
    expect(err).toBeInstanceOf(AppError);
  });

  it("should set message correctly", () => {
    const err = new AppError("Something went wrong", 500);
    expect(err.message).toBe("Something went wrong");
  });

  it("should set statusCode correctly", () => {
    const err = new AppError("Not found", 404);
    expect(err.statusCode).toBe(404);
  });

  it("should set name to AppError", () => {
    const err = new AppError("test", 400);
    expect(err.name).toBe("AppError");
  });

  it("should have a stack trace", () => {
    const err = new AppError("test", 400);
    expect(err.stack).toBeDefined();
  });

  it("supports various status codes", () => {
    expect(new AppError("a", 401).statusCode).toBe(401);
    expect(new AppError("b", 403).statusCode).toBe(403);
    expect(new AppError("c", 409).statusCode).toBe(409);
    expect(new AppError("d", 422).statusCode).toBe(422);
  });
});

describe("globalErrorHandler", () => {
  let reply: any;
  let request: any;

  beforeEach(() => {
    reply = createMockReply();
    request = createMockRequest();
  });

  describe("ZodError handling", () => {
    it("returns 400 for ZodError", () => {
      const schema = z.object({ email: z.string().email() });
      let zodErr: ZodError;
      try {
        schema.parse({ email: "bad" });
      } catch (e) {
        zodErr = e as ZodError;
      }
      globalErrorHandler(zodErr!, request, reply);
      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it("sends 'Validation error' message for ZodError", () => {
      const schema = z.object({ name: z.string().min(1) });
      let zodErr: ZodError;
      try {
        schema.parse({ name: "" });
      } catch (e) {
        zodErr = e as ZodError;
      }
      globalErrorHandler(zodErr!, request, reply);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Validation error" })
      );
    });

    it("includes flattened fieldErrors for ZodError", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });
      let zodErr: ZodError;
      try {
        schema.parse({ email: "bad", age: 5 });
      } catch (e) {
        zodErr = e as ZodError;
      }
      globalErrorHandler(zodErr!, request, reply);
      const sent = reply.send.mock.calls[0][0];
      expect(sent.errors).toBeDefined();
      expect(sent.errors.email).toBeDefined();
      expect(sent.errors.age).toBeDefined();
    });
  });

  describe("AppError handling", () => {
    it("returns the statusCode from AppError", () => {
      const err = new AppError("Unauthorized", 401);
      globalErrorHandler(err, request, reply);
      expect(reply.status).toHaveBeenCalledWith(401);
    });

    it("sends the AppError message", () => {
      const err = new AppError("Not found", 404);
      globalErrorHandler(err, request, reply);
      expect(reply.send).toHaveBeenCalledWith({ message: "Not found" });
    });

    it("handles 403 Forbidden AppError", () => {
      const err = new AppError("Forbidden", 403);
      globalErrorHandler(err, request, reply);
      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({ message: "Forbidden" });
    });

    it("handles 409 Conflict AppError", () => {
      const err = new AppError("Already exists", 409);
      globalErrorHandler(err, request, reply);
      expect(reply.status).toHaveBeenCalledWith(409);
    });
  });

  describe("rate limit errors", () => {
    it("returns 429 for rate limit errors", () => {
      const err: any = new Error("rate limited");
      err.statusCode = 429;
      globalErrorHandler(err, request, reply);
      expect(reply.status).toHaveBeenCalledWith(429);
    });

    it("sends rate limit message", () => {
      const err: any = new Error("rate limited");
      err.statusCode = 429;
      globalErrorHandler(err, request, reply);
      expect(reply.send).toHaveBeenCalledWith({
        message: "Too many requests, please try again later.",
      });
    });
  });

  describe("Fastify validation errors", () => {
    it("returns 400 for Fastify validation errors", () => {
      const err: any = new Error("validation");
      err.statusCode = 400;
      err.validation = [{ keyword: "required", params: { missingProperty: "name" } }];
      globalErrorHandler(err, request, reply);
      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it("sends Fastify validation array in errors field", () => {
      const validationArr = [{ keyword: "type", dataPath: ".age" }];
      const err: any = new Error("validation");
      err.statusCode = 400;
      err.validation = validationArr;
      globalErrorHandler(err, request, reply);
      expect(reply.send).toHaveBeenCalledWith({
        message: "Validation error",
        errors: validationArr,
      });
    });
  });

  describe("unknown errors", () => {
    it("returns 500 for unknown errors without statusCode", () => {
      const err = new Error("something broke");
      globalErrorHandler(err, request, reply);
      expect(reply.status).toHaveBeenCalledWith(500);
    });

    it("hides error message in production", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const err = new Error("secret info");
      globalErrorHandler(err, request, reply);
      expect(reply.send).toHaveBeenCalledWith({
        message: "Internal server error",
      });
      process.env.NODE_ENV = origEnv;
    });

    it("shows error message in non-production", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      const err = new Error("debug info");
      globalErrorHandler(err, request, reply);
      expect(reply.send).toHaveBeenCalledWith({
        message: "debug info",
      });
      process.env.NODE_ENV = origEnv;
    });

    it("logs the error via reply.log.error", () => {
      const err = new Error("unexpected");
      globalErrorHandler(err, request, reply);
      expect(reply.log.error).toHaveBeenCalledWith(err);
    });

    it("uses statusCode from error if >= 400", () => {
      const err: any = new Error("gateway timeout");
      err.statusCode = 504;
      globalErrorHandler(err, request, reply);
      expect(reply.status).toHaveBeenCalledWith(504);
    });

    it("falls back to 500 if statusCode < 400", () => {
      const err: any = new Error("weird");
      err.statusCode = 200;
      globalErrorHandler(err, request, reply);
      expect(reply.status).toHaveBeenCalledWith(500);
    });
  });
});
