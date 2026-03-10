# TradeFusion AI Market

**TradeFusion AI Market** is a premium full-stack hybrid multi-vendor marketplace prototype built for **SaiyedWebCoders**.

It combines:
- Alibaba-style B2B bulk ordering (MOQ + bulk tiers)
- Amazon-style B2C retail checkout
- Multi-vendor operations with dedicated vendor data views
- Admin controls with commission settings and analytics

## Core modules

### Multi-vendor system
- Vendor registration endpoint
- Vendor-specific dashboard API
- Vendor product upload with admin-approval workflow
- Inventory, order, and shipping status management

### Hybrid B2B + B2C pricing
Every product supports:
- Retail price for single-unit purchases
- MOQ-driven bulk pricing tiers for wholesale buyers

### Split-payment commission flow
Checkout calculates:
- Gross order amount
- Configurable platform commission
- Vendor payout

Compatible providers are represented in config/UI:
- Stripe Connect
- Razorpay Route

### Admin dashboard
- Vendor verification endpoint
- Product approval endpoint
- Order visibility
- Revenue, commission, and payout analytics
- Commission timeline chart and configurable percentage

### Customer marketplace
- Product browsing
- Search + category filters
- Retail and bulk purchase actions
- Ratings/reviews display

## Run locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Test

```bash
npm test
```
