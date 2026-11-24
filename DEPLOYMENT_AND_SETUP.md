# Blendy Kenya Storefront — Setup & Launch Guide

## 1. Architecture Summary
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 (`src/`). Preserves the original 4-flavour Blendy hero (`Berry`, `Kiwi`, `Banana`, `Strawberry`) while providing full Kenyan ecommerce routes (`/shop`, `/shop/:slug`, `/checkout`, `/track-order`, `/story`, `/delivery`, `/faqs`, `/contact`, `/account`, `/legal/:slug`, `/admin`).
- **Backend**: Node.js + Express (`server.ts`) serving both API endpoints and route-aware HTML SEO metadata (`<title>`, `<meta name="description">`, canonical link, `robots`, JSON-LD `Product` / `Offer` / `BreadcrumbList`, `/robots.txt`, `/sitemap.xml`).
- **Database**: Cloud SQL PostgreSQL (`drizzle-orm` + `pg`) across 18 tables (`src/db/schema.ts`).
- **Authentication & RBAC**: Firebase Authentication (Google Sign-In) verified server-side by `firebase-admin` (`src/middleware/auth.ts`) with PostgreSQL roles (`owner`, `manager`, `fulfilment_staff`, `customer`).
- **Currency & Locale**: Kenyan Shillings (`KSh`, stored as integer cents), `Africa/Nairobi` timestamps, and strict Kenyan mobile validation (`07xx`, `01xx`, `254...`, `+254...`).

## 2. First-Run Store Owner Setup
1. Sign in with Google on `/admin` or `/account`.
2. If no store owner exists yet, click **Claim Store Owner Access** (or set `ADMIN_BOOTSTRAP_EMAIL` in server environment variables so that account is automatically promoted to `owner`).
3. Inside **Admin**:
   - **Catalogue & Stock**: Set verified KSh prices, stock quantities, optional ingredients/allergens/storage details, and switch each flavour (`Berry`, `Kiwi`, `Banana`, `Strawberry`) from `draft` to `published`.
     - For quick non-live testing, click **Load Non-Live Demo Test Prices & Zones** in **Admin → Overview**.
   - **Delivery & Promos**: Add active Kenyan delivery zones (county, town, area, fee in KSh, free-delivery threshold, minimum order) and/or pickup collection points.
   - **Settings & Content**: Configure store support phone, email, WhatsApp number, physical address, operating hours, tax rate/label, optional Pay-on-Delivery / Pay-on-Pickup toggles, and review/approve the starter `our-story`, `privacy`, `terms`, `returns`, and `cookies` policy pages.

## 3. IntaSend M-Pesa Configuration
Set these server-side environment variables (never store secrets in browser code or database tables):
- `INTASEND_SECRET_KEY`: Use `ISSecretKey_test_...` for IntaSend Sandbox or `ISSecretKey_live_...` for Live M-Pesa.
- `INTASEND_PUBLISHABLE_KEY`: Matching IntaSend publishable key.
- `INTASEND_WEBHOOK_CHALLENGE`: Shared secret configured in your IntaSend dashboard webhook settings.
- Configure IntaSend webhook URL to:
  `https://<your-domain>/api/webhooks/intasend`

When `INTASEND_SECRET_KEY` is absent in non-production environments, M-Pesa checkout uses the clearly labelled **Non-Live Development Simulator** (`mpesa_sandbox_sim`) requiring explicit tester confirmation (`COMPLETE`, `FAILED`, or `CANCELED`) on `/track-order`. In `NODE_ENV=production` without `INTASEND_SECRET_KEY`, the simulator is disabled.

## 4. Build, Test & Run Commands
- `npm run dev` — Run Express + Vite development server on port `3000`.
- `npm run build` — Build production client bundle to `dist/`.
- `npm start` — Run production server (`NODE_ENV=production tsx server.ts`) on `0.0.0.0:3000`.
- `npm run lint` — TypeScript check (`tsc --noEmit`).
- `npm test` — Run Vitest unit & database integration suite (`tests/storefront.test.ts`).
