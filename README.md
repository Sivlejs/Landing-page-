# Celestial Eye – Landing Page

A beautiful, celestial-themed landing page for the **Celestial Eye** service. Visitors can:

- **Get a Birth Chart reading** for a one-time payment of **$1.99** via PayPal, then enter their birth details to generate their natal chart instantly.
- **Subscribe for Full Cosmic Access** (monthly) to get everything: the birth chart, a personalised daily cosmic guide, and unlimited **Nexus AI** astrology chat.

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

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your PayPal credentials
```

### 3. Get PayPal credentials

#### Step 1: Create a PayPal Developer Account

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Click **Log in to Dashboard** (or sign up if you don't have an account)
3. Use your existing PayPal account or create a new one

#### Step 2: Create an App to Get API Credentials

1. In the PayPal Developer Dashboard, go to **Apps & Credentials**
2. Make sure you're in **Sandbox** mode (toggle at the top) for testing
3. Click **Create App**
4. Enter an app name (e.g., "Celestial Eye")
5. Select **Merchant** as the app type
6. Click **Create App**
7. On the app details page, you'll see:
   - **Client ID** – Copy this to `PAYPAL_CLIENT_ID` in your `.env` file
   - **Secret** – Click "Show" to reveal, then copy to `PAYPAL_CLIENT_SECRET` in your `.env` file
8. Set `PAYPAL_MODE=sandbox` in your `.env` file for testing

> **⚠️ Important:** Never commit your `.env` file or share your Secret publicly!

### 4. Create a monthly subscription plan (for Full Access)

#### Step 1: Create a Product

1. In the PayPal Developer Dashboard, go to **Sandbox** → **Subscriptions** → **Products & Plans**
   - Or visit: https://developer.paypal.com/dashboard/applications/sandbox/subscriptions/products
2. Click **Create Product**
3. Fill in the details:
   - **Product name**: "Celestial Eye Full Access"
   - **Product type**: Service
   - **Category**: Digital services (or appropriate category)
   - **Description**: "Full cosmic access including birth chart, daily cosmic guide, and unlimited Nexus AI chat"
4. Click **Create Product**

#### Step 2: Create a Billing Plan

1. After creating the product, click on it to open its details
2. Click **Create Plan**
3. Fill in the plan details:
   - **Plan name**: "Monthly Full Access"
   - **Description**: "Monthly subscription for full cosmic access"
4. Set the billing cycle:
   - **Pricing model**: Fixed pricing
   - **Price**: Enter your price (e.g., `9.99`)
   - **Currency**: USD
   - **Billing cycle**: Monthly
5. Click **Create Plan**
6. Copy the **Plan ID** (starts with `P-`) → set `PAYPAL_SUBSCRIPTION_PLAN_ID=P-XXXXXXXX` in your `.env` file

> **💡 Tip:** You can also create plans programmatically via the PayPal API if needed.

### 5. Start the server

```bash
npm start
# → http://localhost:3000
```

### 6. Test with Sandbox Accounts

PayPal provides test accounts to simulate payments without using real money:

1. In the PayPal Developer Dashboard, go to **Sandbox** → **Accounts**
2. You'll see two default test accounts:
   - **Personal** (buyer) – Use this email/password to test making purchases
   - **Business** (seller) – This receives the test payments
3. Open your local site at `http://localhost:3000`
4. Click on a PayPal payment button
5. Log in with the **Personal** sandbox account credentials
6. Complete the test payment

> **💡 Sandbox Test Card:** You can also use test credit cards in sandbox mode. See [PayPal's test card numbers](https://developer.paypal.com/api/rest/sandbox/card-testing/).

---

## Going Live (Production)

When you're ready to accept real payments:

### Step 1: Get Live API Credentials

1. In the PayPal Developer Dashboard, switch to **Live** mode (toggle at the top)
2. Create a new app or view your existing app in Live mode
3. Copy the **Live Client ID** and **Live Secret**

### Step 2: Create a Live Subscription Plan

1. In the PayPal Developer Dashboard under **Live** mode, go to **Subscriptions** → **Products & Plans**
2. Create your product and plan again (same steps as sandbox, but for production)
3. Copy the new **Live Plan ID**

### Step 3: Update Environment Variables

Update your `.env` file (or hosting environment variables):

```bash
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_client_secret
PAYPAL_SUBSCRIPTION_PLAN_ID=your_live_plan_id
PAYPAL_MODE=live
```

> **⚠️ Important:** Live mode processes real payments. Test thoroughly in sandbox first!

---

## Deploying to Render

1. Push this repository to GitHub
2. Log in to [render.com](https://render.com) and create a **New Web Service**
3. Connect your GitHub repository — Render will auto-detect `render.yaml`
4. In the Render dashboard → **Environment** tab, add:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_SUBSCRIPTION_PLAN_ID`
   - `PAYPAL_MODE` = `live`
5. Click **Deploy**

Your site will be live at `https://celestial-eye-landing.onrender.com` (or your custom domain).

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
