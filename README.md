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

1. Go to [developer.paypal.com](https://developer.paypal.com/developer/applications)
2. Create a new application (Sandbox for testing, Live for production)
3. Copy the **Client ID** and **Secret** into `.env`
4. Set `PAYPAL_MODE=sandbox` for testing

### 4. Create a monthly subscription plan (for Full Access)

1. In the PayPal Developer Dashboard → **Products & Plans**
2. Create a **Product**: "Celestial Eye Full Access"
3. Create a **Plan**: Monthly billing cycle, set your price (e.g. $9.99/month)
4. Copy the **Plan ID** → set `PAYPAL_SUBSCRIPTION_PLAN_ID=P-XXXXXXXX` in `.env`

### 5. Start the server

```bash
npm start
# → http://localhost:3000
```

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
