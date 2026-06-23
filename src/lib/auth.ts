const DEFAULT_ADMIN_PASSWORD = 'admin'
const DEFAULT_ADMIN_SECRET = 'dev-secret-change-in-prod'
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const encoder = new TextEncoder()

type AdminAuthConfig = {
  password: string
  secret: string
}

function getAdminAuthConfig(): AdminAuthConfig | null {
  const password = String(process.env.ADMIN_PASSWORD || '')
  const secret = String(process.env.ADMIN_SECRET || '')
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    if (!password || !secret) return null
    if (password === DEFAULT_ADMIN_PASSWORD || secret === DEFAULT_ADMIN_SECRET) return null
    return { password, secret }
  }

  return {
    password: password || DEFAULT_ADMIN_PASSWORD,
    secret: secret || DEFAULT_ADMIN_SECRET,
  }
}

async function signValue(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))

  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false

  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}

export function isAdminAuthConfigured(): boolean {
  return getAdminAuthConfig() !== null
}

export function getAdminPassword(): string | null {
  return getAdminAuthConfig()?.password ?? null
}

export async function createAdminToken(): Promise<string> {
  const config = getAdminAuthConfig()
  if (!config) {
    throw new Error('admin_auth_not_configured')
  }

  const expiresAt = Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000
  const nonce = crypto.randomUUID()
  const payload = `${expiresAt}.${nonce}`
  const signature = await signValue(config.secret, payload)

  return `${payload}.${signature}`
}

export async function verifyAdminSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false

  const config = getAdminAuthConfig()
  if (!config) return false

  const parts = cookieValue.split('.')
  if (parts.length !== 3) return false

  const [expiresAtRaw, nonce, providedSignature] = parts
  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || !nonce || !providedSignature) {
    return false
  }

  const expectedSignature = await signValue(config.secret, `${expiresAt}.${nonce}`)
  return constantTimeEqual(providedSignature, expectedSignature)
}
