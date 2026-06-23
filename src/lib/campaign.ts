export const campaignPrices = [400, 465, 535, 605, 700]
export const postCampaignStandardPrice = 800
export const promoModelsAfterHistoricFirstSale = [
  'Pixel 7 Pro',
  'Pixel 7 Pro',
  'Pixel 8 Pro',
  'Pixel 8 Pro'
]
export const postCampaignStandardModel = 'Pixel 9a'

export function getCampaignState(soldCount: number) {
  const totalUnits = campaignPrices.length
  const unitsLeft = Math.max(0, totalUnits - soldCount)
  const isCampaignActive = soldCount < totalUnits
  const nextPrice = isCampaignActive ? campaignPrices[soldCount] : postCampaignStandardPrice
  return { isCampaignActive, nextPrice, unitsLeft }
}

export function priceForOrder(soldCountWhenLocked: number) {
  // price locked at the moment the unit is reserved/locked
  return soldCountWhenLocked < campaignPrices.length ? campaignPrices[soldCountWhenLocked] : postCampaignStandardPrice
}

export function modelForOrder(soldCountWhenLocked: number) {
  // First campaign unit (€400) is historic; available promo units map 1:1 to this list.
  // soldCount=1 and soldCount=2 -> Pixel 7 Pro, soldCount=3 and soldCount=4 -> Pixel 8 Pro.
  if (soldCountWhenLocked >= campaignPrices.length) return postCampaignStandardModel
  const availableIndex = Math.max(0, soldCountWhenLocked - 1)
  const clamped = Math.min(availableIndex, promoModelsAfterHistoricFirstSale.length - 1)
  return promoModelsAfterHistoricFirstSale[clamped]
}

export function getAvailableLaunchProgress(soldCount: number) {
  // Historical first unit (€400) is treated as already sold and excluded from
  // the public "available launch" progress display.
  const availablePrices = campaignPrices.slice(1)
  const soldAvailable = Math.max(0, Math.min(soldCount - 1, availablePrices.length))
  const unitsLeft = Math.max(0, availablePrices.length - soldAvailable)
  return {
    availablePrices,
    soldAvailable,
    unitsLeft,
    totalAvailable: availablePrices.length
  }
}
