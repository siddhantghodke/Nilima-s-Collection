import crypto from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const sessions = new Map()
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

export function createSession() {
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, Date.now() + SESSION_TTL_MS)
  return token
}

export function verifyPassword(password) {
  if (!ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_PASSWORD environment variable is not set on the server.')
    return false
  }
  return password === ADMIN_PASSWORD
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  const expiresAt = sessions.get(token)
  if (!expiresAt || Date.now() > expiresAt) {
    sessions.delete(token)
    return res.status(401).json({ error: 'Session expired' })
  }

  sessions.set(token, Date.now() + SESSION_TTL_MS)
  next()
}

export function revokeSession(token) {
  sessions.delete(token)
}
