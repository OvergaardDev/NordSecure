import nodemailer from 'nodemailer'

function getTransport() {
  const mode = process.env.NEXT_PUBLIC_PAYMENT_MODE || 'demo'
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
  isTest: boolean
) {
  const transport = getTransport()
  const subject = isTest
    ? `[TEST] Order confirmed: ${orderNumber}`
    : `Order confirmed: ${orderNumber}`
  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'orders@nordsecure.shop',
    to: email,
    subject,
    html: `
      <h2>Thank you for your order!</h2>
      <p>Order number: <strong>${orderNumber}</strong></p>
      <p>Total paid: <strong>€${total}</strong></p>
      ${isTest ? '<p><em>⚠️ This is a test order — no real payment was taken.</em></p>' : ''}
      <p>Your device will ship within 3–5 business days.</p>
      <p>Questions? Reply to this email.</p>
    `,
  })
}
