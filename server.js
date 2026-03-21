'use strict';

require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_SUBSCRIPTION_PLAN_ID = process.env.PAYPAL_SUBSCRIPTION_PLAN_ID || '';
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------

function log(level, event, data) {
  const entry = Object.assign(
    { ts: new Date().toISOString(), level, event, mode: PAYPAL_MODE },
    data || {}
  );
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ---------------------------------------------------------------------------
// Startup: validate credentials and guard against environment mixing
// ---------------------------------------------------------------------------

const PLACEHOLDER_ID     = 'your_paypal_client_id_here';
const PLACEHOLDER_SECRET = 'your_paypal_client_secret_here';
const PLACEHOLDER_PLAN   = 'your_subscription_plan_id_here';

const missingCredentials = [];
if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === PLACEHOLDER_ID) {
  missingCredentials.push('PAYPAL_CLIENT_ID');
}
if (!PAYPAL_CLIENT_SECRET || PAYPAL_CLIENT_SECRET === PLACEHOLDER_SECRET) {
  missingCredentials.push('PAYPAL_CLIENT_SECRET');
}

if (missingCredentials.length > 0) {
  if (PAYPAL_MODE === 'live') {
    log('error', 'startup:fatal', {
      message: 'Missing required environment variables for live mode',
      missing: missingCredentials,
      hint: 'Set these in your .env file (see .env.example) or in your hosting platform environment settings.',
    });
    process.exit(1);
  } else {
    log('warn', 'startup:incomplete', {
      message: 'PayPal setup incomplete – payment buttons will show a configuration message',
      missing: missingCredentials,
      hint: 'Copy .env.example to .env and fill in your PayPal credentials.',
    });
  }
}

// Hard guardrail: if live mode but Client ID appears to be a sandbox credential, refuse to start
if (PAYPAL_MODE === 'live' && PAYPAL_CLIENT_ID) {
  const idLower = PAYPAL_CLIENT_ID.toLowerCase();
  if (idLower.includes('sandbox') || idLower.includes('test')) {
    log('error', 'startup:env-mismatch', {
      message: 'PAYPAL_MODE is "live" but PAYPAL_CLIENT_ID appears to be a sandbox credential. Refusing to start.',
      hint: 'Use your Live Client ID when PAYPAL_MODE=live.',
    });
    process.exit(1);
  }
}

if (!PAYPAL_SUBSCRIPTION_PLAN_ID || PAYPAL_SUBSCRIPTION_PLAN_ID === PLACEHOLDER_PLAN) {
  log('warn', 'startup:no-plan', { message: 'PAYPAL_SUBSCRIPTION_PLAN_ID not set – subscription payments will be unavailable.' });
}

if (!PAYPAL_WEBHOOK_ID) {
  log('warn', 'startup:no-webhook', {
    message: 'PAYPAL_WEBHOOK_ID not set – webhook signature verification will be skipped (unsafe for production).',
  });
}

log('info', 'startup:ok', { port: PORT, mode: PAYPAL_MODE });

const PAYPAL_BASE =
  PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const { recordPaidOrder, hasInMemoryAccess, PAYPAL_ORDER_ID_PATTERN } = require('./lib/entitlement');

// ---------------------------------------------------------------------------
// In-memory webhook event log (dedup + audit trail)
// Replace with a database store in a production environment with persistence.
// ---------------------------------------------------------------------------

const webhookEventLog = new Map(); // eventId → { receivedAt, eventType, summary }

function recordWebhookEvent(eventId, eventType, summary) {
  webhookEventLog.set(eventId, {
    receivedAt: new Date().toISOString(),
    eventType,
    summary: summary || {},
  });
  // Bound memory usage to the most recent 1000 events
  if (webhookEventLog.size > 1000) {
    const oldestKey = webhookEventLog.keys().next().value;
    webhookEventLog.delete(oldestKey);
  }
}

// ---------------------------------------------------------------------------
// Middleware – security headers
// ---------------------------------------------------------------------------

app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://www.paypal.com https://*.paypal.com 'unsafe-inline'",
      "frame-src 'self' https://www.paypal.com https://*.paypal.com",
      "connect-src 'self' https://www.paypal.com https://*.paypal.com",
      "img-src 'self' data: https:",
      // Google Fonts stylesheets + self inline styles
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
      // Google Fonts webfont files
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-ancestors 'self'",
    ].join('; ')
  );
  if (PAYPAL_MODE === 'live') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});

