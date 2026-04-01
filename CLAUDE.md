# CLAUDE.md — Step 03: Fastify API Core + Authentication

## Project context

You are continuing the **SearchAnyCars.com v2** rebuild. Steps 01 (monorepo) and 02 (database schema) are complete. The Drizzle schema and Zod schemas are ready in `v2/packages/db` and `v2/packages/shared`. The old codebase at `/searchanycars.com/` is READ-ONLY reference.

This step builds the **Fastify API server core** and the **complete auth system**. After this step, you will have a running API with user registration, login, token refresh, logout, password reset, and admin user management — all validated with Zod schemas.

---

## Reference: Old auth implementation

Read these files from the old codebase to understand the auth patterns to replicate:
- `/searchanycars.com/server/routes/auth.js` — all auth endpoints (register, login, refresh, logout, forgot/reset password, change password, admin CRUD users)
- `/searchanycars.com/server/services/authService.js` — JWT generation, bcrypt hashing, cookie management
- `/searchanycars.com/server/services/sessionService.js` — session CRUD in database
- `/searchanycars.com/server/services/emailService.js` — password reset + booking confirmation emails via nodemailer
- `/searchanycars.com/server/middleware/auth.js` — extractUser, requireAuth, requireAdmin middleware
- `/searchanycars.com/server/middleware/security.js` — CORS, rate limiting, helmet config
- `/searchanycars.com/server/config.js` — all configuration values and env vars

Replicate the same functionality but with these improvements:
1. **Dual auth**: cookie for web + Bearer token header for mobile (the old code only used cookies)
2. **Zod validation**: use schemas from `@searchanycars/shared` for all request bodies
3. **Fastify plugins**: each feature is a Fastify plugin, not Express middleware
4. **Type safety**: full TypeScript, no `any` types

---

## What you are building in this step

All changes go in `v2/apps/api/`. The packages/db and packages/shared from step 02 are consumed via workspace imports.

### API features:
1. **Server core**: Fastify with structured plugin registration, error handling, request logging
2. **Auth middleware**: extract user from cookie OR Bearer header, requireAuth, requireAdmin decorators
3. **Auth routes** (all under `/api/v1/auth/`):
   - POST `/register` — create user, issue tokens
   - POST `/login` — verify credentials, issue tokens
   - POST `/refresh` — rotate refresh token
   - POST `/logout` — clear tokens and session
   - GET `/me` — get current user profile
   - POST `/forgot-password` — send reset email
   - POST `/reset-password` — validate token, set new password
   - POST `/change-password` — logged-in password change
   - GET `/users` — admin: list all users
   - POST `/users` — admin: create user
   - PUT `/users/:id` — admin: update user
   - DELETE `/users/:id` — admin: delete user
4. **Email service**: nodemailer for password reset and booking confirmation emails
5. **Rate limiting**: strict on auth endpoints (20 req/15min in production), relaxed global (200 req/15min)
6. **CORS**: strict origin whitelist from env var

---

## Success criteria

1. The API starts with `cd v2/apps/api && pnpm dev` on port 4000
2. POST `/api/v1/auth/register` with `{ email, password, name }` creates a user and returns user object + sets httpOnly cookies
3. POST `/api/v1/auth/login` with `{ email, password }` returns user + sets cookies
4. GET `/api/v1/auth/me` with cookie OR `Authorization: Bearer <token>` returns the user
5. POST `/api/v1/auth/refresh` rotates tokens correctly
6. POST `/api/v1/auth/logout` clears cookies and session
7. POST `/api/v1/auth/forgot-password` generates a reset token in the database (email sending can be fire-and-forget with error logging if SMTP is not configured)
8. POST `/api/v1/auth/change-password` works for logged-in users
9. Admin routes (GET/POST/PUT/DELETE `/api/v1/auth/users`) are protected by admin role check
10. Invalid request bodies are rejected with Zod validation errors (400 status)
11. `cd v2 && pnpm build` passes with zero errors
12. `/searchanycars.com/` is untouched

---

## File structure to create

