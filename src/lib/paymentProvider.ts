import Stripe from 'stripe'
import { isLivePaymentModeServer } from '@/src/lib/runtimeMode'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type CryptoAsset = 'btc'

export type PaymentResult = {
  id: string
  method: 'stripe' | 'crypto'
  amount: number
  currency: string
  status: PaymentStatus
  isTest: boolean
  meta?: Record<string, unknown>
}

type BTCPayInvoice = {
  id: string
  status?: string
  amount?: number
  currency?: string
  checkoutLink?: string
  metadata?: Record<string, unknown>
}

function randomToken(length: number): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, length)
}

function buildSandboxAddress(asset: CryptoAsset): string {
  if (asset === 'btc') return `bc1qmock${randomToken(20)}`
  return `bc1qmock${randomToken(20)}`
}

function qrScheme(asset: CryptoAsset): string {
  if (asset === 'btc') return 'bitcoin'
  return 'bitcoin'
}

export interface PaymentProvider {
  createPayment(
    amount: number,
    currency: string,
    metadata?: Record<string, unknown>
  ): Promise<PaymentResult>
  verifyPayment(id: string): Promise<PaymentResult | null>
  refundPayment(id: string): Promise<boolean>
}

function isLiveMode() {
  return isLivePaymentModeServer()
}

function btcpayAssetCode(asset: CryptoAsset): string {
  if (asset === 'btc') return 'BTC'
  return 'BTC'
}

