// VAT calculation helpers
// TODO: For cross-border EU B2C, OSS rules may apply once annual threshold is exceeded.
// Consult a tax professional before selling to non-DK EU buyers at scale.
// Currently applying Danish 25% VAT to all orders regardless of buyer country.

export const VAT_RATE_DK = 0.25

export const EU_COUNTRIES: Record<string, string> = {
  DK: 'Denmark',
  DE: 'Germany',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
  NL: 'Netherlands',
  FR: 'France',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  PL: 'Poland',
  IT: 'Italy',
  ES: 'Spain',
  PT: 'Portugal',
  IE: 'Ireland',
  CZ: 'Czech Republic',
  SK: 'Slovakia',
  HU: 'Hungary',
  RO: 'Romania',
  BG: 'Bulgaria',
  HR: 'Croatia',
  SI: 'Slovenia',
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  CY: 'Cyprus',
  GR: 'Greece',
}

/** Returns VAT amount in whole Euro units (rounded) */
export function calculateVat(netAmount: number, _countryCode: string): number {
  return Math.round(netAmount * VAT_RATE_DK)
}

export function totalWithVat(
  netAmount: number,
  countryCode: string
): { net: number; vat: number; total: number } {
  const vat = calculateVat(netAmount, countryCode)
  return { net: netAmount, vat, total: netAmount + vat }
}
