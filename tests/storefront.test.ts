import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../server.ts';
import { db } from '../src/db/index.ts';
import {
  deliveryZones,
  orders,
  paymentWebhookEvents,
  products,
  productVariants,
  stockMovements,
} from '../src/db/schema.ts';
import { ensureInitialSeed } from '../src/db/seed.ts';
import {
  canTransitionFulfilment,
  canTransitionPayment,
  formatKsh,
  normalizeKenyanPhone,
} from '../src/lib/kenya.ts';
import { buildOrderStepperModel, hasActiveOrders } from '../src/lib/orderStepper.ts';
import { verifyIntaSendChallenge } from '../src/services/payments.ts';
import {
  adjustVariantStock,
  createProductWithVariants,
  getCatalogueGroundingContext,
  getProductBySlug,
  listProducts,
  updateProductWithDetails,
} from '../src/services/products.ts';

describe('Kenyan Storefront Core Utilities', () => {
  it('formats KES cents cleanly', () => {
    expect(formatKsh(45000)).toBe('KSh 450');
    expect(formatKsh(125000)).toBe('KSh 1,250');
    expect(formatKsh(45050)).toBe('KSh 450.50');
  });

  it('normalizes valid Kenyan mobile numbers and rejects invalid formats', () => {
    expect(normalizeKenyanPhone('0712 345 678')).toEqual({
      valid: true,
      e164: '+254712345678',
      intasend: '254712345678',
    });
    expect(normalizeKenyanPhone('0110123456')).toEqual({
      valid: true,
      e164: '+254110123456',
      intasend: '254110123456',
    });
    expect(normalizeKenyanPhone('+254722000111').e164).toBe('+254722000111');
    expect(normalizeKenyanPhone('254722000111').intasend).toBe('254722000111');
    expect(normalizeKenyanPhone('0812345678').valid).toBe(false);
    expect(normalizeKenyanPhone('071234').valid).toBe(false);
  });

  it('enforces valid payment and fulfilment state transitions', () => {
    expect(canTransitionPayment('pending_confirmation', 'paid')).toBe(true);
    expect(canTransitionPayment('paid', 'failed')).toBe(false);
    expect(canTransitionPayment('refunded', 'paid')).toBe(false);
    expect(canTransitionFulfilment('received', 'confirmed')).toBe(true);
    expect(canTransitionFulfilment('delivered', 'preparing')).toBe(false);
  });

  it('validates IntaSend webhook challenge safely', () => {
    const prev = process.env.INTASEND_WEBHOOK_CHALLENGE;
    process.env.INTASEND_WEBHOOK_CHALLENGE = 'test_secret_challenge';
    expect(verifyIntaSendChallenge('test_secret_challenge')).toBe(true);
    expect(verifyIntaSendChallenge('wrong_challenge')).toBe(false);
    expect(verifyIntaSendChallenge(undefined)).toBe(false);
    process.env.INTASEND_WEBHOOK_CHALLENGE = prev;
  });

  it('maps order statuses to the 4-stage visual stepper and polling state cleanly', () => {
    const baseOrder = {
      id: 1,
      orderRef: 'BL-2026-0001',
      customerName: 'Amina',
      customerPhone: '+254712345678',
      payerPhone: '+254712345678',
      customerEmail: 'amina@example.com',
      fulfilmentType: 'delivery' as const,
      county: 'Nairobi',
      town: 'Nairobi',
      estate: 'Kilimani',
      building: 'Argwings',
      landmark: 'Yaya',
      deliveryInstructions: '',
      paymentMethod: 'mpesa_sandbox_sim',
      paymentStatus: 'paid',
      fulfilmentStatus: 'preparing',
      subtotalCents: 90000,
      discountCents: 0,
      deliveryFeeCents: 20000,
      taxCents: 0,
      totalCents: 110000,
      promoCode: null,
      createdAt: '2026-11-25T10:00:00.000Z',
      updatedAt: '2026-11-25T10:15:00.000Z',
      items: [],
      events: [
        {
          id: 10,
          eventType: 'status',
          fromStatus: 'received',
          toStatus: 'preparing',
          note: 'Cold blending started',
          createdAt: '2026-11-25T10:10:00.000Z',
        },
      ],
      transactions: [],
    };

    const packingModel = buildOrderStepperModel(baseOrder);
    expect(packingModel.isHalted).toBe(false);
    expect(packingModel.stages.map((s) => `${s.label}:${s.state}`)).toEqual([
      'Pending:completed',
      'Packing:current',
      'In Transit:upcoming',
      'Delivered:upcoming',
    ]);
    expect(packingModel.stages[1].timestamp).toBe('2026-11-25T10:10:00.000Z');
    expect(hasActiveOrders([baseOrder])).toBe(true);

    const deliveredModel = buildOrderStepperModel({
      ...baseOrder,
      fulfilmentStatus: 'delivered',
    });
    expect(deliveredModel.stages.every((s) => s.state === 'completed')).toBe(true);
    expect(hasActiveOrders([{ ...baseOrder, fulfilmentStatus: 'delivered' }])).toBe(false);

    const cancelledModel = buildOrderStepperModel({
      ...baseOrder,
      fulfilmentStatus: 'cancelled',
      paymentStatus: 'cancelled',
    });
    expect(cancelledModel.isHalted).toBe(true);
    expect(cancelledModel.stages[1].state).toBe('halted');
    expect(hasActiveOrders([{ ...baseOrder, fulfilmentStatus: 'cancelled' }])).toBe(false);
  });
});

