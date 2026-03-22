import 'dotenv/config'

const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') !== 'production',
  databasePath: process.env.DATABASE_PATH || './searchanycars.db',
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  maxImageSize: Number(process.env.MAX_IMAGE_SIZE_BYTES || 6 * 1024 * 1024),

  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production-32chars!',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production-32chars!',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Admin
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'admin123',
  adminDefaultEmail: process.env.ADMIN_DEFAULT_EMAIL || 'admin@searchanycars.com',

  // Cookies
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  // Email (company email for sending password reset emails)
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || 'karthigpt04@gmail.com',
  smtpPass: process.env.SMTP_PASS || '',
  companyEmail: process.env.COMPANY_EMAIL || 'karthigpt04@gmail.com',
  companyName: process.env.COMPANY_NAME || 'SearchAnyCars',
  frontendUrl: process.env.FRONTEND_URL || (process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'),

  // CSRF
  csrfSecret: process.env.CSRF_SECRET || 'dev-csrf-secret-change-in-prod-32!',

  // Rate limiting
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || ((process.env.NODE_ENV || 'development') !== 'production' ? 1000 : 200)),
}

export default config
