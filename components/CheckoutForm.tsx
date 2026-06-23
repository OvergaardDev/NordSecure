'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EUROPE_SHIPPING_COUNTRIES, normalizeCountryCode } from '@/src/lib/shipping'
import { trackEvent, getSessionId } from '@/src/lib/events'

interface CheckoutFormProps {
  productSku: string
  phoneModel: string
  lockedPrice: number
  total: number
}

type CouponApplied = {
  code: string
  discountAmount: number
  finalAmount: number
}

type Step = 'address' | 'payment' | 'confirming' | 'done'
type PaymentMethod = 'crypto' | 'revolut_pro'
type CryptoAsset = 'btc' | 'ltc' | 'xmr' | 'sol'

interface CryptoPrice {
  eur: number
  symbol: string
  name: string
}

const IS_LIVE_MODE = process.env.NEXT_PUBLIC_PAYMENT_MODE === 'live'

const CRYPTO_OPTIONS: Array<{ value: CryptoAsset; label: string }> = [
  { value: 'btc', label: 'BTC' },
  { value: 'ltc', label: 'LTC' },
  { value: 'xmr', label: 'XMR' },
  { value: 'sol', label: 'SOL' },
]

const REVOLUT_COMING_SOON = true

export function CheckoutForm({ productSku, phoneModel, lockedPrice, total }: CheckoutFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('address')
  const [method, setMethod] = useState<PaymentMethod>('crypto')
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>('btc')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    region: '',
    postalCode: '',
    deliveryInstructions: '',
    recipientTaxId: '',
    country: 'DK',
  })
  const [reservationId, setReservationId] = useState<number | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [cryptoMeta, setCryptoMeta] = useState<{ asset: string; address: string; qrUrl: string; checkoutUrl?: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState<CouponApplied | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [payableTotal, setPayableTotal] = useState(total)
  const [cryptoPrices, setCryptoPrices] = useState<Record<CryptoAsset, CryptoPrice | null>>({
    btc: null,
    ltc: null,
    xmr: null,
    sol: null,
  })
  const [priceError, setPriceError] = useState(false)

  // Fetch live crypto prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setPriceError(false)
        const res = await fetch('/api/crypto-prices')
        if (!res.ok) throw new Error('Failed to fetch prices')
        const data = await res.json()
        setCryptoPrices(data)
      } catch (err) {
        console.error('Price fetch error:', err)
        setPriceError(true)
        // Set fallback prices
        setCryptoPrices({
          btc: { eur: 45000, symbol: '₿', name: 'BTC' },
          ltc: { eur: 90, symbol: 'Ł', name: 'LTC' },
          xmr: { eur: 150, symbol: '🔐', name: 'XMR' },
          sol: { eur: 140, symbol: '◎', name: 'SOL' },
        })
      }
    }
    fetchPrices()
    // Refresh prices every minute
    const interval = setInterval(fetchPrices, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/create-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSku,
          quantity: 1,
          customerName: form.name,
          customerEmail: form.email,
          country: normalizeCountryCode(form.country),
          shippingPhone: form.phone,
          shippingCompany: form.company,
          shippingAddressLine1: form.addressLine1,
          shippingAddressLine2: form.addressLine2,
          shippingCity: form.city,
          shippingRegion: form.region,
          shippingPostalCode: form.postalCode,
          deliveryInstructions: form.deliveryInstructions,
          recipientTaxId: form.recipientTaxId,
          paymentMethod: method,
          paymentAsset: method === 'crypto' ? cryptoAsset : null,
          couponCode: couponApplied?.code || undefined,
          sessionId: getSessionId(),
        }),
      })
      const data = await res.json()
      if (data.error) {
        if (data.error === 'invalid_coupon') {
          setError('Coupon is invalid, expired, or not eligible for this order amount.')
          return
        }
        if (data.error === 'live_crypto_not_configured') {
          setError('Live crypto is not configured yet. Please contact support before trying checkout.')
          return
        }
        if (data.error === 'revolut_coming_soon') {
          setError('Revolut Pro is not active yet. Please choose BTC, LTC, XMR, or SOL for now.')
          return
        }
        if (data.error === 'invalid_crypto_asset') {
          setError('Please choose one of the supported coins: BTC, LTC, XMR, or SOL.')
          return
        }
        setError('Could not reserve this unit. Please try again.')
        return
      }
      setReservationId(data.reservationId)
      setPaymentId(data.payment.id)
      if (data.lockedPrice) {
        setPayableTotal(Number(data.lockedPrice))
      }
      if (data.coupon?.code && data.coupon?.discountAmount != null) {
        setCouponApplied({
          code: String(data.coupon.code),
          discountAmount: Number(data.coupon.discountAmount),
          finalAmount: Number(data.lockedPrice),
        })
      }
      const meta = data.payment.meta as { asset: string; address: string; qrUrl: string }
      setCryptoMeta(meta)
      trackEvent({ type: 'checkout_start', sessionId: getSessionId() })
      setStep('payment')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!reservationId || !paymentId) return
    setLoading(true)
    setError(null)
    setStep('confirming')
    try {
      const res = await fetch('/api/checkout/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          paymentId,
          customerName: form.name,
          customerEmail: form.email,
          country: normalizeCountryCode(form.country),
          shippingPhone: form.phone,
          shippingCompany: form.company,
          shippingAddressLine1: form.addressLine1,
          shippingAddressLine2: form.addressLine2,
          shippingCity: form.city,
          shippingRegion: form.region,
          shippingPostalCode: form.postalCode,
          deliveryInstructions: form.deliveryInstructions,
          recipientTaxId: form.recipientTaxId,
        }),
      })
      const data = await res.json()
      if (data.error === 'price_changed') {
        setError(
          'The price changed while you were checking out. Please refresh and confirm the new price.'
        )
        setStep('payment')
        return
      }
      if (data.ok) {
        trackEvent({ type: 'purchase', sessionId: getSessionId() })
        router.push(`/checkout/success?order=${data.orderId}`)
        return
      }

      if (data.status === 'pending') {
        setError('Payment not detected yet. Wait for at least one network confirmation, then try again.')
        setStep('payment')
        return
      }

      if (data.error === 'live_crypto_not_configured') {
        setError('Live crypto is not configured yet. Please contact support before trying checkout.')
        setStep('payment')
        return
      }

      setError('Could not confirm payment yet. Please try again in a moment.')
      setStep('payment')
    } catch {
      setError('Payment confirmation failed. Please contact support.')
      setStep('payment')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateCrypto = async () => {
    if (!paymentId) return
    setLoading(true)
    try {
      await fetch('/api/checkout/simulate-crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })
      await handleConfirm()
    } finally {
      setLoading(false)
    }
  }

  const refreshPrices = async () => {
    try {
      setPriceError(false)
      const res = await fetch('/api/crypto-prices')
      if (!res.ok) throw new Error('Failed to fetch prices')
      const data = await res.json()
      setCryptoPrices(data)
    } catch (err) {
      console.error('Price refresh error:', err)
      setPriceError(true)
    }
  }

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase()
    if (!code) {
      setCouponApplied(null)
      setPayableTotal(total)
      return
    }

    setCouponLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: code, amount: total }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCouponApplied(null)
        setPayableTotal(total)
        setError('Coupon is invalid, expired, or not eligible for this order amount.')
        return
      }

      setCouponApplied({
        code: String(data.code),
        discountAmount: Number(data.discountAmount),
        finalAmount: Number(data.finalAmount),
      })
      setPayableTotal(Number(data.finalAmount))
      setCouponCode(String(data.code))
    } catch {
      setError('Could not validate coupon right now. Please try again.')
    } finally {
      setCouponLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Order summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">{phoneModel} (GrapheneOS)</span>
            <span className="text-white">€{lockedPrice}</span>
          </div>
          {couponApplied && (
            <div className="flex justify-between">
              <span className="text-slate-400">Coupon {couponApplied.code}</span>
              <span className="text-brand-400">-€{couponApplied.discountAmount}</span>
            </div>
          )}
          <div className="h-px bg-slate-800 my-2" />
          <div className="flex justify-between font-semibold text-white">
            <span>Total</span>
            <span>€{payableTotal}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Price locked at reservation. This is your guaranteed price.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Post-promo standard model is Pixel 9a at €800.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Step: address */}
      {step === 'address' && (
        <form onSubmit={handleAddressSubmit} className="space-y-4">
          <h2 className="font-semibold text-white">Shipping Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1" htmlFor="name">Full name</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="phone">Phone (required for delivery)</label>
            <input
              id="phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="company">Company (optional)</label>
            <input
              id="company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="address">Street address</label>
            <input
              id="address"
              required
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="address2">Address line 2 (optional)</label>
            <input
              id="address2"
              value={form.addressLine2}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1" htmlFor="city">City</label>
              <input
                id="city"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1" htmlFor="region">State/region (optional)</label>
              <input
                id="region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1" htmlFor="postal">Postal code</label>
              <input
                id="postal"
                required
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1" htmlFor="taxId">Tax ID / EORI (optional)</label>
              <input
                id="taxId"
                value={form.recipientTaxId}
                onChange={(e) => setForm({ ...form, recipientTaxId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="country">Country</label>
            <select
              id="country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            >
              {Object.entries(EUROPE_SHIPPING_COUNTRIES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="deliveryInstructions">Delivery instructions (optional)</label>
            <textarea
              id="deliveryInstructions"
              value={form.deliveryInstructions}
              onChange={(e) => setForm({ ...form, deliveryInstructions: e.target.value })}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-400">Payment method</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('crypto')}
                className={`border rounded-lg p-3 text-left transition-colors ${
                  method === 'crypto'
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <p className="text-white font-medium">Crypto</p>
                <p className="text-xs text-slate-400 mt-1">BTC, LTC, XMR, SOL</p>
              </button>

              <button
                type="button"
                disabled={REVOLUT_COMING_SOON}
                onClick={() => setMethod('revolut_pro')}
                className="border rounded-lg p-3 text-left border-slate-700 text-slate-500 cursor-not-allowed"
              >
                <p className="font-medium">Revolut Pro (Freelancer)</p>
                <p className="text-xs mt-1">Coming soon</p>
              </button>
            </div>

            {method === 'crypto' && (
              <div>
                <p className="text-sm text-slate-400 mb-2">Choose coin</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {CRYPTO_OPTIONS.map((coin) => (
                    <button
                      key={coin.value}
                      type="button"
                      onClick={() => setCryptoAsset(coin.value)}
                      className={`border rounded-lg py-2 text-sm font-medium transition-colors ${
                        cryptoAsset === coin.value
                          ? 'border-brand-500 bg-brand-500/10 text-white'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {coin.label}
                    </button>
                  ))}
                </div>
                {/* Show prices during coin selection */}
                <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                  {CRYPTO_OPTIONS.map((coin) => (
                    <div key={coin.value} className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        {cryptoPrices[coin.value]?.symbol} {coin.label}
                      </span>
                      <span className="text-slate-300 font-mono">
                        €{cryptoPrices[coin.value]?.eur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-sm text-slate-400">Coupon code (optional)</p>
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponLoading}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                {couponLoading ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {couponApplied && (
              <p className="text-xs text-brand-400">
                Applied {couponApplied.code}: -€{couponApplied.discountAmount}. New total €{couponApplied.finalAmount}.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-semibold transition-colors min-h-[44px]"
          >
            {loading ? 'Reserving...' : `Continue to Payment - €${payableTotal}`}
          </button>
        </form>
      )}

      {/* Step: payment */}
      {step === 'payment' && (
        <div className="space-y-5">
          <h2 className="font-semibold text-white">
            {cryptoMeta ? `${cryptoMeta.asset.toUpperCase()} Payment${IS_LIVE_MODE ? '' : ' (Sandbox)'}` : `Crypto Payment${IS_LIVE_MODE ? '' : ' (Sandbox)'}`}
          </h2>

          {cryptoMeta && cryptoPrices[cryptoAsset] && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              {!IS_LIVE_MODE ? (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-lg p-3">
                  <strong>Sandbox mode:</strong> Fake {cryptoMeta.asset.toUpperCase()} address — no real payment needed.
                </div>
              ) : (
                <div className="bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs rounded-lg p-3">
                  <strong>Live mode:</strong> Send the exact amount to the address below, then click verify.
                </div>
              )}

              {/* Live price display */}
              <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Live {cryptoAsset.toUpperCase()} Price</span>
                  <button
                    type="button"
                    onClick={refreshPrices}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    title="Refresh prices"
                  >
                    🔄 Refresh
                  </button>
                </div>
                {priceError && <span className="text-xs text-amber-500 block">⚠ Using fallback rate (live data unavailable)</span>}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {cryptoPrices[cryptoAsset]?.symbol}
                  </span>
                  <span className="text-3xl font-semibold text-white">
                    €{cryptoPrices[cryptoAsset]?.eur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-400 text-sm">/coin</span>
                </div>

                {/* Amount to send */}
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <div className="text-slate-400 text-sm mb-2">You need to send:</div>
                  <div className="flex items-baseline gap-2 bg-slate-900 rounded-lg p-3">
                    <span className="text-2xl font-bold text-brand-400">
                      {cryptoPrices[cryptoAsset]?.symbol}
                    </span>
                    <span className="text-2xl font-mono font-bold text-white">
                      {(payableTotal / (cryptoPrices[cryptoAsset]?.eur || 1)).toFixed(8)}
                    </span>
                    <span className="text-slate-500 text-sm ml-auto">
                      ≈ €{payableTotal}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cryptoMeta.qrUrl} alt="Crypto QR code" className="w-40 h-40 rounded-lg" />
                <p className="text-slate-400 text-xs font-mono break-all text-center">
                  {cryptoMeta.address}
                </p>
                {IS_LIVE_MODE && cryptoMeta.checkoutUrl && (
                  <a
                    href={cryptoMeta.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-400 hover:text-brand-300 underline"
                  >
                    Open BTCPay invoice page
                  </a>
                )}
              </div>

              {!IS_LIVE_MODE ? (
                <button
                  onClick={handleSimulateCrypto}
                  disabled={loading}
                  className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-semibold transition-colors min-h-[44px]"
                >
                  {loading ? 'Confirming…' : `Simulate ${cryptoMeta.asset.toUpperCase()} Payment Confirmed`}
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-semibold transition-colors min-h-[44px]"
                >
                  {loading ? 'Verifying…' : 'I have sent payment - Verify now'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'confirming' && (
        <div className="text-center py-10">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Confirming your payment…</p>
        </div>
      )}
    </div>
  )
}
