import config from '../config.js'

export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  if (config.isDev) {
    console.error('[Error]', err)
  }

  res.status(status).json({
    message,
    ...(config.isDev ? { stack: err.stack } : {}),
  })
}