```
v2/apps/api/src/
├── index.ts                    # Entry point (already exists from step 01)
├── app.ts                      # App factory (MODIFY — register all plugins)
├── config.ts                   # Config (MODIFY — add auth/db/email env vars)
├── plugins/
│   ├── health.ts               # Health check (already exists)
│   ├── auth.ts                 # Auth middleware plugin (extractUser, requireAuth, requireAdmin)
│   └── rate-limit.ts           # Rate limiting config
├── routes/
│   └── auth.ts                 # All auth route handlers
├── services/
│   ├── auth.service.ts         # JWT generation, bcrypt, cookie management
│   ├── session.service.ts      # Session CRUD using Drizzle
│   └── email.service.ts        # Nodemailer for password reset + booking emails
└── lib/
    └── errors.ts               # Typed error classes (AppError, etc.)
```

---

## Detailed specifications

### `v2/apps/api/src/config.ts` — MODIFY existing file

Add all required env vars. In development, provide defaults for non-secret values only. In production, all secrets MUST be env vars.

```typescript
import 'dotenv/config';

export const config = {
  // Server
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') !== 'production',
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',').map(s => s.trim()).filter(Boolean),

  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production-min32chars!',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production-min32chars!',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Cookies
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  // Email (SMTP)
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  companyEmail: process.env.COMPANY_EMAIL || 'hello@searchanycars.com',
  companyName: process.env.COMPANY_NAME || 'SearchAnyCars',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Rate limiting
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || ((process.env.NODE_ENV || 'development') !== 'production' ? 1000 : 200)),
} as const;
```

### `v2/apps/api/.env.example` — UPDATE

```bash
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# JWT secrets (generate random strings for production)
JWT_ACCESS_SECRET=dev-access-secret-change-in-production-min32chars!
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-min32chars!

# Cookies
COOKIE_SECURE=false
# COOKIE_DOMAIN=

# Email (optional — auth works without it, password reset emails just won't send)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
COMPANY_EMAIL=hello@searchanycars.com
COMPANY_NAME=SearchAnyCars
FRONTEND_URL=http://localhost:3000
```

Also create `v2/apps/api/.env` (gitignored) with the actual DATABASE_URL from the Neon connection. Copy it from `v2/packages/db/.env`.

### Auth middleware plugin (`v2/apps/api/src/plugins/auth.ts`)

This is the CORE auth logic. It must support DUAL authentication:

1. **Cookie auth** (for web browser): reads `access_token` from httpOnly cookie
2. **Bearer auth** (for mobile app): reads `Authorization: Bearer <token>` header
3. Cookie takes priority if both are present

Implement as Fastify decorators:
- `fastify.decorate('extractUser', ...)` — sets `request.user` from token (cookie OR bearer). Non-blocking — if no token, `request.user` is null.
- `fastify.decorate('requireAuth', ...)` — preHandler hook that returns 401 if no user
- `fastify.decorate('requireAdmin', ...)` — preHandler hook that returns 403 if user.role !== 'admin'

Augment the Fastify types:
```typescript
declare module 'fastify' {
  interface FastifyRequest {
    user: { id: number; email: string; role: string; name: string } | null;
  }
}
```

### Auth service (`v2/apps/api/src/services/auth.service.ts`)

- `hashPassword(plain: string): string` — bcrypt with 12 salt rounds
- `verifyPassword(plain: string, hash: string): boolean` — bcrypt compare
- `generateAccessToken(user): string` — JWT with { id, email, role, name }
- `generateRefreshToken(user): string` — JWT with { id, type: 'refresh' }
- `verifyAccessToken(token): payload | null`
- `verifyRefreshToken(token): payload | null`
- `setAuthCookies(reply, accessToken, refreshToken)` — httpOnly, secure in prod, sameSite 'none' if secure else 'lax'
- `clearAuthCookies(reply)`

Use `@fastify/cookie` for cookie management. Use `jsonwebtoken` for JWT.

### Session service (`v2/apps/api/src/services/session.service.ts`)

- `createSession(userId, refreshToken, ip, userAgent)` — insert into sessions table via Drizzle
- `findSession(refreshToken)` — find non-expired session
- `deleteSession(refreshToken)` — delete session
- `deleteAllUserSessions(userId)` — delete all sessions for a user
- `cleanExpiredSessions()` — delete expired sessions

All operations use the Drizzle `db` client from `@searchanycars/db`.

### Email service (`v2/apps/api/src/services/email.service.ts`)

Port from the old `/searchanycars.com/server/services/emailService.js`. Same two functions:
- `sendPasswordResetEmail(toEmail, resetToken)` — HTML email with reset link
- `sendBookingConfirmationEmail(toEmail, booking)` — HTML email with booking details

If SMTP credentials are not configured (empty SMTP_USER), log a warning and skip sending. Do NOT crash the server.

