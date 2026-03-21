import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import config from './config.js'
import { bootstrapDatabase } from './bootstrap.js'
import { db } from './db.js'
import { uploadImage } from './storage.js'

import { requestLogger } from './middleware/requestLogger.js'
import { setupSecurity } from './middleware/security.js'
import { extractUser, requireAdmin } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'

import { authRouter } from './routes/auth.js'
import { sseRouter, broadcast } from './routes/sse.js'

// ── Derive __dirname for ESM ──
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Bootstrap database ──
bootstrapDatabase()

// ── Create app ──
const app = express()

// ── Uploads directory ──
const uploadsDir = config.uploadsDir
fs.mkdirSync('uploads', { recursive: true })
fs.mkdirSync(uploadsDir, { recursive: true })

// ── Multer ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxImageSize,
  },
})

// ── Middleware chain ──
app.use(requestLogger)
setupSecurity(app)
app.use(express.json({ limit: '3mb' }))
app.use(cookieParser())
app.use(extractUser)

// ── Static files ──
if (uploadsDir === 'uploads') {
  app.use('/uploads', express.static('uploads'))
} else {
  app.use('/uploads', express.static(uploadsDir))
}
app.use(express.static('dist'))

const hasWebBuild = fs.existsSync(path.join(__dirname, '..', 'dist', 'index.html'))

// ── Auth routes ──
app.use('/api/auth', authRouter)

// ── SSE route ──
app.use('/api/events', sseRouter)

// ────────────────────────────────────────────────────────────────────────────
//  Helpers (inline)
// ────────────────────────────────────────────────────────────────────────────

const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const toListing = (row) => ({
  ...row,
  images: parseJson(row.images_json, []),
  interiorImages: parseJson(row.interior_images_json, []),
  exteriorImages: parseJson(row.exterior_images_json, []),
  engineImages: parseJson(row.engine_images_json, []),
  tireImages: parseJson(row.tire_images_json, []),
  damageImages: parseJson(row.damage_images_json, []),
  specs: parseJson(row.specs_json, {}),
})

const mapWhere = (query) => {
  const clauses = ['1 = 1']
  const values = []

  if (query.search) {
    clauses.push('(l.title LIKE ? OR l.brand LIKE ? OR l.model LIKE ? OR l.location_city LIKE ?)')
    const keyword = `%${query.search}%`
    values.push(keyword, keyword, keyword, keyword)
  }

  if (query.categoryId) {
    clauses.push('l.category_id = ?')
    values.push(Number(query.categoryId))
  }

  if (query.brand) {
    clauses.push('l.brand = ?')
    values.push(query.brand)
  }

  if (query.fuel_type) {
    clauses.push('l.fuel_type = ?')
    values.push(query.fuel_type)
  }

  if (query.transmission_type) {
    clauses.push('l.transmission_type = ?')
    values.push(query.transmission_type)
  }

  if (query.ownership_type) {
    clauses.push('l.ownership_type = ?')
    values.push(query.ownership_type)
  }

  if (query.seller_type) {
    clauses.push('l.seller_type = ?')
    values.push(query.seller_type)
  }

  if (query.location_city) {
    const cityList = query.location_city.split(',').map((c) => c.trim()).filter(Boolean)
    if (cityList.length === 1) {
      clauses.push('l.location_city LIKE ?')
      values.push(`%${cityList[0]}%`)
    } else if (cityList.length > 1) {
      clauses.push(`(${cityList.map(() => 'l.location_city LIKE ?').join(' OR ')})`)
      cityList.forEach((c) => values.push(`%${c}%`))
    }
  }

  if (query.model_year_min) {
    clauses.push('l.model_year >= ?')
    values.push(Number(query.model_year_min))
  }

  if (query.model_year_max) {
    clauses.push('l.model_year <= ?')
    values.push(Number(query.model_year_max))
  }

  if (query.listing_price_min) {
    clauses.push('l.listing_price_inr >= ?')
    values.push(Number(query.listing_price_min))
  }

  if (query.listing_price_max) {
    clauses.push('l.listing_price_inr <= ?')
    values.push(Number(query.listing_price_max))
  }

  if (query.total_km_driven_max) {
    clauses.push('l.total_km_driven <= ?')
    values.push(Number(query.total_km_driven_max))
  }

  if (query.listing_status) {
    clauses.push('l.listing_status = ?')
    values.push(query.listing_status)
  }

  if (query.is_splus) {
    clauses.push('l.is_splus = ?')
    values.push(Number(query.is_splus))
  }

  if (query.is_new_car) {
    clauses.push('l.is_new_car = ?')
    values.push(Number(query.is_new_car))
  }

  if (query.new_car_type) {
    clauses.push('l.new_car_type = ?')
    values.push(query.new_car_type)
  }

  return { whereClause: clauses.join(' AND '), values }
}

