import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { FastifyReply } from "fastify";
import { config } from "../config.js";

const SALT_ROUNDS = 12;

/**
 * Pre-computed bcrypt hash for timing-attack mitigation.
 * When a user is not found (or has no passwordHash), we still run
 * bcrypt.compare against this dummy hash so that response time is
 * indistinguishable from a real password check.
 *
 * Generated with SALT_ROUNDS = 12. If you change SALT_ROUNDS, regenerate:
 *   node -e "require('bcryptjs').hash('dummy', 12, (_, h) => console.log(h))"
 */
export const DUMMY_HASH =
  "$2b$12$ivrxeHO3VC5k4V6dFGZF2O.dbxUuwSNlo8VxXOk8f/9FGOqtwTq6G";

// Validate DUMMY_HASH cost factor matches SALT_ROUNDS at module load
const _dummyCost = parseInt(DUMMY_HASH.split("$")[2], 10);
if (_dummyCost !== SALT_ROUNDS) {
  throw new Error(
    `DUMMY_HASH cost factor (${_dummyCost}) does not match SALT_ROUNDS (${SALT_ROUNDS}). Regenerate DUMMY_HASH.`
  );
}

// Access: 15 minutes, Refresh: 7 days (in seconds)
const ACCESS_EXPIRY_SECONDS = 15 * 60;
const REFRESH_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
  name: string;
}

export interface RefreshPayload {
  id: number;
  type: "refresh";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * SHA-256 hash for high-entropy tokens (password reset, email verification).
 * NOT for passwords — bcrypt handles those. SHA-256 is appropriate here because
 * the input is 256 bits of crypto.randomBytes, immune to dictionary attacks.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateAccessToken(user: {
  id: number;
  email: string;
  role: string;
  name: string;
}): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtAccessSecret,
    { expiresIn: ACCESS_EXPIRY_SECONDS } satisfies SignOptions
  );
}

export function generateRefreshToken(user: { id: number }): string {
  return jwt.sign(
    { id: user.id, type: "refresh" },
    config.jwtRefreshSecret,
    { expiresIn: REFRESH_EXPIRY_SECONDS } satisfies SignOptions
  );
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtAccessSecret) as TokenPayload;
  } catch {
    if (config.jwtAccessSecretPrevious) {
      try {
        return jwt.verify(token, config.jwtAccessSecretPrevious) as TokenPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as RefreshPayload;
  } catch {
    if (config.jwtRefreshSecretPrevious) {
      try {
        return jwt.verify(token, config.jwtRefreshSecretPrevious) as RefreshPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string
): void {
  const base = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  };

  reply.setCookie("access_token", accessToken, {
    ...base,
    maxAge: 15 * 60, // 15 minutes in seconds
  });
  reply.setCookie("refresh_token", refreshToken, {
    ...base,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  const base = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };
  reply.clearCookie("access_token", base);
  reply.clearCookie("refresh_token", base);
}
