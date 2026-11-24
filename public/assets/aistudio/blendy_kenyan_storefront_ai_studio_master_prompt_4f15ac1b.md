# BLENDY — Google AI Studio Master Build Prompt

## Build a complete, launch-ready Kenyan digital storefront from the existing Blendy frontend

**How to use this document:** Open the existing Blendy project in Google AI Studio Build mode. Keep the current project and its source code. Attach the original Blendy design specification (`Oc9PCGgXjQ0lZuWjokoc-RYGQ5FohEBE-cEf32B8wdg.md`) and paste the **MASTER PROMPT** below into the AI Studio prompt box. Work through the follow-up prompts in order; do not ask the agent to rewrite the entire application in one uncontrolled pass.

**Project interpretation:** Blendy is the brand in the supplied design brief. The supplied source is a visual/interaction specification for a four-flavour smoothie hero, not a completed commerce specification. Build a genuine direct-to-customer storefront around that hero. Treat the brand name, logo, palette and four supplied flavours as the initial brand direction, while making editable business details configurable.

---

# PART 1 — MASTER PROMPT (paste into Google AI Studio)

You are acting as a senior product designer, senior full-stack engineer, ecommerce architect, Kenyan digital-commerce specialist, technical SEO lead, security engineer, accessibility specialist and QA lead.

Your task is to turn the existing Blendy project into a polished, reliable, mobile-first, full-stack digital storefront for the Kenyan market. This must be a real commerce application with persistent data and working customer journeys, not merely a visual prototype, a static landing page, or a collection of buttons that do nothing.

## 1. First inspect, then improve — do not destroy the existing work

Before changing code:

1. Inspect the entire existing project: frontend, routes, components, assets, styles, server/API code, package configuration, Firebase or other integrations, environment variables, and any existing data models.
2. Read the attached original Blendy specification completely. It contains precise reference requirements for the four flavour slides, original product cut-out sheets, crop coordinates, typography, colours, layout, animation timings, interactions, mobile behaviour and reduced-motion behaviour.
3. Identify what is already implemented, what is partly implemented, what is broken, and what is missing for a real storefront.
4. Preserve working code and existing assets. Refactor only where necessary. Do not replace the established visual identity with a generic ecommerce theme.
5. Create a concise implementation plan and a list of assumptions/blockers. Then begin implementing; do not stop after producing a plan.

Do not remove the four original flavours or replace their supplied assets with unrelated stock photography. Do not silently simplify the signature hero. The original specification is the source of truth for the visual treatment of that hero unless a change is explicitly required for accessibility, mobile usability or a real commerce journey.

## 2. Product and brand direction

Build Blendy as a contemporary, premium-but-approachable Kenyan smoothie brand. The visual tone should feel fresh, confident, playful, modern, trustworthy and commercially credible. It should appeal to Kenyan customers who shop on mobile and expect fast, familiar checkout experiences.

The brand should feel locally relevant without resorting to clichés. Do not decorate the interface with generic safari imagery, flags, Maasai patterns, kanga patterns, random African motifs or stock photos of people merely to signal “Kenya”. Local relevance should come from useful commerce details, language, payment methods, local contact conventions, delivery clarity, authentic brand storytelling and considered copy.

### Preserve the signature brand elements

- Brand name: **Blendy** (make it editable in store settings in case the owner later changes the name).
- Brand line from the supplied brief: **Real fruit smoothies**. Keep the wording editable and do not add unverified health or ingredient claims.
- Initial flavours: **Berry, Kiwi, Banana and Strawberry**.
- Retain the pastel flavour identities from the brief:
  - Berry: `#C2B0DC`
  - Kiwi: `#B4D58A`
  - Banana: `#F3DA8A`
  - Strawberry: `#F2AFC0`
- Preserve the original Blendy logo treatment and supplied Poppins/Baloo 2 typography where the assets are available and licensing permits.
- Preserve each flavour's bottle and fruit artwork, crop positions, relative scale, rotations, blur, parallax and slide choreography from the source specification.
- Keep the white flavour word behind the centred bottle on the hero.

### Kenyan creative direction

Use a restrained palette around the four flavour colours: warm white/cream, deep ink/charcoal for body text, subtle neutral surfaces and the existing pastel colours for flavour-led moments. Use whitespace, bold product imagery and clear hierarchy. The flavour colours should not make long body text difficult to read. Use strong contrast for buttons, forms, price labels and essential information.

Use natural, friendly Kenyan English. Avoid exaggerated slang, forced Sheng, fake testimonials, made-up founder stories or claims such as “locally sourced”, “organic”, “no preservatives”, “100% natural”, “healthy”, “sugar-free”, “detox” or “boosts immunity” unless the owner supplies verified facts and approves the wording. Do not make medical, weight-loss or disease-prevention claims.

English is the default language. Structure the content system so reviewed Kiswahili translations can be added later. Do not machine-translate customer-facing legal, payment or product-safety information and publish it without review.

## 3. What kind of store this is

Build a single-brand, direct-to-customer online store, not a multi-vendor marketplace. The initial catalogue contains the four supplied smoothie flavours. The data model must make it easy for the owner to add new products, flavour variants, pack sizes, bundles, seasonal collections and promotional offers through the admin interface without asking a developer to edit frontend code.

The supplied document does not confirm actual prices, pack sizes, ingredients, nutritional information, allergens, stock, shelf life, storage requirements, delivery coverage, delivery charges, collection locations, returns terms, tax registration or customer-service contact details. **Do not invent these facts.** Create editable fields and sensible admin setup flows. Use clearly labelled development/demo records where sample data is essential, and prevent demo content or fake prices from appearing as genuine live offers.

Do not assume Blendy has a physical shop, factory, restaurant, registered office, nationwide delivery or any specific county coverage. These must be configured by the owner. Do not publish a fabricated map pin, address, opening hours, phone number, email, social profile, customer review, rating, ingredient declaration or business registration detail.

## 4. Experience and information architecture

The complete public storefront should include the following routes/pages. Use clean, readable, stable URLs and working navigation.

### A. Home page

