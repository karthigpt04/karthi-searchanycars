import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '../db.js'
import config from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SITE_URL = config.isDev ? 'http://localhost:5173' : (process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'https://searchanycars.com')
const SITE_NAME = 'SearchAnyCars'
const DEFAULT_OG_IMAGE = `${SITE_URL}/vite.svg`

// ── Slug helper ──
const generateSlug = (year, brand, model, variant) => {
  const parts = [year, brand, model, variant].filter(Boolean)
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Escape HTML for safe injection ──
const esc = (str) => {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// ── Format INR for meta tags ──
const formatINRShort = (value) => {
  if (!value) return ''
  const n = Number(value)
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} Lakh`
  return `₹${n.toLocaleString('en-IN')}`
}

// ── Get site config ──
const getSiteConfig = () => {
  try {
    const rows = db.prepare('SELECT key, value FROM site_config').all()
    const cfg = {}
    for (const row of rows) {
      try { cfg[row.key] = JSON.parse(row.value) } catch { cfg[row.key] = row.value }
    }
    return cfg
  } catch { return {} }
}

// ── Parse JSON safely ──
const parseJson = (value, fallback) => {
  try { return value ? JSON.parse(value) : fallback } catch { return fallback }
}

// ── Build meta tags HTML ──
const buildMetaTags = ({ title, description, canonical, ogType, ogImage, noindex, jsonLd, breadcrumbs }) => {
  let html = ''

  html += `<title>${esc(title)}</title>\n`
  html += `    <meta name="description" content="${esc(description)}" />\n`
  html += `    <link rel="canonical" href="${esc(canonical)}" />\n`

  if (noindex) {
    html += `    <meta name="robots" content="noindex, nofollow" />\n`
  } else {
    html += `    <meta name="robots" content="index, follow" />\n`
  }

  // Open Graph
  html += `    <meta property="og:title" content="${esc(title)}" />\n`
  html += `    <meta property="og:description" content="${esc(description)}" />\n`
  html += `    <meta property="og:url" content="${esc(canonical)}" />\n`
  html += `    <meta property="og:type" content="${esc(ogType || 'website')}" />\n`
  html += `    <meta property="og:site_name" content="${SITE_NAME}" />\n`
  html += `    <meta property="og:locale" content="en_IN" />\n`
  if (ogImage) {
    html += `    <meta property="og:image" content="${esc(ogImage)}" />\n`
  }

  // Twitter Card
  html += `    <meta name="twitter:card" content="summary_large_image" />\n`
  html += `    <meta name="twitter:title" content="${esc(title)}" />\n`
  html += `    <meta name="twitter:description" content="${esc(description)}" />\n`
  if (ogImage) {
    html += `    <meta name="twitter:image" content="${esc(ogImage)}" />\n`
  }

  // JSON-LD
  if (jsonLd) {
    const ldArray = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
    for (const ld of ldArray) {
      html += `    <script type="application/ld+json">${JSON.stringify(ld)}</script>\n`
    }
  }

  // Breadcrumbs JSON-LD
  if (breadcrumbs && breadcrumbs.length > 0) {
    const bcLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((bc, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: bc.name,
        item: bc.url,
      })),
    }
    html += `    <script type="application/ld+json">${JSON.stringify(bcLd)}</script>\n`
  }

  return html
}

// ── Route-specific meta generators ──

const homePageMeta = () => {
  const siteConfig = getSiteConfig()
  const heroTitle = siteConfig.hero?.title || "India's Trusted Used Car Platform"
  const heroSubtitle = siteConfig.hero?.subtitle || 'Browse 12,000+ quality-inspected cars with warranty, easy financing, and doorstep delivery.'

  return buildMetaTags({
    title: `${SITE_NAME} - ${heroTitle}`,
    description: heroSubtitle,
    canonical: SITE_URL,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: DEFAULT_OG_IMAGE,
        description: heroSubtitle,
        sameAs: [],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/search?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
    breadcrumbs: [{ name: 'Home', url: SITE_URL }],
  })
}

const carDetailMeta = (listing) => {
  const images = parseJson(listing.images_json, [])
  const ogImage = images.length > 0 ? images[0] : DEFAULT_OG_IMAGE
  const price = formatINRShort(listing.listing_price_inr)
  const slug = listing.slug || `${listing.id}`
  const title = listing.meta_title || `${listing.model_year || ''} ${listing.brand} ${listing.model} ${listing.variant || ''} - ${price} | ${SITE_NAME}`.trim()
  const description = listing.meta_description || `Buy ${listing.model_year || ''} ${listing.brand} ${listing.model} ${listing.variant || ''} at ${price}. ${listing.total_km_driven ? Math.round(listing.total_km_driven).toLocaleString('en-IN') + ' km driven. ' : ''}${listing.fuel_type || ''} ${listing.transmission_type || ''}. Quality-inspected with warranty on ${SITE_NAME}.`.trim()

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${listing.model_year || ''} ${listing.brand} ${listing.model} ${listing.variant || ''}`.trim(),
    description: description,
    image: images.length > 0 ? images : undefined,
    brand: { '@type': 'Brand', name: listing.brand },
    model: listing.model,
    vehicleModelDate: listing.model_year ? String(listing.model_year) : undefined,
    offers: {
      '@type': 'Offer',
      price: listing.listing_price_inr,
      priceCurrency: 'INR',
      availability: listing.listing_status === 'Active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      url: `${SITE_URL}/car/${slug}`,
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
    ...(listing.total_km_driven ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: listing.total_km_driven, unitCode: 'KMT' } } : {}),
    ...(listing.fuel_type ? { fuelType: listing.fuel_type } : {}),
  }

  return buildMetaTags({
    title,
    description,
    canonical: `${SITE_URL}/car/${slug}`,
    ogType: 'product',
    ogImage,
    jsonLd: productLd,
    breadcrumbs: [
      { name: 'Home', url: SITE_URL },
      { name: 'Search Cars', url: `${SITE_URL}/search` },
      { name: `${listing.brand} ${listing.model}`, url: `${SITE_URL}/car/${slug}` },
    ],
  })
}

