import { describe, it, expect } from 'vitest'
import { StripeDemo, CryptoSandbox } from '../src/lib/paymentProvider'

describe('StripeDemo payment provider', () => {
  const provider = new StripeDemo()

  it('createPayment returns a test payment result', async () => {
    const result = await provider.createPayment(465, 'EUR', { test: true })
    expect(result.isTest).toBe(true)
    expect(result.method).toBe('stripe')
    expect(result.amount).toBe(465)
    expect(result.currency).toBe('EUR')
    expect(result.status).toBe('pending')
    expect(result.id).toMatch(/^pi_test_/)
  })

  it('verifyPayment confirms demo payment immediately', async () => {
    const created = await provider.createPayment(535, 'EUR')
    const verified = await provider.verifyPayment(created.id)
    expect(verified).not.toBeNull()
    expect(verified!.status).toBe('paid')
    expect(verified!.isTest).toBe(true)
  })

  it('refundPayment returns true in demo mode', async () => {
    const created = await provider.createPayment(605, 'EUR')
    const result = await provider.refundPayment(created.id)
    expect(result).toBe(true)
  })
})

describe('CryptoSandbox payment provider', () => {
  const provider = new CryptoSandbox()

  it('createPayment returns a fake crypto address and QR URL', async () => {
    const result = await provider.createPayment(700, 'EUR')
    expect(result.isTest).toBe(true)
    expect(result.method).toBe('crypto')
    expect(result.status).toBe('pending')
    expect(result.meta).toBeDefined()
    expect(result.meta!.asset).toBe('btc')
    expect(result.meta!.address).toMatch(/^bc1q/)
    expect(result.meta!.btcAddress).toMatch(/^bc1q/)
    expect(result.meta!.qrUrl).toMatch(/qrserver\.com/)
  })

  it('supports selecting LTC, XMR and SOL assets', async () => {
    const ltc = await provider.createPayment(700, 'EUR', { asset: 'ltc' })
    const xmr = await provider.createPayment(700, 'EUR', { asset: 'xmr' })
    const sol = await provider.createPayment(700, 'EUR', { asset: 'sol' })

    expect(ltc.meta!.asset).toBe('ltc')
    expect(String(ltc.meta!.address)).toMatch(/^ltc1q/)
    expect(xmr.meta!.asset).toBe('xmr')
    expect(String(xmr.meta!.address)).toMatch(/^4mockxmr/)
    expect(sol.meta!.asset).toBe('sol')
    expect(String(sol.meta!.address)).toMatch(/^So1mock/)
  })

  it('verifyPayment returns null until simulated (sandbox)', async () => {
    const created = await provider.createPayment(465, 'EUR')
    const verified = await provider.verifyPayment(created.id)
    expect(verified).toBeNull()
  })

  it('refundPayment returns false (crypto refunds are manual)', async () => {
    const result = await provider.refundPayment('crypto_mock_123')
    expect(result).toBe(false)
  })
})
