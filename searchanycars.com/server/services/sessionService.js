import { db } from '../db.js'

export const createSession = (userId, refreshToken, req) => {
  const ip = req.ip || req.connection?.remoteAddress || ''
  const ua = req.get('user-agent') || ''
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  db.prepare(
    'INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, refreshToken, expiresAt, ip, ua)
}

export const findSession = (refreshToken) => {
  return db.prepare(
    "SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > datetime('now')"
  ).get(refreshToken) || null
}

export const deleteSession = (refreshToken) => {
  db.prepare('DELETE FROM sessions WHERE refresh_token = ?').run(refreshToken)
}

export const deleteAllUserSessions = (userId) => {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

export const cleanExpiredSessions = () => {
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run()
}