1. **Top announcement area** — optional, editable announcement for a verified delivery offer, seasonal message or promotion. It must be dismissible and must not display fake countdowns or false scarcity.
2. **Header/navigation** — Blendy logo; Shop; Our Story; Delivery; FAQs; Contact; account entry where enabled; cart icon with live item count. On mobile, use an accessible menu and keep cart access obvious.
3. **Signature hero slider** — preserve the original four-slide design and motion. The hero should be a full-viewport or near-full-viewport section, not the entire website. The overall storefront must scroll naturally. Keep the original layout composition inside the hero while ensuring the slide's CTA is real and sends the shopper to the selected flavour's product page or product section.
4. **Featured flavours/products** — show available, published products only; product card includes image, flavour/name, short verified description, price in KSh once configured, availability and a clear action.
5. **Why Blendy / brand story preview** — editable brand content; do not invent sourcing or production claims.
6. **How ordering works** — simple, accurate steps: choose a product, enter delivery/collection details, select an available payment method, receive order updates. Adapt wording to the actual configured workflow.
7. **Delivery information teaser** — show only configured service areas, real delivery charges or verified free-delivery conditions. Link to the full delivery page.
8. **Trust and support section** — real contact channels, verified policies and optional approved customer reviews. Hide empty or unverified content blocks.
9. **Newsletter/updates signup** — optional, separate marketing consent and clear unsubscribe path. Never pre-check consent.
10. **Footer** — Shop, Our Story, FAQs, Contact, Delivery, Privacy, Terms, Returns/Refunds, social links and business contact details only when configured.

### B. Shop / catalogue page

- Display products from the persistent database, not a hardcoded frontend array.
- Support flavour/category filters, availability, sorting and search where useful.
- Use clear product cards with consistent image ratios, price, variant/size information if configured, stock messaging and accessible buttons.
- Include pagination or an appropriate progressive loading strategy for future catalogue growth; avoid loading an unnecessarily large product catalogue at once.
- Empty, loading and error states must be designed, not left blank.

### C. Product detail page

Each product needs its own crawlable, shareable URL and an informative detail page. Include:

- Product name, flavour, photographs, verified description and availability.
- Configurable size/pack variant selector where variants exist.
- Price in KSh; compare-at price only when it is a genuine reference price.
- Quantity selector with min/max and stock validation.
- Add-to-cart action with immediate accessible feedback.
- Ingredients, allergens, nutrition facts, storage instructions, volume, shelf life and preparation/use details only when supplied and verified. Hide fields that have not been completed rather than inventing them.
- Delivery/collection information based on configured service areas and rules.
- Clear support link and product FAQs where useful.
- Related products only when they exist and are relevant.
- Accurate Product/Offer structured data generated from the same live product record shown to users.

### D. Cart

- Persistent cart across navigation and refreshes. A guest cart may be stored locally for convenience, but it must be reconciled against server-side product prices, variants and stock at checkout.
- Add, remove and change quantities.
- Show item name, chosen variant, unit price, quantity, line total, subtotal and any configured discount.
- Clearly indicate delivery fee is calculated at checkout when the address is not yet known.
- Never calculate authoritative prices or discounts solely in the browser.
- Handle unavailable products, price changes and stock changes gracefully; explain what changed before checkout.
- Empty-cart state with a clear route back to Shop.

### E. Checkout — optimise for Kenyan mobile shoppers

Use a calm, low-friction, mobile-first checkout. Support guest checkout by default; account creation must not be compulsory to place an order.

Collect only data genuinely needed to fulfil the order. Suggested fields, subject to the real fulfilment model:

- Customer name.
- Kenyan mobile number, with validation and normalisation for common `07...`, `01...`, `254...` and `+254...` inputs. Store a consistent international format such as `+2547XXXXXXXX` or `+2541XXXXXXXX` where valid.
- Email as optional unless a real operational requirement makes it necessary.
- Delivery or collection choice, if both are configured.
- For delivery: county, town, estate/neighbourhood, building/house/apartment, a helpful landmark and optional delivery instructions. Keep address entry practical for Kenyan addressing conventions; do not require a postcode as the only location identifier.
- For collection: show only configured collection point, hours and instructions.
- Optional map pin/geolocation can be offered only as an explicit user action with an explanation and a manual address alternative. Do not request location on page load.

Show an order summary throughout checkout. Recalculate product totals, discounts, tax treatment and delivery fee securely on the server. The final total must be clear before the customer confirms payment.

### F. Payments — M-Pesa first, but never fake a transaction

Design the payment layer around a server-side payment-provider adapter so the provider can be changed without rewriting checkout. The customer-facing default for Kenya should be **M-Pesa STK Push**, when the merchant has configured and activated a genuine provider account.

- Investigate and use the official Safaricom Daraja API or a reputable Kenya-capable payment gateway such as IntaSend, based on the credentials and merchant account the owner actually has. Do not hardcode a provider choice if the account has not been confirmed.
- Keep provider API calls, credentials and signing logic on the server. Never expose secret keys, passkeys, tokens or private configuration in browser code, source maps, public configuration, logs or Git commits.
- Build a clearly separated sandbox/test mode and production mode. Test mode must be visually and technically distinct from live mode.
- If credentials are unavailable, implement a clearly labelled development payment simulator that is disabled in production. Never present a simulated payment as a real successful M-Pesa payment.
- For live checkout, initiate the STK request securely and show an honest state such as “Check your phone to complete payment” / “Waiting for payment confirmation”. An API request being accepted is not proof that funds were received.
- Mark an order as paid only after a verified provider callback and/or an authoritative provider transaction-status verification.
- Validate callback origin/authenticity according to the provider's current official documentation. Use idempotent webhook handling; duplicate callbacks must not create duplicate payments, stock deductions, receipts or order transitions.
- Persist provider checkout/request references, transaction references, amount, currency, timestamps and safe diagnostic status. Never store or request the customer's M-Pesa PIN.
- Handle delayed callbacks, timeout, cancellation, wrong phone number, insufficient funds, network failure, duplicate callbacks and abandoned checkout.
- Provide a safe “Check payment status” or retry path where appropriate without charging twice.
- Never claim card acceptance unless a real card gateway is configured. Do not collect or store card numbers or CVV directly.
- Cash on delivery, pay-on-pickup or other methods may be enabled only as explicit admin-configured options with eligible delivery zones and business rules. Do not assume these are offered.

