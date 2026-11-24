import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './src/db/index.ts';
import {
  auditLogs,
  collectionPoints,
  contentPages,
  deliveryZones,
  faqs,
  newsletterSubscribers,
  orderItems,
  orders,
  orderStatusEvents,
  paymentTransactions,
  paymentWebhookEvents,
  products,
  productVariants,
  promotions,
  stockMovements,
  storeSettings,
  testimonials,
  users,
} from './src/db/schema.ts';
import { ensureInitialSeed } from './src/db/seed.ts';
import { optionalAuth, requireAuth, requireRole, type AuthRequest } from './src/middleware/auth.ts';
import {
  calculateCartQuote,
  createOrderAtomic,
  finalizeStockForAdminOrderChange,
  hashAccessToken,
  prepareOrderRetryPayment,
  reconcilePaymentResult,
  releaseExpiredReservations,
} from './src/services/commerce.ts';
import {
  getPaymentProviderStatus,
  initiateMpesaStkPush,
  queryIntaSendPaymentStatus,
  verifyIntaSendChallenge,
} from './src/services/payments.ts';
import { dispatchTransactionalNotification } from './src/services/notifications.ts';
import {
  adjustVariantStock,
  createProductSchema,
  createProductWithVariants,
  createVariant,
  createVariantSchema,
  getProductBySlug,
  listProducts,
  updateProductSchema,
  updateProductWithDetails,
  updateVariant,
  updateVariantSchema,
} from './src/services/products.ts';
import { chatRequestSchema, generateStorefrontChatReply } from './src/services/chat.ts';
import {
  canTransitionFulfilment,
  canTransitionPayment,
  type FulfilmentStatus,
  type PaymentStatus,
} from './src/lib/kenya.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';

