import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "../services/authService.js";
import jwt from "jsonwebtoken";

const testUser = {
  id: 42,
  email: "test@example.com",
  role: "user",
  name: "Test User",
};

describe("authService", () => {
  // --- Password hashing ---

  describe("hashPassword", () => {
    it("returns a bcrypt hash string", () => {
      const hash = hashPassword("password123");
      expect(hash).toMatch(/^\$2[aby]?\$/);
    });

    it("produces different hashes for the same password (salted)", () => {
      const h1 = hashPassword("same");
      const h2 = hashPassword("same");
      expect(h1).not.toBe(h2);
    });

    it("hash is not the same as the plaintext", () => {
      const hash = hashPassword("mypass");
      expect(hash).not.toBe("mypass");
    });
  });

  describe("verifyPassword", () => {
    it("returns true for correct password", () => {
      const hash = hashPassword("correct");
      expect(verifyPassword("correct", hash)).toBe(true);
    });

    it("returns false for wrong password", () => {
      const hash = hashPassword("correct");
      expect(verifyPassword("wrong", hash)).toBe(false);
    });

    it("returns false for empty string against a hash", () => {
      const hash = hashPassword("notempty");
      expect(verifyPassword("", hash)).toBe(false);
    });

    it("works with special characters", () => {
      const pass = "p@$$w0rd!#%^&*()";
      const hash = hashPassword(pass);
      expect(verifyPassword(pass, hash)).toBe(true);
    });

    it("works with unicode characters", () => {
      const pass = "passwort-\u00fc\u00f6\u00e4";
      const hash = hashPassword(pass);
      expect(verifyPassword(pass, hash)).toBe(true);
    });
  });

  // --- JWT access tokens ---

  describe("generateAccessToken", () => {
    it("returns a string", () => {
      const token = generateAccessToken(testUser);
      expect(typeof token).toBe("string");
    });

    it("token contains three dot-separated parts", () => {
      const token = generateAccessToken(testUser);
      expect(token.split(".")).toHaveLength(3);
    });

    it("token payload contains user id, email, role, name", () => {
      const token = generateAccessToken(testUser);
      const decoded = jwt.decode(token) as any;
      expect(decoded.id).toBe(42);
      expect(decoded.email).toBe("test@example.com");
      expect(decoded.role).toBe("user");
      expect(decoded.name).toBe("Test User");
    });

    it("token has exp claim", () => {
      const token = generateAccessToken(testUser);
      const decoded = jwt.decode(token) as any;
      expect(decoded.exp).toBeDefined();
    });

    it("token expiry is approximately 15 minutes from now", () => {
      const token = generateAccessToken(testUser);
      const decoded = jwt.decode(token) as any;
      const now = Math.floor(Date.now() / 1000);
      const diff = decoded.exp - now;
      // Should be close to 900 seconds (15 min), allow 5 sec tolerance
      expect(diff).toBeGreaterThan(890);
      expect(diff).toBeLessThanOrEqual(905);
    });
  });

  describe("generateRefreshToken", () => {
    it("returns a string", () => {
      const token = generateRefreshToken({ id: 1 });
      expect(typeof token).toBe("string");
    });

    it("token payload contains id and type=refresh", () => {
      const token = generateRefreshToken({ id: 99 });
      const decoded = jwt.decode(token) as any;
      expect(decoded.id).toBe(99);
      expect(decoded.type).toBe("refresh");
    });

    it("token does not contain email or role", () => {
      const token = generateRefreshToken({ id: 1 });
      const decoded = jwt.decode(token) as any;
      expect(decoded.email).toBeUndefined();
      expect(decoded.role).toBeUndefined();
    });

    it("token expiry is approximately 7 days from now", () => {
      const token = generateRefreshToken({ id: 1 });
      const decoded = jwt.decode(token) as any;
      const now = Math.floor(Date.now() / 1000);
      const diff = decoded.exp - now;
      const sevenDays = 7 * 24 * 60 * 60;
      expect(diff).toBeGreaterThan(sevenDays - 10);
      expect(diff).toBeLessThanOrEqual(sevenDays + 5);
    });
  });

  // --- Token verification ---

  describe("verifyAccessToken", () => {
    it("returns payload for a valid token", () => {
      const token = generateAccessToken(testUser);
      const payload = verifyAccessToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.id).toBe(42);
      expect(payload!.email).toBe("test@example.com");
    });

    it("returns null for a tampered token", () => {
      const token = generateAccessToken(testUser);
      const tampered = token.slice(0, -5) + "XXXXX";
      expect(verifyAccessToken(tampered)).toBeNull();
    });

    it("returns null for an empty string", () => {
      expect(verifyAccessToken("")).toBeNull();
    });

    it("returns null for garbage string", () => {
      expect(verifyAccessToken("not.a.token")).toBeNull();
    });

    it("returns null for a token signed with wrong secret", () => {
      const token = jwt.sign(
        { id: 1, email: "a@b.c", role: "user", name: "A" },
        "wrong-secret",
        { expiresIn: 900 }
      );
      expect(verifyAccessToken(token)).toBeNull();
    });

    it("returns null for a refresh token (wrong secret)", () => {
      const token = generateRefreshToken({ id: 1 });
      // Refresh token is signed with jwtRefreshSecret, verifyAccessToken uses jwtAccessSecret
      // These are different default values, so it should fail
      expect(verifyAccessToken(token)).toBeNull();
    });
  });

  describe("verifyRefreshToken", () => {
    it("returns payload for a valid refresh token", () => {
      const token = generateRefreshToken({ id: 7 });
      const payload = verifyRefreshToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.id).toBe(7);
      expect(payload!.type).toBe("refresh");
    });

    it("returns null for a tampered token", () => {
      const token = generateRefreshToken({ id: 1 });
      const tampered = token.slice(0, -3) + "ZZZ";
      expect(verifyRefreshToken(tampered)).toBeNull();
    });

    it("returns null for an access token (wrong secret)", () => {
      const token = generateAccessToken(testUser);
      expect(verifyRefreshToken(token)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(verifyRefreshToken("")).toBeNull();
    });
  });

  // --- Cookies ---

  describe("setAuthCookies", () => {
    it("calls reply.setCookie twice", () => {
      const reply: any = { setCookie: vi.fn() };
      setAuthCookies(reply, "access-tok", "refresh-tok");
      expect(reply.setCookie).toHaveBeenCalledTimes(2);
    });

    it("sets access_token cookie with correct name and value", () => {
      const reply: any = { setCookie: vi.fn() };
      setAuthCookies(reply, "my-access", "my-refresh");
      expect(reply.setCookie).toHaveBeenCalledWith(
        "access_token",
        "my-access",
        expect.objectContaining({
          httpOnly: true,
          path: "/",
          maxAge: 15 * 60,
        })
      );
    });

    it("sets refresh_token cookie with correct name and value", () => {
      const reply: any = { setCookie: vi.fn() };
      setAuthCookies(reply, "my-access", "my-refresh");
      expect(reply.setCookie).toHaveBeenCalledWith(
        "refresh_token",
        "my-refresh",
        expect.objectContaining({
          httpOnly: true,
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        })
      );
    });

    it("sets sameSite to lax", () => {
      const reply: any = { setCookie: vi.fn() };
      setAuthCookies(reply, "a", "b");
      const opts = reply.setCookie.mock.calls[0][2];
      expect(opts.sameSite).toBe("lax");
    });
  });

  describe("clearAuthCookies", () => {
    it("calls reply.clearCookie twice", () => {
      const reply: any = { clearCookie: vi.fn() };
      clearAuthCookies(reply);
      expect(reply.clearCookie).toHaveBeenCalledTimes(2);
    });

    it("clears access_token cookie", () => {
      const reply: any = { clearCookie: vi.fn() };
      clearAuthCookies(reply);
      expect(reply.clearCookie).toHaveBeenCalledWith(
        "access_token",
        expect.objectContaining({ httpOnly: true, path: "/" })
      );
    });

    it("clears refresh_token cookie", () => {
      const reply: any = { clearCookie: vi.fn() };
      clearAuthCookies(reply);
      expect(reply.clearCookie).toHaveBeenCalledWith(
        "refresh_token",
        expect.objectContaining({ httpOnly: true, path: "/" })
      );
    });
  });
});
