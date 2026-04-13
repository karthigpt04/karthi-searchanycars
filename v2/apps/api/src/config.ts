const isProduction = process.env.NODE_ENV === "production";

function requireSecret(envVar: string, devDefault: string): string {
  const value = process.env[envVar];
  if (value) return value;
  if (isProduction) {
    throw new Error(
      `FATAL: Missing required environment variable ${envVar}. ` +
        `The application cannot start in production without it.`,
    );
  }
  return devDefault;
}

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  host: process.env.HOST || "0.0.0.0",
  corsOrigin: (() => {
    const raw = process.env.CORS_ORIGIN;
    if ((!raw || raw.trim() === "") && isProduction) {
      throw new Error(
        "FATAL: CORS_ORIGIN environment variable is required in production. " +
        "Set it to your frontend domain(s), e.g. CORS_ORIGIN=https://searchanycars.com"
      );
    }
    return (raw || "http://localhost:3000").split(",").map(s => s.trim());
  })(),
  isDev: process.env.NODE_ENV !== "production",
  rateLimitMax: parseInt(
    process.env.RATE_LIMIT_MAX ||
      (process.env.NODE_ENV === "test" ? "5000" : process.env.NODE_ENV !== "production" ? "200" : "100"),
    10
  ),
  rateLimitTimeWindow: process.env.RATE_LIMIT_TIME_WINDOW || "1 minute",

  // ── Per-route auth rate limit tiers ──────────────────────────────
  authRateLimit: {
    /** Strict: login, register, reset-password */
    strict: {
      max: parseInt(
        process.env.AUTH_RATE_LIMIT_STRICT_MAX ||
          (process.env.NODE_ENV === "test" ? "5000" : isProduction ? "5" : "20"),
        10
      ),
      timeWindow: process.env.AUTH_RATE_LIMIT_STRICT_WINDOW || "1 minute",
    },
    /** Tightest: forgot-password (triggers email sends) */
    strictEmail: {
      max: parseInt(
        process.env.AUTH_RATE_LIMIT_STRICT_EMAIL_MAX ||
          (process.env.NODE_ENV === "test" ? "5000" : isProduction ? "3" : "20"),
        10
      ),
      timeWindow: process.env.AUTH_RATE_LIMIT_STRICT_EMAIL_WINDOW || "1 minute",
    },
    /** Moderate: change-password, refresh */
    moderate: {
      max: parseInt(
        process.env.AUTH_RATE_LIMIT_MODERATE_MAX ||
          (process.env.NODE_ENV === "test" ? "5000" : isProduction ? "10" : "50"),
        10
      ),
      timeWindow: process.env.AUTH_RATE_LIMIT_MODERATE_WINDOW || "1 minute",
    },
  },

  // Account lockout
  accountLockout: {
    maxAttempts: parseInt(process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS || "5", 10),
    lockDurationMs: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || "15", 10) * 60 * 1000,
  },

  // JWT
  jwtAccessSecret: requireSecret("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: requireSecret("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  jwtAccessSecretPrevious: process.env.JWT_ACCESS_SECRET_PREVIOUS || "",
  jwtRefreshSecretPrevious: process.env.JWT_REFRESH_SECRET_PREVIOUS || "",
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",

  // Cookies
  cookieSecret: requireSecret("COOKIE_SECRET", "dev-cookie-secret-change-me"),
  cookieSecure: process.env.COOKIE_SECURE === "true" || isProduction,
  cookieDomain: process.env.COOKIE_DOMAIN || "",

  // SMTP (optional — gracefully skipped if not set)
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  companyName: process.env.COMPANY_NAME || "SearchAnyCars",
  companyEmail: process.env.COMPANY_EMAIL || "noreply@searchanycars.com",

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};
