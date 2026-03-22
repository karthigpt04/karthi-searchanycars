import { Router } from 'express'
import crypto from 'crypto'
import { db } from '../db.js'
import {
  hashPassword, verifyPassword,
  generateAccessToken, generateRefreshToken,
  verifyRefreshToken, setAuthCookies, clearAuthCookies,
} from '../services/authService.js'
import { createSession, findSession, deleteSession } from '../services/sessionService.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { authLimiter } from '../middleware/security.js'
import { sendPasswordResetEmail } from '../services/emailService.js'

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

// Forgot password – sends reset email
authRouter.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email is required' })

  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email)
  // Always return success to prevent email enumeration
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' })

  // Invalidate any existing tokens for this user
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id)

  // Generate a secure token (valid for 1 hour)
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt)

  try {
    await sendPasswordResetEmail(user.email, token)
  } catch (err) {
    console.error('Failed to send password reset email:', err.message)
    return res.status(500).json({ message: 'Failed to send email. Please try again later.' })
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' })
})

// Reset password – validates token and sets new password
authRouter.post('/reset-password', authLimiter, (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' })
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })

  const resetRecord = db.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0'
  ).get(token)

  if (!resetRecord) return res.status(400).json({ message: 'Invalid or expired reset link' })

  if (new Date(resetRecord.expires_at) < new Date()) {
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetRecord.id)
    return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' })
  }

  const hash = hashPassword(password)
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, resetRecord.user_id)
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetRecord.id)

  // Invalidate all existing sessions for security
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(resetRecord.user_id)

  res.json({ message: 'Password has been reset successfully. Please log in with your new password.' })
})

// Change password – for logged-in users (no email needed)
authRouter.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current password and new password are required' })
  if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' })

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found' })

  if (!verifyPassword(currentPassword, user.password_hash)) {
    return res.status(401).json({ message: 'Current password is incorrect' })
  }

  const hash = hashPassword(newPassword)
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, user.id)

  res.json({ message: 'Password changed successfully' })
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