// Simple sliding-window in-memory rate limiter for public mutation routes
const rateBucket = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const entry = rateBucket.get(key);
    if (!entry || entry.resetAt <= now) {
      rateBucket.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }
    entry.count++;
    return next();
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isOrderTokenValid(rawToken: string, storedHexHash: string): boolean {
  if (!rawToken || !storedHexHash) return false;
  const incomingHex = hashAccessToken(rawToken);
  const a = Buffer.from(incomingHex, 'hex');
  const b = Buffer.from(storedHexHash, 'hex');
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function csvSafeCell(val: unknown): string {
  let s = String(val ?? '').replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

// Core product fetching/CRUD lives in src/services/products.ts

async function loadOrderDetail(orderId: number) {
  const [ord] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!ord) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
  const events = await db
    .select()
    .from(orderStatusEvents)
    .where(eq(orderStatusEvents.orderId, ord.id))
    .orderBy(asc(orderStatusEvents.createdAt));
  const txs = await db
    .select({
      id: paymentTransactions.id,
      provider: paymentTransactions.provider,
      environment: paymentTransactions.environment,
      invoiceId: paymentTransactions.invoiceId,
      mpesaReceipt: paymentTransactions.mpesaReceipt,
      amountCents: paymentTransactions.amountCents,
      state: paymentTransactions.state,
      failureReason: paymentTransactions.failureReason,
      createdAt: paymentTransactions.createdAt,
    })
    .from(paymentTransactions)
    .where(eq(paymentTransactions.orderId, ord.id))
    .orderBy(desc(paymentTransactions.createdAt));

  return {
    ...ord,
    items,
    events,
    transactions: txs,
  };
}

async function recordAudit(
  req: AuthRequest,
  action: string,
  entityType: string,
  entityId: string,
  summary: string
) {
  if (!req.authUser) return;
  await db.insert(auditLogs).values({
    actorUid: req.authUser.uid,
    actorEmail: req.authUser.email,
    action,
    entityType,
    entityId,
    summary,
  });
}

export async function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Correlation ID & Security Headers
  app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', String(requestId));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    next();
  });

  app.use('/fonts', express.static(path.join(__dirname, 'public', 'fonts'), { maxAge: '1y' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await ensureInitialSeed();
      res.json({ status: 'ok', timezone: 'Africa/Nairobi' });
    } catch (err) {
      console.error('Health check failed:', err);
      res.status(503).json({ status: 'degraded' });
    }
  });

  // Storefront Bootstrap
  app.get('/api/storefront/bootstrap', optionalAuth, async (req: AuthRequest, res) => {
    try {
      await ensureInitialSeed();
      await releaseExpiredReservations();

      const isStaff =
        req.authUser &&
        ['owner', 'manager', 'fulfilment_staff'].includes(req.authUser.role);
      const includeDrafts = isStaff && req.query.previewDrafts === '1';

      const [settings] = await db.select().from(storeSettings).limit(1);
      const prodList = await listProducts({ includeDrafts: Boolean(includeDrafts) });
      const zones = await db
        .select()
        .from(deliveryZones)
        .where(eq(deliveryZones.isActive, true))
        .orderBy(asc(deliveryZones.sortOrder), asc(deliveryZones.county));
      const pickups = await db
        .select()
        .from(collectionPoints)
        .where(eq(collectionPoints.isActive, true))
        .orderBy(asc(collectionPoints.name));
      const publishedFaqs = await db
        .select()
        .from(faqs)
        .where(eq(faqs.isPublished, true))
        .orderBy(asc(faqs.sortOrder), asc(faqs.id));
      const approvedTestimonials = await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.isApproved, true))
        .orderBy(desc(testimonials.createdAt));

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        settings,
        products: prodList,
        deliveryZones: zones,
        collectionPoints: pickups,
        faqs: publishedFaqs,
        testimonials: approvedTestimonials,
        paymentProvider: getPaymentProviderStatus(),
        mapsApiKey: (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim(),
      });
    } catch (err) {
      console.error('Bootstrap error:', err);
      res.status(500).json({ error: 'Unable to load storefront configuration.' });
    }
  });

  // Storefront Gemini Multi-Turn Concierge
  app.post('/api/chat', rateLimit(25, 60_000), async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid chat request.' });
    }

    try {
      await ensureInitialSeed();
      const result = await generateStorefrontChatReply(parsed.data);
      return res.json(result);
    } catch (err) {
      const status = (err as { statusCode?: number; status?: number })?.statusCode
        || (err as { status?: number })?.status
        || 500;
      const msg = err instanceof Error ? err.message : 'Unable to generate chat response.';
      console.error('Chat error:', err);
      return res.status(status >= 400 && status < 600 ? status : 500).json({ error: msg });
    }
  });

  // Public Catalogue API
  app.get('/api/products', optionalAuth, async (req: AuthRequest, res) => {
    try {
      await ensureInitialSeed();
      const isStaff =
        req.authUser && ['owner', 'manager', 'fulfilment_staff'].includes(req.authUser.role);
      const includeDrafts = Boolean(isStaff && req.query.includeDrafts === '1');

      const list = await listProducts({
        includeDrafts,
        flavour: typeof req.query.flavour === 'string' ? req.query.flavour : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        sort: typeof req.query.sort === 'string' ? req.query.sort : 'featured',
        inStockOnly: req.query.inStock === '1',
      });

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 24));
      const total = list.length;
      const paged = list.slice((page - 1) * limit, page * limit);

      res.json({ products: paged, total, page, limit });
    } catch (err) {
      console.error('Products list error:', err);
      res.status(500).json({ error: 'Unable to load products.' });
    }
  });

  app.get('/api/products/:slug', optionalAuth, async (req: AuthRequest, res) => {
    try {
      await ensureInitialSeed();
      const isStaff =
        req.authUser && ['owner', 'manager', 'fulfilment_staff'].includes(req.authUser.role);
      const result = await getProductBySlug(String(req.params.slug || ''), Boolean(isStaff));
      if (!result || (!isStaff && result.product.status !== 'published')) {
        return res.status(404).json({ error: 'Product not found.' });
      }
      return res.json(result);
    } catch (err) {
      console.error('Product detail error:', err);
      return res.status(500).json({ error: 'Unable to load product.' });
    }
  });

  // Server-authoritative Cart Quote
  const quoteSchema = z.object({
    items: z.array(
      z.object({
        productId: z.number().int().positive(),
        variantId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(100),
      })
    ),
    fulfilmentType: z.enum(['delivery', 'collection']).default('delivery'),
    deliveryZoneId: z.number().int().positive().nullable().optional(),
    collectionPointId: z.number().int().positive().nullable().optional(),
    promoCode: z.string().max(40).nullable().optional(),
  });

  app.post('/api/cart/quote', rateLimit(60, 60_000), async (req, res) => {
    const parsed = quoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid cart payload.' });
    }
    try {
      await ensureInitialSeed();
      await releaseExpiredReservations();
      const quote = await calculateCartQuote(parsed.data);
      res.setHeader('Cache-Control', 'no-store');
      return res.json(quote);
    } catch (err) {
      console.error('Cart quote error:', err);
      return res.status(500).json({ error: 'Could not calculate cart quote.' });
    }
  });

  // Create Order & Initiate Payment
  const checkoutSchema = z.object({
    idempotencyKey: z.string().min(8).max(80),
    customerName: z.string().min(2).max(120),
    customerPhone: z.string().min(9).max(20),
    payerPhone: z.string().max(20).optional().default(''),
    customerEmail: z.string().email().optional().or(z.literal('')).default(''),
    fulfilmentType: z.enum(['delivery', 'collection']),
    deliveryZoneId: z.number().int().positive().nullable().optional(),
    collectionPointId: z.number().int().positive().nullable().optional(),
    county: z.string().max(80).optional().default(''),
    town: z.string().max(80).optional().default(''),
    estate: z.string().max(120).optional().default(''),
    building: z.string().max(120).optional().default(''),
    landmark: z.string().max(160).optional().default(''),
    deliveryInstructions: z.string().max(300).optional().default(''),
    paymentMethod: z.enum(['mpesa_intasend', 'mpesa_sandbox_sim', 'pay_on_delivery', 'pay_on_pickup']),
    promoCode: z.string().max(40).nullable().optional(),
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          variantId: z.number().int().positive(),
          quantity: z.number().int().min(1).max(100),
        })
      )
      .min(1),
  });

  app.post('/api/checkout/orders', rateLimit(20, 60_000), optionalAuth, async (req: AuthRequest, res) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid checkout fields.' });
    }
    const data = parsed.data;
    if (data.fulfilmentType === 'delivery' && (!data.county.trim() || !data.town.trim() || !data.estate.trim())) {
      return res.status(400).json({ error: 'County, town, and estate/neighbourhood are required for delivery.' });
    }

    try {
      await ensureInitialSeed();
      const created = await createOrderAtomic({
        idempotencyKey: data.idempotencyKey,
        userUid: req.authUser?.uid ?? null,
        customerName: data.customerName,
        customerPhoneRaw: data.customerPhone,
        payerPhoneRaw: data.payerPhone,
        customerEmail: data.customerEmail,
        fulfilmentType: data.fulfilmentType,
        deliveryZoneId: data.deliveryZoneId,
        collectionPointId: data.collectionPointId,
        county: data.county,
        town: data.town,
        estate: data.estate,
        building: data.building,
        landmark: data.landmark,
        deliveryInstructions: data.deliveryInstructions,
        paymentMethod: data.paymentMethod,
        promoCode: data.promoCode,
        items: data.items,
      });

      if (created.reused) {
        const detail = await loadOrderDetail(created.order.id);
        return res.status(200).json({
          order: detail,
          reused: true,
          paymentProvider: getPaymentProviderStatus(),
        });
      }

      // Initiate STK Push if M-Pesa method chosen
      if (data.paymentMethod === 'mpesa_intasend' || data.paymentMethod === 'mpesa_sandbox_sim') {
        try {
          const stk = await initiateMpesaStkPush({
            amountCents: created.order.totalCents,
            phone254: created.payerPhone254!,
            orderRef: created.order.orderRef,
          });

          await db.insert(paymentTransactions).values({
            orderId: created.order.id,
            provider: stk.provider,
            environment: stk.environment,
            invoiceId: stk.invoiceId,
            phoneNumber: created.order.payerPhone,
            amountCents: created.order.totalCents,
            currency: 'KES',
            state: stk.state,
            rawMetaJson: stk.rawMeta,
          });

          await db
            .update(orders)
            .set({ paymentStatus: 'pending_confirmation', updatedAt: new Date() })
            .where(eq(orders.id, created.order.id));

          await db.insert(orderStatusEvents).values({
            orderId: created.order.id,
            eventType: 'payment',
            fromStatus: 'awaiting_payment',
            toStatus: 'pending_confirmation',
            note: `M-Pesa STK prompt initiated (${stk.environment}). Waiting for confirmation.`,
            actorUid: req.authUser?.uid ?? 'guest',
          });
        } catch (stkErr) {
          await reconcilePaymentResult({
            orderId: created.order.id,
            invoiceId: 'INIT-FAILED',
            targetPaymentStatus: 'failed',
            txState: 'FAILED',
            failureReason: stkErr instanceof Error ? stkErr.message : 'STK Push failed to initiate.',
            actorUid: 'system',
          });
          const failedDetail = await loadOrderDetail(created.order.id);
          return res.status(502).json({
            error: stkErr instanceof Error ? stkErr.message : 'Could not initiate M-Pesa payment.',
            order: failedDetail,
            accessToken: created.rawAccessToken,
          });
        }
      }

      if (created.order.customerEmail) {
        await dispatchTransactionalNotification({
          channel: 'email',
          recipient: created.order.customerEmail,
          subject: `Blendy Order ${created.order.orderRef} Received`,
          message: `We received your order ${created.order.orderRef}. Current payment status: ${created.order.paymentStatus}.`,
          orderRef: created.order.orderRef,
        });
      }

      const detail = await loadOrderDetail(created.order.id);
      return res.status(201).json({
        order: detail,
        accessToken: created.rawAccessToken,
        paymentProvider: getPaymentProviderStatus(),
      });
    } catch (err) {
      return res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to place order.',
      });
    }
  });

  // Order Status Lookup (token-protected or signed-in owner or staff)
  app.get('/api/orders/:orderRef/status', rateLimit(40, 60_000), optionalAuth, async (req: AuthRequest, res) => {
    const orderRef = String(req.params.orderRef || '').trim().toUpperCase();
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

    const [ord] = await db.select().from(orders).where(eq(orders.orderRef, orderRef)).limit(1);
    if (!ord) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const isStaff =
      req.authUser && ['owner', 'manager', 'fulfilment_staff'].includes(req.authUser.role);
    const isAccountOwner = req.authUser && ord.userUid && ord.userUid === req.authUser.uid;
    const isTokenHolder = isOrderTokenValid(token, ord.accessTokenHash);

    if (!isStaff && !isAccountOwner && !isTokenHolder) {
      return res.status(403).json({
        error: 'A valid order verification link token or signed-in account is required to view this order.',
      });
    }

    const detail = await loadOrderDetail(ord.id);
    if (!detail) return res.status(404).json({ error: 'Order not found.' });
    const { accessTokenHash: _hidden, ...safeOrder } = detail;
    return res.json({ order: safeOrder, paymentProvider: getPaymentProviderStatus() });
  });

  // Safe Payment Status Check (queries IntaSend if configured)
  app.post('/api/orders/:orderRef/check-payment', rateLimit(20, 60_000), optionalAuth, async (req: AuthRequest, res) => {
    const orderRef = String(req.params.orderRef || '').trim().toUpperCase();
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    const [ord] = await db.select().from(orders).where(eq(orders.orderRef, orderRef)).limit(1);
    if (!ord) return res.status(404).json({ error: 'Order not found.' });

    const isStaff = req.authUser && ['owner', 'manager', 'fulfilment_staff'].includes(req.authUser.role);
    const isOwner = req.authUser && ord.userUid && ord.userUid === req.authUser.uid;
    const isTokenHolder = isOrderTokenValid(token, ord.accessTokenHash);
    if (!isStaff && !isOwner && !isTokenHolder) {
      return res.status(403).json({ error: 'Unauthorized order status check.' });
    }

    const [latestTx] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.orderId, ord.id))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(1);

    if (latestTx && latestTx.provider === 'intasend' && ord.paymentStatus !== 'paid') {
      try {
        const statusResult = await queryIntaSendPaymentStatus(latestTx.invoiceId);
        if (statusResult.state === 'COMPLETE') {
          await reconcilePaymentResult({
            orderId: ord.id,
            invoiceId: latestTx.invoiceId,
            targetPaymentStatus: 'paid',
            txState: 'COMPLETE',
            mpesaReceipt: statusResult.mpesaReceipt,
            actorUid: 'intasend_status_poll',
          });
        } else if (statusResult.state === 'FAILED') {
          await reconcilePaymentResult({
            orderId: ord.id,
            invoiceId: latestTx.invoiceId,
            targetPaymentStatus: 'failed',
            txState: 'FAILED',
            failureReason: statusResult.failureReason || 'Payment failed.',
            actorUid: 'intasend_status_poll',
          });
        } else if (statusResult.state === 'CANCELED') {
          await reconcilePaymentResult({
            orderId: ord.id,
            invoiceId: latestTx.invoiceId,
            targetPaymentStatus: 'cancelled',
            txState: 'CANCELED',
            failureReason: 'Cancelled by payer.',
            actorUid: 'intasend_status_poll',
          });
        }
      } catch (err) {
        return res.status(502).json({
          error: err instanceof Error ? err.message : 'Could not verify payment with IntaSend.',
        });
      }
    }

    const detail = await loadOrderDetail(ord.id);
    if (!detail) return res.status(404).json({ error: 'Order not found.' });
    const { accessTokenHash: _hidden, ...safeOrder } = detail;
    return res.json({ order: safeOrder });
  });

  // Development Payment Simulator (strictly disabled in production or when live/sandbox keys exist)
  app.post('/api/payments/sandbox-simulate', rateLimit(20, 60_000), optionalAuth, async (req: AuthRequest, res) => {
    const providerStatus = getPaymentProviderStatus();
    if (providerStatus.provider !== 'sandbox_sim') {
      return res.status(403).json({
        error: 'Development payment simulator is disabled because a real gateway or production mode is active.',
      });
    }

    const orderRef = typeof req.body?.orderRef === 'string' ? req.body.orderRef.trim().toUpperCase() : '';
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const outcome = req.body?.outcome;

    if (!['COMPLETE', 'FAILED', 'CANCELED'].includes(outcome)) {
      return res.status(400).json({ error: 'Outcome must be COMPLETE, FAILED, or CANCELED.' });
    }

    const [ord] = await db.select().from(orders).where(eq(orders.orderRef, orderRef)).limit(1);
    if (!ord) return res.status(404).json({ error: 'Order not found.' });

    const isTokenHolder = isOrderTokenValid(token, ord.accessTokenHash);
    const isOwner = req.authUser && ord.userUid === req.authUser.uid;
    if (!isTokenHolder && !isOwner) {
      return res.status(403).json({ error: 'Valid order token required.' });
    }

    const [latestTx] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.orderId, ord.id))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(1);

    if (!latestTx || latestTx.provider !== 'sandbox_sim') {
      return res.status(400).json({ error: 'No simulator transaction found for this order.' });
    }

    const targetPaymentStatus: PaymentStatus =
      outcome === 'COMPLETE' ? 'paid' : outcome === 'CANCELED' ? 'cancelled' : 'failed';

    await reconcilePaymentResult({
      orderId: ord.id,
      invoiceId: latestTx.invoiceId,
      targetPaymentStatus,
      txState: outcome,
      mpesaReceipt: outcome === 'COMPLETE' ? `SIM${Date.now().toString().slice(-7)}` : '',
      failureReason:
        outcome === 'FAILED'
          ? 'Simulated insufficient funds / timeout.'
          : outcome === 'CANCELED'
            ? 'Simulated customer cancellation.'
            : '',
      actorUid: 'sandbox_simulator',
    });

    const detail = await loadOrderDetail(ord.id);
    if (!detail) return res.status(404).json({ error: 'Order not found.' });
    const { accessTokenHash: _hidden, ...safeOrder } = detail;
    return res.json({ order: safeOrder });
  });

  // Retry M-Pesa Payment on failed/cancelled order without duplicating the order
  app.post('/api/orders/:orderRef/retry-payment', rateLimit(15, 60_000), optionalAuth, async (req: AuthRequest, res) => {
    const orderRef = String(req.params.orderRef || '').trim().toUpperCase();
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const payerPhoneRaw = typeof req.body?.payerPhone === 'string' ? req.body.payerPhone.trim() : '';

    const [ord] = await db.select().from(orders).where(eq(orders.orderRef, orderRef)).limit(1);
    if (!ord) return res.status(404).json({ error: 'Order not found.' });

    const isOwner = req.authUser && ord.userUid && ord.userUid === req.authUser.uid;
    const isTokenHolder = isOrderTokenValid(token, ord.accessTokenHash);
    if (!isOwner && !isTokenHolder) {
      return res.status(403).json({ error: 'Valid order verification token required to retry payment.' });
    }

    try {
      const prepared = await prepareOrderRetryPayment({
        orderId: ord.id,
        payerPhoneRaw,
        actorUid: req.authUser?.uid || 'guest',
      });

      const stk = await initiateMpesaStkPush({
        amountCents: prepared.order.totalCents,
        phone254: prepared.payerPhone254,
        orderRef: prepared.order.orderRef,
      });

      await db.insert(paymentTransactions).values({
        orderId: prepared.order.id,
        provider: stk.provider,
        environment: stk.environment,
        invoiceId: stk.invoiceId,
        phoneNumber: prepared.order.payerPhone,
        amountCents: prepared.order.totalCents,
        currency: 'KES',
        state: stk.state,
        rawMetaJson: stk.rawMeta,
      });

      await db
        .update(orders)
        .set({ paymentStatus: 'pending_confirmation', updatedAt: new Date() })
        .where(eq(orders.id, prepared.order.id));

      await db.insert(orderStatusEvents).values({
        orderId: prepared.order.id,
        eventType: 'payment',
        fromStatus: ord.paymentStatus,
        toStatus: 'pending_confirmation',
        note: `M-Pesa retry prompt initiated (${stk.environment}).`,
        actorUid: req.authUser?.uid || 'guest',
      });

      const detail = await loadOrderDetail(prepared.order.id);
      if (!detail) return res.status(404).json({ error: 'Order not found.' });
      const { accessTokenHash: _h, ...safeOrder } = detail;
      return res.json({ order: safeOrder, paymentProvider: getPaymentProviderStatus() });
    } catch (err) {
      return res.status(400).json({
        error: err instanceof Error ? err.message : 'Could not retry payment for this order.',
      });
    }
  });

  // IntaSend Webhook Endpoint (Challenge-verified & Idempotent)
  app.post('/api/webhooks/intasend', rateLimit(120, 60_000), async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const challengeValid = verifyIntaSendChallenge(body.challenge);
    if (!challengeValid) {
      return res.status(403).json({ error: 'Invalid webhook challenge.' });
    }

    const invoiceId = typeof body.invoice_id === 'string' ? body.invoice_id.trim() : '';
    const state = typeof body.state === 'string' ? body.state.trim().toUpperCase() : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const apiRef = typeof body.api_ref === 'string' ? body.api_ref.trim().toUpperCase() : '';

    if (!invoiceId || !state) {
      return res.status(400).json({ error: 'Missing invoice_id or state.' });
    }

    const eventKey = `intasend:${invoiceId}:${state}`;
    try {
      const existingEvent = await db
        .select()
        .from(paymentWebhookEvents)
        .where(eq(paymentWebhookEvents.eventKey, eventKey))
        .limit(1);

      if (existingEvent.length > 0) {
        return res.status(200).json({ status: 'duplicate_ignored' });
      }

      await db.insert(paymentWebhookEvents).values({
        provider: 'intasend',
        eventKey,
        invoiceId,
        topic,
        challengeVerified: true,
        state,
        payloadJson: {
          invoice_id: invoiceId,
          state,
          topic,
          api_ref: apiRef,
          value: body.value ?? null,
        },
      });

      const [txRow] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.invoiceId, invoiceId))
        .limit(1);

      if (!txRow) {
        return res.status(202).json({ status: 'unknown_invoice_recorded' });
      }

      const [ord] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, txRow.orderId))
        .limit(1);
      if (!ord) return res.status(202).json({ status: 'order_missing' });

      // Verify webhook amount if present
      if (body.value !== undefined) {
        const reportedCents = Math.round(Number(body.value) * 100);
        if (Number.isFinite(reportedCents) && Math.abs(reportedCents - ord.totalCents) > 100) {
          console.error('Webhook amount mismatch for order', ord.orderRef);
          return res.status(400).json({ error: 'Amount mismatch.' });
        }
      }

      if (state === 'COMPLETE') {
        await reconcilePaymentResult({
          orderId: ord.id,
          invoiceId,
          targetPaymentStatus: 'paid',
          txState: 'COMPLETE',
          mpesaReceipt: typeof body.mpesa_reference === 'string' ? body.mpesa_reference : '',
          actorUid: 'intasend_webhook',
        });
      } else if (state === 'FAILED') {
        await reconcilePaymentResult({
          orderId: ord.id,
          invoiceId,
          targetPaymentStatus: 'failed',
          txState: 'FAILED',
          failureReason: typeof body.failed_reason === 'string' ? body.failed_reason : 'Payment failed.',
          actorUid: 'intasend_webhook',
        });
      } else if (state === 'CANCELED' || state === 'CANCELLED') {
        await reconcilePaymentResult({
          orderId: ord.id,
          invoiceId,
          targetPaymentStatus: 'cancelled',
          txState: 'CANCELED',
          failureReason: 'Cancelled by payer.',
          actorUid: 'intasend_webhook',
        });
      }

      return res.status(200).json({ status: 'processed' });
    } catch (err) {
      console.error('Webhook processing error:', err);
      return res.status(500).json({ error: 'Webhook processing error.' });
    }
  });

  // Public Content Pages & Newsletter & Contact
  app.get('/api/pages/:slug', async (req, res) => {
    await ensureInitialSeed();
    const [page] = await db
      .select()
      .from(contentPages)
      .where(eq(contentPages.slug, req.params.slug))
      .limit(1);
    if (!page) return res.status(404).json({ error: 'Page not found.' });
    return res.json({ page });
  });

  app.post('/api/newsletter/subscribe', rateLimit(15, 60_000), async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      marketingConsent: z.literal(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Please enter a valid email and tick the marketing consent box.',
      });
    }
    const cleanEmail = parsed.data.email.trim().toLowerCase();
    const token = crypto.randomBytes(20).toString('hex');
    await db
      .insert(newsletterSubscribers)
      .values({
        email: cleanEmail,
        marketingConsent: true,
        unsubscribeToken: token,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: {
          marketingConsent: true,
          consentRecordedAt: new Date(),
          isActive: true,
        },
      });
    return res.json({ subscribed: true, unsubscribeToken: token });
  });

  app.get('/api/newsletter/unsubscribe', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!token) return res.status(400).json({ error: 'Unsubscribe token required.' });
    await db
      .update(newsletterSubscribers)
      .set({ isActive: false, marketingConsent: false })
      .where(eq(newsletterSubscribers.unsubscribeToken, token));
    return res.json({ unsubscribed: true });
  });

  app.post('/api/contact', rateLimit(10, 60_000), async (req, res) => {
    const schema = z.object({
      name: z.string().min(2).max(120),
      email: z.string().email().optional().or(z.literal('')).default(''),
      phone: z.string().max(25).optional().default(''),
      message: z.string().min(5).max(2000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Please complete your message.' });
    }
    const [settings] = await db.select().from(storeSettings).limit(1);
    const recipient = settings?.supportEmail || 'store-owner';
    const delivery = await dispatchTransactionalNotification({
      channel: 'email',
      recipient,
      subject: `Contact message from ${parsed.data.name}`,
      message: `From: ${parsed.data.name} (${parsed.data.email || parsed.data.phone || 'no contact'})\n\n${parsed.data.message}`,
      orderRef: 'CONTACT',
    });

    if (delivery.status === 'failed') {
      return res.status(502).json({ error: 'Message could not be forwarded right now.' });
    }

    return res.json({
      received: true,
      dispatched: delivery.status === 'sent',
      note:
        delivery.status === 'sent'
          ? 'Your message has been forwarded to the store team.'
          : 'No outbound email webhook is configured yet; please use the store phone or WhatsApp link if listed.',
    });
  });

  // Authenticated User Profile & Own Orders
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userUid, req.authUser!.uid))
      .orderBy(desc(orders.createdAt));

    const detailed = [];
    for (const o of userOrders) {
      const d = await loadOrderDetail(o.id);
      if (d) {
        const { accessTokenHash: _h, ...safe } = d;
        detailed.push(safe);
      }
    }
    res.json({ user: req.authUser, orders: detailed });
  });

  // First-Run Owner Claim Bootstrap (only succeeds when zero owners exist in DB)
  app.get('/api/admin/bootstrap-status', requireAuth, async (req: AuthRequest, res) => {
    const existingOwners = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.role, 'owner'))
      .limit(1);
    res.json({
      hasOwner: existingOwners.length > 0,
      currentUser: req.authUser,
    });
  });

  app.post('/api/admin/claim-owner', requireAuth, async (req: AuthRequest, res) => {
    const bootstrapEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
    if (bootstrapEmail && req.authUser!.email.toLowerCase() !== bootstrapEmail) {
      return res.status(403).json({
        error: 'Only the configured ADMIN_BOOTSTRAP_EMAIL account can claim initial store ownership.',
      });
    }

    const result = await db.transaction(async (tx) => {
      const owners = await tx
        .select({ uid: users.uid })
        .from(users)
        .where(eq(users.role, 'owner'))
        .limit(1);

      if (owners.length > 0) {
        return { claimed: false };
      }

      const [updated] = await tx
        .update(users)
        .set({ role: 'owner', updatedAt: new Date() })
        .where(eq(users.uid, req.authUser!.uid))
        .returning();

      await tx.insert(auditLogs).values({
        actorUid: req.authUser!.uid,
        actorEmail: req.authUser!.email,
        action: 'claim_owner',
        entityType: 'user',
        entityId: req.authUser!.uid,
        summary: 'First store owner role claimed.',
      });

      return { claimed: true, user: updated };
    });

    if (!result.claimed) {
      return res.status(403).json({ error: 'Store owner has already been claimed.' });
    }
    return res.json({ user: result.user });
  });

  // --- ADMIN & OPERATIONS ENDPOINTS ---
  const staffRoles = ['owner', 'manager', 'fulfilment_staff'] as const;
  const managerRoles = ['owner', 'manager'] as const;

  app.get('/api/admin/overview', requireAuth, requireRole([...staffRoles]), async (req, res) => {
    await ensureInitialSeed();
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const periodOrders = await db
      .select()
      .from(orders)
      .where(gte(orders.createdAt, since))
      .orderBy(desc(orders.createdAt));

    const paidRevenueCents = periodOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.totalCents, 0);
    const pendingOrderValueCents = periodOrders
      .filter((o) => ['awaiting_payment', 'pending_confirmation'].includes(o.paymentStatus))
      .reduce((s, o) => s + o.totalCents, 0);
    const awaitingActionCount = periodOrders.filter(
      (o) => !['delivered', 'cancelled'].includes(o.fulfilmentStatus)
    ).length;

    const allVariants = await db
      .select({
        variant: productVariants,
        productName: products.name,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id));

    const lowStockAlerts = allVariants
      .filter((r) => r.variant.stockQty - r.variant.reservedQty <= r.variant.lowStockThreshold)
      .map((r) => ({
        variantId: r.variant.id,
        sku: r.variant.sku,
        productName: r.productName,
        label: r.variant.label,
        availableQty: Math.max(0, r.variant.stockQty - r.variant.reservedQty),
        lowStockThreshold: r.variant.lowStockThreshold,
      }));

    res.json({
      periodDays: days,
      paidRevenueCents,
      pendingOrderValueCents,
      paidOrdersCount: periodOrders.filter((o) => o.paymentStatus === 'paid').length,
      pendingPaymentCount: periodOrders.filter((o) =>
        ['awaiting_payment', 'pending_confirmation'].includes(o.paymentStatus)
      ).length,
      awaitingActionCount,
      lowStockAlerts,
      recentOrders: periodOrders.slice(0, 10),
    });
  });

  // Admin Demo Setup Helper (clearly marked non-live test data, only triggered explicitly by admin)
  app.post('/api/admin/load-demo-test-data', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const demoPrices: Record<string, { priceCents: number; stockQty: number; label: string; volume: string }> = {
      'berry-smoothie': { priceCents: 45000, stockQty: 24, label: '330ml Bottle (Demo)', volume: '330ml' },
      'kiwi-smoothie': { priceCents: 45000, stockQty: 24, label: '330ml Bottle (Demo)', volume: '330ml' },
      'banana-smoothie': { priceCents: 42000, stockQty: 24, label: '330ml Bottle (Demo)', volume: '330ml' },
      'strawberry-smoothie': { priceCents: 45000, stockQty: 24, label: '330ml Bottle (Demo)', volume: '330ml' },
    };

    const allProds = await db.select().from(products);
    for (const p of allProds) {
      const cfg = demoPrices[p.slug];
      if (!cfg) continue;
      await db
        .update(products)
        .set({
          status: 'published',
          shortDescription: `Demo test entry for ${p.flavour} smoothie. Replace with verified copy before live launch.`,
          volumeLabel: cfg.volume,
          updatedAt: new Date(),
        })
        .where(eq(products.id, p.id));

      await db
        .update(productVariants)
        .set({
          label: cfg.label,
          priceCents: cfg.priceCents,
          stockQty: cfg.stockQty,
        })
        .where(eq(productVariants.productId, p.id));
    }

    const existingZones = await db.select().from(deliveryZones).limit(1);
    if (existingZones.length === 0) {
      await db.insert(deliveryZones).values([
        {
          county: 'Nairobi',
          town: 'Nairobi',
          areaLabel: 'CBD, Westlands & Kilimani (Demo Zone)',
          feeCents: 25000,
          freeThresholdCents: 250000,
          minOrderCents: 45000,
          estimateText: 'Demo estimate: configured by store before launch',
          isActive: true,
          sortOrder: 1,
        },
        {
          county: 'Kiambu',
          town: 'Ruaka / Kikuyu',
          areaLabel: 'Greater Kiambu (Demo Zone)',
          feeCents: 40000,
          freeThresholdCents: 350000,
          minOrderCents: 90000,
          estimateText: 'Demo estimate: configured by store before launch',
          isActive: true,
          sortOrder: 2,
        },
      ]);
    }

    const existingPickups = await db.select().from(collectionPoints).limit(1);
    if (existingPickups.length === 0) {
      await db.insert(collectionPoints).values({
        name: 'Test Collection Point (Configure Real Location)',
        county: 'Nairobi',
        town: 'Nairobi',
        addressLine: 'To be configured by store owner',
        hoursText: 'Hours pending owner confirmation',
        instructions: 'Bring your order reference upon arrival.',
        feeCents: 0,
        isActive: true,
      });
    }

    await recordAudit(
      req,
      'load_demo_test_data',
      'store',
      'demo',
      'Loaded non-live KES demo prices, stock, and sample delivery/collection zones for testing.'
    );

    res.json({ ok: true });
  });

  // Admin Products & Variants (delegated to productService)
  app.get('/api/admin/products', requireAuth, requireRole([...staffRoles]), async (_req, res) => {
    const list = await listProducts({ includeDrafts: true });
    res.json({ products: list });
  });

  app.post('/api/admin/products', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product payload.' });
    }

    try {
      const created = await createProductWithVariants(parsed.data, req.authUser?.uid || 'admin');
      await recordAudit(req, 'create_product', 'product', String(created.id), `Created product ${created.name}`);
      return res.status(201).json({ product: created });
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Slug or SKU already exists.' });
    }
  });

  app.patch('/api/admin/products/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid product ID.' });

    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product fields.' });

    try {
      const updated = await updateProductWithDetails(id, parsed.data, req.authUser?.uid || 'admin');
      if (!updated) return res.status(404).json({ error: 'Product not found.' });

      await recordAudit(req, 'update_product', 'product', String(id), `Updated ${updated.name} (${updated.status})`);
      return res.json({ product: updated });
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update product.' });
    }
  });

  app.patch('/api/admin/variants/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid variant ID.' });

    const parsed = updateVariantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid variant fields.' });

    const updated = await updateVariant(id, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Variant not found.' });

    await recordAudit(req, 'update_variant', 'variant', String(id), `Updated SKU ${updated.sku}`);
    return res.json({ variant: updated });
  });

  app.post('/api/admin/variants', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const parsed = createVariantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid variant payload.' });

    try {
      const created = await createVariant(parsed.data, req.authUser?.uid || 'admin');
      await recordAudit(req, 'create_variant', 'variant', String(created.id), `Added SKU ${created.sku}`);
      return res.status(201).json({ variant: created });
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create variant.' });
    }
  });

  app.post('/api/admin/inventory/adjust', requireAuth, requireRole([...staffRoles]), async (req: AuthRequest, res) => {
    const schema = z.object({
      variantId: z.number().int().positive(),
      delta: z.number().int().refine((n) => n !== 0, 'Delta cannot be zero'),
      reason: z.string().min(2).max(200),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid stock adjustment.' });

    try {
      const result = await adjustVariantStock(
        parsed.data.variantId,
        parsed.data.delta,
        parsed.data.reason,
        req.authUser!.uid
      );
      await recordAudit(
        req,
        'adjust_stock',
        'variant',
        String(result.id),
        `Stock delta ${parsed.data.delta} on ${result.sku} (${parsed.data.reason})`
      );
      return res.json({ variant: result });
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Stock adjustment failed.' });
    }
  });

  // Admin Orders & Fulfilment
  app.get('/api/admin/orders', requireAuth, requireRole([...staffRoles]), async (req, res) => {
    const list = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const filtered = q
      ? list.filter(
          (o) =>
            o.orderRef.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerPhone.includes(q)
        )
      : list;

    const detailed = [];
    for (const o of filtered) {
      const d = await loadOrderDetail(o.id);
      if (d) {
        const { accessTokenHash: _h, ...safe } = d;
        detailed.push(safe);
      }
    }
    res.json({ orders: detailed });
  });

  app.patch('/api/admin/orders/:id', requireAuth, requireRole([...staffRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const schema = z.object({
      fulfilmentStatus: z
        .enum([
          'received',
          'confirmed',
          'preparing',
          'ready_for_collection',
          'out_for_delivery',
          'delivered',
          'cancelled',
        ])
        .optional(),
      paymentStatus: z
        .enum(['awaiting_payment', 'pending_confirmation', 'paid', 'failed', 'cancelled', 'refunded'])
        .optional(),
      internalNotes: z.string().max(1000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid order update.' });

    const [ord] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!ord) return res.status(404).json({ error: 'Order not found.' });

    if (
      parsed.data.fulfilmentStatus &&
      !canTransitionFulfilment(ord.fulfilmentStatus as FulfilmentStatus, parsed.data.fulfilmentStatus)
    ) {
      return res.status(400).json({
        error: `Cannot move fulfilment from ${ord.fulfilmentStatus} to ${parsed.data.fulfilmentStatus}.`,
      });
    }

    if (parsed.data.paymentStatus) {
      if (req.authUser!.role === 'fulfilment_staff') {
        return res.status(403).json({ error: 'Fulfilment staff cannot modify payment statuses.' });
      }
      if (!canTransitionPayment(ord.paymentStatus as PaymentStatus, parsed.data.paymentStatus)) {
        return res.status(400).json({
          error: `Cannot move payment from ${ord.paymentStatus} to ${parsed.data.paymentStatus}.`,
        });
      }
    }

    const nextFulfilment = (parsed.data.fulfilmentStatus ?? ord.fulfilmentStatus) as FulfilmentStatus;
    const nextPayment = (parsed.data.paymentStatus ?? ord.paymentStatus) as PaymentStatus;

    await db
      .update(orders)
      .set({
        fulfilmentStatus: nextFulfilment,
        paymentStatus: nextPayment,
        internalNotes: parsed.data.internalNotes ?? ord.internalNotes,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    await finalizeStockForAdminOrderChange({
      orderId: id,
      nextPaymentStatus: nextPayment,
      nextFulfilmentStatus: nextFulfilment,
      actorUid: req.authUser!.uid,
    });

    if (parsed.data.fulfilmentStatus && parsed.data.fulfilmentStatus !== ord.fulfilmentStatus) {
      await db.insert(orderStatusEvents).values({
        orderId: id,
        eventType: 'fulfilment',
        fromStatus: ord.fulfilmentStatus,
        toStatus: parsed.data.fulfilmentStatus,
        note: 'Updated by store staff.',
        actorUid: req.authUser!.uid,
      });
    }

    if (parsed.data.paymentStatus && parsed.data.paymentStatus !== ord.paymentStatus) {
      await db.insert(orderStatusEvents).values({
        orderId: id,
        eventType: 'payment',
        fromStatus: ord.paymentStatus,
        toStatus: parsed.data.paymentStatus,
        note: 'Payment status updated by store management.',
        actorUid: req.authUser!.uid,
      });
    }

    await recordAudit(
      req,
      'update_order',
      'order',
      ord.orderRef,
      `Order ${ord.orderRef} updated (${nextFulfilment}, payment: ${nextPayment})`
    );
    const detail = await loadOrderDetail(id);
    return res.json({ order: detail });
  });

  app.get('/api/admin/orders/export.csv', requireAuth, requireRole([...staffRoles]), async (_req, res) => {
    const list = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(500);
    const headers = [
      'Order Ref',
      'Created At',
      'Customer Name',
      'Customer Phone',
      'Fulfilment Type',
      'County',
      'Town',
      'Estate',
      'Payment Method',
      'Payment Status',
      'Fulfilment Status',
      'Total (KES)',
    ];
    const rows = list.map((o) =>
      [
        o.orderRef,
        o.createdAt.toISOString(),
        o.customerName,
        o.customerPhone,
        o.fulfilmentType,
        o.county,
        o.town,
        o.estate,
        o.paymentMethod,
        o.paymentStatus,
        o.fulfilmentStatus,
        (o.totalCents / 100).toFixed(2),
      ]
        .map(csvSafeCell)
        .join(',')
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="blendy-orders.csv"');
    return res.send([headers.map(csvSafeCell).join(','), ...rows].join('\n'));
  });

  // Admin Delivery Zones & Collection Points
  app.get('/api/admin/fulfilment', requireAuth, requireRole([...staffRoles]), async (_req, res) => {
    const zones = await db.select().from(deliveryZones).orderBy(asc(deliveryZones.sortOrder));
    const points = await db.select().from(collectionPoints).orderBy(asc(collectionPoints.name));
    res.json({ deliveryZones: zones, collectionPoints: points });
  });

  app.post('/api/admin/delivery-zones', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const schema = z.object({
      county: z.string().min(2).max(60),
      town: z.string().min(2).max(60),
      areaLabel: z.string().min(2).max(120),
      feeCents: z.number().int().min(0),
      freeThresholdCents: z.number().int().min(0).nullable().optional(),
      minOrderCents: z.number().int().min(0).default(0),
      estimateText: z.string().min(2).max(120),
      isActive: z.boolean().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid delivery zone.' });
    const [created] = await db.insert(deliveryZones).values(parsed.data).returning();
    await recordAudit(req, 'create_zone', 'delivery_zone', String(created.id), `Added zone ${created.areaLabel}`);
    return res.status(201).json({ zone: created });
  });

  app.patch('/api/admin/delivery-zones/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid zone ID.' });
    const schema = z.object({
      county: z.string().min(2).max(60).optional(),
      town: z.string().min(2).max(60).optional(),
      areaLabel: z.string().min(2).max(120).optional(),
      feeCents: z.number().int().min(0).optional(),
      freeThresholdCents: z.number().int().min(0).nullable().optional(),
      minOrderCents: z.number().int().min(0).optional(),
      estimateText: z.string().min(2).max(120).optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid delivery zone fields.' });
    const [updated] = await db.update(deliveryZones).set(parsed.data).where(eq(deliveryZones.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Delivery zone not found.' });
    await recordAudit(req, 'update_zone', 'delivery_zone', String(id), `Updated zone ${updated.areaLabel}`);
    return res.json({ zone: updated });
  });

  app.delete('/api/admin/delivery-zones/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid zone ID.' });
    await db.delete(deliveryZones).where(eq(deliveryZones.id, id));
    await recordAudit(req, 'delete_zone', 'delivery_zone', String(id), `Removed delivery zone #${id}`);
    return res.json({ deleted: true });
  });

  app.post('/api/admin/collection-points', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const schema = z.object({
      name: z.string().min(2).max(120),
      county: z.string().min(2).max(60),
      town: z.string().min(2).max(60),
      addressLine: z.string().min(2).max(200),
      hoursText: z.string().max(120).default(''),
      instructions: z.string().max(300).default(''),
      feeCents: z.number().int().min(0).default(0),
      isActive: z.boolean().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid collection point.' });
    const [created] = await db.insert(collectionPoints).values(parsed.data).returning();
    await recordAudit(req, 'create_collection_point', 'collection_point', String(created.id), `Added pickup ${created.name}`);
    return res.status(201).json({ point: created });
  });

  app.patch('/api/admin/collection-points/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid collection point ID.' });
    const schema = z.object({
      name: z.string().min(2).max(120).optional(),
      county: z.string().min(2).max(60).optional(),
      town: z.string().min(2).max(60).optional(),
      addressLine: z.string().min(2).max(200).optional(),
      hoursText: z.string().max(120).optional(),
      instructions: z.string().max(300).optional(),
      feeCents: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid collection point fields.' });
    const [updated] = await db.update(collectionPoints).set(parsed.data).where(eq(collectionPoints.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Collection point not found.' });
    await recordAudit(req, 'update_collection_point', 'collection_point', String(id), `Updated pickup ${updated.name}`);
    return res.json({ point: updated });
  });

  app.delete('/api/admin/collection-points/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid collection point ID.' });
    await db.delete(collectionPoints).where(eq(collectionPoints.id, id));
    await recordAudit(req, 'delete_collection_point', 'collection_point', String(id), `Removed pickup #${id}`);
    return res.json({ deleted: true });
  });

  // Admin Promotions
  app.get('/api/admin/promotions', requireAuth, requireRole([...managerRoles]), async (_req, res) => {
    const list = await db.select().from(promotions).orderBy(desc(promotions.createdAt));
    res.json({ promotions: list });
  });

  app.post('/api/admin/promotions', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const schema = z.object({
      code: z.string().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/),
      description: z.string().max(200).default(''),
      discountType: z.enum(['percent', 'fixed_cents', 'free_delivery']),
      discountValue: z.number().int().min(0),
      minSubtotalCents: z.number().int().min(0).default(0),
      maxUses: z.number().int().positive().nullable().optional(),
      isActive: z.boolean().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid promotion payload.' });
    try {
      const [created] = await db
        .insert(promotions)
        .values({ ...parsed.data, code: parsed.data.code.toUpperCase() })
        .returning();
      await recordAudit(req, 'create_promo', 'promotion', created.code, `Created promo ${created.code}`);
      return res.status(201).json({ promotion: created });
    } catch {
      return res.status(400).json({ error: 'Promo code already exists.' });
    }
  });

  app.patch('/api/admin/promotions/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid promotion ID.' });
    const schema = z.object({
      isActive: z.boolean().optional(),
      description: z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid promotion update.' });
    const [updated] = await db.update(promotions).set(parsed.data).where(eq(promotions.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Promotion not found.' });
    await recordAudit(req, 'update_promo', 'promotion', updated.code, `Updated promo ${updated.code} (active=${updated.isActive})`);
    return res.json({ promotion: updated });
  });

  // Admin FAQs & Testimonials
  app.post('/api/admin/faqs', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const schema = z.object({
      category: z.string().min(2).max(60).default('Ordering'),
      question: z.string().min(5).max(300),
      answer: z.string().min(5).max(2000),
      sortOrder: z.number().int().default(10),
      isPublished: z.boolean().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid FAQ fields.' });
    const [created] = await db.insert(faqs).values(parsed.data).returning();
    await recordAudit(req, 'create_faq', 'faq', String(created.id), `Added FAQ: ${created.question.slice(0, 60)}`);
    return res.status(201).json({ faq: created });
  });

  app.patch('/api/admin/faqs/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid FAQ ID.' });
    const schema = z.object({
      category: z.string().min(2).max(60).optional(),
      question: z.string().min(5).max(300).optional(),
      answer: z.string().min(5).max(2000).optional(),
      isPublished: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid FAQ fields.' });
    const [updated] = await db
      .update(faqs)
      .set({ ...parsed.data, lastReviewedAt: new Date() })
      .where(eq(faqs.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'FAQ not found.' });
    await recordAudit(req, 'update_faq', 'faq', String(id), `Updated FAQ #${id}`);
    return res.json({ faq: updated });
  });

  app.delete('/api/admin/faqs/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid FAQ ID.' });
    await db.delete(faqs).where(eq(faqs.id, id));
    await recordAudit(req, 'delete_faq', 'faq', String(id), `Deleted FAQ #${id}`);
    return res.json({ deleted: true });
  });

  app.get('/api/admin/testimonials', requireAuth, requireRole([...managerRoles]), async (_req, res) => {
    const list = await db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
    res.json({ testimonials: list });
  });

  app.post('/api/admin/testimonials', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const schema = z.object({
      authorName: z.string().min(2).max(100),
      locationLabel: z.string().max(100).default(''),
      quote: z.string().min(5).max(500),
      isApproved: z.boolean().default(false),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid testimonial fields.' });
    const [created] = await db.insert(testimonials).values(parsed.data).returning();
    await recordAudit(req, 'create_testimonial', 'testimonial', String(created.id), `Added testimonial by ${created.authorName}`);
    return res.status(201).json({ testimonial: created });
  });

  app.patch('/api/admin/testimonials/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid testimonial ID.' });
    const schema = z.object({ isApproved: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid testimonial update.' });
    const [updated] = await db.update(testimonials).set(parsed.data).where(eq(testimonials.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Testimonial not found.' });
    await recordAudit(req, 'update_testimonial', 'testimonial', String(id), `Set testimonial #${id} approved=${updated.isApproved}`);
    return res.json({ testimonial: updated });
  });

  app.delete('/api/admin/testimonials/:id', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid testimonial ID.' });
    await db.delete(testimonials).where(eq(testimonials.id, id));
    await recordAudit(req, 'delete_testimonial', 'testimonial', String(id), `Deleted testimonial #${id}`);
    return res.json({ deleted: true });
  });

  // Admin Settings, Pages, FAQs, Users, Audit
  app.get('/api/admin/settings', requireAuth, requireRole([...managerRoles]), async (_req, res) => {
    const [settings] = await db.select().from(storeSettings).limit(1);
    const pages = await db.select().from(contentPages).orderBy(asc(contentPages.slug));
    const allFaqs = await db.select().from(faqs).orderBy(asc(faqs.sortOrder));
    res.json({ settings, pages, faqs: allFaqs });
  });

  app.patch('/api/admin/settings', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const schema = z.object({
      brandName: z.string().min(1).max(60).optional(),
      strapline: z.string().max(120).optional(),
      announcementText: z.string().max(240).optional(),
      announcementEnabled: z.boolean().optional(),
      supportPhone: z.string().max(30).optional(),
      supportEmail: z.string().max(120).optional(),
      whatsappNumber: z.string().max(30).optional(),
      physicalAddress: z.string().max(200).optional(),
      operatingHours: z.string().max(160).optional(),
      taxLabel: z.string().max(160).optional(),
      taxRateBps: z.number().int().min(0).max(3000).optional(),
      allowPayOnDelivery: z.boolean().optional(),
      allowPayOnPickup: z.boolean().optional(),
      maintenanceMode: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid store settings.' });

    const [current] = await db.select().from(storeSettings).limit(1);
    const [updated] = await db
      .update(storeSettings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(storeSettings.id, current.id))
      .returning();

    await recordAudit(req, 'update_settings', 'store_settings', String(updated.id), 'Updated store settings');
    return res.json({ settings: updated });
  });

  app.patch('/api/admin/pages/:slug', requireAuth, requireRole([...managerRoles]), async (req: AuthRequest, res) => {
    const schema = z.object({
      title: z.string().min(1).max(120).optional(),
      bodyMarkdown: z.string().max(20000).optional(),
      reviewStatus: z.enum(['draft_needs_review', 'approved']).optional(),
      seoTitle: z.string().max(120).optional(),
      seoDescription: z.string().max(240).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid page fields.' });
    const pageSlug = String(req.params.slug || '');
    const [updated] = await db
      .update(contentPages)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(contentPages.slug, pageSlug))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Page not found.' });
    await recordAudit(req, 'update_page', 'content_page', updated.slug, `Updated ${updated.slug} (${updated.reviewStatus})`);
    return res.json({ page: updated });
  });

  app.get('/api/admin/users', requireAuth, requireRole(['owner']), async (_req, res) => {
    const list = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json({ users: list });
  });

  app.patch('/api/admin/users/:uid/role', requireAuth, requireRole(['owner']), async (req: AuthRequest, res) => {
    const schema = z.object({
      role: z.enum(['owner', 'manager', 'fulfilment_staff', 'customer']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid role.' });
    const targetUid = String(req.params.uid || '');
    if (targetUid === req.authUser!.uid && parsed.data.role !== 'owner') {
      return res.status(400).json({ error: 'You cannot demote yourself from owner.' });
    }
    const [updated] = await db
      .update(users)
      .set({ role: parsed.data.role, updatedAt: new Date() })
      .where(eq(users.uid, targetUid))
      .returning();
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    await recordAudit(req, 'update_user_role', 'user', updated.uid, `Set ${updated.email} role to ${updated.role}`);
    return res.json({ user: updated });
  });

  app.get('/api/admin/audit-logs', requireAuth, requireRole([...managerRoles]), async (_req, res) => {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    res.json({ logs });
  });

  // --- TECHNICAL SEO: robots.txt & sitemap.xml ---
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /cart',
        'Disallow: /checkout',
        'Disallow: /track-order',
        'Disallow: /account',
        'Disallow: /api/',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    await ensureInitialSeed();
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const publishedProducts = await db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.status, 'published'));

    const staticRoutes = ['/', '/shop', '/studio', '/story', '/delivery', '/faqs', '/contact'];
    const urls = [
      ...staticRoutes.map((route) => ({ loc: `${baseUrl}${route}`, lastmod: new Date().toISOString().slice(0, 10) })),
      ...publishedProducts.map((p) => ({
        loc: `${baseUrl}/shop/${encodeURIComponent(p.slug)}`,
        lastmod: p.updatedAt.toISOString().slice(0, 10),
      })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        (u) => `  <url><loc>${escapeXml(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`
      ),
      '</urlset>',
    ].join('\n');

    res.type('application/xml').send(xml);
  });

  // Helper to inject route-specific SEO & JSON-LD into HTML shell
  async function renderHtmlWithSeo(req: express.Request, rawHtml: string): Promise<string> {
    try {
      await ensureInitialSeed();
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const cleanPath = req.path;
      let title = 'Blendy — Real fruit smoothies';
      let description = 'Discover Blendy real fruit smoothies in Kenya: Berry, Kiwi, Banana, and Strawberry.';
      let canonical = `${baseUrl}${cleanPath}`;
      let robots = 'index,follow';
      let jsonLdBlocks: Record<string, unknown>[] = [];

      if (
        cleanPath.startsWith('/admin') ||
        cleanPath.startsWith('/cart') ||
        cleanPath.startsWith('/checkout') ||
        cleanPath.startsWith('/track-order') ||
        cleanPath.startsWith('/account')
      ) {
        robots = 'noindex,nofollow';
      }

      if (cleanPath.startsWith('/shop/')) {
        const slug = cleanPath.replace('/shop/', '').replace(/\/+$/, '');
        const all = await listProducts({ includeDrafts: false });
        const prod = all.find((p) => p.slug === slug);
        if (prod) {
          title = prod.seoTitle || `${prod.name} — Blendy`;
          description = prod.seoDescription || prod.shortDescription || description;
          canonical = `${baseUrl}/shop/${prod.slug}`;

          const offers = prod.variants
            .filter((v) => v.priceCents > 0)
            .map((v) => ({
              '@type': 'Offer',
              sku: v.sku,
              priceCurrency: 'KES',
              price: (v.priceCents / 100).toFixed(2),
              availability:
                v.availableQty > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              url: canonical,
            }));

          if (offers.length > 0) {
            jsonLdBlocks.push({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: prod.name,
              description: prod.description || prod.shortDescription || prod.name,
              sku: prod.variants[0]?.sku,
              brand: { '@type': 'Brand', name: 'Blendy' },
              offers,
            });
          }

          jsonLdBlocks.push({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
              { '@type': 'ListItem', position: 2, name: 'Shop', item: `${baseUrl}/shop` },
              { '@type': 'ListItem', position: 3, name: prod.name, item: canonical },
            ],
          });
        }
      } else if (cleanPath === '/shop') {
        title = 'Shop Smoothies — Blendy Kenya';
        description = 'Browse published Blendy fruit smoothie flavours and pack sizes in Kenyan Shillings.';
      } else if (cleanPath === '/studio') {
        title = '3D Bottle Studio — Blendy Kenya';
        description = 'Inspect Blendy Berry, Kiwi, Banana, and Strawberry smoothie bottles in interactive 3D.';
      } else if (cleanPath === '/delivery') {
        title = 'Delivery & Collection — Blendy Kenya';
        description = 'Check active Kenyan delivery counties, fees, and pickup collection points for Blendy.';
      } else if (cleanPath === '/faqs') {
        title = 'Frequently Asked Questions — Blendy Kenya';
        description = 'Answers about ordering Blendy smoothies, M-Pesa STK Push payments, and delivery.';
      } else if (cleanPath === '/story') {
        title = 'Our Story — Blendy';
        description = 'Learn about Blendy real fruit smoothies.';
      } else if (cleanPath === '/contact') {
        title = 'Contact — Blendy Kenya';
        description = 'Get in touch with the Blendy Kenya team for orders, delivery, and support.';
      } else if (cleanPath.startsWith('/legal/')) {
        const legalSlug = cleanPath.replace('/legal/', '').replace(/\/+$/, '');
        title = `${legalSlug.charAt(0).toUpperCase() + legalSlug.slice(1)} Policy — Blendy`;
        description = `Store policy and customer notices for Blendy Kenya.`;
      }

      const headTags = [
        `<link rel="canonical" href="${escapeHtmlAttr(canonical)}" />`,
        `<meta name="robots" content="${robots}" />`,
        ...jsonLdBlocks.map(
          (block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`
        ),
      ].join('\n    ');

      return rawHtml
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`)
        .replace(
          /<meta\s+name="description"[\s\S]*?\/>/i,
          `<meta name="description" content="${escapeHtmlAttr(description)}" />`
        )
        .replace(
          /<meta\s+property="og:title"[\s\S]*?\/>/i,
          `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`
        )
        .replace(
          /<meta\s+property="og:description"[\s\S]*?\/>/i,
          `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`
        )
        .replace('</head>', `    ${headTags}\n  </head>`);
    } catch {
      return rawHtml;
    }
  }

  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  if (isTestEnv) {
    app.get('*', async (req, res) => {
      const template = await fs.readFile(path.join(__dirname, 'index.html'), 'utf-8');
      res.status(200).type('html').send(await renderHtmlWithSeo(req, template));
    });
  } else if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', async (req, res) => {
      const html = await fs.readFile(path.join(distDir, 'index.html'), 'utf-8');
      res.type('html').send(await renderHtmlWithSeo(req, html));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const template = await fs.readFile(path.join(__dirname, 'index.html'), 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).type('html').send(await renderHtmlWithSeo(req, transformed));
      } catch (e) {
        next(e);
      }
    });
  }

  return app;
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  createApp().then((app) => {
    app.listen(PORT, HOST, () => {
      console.log(`Blendy Kenyan storefront running at http://${HOST}:${PORT}`);
    });
  });
}