Provide a setup guide listing the real merchant credentials, callback URL registration and sandbox/live activation steps required by the chosen provider. Do not fabricate API endpoints, credentials or provider approval.

### G. Order confirmation, tracking and customer account

- Generate a unique, human-readable order reference that does not expose sequential internal database IDs.
- After order submission, display confirmation only appropriate to the actual payment/order status. Distinguish “order received”, “awaiting payment”, “paid”, and “confirmed”.
- Provide a secure order-status page. Access should use a time-limited signed link, OTP or another reasonable verification mechanism; do not expose orders merely because someone guesses an order number.
- Order timeline should use truthful states such as received, payment pending/paid, confirmed, preparing, ready for collection, dispatched/out for delivery, delivered, cancelled or refunded, depending on the configured fulfilment model.
- Customer accounts are optional for MVP. If implemented, support secure sign-in, password reset or a managed authentication provider, order history and profile editing. Do not build custom password storage.
- Marketing subscriptions must be separate from transactional order notifications.

### H. Supporting pages

Create useful, editable pages for:

- Our Story.
- Delivery & Collection.
- Frequently Asked Questions.
- Contact & Support.
- Privacy Notice.
- Terms & Conditions.
- Returns, Refunds & Cancellations.
- Cookie information/settings where applicable.

Legal and policy pages are templates requiring owner/legal review. Do not claim the business is compliant or invent delivery/return obligations. Use clear placeholders in admin and a pre-launch checklist that blocks publication of incomplete essential policy pages where appropriate.

## 5. Kenyan market requirements

Build these as real, reusable application behaviours, not decorative text:

### Locale and formatting

- Default market: Kenya.
- Default currency: Kenyan Shilling (KES), displayed consistently as `KSh` or `KES` using one documented format.
- Store amounts in a safe integer minor-unit representation or a precise decimal type; never use floating-point arithmetic for payment totals.
- Format numbers using an `en-KE` locale where appropriate.
- Business time zone: `Africa/Nairobi`. Store canonical timestamps safely and display local time to customers/admins.
- Kenyan mobile number input and validation; normalise before payment requests and notification delivery.
- County/town/estate-oriented addresses, with configured service-area validation.
- English default with a translation-ready structure for Kiswahili.

### Local payment expectations

- Prioritise M-Pesa STK Push for a configured live Kenyan checkout.
- Explain what happens after the customer taps “Pay with M-Pesa”. Keep the user informed while waiting for confirmation.
- Allow the payer phone number to be different from the delivery contact number, if the payment provider and business workflow support it.
- Do not make M-Pesa the only option in the UI if it is not actually enabled and working.

### Delivery and fulfilment

Create an admin-managed delivery configuration:

- Active delivery counties, towns and neighbourhoods/areas.
- Delivery fee by zone or rule.
- Free-delivery threshold, if one is genuinely offered.
- Minimum order amount, if any.
- Estimated delivery window by zone, with wording clearly marked as an estimate.
- Cut-off times and operating days, if supplied.
- Collection locations and pickup instructions, if offered.
- Product-specific delivery restrictions, temperature handling or availability constraints, only where the owner supplies them.

Do not show “nationwide delivery”, “same-day delivery”, “free delivery” or a delivery time until the owner configures and confirms it.

### Customer communications

- Add configurable email and/or SMS provider adapters; do not pretend a message was sent unless the provider accepted it.
- Use transactional messages for order receipt, payment state and dispatch/collection updates.
- WhatsApp support should be an optional configured contact channel, not a fake chatbot. If the business number is configured, show a clear link with a helpful pre-filled message that does not expose sensitive order data in the URL.
- Never send marketing messages without separate, explicit consent and a working opt-out process.

## 6. Admin and store operations

Build a protected, owner-friendly admin dashboard. It must not be a decorative mock dashboard. It should read and write the same persistent database used by the storefront.

Use role-based permissions. At minimum distinguish owner/super-admin, store manager and order/fulfilment staff. Staff must not see or modify payment secrets or privileged account settings unless explicitly authorised.

The admin should support:

1. **Dashboard overview:** orders awaiting action, paid orders, pending payments, stock alerts, recent order activity and sales totals for selected periods. Label all metrics with their time range and source.
2. **Products:** create/edit/archive products; name, slug, flavour, description, images, visibility, SEO fields, category, tags, product attributes and publishing status.
3. **Variants/SKUs:** size/pack option, SKU, price, compare-at price, stock quantity, availability and weight/fulfilment attributes where relevant.
4. **Assets:** upload/select product images, alt text, crop/focal point where useful and image ordering. Keep the original cut-out sheets available for the hero composition.
5. **Hero and brand settings:** logo, strapline, announcement bar, hero active slides, flavour names, colours and selected-product links. Preserve technical artwork placement/crop configuration for the supplied hero assets.
6. **Inventory:** stock adjustments with reason, stock movement history, low-stock threshold and stock reservation/release logic. Prevent overselling under concurrent checkout.
7. **Orders:** search/filter by order reference, date, payment status and fulfilment status; inspect line-item snapshots, delivery/collection details and a history of status changes; add internal notes; update allowed statuses; export carefully permission-controlled CSV if useful.
8. **Delivery configuration:** service zones, fees, thresholds, delivery estimates, collection points and operating rules.
9. **Promotions:** coupons/discounts with start/end date, usage limit, eligible products, minimum order and usage tracking. Validate on the server.
10. **Content management:** Our Story, FAQs, delivery/policy pages, footer links, contact settings and approved testimonials.
11. **Customer support:** customer/order lookup with least-privilege access and privacy-conscious display.
12. **Audit trail:** record sensitive admin changes, payment status changes, stock adjustments and manual order actions with actor and timestamp.
13. **Store settings:** store name, currency, time zone, contact channels, social links, service areas, tax configuration and maintenance mode.

Do not place live payment credentials in editable admin text fields. Secrets belong in the deployment's secret manager/environment configuration.

## 7. Data model and transaction integrity