const stripHtml = (str) => typeof str === 'string' ? str.replace(/<[^>]*>/g, '') : str

const listingUpsertColumns = [
  'category_id',
  'listing_code',
  'title',
  'brand',
  'model',
  'variant',
  'model_year',
  'registration_year',
  'vehicle_type',
  'body_style',
  'exterior_color',
  'interior_color',
  'listing_price_inr',
  'negotiable',
  'estimated_market_value_inr',
  'ownership_type',
  'seller_type',
  'registration_state',
  'registration_city',
  'total_km_driven',
  'mileage_kmpl',
  'engine_type',
  'engine_capacity_cc',
  'power_bhp',
  'transmission_type',
  'fuel_type',
  'battery_capacity_kwh',
  'overall_condition_rating',
  'service_history_available',
  'airbags_count',
  'infotainment_screen_size',
  'location_city',
  'location_state',
  'dealer_rating',
  'inspection_status',
  'inspection_score',
  'listing_status',
  'featured_listing',
  'is_splus',
  'is_new_car',
  'new_car_type',
  'promotion_tier',
  'images_json',
  'additional_notes',
  'specs_json',
]

const normalizeListingPayload = (payload) => ({
  category_id: payload.categoryId ?? null,
  listing_code: payload.listingCode,
  title: payload.title,
  brand: payload.brand,
  model: payload.model,
  variant: payload.variant ?? '',
  model_year: payload.modelYear ?? null,
  registration_year: payload.registrationYear ?? null,
  vehicle_type: payload.vehicleType ?? null,
  body_style: payload.bodyStyle ?? null,
  exterior_color: payload.exteriorColor ?? null,
  interior_color: payload.interiorColor ?? null,
  listing_price_inr: Number(payload.listingPriceInr ?? 0),
  negotiable: payload.negotiable ? 1 : 0,
  estimated_market_value_inr: payload.estimatedMarketValueInr ?? null,
  ownership_type: payload.ownershipType ?? null,
  seller_type: payload.sellerType ?? null,
  registration_state: payload.registrationState ?? null,
  registration_city: payload.registrationCity ?? null,
  total_km_driven: payload.totalKmDriven ?? null,
  mileage_kmpl: payload.mileageKmpl ?? null,
  engine_type: payload.engineType ?? null,
  engine_capacity_cc: payload.engineCapacityCc ?? null,
  power_bhp: payload.powerBhp ?? null,
  transmission_type: payload.transmissionType ?? null,
  fuel_type: payload.fuelType ?? null,
  battery_capacity_kwh: payload.batteryCapacityKwh ?? null,
  overall_condition_rating: payload.overallConditionRating ?? null,
  service_history_available: payload.serviceHistoryAvailable ? 1 : 0,
  airbags_count: payload.airbagsCount ?? null,
  infotainment_screen_size: payload.infotainmentScreenSize ?? null,
  location_city: payload.locationCity ?? null,
  location_state: payload.locationState ?? null,
  dealer_rating: payload.dealerRating ?? null,
  inspection_status: payload.inspectionStatus ?? null,
  inspection_score: payload.inspectionScore ?? null,
  listing_status: payload.listingStatus ?? 'Active',
  featured_listing: payload.featuredListing ? 1 : 0,
  is_splus: payload.isSplus ? 1 : 0,
  is_new_car: payload.isNewCar ? 1 : 0,
  new_car_type: payload.newCarType ?? null,
  promotion_tier: payload.promotionTier ?? null,
  images_json: JSON.stringify(Array.isArray(payload.images) ? payload.images : []),
  additional_notes: payload.additionalNotes ?? null,
  specs_json: JSON.stringify(payload.specs ?? {}),
})

// ────────────────────────────────────────────────────────────────────────────
//  Routes — Health
// ────────────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'searchanycars-api',
    storageMode: 'local-filesystem',
    dbMode: 'sqlite',
  })
})

// ────────────────────────────────────────────────────────────────────────────
//  Routes — Uploads
// ────────────────────────────────────────────────────────────────────────────

app.post('/api/uploads/image', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required in multipart field "image".' })
      return
    }

    if (!req.file.mimetype.startsWith('image/')) {
      res.status(400).json({ message: 'Only image uploads are supported.' })
      return
    }

    const result = await uploadImage({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
    })

    res.status(201).json(result)
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Image upload failed.' })
  }
})