function buildQrUrl(asset: CryptoAsset, address: string) {
  const scheme = qrScheme(asset)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${scheme}:${address}`
}

export class BTCPayProvider implements PaymentProvider {
  private serverUrl: string
  private apiKey: string
  private storeId: string

  constructor() {
    this.serverUrl = String(process.env.BTCPAY_SERVER_URL || '').replace(/\/$/, '')
    this.apiKey = String(process.env.BTCPAY_API_KEY || '')
    this.storeId = String(process.env.BTCPAY_STORE_ID || '')
  }

  static isConfigured() {
    return Boolean(process.env.BTCPAY_SERVER_URL && process.env.BTCPAY_API_KEY && process.env.BTCPAY_STORE_ID)
  }

  private async btcpayFetch(path: string, init?: RequestInit) {
    const res = await fetch(`${this.serverUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${this.apiKey}`,
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`btcpay_${res.status}:${text.slice(0, 180)}`)
    }

    return res
  }

  async createPayment(
    amount: number,
    currency = 'EUR',
    metadata?: Record<string, unknown>
  ): Promise<PaymentResult> {
    const rawAsset = String(metadata?.asset ?? 'btc').toLowerCase()
    const asset = (['btc'].includes(rawAsset) ? rawAsset : 'btc') as CryptoAsset
    const method = btcpayAssetCode(asset)
    const reservationId = String(metadata?.reservationId ?? '')

    const invoiceBody = {
      amount,
      currency,
      type: 'Standard',
      metadata: {
        orderId: reservationId ? `reservation-${reservationId}` : undefined,
        reservationId,
        asset,
      },
      checkout: {
        speedPolicy: 'HighSpeed',
        paymentMethods: [method],
        defaultPaymentMethod: method,
        expirationMinutes: 15,
        monitoringMinutes: 15,
      },
    }

    const invoiceRes = await this.btcpayFetch(`/api/v1/stores/${this.storeId}/invoices`, {
      method: 'POST',
      body: JSON.stringify(invoiceBody),
    })
    const invoice = (await invoiceRes.json()) as BTCPayInvoice

    const methodsRes = await this.btcpayFetch(
      `/api/v1/stores/${this.storeId}/invoices/${invoice.id}/payment-methods`
    )
    const methods = (await methodsRes.json()) as Array<Record<string, unknown>>

    const match = methods.find((m) => String(m.paymentMethod || '').toUpperCase().includes(method))
    const address = String((match?.destination as string) || '')

    const checkoutLink = String(invoice.checkoutLink || (match?.paymentLink as string) || '')
    const qrFromApi = String((match?.qrCode as string) || '')

    return {
      id: invoice.id,
      method: 'crypto',
      amount,
      currency,
      status: 'pending',
      isTest: false,
      meta: {
        asset,
        address,
        qrUrl: qrFromApi || buildQrUrl(asset, address),
        checkoutUrl: checkoutLink || null,
        note: `LIVE ${asset.toUpperCase()} payment via BTCPay`,
      },
    }
  }

  async verifyPayment(id: string): Promise<PaymentResult | null> {
    const res = await this.btcpayFetch(`/api/v1/stores/${this.storeId}/invoices/${id}`)
    const invoice = (await res.json()) as BTCPayInvoice
    const status = String(invoice.status || '').toLowerCase()

    const paid = status === 'settled' || status === 'processing' || status === 'complete'
    const failed = status === 'invalid' || status === 'expired'

    return {
      id,
      method: 'crypto',
      amount: Number(invoice.amount || 0),
      currency: String(invoice.currency || 'EUR'),
      status: paid ? 'paid' : failed ? 'failed' : 'pending',
      isTest: false,
      meta: {
        btcpayStatus: invoice.status || 'Unknown',
        reservationId: String(invoice.metadata?.reservationId || ''),
      },
    }
  }

  async refundPayment(_id: string): Promise<boolean> {
    return false
  }
}

/** Demo Stripe stub — swap body for real Stripe API calls when going live */
export class StripeDemo implements PaymentProvider {
  async createPayment(
    amount: number,
    currency = 'EUR',
    _metadata?: Record<string, unknown>
  ): Promise<PaymentResult> {
    const id = `pi_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return {
      id,
      method: 'stripe',
      amount,
      currency,
      status: 'pending',
      isTest: true,
      meta: {
        testCardInfo: '4242 4242 4242 4242 · Any future date · Any CVV',
        clientSecret: `${id}_secret_demo`,
      },
    }
  }

  async verifyPayment(id: string): Promise<PaymentResult> {
    // Demo: always confirm immediately
    return { id, method: 'stripe', amount: 0, currency: 'EUR', status: 'paid', isTest: true }
  }

  async refundPayment(_id: string): Promise<boolean> {
    return true
  }
}

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe

  constructor() {
    const secretKey = String(process.env.STRIPE_SECRET_KEY || '')
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    })
  }

  static isConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY)
  }

  private toPaymentStatus(status: string): PaymentStatus {
    if (status === 'succeeded' || status === 'requires_capture') return 'paid'
    if (status === 'canceled') return 'failed'
    return 'pending'
  }

  async createPayment(
    amount: number,
    currency = 'EUR',
    metadata?: Record<string, unknown>
  ): Promise<PaymentResult> {
    const amountInMinor = Math.round(amount * 100)
    const intent = await this.stripe.paymentIntents.create({
      amount: amountInMinor,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: Object.fromEntries(
        Object.entries(metadata || {}).map(([k, v]) => [k, String(v)])
      ),
    })

    return {
      id: intent.id,
      method: 'stripe',
      amount,
      currency,
      status: this.toPaymentStatus(intent.status),
      isTest: !String(process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_'),
      meta: {
        clientSecret: intent.client_secret,
      },
    }
  }

  async verifyPayment(id: string): Promise<PaymentResult | null> {
    const intent = await this.stripe.paymentIntents.retrieve(id)
    return {
      id: intent.id,
      method: 'stripe',
      amount: (intent.amount || 0) / 100,
      currency: String(intent.currency || 'eur').toUpperCase(),
      status: this.toPaymentStatus(intent.status),
      isTest: !String(process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_'),
      meta: {
        stripeStatus: intent.status,
        reservationId: String(intent.metadata?.reservationId || ''),
      },
    }
  }

  async refundPayment(id: string): Promise<boolean> {
    await this.stripe.refunds.create({ payment_intent: id })
    return true
  }
}

/**
 * Crypto sandbox — generates a fake address + QR.
 * Replace this class body with BTCPay Server API calls to go live.
 * The interface (createPayment / verifyPayment / refundPayment) stays identical.
 */
export class CryptoSandbox implements PaymentProvider {
  async createPayment(
    amount: number,
    currency = 'EUR',
    metadata?: Record<string, unknown>
  ): Promise<PaymentResult> {
    const rawAsset = String(metadata?.asset ?? 'btc').toLowerCase()
    const asset = (['btc'].includes(rawAsset) ? rawAsset : 'btc') as CryptoAsset
    const id = `crypto_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const fakeAddress = buildSandboxAddress(asset)
    const scheme = qrScheme(asset)

    const baseMeta: Record<string, unknown> = {
      asset,
      address: fakeAddress,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${scheme}:${fakeAddress}`,
      note: `SANDBOX — simulated ${asset.toUpperCase()} address`,
    }

    if (asset === 'btc') {
      baseMeta.btcAddress = fakeAddress
    }

    return {
      id,
      method: 'crypto',
      amount,
      currency,
      status: 'pending',
      isTest: true,
      meta: baseMeta,
    }
  }

  async verifyPayment(_id: string): Promise<PaymentResult | null> {
    // Returns null until /api/checkout/simulate-crypto marks it paid
    return null
  }

  async refundPayment(_id: string): Promise<boolean> {
    return false // crypto refunds are manual
  }
}

export function getCryptoProvider(): PaymentProvider {
  if (isLiveMode()) {
    if (!BTCPayProvider.isConfigured()) {
      throw new Error('btcpay_not_configured')
    }
    return new BTCPayProvider()
  }

  return new CryptoSandbox()
}

export function getStripeProvider(): PaymentProvider {
  if (isLiveMode() && !StripeProvider.isConfigured()) {
    throw new Error('stripe_not_configured')
  }

  if (StripeProvider.isConfigured()) {
    return new StripeProvider()
  }

  return new StripeDemo()
}

export function isLivePaymentMode() {
  return isLiveMode()
}
