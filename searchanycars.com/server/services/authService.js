import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import config from '../config.js'

const SALT_ROUNDS = 12

export const hashPassword = (plain) => bcrypt.hashSync(plain, SALT_ROUNDS)

export const verifyPassword = (plain, hash) => bcrypt.compareSync(plain, hash)

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtAccessSecret,
    { expiresIn: config.jwtAccessExpiry }
  )
}

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiry }
  )
}

export const verifyAccessToken = (token) => {
  try { return jwt.verify(token, config.jwtAccessSecret) }
  catch { return null }
}

export const verifyRefreshToken = (token) => {
  try { return jwt.verify(token, config.jwtRefreshSecret) }
  catch { return null }
}

export const setAuthCookies = (res, accessToken, refreshToken) => {
  const base = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  }
  res.cookie('access_token', accessToken, { ...base, maxAge: 15 * 60 * 1000 })
  res.cookie('refresh_token', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 })
}

export const clearAuthCookies = (res) => {
  const base = { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', path: '/' }
  res.clearCookie('access_token', base)
  res.clearCookie('refresh_token', base)
}
