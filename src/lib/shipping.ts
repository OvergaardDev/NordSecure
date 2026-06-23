const EU_MEMBER_STATE_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
])

// Includes EU + non-EU European destinations often used for cross-border shipping.
export const EUROPE_SHIPPING_COUNTRIES: Record<string, string> = {
  AL: 'Albania',
  AD: 'Andorra',
  AT: 'Austria',
  BE: 'Belgium',
  BA: 'Bosnia and Herzegovina',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HU: 'Hungary',
  IS: 'Iceland',
  IE: 'Ireland',
  IT: 'Italy',
  XK: 'Kosovo',
  LV: 'Latvia',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  MD: 'Moldova',
  MC: 'Monaco',
  ME: 'Montenegro',
  NL: 'Netherlands',
  MK: 'North Macedonia',
  NO: 'Norway',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SM: 'San Marino',
  RS: 'Serbia',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
  SE: 'Sweden',
  CH: 'Switzerland',
  UA: 'Ukraine',
  GB: 'United Kingdom',
  VA: 'Vatican City',
}

export function normalizeCountryCode(code: string): string {
  return (code || '').trim().toUpperCase()
}

export function isEuMemberState(code: string): boolean {
  return EU_MEMBER_STATE_CODES.has(normalizeCountryCode(code))
}

export function countryName(code: string): string {
  const normalized = normalizeCountryCode(code)
  return EUROPE_SHIPPING_COUNTRIES[normalized] ?? normalized
}

export interface ShippingRequirements {
  customsRequired: boolean
  checklist: string[]
  customsChecklist: string[]
}

export function shippingRequirementsFromDenmark(countryCode: string): ShippingRequirements {
  const code = normalizeCountryCode(countryCode)
  const eu = isEuMemberState(code)

  return {
    customsRequired: !eu,
    checklist: [
      'Recipient full name',
      'Street + house number (address line 1)',
      'Postal code + city',
      'Country code (ISO-2)',
      'Recipient phone (for carrier delivery issues)',
      'Recipient email (tracking and delivery notifications)',
    ],
    customsChecklist: eu
      ? []
      : [
          'Customs declaration data (carrier CN23/commercial invoice flow)',
          'Clear goods description (e.g. smartphone)',
          'HS tariff code and country of origin',
          'Declared value, currency, and parcel weight',
          'Sender EORI (required for many export flows from EU)',
          'Recipient tax ID / EORI identifier if destination requires it',
        ],
  }
}

/**
 * Calculate shipping cost from Denmark based on destination country
 * Returns cost in EUR
 */
export function calculateShippingCost(countryCode: string): number {
  const code = normalizeCountryCode(countryCode)
  
  // Same country (Denmark) - free shipping
  if (code === 'DK') return 0
  
  // EU countries - €25
  if (isEuMemberState(code)) return 25
  
  // Non-EU Europe - €40
  return 40
}

/**
 * Get country calling code (for phone number formatting)
 */
export const COUNTRY_CALLING_CODES: Record<string, string> = {
  AL: '+355', AD: '+376', AT: '+43', BE: '+32', BA: '+387', BG: '+359', HR: '+385', CY: '+357',
  CZ: '+420', DK: '+45', EE: '+372', FI: '+358', FR: '+33', DE: '+49', GR: '+30', HU: '+36',
  IS: '+354', IE: '+353', IT: '+39', XK: '+383', LV: '+371', LI: '+423', LT: '+370', LU: '+352',
  MT: '+356', MD: '+373', MC: '+377', ME: '+382', NL: '+31', MK: '+389', NO: '+47', PL: '+48',
  PT: '+351', RO: '+40', SM: '+378', RS: '+381', SK: '+421', SI: '+386', ES: '+34', SE: '+46',
  CH: '+41', UA: '+380', GB: '+44', VA: '+39',
}