Design a clear, documented data model suitable for a growing small-to-medium direct-to-customer store. Use stable internal IDs, unique slugs/SKUs, timestamps, explicit statuses and database constraints.

Expected entities (adapt the names to the current stack):

- StoreSettings
- User / AdminRole / Permission
- Customer (only if needed)
- Address
- Product
- ProductVariant / SKU
- ProductImage
- Category / Collection
- InventoryItem / StockMovement / StockReservation
- Cart / CartItem (server-side where accounts or persistence require it)
- Order
- OrderItem snapshot
- PaymentAttempt / PaymentTransaction
- PaymentWebhookEvent
- DeliveryZone / DeliveryRule / CollectionPoint
- Promotion / Coupon / CouponRedemption
- ContentPage / FAQ / Testimonial
- NewsletterSubscription / ConsentRecord
- AuditLog

Business-critical rules:

- The server is authoritative for product price, tax treatment, discounts, stock, delivery fees and final totals.
- Recalculate the cart on the server when checkout begins and again before order/payment confirmation.
- Use atomic database transactions for order creation, inventory reservations and payment/order status changes.
- Use idempotency keys for checkout requests and payment callbacks.
- Prevent duplicate orders and duplicate stock decrements on retries.
- Snapshot product name, selected variant, SKU, quantity and unit price on the order so historical orders remain accurate when catalogue data changes.
- Do not allow an admin to alter the price/contents of a completed order silently; record adjustments and refunds separately.
- Use safe stock reservation expiry for unpaid orders if a reservation model is implemented. Release expired reservations reliably.
- Model payment status separately from fulfilment status.
- Validate every state transition on the server.
- Use server-side pagination for large order/catalogue collections.
- Add database indexes to fields used for lookups, filters and order references.

## 8. Technical architecture and engineering quality

Work with the existing Google AI Studio project and its supported full-stack runtime. Inspect the actual project before choosing implementation details. For a typical AI Studio web app, prefer a well-structured TypeScript/React frontend with server-side Node.js API routes/services. Use a genuine persistent backend such as Firebase Authentication and Firestore/Cloud Storage if it is already integrated or can be configured cleanly in this project. If an alternative database/backend is already present and sound, preserve it rather than migrating without need.

Architecture requirements:

- Separate UI components, page/routes, domain/business logic, data access, payment integrations, notifications, validation and configuration.
- Keep payment provider logic behind a provider interface/adapter.
- Use typed request/response contracts and runtime validation on all untrusted input.
- Centralise currency, time zone, phone normalisation, order-state transitions and price calculations.
- Avoid large monolithic components and duplicated business rules.
- Do not use browser localStorage as the source of truth for orders, prices, inventory, payment status or customer records.
- The server must own privileged database access and secrets.
- Do not expose privileged database/admin SDK credentials to the client.
- Use database security rules and server-side authorisation together; never rely only on hiding admin buttons in the UI.
- Provide migrations/index definitions/schema versioning appropriate to the selected backend.
- Add a `.env.example` with names and descriptions but no real secrets. Validate required environment variables at startup and fail clearly when production-critical settings are missing.
- Use structured logs with correlation/request IDs. Do not log passwords, access tokens, payment secrets, full phone numbers, or unnecessary personal data.
- Add graceful error handling, safe error messages and useful server diagnostics.
- Keep all third-party dependencies necessary and maintained; avoid installing large packages for trivial tasks.
- Keep development, staging/test and production configurations clearly separated.

If Firebase is used:

- Use Firebase Auth or another managed authentication system for administrator authentication; do not implement custom password storage.
- Use server-side Firebase Admin SDK only in the trusted server runtime.
- Design Firestore rules to deny by default and allow only the minimum required user operations. Admin operations must be verified server-side with roles/claims.
- Do not let a customer write their own order as “paid” or set their own total, discount, stock or order status.
- Use transactions/batched writes only where the data model and Firestore constraints support the required atomicity. Explain any workflow that cannot be guaranteed atomic across documents and redesign it safely.
- Keep public product reads separate from private customer/order/payment data.

## 9. SEO, local SEO, GEO and AEO

Treat SEO, geographic relevance and answer-engine discoverability as part of the product architecture, not as a last-minute meta-tag exercise. GEO here means genuine Kenyan geographic relevance and Generative Engine Optimization. AEO means Answer Engine Optimization. Do not use spam tactics or claim guaranteed rankings, AI citations or rich results.

### Technical SEO

- Ensure important product/category/story/delivery pages are server-rendered or otherwise reliably crawlable with meaningful HTML content. Do not rely on a blank JavaScript shell for important product information.
- Use descriptive, stable, human-readable URLs, e.g. `/shop/`, `/shop/berry-smoothie/`, `/delivery/`.
- Unique page titles and meta descriptions; do not generate repetitive keyword-stuffed descriptions.
- Correct canonical URLs; proper redirects when slugs change; avoid duplicate URL versions for filters/sort parameters.
- Create XML sitemap(s) including only canonical, indexable, published pages. Include product pages only when they are valid public pages.
- Create a sensible `robots.txt`; do not block CSS/JS or public assets required to render pages. Keep admin, checkout, cart, account and private order routes out of the index as appropriate.
- Add Open Graph/social sharing metadata and useful product image previews.
- Use semantic HTML landmarks, one clear page H1, meaningful headings and descriptive internal link text.
- Provide useful, descriptive image alt text. Decorative fruit/background art should have empty alt text or be hidden from assistive technology; do not stuff alt text with keywords.
- Prevent thin, duplicate, draft, private or filter-generated URLs from becoming indexed.
- Configure Search Console and analytics as documented setup steps, not with fabricated verification codes.

### Structured data

Implement JSON-LD only when it accurately reflects visible, current page content:

- `Organization` or the most appropriate supported business entity once real legal/business identity details are supplied.
- `WebSite` where appropriate.
- `Product` and `Offer` on individual purchasable product pages, including accurate price/currency/availability and variant details.
- `BreadcrumbList` on relevant pages.
- `LocalBusiness` only if there is a real public-facing business location with verified address/contact/hours; do not invent a physical shop.
- Shipping and return-policy structured data only after the actual policies and supported markets are configured.

