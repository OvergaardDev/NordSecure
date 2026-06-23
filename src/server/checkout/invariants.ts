export type ReservationPaymentSnapshot = {
  id: number
  lockedPrice: number
}

export type VerifiedPaymentSnapshot = {
  amount: number
  currency: string
  meta?: Record<string, unknown>
}

export function paymentMatchesReservation(
  reservation: ReservationPaymentSnapshot,
  verified: VerifiedPaymentSnapshot | null
) {
  if (!verified) return false

  const amountMatches = Math.abs(Number(verified.amount || 0) - Number(reservation.lockedPrice)) < 0.01
  const currencyMatches = String(verified.currency || '').toUpperCase() === 'EUR'
  const verifiedReservationId = String(verified.meta?.reservationId || '')
  const reservationIdMatches = !verifiedReservationId || verifiedReservationId === String(reservation.id)

  return amountMatches && currencyMatches && reservationIdMatches
}

export function isReservationExpired(reservation: { expiresAt: Date }, now = Date.now()) {
  return reservation.expiresAt.getTime() < now
}