describe('Blendy Kenyan Storefront API & Database Integration', () => {
  let server: http.Server;
  let baseUrl = '';

  let testProductId = 0;
  let testDraftProductId = 0;
  let testVariantId = 0;
  let testZoneId = 0;
  const createdOrderRefs: string[] = [];
  const createdEventKeys: string[] = [];

  beforeAll(async () => {
    process.env.INTASEND_WEBHOOK_CHALLENGE = 'vitest-challenge-123';
    await ensureInitialSeed();

    const app = await createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Failed to bind test server');
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // Insert isolated published test fixture (cleaned up in afterAll)
    const [prod] = await db
      .insert(products)
      .values({
        slug: 'vitest-berry-pack',
        name: 'Vitest Berry Test Pack',
        flavour: 'Berry',
        status: 'published',
        heroSpecKey: 'berry',
        bgTint: '#C2B0DC',
      })
      .returning();
    testProductId = prod.id;

    const [draftProd] = await db
      .insert(products)
      .values({
        slug: 'vitest-draft-item',
        name: 'Vitest Draft Only Item',
        flavour: 'Berry',
        status: 'draft',
        bgTint: '#C2B0DC',
      })
      .returning();
    testDraftProductId = draftProd.id;

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId: prod.id,
        sku: `VITEST-${Date.now()}`,
        label: '330ml Test',
        priceCents: 45000,
        stockQty: 5,
        reservedQty: 0,
        isActive: true,
      })
      .returning();
    testVariantId = variant.id;

    const [zone] = await db
      .insert(deliveryZones)
      .values({
        county: 'Nairobi',
        town: 'Nairobi',
        areaLabel: 'Vitest Kilimani',
        feeCents: 20000,
        minOrderCents: 40000,
        estimateText: 'Test window',
        isActive: true,
      })
      .returning();
    testZoneId = zone.id;
  });

  afterAll(async () => {
    for (const ref of createdOrderRefs) {
      await db.delete(stockMovements).where(eq(stockMovements.referenceId, ref));
      await db.delete(orders).where(eq(orders.orderRef, ref));
    }
    for (const key of createdEventKeys) {
      await db.delete(paymentWebhookEvents).where(eq(paymentWebhookEvents.eventKey, key));
    }
    if (testVariantId) {
      await db.delete(stockMovements).where(eq(stockMovements.variantId, testVariantId));
    }
    if (testProductId) {
      await db.delete(products).where(eq(products.id, testProductId));
    }
    if (testDraftProductId) {
      await db.delete(products).where(eq(products.id, testDraftProductId));
    }
    if (testZoneId) {
      await db.delete(deliveryZones).where(eq(deliveryZones.id, testZoneId));
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('serves health, robots.txt, and sitemap.xml without exposing admin routes', async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    expect(healthRes.status).toBe(200);

    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    const robotsText = await robotsRes.text();
    expect(robotsRes.status).toBe(200);
    expect(robotsText).toContain('Disallow: /admin');
    expect(robotsText).toContain('Disallow: /checkout');

    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    const sitemapText = await sitemapRes.text();
    expect(sitemapRes.status).toBe(200);
    expect(sitemapText).toContain('/shop/vitest-berry-pack');

    const pdpHtmlRes = await fetch(`${baseUrl}/shop/vitest-berry-pack`);
    const pdpHtml = await pdpHtmlRes.text();
    expect(pdpHtmlRes.status).toBe(200);
    expect(pdpHtml).toContain('application/ld+json');
    expect(pdpHtml).toContain('Vitest Berry Test Pack');
    expect(pdpHtml).toContain('"priceCurrency":"KES"');

    const adminHtmlRes = await fetch(`${baseUrl}/admin`);
    const adminHtml = await adminHtmlRes.text();
    expect(adminHtml).toContain('noindex,nofollow');
  });

  it('publishes seeded flavours with KES variants, hides draft products, and blocks unauthenticated admin routes', async () => {
    const pubRes = await fetch(`${baseUrl}/api/products`);
    const pubJson = await pubRes.json();
    const slugs = pubJson.products.map((p: any) => p.slug);
    expect(slugs).toContain('vitest-berry-pack');
    expect(slugs).toContain('berry-smoothie');
    expect(slugs).not.toContain('vitest-draft-item');

    const bootstrapRes = await fetch(`${baseUrl}/api/storefront/bootstrap`);
    const bootstrapJson = await bootstrapRes.json();
    expect(bootstrapRes.status).toBe(200);
    expect(bootstrapJson.deliveryZones.length).toBeGreaterThanOrEqual(3);
    expect(bootstrapJson.collectionPoints.length).toBeGreaterThanOrEqual(2);
    expect(bootstrapJson.testimonials.length).toBeGreaterThanOrEqual(4);

    const adminRes = await fetch(`${baseUrl}/api/admin/overview`);
    expect(adminRes.status).toBe(401);

    const adminPostRes = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hack' }),
    });
    expect(adminPostRes.status).toBe(401);
  });

  it('computes server-authoritative cart quotes and rejects invalid checkout payloads', async () => {
    const quoteRes = await fetch(`${baseUrl}/api/cart/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: testProductId, variantId: testVariantId, quantity: 2 }],
        fulfilmentType: 'delivery',
        deliveryZoneId: testZoneId,
      }),
    });
    const quote = await quoteRes.json();
    expect(quoteRes.status).toBe(200);
    expect(quote.subtotalCents).toBe(90000);
    expect(quote.deliveryFeeCents).toBe(20000);
    expect(quote.totalCents).toBe(110000);

    const badPhoneRes = await fetch(`${baseUrl}/api/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: `bad-${Date.now()}`,
        customerName: 'Tester',
        customerPhone: '12345',
        fulfilmentType: 'delivery',
        deliveryZoneId: testZoneId,
        county: 'Nairobi',
        town: 'Nairobi',
        estate: 'Kilimani',
        paymentMethod: 'mpesa_sandbox_sim',
        items: [{ productId: testProductId, variantId: testVariantId, quantity: 1 }],
      }),
    });
    expect(badPhoneRes.status).toBe(400);
  });

  it('creates an order idempotently, prevents oversell, protects tracking tokens, and verifies simulator/webhook settlement', async () => {
    const idemKey = `vitest-order-${Date.now()}`;
    const payload = {
      idempotencyKey: idemKey,
      customerName: 'Amina Wanjiku',
      customerPhone: '0712345678',
      fulfilmentType: 'delivery',
      deliveryZoneId: testZoneId,
      county: 'Nairobi',
      town: 'Nairobi',
      estate: 'Kilimani',
      landmark: 'Near Yaya Centre',
      paymentMethod: 'mpesa_sandbox_sim',
      items: [{ productId: testProductId, variantId: testVariantId, quantity: 3 }],
    };

    const res1 = await fetch(`${baseUrl}/api/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body1 = await res1.json();
    expect(res1.status).toBe(201);
    expect(body1.order.totalCents).toBe(3 * 45000 + 20000);
    expect(body1.order.paymentStatus).toBe('pending_confirmation');
    expect(body1.accessToken).toBeTruthy();

    const orderRef = body1.order.orderRef;
    const token = body1.accessToken;
    createdOrderRefs.push(orderRef);

    // Duplicate idempotencyKey reuses the same order without double-reserving stock
    const res2 = await fetch(`${baseUrl}/api/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(body2.reused).toBe(true);
    expect(body2.order.orderRef).toBe(orderRef);

    // Stock available is now 5 - 3 = 2, so requesting 3 more must fail oversell check
    const oversellRes = await fetch(`${baseUrl}/api/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idempotencyKey: `oversell-${Date.now()}` }),
    });
    expect(oversellRes.status).toBe(400);

    // Tracking endpoint rejects missing/wrong token
    const noTokenRes = await fetch(`${baseUrl}/api/orders/${orderRef}/status`);
    expect(noTokenRes.status).toBe(403);

    const goodTokenRes = await fetch(
      `${baseUrl}/api/orders/${orderRef}/status?token=${encodeURIComponent(token)}`
    );
    expect(goodTokenRes.status).toBe(200);

    // Webhook rejects bad challenge
    const invoiceId = body1.order.transactions[0].invoiceId;
    const badWebhookRes = await fetch(`${baseUrl}/api/webhooks/intasend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge: 'wrong-challenge',
        invoice_id: invoiceId,
        state: 'COMPLETE',
      }),
    });
    expect(badWebhookRes.status).toBe(403);

    // Valid challenge webhook confirms payment and is idempotent on replay
    createdEventKeys.push(`intasend:${invoiceId}:COMPLETE`);
    const goodWebhookRes = await fetch(`${baseUrl}/api/webhooks/intasend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge: 'vitest-challenge-123',
        invoice_id: invoiceId,
        state: 'COMPLETE',
        mpesa_reference: 'MPESA123TEST',
        value: body1.order.totalCents / 100,
      }),
    });
    expect(goodWebhookRes.status).toBe(200);

    const replayWebhookRes = await fetch(`${baseUrl}/api/webhooks/intasend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge: 'vitest-challenge-123',
        invoice_id: invoiceId,
        state: 'COMPLETE',
      }),
    });
    const replayJson = await replayWebhookRes.json();
    expect(replayJson.status).toBe('duplicate_ignored');

    const finalOrderRes = await fetch(
      `${baseUrl}/api/orders/${orderRef}/status?token=${encodeURIComponent(token)}`
    );
    const finalOrderJson = await finalOrderRes.json();
    expect(finalOrderJson.order.paymentStatus).toBe('paid');
    expect(finalOrderJson.order.fulfilmentStatus).toBe('confirmed');
  });

  it('manages flavours, dual 330ml/1L variants, stock ledger, and nutrition CRUD via productService', async () => {
    const seeded = await listProducts({ includeDrafts: false });
    const coreFlavourNames = seeded.map((p) => p.flavour);
    expect(coreFlavourNames).toEqual(
      expect.arrayContaining(['Berry', 'Kiwi', 'Banana', 'Strawberry'])
    );

    const uniqueSuffix = Date.now();
    const created = await createProductWithVariants(
      {
        slug: `vitest-mango-${uniqueSuffix}`,
        name: 'Vitest Mango Passion',
        flavour: 'Mango',
        category: 'Smoothies',
        shortDescription: 'Fresh coastal mango blend',
        description: 'Cold blended in Kenya',
        status: 'published',
        bgTint: '#F3DA8A',
        nutritionJson: {
          'Serving Size': '330ml',
          Energy: '160 kcal',
          'Added Sugar': '0g',
        },
        variants: [
          {
            sku: `VM-330-${uniqueSuffix}`,
            label: '330ml Bottle',
            priceCents: 46000,
            stockQty: 15,
            lowStockThreshold: 5,
            isActive: true,
            sortOrder: 1,
          },
          {
            sku: `VM-1L-${uniqueSuffix}`,
            label: '1L Family Bottle',
            priceCents: 120000,
            stockQty: 8,
            lowStockThreshold: 3,
            isActive: true,
            sortOrder: 2,
          },
        ],
      },
      'vitest-runner'
    );

    try {
      expect(created.variants).toHaveLength(2);
      expect(created.nutritionJson['Energy']).toBe('160 kcal');

      const updated = await updateProductWithDetails(
        created.id,
        {
          ingredientsText: 'Coastal mango (60%), passionfruit (15%), apple juice',
          nutritionJson: {
            'Serving Size': '330ml',
            Energy: '165 kcal',
            'Vitamin C': '110% NRV',
          },
        },
        'vitest-runner'
      );
      expect(updated?.nutritionJson['Vitamin C']).toBe('110% NRV');
      expect(updated?.ingredientsText).toContain('Coastal mango');

      const adjusted = await adjustVariantStock(
        created.variants[0].id,
        5,
        'Vitest batch restock',
        'vitest-runner'
      );
      expect(adjusted.stockQty).toBe(20);

      const loaded = await getProductBySlug(created.slug, false);
      expect(loaded?.product.variants[0].stockQty).toBe(20);

      const grounding = await getCatalogueGroundingContext();
      expect(grounding).toContain('Berry Smoothie');
      expect(grounding).toContain('1L Family Bottle');
    } finally {
      for (const v of created.variants) {
        await db.delete(stockMovements).where(eq(stockMovements.variantId, v.id));
      }
      await db.delete(products).where(eq(products.id, created.id));
    }
  });

  it('validates /api/chat requests and serves /studio metadata cleanly', async () => {
    const emptyChatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    expect(emptyChatRes.status).toBe(400);

    const studioRes = await fetch(`${baseUrl}/studio`);
    const studioHtml = await studioRes.text();
    expect(studioRes.status).toBe(200);
    expect(studioHtml).toContain('3D Bottle Studio');
  });
});
