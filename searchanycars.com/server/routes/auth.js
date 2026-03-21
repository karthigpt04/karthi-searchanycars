import { Router } from 'express'
import { db } from '../db.js'
import {
  hashPassword, verifyPassword,
  generateAccessToken, generateRefreshToken,
  verifyRefreshToken, setAuthCookies, clearAuthCookies,
} from '../services/authService.js'
import { createSession, findSession, deleteSession } from '../services/sessionService.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { authLimiter } from '../middleware/security.js'

export const authRouter = Router()

// Register
authRouter.post('/register', authLimiter, (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' })
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return res.status(409).json({ message: 'Email already registered' })

  const hash = hashPassword(password)
  const result = db.prepare(
    "INSERT INTO users (email, name, password_hash, role, email_verified) VALUES (?, ?, ?, 'user', 1)"
  ).run(email, name || '', hash)

  const user = { id: result.lastInsertRowid, email, name: name || '', role: 'user' }
  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)
  createSession(user.id, refreshToken, req)
  setAuthCookies(res, accessToken, refreshToken)

  res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

// Login
authRouter.post('/login', authLimiter, (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' })

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !user.password_hash) return res.status(401).json({ message: 'Invalid email or password' })
  if (!verifyPassword(password, user.password_hash)) return res.status(401).json({ message: 'Invalid email or password' })

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)
  createSession(user.id, refreshToken, req)
  setAuthCookies(res, accessToken, refreshToken)

  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url } })
})

// Refresh token
authRouter.post('/refresh', (req, res) => {
  const token = req.cookies?.refresh_token
  if (!token) return res.status(401).json({ message: 'No refresh token' })

  const payload = verifyRefreshToken(token)
  if (!payload) return res.status(401).json({ message: 'Invalid refresh token' })

  const session = findSession(token)
  if (!session) return res.status(401).json({ message: 'Session expired' })

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id)
  if (!user) return res.status(401).json({ message: 'User not found' })

  // Rotate refresh token
  deleteSession(token)
  const newAccessToken = generateAccessToken(user)
  const newRefreshToken = generateRefreshToken(user)
  createSession(user.id, newRefreshToken, req)
  setAuthCookies(res, newAccessToken, newRefreshToken)

  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url } })
})

// Logout
authRouter.post('/logout', (req, res) => {
  const token = req.cookies?.refresh_token
  if (token) deleteSession(token)
  clearAuthCookies(res)
  res.status(204).end()
})

// Get current user
authRouter.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, avatar_url, phone, phone_verified, email_verified, created_at FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json({ user })
})

// Admin: create user
authRouter.post('/users', requireAdmin, (req, res) => {
  const { email, password, name, role } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' })

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return res.status(409).json({ message: 'Email already registered' })

  const hash = hashPassword(password)
  const userRole = (role === 'admin') ? 'admin' : 'user'
  const result = db.prepare(
    'INSERT INTO users (email, name, password_hash, role, email_verified) VALUES (?, ?, ?, ?, 1)'
  ).run(email, name || '', hash, userRole)

  res.status(201).json({ user: { id: result.lastInsertRowid, email, name: name || '', role: userRole } })
})

// Admin: list users
authRouter.get('/users', requireAdmin, (_req, res) => {
  const users = db.prepare('SELECT id, email, name, role, phone, avatar_url, email_verified, phone_verified, created_at FROM users ORDER BY created_at DESC').all()
  res.json(users)
})

// Admin: delete user
authRouter.delete('/users/:id', requireAdmin, (req, res) => {
  const userId = Number(req.params.id)
  if (userId === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' })
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  res.status(204).end()
})

// Admin: update user
authRouter.put('/users/:id', requireAdmin, (req, res) => {
  const userId = Number(req.params.id)
  const { name, role, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ message: 'User not found' })

  if (name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId)
  if (role && ['admin', 'user'].includes(role)) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId)
  if (password && password.length >= 6) {
    const hash = hashPassword(password)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId)
  }

  const updated = db.prepare('SELECT id, email, name, role, avatar_url FROM users WHERE id = ?').get(userId)
  res.json({ user: updated })
})
