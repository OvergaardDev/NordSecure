# ----------------------------------------------------------------------------
# SHIPPING & ORDER TRACKING GUIDE
# ----------------------------------------------------------------------------

Complete guide for implementing shipping and order tracking functionality.

## ORDER STATUS WORKFLOW

Orders flow through these statuses:

pending
  ?
paid (automatic after successful payment)
  ?
shipped (admin updates after shipment)
  ?
delivered (admin receives carrier confirmation)
  ?
cancelled (can happen at any stage)

## ADMIN ORDER MANAGEMENT

### Access Admin Panel
1. Go to https://nordsecure.eu/admin
2. Login with ADMIN_PASSWORD
3. Navigate to Orders

### Order List View
Shows all orders with:
- Order number (ORD-YYYYMMDD-XXXXXXXX format)
- Customer name and email
- Order date and time
- Order status (color-coded)
- Total amount
- Payment method (Stripe or Crypto)

### Order Detail View
Click any order to see:

**Customer Information:**
- Name, email, phone
- Company (optional)
- Full shipping address
- Tax ID / EORI (for non-EU)
- Delivery instructions
- Payment method and asset

**Order Items:**
- Product SKU and name
- Quantity ordered
- Unit price (locked at purchase time)
- Line subtotal
- Total order amount with VAT

**Shipping Requirements:**
- Destination country
- Customs declaration required (EU vs non-EU)
- Required documentation checklist

**Order Actions:**
- Update status
- View payment details
- Resend confirmation email
- Export order details

## UPDATING ORDER STATUS

### From Admin Panel

1. Click order number
2. Scroll to "Update Status" section
3. Select new status from dropdown
4. Add optional note (e.g., tracking number)
5. Click \"Update\"
6. Automatic email sent to customer

### API Endpoint

\\\ash
curl -X POST https://nordsecure.eu/api/admin/orders/123 \\
  -H \"Content-Type: application/json\" \\
  -b \"admin_session=token\" \\
  -d '{
    \"status\": \"shipped\",
    \"trackingNumber\": \"DHL123456789\",
    \"carrier\": \"DHL\"
  }'
\\\

## SHIPPING CARRIER INTEGRATION

### DHL (Recommended for EU)

1. **Create DHL Account**
   - Go to https://www.dhl.com/business
   - Sign up for Developer API
   - Get API credentials

2. **Install DHL Integration**
   \\\ash
   npm install dhl-express
   \\\

3. **Configure Environment**
   \\\ash
   # .env.production
   DHL_API_KEY=your_api_key
   DHL_ACCOUNT_NUMBER=your_account_number
   \\\

4. **Create Shipment**
   \\\	ypescript
   // src/lib/shipping/dhl.ts
   import DHLClient from 'dhl-express';
   
   export async function createDHLShipment(order) {
     const client = new DHLClient({
       apiKey: process.env.DHL_API_KEY,
     });
     
     const shipment = await client.createShipment({
       shipper: {
         name: 'NordSecure',
         address: 'Vesterbro 1',
         city: 'Copenhagen',
         postalCode: '1620',
         country: 'DK'
       },
       recipient: {
         name: order.customerName,
         address: order.shippingAddressLine1,
         city: order.shippingCity,
         postalCode: order.shippingPostalCode,
         country: order.country
       },
       contents: order.items.map(item => ({
         description: item.product.name,
         quantity: item.quantity,
         weight: 0.5
       })),
       serviceType: 'PARCEL'
     });
     
     return shipment.trackingNumber;
   }
   \\\

### UPS (Optional)

\\\ash
npm install ups-api
\\\

### FedEx (Optional)

\\\ash
npm install fedex-rest-sdk
\\\

### EasyPost (Unified API for all carriers)

Recommended for supporting multiple carriers with single integration:

\\\ash
npm install @easypost/api
\\\

\\\	ypescript
// Use single API for DHL, UPS, FedEx, LaserShip, etc.
import EasyPost from '@easypost/api';

const client = new EasyPost(process.env.EASYPOST_API_KEY);