const searchPageMeta = (query) => {
  const parts = []
  if (query.brand) parts.push(query.brand)
  parts.push('Used Cars')
  if (query.location_city) parts.push(`in ${query.location_city}`)

  const title = parts.length > 1
    ? `${parts.join(' ')} | ${SITE_NAME}`
    : `Used Cars in India - Browse 12,000+ Cars | ${SITE_NAME}`

  const description = query.brand
    ? `Browse verified ${query.brand} used cars${query.location_city ? ` in ${query.location_city}` : ''} on ${SITE_NAME}. Quality-inspected with warranty, financing & doorstep delivery.`
    : `Search 12,000+ quality-inspected used cars in India on ${SITE_NAME}. All cars come with warranty, easy financing, and doorstep delivery.`

  return buildMetaTags({
    title,
    description,
    canonical: `${SITE_URL}/search`,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    breadcrumbs: [
      { name: 'Home', url: SITE_URL },
      { name: 'Search Cars', url: `${SITE_URL}/search` },
    ],
  })
}

const faqPageMeta = () => {
  const faqs = [
    { q: 'How does SearchAnyCars work?', a: 'SearchAnyCars aggregates the best used car inventory from 100+ verified dealer partners and presents them under one trusted brand. Every car undergoes a 200+ point quality inspection, and we handle everything from test drives to doorstep delivery.' },
    { q: 'Are all cars inspected?', a: 'Yes! Every car listed on SearchAnyCars goes through a comprehensive 200+ point inspection covering exterior, interior, engine, electrical systems, tyres, brakes, and documentation. You can view the detailed inspection report on each car\'s page.' },
    { q: 'What is the money-back guarantee?', a: 'If you\'re not satisfied with your purchase, you can return the car within 7 days for a full refund. No questions asked. The car must be in the same condition as delivered.' },
    { q: 'What warranty is provided?', a: 'Every SearchAnyCars Assured vehicle comes with a 1-year comprehensive warranty covering the engine and transmission. Extended warranty options are also available for additional coverage.' },
    { q: 'How does the reservation work?', a: 'When you find a car you like, you can reserve it by paying a small refundable deposit (₹5,000-₹20,000 depending on the car). This holds the car for 48 hours while we process your booking. The deposit is fully applied to the purchase price.' },
    { q: 'Can I book a test drive at home?', a: 'Yes! We offer free home test drives across all operational cities. Simply book a test drive on the car\'s page, select "Home Test Drive", and our team will bring the car to your doorstep at your preferred time.' },
    { q: 'Do you offer financing?', a: 'Yes, we partner with leading banks and NBFCs to offer competitive financing options. Use our built-in EMI calculator to plan your finances, and our team will help you find the best loan rates.' },
    { q: 'Is RC transfer included?', a: 'Yes! RC transfer is completely free when you buy through SearchAnyCars. We handle all paperwork, documentation, and the entire transfer process at no extra cost.' },
    { q: 'What documents do I need to buy a car?', a: 'You\'ll need: Aadhaar Card, PAN Card, Address Proof, and Income Proof (if opting for financing). Our team will guide you through the entire documentation process.' },
    { q: 'Can I sell my car on SearchAnyCars?', a: 'We\'re currently focused on providing the best buying experience. Sell-your-car functionality is coming soon. Enter your registration number on our homepage to get notified when it launches.' },
    { q: 'What cities do you operate in?', a: 'We currently operate in Delhi NCR, Mumbai, Bengaluru, Chennai, Hyderabad, Pune, Ahmedabad, Jaipur, and Lucknow. We\'re rapidly expanding to more cities.' },
    { q: 'How are prices determined?', a: 'Our pricing is based on market analysis, car condition, mileage, age, and service history. All prices are fixed — there\'s no haggling or hidden charges. The price you see includes everything.' },
  ]

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return buildMetaTags({
    title: `Frequently Asked Questions - Used Car Buying Guide | ${SITE_NAME}`,
    description: 'Find answers to common questions about buying used cars on SearchAnyCars. Learn about our inspection process, warranty, financing, RC transfer, and more.',
    canonical: `${SITE_URL}/faq`,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: faqLd,
    breadcrumbs: [
      { name: 'Home', url: SITE_URL },
      { name: 'FAQ', url: `${SITE_URL}/faq` },
    ],
  })
}

