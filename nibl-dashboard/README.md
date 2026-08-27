# NIBL Foods — COO Sales Dashboard

A real-time sales performance dashboard for NIBL Foods pulling live data from Odoo ERP. Shows B2C (Shopify) and B2B (Direct) revenue with date filters, charts, and invoice tracking.

## Features

- 📊 Live B2C vs B2B revenue breakdown
- 📅 Date range filters (This Month, Last Month, Last 3 Months, This Year, All Time, Custom)
- 📈 Monthly revenue trend chart
- 🥧 Revenue mix & invoice collection donut charts
- 🏆 Top B2C channels and B2B customers
- 🧾 Accounts Receivable / Invoice payment status
- 🔄 Auto-refreshes every 5 minutes
- 📺 White/light theme optimized for LED TV presentations

## Tech Stack

- **Next.js 15** (App Router)
- **Recharts** for charts
- **Odoo XML-RPC** (server-side only — credentials never exposed to browser)
- **TypeScript**
- Deployable to **Vercel** in one click

---

## Local Development

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies
```bash
cd nibl-dashboard
npm install
```

### 3. Set up environment variables
The `.env.local` file is already configured. If it's missing, create it:
```env
ODOO_URL=https://nibl.odoo.com
ODOO_DB=nibl
ODOO_USERNAME=saqib@niblfoods.com
ODOO_API_KEY=f439ae403991f5a73c3f805c243d9b55b7af07c9
```

### 4. Run the dev server
```bash
npm run dev
```
Open http://localhost:3000

---

## Deploy to Vercel

### Option A — Via Vercel CLI
```bash
npm install -g vercel
vercel
```
Follow the prompts. When asked about environment variables, add the 4 variables from `.env.local`.

### Option B — Via GitHub (Recommended)
1. Push this folder to a GitHub repo
2. Go to https://vercel.com → New Project → Import your repo
3. In **Environment Variables**, add:
   - `ODOO_URL` = `https://nibl.odoo.com`
   - `ODOO_DB` = `nibl`
   - `ODOO_USERNAME` = `saqib@niblfoods.com`
   - `ODOO_API_KEY` = `f439ae403991f5a73c3f805c243d9b55b7af07c9`
4. Click **Deploy** — done! ✅

---

## B2C vs B2B Classification

| Channel | Logic | Examples |
|---------|-------|---------|
| **B2C (Shopify)** | `client_order_ref` is set | TRAX orders with Shopify order numbers |
| **B2B (Direct)** | `client_order_ref` is empty | Pandamart, SPAR, Gyms, Pharmacies |

> The `client_order_ref` field contains the Shopify order number, passed through delivery partners (TRAX, Krave Mart, etc.)

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── sales/route.ts      ← Odoo sales data API
│   │   └── invoices/route.ts   ← Odoo invoices API
│   ├── page.tsx                ← Main dashboard
│   ├── page.module.css
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── KpiRow.tsx/css          ← 7 KPI metric cards
│   ├── ChannelCards.tsx/css    ← B2C vs B2B breakdown
│   ├── RevenueChart.tsx/css    ← Monthly bar chart
│   ├── MixDonut.tsx/css        ← Revenue mix donuts
│   ├── TopTable.tsx/css        ← Top customers table
│   ├── InvoiceStatus.tsx/css   ← A/R breakdown
│   └── DateFilter.tsx/css      ← Date range picker
└── lib/
    ├── odoo.ts                 ← Server-only Odoo helper
    └── types.ts                ← Shared TypeScript types
```
