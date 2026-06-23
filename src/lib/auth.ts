const SECRET = process.env.ADMIN_SECRET || 'dev-secret-change-in-prod'

function getSessionToken(): string {
  const password = process.env.ADMIN_PASSWORD || 'admin'
  return `${password}:${SECRET}`
}

export function createAdminToken(): string {
  return getSessionToken()
}

export function verifyAdminSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false
  return cookieValue === getSessionToken()
}