Structured data must be generated from the same canonical database values used in the visible page and checkout. Never add fake reviews/ratings, false availability, fake offers, unverifiable prices or invisible content to JSON-LD. Validate the markup and document the validation process. Product markup belongs on focused product detail pages, not indiscriminately on every page.

### Kenya-specific local SEO / geographic relevance

- Build location/service-area landing pages only for locations where Blendy genuinely delivers or operates and has useful, unique information. Do not mass-generate 47 thin county pages.
- Use natural phrases such as “smoothie delivery in [configured town/area]” only where service is actually available.
- Make business name, phone, email, service areas, opening hours and address consistent across the website and business profiles when provided.
- Do not create fake Google Business Profile details or a fake map listing. If a verified physical location exists, provide the owner with a setup checklist for Google Business Profile.
- Include local trust information: how to contact support, what delivery areas are covered, payment options, order support and clear policies.
- Where there is no physical shop, describe the real delivery/service model accurately rather than implying a shop address.

### AEO / answer-friendly content

- Write accurate, useful answers to real shopper questions: what flavours are available, what sizes are offered, how to order, which payments are accepted, where delivery is available, how long delivery is estimated to take, how payment confirmation works, how to contact support and what policies apply.
- Put the direct answer first, then add useful detail. Use clear headings and concise paragraphs where that improves readability.
- Keep essential information as readable text in the page, not only inside images, animations or inaccessible accordions.
- Make product facts, delivery policies and payment instructions consistent across product pages, FAQs, checkout and structured data.
- Keep an owner-editable FAQ with review dates. Do not fabricate answers for unknown policy details.
- Do not create mass AI-generated thin articles, fake expert authors, fake citations, `llms.txt` as a magic ranking solution, hidden keyword blocks or fake third-party mentions. Focus on helpful, verified, original content.
- Ensure public pages are crawlable and internally linked. Do not promise placement in AI Overviews, AI Mode or other answer engines.

### Content and search quality

Do not publish placeholder SEO text, “best smoothie in Kenya” repeated unnaturally, fabricated awards, invented star ratings or made-up local customer quotes. Draft content as editable drafts until a human approves it. Use real product and business data only.

## 10. Performance and Core Web Vitals

Prioritise a fast experience on typical Kenyan mobile devices and mobile networks.

- Establish a baseline and test using Lighthouse/PageSpeed Insights or equivalent tools.
- Aim for good Core Web Vitals: LCP at or below 2.5 seconds, INP below 200 ms and CLS below 0.1 at the 75th percentile where measurement data is available.
- Optimise images to AVIF/WebP variants where supported, with responsive dimensions and explicit width/height or aspect-ratio to prevent layout shifts.
- The hero's principal bottle/fruit imagery is important: load the first active slide reliably and prioritise the visible hero assets. Do not lazy-load the first visible hero image. Lazy-load below-the-fold product/gallery images.
- Preserve the supplied transparent cut-out sheet cropping method and coordinates for hero artwork. Do not rasterise the entire hero into one flat screenshot. Keep text and controls real, responsive and accessible.
- Do not download all four large source sheets at full size on initial page load if they are not needed immediately. Use carefully preloaded active-slide assets and prefetch adjacent slides only when it does not hurt low-end devices or data usage.
- Self-host/licence fonts appropriately when possible, subset fonts to required glyphs, preload only truly critical font files and use `font-display: swap`.
- Avoid excessive animation, large JS bundles, duplicate libraries and unnecessary third-party scripts.
- Respect reduced motion. Provide a graceful static state if animation is disabled or unsupported.
- Use skeletons only where they improve perceived loading; avoid layout shifts and fake progress indicators.
- Cache public catalogue/content safely; never publicly cache private cart, customer, order or payment data.
- Use lazy-loaded route chunks for secondary pages where appropriate.
- Test mobile widths such as 360 px and 390 px, tablet and desktop.

## 11. Security, privacy and trust

Use secure-by-default principles and review the implementation against current OWASP guidance and applicable Kenyan data-protection requirements. This is an engineering baseline, not a claim of legal certification. The owner must review legal documents and confirm the actual business's obligations with qualified advisers where needed.

### Application security

- Validate and sanitise all untrusted input on the server; validate again on the client for usability.
- Enforce authentication and role permissions on every protected endpoint and every admin data operation.
- Protect against injection, XSS, CSRF, SSRF, broken access control, insecure direct object references, request forgery, abuse and enumeration.
- Use secure, HTTP-only, same-site cookies or a managed session/auth strategy appropriate to the stack. Use HTTPS in production.
- Rate-limit sign-in, password reset/OTP, checkout, coupon attempts, contact forms and webhook-adjacent public endpoints.
- Use safe CORS allowlists; do not allow wildcard credentials.
- Apply a practical Content Security Policy and relevant security headers; avoid unsafe inline scripts where possible.
- Avoid exposing stack traces, internal IDs, database errors or provider responses to shoppers.
- Use least privilege for service accounts, database rules and cloud permissions.
- Keep dependencies updated and run available dependency/security scans.
- Back up production data and document restore/recovery steps.

### Payment security

- Store all payment secrets in a managed secret store or protected server environment variables.
- Never ask for or store an M-Pesa PIN.
- Never collect card details directly; use hosted/approved gateway flows.
- Authenticate/validate payment callbacks according to official provider instructions, compare expected amount/currency/order reference and verify transaction status where supported.
- Use idempotency and replay protection. Record raw webhook bodies only when necessary, encrypted/restricted and with a clear retention policy; otherwise record safe parsed event metadata.
- Never trust client-submitted payment status, price, discount, shipping fee or order total.

### Kenya privacy and data protection

