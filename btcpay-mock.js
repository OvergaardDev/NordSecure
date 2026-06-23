// Lightweight BTCPay Mock Server for NordSecure
// Provides essential /api/v1/stores API endpoints for crypto payment testing
// Drop-in replacement while full BTCPay is configured

const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, req.body ? `body: ${JSON.stringify(req.body).substring(0, 100)}` : '');
  next();
});

// Configuration
const MOCK_STORE_ID = '69UNquZ2ikQpGmxdPKZDUdUxZZvsDTmat717MZCncwqU';
const MOCK_API_KEY = 'f3613bafc177373b43d5c9682b94dc20e2eca906';
const BTC_PRICE = 54615; // EUR per BTC (example)

// In-memory invoice storage
const invoices = new Map();

// Middleware: API Key validation
const validateApiKey = (req, res, next) => {
  // For testing: allow all requests (can add auth back later)
  next();
};

// GET /api/v1/stores/{storeId} - Verify store exists
app.get('/api/v1/stores/:storeId', validateApiKey, (req, res) => {
  if (req.params.storeId !== MOCK_STORE_ID) {
    return res.status(404).json({ error: 'Store not found' });
  }
  
  res.json({
    id: MOCK_STORE_ID,
    name: 'NordSecure Store',
    website: 'https://nordsecure.eu',
    storeName: 'NordSecure',
    invoiceExpiration: 900,
    displayExpirationTimer: 900,
    networkFeeMode: 'multiplePercentage',
    anyoneCanCreateInvoice: false,
    requiresRefundEmail: false,
    lightningAmountInSatoshi: false,
    lightningPrivateRouting: false,
    lightningDescriptionHashOnly: false,
    customLogo: null,
    customBranding: null,
    htmlTitle: 'NordSecure',
    cssLink: null,
    soundFile: null,
    onchainWithLnInvoicesFallback: false,
    lazyPaymentMethods: true,
    redirectURL: 'https://nordsecure.eu',
    defaultCurrency: 'EUR',
    email: 'admin@nordsecure.eu',
    itemDesc: null,
    itemName: null,
    defaultLang: 'en',
    showRecommendedFee: true,
    recommendedFeeBlockTarget: 1,
    monthlyVolumeLimitAmount: null,
    monthlyVolumeLimitCurrency: null,
    invoiceExpirationType: 'ExpireOnSinglePaymentConfirmation'
  });
});

// POST /api/v1/stores/{storeId}/invoices - Create invoice
app.post('/api/v1/stores/:storeId/invoices', validateApiKey, (req, res) => {
  if (req.params.storeId !== MOCK_STORE_ID) {
    return res.status(404).json({ error: 'Store not found' });
  }
  
  const { amount, currency, orderId, buyerEmail, buyerName, itemDesc, itemName, notificationURL, redirectURL } = req.body || {};
  
  if (!amount || !currency) {
    return res.status(400).json({ error: 'Missing amount or currency' });
  }
  
  // Generate invoice ID
  const invoiceId = crypto.randomBytes(16).toString('hex').substring(0, 20).toUpperCase();
  
  // Calculate BTC amount
  let btcAmount;
  if (currency.toUpperCase() === 'BTC') {
    btcAmount = amount;
  } else if (currency.toUpperCase() === 'EUR') {
    btcAmount = (amount / BTC_PRICE).toFixed(8);
  } else {
    btcAmount = (amount / 100).toFixed(8); // Fallback
  }
  
  // Generate payment address (mock)
  const paymentAddress = `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`;
  
  const invoice = {
    id: invoiceId,
    storeId: MOCK_STORE_ID,
    orderId: orderId || invoiceId,
    amount: parseFloat(amount),
    currency: currency.toUpperCase(),
    status: 'New',
    exceptionStatus: null,
    paymentSubstatus: null,
    expirationTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    monitoringExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    transactionSpeed: 'medium',
    payments: [],
    addresses: {
      BTC: paymentAddress
    },
    paymentCurrencies: ['BTC'],
    paymentSubTotals: {
      BTC: btcAmount
    },
    paymentTotals: {
      BTC: btcAmount
    },
    amountPaid: 0,
    itemDesc: itemDesc || 'NordSecure Purchase',
    itemName: itemName || 'Product',
    rate: BTC_PRICE,
    invoiceTime: new Date().toISOString(),
    universalCodes: {
      BTC: `bitcoin:${paymentAddress}?amount=${btcAmount}`
    },
    supportedTransactionCurrencies: {
      BTC: true
    },
    buyerEmail: buyerEmail,
    buyerName: buyerName,
    notificationURL: notificationURL,
    redirectURL: redirectURL || 'https://nordsecure.eu',
    token: crypto.randomBytes(32).toString('hex')
  };
  
  invoices.set(invoiceId, invoice);
  
  // Auto-resolve after 10 minutes (mock paid status for testing)
  setTimeout(() => {
    if (invoices.has(invoiceId)) {
      const inv = invoices.get(invoiceId);
      inv.status = 'Confirmed';
      inv.amountPaid = inv.paymentTotals.BTC;
      inv.payments = [{
        type: 'BTC',
        amount: inv.paymentTotals.BTC,
        address: paymentAddress,
        transactions: [{ id: crypto.randomBytes(32).toString('hex'), confirmations: 1 }]
      }];
    }
  }, 10 * 60 * 1000);
  
  res.status(200).json(invoice);
});

// GET /api/v1/stores/{storeId}/invoices/{invoiceId} - Get invoice status
app.get('/api/v1/stores/:storeId/invoices/:invoiceId', validateApiKey, (req, res) => {
  if (req.params.storeId !== MOCK_STORE_ID) {
    return res.status(404).json({ error: 'Store not found' });
  }
  
  const invoice = invoices.get(req.params.invoiceId);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  res.json(invoice);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'BTCPay Mock', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.BTCPAY_MOCK_PORT || 3001;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`BTCPay Mock Server running on http://127.0.0.1:${PORT}`);
  console.log(`Store ID: ${MOCK_STORE_ID}`);
  console.log(`API Key: ${MOCK_API_KEY}`);
  console.log(`BTC Price: ${BTC_PRICE} EUR`);
});
