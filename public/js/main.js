/* Celestial Eye – main.js
   Landing page interactivity: starfield, FAQ accordion, PayPal buttons */
'use strict';

// ── Footer year ────────────────────────────────────────────
const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ── Starfield ──────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  const NUM = 200;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  function mkStar() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.002 + 0.001,
      phase: Math.random() * Math.PI * 2,
    };
  }
  function initStars() { stars = Array.from({ length: NUM }, mkStar); }
  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const a = s.alpha * (0.55 + 0.45 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(248,250,252,${a.toFixed(3)})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', () => { resize(); initStars(); });
  resize(); initStars(); requestAnimationFrame(draw);
}());

// ── FAQ accordion ──────────────────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling;
    const isOpen = answer.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
    document.querySelectorAll('.faq-question').forEach(b => b.setAttribute('aria-expanded', 'false'));
    // Toggle clicked
    if (!isOpen) {
      answer.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ── PayPal container references ────────────────────────────
const chartPayBtn = document.getElementById('chart-pay-btn');
const subPayBtn   = document.getElementById('sub-pay-btn');
const ppChartContainer = document.getElementById('paypal-button-container');
const ppSubContainer   = document.getElementById('paypal-subscription-container');

// Initially hide PayPal containers (shown only on CTA click)
if (ppChartContainer) ppChartContainer.style.display = 'none';
if (ppSubContainer)   ppSubContainer.style.display   = 'none';

// ── Status / error helpers ─────────────────────────────────

/**
 * Show a status message inside a container element.
 * @param {HTMLElement} container
 * @param {'loading'|'error'|'info'} type
 * @param {string} message
 */
function setStatus(container, type, message) {
  if (!container) return;
  let el = container.querySelector('.pp-status-msg');
  if (!el) {
    el = document.createElement('p');
    el.className = 'pp-status-msg';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    container.prepend(el);
  }
  el.className = 'pp-status-msg pp-status-' + type;
  el.textContent = message;
}

function clearStatus(container) {
  if (!container) return;
  const el = container.querySelector('.pp-status-msg');
  if (el) el.remove();
}

// ── PayPal SDK / config helpers ────────────────────────────

const ELLIPSIS = '\u2026';

/**
 * Cached PayPal config promise.  Fetched once from the server; subsequent
 * calls return the same promise so only one request is ever made.
 */
let _configPromise = null;

/** Fetch (and cache) the PayPal config from the server. */
function getPayPalConfig() {
  if (_configPromise) return _configPromise;
  _configPromise = fetch('/api/paypal/config')
    .then(res => {
      if (!res.ok) throw new Error('Config unavailable');
      return res.json();
    });
  return _configPromise;
}

/**
 * Load the PayPal JS SDK for one-time order payments (intent=capture).
 * Uses data-namespace="paypalOrders" so it coexists with the subscription SDK.
 */
let sdkOrdersLoadPromise = null;

function ensurePayPalOrdersSdk(clientId) {
  if (sdkOrdersLoadPromise) return sdkOrdersLoadPromise;
  sdkOrdersLoadPromise = new Promise((resolve, reject) => {
    if (window.paypalOrders) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;
    s.setAttribute('data-namespace', 'paypalOrders');
    s.setAttribute('data-sdk-integration-source', 'celestialeye');
    s.onload = resolve;
    s.onerror = () => reject(new Error('PayPal orders SDK failed to load'));
    document.head.appendChild(s);
  });
  return sdkOrdersLoadPromise;
}

/**
 * Load the PayPal JS SDK for subscriptions (vault=true, intent=subscription).
 * Uses data-namespace="paypalSubscription" so it coexists with the orders SDK.
 * Loading the SDK twice with different namespaces is the official PayPal-
 * recommended approach for pages that offer both payment types.
 */
let sdkSubscriptionLoadPromise = null;

function ensurePayPalSubscriptionSdk(clientId) {
  if (sdkSubscriptionLoadPromise) return sdkSubscriptionLoadPromise;
  sdkSubscriptionLoadPromise = new Promise((resolve, reject) => {
    if (window.paypalSubscription) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&vault=true&intent=subscription&components=buttons`;
    s.setAttribute('data-namespace', 'paypalSubscription');
    s.setAttribute('data-sdk-integration-source', 'celestialeye');
    s.onload = resolve;
    s.onerror = () => reject(new Error('PayPal subscription SDK failed to load'));
    document.head.appendChild(s);
  });
  return sdkSubscriptionLoadPromise;
}

function showConfigError() {
  const loadingEls = document.querySelectorAll('.paypal-loading');
  loadingEls.forEach(el => {
    el.textContent = 'Payment system is being configured. Please check back soon.';
  });
  clearStatus(ppChartContainer);
  clearStatus(ppSubContainer);
}

// ── Lazy (deferred) button rendering ───────────────────────
// Buttons are rendered the first time the user clicks a CTA, at which point
// the container is already visible.  This avoids the well-known PayPal SDK
// issue where buttons rendered into a display:none container appear broken.

let chartButtonRendered = false;
let subButtonRendered   = false;

/**
 * Show the one-time payment container and render the PayPal order button.
 * Safe to call multiple times – rendering only happens once.
 */
async function showChartPayment() {
  if (chartPayBtn) chartPayBtn.style.display = 'none';
  if (ppChartContainer) ppChartContainer.style.display = 'block';

  if (chartButtonRendered) return; // already rendered on a previous click
  chartButtonRendered = true;

  setStatus(ppChartContainer, 'loading', 'Connecting to PayPal' + ELLIPSIS);

  try {
    const config = await getPayPalConfig();
    const clientId = (config.clientId || '').trim();

    if (!clientId || clientId === 'your_paypal_client_id_here') {
      showConfigError();
      return;
    }

    await ensurePayPalOrdersSdk(clientId);

    clearStatus(ppChartContainer);
    const loadingChart = document.getElementById('paypal-loading-chart');
    if (loadingChart) loadingChart.remove();

    window.paypalOrders.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'pay',
      },

      createOrder: async () => {
        setStatus(ppChartContainer, 'loading', 'Processing' + ELLIPSIS);
        try {
          const r = await fetch('/api/paypal/create-order', { method: 'POST' });
          const data = await r.json();
          if (!r.ok) {
            const refCode = data.correlationId || 'unknown';
            throw new Error(`Order creation failed (ref: ${refCode})`);
          }
          clearStatus(ppChartContainer);
          return data.id;
        } catch (err) {
          setStatus(ppChartContainer, 'error', err.message);
          throw err;
        }
      },

      onApprove: async (data) => {
        setStatus(ppChartContainer, 'loading', 'Completing payment' + ELLIPSIS);
        try {
          const r = await fetch(`/api/paypal/capture-order/${data.orderID}`, { method: 'POST' });
          const result = await r.json();
          if (!r.ok) {
            const refCode = result.correlationId || 'unknown';
            throw new Error(`Payment capture failed (ref: ${refCode})`);
          }
          // Persist the order ID so the birth-chart page can verify access
          // on the current visit and after a page refresh.
          try { localStorage.setItem('chartAccessToken', data.orderID); } catch (_) { /* private browsing */ }
          window.location.href = '/birth-chart';
        } catch (err) {
          setStatus(ppChartContainer, 'error', err.message);
        }
      },

      onCancel: () => {
        clearStatus(ppChartContainer);
      },

      onError: (err) => {
        console.error('PayPal one-time payment error:', err);
        setStatus(ppChartContainer, 'error', 'Payment failed. Please try again or contact support.');
      },
    }).render('#paypal-button-container').catch(err => {
      console.error('Failed to render one-time payment button:', err);
      setStatus(ppChartContainer, 'error', 'Payment unavailable. Please refresh the page or contact us.');
    });

  } catch (err) {
    console.warn('PayPal chart payment load failed:', err.message);
    chartButtonRendered = false; // allow retry on next click
    // Re-show the CTA button so the user has a way to try again
    if (chartPayBtn) chartPayBtn.style.display = '';
    setStatus(ppChartContainer, 'error', 'Payment unavailable. Please try again or contact us.');
  }
}

/**
 * Show the subscription container and render the PayPal subscription button.
 * Safe to call multiple times – rendering only happens once.
 */
async function showSubscriptionPayment() {
  if (subPayBtn) subPayBtn.style.display = 'none';
  if (ppSubContainer) ppSubContainer.style.display = 'block';

  if (subButtonRendered) return; // already rendered on a previous click
  subButtonRendered = true;

  setStatus(ppSubContainer, 'loading', 'Connecting to PayPal' + ELLIPSIS);

  try {
    const config = await getPayPalConfig();
    const clientId = (config.clientId || '').trim();
    const subscriptionPlanId = (config.subscriptionPlanId || '').trim();

    if (!clientId || clientId === 'your_paypal_client_id_here') {
      showConfigError();
      return;
    }

    const hasSubPlan = subscriptionPlanId && subscriptionPlanId !== 'your_subscription_plan_id_here';

    if (!hasSubPlan) {
      clearStatus(ppSubContainer);
      const loadingSub = document.getElementById('paypal-loading-sub');
      if (loadingSub) loadingSub.remove();
      ppSubContainer.innerHTML = `
        <p style="color:var(--dim-text);font-size:0.85rem;text-align:center;padding:0.75rem 0;">
          Subscription payments coming soon.<br>
          <a href="mailto:hello@celestialeye.app" style="color:var(--stardust);">Contact us to get started</a>
        </p>`;
      return;
    }

    await ensurePayPalSubscriptionSdk(clientId);

    clearStatus(ppSubContainer);
    const loadingSub = document.getElementById('paypal-loading-sub');
    if (loadingSub) loadingSub.remove();

    window.paypalSubscription.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'subscribe',
      },

      createSubscription: (_data, actions) => {
        return actions.subscription.create({ plan_id: subscriptionPlanId });
      },

      onApprove: async (data) => {
        setStatus(ppSubContainer, 'loading', 'Activating your subscription' + ELLIPSIS);
        // Persist the subscription ID immediately when PayPal's onApprove fires.
        // Saving before the server verification ensures the ID is retained across
        // page reloads even if the verification request is slow or the server
        // briefly restarts (e.g. Render free-tier cold starts).
        try { localStorage.setItem('subscriptionID', data.subscriptionID); } catch (_) { /* private browsing */ }
        try {
          const r = await fetch('/api/paypal/verify-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionID: data.subscriptionID }),
          });
          const result = await r.json();
          if (!r.ok) {
            const refCode = result.correlationId || 'unknown';
            const detail = result.error || 'unknown error';
            throw new Error(`Subscription verification failed – ${detail} (ref: ${refCode})`);
          }
          if (!result.active) {
            throw new Error(`Subscription is not active (status: ${result.status}). Please try again or contact support.`);
          }
          // Redirect subscribers to the configured frontend URL, falling back to the birth chart page.
          const destUrl = (config.frontendUrl && config.frontendUrl.trim()) ? config.frontendUrl : '/birth-chart';
          window.location.href = destUrl;
        } catch (err) {
          setStatus(ppSubContainer, 'error', err.message);
        }
      },

      onCancel: () => {
        clearStatus(ppSubContainer);
      },

      onError: (err) => {
        console.error('PayPal subscription error:', err);
        setStatus(ppSubContainer, 'error', 'Subscription setup failed. Please try again or contact support.');
      },
    }).render('#paypal-subscription-container').catch(err => {
      console.error('Failed to render subscription button:', err);
      setStatus(ppSubContainer, 'error', 'Subscription unavailable. Please refresh the page or contact support.');
    });

  } catch (err) {
    console.warn('PayPal subscription load failed:', err.message);
    subButtonRendered = false; // allow retry on next click
    // Re-show the CTA button so the user has a way to try again
    if (subPayBtn) subPayBtn.style.display = '';
    setStatus(ppSubContainer, 'error', 'Subscription unavailable. Please try again or contact us.');
  }
}

// ── Wire up CTA buttons ─────────────────────────────────────
if (chartPayBtn) {
  chartPayBtn.addEventListener('click', showChartPayment);
}
if (subPayBtn) {
  subPayBtn.addEventListener('click', showSubscriptionPayment);
}

// ── Pre-fetch PayPal config in background ───────────────────
// Warms the cache so button rendering is faster when the user clicks a CTA.
getPayPalConfig().catch(err => {
  console.warn('PayPal config pre-fetch failed:', err.message);
});