- Collect the minimum personal data necessary to process and deliver orders.
- Provide an accessible, plain-language privacy notice before or at collection of personal data.
- Explain purposes, relevant processors/third parties, retention, safeguards, customer rights and contact channel using accurate owner-supplied information.
- Separate order-processing messages from marketing consent. Marketing consent is optional, specific, unbundled and unticked by default.
- Provide unsubscribe/withdrawal mechanisms for marketing.
- Design appropriate processes for access/correction/deletion requests, retention limits, account deletion where applicable and handling data incidents.
- Use cookie/analytics consent controls where required by the actual tracking technologies and applicable law. Do not set non-essential tracking before the appropriate choice.
- Do not send customer data to analytics, AI APIs or third parties without a clear purpose and appropriate configuration/notice.
- Avoid storing precise location data unless the customer deliberately supplies it for delivery and it is genuinely needed.
- Make clear that the owner must confirm controller/processor status, registration obligations, retention periods, cross-border transfers and final privacy wording with the ODPC/legal adviser. Do not display “ODPC certified” or “fully compliant” without evidence.

## 12. Accessibility and inclusive UX

Target WCAG 2.2 AA as a practical design goal.

- Keyboard-operable navigation, menu, slider controls, product selectors, cart and checkout.
- Visible focus styles and logical focus order.
- Proper labels, error messages, help text and accessible validation summaries.
- Semantic buttons/links and correct heading hierarchy.
- Useful alt text for informative product images; hide decorative art from screen readers.
- Sufficient colour contrast, especially white text on the yellow/pink/lilac flavour surfaces.
- Do not communicate errors, stock state or payment state by colour alone.
- Touch targets should be comfortably tappable on mobile.
- Support reduced motion; pause or avoid non-essential auto-moving content when appropriate and give users control over the slider.
- Ensure dialogs/drawers trap and restore focus correctly.
- Do not autoplay audio or create flashing effects.

## 13. Analytics and measurement

Implement an analytics abstraction, not a hard dependency on a single analytics vendor. Provide an owner setup checklist for a privacy-aware analytics provider and Google Search Console. Where analytics is configured and legally appropriate, track useful ecommerce events such as:

- view_item_list
- select_item
- view_item
- add_to_cart
- remove_from_cart
- view_cart
- begin_checkout
- add_shipping_info
- add_payment_info
- purchase (only after verified payment or the precise business-defined paid state)
- refund (when actually processed)

Do not send sensitive personal data, full phone numbers, payment credentials or full delivery addresses into analytics. Prevent duplicate purchase events on reload/retry. Clearly distinguish orders received from orders paid.

Admin reporting should distinguish gross order value, paid revenue, refunds, discounts and delivery charges; define metrics and date ranges. Do not present pending/unpaid orders as paid revenue.

## 14. Testing requirements

Create and run a meaningful test suite. Do not say tests passed unless they were actually executed and passed.

Include:

- Unit tests for KES formatting, phone normalisation, price calculation, coupons, delivery-zone selection, stock rules and order state transitions.
- API/server tests for authentication, permissions, validation, catalogue retrieval, cart recalculation, checkout, orders, webhook validation and idempotency.
- Payment tests using provider sandbox or a local simulator that is impossible to mistake for live payment.
- End-to-end tests for: browse product → add to cart → change quantity → checkout → payment pending/success/failure → order status page.
- Admin tests for product creation/editing, price updates, inventory adjustment, delivery-zone changes and order fulfilment updates.
- Security checks for customer access to another customer's order, unauthorised admin access, tampered totals, invalid coupons, duplicate webhook deliveries and stock overselling.
- Responsive visual tests at 360×640, 390×844, 768 px, 1024 px and 1440×900 or equivalent.
- Accessibility checks including keyboard navigation, form labels, focus, contrast and reduced motion.
- SEO checks for page titles, canonicals, sitemap, robots rules, structured data and crawlable product text.

When a test fails, identify the root cause, fix it and rerun the relevant tests. Keep a short test report noting what actually ran, what passed, what failed and what remains blocked by unavailable external credentials.

## 15. Deployment and launch readiness

Prepare the app to deploy using the hosting/deployment options supported by the current Google AI Studio project. If the project is deployed to Google Cloud Run or another Google-supported environment, document the exact configuration required for this project rather than assuming it has already been deployed.

Provide:

- Development, staging and production environment separation.
- A complete `.env.example` with dummy values only.
- Server build/start commands and health-check endpoint.
- Secure production environment and secret configuration instructions.
- Persistent database setup, indexes/rules and backup plan.
- Storage configuration for uploaded images.
- Domain and HTTPS setup checklist.
- Sitemap/Search Console submission instructions.
- Payment provider sandbox-to-live checklist and callback setup.
- Email/SMS provider setup if enabled.
- Admin bootstrap process that does not hardcode a public default password.
- Database rules/migrations and initial seed process.
- Error monitoring/logging setup and a rollback/recovery plan.
- A pre-launch checklist and known limitations.

Do not claim the site is “launched”, “live”, “secure”, “fully compliant” or “accepting real payments” until those outcomes have been verified in the actual hosting and merchant accounts.

## 16. Build workflow — work in controlled, testable phases

Implement in the following order. Keep the project runnable after each phase. Do not make one huge speculative rewrite.

**Phase 0 — Audit and plan**
- Inspect current files and attached reference.
- Report existing stack, working components, missing capabilities and external prerequisites.
- Create an implementation checklist and identify business facts the owner must supply.

**Phase 1 — Foundation and design system**
- Stabilise routes, app structure, design tokens, responsive layout, header/footer and reusable components.
- Preserve the exact hero art/crop/motion rules from the supplied specification.
- Make the overall site scrollable while keeping the hero composition intact.
- Add accessibility and reduced-motion support.

**Phase 2 — Store catalogue and content**
- Persistent product/variant/category data.
- Shop page, product detail pages, content pages and admin catalogue management.
- Seed the four initial flavours as draft/demo entries if actual commercial details are unknown.

**Phase 3 — Cart and fulfilment rules**
- Server-authoritative cart recalculation.
- Guest cart persistence and reconciliation.
- Delivery zone/fee configuration and collection option where enabled.
- Stock validation and safe reservation strategy.

**Phase 4 — Checkout, orders and payment adapter**
- Kenyan checkout form and address model.
- Order creation and state transitions.
- Payment provider interface, sandbox integration and genuine M-Pesa provider setup path.
- Webhook verification, idempotency and order tracking.

**Phase 5 — Admin and operations**
- Protected dashboard, roles, product management, order management, inventory, delivery configuration, settings and audit log.

