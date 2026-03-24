# Celestial Eye – Landing Page

A celestial-themed landing page for the **Celestial Eye** service with PayPal-powered payments. Visitors can purchase a one-time birth chart reading ($1.99) or subscribe for full monthly cosmic access.

---

## Complete Setup Guide

Follow these steps **in order** — each step builds on the last.

---

### Step 1 — Prerequisites

Make sure you have the following installed on your machine:

- **Node.js** v18 or later – download from [nodejs.org](https://nodejs.org)
- **npm** (included with Node.js)
- A **PayPal account** – sign up free at [paypal.com](https://www.paypal.com)

Verify Node.js is installed:

```bash
node --version   # should print v18.x.x or higher
npm --version
```

---

### Step 2 — Install project dependencies

```bash
npm install
```

---

### Step 3 — Create a PayPal Developer App (get Client ID + Secret)

> You need **both** the Client ID and the Secret. The Client ID alone is not enough — the Secret is used server-side to create and capture orders.

1. Go to [developer.paypal.com](https://developer.paypal.com) and log in with your PayPal account.
2. In the left sidebar, click **Apps & Credentials**.
3. Make sure the toggle at the top right is set to **Sandbox** (for testing).
4. Click **Create App**.
5. Enter a name (e.g. `Celestial Eye`) and select **Merchant** as the app type, then click **Create App**.
6. On the app details page you will see:
   - **Client ID** — copy this value; you'll need it in Step 5.
   - **Secret** — click **Show**, then copy this value; you'll need it in Step 5.

> ⚠️ Never share your Secret or commit it to source control. The `.env` file is already in `.gitignore`.

---

### Step 4 — Create a monthly subscription plan (for Full Cosmic Access)

> This step is **optional** — the $1.99 birth chart payment works without it. Skip to Step 5 if you don't need the subscription feature yet.

#### 4a — Create a Product

1. In the PayPal Developer Dashboard, go to **Sandbox → Subscriptions → Products & Plans**  
   (direct link: https://developer.paypal.com/dashboard/applications/sandbox/subscriptions/products)
2. Click **Create Product**.
3. Fill in:
   - **Product name**: `Celestial Eye Full Access`
   - **Product type**: `Service`
   - **Category**: `Digital services`
   - **Description**: `Full cosmic access including birth chart, daily cosmic guide, and unlimited Nexus AI chat`
4. Click **Create Product**.

#### 4b — Create a Billing Plan

1. Open the product you just created and click **Create Plan**.
2. Fill in:
   - **Plan name**: `Monthly Full Access`
   - **Description**: `Monthly subscription for full cosmic access`
3. Set the billing cycle:
   - **Pricing model**: `Fixed pricing`
   - **Price**: `3.99` (or your preferred price)
   - **Currency**: `USD`
   - **Billing cycle**: `Monthly`
4. Click **Create Plan**.
5. Copy the **Plan ID** — it starts with `P-` (e.g. `P-1AB23456CD789012EF345678`). You'll need it in Step 5.

---

### Step 5 — Configure your environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` in a text editor and paste in the values from Steps 3 and 4:

```dotenv
PAYPAL_CLIENT_ID=<paste Client ID from Step 3>
PAYPAL_CLIENT_SECRET=<paste Secret from Step 3>
PAYPAL_MODE=sandbox
PAYPAL_SUBSCRIPTION_PLAN_ID=<paste Plan ID from Step 4, or leave as-is to skip subscriptions>
PORT=3000
```

---

### Step 6 — Start the server

```bash
npm start
```

You should see:

```
Celestial Eye server running on port 3000
```

If any credentials are missing the server will print a warning telling you exactly which variables are not set.

Open **http://localhost:3000** in your browser to see the landing page.

---

### Step 7 — Verify your PayPal configuration

Visit the config endpoint to confirm the server picked up your credentials:

```
http://localhost:3000/api/paypal/config
```

It returns:

```json
{ "clientId": "...", "subscriptionPlanId": "...", "mode": "sandbox" }
```

The Secret is never exposed here. If `clientId` is empty or still shows `your_paypal_client_id_here`, go back and check your `.env` file.

---

### Step 8 — Test payments with sandbox accounts

PayPal provides free test accounts so you can simulate purchases without real money:

1. In the Developer Dashboard, go to **Sandbox → Accounts**.
2. You'll see two pre-created accounts:
   - **Personal** (buyer) — use these credentials to log in and complete test purchases.
   - **Business** (seller) — receives the test payments.
3. On your local site, click a payment button, log in with the **Personal** sandbox account, and complete the flow.
4. A successful one-time payment redirects to `/success.html?type=chart`.
5. A successful subscription redirects to `/success.html?type=subscription`.

> 💡 You can also use test credit cards — see [PayPal sandbox card numbers](https://developer.paypal.com/api/rest/sandbox/card-testing/).

---

### Step 9 — Go live (accept real payments)

Only do this after testing thoroughly in sandbox.

1. In the Developer Dashboard, flip the toggle to **Live** mode.
2. Open (or create) your app in Live mode and copy the **Live Client ID** and **Live Secret**.
3. In the Live dashboard, create a new Product and Plan under **Subscriptions → Products & Plans** (same steps as Step 4).
4. Update your environment variables (on Render or in `.env`):

```dotenv
PAYPAL_CLIENT_ID=<live client id>
PAYPAL_CLIENT_SECRET=<live secret>
PAYPAL_SUBSCRIPTION_PLAN_ID=<live plan id>
PAYPAL_MODE=live
```

5. Restart the server (or redeploy).

> ⚠️ Live mode processes real money. Double-check every value before restarting.

---

### Step 10 — Deploy to Render (optional)

1. Push this repository to GitHub.
2. Log in to [render.com](https://render.com) and create a **New Web Service**.
3. Connect your GitHub repository — Render will auto-detect `render.yaml`.
4. In the Render dashboard → **Environment** tab, add the four variables:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_SUBSCRIPTION_PLAN_ID`
   - `PAYPAL_MODE` = `live`
5. Click **Deploy**.

Your site will be live at `https://celestial-eye-landing.onrender.com` (or your custom domain).

---

## Features

- 🌌 Animated starfield & nebula background (pure CSS + Canvas)
- 🔮 Celestial Eye animated logo
- 💳 PayPal one-time payment ($1.99 birth chart)
- 🔁 PayPal monthly subscription (Full Access)
- 🌠 Birth chart form with approximate natal chart display
- ✅ FAQ accordion, testimonials, feature grid
- 📱 Fully responsive design

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js + Express |
| Payments | PayPal REST API + JS SDK |
| Hosting | Render (render.yaml included) |
| Frontend | Vanilla HTML/CSS/JS (no framework) |

---

## Project Structure

```
├── server.js               # Express server + PayPal API endpoints
├── package.json
├── render.yaml             # Render deployment config
├── .env.example            # Environment variable template
└── public/
    ├── index.html          # Landing page
    ├── birth-chart.html    # Birth chart input & display
    ├── success.html        # Payment success page
    ├── css/
    │   └── styles.css      # Celestial theme styles
    └── js/
        ├── main.js         # Landing page JS + PayPal buttons
        └── starfield.js    # Canvas starfield animation
```

---

## Webhook Setup (Live & Sandbox)

PayPal webhooks let the server confirm payment/subscription state server-side,
independent of the browser callback.

### Setting up webhooks

1. **PayPal Developer Dashboard** → **My Apps & Credentials** → your app
2. Scroll to **Webhooks** → click **Add Webhook**
3. Set the **Webhook URL** to:
   - **Live**: `https://your-domain.com/api/paypal/webhook`
   - **Sandbox**: Use a tunnelling tool such as [ngrok](https://ngrok.com) to
     expose your local server, e.g. `https://abc123.ngrok.io/api/paypal/webhook`
4. Select the following event types:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
5. Click **Save** → copy the **Webhook ID** shown in the list
6. Add it to your environment:
   ```dotenv
   PAYPAL_WEBHOOK_ID=WH-XXXXXXXXXXXXXXXX
   ```
7. Restart the server

> ⚠️ If `PAYPAL_WEBHOOK_ID` is not set, the server will log a warning and skip
> signature verification. **Always set it in Live mode.**

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PAYPAL_CLIENT_ID` | ✅ | PayPal app Client ID (public, sent to browser) |
| `PAYPAL_CLIENT_SECRET` | ✅ | PayPal app Secret (server-only, never exposed) |
| `PAYPAL_MODE` | ✅ | `sandbox` or `live` |
| `PAYPAL_SUBSCRIPTION_PLAN_ID` | ⚠️ optional | Billing plan ID (`P-…`) for the monthly subscription |
| `PAYPAL_WEBHOOK_ID` | ⚠️ production | Webhook ID from PayPal dashboard for signature verification |
| `PORT` | ❌ | HTTP port (default: `3000`) |

---

## Observability / Structured Logs

All server events are logged as JSON to stdout:

```json
{"ts":"2024-01-01T00:00:00.000Z","level":"info","event":"create-order:ok","mode":"live","correlationId":"A1B2C3","orderId":"5TY80502CQ286820X"}
```

Key events logged:
- `startup:ok` / `startup:fatal` / `startup:env-mismatch`
- `create-order:start` / `create-order:ok` / `create-order:fail`
- `capture-order:start` / `capture-order:ok` / `capture-order:fail`
- `webhook:received` / `webhook:duplicate` / `webhook:invalid-signature`
- `webhook:capture-completed` / `webhook:subscription-*`

Each request has a `correlationId` which is also returned to the client on
error so users can quote it to support.

---

## Security Headers

The server adds these headers to every response:

| Header | Value |
|---|---|
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Restricts scripts/frames to `self` + `paypal.com` |
| `Strict-Transport-Security` | Set in live mode only |

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| `startup:env-mismatch` error on boot | `PAYPAL_MODE=live` but Client ID looks like a sandbox credential. Use your Live Client ID. |
| "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set" | Ensure your `.env` file exists and contains valid credentials |
| PayPal buttons don't appear | Check browser console for errors; verify `PAYPAL_CLIENT_ID` is correct |
| "Failed to create order" | Verify your API credentials are valid and not expired |
| Subscription button not working | Ensure `PAYPAL_SUBSCRIPTION_PLAN_ID` is set to a valid plan ID. The plan must be **ACTIVE** in the **same mode** (sandbox or live) as your credentials. See *Diagnosing "Not available"* below. |
| "Not available. Try again later." on subscription button | The plan ID is missing, inactive, or belongs to the wrong mode. See *Diagnosing "Not available"* below. |
| One-time payment and subscription buttons conflict | Ensure the PayPal SDK URL contains only `vault=true` (no `enable-funding=card`). That extra parameter causes the subscription button to fail with "Not available. Try again later." Hard-refresh the page after deploying the fix. |
| Can't log into sandbox | Use sandbox account credentials from the Developer Dashboard, not your real PayPal account |
| Webhook `401 Invalid webhook signature` | Verify `PAYPAL_WEBHOOK_ID` matches the ID in the PayPal dashboard exactly. |
| Webhook events not arriving locally | Use ngrok: `ngrok http 3000`. Update the webhook URL in the PayPal dashboard. |
| `CORS` errors calling PayPal API | Calls to PayPal REST API are made server-side — there should be no CORS errors. If you see them, ensure you are calling `/api/paypal/*` (your own server), not PayPal directly from the browser. |
| Mixed environment (Live SDK + Sandbox backend) | Ensure `PAYPAL_MODE` matches the account type of your Client ID and Secret. The server will refuse to start if the Client ID contains "sandbox" in live mode. |

### Diagnosing "Not available. Try again later." on the subscription button

This PayPal error means the subscription plan cannot be created.  Work through the steps below:

1. **Visit** `http://localhost:3000/api/paypal/check-plan` (or your deployed URL).  
   The endpoint reports whether the plan ID is set, reachable, and ACTIVE.

   | Response field | Meaning |
   |---|---|
   | `configured: false, reason: "not set"` | `PAYPAL_SUBSCRIPTION_PLAN_ID` is missing from your environment variables. Add it and restart the server. |
   | `configured: false, reason: "invalid format"` | The plan ID does not match the `P-…` format. Copy the exact value from the PayPal dashboard. |
   | `active: false, status: "INACTIVE"` | The plan exists but is inactive. Open the PayPal Developer Dashboard → Subscriptions → Plans → select the plan → click **Activate**. |
   | `active: false, reason: "Plan not found"` | The plan ID exists in the environment but PayPal returns 404. The most common cause is a **mode mismatch**: a sandbox plan ID used with `PAYPAL_MODE=live` (or vice versa). Create a matching plan for the current mode and update the environment variable. |
   | `active: true` | The plan is valid. The "Not available" error was likely caused by the SDK URL conflict (see the row above in the table). Hard-refresh the browser and re-test. |

2. **Check the mode**: Sandbox plans only work with sandbox credentials (`PAYPAL_MODE=sandbox`) and live plans only work with live credentials (`PAYPAL_MODE=live`). These are completely separate environments.

3. **Verify the plan is ACTIVE** in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).

### Checking Your Configuration

You can verify your PayPal config by visiting:
```
http://localhost:3000/api/paypal/config
```

This returns your client ID and subscription plan ID (secrets are never exposed).

To verify the subscription plan is reachable and **ACTIVE** in PayPal:
```
http://localhost:3000/api/paypal/check-plan
```

Example responses:
```json
{ "configured": true, "active": true, "status": "ACTIVE", "name": "Monthly Full Access", "planId": "P-…", "mode": "sandbox" }
{ "configured": true, "active": false, "status": "INACTIVE", "planId": "P-…", "mode": "live" }
{ "configured": false, "reason": "PAYPAL_SUBSCRIPTION_PLAN_ID is not set" }
{ "configured": true, "active": false, "reason": "Plan not found – verify the plan ID exists in live mode and was not deleted" }
```

If `active` is `false`, activate the plan in the PayPal Developer Dashboard or create a new one and update `PAYPAL_SUBSCRIPTION_PLAN_ID`.

### Getting Help

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal REST API Reference](https://developer.paypal.com/docs/api/overview/)
- [PayPal Community Forums](https://www.paypal-community.com/t5/Technical-Support/ct-p/technical-support)