const howItWorksPageMeta = () => {
  const steps = [
    { name: 'Browse & Search', text: 'Use our powerful filters to find the perfect car from 12,000+ quality-inspected listings.' },
    { name: 'Check Inspection Report', text: 'Every car comes with a detailed 200+ point inspection report.' },
    { name: 'Book a Test Drive', text: 'Schedule a free test drive at your home or visit our nearest hub.' },
    { name: 'Reserve with a Deposit', text: 'Pay a small refundable deposit to hold the car for 48 hours.' },
    { name: 'Complete Documentation', text: 'We handle all paperwork — RC transfer, insurance, and more.' },
    { name: 'Doorstep Delivery', text: 'Your car is cleaned, polished, and delivered to your doorstep.' },
  ]

  const howToLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Buy a Used Car on SearchAnyCars',
    description: 'Buy your dream used car in 6 simple steps — from search to doorstep delivery.',
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  }

  return buildMetaTags({
    title: `How It Works - Buy Used Cars in 6 Easy Steps | ${SITE_NAME}`,
    description: 'Learn how to buy a quality-inspected used car on SearchAnyCars in 6 simple steps. From browsing to doorstep delivery with warranty and financing.',
    canonical: `${SITE_URL}/how-it-works`,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: howToLd,
    breadcrumbs: [
      { name: 'Home', url: SITE_URL },
      { name: 'How It Works', url: `${SITE_URL}/how-it-works` },
    ],
  })
}

const contactPageMeta = () => {
  const siteConfig = getSiteConfig()
  const ci = siteConfig.contact_info || {}

  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE_NAME,
    url: SITE_URL,
    telephone: ci.phone || '',
    email: ci.email || '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: ci.address || '',
      addressCountry: 'IN',
    },
    openingHours: 'Mo-Sa 09:00-20:00',
    priceRange: '₹₹',
  }

  return buildMetaTags({
    title: `Contact Us - Get Help with Used Car Buying | ${SITE_NAME}`,
    description: `Contact ${SITE_NAME} for help buying a used car. Call us, WhatsApp, or email. We respond within 24 hours. Mon-Sat, 9 AM - 8 PM.`,
    canonical: `${SITE_URL}/contact`,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: localBusinessLd,
    breadcrumbs: [
      { name: 'Home', url: SITE_URL },
      { name: 'Contact', url: `${SITE_URL}/contact` },
    ],
  })
}

const aboutPageMeta = () => buildMetaTags({
  title: `About Us - India's Trusted Used Car Platform | ${SITE_NAME}`,
  description: `${SITE_NAME} connects buyers with 100+ verified dealers across 20+ cities. 12,000+ quality-inspected cars with warranty, financing, and doorstep delivery.`,
  canonical: `${SITE_URL}/about`,
  ogType: 'website',
  ogImage: DEFAULT_OG_IMAGE,
  breadcrumbs: [
    { name: 'Home', url: SITE_URL },
    { name: 'About Us', url: `${SITE_URL}/about` },
  ],
})