const shipment = await client.Shipment.create({
  to_address: { /* customer address */ },
  from_address: { /* your address */ },
  parcel: { /* package dimensions */ }
});

const label = await shipment.buy(shipment.lowestRate());
\\\

## TRACKING NUMBER MANAGEMENT

### Store Tracking Number

Update Order schema to store tracking info:

\\\prisma
model Order {
  // ... existing fields
  
  // Shipping tracking
  shippingCarrier String?     // e.g., \"DHL\", \"UPS\", \"FedEx\"
  trackingNumber String?      // e.g., \"1Z999AA10123456784\"
  shippingLabel String?       // URL to PDF label
  estimatedDelivery DateTime? // Carrier ETA
  
  // Track updates
  statusHistory   StatusHistory[]
  lastStatusAt    DateTime?
  lastStatusNote  String?
}

model StatusHistory {
  id        Int     @id @default(autoincrement())
  order     Order   @relation(fields: [orderId], references: [id])
  orderId   Int
  status    String  // pending | paid | shipped | delivered
  note      String?
  createdAt DateTime @default(now())
}
\\\

Run migration:
\\\ash
npx prisma migrate dev --name add_shipping_tracking
\\\

### API to Get Tracking

\\\ash
curl https://nordsecure.eu/api/orders/123/tracking \\
  -H \"Authorization: Bearer customer_token\"