**Phase 6 — Discoverability, performance and privacy**
- SEO/AEO/local discovery, structured data, sitemap, robots rules, Open Graph, performance, analytics hooks, privacy/consent and security hardening.

**Phase 7 — Quality assurance and launch preparation**
- Run all tests and responsive/accessibility checks.
- Fix errors and produce the truthful test report.
- Document deployment, payment activation and owner setup tasks.

At the end of every phase:
1. Summarise files/features changed.
2. State exactly what was implemented and what is still a placeholder.
3. Run the available checks/tests.
4. Show any errors honestly and fix them before moving forward.
5. Keep the application preview runnable.

## 17. Definition of done

The project is not complete merely because the homepage looks attractive. It is ready for a controlled launch only when all applicable items below are true:

- The four-flavour hero retains the original identity, imagery and interaction quality.
- The rest of the site is a coherent, responsive, scrollable Kenyan storefront.
- Products, prices, variants and availability come from persistent data.
- The owner can manage the catalogue and fulfilment without editing source code.
- A customer can browse, add to cart, change quantities and complete the checkout flow.
- Checkout totals are calculated on the server and cannot be tampered with from the browser.
- M-Pesa payment is either connected to a real configured provider and verified end-to-end, or visibly remains in sandbox/unavailable mode. There is no fake “successful” live payment.
- Order records, payment records and fulfilment statuses are reliable and auditable.
- Kenyan phone/address/currency/time-zone behaviours work.
- SEO essentials and accurate structured data are present.
- Privacy, access controls, validation, secrets and webhook handling have been reviewed.
- The site is accessible and performs well on mobile.
- Key automated tests pass and the remaining external dependencies are documented.
- No made-up prices, product claims, contact details, delivery coverage, reviews or policies are published.

## 18. How you should communicate while building

Be proactive and precise. Do not ask the owner to repeat information already present in the code or attached design brief. When a business-critical fact is unknown, create a configurable setting and clearly identify it as requiring owner input. If a technical decision can be made safely, choose a good default and explain it briefly.

Do not spend time producing generic essays instead of building. Inspect, plan, implement, execute checks, fix defects and report. Do not invent test results. Do not silently delete existing behaviour. Do not claim external integrations work until a real sandbox/live transaction or provider test confirms them.

Start now with **Phase 0: audit the existing project and the attached Blendy specification**. Then move into the implementation phases in order, preserving a runnable state throughout.

---

# PART 2 — FOLLOW-UP PROMPTS TO USE ONE AT A TIME

Use these after the master prompt if the agent pauses, over-compresses a phase or starts skipping verification. Paste one prompt, let it finish, inspect the result, then continue.

## Follow-up 1 — Audit before implementation

“Complete Phase 0 only. Inspect every existing project file and the full attached Blendy specification. Do not rewrite or delete anything yet. Return: (1) current architecture and stack, (2) what already works, (3) gaps and defects, (4) exact assets/design rules that must be preserved, (5) database/payment/auth/storage integrations already present, (6) external credentials and owner facts required, and (7) a sequenced implementation checklist. Distinguish facts from assumptions. Then wait for my review.”

## Follow-up 2 — Rebuild the storefront design without losing Blendy

“Implement Phase 1. Keep the original Blendy four-flavour hero faithful to the source specification, including the supplied image sheets and crop coordinates, but make the overall website a scrollable, accessible ecommerce storefront. Build the responsive header, mobile navigation, hero CTA, product discovery preview, brand story section, delivery information teaser, FAQ/support teaser and complete footer. Use the existing design identity, not a generic template. Do not invent prices, ingredients, delivery promises or business contact details. Test 360 px, 390 px, tablet and desktop layouts and reduced-motion mode.”

## Follow-up 3 — Catalogue and product management

“Implement Phase 2. Create the persistent product catalogue and admin management for the four initial flavours. Add variants/SKUs, prices, stock, visibility, images, SEO fields, categories and publication status. Build the Shop page and individual product pages with stable URLs and server-backed content. Keep unknown product facts blank/draft until supplied. Make sure the public storefront reads from the database, not hardcoded product arrays. Add tests for catalogue visibility, variants, stock display and unpublished products.”

## Follow-up 4 — Cart and Kenyan delivery logic

“Implement Phase 3. Build a fully working cart with quantity changes, removal, subtotal, configured discounts and server-side recalculation. Add Kenyan checkout address structures (county, town, estate/area, building/house and landmark), phone validation/normalisation and configurable service zones, delivery fees, collection points and eligibility rules. Do not invent delivery coverage, fees or delivery-time promises. Prevent overselling and handle price/stock changes gracefully. Add tests for tampered client totals, invalid delivery areas, stock races and cart refresh.”

## Follow-up 5 — M-Pesa-first checkout

“Implement Phase 4 with a payment-provider adapter and a real, testable order lifecycle. Review current official Safaricom Daraja documentation and/or the chosen Kenya-capable payment gateway documentation before coding provider calls. Do not guess endpoints or security requirements. Implement sandbox mode first; keep live mode disabled until valid merchant credentials and callback configuration are supplied. Verify payment callbacks/status server-side, handle duplicates idempotently, and never mark an order paid merely because an STK push request was accepted. Do not collect/store M-Pesa PINs or card data. Add tests for success, pending, failure, cancellation, timeouts, duplicate callbacks and amount/reference mismatches.”

## Follow-up 6 — Admin operations

“Implement Phase 5. Build a real, protected operations dashboard linked to persistent data. Include role-based permissions, product/variant management, inventory movements, order search and status updates, delivery configuration, content/FAQ/policy management, promotions, customer support lookup and audit logs. Protect every server endpoint, not just the user interface. Payment secrets must remain in the deployment secret manager/environment, never in editable page content. Add tests for staff permissions and cross-customer data access.”

## Follow-up 7 — SEO, AEO, GEO, privacy and speed