// ────────────────────────────────────────────────────────────────────────────
//  Routes — Categories
// ────────────────────────────────────────────────────────────────────────────

app.get('/api/categories', (_req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY name ASC').all()
  res.json(rows)
})

app.post('/api/categories', requireAdmin, (req, res) => {
  const { name, slug, vehicleType, description = '' } = req.body
  if (!name || !slug || !vehicleType) {
    res.status(400).json({ message: 'name, slug and vehicleType are required.' })
    return
  }

  const result = db
    .prepare('INSERT INTO categories (name, slug, vehicle_type, description) VALUES (?, ?, ?, ?)')
    .run(name, slug, vehicleType, description)

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(category)
})

app.put('/api/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const { name, slug, vehicleType, description = '' } = req.body
  db.prepare(
    `
      UPDATE categories
      SET name = ?, slug = ?, vehicle_type = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  ).run(name, slug, vehicleType, description, id)

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  if (!category) {
    res.status(404).json({ message: 'Category not found' })
    return
  }

  res.json(category)
})

app.delete('/api/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  res.status(204).send()
})

// ────────────────────────────────────────────────────────────────────────────
//  Routes — Filter Definitions
// ────────────────────────────────────────────────────────────────────────────

app.get('/api/filter-definitions', (_req, res) => {
  const rows = db.prepare('SELECT * FROM filter_definitions ORDER BY label ASC').all()
  res.json(
    rows.map((row) => ({
      ...row,
      options: parseJson(row.options_json, []),
    })),
  )
})

// ────────────────────────────────────────────────────────────────────────────
//  Routes — Category Filters
// ────────────────────────────────────────────────────────────────────────────

app.get('/api/category-filters/:categoryId', (req, res) => {
  const categoryId = Number(req.params.categoryId)
  const rows = db
    .prepare(
      `
      SELECT fd.*
      FROM category_filter_map cfm
      JOIN filter_definitions fd ON fd.id = cfm.filter_id
      WHERE cfm.category_id = ?
      ORDER BY fd.label ASC
    `,
    )
    .all(categoryId)

  res.json(
    rows.map((row) => ({
      ...row,
      options: parseJson(row.options_json, []),
    })),
  )
})

app.put('/api/category-filters/:categoryId', requireAdmin, (req, res) => {
  const categoryId = Number(req.params.categoryId)
  const filterIds = Array.isArray(req.body.filterIds)
    ? req.body.filterIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : []

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM category_filter_map WHERE category_id = ?').run(categoryId)
    const insert = db.prepare('INSERT OR IGNORE INTO category_filter_map (category_id, filter_id) VALUES (?, ?)')
    for (const filterId of filterIds) {
      insert.run(categoryId, filterId)
    }
  })

  tx()
  res.json({ categoryId, filterIds })
})

// ────────────────────────────────────────────────────────────────────────────
//  Routes — Listings
// ────────────────────────────────────────────────────────────────────────────

app.get('/api/listings', (req, res) => {
  const { whereClause, values } = mapWhere(req.query)
  const orderBy = req.query.sortBy === 'priceAsc'
    ? 'l.listing_price_inr ASC'
    : req.query.sortBy === 'priceDesc'
      ? 'l.listing_price_inr DESC'
      : 'l.model_year DESC, l.created_at DESC'

  const rows = db
    .prepare(
      `
      SELECT l.*, c.name as category_name, c.slug as category_slug
      FROM listings l
      LEFT JOIN categories c ON c.id = l.category_id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
    `,
    )
    .all(...values)

  res.json(rows.map(toListing))
})

app.get('/api/listings/:id', (req, res) => {
  const id = Number(req.params.id)
  const row = db
    .prepare(
      `
      SELECT l.*, c.name as category_name, c.slug as category_slug
      FROM listings l
      LEFT JOIN categories c ON c.id = l.category_id
      WHERE l.id = ?
    `,
    )
    .get(id)

  if (!row) {
    res.status(404).json({ message: 'Listing not found' })
    return
  }

  res.json(toListing(row))
})

app.post('/api/listings', requireAdmin, (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ message: 'Request body is required.' })
    return
  }

  const required = ['listingCode', 'title', 'brand', 'model']
  for (const key of required) {
    if (!req.body[key]) {
      res.status(400).json({ message: `${key} is required.` })
      return
    }
  }

  const price = Number(req.body.listingPriceInr ?? 0)
  if (!Number.isFinite(price) || price < 0) {
    res.status(400).json({ message: 'listingPriceInr must be a non-negative number.' })
    return
  }

  // Sanitize text fields to prevent stored XSS
  req.body.title = stripHtml(req.body.title)
  req.body.brand = stripHtml(req.body.brand)
  req.body.model = stripHtml(req.body.model)
  req.body.variant = stripHtml(req.body.variant)
  req.body.additionalNotes = stripHtml(req.body.additionalNotes)

  try {
    const payload = normalizeListingPayload(req.body)
    const placeholders = listingUpsertColumns.map(() => '?').join(', ')
    const sql = `INSERT INTO listings (${listingUpsertColumns.join(', ')}) VALUES (${placeholders})`
    const result = db.prepare(sql).run(...listingUpsertColumns.map((column) => payload[column]))
    const created = db.prepare('SELECT * FROM listings WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(toListing(created))
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ message: 'A listing with this code already exists.' })
      return
    }
    res.status(500).json({ message: 'Failed to create listing.' })
  }
})

app.put('/api/listings/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid listing ID.' })
    return
  }

  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ message: 'Request body is required.' })
    return
  }

  const existing = db.prepare('SELECT * FROM listings WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ message: 'Listing not found' })
    return
  }

  // Sanitize text fields
  if (req.body.title) req.body.title = stripHtml(req.body.title)
  if (req.body.brand) req.body.brand = stripHtml(req.body.brand)
  if (req.body.model) req.body.model = stripHtml(req.body.model)
  if (req.body.variant) req.body.variant = stripHtml(req.body.variant)
  if (req.body.additionalNotes) req.body.additionalNotes = stripHtml(req.body.additionalNotes)

  try {
    const payload = normalizeListingPayload(req.body)
    const setClause = listingUpsertColumns.map((column) => `${column} = ?`).join(', ')
    const sql = `UPDATE listings SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    db.prepare(sql).run(...listingUpsertColumns.map((column) => payload[column]), id)
    const updated = db.prepare('SELECT * FROM listings WHERE id = ?').get(id)
    res.json(toListing(updated))
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ message: 'A listing with this code already exists.' })
      return
    }
    res.status(500).json({ message: 'Failed to update listing.' })
  }
})

