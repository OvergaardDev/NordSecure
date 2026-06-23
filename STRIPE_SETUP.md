# Stripe Integration Setup Guide

## Overview
Stripe has been integrated as an alternative payment method alongside cryptocurrency (Bitcoin). Users can now choose between:
- **Crypto**: Bitcoin (BTC) (via BTCPay Server)
- **Stripe**: Credit/Debit Card payments

## Current Status
- ✅ Stripe button added to checkout form
- ✅ Payment provider abstraction layer updated
- ✅ Placeholder environment variables added to `.env`
- ⏳ **PENDING**: Add your actual Stripe API keys

## Files Modified
1. **components/CheckoutForm.tsx**
   - Replaced "Revolut Pro (Freelancer)" button with "Stripe" button
   - Added conditional rendering for Stripe payment form UI
   - Displays test card info in sandbox mode

2. **src/lib/paymentProvider.ts**
   - Added `StripeDemo` class implementing `PaymentProvider` interface
   - Added `getStripeProvider()` function
   - Currently uses demo/sandbox implementation

3. **app/api/checkout/create-reservation/route.ts**
   - Updated to handle both `crypto` and `stripe` payment methods
   - Routes to appropriate provider based on payment method

4. **app/api/checkout/confirm-payment/route.ts**
   - Updated to verify payments using correct provider
   - Handles both crypto and stripe verification

## Next Steps: Add Real Stripe Keys

### 1. Get Your Stripe API Keys
1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API Keys**
3. Copy your:
   - **Publishable Key** (starts with `pk_live_` or `pk_test_`)
   - **Secret Key** (starts with `sk_live_` or `sk_test_`)

### 2. Update Production .env
SSH into the server and edit `/var/www/nordsecure/.env`:

```bash
ssh -i ~/.ssh/hetzner_nordsecure root@178.105.218.169
cd /var/www/nordsecure
nano .env
```

Replace the placeholder values:
```env
# OLD (placeholder)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_KEY
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_KEY

# NEW (your actual keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_KEY_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_KEY_HERE
```

### 3. Implement Full Stripe Payment Flow
The current implementation uses `StripeDemo` which is a sandbox stub. To go live with real Stripe payments:

**File to update:** `src/lib/paymentProvider.ts`

Replace the `StripeDemo` class body with real Stripe API calls:

```typescript
import Stripe from 'stripe'

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    })
  }

  async createPayment(
    amount: number,
    currency = 'EUR',
    metadata?: Record<string, unknown>
  ): Promise<PaymentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency: currency.toLowerCase(),
      metadata: metadata as Record<string, string>,
    })

    return {
      id: intent.id,
      method: 'stripe',
      amount,
      currency,
      status: 'pending',
      isTest: false,
      meta: {
        clientSecret: intent.client_secret,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      },
    }
  }

  async verifyPayment(id: string): Promise<PaymentResult | null> {
    const intent = await this.stripe.paymentIntents.retrieve(id)
    
    const statusMap: Record<string, PaymentStatus> = {
      succeeded: 'paid',
      processing: 'pending',
      requires_payment_method: 'pending',
      canceled: 'failed',
    }

    return {
      id,
      method: 'stripe',
      amount: intent.amount / 100,
      currency: (intent.currency || 'eur').toUpperCase(),
      status: statusMap[intent.status] || 'pending',
      isTest: false,
    }
  }

  async refundPayment(id: string): Promise<boolean> {
    const refund = await this.stripe.refunds.create({ payment_intent: id })
    return refund.status === 'succeeded'
  }
}
```

### 4. Install Stripe Package
```bash
cd /var/www/nordsecure
npm install stripe
```

### 5. Update CheckoutForm Frontend
Currently shows placeholder "Card payment form loads here...". You'll need to:

1. Add `@stripe/react-stripe-js` package:
```bash
npm install @stripe/react-stripe-js @stripe/js
```

2. Update `components/CheckoutForm.tsx` to use Stripe.js Elements:
```typescript
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

// In your Stripe payment section:
const stripe = useStripe()
const elements = useElements()

const handleStripePayment = async () => {
  if (!stripe || !elements) return
  const cardElement = elements.getElement(CardElement)
  // Process payment using stripe.confirmPayment()
}
```

### 6. Rebuild and Deploy
```bash
ssh -i ~/.ssh/hetzner_nordsecure root@178.105.218.169 "cd /var/www/nordsecure && npm run build && pm2 restart nordsecure"
```

## Testing

### Sandbox/Test Mode
Use these test card numbers (any expiry date, any CVC):
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Require Auth**: 4000 0025 0000 3155

### Live Mode
Once you're ready to accept real payments:
1. Switch Stripe keys from `pk_test_` to `pk_live_`
2. Set `NEXT_PUBLIC_PAYMENT_MODE=live` in `.env`
3. Make sure your Stripe account is in live mode

## Current Limitation
The frontend currently shows "Card payment form loads here..." as a placeholder because the full Stripe Elements integration requires additional frontend setup. The backend API structure is ready to handle Stripe payments once the frontend form is completed.

## Support
For questions about Stripe integration:
- Stripe Docs: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
