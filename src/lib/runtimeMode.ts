export type PaymentMode = 'live' | 'demo'

export function getPaymentMode(): PaymentMode {
  const serverMode = String(process.env.PAYMENT_MODE || '').trim().toLowerCase()
  if (serverMode === 'live') return 'live'
  if (serverMode === 'demo') return 'demo'

  const legacyPublicMode = String(process.env.NEXT_PUBLIC_PAYMENT_MODE || '').trim().toLowerCase()
  return legacyPublicMode === 'live' ? 'live' : 'demo'
}

export function isLivePaymentModeServer(): boolean {
  return getPaymentMode() === 'live'
}