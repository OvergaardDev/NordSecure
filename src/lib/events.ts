export type EventType =
  | 'page_view'
  | 'product_view'
  | 'checkout_start'
  | 'purchase'

export interface TrackEventPayload {
  type: EventType
  sessionId: string
  country?: string
  referrer?: string
}

/** Call from client components to record first-party analytics events */
export async function trackEvent(payload: TrackEventPayload): Promise<void> {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // fire-and-forget; never block the user
  }
}

/** Get or create an anonymous session ID stored in sessionStorage */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let id = sessionStorage.getItem('ns_session')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('ns_session', id)
  }
  return id
}