“Implement Phase 6. Apply technical ecommerce SEO, Kenya-relevant local discovery and answer-friendly content. Add unique metadata, canonical URLs, crawlable product pages, sitemap, robots.txt, Open Graph, correct JSON-LD Product/Offer and BreadcrumbList data, and LocalBusiness only if a real physical location is configured. Do not use fake reviews, made-up business addresses, thin county landing pages, keyword stuffing or claims of guaranteed AI visibility. Improve images, fonts, JS, caching and Core Web Vitals. Review OWASP security basics and Kenya data-protection transparency/consent. Add a report of what was verified and what still needs owner/legal review.”

## Follow-up 8 — Final QA and launch-readiness review

“Implement Phase 7. Run the full available automated test suite, build checks, dependency checks, mobile/responsive checks, accessibility checks, SEO checks and payment sandbox checks. Fix every reproducible defect. Test customer and admin roles, tampered checkout totals, duplicate webhook events, overselling, order privacy, unavailable products and network errors. Produce a launch-readiness report with pass/fail/blocked status, exact test commands/results, unresolved defects, missing owner facts, missing credentials and a step-by-step deployment checklist. Do not claim live payment or legal compliance unless verified.”

## Follow-up 9 — Do not allow visual regression

“Compare the current hero implementation against the original attached Blendy specification. Check all four colours, bottle placement/scale, fruit crop coordinates, word sizing/tracking, floor shadows, corner blur, tab underline, nav spacing, arrows, opening sequence, transition direction/timing, autoplay, keyboard, swipe, mobile layout and reduced-motion behaviour. Fix any regressions without changing the wider storefront. Report the specific measurements and viewports tested.”

---

# PART 3 — OWNER INFORMATION TO PREPARE BEFORE REAL LAUNCH

AI Studio can build most of the system before these details are available, but the following must be confirmed before customers can place genuine orders.

## Brand and product facts

- Confirm whether “Blendy” is the final business/brand name and whether the logo/wordmark is final.
- Exact product names and approved descriptions.
- Actual pack sizes/volumes and variants.
- Price for every active SKU in KSh.
- Ingredient lists, allergen statements and nutritional information where applicable.
- Storage instructions, shelf life and handling requirements.
- Actual product photos and any approved claims.
- Initial stock quantities and inventory process.

## Business and service details

- Registered business/legal name where it must appear.
- Customer support phone number and email.
- WhatsApp support number, if offered.
- Actual operating model: delivery, collection, retail pickup or a combination.
- Real counties, towns and neighbourhoods served.
- Delivery fees, delivery estimates, minimum order and free-delivery conditions, if any.
- Collection point address/hours, if any.
- Returns, refunds, cancellations and complaints process.
- Social media URLs and approved brand story.

## Payment and notification setup

- M-Pesa merchant arrangement and provider choice (Safaricom Daraja directly or a supported gateway).
- Sandbox credentials for testing and live credentials after merchant approval.
- Correct callback/webhook URL and any provider-side registration/verification requirements.
- Whether cards, cash on delivery, pay-on-pickup or other payment methods are actually offered.
- Email/SMS provider account and sender identity if transactional messaging is required.

## Governance and launch

- Domain name and hosting account.
- Named owner/admin users and access roles.
- Final privacy notice, terms, delivery/returns policy and cookie/analytics choices reviewed for the actual business.
- Tax treatment and whether displayed prices are tax-inclusive, confirmed with the business accountant/adviser.
- Data retention, access/deletion request contact and any required ODPC registration/compliance steps confirmed by the business.
- Google Search Console and analytics property access.

---

# PART 4 — RECOMMENDED LAUNCH STRATEGY

Do not try to switch on every possible feature on day one. Build the complete architecture, but launch in controlled stages:

### Stage A — Brand and catalogue preview

Public website, original hero, product catalogue, product pages, brand story, delivery information and support pages. Products remain clearly unpublished or marked as preview until product facts and actual pricing are confirmed.

### Stage B — Controlled order testing

Enable checkout in test mode for the owner and a small test group. Confirm real prices, service areas, delivery fees, notifications, stock rules and sandbox M-Pesa behaviour. No public live payment claims.

### Stage C — Limited live launch

Enable only the verified products, delivery zones and payment methods. Start with a manageable fulfilment area, monitor orders daily and expand service zones only after operations can support them.

### Stage D — Growth

Add approved bundles, repeat-order offers, loyalty features, seasonal flavours, reviewed Kiswahili content, product feeds, richer analytics and additional service areas based on real demand and fulfilment capacity.

---

# PART 5 — TECHNICAL REFERENCES FOR THE IMPLEMENTATION AGENT

Use the current official documentation at implementation time. Do not rely on remembered endpoints or outdated blog tutorials.

- Google AI Studio Build mode: https://ai.google.dev/gemini-api/docs/aistudio-build-mode
- Safaricom Daraja developer portal: https://developer.safaricom.co.ke/
- IntaSend Kenya API documentation: https://developers.intasend.com/countries/kenya/
- Kenya Office of the Data Protection Commissioner: https://www.odpc.go.ke/
- ODPC Data Protection Policies guidance: https://odpc.go.ke/ (find the latest guidance note before finalising privacy workflows)
- Google Search Central ecommerce SEO: https://developers.google.com/search/docs/specialty/ecommerce
- Google Search Central merchant listing structured data: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Google Search Central Product structured data: https://developers.google.com/search/docs/appearance/structured-data/product
- Google Search Central LocalBusiness structured data: https://developers.google.com/search/docs/appearance/structured-data/local-business
- Google Search Central generative AI search guidance: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google Search Central Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals
- Kenya Revenue Authority VAT guidance: https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax

**Important:** Technical references are starting points, not a substitute for checking the current documentation, account requirements, legal applicability and actual merchant configuration. In particular, payment provider approval, tax treatment, privacy obligations, product safety disclosures and delivery policies depend on the real business.

---

# FINAL INSTRUCTION

The goal is not simply to make Blendy look like a Kenyan website. The goal is to create a trustworthy Kenyan online buying experience that feels unmistakably like Blendy, is easy to use on a phone, supports real store operations, protects customers and the business, can be maintained by the owner, and is structured for search and future growth.

Preserve the design. Build the commerce properly. Make every visible control meaningful. Verify what can be verified. Clearly label what still needs a real account, business fact, policy decision or external credential. Start with the audit, then build in phases.
