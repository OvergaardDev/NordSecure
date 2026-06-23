import nodemailer from 'nodemailer'
import { getPaymentMode } from '@/src/lib/runtimeMode'

function getTransport() {
  const mode = getPaymentMode()
  if (mode !== 'live') {
    // Demo: mailcatcher on localhost:1025 (or Mailhog)
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      ignoreTLS: true,
    })
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  })
}

export async function sendOrderConfirmation(
  email: string,
  orderNumber: string,
  total: number,
  isTest: boolean,
  orderData?: {
    customerName: string
    items: Array<{ productName: string; quantity: number; unitPrice: number }>
    paymentMethod: string
    shippingAddress: {
      addressLine1: string
      addressLine2?: string
      city: string
      region: string
      postalCode: string
      country: string
    }
  }
) {
  const transport = getTransport()
  const subject = isTest
    ? `[TEST] Order confirmed: ${orderNumber}`
    : `Order confirmed: ${orderNumber}`

  const itemsHtml = orderData?.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.productName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">€${item.unitPrice.toFixed(2)}</td>
        </tr>`
    )
    .join('') || ''

  const addressHtml = orderData
    ? `<div style="background: #f9fafb; padding: 16px; border-radius: 6px; border-left: 3px solid #10b981;">
        <p style="margin: 0 0 8px 0;"><strong>${orderData.customerName}</strong></p>
        <p style="margin: 0 0 8px 0;">${orderData.shippingAddress.addressLine1}</p>
        ${orderData.shippingAddress.addressLine2 ? `<p style="margin: 0 0 8px 0;">${orderData.shippingAddress.addressLine2}</p>` : ''}
        <p style="margin: 0 0 8px 0;">${orderData.shippingAddress.postalCode} ${orderData.shippingAddress.city}</p>
        <p style="margin: 0;">${orderData.shippingAddress.region || ''} ${orderData.shippingAddress.country}</p>
      </div>`
    : ''

  const paymentMethodText = orderData
    ? orderData.paymentMethod === 'stripe'
      ? 'Credit/Debit Card (Stripe)'
      : 'Bitcoin (BTC)'
    : ''

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .section { margin-bottom: 25px; }
    .section h2 { font-size: 16px; font-weight: 600; color: #1f2937; margin-top: 0; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 12px; background-color: #f3f4f6; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    .total-row { font-weight: 600; font-size: 16px; background-color: #f9fafb; }
    .badge { display: inline-block; padding: 4px 12px; background-color: #dbeafe; color: #0369a1; font-size: 12px; font-weight: 600; border-radius: 4px; }
    .footer { color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Order Confirmed!</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Your order has been received and payment is confirmed.</p>
    </div>

    ${itemsHtml ? `<div class="section">
      <h2>Order Details</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="2">Total</td>
            <td style="text-align: right;">€${total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>` : `<div class="section">
      <h2>Order Summary</h2>
      <p>Total paid: <strong>€${total.toFixed(2)}</strong></p>
    </div>`}

    <div class="section">
      <h2>Order Number</h2>
      <p style="font-size: 18px; font-weight: 600; color: #10b981; margin: 0;"><span class="badge">${orderNumber}</span></p>
    </div>

    ${addressHtml ? `<div class="section">
      <h2>Shipping Address</h2>
      ${addressHtml}
    </div>` : ''}

    ${paymentMethodText ? `<div class="section">
      <h2>Payment Method</h2>
      <p style="margin: 0;">${paymentMethodText}</p>
    </div>` : ''}

    <div class="section">
      <h2>What's Next?</h2>
      <p>Your order is being prepared for shipment. You'll receive a tracking number via email as soon as it's on its way.</p>
      <p><strong>Expected delivery:</strong> 3–5 business days within the EU.</p>
      <p>If you have any questions, feel free to reply to this email or contact us at support@nordsecure.eu.</p>
    </div>

    <div class="section">
      <p style="margin: 0; color: #6b7280; font-size: 13px;">
        <strong>Important:</strong> You have a <strong>14-day right of withdrawal</strong> under EU consumer law. 
        To exercise this right, contact us within 14 days. Return shipping is at your cost.
      </p>
    </div>

    ${isTest ? `<div class="section" style="background: #fef3c7; border-left: 3px solid #f59e0b; padding: 16px; border-radius: 6px;">
      <p style="margin: 0; color: #92400e;"><strong>⚠️ Test Order:</strong> This is a test order — no real payment was taken and no device will be shipped.</p>
    </div>` : ''}

    <div class="footer">
      <p style="margin: 0 0 10px 0;">NordSecure — Privacy-first Pixel phones, operated in the EU</p>
      <p style="margin: 0;">© 2026 NordSecure. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'orders@nordsecure.eu',
      to: email,
      subject,
      html: htmlContent,
    })
    console.log(`✓ Order confirmation email sent to ${email}`)
    return { success: true }
  } catch (error) {
    console.error(`✗ Failed to send email to ${email}:`, error)
    return { success: false, error }
  }
}
