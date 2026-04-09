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
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(s => s.trim()),
  isDev: process.env.NODE_ENV !== "production",
  rateLimitMax: parseInt(
    process.env.RATE_LIMIT_MAX ||
      (process.env.NODE_ENV === "test" ? "5000" : process.env.NODE_ENV !== "production" ? "200" : "100"),
    10
  ),
  rateLimitTimeWindow: process.env.RATE_LIMIT_TIME_WINDOW || "1 minute",

  // JWT
  jwtAccessSecret: requireSecret("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: requireSecret("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
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
