'use strict';

require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_SUBSCRIPTION_PLAN_ID = process.env.PAYPAL_SUBSCRIPTION_PLAN_ID || '';

if (PAYPAL_MODE === 'live' && (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET)) {
  console.error('FATAL: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in live mode.');
  process.exit(1);
}

const PAYPAL_BASE =
  PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const pageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// PayPal helpers
// ---------------------------------------------------------------------------

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(
    `${PAYPAL_BASE}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data.access_token;
}

// ---------------------------------------------------------------------------
// API: provide PayPal config to the client
// ---------------------------------------------------------------------------

app.get('/api/paypal/config', apiLimiter, (_req, res) => {
  res.json({
    clientId: PAYPAL_CLIENT_ID,
    subscriptionPlanId: PAYPAL_SUBSCRIPTION_PLAN_ID,
    mode: PAYPAL_MODE,
  });
});

// ---------------------------------------------------------------------------
// API: create a one-time order (birth chart $1.99)
// ---------------------------------------------------------------------------

app.post('/api/paypal/create-order', apiLimiter, async (req, res) => {
  try {
    const accessToken = await getPayPalAccessToken();

    const order = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '1.99',
            },
            description: 'Celestial Eye – Birth Chart Reading',
          },
        ],
        application_context: {
          brand_name: 'Celestial Eye',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${req.protocol}://${req.get('host')}/birth-chart.html`,
          cancel_url: `${req.protocol}://${req.get('host')}/`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ id: order.data.id });
  } catch (err) {
    console.error('PayPal create-order error:', err.response?.status, err.response?.data?.name);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ---------------------------------------------------------------------------
// API: capture a one-time order
// ---------------------------------------------------------------------------

app.post('/api/paypal/capture-order/:orderID', apiLimiter, async (req, res) => {
  const { orderID } = req.params;
  try {
    const accessToken = await getPayPalAccessToken();

    const capture = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(capture.data);
  } catch (err) {
    console.error('PayPal capture-order error:', err.response?.status, err.response?.data?.name);
    res.status(500).json({ error: 'Failed to capture order' });
  }
});

// ---------------------------------------------------------------------------
// Serve HTML pages
// ---------------------------------------------------------------------------

app.get('/', pageLimiter, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/birth-chart', pageLimiter, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'birth-chart.html'));
});

app.get('/success', pageLimiter, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Celestial Eye server running on port ${PORT}`);
});