// NOTE: express.json() must NOT run before the webhook endpoint so that
// express.raw() at route level can capture the unmodified bytes for
// signature verification. The webhook route is registered later, before
// this global parser, using express.raw() directly on the route.
// We skip global JSON parsing only for the webhook path.
app.use((req, res, next) => {
  if (req.path === '/api/paypal/webhook') return next();
  express.json({ limit: '1mb' })(req, res, next);
});
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

// Separate limiter for the webhook endpoint – generous limit since PayPal
// can send bursts, but still protects against abuse/flooding.
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
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

/** Short correlation ID – surfaced in logs and client error messages */
function makeCorrelationId() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
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
// API: create a one-time order  (idempotency via PayPal-Request-Id header)
// ---------------------------------------------------------------------------

app.post('/api/paypal/create-order', apiLimiter, async (req, res) => {
  const correlationId = makeCorrelationId();
  // Accept an idempotency key from the client so retries are safe
  const idempotencyKey = req.headers['paypal-request-id'] || correlationId;

  log('info', 'create-order:start', { correlationId, idempotencyKey });

  try {
    const accessToken = await getPayPalAccessToken();

    const order = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: 'USD', value: '1.99' },
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
          'PayPal-Request-Id': idempotencyKey,
        },
      }
    );

    log('info', 'create-order:ok', { correlationId, orderId: order.data.id });
    res.json({ id: order.data.id, correlationId });
  } catch (err) {
    log('error', 'create-order:fail', {
      correlationId,
      status: err.response?.status,
      paypalError: err.response?.data?.name,
      message: err.message,
    });
    res.status(500).json({ error: 'Failed to create order', correlationId });
  }
});

// ---------------------------------------------------------------------------
// API: capture a one-time order
// ---------------------------------------------------------------------------

app.post('/api/paypal/capture-order/:orderID', apiLimiter, async (req, res) => {
  const { orderID } = req.params;
  const correlationId = makeCorrelationId();

  // Validate orderID format before hitting PayPal
  if (!PAYPAL_ORDER_ID_PATTERN.test(orderID)) {
    log('warn', 'capture-order:invalid-id', { correlationId, orderID });
    return res.status(400).json({ error: 'Invalid order ID', correlationId });
  }

  log('info', 'capture-order:start', { correlationId, orderID });

  try {
    const accessToken = await getPayPalAccessToken();

    const capture = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `capture-${orderID}`,
        },
      }
    );

    log('info', 'capture-order:ok', {
      correlationId,
      orderID,
      captureStatus: capture.data.status,
    });

    // Grant full birth chart access for this order ID so /api/verify-access
    // can confirm the entitlement without another PayPal round-trip.
    if (capture.data.status === 'COMPLETED') {
      recordPaidOrder(orderID);
    }

    res.json(Object.assign({}, capture.data, { correlationId }));
  } catch (err) {
    log('error', 'capture-order:fail', {
      correlationId,
      orderID,
      status: err.response?.status,
      paypalError: err.response?.data?.name,
      message: err.message,
    });
    res.status(500).json({ error: 'Failed to capture order', correlationId });
  }
});

// ---------------------------------------------------------------------------
// API: verify that a one-time order grants full birth chart access
// ---------------------------------------------------------------------------

/**
 * GET /api/verify-access?orderID=<id>
 *
 * Fast path  – checks the in-memory grant cache populated at capture time.
 * Slow path  – if not cached (e.g. after a server restart), verifies the order
 *              status directly against the PayPal Orders API and re-populates
 *              the cache on success so subsequent calls are instant.
 *
 * Always returns JSON { hasAccess: boolean }.
 */
