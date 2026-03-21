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

## PayPal Webhook (optional)

For production, set up a PayPal webhook to handle subscription events (cancellations, renewals) in `server.js`. Endpoint: `POST /api/paypal/webhook`.

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set" | Ensure your `.env` file exists and contains valid credentials |
| PayPal buttons don't appear | Check browser console for errors; verify `PAYPAL_CLIENT_ID` is correct |
| "Failed to create order" | Verify your API credentials are valid and not expired |
| Subscription button not working | Ensure `PAYPAL_SUBSCRIPTION_PLAN_ID` is set to a valid plan ID |
| Can't log into sandbox | Use sandbox account credentials from the Developer Dashboard, not your real PayPal account |

### Checking Your Configuration

You can verify your PayPal config by visiting:
```
http://localhost:3000/api/paypal/config
```

This returns your client ID and subscription plan ID (secrets are never exposed).

### Getting Help

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal REST API Reference](https://developer.paypal.com/docs/api/overview/)
- [PayPal Community Forums](https://www.paypal-community.com/t5/Technical-Support/ct-p/technical-support)