const splusPageMeta = () => buildMetaTags({
  title: `S+ Premium Luxury Used Cars - BMW, Mercedes, Audi | ${SITE_NAME}`,
  description: `Browse premium luxury used cars on ${SITE_NAME} S+. BMW, Mercedes-Benz, Audi, and more. All quality-inspected with warranty and doorstep delivery.`,
  canonical: `${SITE_URL}/splus`,
  ogType: 'website',
  ogImage: DEFAULT_OG_IMAGE,
  breadcrumbs: [
    { name: 'Home', url: SITE_URL },
    { name: 'S+ Premium', url: `${SITE_URL}/splus` },
  ],
})

const splusNewPageMeta = () => buildMetaTags({
  title: `New & Unregistered Cars at Used Car Prices | ${SITE_NAME}`,
  description: `Buy brand new, unregistered, and demo cars at below showroom prices on ${SITE_NAME}. All cars are unused with full manufacturer warranty.`,
  canonical: `${SITE_URL}/splus-new`,
  ogType: 'website',
  ogImage: DEFAULT_OG_IMAGE,
  breadcrumbs: [
    { name: 'Home', url: SITE_URL },
    { name: 'New Cars', url: `${SITE_URL}/splus-new` },
  ],
})

const sellPageMeta = () => buildMetaTags({
  title: `Sell Your Car - Get Best Price from Verified Dealers | ${SITE_NAME}`,
  description: `Sell your car at the best price on ${SITE_NAME}. Get instant quotes from 100+ verified dealers. Free evaluation, hassle-free paperwork, and fast payment.`,
  canonical: `${SITE_URL}/sell`,
  ogType: 'website',
  ogImage: DEFAULT_OG_IMAGE,
  breadcrumbs: [
    { name: 'Home', url: SITE_URL },
    { name: 'Sell Your Car', url: `${SITE_URL}/sell` },
  ],
})

const noindexPageMeta = (pagePath, title) => buildMetaTags({
  title: `${title} | ${SITE_NAME}`,
  description: `${title} on ${SITE_NAME}.`,
  canonical: `${SITE_URL}${pagePath}`,
  noindex: true,
})

// ── Extract listing ID from slug ──
const extractListingId = (param) => {
  // Matches /car/2022-hyundai-creta-sxo-123 or /car/123
  const match = param.match(/(\d+)$/)
  return match ? Number(match[1]) : NaN
}

