import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import config from '../config.js'

export const setupSecurity = (app) => {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // disable CSP for dev (inline scripts from Vite)
    crossOriginEmbedderPolicy: false,
  }))

  // CORS
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(null, true) // allow all in dev; tighten in production
      }
    },
    credentials: true,
  }))

  // Global rate limiter
  app.use('/api/', rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
  }))
}

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isDev ? 100 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
})
