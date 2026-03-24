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

// ── Show/hide primary CTA vs PayPal container ──────────────
const chartPayBtn = document.getElementById('chart-pay-btn');
const subPayBtn   = document.getElementById('sub-pay-btn');
const ppChartContainer = document.getElementById('paypal-button-container');
const ppSubContainer   = document.getElementById('paypal-subscription-container');

function showPayPalContainer(container, primaryBtn) {
  if (primaryBtn) primaryBtn.style.display = 'none';
  if (container) container.style.display = 'block';
}

if (chartPayBtn) {
  chartPayBtn.addEventListener('click', () => showPayPalContainer(ppChartContainer, chartPayBtn));
}
if (subPayBtn) {
  subPayBtn.addEventListener('click', () => showPayPalContainer(ppSubContainer, subPayBtn));
}

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

// ── Load PayPal SDK and render buttons ─────────────────────

const ELLIPSIS = '\u2026';

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

async function loadPayPal() {
  try {
    // Show "Connecting to PayPal…" in both containers while we fetch config
    setStatus(ppChartContainer, 'loading', 'Connecting to PayPal' + ELLIPSIS);
    setStatus(ppSubContainer, 'loading', 'Connecting to PayPal' + ELLIPSIS);

    const res = await fetch('/api/paypal/config');
    if (!res.ok) throw new Error('Config unavailable');
    const config = await res.json();
    const { clientId, subscriptionPlanId } = config;

    if (!clientId || clientId === 'your_paypal_client_id_here') {
      showConfigError();
      return;
    }

    const hasSubPlan = subscriptionPlanId && subscriptionPlanId !== 'your_subscription_plan_id_here';

    // Load both SDKs in parallel.  Each uses a separate data-namespace so they
    // don't conflict – this is the official PayPal approach for pages that need
    // both createOrder (intent=capture) and createSubscription (vault=true,
    // intent=subscription) buttons.  If the subscription SDK fails we still
    // render the one-time button.
    const ordersResult = await ensurePayPalOrdersSdk(clientId).then(
      () => 'fulfilled',
      (err) => { console.warn('PayPal orders SDK load failed:', err); return 'rejected'; }
    );

    let subscriptionReady = false;
    if (hasSubPlan) {
      subscriptionReady = await ensurePayPalSubscriptionSdk(clientId).then(
        () => true,
        (err) => { console.warn('PayPal subscription SDK load failed:', err); return false; }
      );
    }

    clearStatus(ppChartContainer);
    clearStatus(ppSubContainer);

    renderPaymentButtons(
      subscriptionPlanId,
      ordersResult === 'fulfilled',
      subscriptionReady
    );

  } catch (err) {
    console.warn('PayPal load failed:', err.message);
    showConfigError();
  }
}

function showConfigError() {
  const loadingEls = document.querySelectorAll('.paypal-loading');
  loadingEls.forEach(el => {
    el.textContent = 'Payment system is being configured. Please check back soon.';
  });
  // Also clear any status messages
  clearStatus(ppChartContainer);
  clearStatus(ppSubContainer);
}

function renderPaymentButtons(subscriptionPlanId, ordersReady, subscriptionReady) {
  const loadingChart = document.getElementById('paypal-loading-chart');
  if (loadingChart) loadingChart.remove();
  const loadingSub = document.getElementById('paypal-loading-sub');

  // ── One-time $1.99 birth chart button ──
  if (ordersReady && ppChartContainer) {
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
          window.location.href = '/success.html?type=chart';
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
    });
  } else if (!ordersReady && ppChartContainer) {
    ppChartContainer.innerHTML = `
      <p style="color:var(--dim-text);font-size:0.85rem;text-align:center;padding:0.75rem 0;">
        Payment unavailable. Please refresh the page or
        <a href="mailto:hello@celestialeye.app" style="color:var(--stardust);">contact us</a>.
      </p>`;
  }

  // ── Monthly subscription button ──
  if (loadingSub) loadingSub.remove();

  if (subscriptionReady && ppSubContainer) {
    window.paypalSubscription.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'subscribe',
      },

      createSubscription: (_data, actions) => {
        setStatus(ppSubContainer, 'loading', 'Setting up subscription' + ELLIPSIS);
        return actions.subscription.create({ plan_id: subscriptionPlanId });
      },

      onApprove: async (data) => {
        setStatus(ppSubContainer, 'loading', 'Activating your subscription' + ELLIPSIS);
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
          try { localStorage.setItem('subscriptionID', data.subscriptionID); } catch (_) { /* localStorage unavailable */ }
          window.location.href = '/success.html?type=subscription';
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
  } else if (ppSubContainer) {
    // Show a contact/waitlist message if no plan ID configured
    ppSubContainer.innerHTML = `
      <p style="color:var(--dim-text);font-size:0.85rem;text-align:center;padding:0.75rem 0;">
        Subscription payments coming soon.<br>
        <a href="mailto:hello@celestialeye.app" style="color:var(--stardust);">Contact us to get started</a>
      </p>`;
  }
}

// Kick off PayPal loading
loadPayPal();