### Auth routes (`v2/apps/api/src/routes/auth.ts`)

Register as a Fastify plugin under prefix `/api/v1/auth`. Use Zod schemas from `@searchanycars/shared` for request validation. Port ALL endpoints from the old `/searchanycars.com/server/routes/auth.js`:

**Public routes (with auth rate limiter):**
- POST `/register` — validate with `registerSchema`, check email uniqueness, hash password, create user, create session, set cookies, return user
- POST `/login` — validate with `loginSchema`, verify credentials, create session, set cookies, return user
- POST `/refresh` — read refresh token from cookie OR body, verify, rotate tokens
- POST `/forgot-password` — validate with `forgotPasswordSchema`, generate reset token, send email (always return success to prevent email enumeration)
- POST `/reset-password` — validate with `resetPasswordSchema`, verify token, update password, invalidate all sessions

**Protected routes (requireAuth):**
- POST `/logout` — clear cookies, delete session
- GET `/me` — return current user profile
- POST `/change-password` — validate with `changePasswordSchema`, verify current password, update

**Admin routes (requireAdmin):**
- GET `/users` — list all users (without password_hash)
- POST `/users` — create user with specified role
- PUT `/users/:id` — update user name/role/password
- DELETE `/users/:id` — delete user (cannot delete self)

### `v2/apps/api/src/app.ts` — MODIFY

Update the app factory to register all new plugins and routes:

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import { healthPlugin } from './plugins/health.js';
import { authPlugin } from './plugins/auth.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { authRoutes } from './routes/auth.js';

export async function createApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      ...(config.isDev && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }),
    },
  });

  // Core plugins
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.corsOrigins, credentials: true });
  await app.register(cookie);
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);

  // Routes
  await app.register(healthPlugin);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });

  return app;
}
```

### New dependencies to add to `v2/apps/api/package.json`

```json
{
  "dependencies": {
    "jsonwebtoken": "^9",
    "bcryptjs": "^3",
    "nodemailer": "^7",
    "crypto": "built-in — no install needed"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9",
    "@types/bcryptjs": "^2",
    "@types/nodemailer": "^6"
  }
}
```

Add these to the existing dependencies — do not replace what's already there.

---

## API versioning

ALL routes in this step and future steps use the `/api/v1/` prefix. This is critical for mobile app compatibility — when you release breaking changes, you create `/api/v2/` without breaking existing mobile app versions.

---

## Error handling

Create `v2/apps/api/src/lib/errors.ts` with a typed error class:

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

Register a global error handler in the Fastify app that catches AppError instances and returns structured JSON:
```json
{ "message": "Invalid email or password", "code": "INVALID_CREDENTIALS" }
```

For Zod validation errors, return 400 with the Zod error details formatted cleanly.

---

## Verification steps

```bash
cd v2

# Install new deps
pnpm install

# Create .env in apps/api with DATABASE_URL (copy from packages/db/.env)
cp packages/db/.env apps/api/.env

# Start the API
cd apps/api && pnpm dev

# Test registration
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}' \
  -c cookies.txt -v
# → 201 with user object, Set-Cookie headers for access_token and refresh_token

# Test login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -c cookies.txt -v
# → 200 with user object

# Test /me with cookie
curl http://localhost:4000/api/v1/auth/me -b cookies.txt
# → 200 with user profile

# Test /me with Bearer token (extract access_token from cookie header)
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <access-token-from-cookie>"
# → 200 with same user profile

# Test admin login (use seeded admin from step 02)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@searchanycars.com","password":"admin123"}' \
  -c admin-cookies.txt

# Test admin list users
curl http://localhost:4000/api/v1/auth/users -b admin-cookies.txt
# → 200 with array of users

# Test validation error
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"bad"}'
# → 400 with Zod validation error

# Health check still works
curl http://localhost:4000/api/health
# → {"ok": true}

# Full build
cd ../..
pnpm build
```

---

## What NOT to do

- Do NOT modify `/searchanycars.com/`
- Do NOT create listing/booking/favorite routes (that's steps 04-05)
- Do NOT modify `apps/web/` (that's steps 06+)
- Do NOT use `pg` package — the Drizzle client in packages/db already uses `postgres` (postgres.js)
- Do NOT hardcode any secrets in source code — all secrets come from env vars or dev defaults in config.ts
- Do NOT create a separate Redis integration yet — sessions stay in PostgreSQL for now (Redis comes later as an optimization)