// ── Main SSR Middleware ──
export const seoMiddleware = (htmlTemplate) => {
  return (req, res, next) => {
    const urlPath = req.path

    // Skip API and upload routes
    if (urlPath.startsWith('/api/') || urlPath.startsWith('/uploads/')) {
      return next()
    }

    // Skip if no HTML template
    if (!htmlTemplate) {
      return next()
    }

    let metaHtml = ''
    let statusCode = 200

    try {
      // ── Home ──
      if (urlPath === '/') {
        metaHtml = homePageMeta()
      }
      // ── Car detail ──
      else if (urlPath.startsWith('/car/')) {
        const param = urlPath.replace('/car/', '').split('?')[0]
        const listingId = extractListingId(param)
        if (!Number.isFinite(listingId) || listingId <= 0) {
          statusCode = 404
          metaHtml = buildMetaTags({
            title: `Car Not Found | ${SITE_NAME}`,
            description: 'The car listing you are looking for does not exist or has been removed.',
            canonical: `${SITE_URL}${urlPath}`,
            noindex: true,
          })
        } else {
          const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId)
          if (!listing) {
            statusCode = 404
            metaHtml = buildMetaTags({
              title: `Car Not Found | ${SITE_NAME}`,
              description: 'The car listing you are looking for does not exist or has been removed.',
              canonical: `${SITE_URL}${urlPath}`,
              noindex: true,
            })
          } else {
            // Redirect numeric-only URLs to slug URLs
            const expectedSlug = listing.slug || `${listing.id}`
            if (param !== expectedSlug && param === String(listing.id)) {
              return res.redirect(301, `/car/${expectedSlug}`)
            }
            metaHtml = carDetailMeta(listing)
          }
        }
      }
      // ── Search ──
      else if (urlPath === '/search') {
        metaHtml = searchPageMeta(req.query)
      }
      // ── S+ ──
      else if (urlPath === '/splus') {
        metaHtml = splusPageMeta()
      }
      // ── S+ New ──
      else if (urlPath === '/splus-new') {
        metaHtml = splusNewPageMeta()
      }
      // ── Sell ──
      else if (urlPath === '/sell') {
        metaHtml = sellPageMeta()
      }
      // ── About ──
      else if (urlPath === '/about') {
        metaHtml = aboutPageMeta()
      }
      // ── How It Works ──
      else if (urlPath === '/how-it-works') {
        metaHtml = howItWorksPageMeta()
      }
      // ── FAQ ──
      else if (urlPath === '/faq') {
        metaHtml = faqPageMeta()
      }
      // ── Contact ──
      else if (urlPath === '/contact') {
        metaHtml = contactPageMeta()
      }
      // ── Noindex pages ──
      else if (urlPath === '/login') {
        metaHtml = noindexPageMeta('/login', 'Login')
      }
      else if (urlPath === '/forgot-password') {
        metaHtml = noindexPageMeta('/forgot-password', 'Forgot Password')
      }
      else if (urlPath === '/reset-password') {
        metaHtml = noindexPageMeta('/reset-password', 'Reset Password')
      }
      else if (urlPath === '/change-password') {
        metaHtml = noindexPageMeta('/change-password', 'Change Password')
      }
      else if (urlPath === '/wishlist') {
        metaHtml = noindexPageMeta('/wishlist', 'My Wishlist')
      }
      else if (urlPath.startsWith('/admin')) {
        metaHtml = noindexPageMeta(urlPath, 'Admin')
      }
      // ── Unknown route → 404 ──
      else {
        statusCode = 404
        metaHtml = buildMetaTags({
          title: `Page Not Found | ${SITE_NAME}`,
          description: 'The page you are looking for does not exist.',
          canonical: `${SITE_URL}${urlPath}`,
          noindex: true,
        })
      }
    } catch (err) {
      console.error('SEO middleware error:', err)
      // Fallback to default meta
      metaHtml = buildMetaTags({
        title: `${SITE_NAME} - India's Trusted Used Car Platform`,
        description: 'Browse 12,000+ quality-inspected used cars with warranty, easy financing, and doorstep delivery.',
        canonical: `${SITE_URL}${urlPath}`,
      })
    }

    // Inject meta tags into HTML template
    const injectedHtml = htmlTemplate
      .replace(
        /<title>.*?<\/title>/,
        metaHtml
      )
      .replace(
        /<meta name="description" content="[^"]*" \/>/,
        '' // Already included in metaHtml
      )

    res.status(statusCode).send(injectedHtml)
  }
}

// ── Robots.txt ──
export const robotsTxtHandler = (_req, res) => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin
Disallow: /login
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /change-password
Disallow: /wishlist
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`
  res.type('text/plain').send(robotsTxt)
}

// ── Sitemap Index ──
export const sitemapIndexHandler = (_req, res) => {
  const now = new Date().toISOString().split('T')[0]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-listings.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`
  res.type('application/xml').send(xml)
}

// ── Static Pages Sitemap ──
export const sitemapStaticHandler = (_req, res) => {
  const now = new Date().toISOString().split('T')[0]
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/search', priority: '0.9', changefreq: 'daily' },
    { loc: '/splus', priority: '0.8', changefreq: 'daily' },
    { loc: '/splus-new', priority: '0.8', changefreq: 'daily' },
    { loc: '/sell', priority: '0.7', changefreq: 'monthly' },
    { loc: '/about', priority: '0.5', changefreq: 'monthly' },
    { loc: '/how-it-works', priority: '0.6', changefreq: 'monthly' },
    { loc: '/faq', priority: '0.6', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.5', changefreq: 'monthly' },
  ]

  const urls = staticPages
    .map(
      (p) => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
  res.type('application/xml').send(xml)
}

// ── Listings Sitemap ──
export const sitemapListingsHandler = (_req, res) => {
  const listings = db
    .prepare("SELECT id, slug, updated_at FROM listings WHERE listing_status = 'Active' ORDER BY updated_at DESC")
    .all()

  const urls = listings
    .map((l) => {
      const slug = l.slug || String(l.id)
      const lastmod = l.updated_at ? l.updated_at.split(' ')[0] : new Date().toISOString().split('T')[0]
      return `  <url>
    <loc>${SITE_URL}/car/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
  res.type('application/xml').send(xml)
}
