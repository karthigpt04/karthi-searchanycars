import { verifyAccessToken } from '../services/authService.js'
import { db } from '../db.js'

export const extractUser = (req, _res, next) => {
  req.user = null
  const token = req.cookies?.access_token
  if (token) {
    const payload = verifyAccessToken(token)
    if (payload) {
      req.user = { id: payload.id, email: payload.email, role: payload.role, name: payload.name }
    }
  }
  next()
}

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' })
  }
  next()
}

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' })
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}