app.delete('/api/listings/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid listing ID.' })
    return
  }

  const result = db.prepare('DELETE FROM listings WHERE id = ?').run(id)
  if (result.changes === 0) {
    res.status(404).json({ message: 'Listing not found.' })
    return
  }
  res.status(204).send()
})

// ────────────────────────────────────────────────────────────────────────────
//  Routes — Site Config
// ────────────────────────────────────────────────────────────────────────────

app.get('/api/site-config', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_config').all()
  const siteConfig = {}
  for (const row of rows) {
    try { siteConfig[row.key] = JSON.parse(row.value) } catch { siteConfig[row.key] = row.value }
  }
  res.json(siteConfig)
})

app.get('/api/site-config/:key', (req, res) => {
  const row = db.prepare('SELECT key, value FROM site_config WHERE key = ?').get(req.params.key)
  if (!row) return res.status(404).json({ message: 'Config key not found' })
  let value
  try { value = JSON.parse(row.value) } catch { value = row.value }
  res.json({ key: row.key, value })
})

app.put('/api/site-config/:key', requireAdmin, (req, res) => {
  const key = req.params.key
  const value = JSON.stringify(req.body.value)
  db.prepare(
    `INSERT INTO site_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, value)

  broadcast({ type: 'config-updated', key })

  res.json({ key, value: req.body.value })
})

// ────────────────────────────────────────────────────────────────────────────
//  SPA Fallback
// ────────────────────────────────────────────────────────────────────────────

app.get('/{*any}', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    next()
    return
  }

  if (!hasWebBuild) {
    res.status(404).json({ message: 'Frontend build not found. Run npm run build.' })
    return
  }

  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

// ────────────────────────────────────────────────────────────────────────────
//  Error handler (must be last)
// ────────────────────────────────────────────────────────────────────────────

app.use(errorHandler)

// ────────────────────────────────────────────────────────────────────────────
//  Start server
// ────────────────────────────────────────────────────────────────────────────

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`SearchAnyCars API running on http://0.0.0.0:${config.port}`)
})

// ────────────────────────────────────────────────────────────────────────────
//  Graceful shutdown
// ────────────────────────────────────────────────────────────────────────────

const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`)
  server.close(() => {
    console.log('HTTP server closed.')
    try {
      db.close()
      console.log('Database connection closed.')
    } catch {
      // already closed or never opened
    }
    process.exit(0)
  })

  // Force exit after 10 seconds if connections linger
  setTimeout(() => {
    console.error('Forced shutdown after timeout.')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
