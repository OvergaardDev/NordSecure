import { describe, it, expect } from 'vitest'
import {
  campaignPrices,
  getCampaignState,
  modelForOrder,
  postCampaignStandardModel,
  postCampaignStandardPrice,
  priceForOrder
} from '../src/lib/campaign'

describe('Campaign pricing ladder', () => {
  it('uses provided campaignPrices array', () => {
    expect(campaignPrices).toEqual([400, 465, 535, 605, 700])
  })

  it('returns next price based on soldCount', () => {
    let s0 = getCampaignState(0)
    expect(s0.nextPrice).toBe(400)
    let s2 = getCampaignState(2)
    expect(s2.nextPrice).toBe(535)
    let s5 = getCampaignState(5)
    expect(s5.nextPrice).toBe(postCampaignStandardPrice)
  })

  it('priceForOrder locks price at soldCount index', () => {
    expect(priceForOrder(0)).toBe(400)
    expect(priceForOrder(4)).toBe(700)
    expect(priceForOrder(5)).toBe(postCampaignStandardPrice)
  })

  it('maps campaign units to requested phone models', () => {
    expect(modelForOrder(1)).toBe('Pixel 7 Pro')
    expect(modelForOrder(2)).toBe('Pixel 7 Pro')
    expect(modelForOrder(3)).toBe('Pixel 8 Pro')
    expect(modelForOrder(4)).toBe('Pixel 8 Pro')
    expect(modelForOrder(5)).toBe(postCampaignStandardModel)
  })
})
