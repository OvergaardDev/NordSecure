import { RouteError, requireRecord } from '@/src/server/routeErrors'

export { requireRecord }

export function getStringField(
  body: Record<string, unknown>,
  key: string,
  options?: { required?: boolean }
) {
  const raw = body[key]
  const value = typeof raw === 'string' ? raw.trim() : ''

  if (options?.required && !value) {
    throw new RouteError(400, 'invalid_input', { field: key })
  }

  return value
}

export function getOptionalStringField(body: Record<string, unknown>, key: string) {
  const value = getStringField(body, key)
  return value || undefined
}

export function getPositiveIntegerField(
  body: Record<string, unknown>,
  key: string,
  defaultValue?: number
) {
  const raw = body[key]
  if ((raw == null || raw === '') && defaultValue != null) return defaultValue

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new RouteError(400, 'invalid_input', { field: key })
  }

  return value
}

export function getNumberField(
  body: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; min?: number }
) {
  const raw = body[key]
  if ((raw == null || raw === '') && !options?.required) {
    return undefined
  }

  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new RouteError(400, 'invalid_input', { field: key })
  }
  if (options?.min != null && value < options.min) {
    throw new RouteError(400, 'invalid_input', { field: key })
  }

  return value
}

export function getBooleanField(
  body: Record<string, unknown>,
  key: string,
  defaultValue?: boolean
) {
  const raw = body[key]
  if (raw == null) return defaultValue
  return Boolean(raw)
}

export function getDateField(body: Record<string, unknown>, key: string) {
  const raw = body[key]
  if (raw == null || raw === '') return null

  const value = new Date(String(raw))
  if (Number.isNaN(value.getTime())) {
    throw new RouteError(400, 'invalid_input', { field: key })
  }

  return value
}

export function parseRouteId(rawId: string) {
  const id = Number.parseInt(rawId, 10)
  if (!Number.isInteger(id) || id < 1) {
    throw new RouteError(400, 'invalid_id')
  }

  return id
}