app.get('/api/verify-access', apiLimiter, async (req, res) => {
  const rawId = (req.query.orderID || '').toString().trim();

  // Reject anything that doesn't look like a PayPal order ID.
  if (!PAYPAL_ORDER_ID_PATTERN.test(rawId)) {
    return res.json({ hasAccess: false });
  }

  // Fast path: already recorded in memory.
  if (hasInMemoryAccess(rawId)) {
    return res.json({ hasAccess: true });
  }

  // Slow path: server may have restarted – re-validate against PayPal.
  try {
    const accessToken = await getPayPalAccessToken();
    const order = await axios.get(
      `${PAYPAL_BASE}/v2/checkout/orders/${rawId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const completed = order.data.status === 'COMPLETED';
    if (completed) {
      recordPaidOrder(rawId); // warm the cache for subsequent requests
    }
    return res.json({ hasAccess: completed });
  } catch (err) {
    log('warn', 'verify-access:paypal-error', { rawId, message: err.message });
    return res.json({ hasAccess: false });
  }
});

// ---------------------------------------------------------------------------
// API: PayPal Webhooks
// ---------------------------------------------------------------------------

/**
 * Verify webhook signature via the PayPal verification API.
 * Returns true when the signature is valid (or when PAYPAL_WEBHOOK_ID is not
 * configured, for local sandbox development only).
 */
async function verifyWebhookSignature(req, rawBody) {
  if (!PAYPAL_WEBHOOK_ID) {
    log('warn', 'webhook:skip-verify', {
      message: 'PAYPAL_WEBHOOK_ID not set – skipping signature verification (dev only)',
    });
    return true;
  }

  try {
    const accessToken = await getPayPalAccessToken();

    const verifyPayload = {
      auth_algo: req.headers['paypal-auth-algo'],
      cert_url: req.headers['paypal-cert-url'],
      transmission_id: req.headers['paypal-transmission-id'],
      transmission_sig: req.headers['paypal-transmission-sig'],
      transmission_time: req.headers['paypal-transmission-time'],
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody),
    };

    const verifyRes = await axios.post(
      `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
      verifyPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return verifyRes.data.verification_status === 'SUCCESS';
  } catch (err) {
    log('error', 'webhook:verify-error', { message: err.message });
    return false;
  }
}

// Webhook endpoint uses raw body parser so we can pass the unmodified bytes to the verification API
app.post(
  '/api/paypal/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    const correlationId = makeCorrelationId();
    const rawBody = req.body.toString('utf8');

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      log('warn', 'webhook:parse-fail', { correlationId });
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const eventId = event.id;
    const eventType = event.event_type;

    // Deduplicate: acknowledge already-processed events without re-handling
    if (eventId && webhookEventLog.has(eventId)) {
      log('info', 'webhook:duplicate', { correlationId, eventId, eventType });
      return res.status(200).json({ status: 'duplicate' });
    }

    // Verify signature
    const valid = await verifyWebhookSignature(req, rawBody);
    if (!valid) {
      log('warn', 'webhook:invalid-signature', { correlationId, eventId, eventType });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Record event before processing to prevent duplicate handling on retry
    if (eventId) {
      recordWebhookEvent(eventId, eventType, { resourceId: event.resource && event.resource.id });
    }

    log('info', 'webhook:received', {
      correlationId,
      eventId,
      eventType,
      resourceId: event.resource && event.resource.id,
    });

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        log('info', 'webhook:capture-completed', {
          correlationId,
          captureId: event.resource && event.resource.id,
          amount: event.resource && event.resource.amount,
        });
        break;

      case 'BILLING.SUBSCRIPTION.CREATED':
        log('info', 'webhook:subscription-created', {
          correlationId,
          subscriptionId: event.resource && event.resource.id,
          planId: event.resource && event.resource.plan_id,
        });
        break;

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        log('info', 'webhook:subscription-activated', {
          correlationId,
          subscriptionId: event.resource && event.resource.id,
        });
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        log('info', 'webhook:subscription-cancelled', {
          correlationId,
          subscriptionId: event.resource && event.resource.id,
        });
        break;

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        log('warn', 'webhook:subscription-payment-failed', {
          correlationId,
          subscriptionId: event.resource && event.resource.id,
        });
        break;

      default:
        log('info', 'webhook:unhandled-event-type', { correlationId, eventType });
    }

    res.status(200).json({ status: 'ok' });
  }
);

// ---------------------------------------------------------------------------
// Serve HTML pages
// ---------------------------------------------------------------------------

app.get('/', pageLimiter, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/birth-chart', pageLimiter, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'birth-chart.html'));
});

app.get('/success', pageLimiter, (req, res) => {
  // Sanitise query param to prevent unexpected values being reflected in JS
  const rawType = new URLSearchParams(req.url.split('?')[1] || '').get('type') || '';
  if (rawType && !['chart', 'subscription'].includes(rawType)) {
    return res.redirect(302, '/success');
  }
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  log('info', 'server:listening', { port: PORT });
});
