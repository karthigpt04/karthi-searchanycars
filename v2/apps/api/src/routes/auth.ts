import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, users, passwordResetTokens } from "@searchanycars/db";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@searchanycars/shared";
import {
  hashPassword,
  verifyPassword,
  DUMMY_HASH,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "../services/authService.js";
import {
  createSession,
  findSession,
  deleteSession,
  softDeleteSession,
  deleteAllUserSessions,
} from "../services/sessionService.js";
import { sendPasswordResetEmail } from "../services/emailService.js";
import { requireAuth, requireAdmin } from "../plugins/auth.js";
import { config } from "../config.js";
import { AppError } from "../errors.js";

export async function authRoutes(app: FastifyInstance) {
  // ─── Register ───────────────────────────────────────────────────
  app.post("/register", {
    config: { rateLimit: config.authRateLimit.strict },
  }, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Run DB check and password hashing in parallel to prevent timing-based
    // enumeration (both paths now include bcrypt work).
    const [existing, hash] = await Promise.all([
      db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1),
      hashPassword(body.password),
    ]);

    if (existing.length > 0) {
      throw new AppError("Email already registered", 409);
    }

    const [inserted] = await db
      .insert(users)
      .values({
        email: body.email,
        name: body.name,
        passwordHash: hash,
        role: "user",
        emailVerified: true,
      })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

    const accessToken = generateAccessToken({
      id: inserted.id,
      email: inserted.email!,
      role: inserted.role,
      name: inserted.name,
    });
    const refreshToken = generateRefreshToken(inserted);
    await createSession(
      inserted.id,
      refreshToken,
      request.ip,
      request.headers["user-agent"] || ""
    );
    setAuthCookies(reply, accessToken, refreshToken);

    return reply.status(201).send({
      user: { id: inserted.id, email: inserted.email, name: inserted.name, role: inserted.role },
      accessToken,
      refreshToken,
    });
  });

  // ─── Login ──────────────────────────────────────────────────────
  app.post("/login", {
    config: { rateLimit: config.authRateLimit.strict },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    const user = rows[0];

    // Always run bcrypt.compare to prevent timing-based email enumeration.
    // If user doesn't exist or has no password, compare against DUMMY_HASH.
    const hashToVerify = user?.passwordHash || DUMMY_HASH;
    const passwordValid = await verifyPassword(body.password, hashToVerify);

    if (!user || !user.passwordHash || !passwordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email!,
      role: user.role,
      name: user.name,
    });
    const refreshToken = generateRefreshToken(user);
    await createSession(
      user.id,
      refreshToken,
      request.ip,
      request.headers["user-agent"] || ""
    );
    setAuthCookies(reply, accessToken, refreshToken);

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
      refreshToken,
    });
  });

  // ─── Refresh token ──────────────────────────────────────────────
  app.post("/refresh", {
    config: { rateLimit: config.authRateLimit.moderate },
  }, async (request, reply) => {
    // Try cookie first, then body
    const token =
      request.cookies?.refresh_token ||
      (request.body as { refreshToken?: string })?.refreshToken;

    if (!token) {
      throw new AppError("No refresh token", 401);
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
      throw new AppError("Invalid refresh token", 401);
    }

    const session = await findSession(token);
    if (!session) {
      throw new AppError("Session expired", 401);
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.id))
      .limit(1);
    const user = rows[0];
    if (!user) {
      throw new AppError("User not found", 401);
    }

    // Rotate refresh token (soft-delete with grace period for concurrent requests)
    await softDeleteSession(token, 10_000);
    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email!,
      role: user.role,
      name: user.name,
    });
    const newRefreshToken = generateRefreshToken(user);
    await createSession(
      user.id,
      newRefreshToken,
      request.ip,
      request.headers["user-agent"] || ""
    );
    setAuthCookies(reply, newAccessToken, newRefreshToken);

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  });

  // ─── Logout ─────────────────────────────────────────────────────
  app.post("/logout", async (request, reply) => {
    const token = request.cookies?.refresh_token;
    if (token) {
      await deleteSession(token);
    }
    clearAuthCookies(reply);
    return reply.status(204).send();
  });

  // ─── Get current user ──────────────────────────────────────────
  app.get("/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        phoneVerified: users.phoneVerified,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, request.user!.id))
      .limit(1);

    if (rows.length === 0) {
      throw new AppError("User not found", 404);
    }

    return reply.send({ user: rows[0] });
  });

  // ─── Forgot password ───────────────────────────────────────────
  app.post("/forgot-password", {
    config: { rateLimit: config.authRateLimit.strictEmail },
  }, async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);

    // Send the response immediately to prevent timing-based email enumeration.
    // The actual DB lookup and email send happen in the background.
    const successMessage = "If that email exists, a reset link has been sent.";

    // Fire background processing — do NOT await
    processForgotPassword(body.email, request.log).catch(() => {});

    return reply.send({ message: successMessage });
  });

  // ─── Reset password ────────────────────────────────────────────
  app.post("/reset-password", {
    config: { rateLimit: config.authRateLimit.strict },
  }, async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);

    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, body.token))
      .limit(1);
    const resetRecord = rows[0];

    if (!resetRecord || resetRecord.used) {
      throw new AppError("Invalid or expired reset link", 400);
    }

    if (resetRecord.expiresAt < new Date()) {
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, resetRecord.id));
      throw new AppError(
        "Reset link has expired. Please request a new one.",
        400
      );
    }

    const hash = await hashPassword(body.password);
    await db
      .update(users)
      .set({ passwordHash: hash, updatedAt: new Date() })
      .where(eq(users.id, resetRecord.userId));
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, resetRecord.id));

    // Invalidate all sessions
    await deleteAllUserSessions(resetRecord.userId);

    return reply.send({
      message:
        "Password has been reset successfully. Please log in with your new password.",
    });
  });

  // ─── Change password ───────────────────────────────────────────
  app.post(
    "/change-password",
    { preHandler: [requireAuth], config: { rateLimit: config.authRateLimit.moderate } },
    async (request, reply) => {
      const body = changePasswordSchema.parse(request.body);

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, request.user!.id))
        .limit(1);
      const user = rows[0];

      if (!user) {
        throw new AppError("User not found", 404);
      }
      // Use DUMMY_HASH when passwordHash is null to prevent timing side-channel
      const currentHashToVerify = user.passwordHash || DUMMY_HASH;
      const currentPasswordValid = await verifyPassword(body.currentPassword, currentHashToVerify);
      if (!user.passwordHash || !currentPasswordValid) {
        throw new AppError("Current password is incorrect", 401);
      }

      const hash = await hashPassword(body.newPassword);
      await db
        .update(users)
        .set({ passwordHash: hash, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      return reply.send({ message: "Password changed successfully" });
    }
  );

  // ─── Admin: create user ────────────────────────────────────────
  app.post(
    "/users",
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      const body = registerSchema.parse(request.body);
      const roleInput = (request.body as { role?: string }).role;
      const role = roleInput === "admin" ? "admin" : "user";

      // Run DB check and password hashing in parallel to prevent timing side-channel
      const [existing, hash] = await Promise.all([
        db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, body.email))
          .limit(1),
        hashPassword(body.password),
      ]);

      if (existing.length > 0) {
        throw new AppError("Email already registered", 409);
      }

      const [inserted] = await db
        .insert(users)
        .values({
          email: body.email,
          name: body.name,
          passwordHash: hash,
          role,
          emailVerified: true,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        });

      return reply.status(201).send({ user: inserted });
    }
  );

  // ─── Admin: list users ─────────────────────────────────────────
  app.get(
    "/users",
    { preHandler: [requireAdmin] },
    async (_request, reply) => {
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          phone: users.phone,
          avatarUrl: users.avatarUrl,
          emailVerified: users.emailVerified,
          phoneVerified: users.phoneVerified,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.createdAt);

      return reply.send(allUsers);
    }
  );

  // ─── Admin: delete user ────────────────────────────────────────
  app.delete(
    "/users/:id",
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      const userId = Number((request.params as { id: string }).id);
      if (userId === request.user!.id) {
        throw new AppError("Cannot delete yourself", 400);
      }

      await deleteAllUserSessions(userId);
      await db.delete(users).where(eq(users.id, userId));

      return reply.status(204).send();
    }
  );

  // ─── Admin: update user ────────────────────────────────────────
  app.put(
    "/users/:id",
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      const userId = Number((request.params as { id: string }).id);
      const { name, role, password } = request.body as {
        name?: string;
        role?: string;
        password?: string;
      };

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (rows.length === 0) {
        throw new AppError("User not found", 404);
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (role && ["admin", "user"].includes(role)) updates.role = role;
      if (password && password.length >= 6) {
        updates.passwordHash = await hashPassword(password);
      }

      await db.update(users).set(updates).where(eq(users.id, userId));

      const [updated] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, userId));

      return reply.send({ user: updated });
    }
  );
}

/**
 * Background processor for forgot-password requests.
 * Runs after the HTTP response is already sent, so timing cannot leak user existence.
 */
async function processForgotPassword(
  email: string,
  log: { error: (obj: unknown, msg: string) => void }
): Promise<void> {
  try {
    const rows = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0];

    if (!user) return;

    // Invalidate existing tokens
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.userId, user.id));

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db
      .insert(passwordResetTokens)
      .values({ userId: user.id, token, expiresAt });

    await sendPasswordResetEmail(user.email!, token);
  } catch (err) {
    log.error(err, "Background forgot-password processing failed");
  }
}
