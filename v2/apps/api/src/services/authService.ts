import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { FastifyReply } from "fastify";
import { config } from "../config.js";

const SALT_ROUNDS = 12;

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
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as RefreshPayload;
  } catch {
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
