import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function loadConfig() {
    const mod = await import("../config.js");
    return mod.config;
  }

  // --- Default values ---

  describe("default values", () => {
    it("port defaults to 4000", async () => {
      delete process.env.PORT;
      const config = await loadConfig();
      expect(config.port).toBe(4000);
    });

    it("host defaults to 0.0.0.0", async () => {
      delete process.env.HOST;
      const config = await loadConfig();
      expect(config.host).toBe("0.0.0.0");
    });

    it("corsOrigin defaults to http://localhost:3000", async () => {
      delete process.env.CORS_ORIGIN;
      const config = await loadConfig();
      expect(config.corsOrigin).toEqual(["http://localhost:3000"]);
    });

    it("isDev is true when NODE_ENV is not production", async () => {
      process.env.NODE_ENV = "development";
      const config = await loadConfig();
      expect(config.isDev).toBe(true);
    });

    it("isDev is true when NODE_ENV is unset", async () => {
      delete process.env.NODE_ENV;
      const config = await loadConfig();
      expect(config.isDev).toBe(true);
    });

    it("jwtAccessSecret has a dev default", async () => {
      delete process.env.JWT_ACCESS_SECRET;
      const config = await loadConfig();
      expect(config.jwtAccessSecret).toBe("dev-access-secret-change-me");
    });

    it("jwtRefreshSecret has a dev default", async () => {
      delete process.env.JWT_REFRESH_SECRET;
      const config = await loadConfig();
      expect(config.jwtRefreshSecret).toBe("dev-refresh-secret-change-me");
    });

    it("jwtAccessExpiry defaults to 15m", async () => {
      delete process.env.JWT_ACCESS_EXPIRY;
      const config = await loadConfig();
      expect(config.jwtAccessExpiry).toBe("15m");
    });

    it("jwtRefreshExpiry defaults to 7d", async () => {
      delete process.env.JWT_REFRESH_EXPIRY;
      const config = await loadConfig();
      expect(config.jwtRefreshExpiry).toBe("7d");
    });

    it("cookieSecret has a dev default", async () => {
      delete process.env.COOKIE_SECRET;
      const config = await loadConfig();
      expect(config.cookieSecret).toBe("dev-cookie-secret-change-me");
    });

    it("cookieSecure defaults to false", async () => {
      delete process.env.COOKIE_SECURE;
      const config = await loadConfig();
      expect(config.cookieSecure).toBe(false);
    });

    it("cookieDomain defaults to empty string", async () => {
      delete process.env.COOKIE_DOMAIN;
      const config = await loadConfig();
      expect(config.cookieDomain).toBe("");
    });

    it("smtpHost defaults to empty string", async () => {
      delete process.env.SMTP_HOST;
      const config = await loadConfig();
      expect(config.smtpHost).toBe("");
    });

    it("smtpPort defaults to 587", async () => {
      delete process.env.SMTP_PORT;
      const config = await loadConfig();
      expect(config.smtpPort).toBe(587);
    });

    it("smtpUser defaults to empty string", async () => {
      delete process.env.SMTP_USER;
      const config = await loadConfig();
      expect(config.smtpUser).toBe("");
    });

    it("smtpPass defaults to empty string", async () => {
      delete process.env.SMTP_PASS;
      const config = await loadConfig();
      expect(config.smtpPass).toBe("");
    });

    it("companyName defaults to SearchAnyCars", async () => {
      delete process.env.COMPANY_NAME;
      const config = await loadConfig();
      expect(config.companyName).toBe("SearchAnyCars");
    });

    it("companyEmail defaults to noreply@searchanycars.com", async () => {
      delete process.env.COMPANY_EMAIL;
      const config = await loadConfig();
      expect(config.companyEmail).toBe("noreply@searchanycars.com");
    });

    it("frontendUrl defaults to http://localhost:3000", async () => {
      delete process.env.FRONTEND_URL;
      const config = await loadConfig();
      expect(config.frontendUrl).toBe("http://localhost:3000");
    });
  });

  // --- Env var overrides ---

  describe("env var overrides", () => {
    it("PORT overrides port", async () => {
      process.env.PORT = "8080";
      const config = await loadConfig();
      expect(config.port).toBe(8080);
    });

    it("HOST overrides host", async () => {
      process.env.HOST = "127.0.0.1";
      const config = await loadConfig();
      expect(config.host).toBe("127.0.0.1");
    });

    it("CORS_ORIGIN overrides corsOrigin", async () => {
      process.env.CORS_ORIGIN = "https://example.com";
      const config = await loadConfig();
      expect(config.corsOrigin).toEqual(["https://example.com"]);
    });

    it("NODE_ENV=production sets isDev to false", async () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_ACCESS_SECRET = "prod-access";
      process.env.JWT_REFRESH_SECRET = "prod-refresh";
      process.env.COOKIE_SECRET = "prod-cookie";
      process.env.CORS_ORIGIN = "https://example.com";
      const config = await loadConfig();
      expect(config.isDev).toBe(false);
    });

    it("JWT_ACCESS_SECRET overrides jwtAccessSecret", async () => {
      process.env.JWT_ACCESS_SECRET = "my-secret";
      const config = await loadConfig();
      expect(config.jwtAccessSecret).toBe("my-secret");
    });

    it("JWT_REFRESH_SECRET overrides jwtRefreshSecret", async () => {
      process.env.JWT_REFRESH_SECRET = "my-refresh";
      const config = await loadConfig();
      expect(config.jwtRefreshSecret).toBe("my-refresh");
    });

    it("COOKIE_SECURE=true sets cookieSecure to true", async () => {
      process.env.COOKIE_SECURE = "true";
      const config = await loadConfig();
      expect(config.cookieSecure).toBe(true);
    });

    it("COOKIE_SECURE=false keeps cookieSecure false", async () => {
      process.env.COOKIE_SECURE = "false";
      const config = await loadConfig();
      expect(config.cookieSecure).toBe(false);
    });

    it("SMTP_PORT overrides smtpPort", async () => {
      process.env.SMTP_PORT = "465";
      const config = await loadConfig();
      expect(config.smtpPort).toBe(465);
    });

    it("COMPANY_NAME overrides companyName", async () => {
      process.env.COMPANY_NAME = "TestCo";
      const config = await loadConfig();
      expect(config.companyName).toBe("TestCo");
    });

    it("FRONTEND_URL overrides frontendUrl", async () => {
      process.env.FRONTEND_URL = "https://prod.example.com";
      const config = await loadConfig();
      expect(config.frontendUrl).toBe("https://prod.example.com");
    });

    it("PORT as non-numeric string falls back to NaN (parseInt behavior)", async () => {
      process.env.PORT = "abc";
      const config = await loadConfig();
      expect(config.port).toBeNaN();
    });
  });

  // --- Production secret validation ---

  describe("production secret validation", () => {
    it("throws when CORS_ORIGIN is missing in production", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.CORS_ORIGIN;
      process.env.JWT_ACCESS_SECRET = "prod-access";
      process.env.JWT_REFRESH_SECRET = "prod-refresh";
      process.env.COOKIE_SECRET = "prod-cookie";
      await expect(loadConfig()).rejects.toThrow("CORS_ORIGIN");
    });

    it("throws when JWT_ACCESS_SECRET is missing in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.CORS_ORIGIN = "https://example.com";
      delete process.env.JWT_ACCESS_SECRET;
      process.env.JWT_REFRESH_SECRET = "prod-refresh";
      process.env.COOKIE_SECRET = "prod-cookie";
      await expect(loadConfig()).rejects.toThrow("JWT_ACCESS_SECRET");
    });

    it("throws when JWT_REFRESH_SECRET is missing in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.CORS_ORIGIN = "https://example.com";
      process.env.JWT_ACCESS_SECRET = "prod-access";
      delete process.env.JWT_REFRESH_SECRET;
      process.env.COOKIE_SECRET = "prod-cookie";
      await expect(loadConfig()).rejects.toThrow("JWT_REFRESH_SECRET");
    });

    it("throws when COOKIE_SECRET is missing in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.CORS_ORIGIN = "https://example.com";
      process.env.JWT_ACCESS_SECRET = "prod-access";
      process.env.JWT_REFRESH_SECRET = "prod-refresh";
      delete process.env.COOKIE_SECRET;
      await expect(loadConfig()).rejects.toThrow("COOKIE_SECRET");
    });

    it("does NOT throw when all secrets are provided in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.CORS_ORIGIN = "https://example.com";
      process.env.JWT_ACCESS_SECRET = "prod-access";
      process.env.JWT_REFRESH_SECRET = "prod-refresh";
      process.env.COOKIE_SECRET = "prod-cookie";
      const config = await loadConfig();
      expect(config.jwtAccessSecret).toBe("prod-access");
      expect(config.jwtRefreshSecret).toBe("prod-refresh");
      expect(config.cookieSecret).toBe("prod-cookie");
    });

    it("uses dev defaults when NODE_ENV is not production", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      delete process.env.COOKIE_SECRET;
      const config = await loadConfig();
      expect(config.jwtAccessSecret).toBe("dev-access-secret-change-me");
      expect(config.jwtRefreshSecret).toBe("dev-refresh-secret-change-me");
      expect(config.cookieSecret).toBe("dev-cookie-secret-change-me");
    });
  });
});