Response:
{
  \"trackingNumber\": \"1Z999AA...\",
  \"carrier\": \"DHL\",
  \"status\": \"in_transit\",
  \"estimatedDelivery\": \"2026-06-25\",
  \"events\": [
    { \"status\": \"pending\", \"timestamp\": \"2026-06-23\", \"location\": \"Copenhagen\" },
    { \"status\": \"in_transit\", \"timestamp\": \"2026-06-23\", \"location\": \"Hamburg\" }
  ]
}
\\\

## EMAIL NOTIFICATIONS

### Automatic Emails

**Order Confirmation** (immediately after payment):
- Order number and date
- Customer name
- Item breakdown with prices
- Shipping address
- Expected delivery timeframe
- Payment method
- Support contact

**Shipping Notification** (when status changed to \"shipped\"):
- Order number
- Tracking number
- Carrier information
- Tracking URL link
- Estimated delivery date
- Signature requirements
- Delivery instructions applied

**Delivery Confirmation** (when status changed to \"delivered\"):
- Order confirmation
- Thank you message
- Leave review link
- Repeat order link

**Cancelled Order** (if order cancelled):
- Order number
- Cancellation reason (if provided)
- Refund status
- Support contact

### Custom Email Templates

Create email templates in src/lib/email/:

\\\	ypescript
// src/lib/email/templates/shipping-notification.ts
export function generateShippingEmail(order, tracking) {
  return \
    <h2>Your Order is Shipped!</h2>
    <p>Order \</p>
    <p>Tracking: <a href=...>\</a></p>
    <p>Carrier: \</p>
    <p>Estimated Delivery: \</p>
  \;
}
\\\

## CUSTOMER TRACKING PAGE

Create public tracking page for customers:

\\\	ypescript
// app/orders/[orderNumber]/page.tsx
export default async function OrderTrackingPage({ params }) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { items: { include: { product: true } } }
  });
  
  if (!order) return notFound();
  
  return (
    <div className=\"max-w-2xl\">
      <h1>Order {order.orderNumber}</h1>
      
      {/* Status Timeline */}
      <div className=\"my-8\">
        <OrderStatusTimeline order={order} />
      </div>
      
      {/* Tracking Info */}
      {order.trackingNumber && (
        <div className=\"bg-blue-50 p-4 rounded\">
          <h2>Tracking Information</h2>
          <p>Carrier: {order.shippingCarrier}</p>
          <p>Number: {order.trackingNumber}</p>
          <a href={generateTrackingUrl(order)}>Track on Carrier Website</a>
        </div>
      )}
      
      {/* Order Items */}
      <table className=\"w-full\">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map(item => (
            <tr key={item.id}>
              <td>{item.product.name}</td>
              <td>{item.quantity}</td>
              <td>€{item.unitPrice}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
\\\

## WEBHOOK INTEGRATION

### Receive Carrier Updates

Setup webhooks to receive shipping updates automatically:

\\\	ypescript
// app/api/webhooks/shipping/route.ts
import { verifyDHLWebhook } from '@/src/lib/shipping/dhl';

export async function POST(req: Request) {
  const payload = await req.json();
  
  // Verify webhook signature
  if (!verifyDHLWebhook(req, payload)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Update order status
  const order = await prisma.order.update({
    where: { trackingNumber: payload.trackingNumber },
    data: {
      status: mapCarrierStatusToOrderStatus(payload.status),
      lastStatusAt: new Date(),
      lastStatusNote: payload.description
    }
  });
  
  // Send customer email
  await sendShippingUpdateEmail(order, payload);
  
  return new Response('OK', { status: 200 });
}
\\\

Configure carrier webhooks:
1. DHL Developer Portal ? Webhooks
2. UPS: Developer Tools ? Webhooks
3. FedEx: Web Services ? Webhooks

Set endpoint to: https://nordsecure.eu/api/webhooks/shipping/[carrier]

## TESTING SHIPPING WORKFLOW

### Local Testing

\\\ash
# 1. Set demo mode
PAYMENT_MODE=demo npm run dev

# 2. Create test order
# Go to https://localhost:3000
# Complete checkout with demo payment

# 3. Admin panel
# Go to https://localhost:3000/admin
# Login with ADMIN_PASSWORD=admin (default)
# Find your test order

# 4. Update status
# Click order ? Change status to \"shipped\"
# Add tracking number (e.g., \"TRACK123\")
# Verify customer email sent

# 5. Check customer email
# If using Mailhog: http://localhost:8025
# If using MailCatcher: http://localhost:1080
# Look for \"Your order has shipped\" email
\\\

### Production Testing

\\\ash
# 1. With real payment (Stripe test card)
# 4242 4242 4242 4242

# 2. Verify order in admin panel
# https://nordsecure.eu/admin/orders

# 3. Test real shipping provider
# Create actual test shipment with DHL/UPS/FedEx
# Get real tracking number

# 4. Update order with real tracking
# Verify tracking email sent to real customer email
# Check carrier website tracking updates

# 5. Verify webhook updates
# Wait for carrier to send shipping updates
# Verify automatic status changes in admin
\\\

## MONITORING & ALERTS

Setup alerts for shipping issues:

**Failed Shipments:**
- Order status stuck in \"paid\" for >24h
- Tracking number missing after 48h
- Carrier reports delivery failed

**Email Alerts:**
1. Set up Sentry for errors
2. Monitor Stripe webhooks
3. Monitor carrier webhooks
4. Log slow carrier API calls

\\\	ypescript
// src/lib/shipping/monitoring.ts
export async function monitorShippingHealth() {
  // Check for orders awaiting shipment
  const awaitingShipment = await prisma.order.findMany({
    where: {
      status: 'paid',
      createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  
  if (awaitingShipment.length > 0) {
    console.error(\?? \ orders awaiting shipment for >24h\);
    // Send alert to admin email
  }
}
\\\

## TROUBLESHOOTING

**\"Tracking number not updating\"**
? Check webhook configuration in carrier dashboard
? Verify API keys are correct
? Check firewall allows carrier webhook IPs

**\"Email not sent to customer\"**
? Verify email configuration
? Check spam folder
? Review email logs

**\"Order status stuck\"**
? Admin can manually update status
? Check for validation errors in browser console
? Review server logs for errors

## SUPPORT

For carrier-specific issues:
- DHL: https://developer.dhl.com/
- UPS: https://www.ups.com/upsdeveloperkit
- FedEx: https://developer.fedex.com/
- EasyPost: https://www.easypost.com/docs

For questions about implementation:
- See docs/PRODUCTION_SETUP.md
- Check src/lib/shipping.ts for examples
- Review test cases in tests/checkout-flow.test.ts
