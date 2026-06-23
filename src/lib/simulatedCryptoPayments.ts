const paidCryptoPaymentIds = new Set<string>()

export function markCryptoPaymentPaid(paymentId: string) {
  paidCryptoPaymentIds.add(paymentId)
}

export function isCryptoPaymentPaid(paymentId: string): boolean {
  return paidCryptoPaymentIds.has(paymentId)
}
