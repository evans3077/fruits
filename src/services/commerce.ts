import crypto from 'node:crypto';
import { and, eq, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  collectionPoints,
  deliveryZones,
  orderItems,
  orders,
  orderStatusEvents,
  paymentTransactions,
  products,
  productVariants,
  promotions,
  stockMovements,
  storeSettings,
} from '../db/schema.ts';
import {
  canTransitionFulfilment,
  canTransitionPayment,
  normalizeKenyanPhone,
  type FulfilmentStatus,
  type PaymentStatus,
} from '../lib/kenya.ts';

export interface CartQuoteItemInput {
  productId: number;
  variantId: number;
  quantity: number;
}

export interface CartQuoteRequest {
  items: CartQuoteItemInput[];
  fulfilmentType: 'delivery' | 'collection';
  deliveryZoneId?: number | null;
  collectionPointId?: number | null;
  promoCode?: string | null;
}

export interface QuotedCartLine {
  productId: number;
  variantId: number;
  slug: string;
  productName: string;
  variantLabel: string;
  sku: string;
  flavour: string;
  heroSpecKey: string | null;
  imageUrl: string;
  bgTint: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  availableQty: number;
}

export interface CartQuoteResult {
  lines: QuotedCartLine[];
  issues: string[];
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  appliedPromoCode: string | null;
  promoMessage: string;
  fulfilmentValid: boolean;
  fulfilmentSummary: string;
}

export function hashAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOrderRef(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[bytes[i] % alphabet.length];
  }
  return `BL-${suffix}`;
}

export async function releaseExpiredReservations(txOrDb: typeof db = db): Promise<number> {
  const now = new Date();
  const expiredOrders = await txOrDb
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.stockFinalized, false),
        isNotNull(orders.reservationExpiresAt),
        inArray(orders.paymentStatus, ['awaiting_payment', 'pending_confirmation']),
        lt(orders.reservationExpiresAt, now)
      )
    );

  let releasedCount = 0;
  for (const ord of expiredOrders) {
    const items = await txOrDb
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, ord.id));

    for (const item of items) {
      await txOrDb
        .update(productVariants)
        .set({
          reservedQty: sql`GREATEST(0, ${productVariants.reservedQty} - ${item.quantity})`,
        })
        .where(eq(productVariants.id, item.variantId));

      await txOrDb.insert(stockMovements).values({
        variantId: item.variantId,
        delta: item.quantity,
        reason: 'reservation_expired',
        referenceId: ord.orderRef,
        actorUid: 'system',
      });
    }

    await txOrDb
      .update(orders)
      .set({
        paymentStatus: 'cancelled',
        fulfilmentStatus: 'cancelled',
        stockFinalized: true,
        updatedAt: now,
      })
      .where(eq(orders.id, ord.id));

    await txOrDb.insert(orderStatusEvents).values({
      orderId: ord.id,
      eventType: 'payment',
      fromStatus: ord.paymentStatus,
      toStatus: 'cancelled',
      note: 'Unpaid stock reservation expired automatically.',
      actorUid: 'system',
    });

    releasedCount++;
  }

  return releasedCount;
}

export async function calculateCartQuote(
  req: CartQuoteRequest,
  txOrDb: typeof db = db
): Promise<CartQuoteResult> {
  const [settingsRow] = await txOrDb.select().from(storeSettings).limit(1);
  const issues: string[] = [];
  const lines: QuotedCartLine[] = [];
  let subtotalCents = 0;

  if (!Array.isArray(req.items) || req.items.length === 0) {
    return {
      lines: [],
      issues: ['Your shopping bag is empty.'],
      subtotalCents: 0,
      discountCents: 0,
      deliveryFeeCents: 0,
      taxCents: 0,
      totalCents: 0,
      appliedPromoCode: null,
      promoMessage: '',
      fulfilmentValid: false,
      fulfilmentSummary: '',
    };
  }

  for (const raw of req.items) {
    const qty = Math.floor(Number(raw.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 100) {
      issues.push('Item quantities must be between 1 and 100.');
      continue;
    }

    const rows = await txOrDb
      .select({
        variant: productVariants,
        product: products,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(productVariants.id, Number(raw.variantId)),
          eq(products.id, Number(raw.productId))
        )
      )
      .limit(1);

    if (rows.length === 0) {
      issues.push('One or more items in your bag are no longer available.');
      continue;
    }

    const { variant, product } = rows[0];
    if (product.status !== 'published' || !variant.isActive) {
      issues.push(`${product.name} (${variant.label}) is currently unavailable for purchase.`);
      continue;
    }

    if (variant.priceCents <= 0) {
      issues.push(`${product.name} (${variant.label}) does not have a live price configured yet.`);
      continue;
    }

    const availableQty = Math.max(0, variant.stockQty - variant.reservedQty);
    if (availableQty < qty) {
      issues.push(
        availableQty === 0
          ? `${product.name} (${variant.label}) is currently out of stock.`
          : `Only ${availableQty} unit(s) available for ${product.name} (${variant.label}).`
      );
      continue;
    }

    const lineTotalCents = variant.priceCents * qty;
    subtotalCents += lineTotalCents;

    lines.push({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      productName: product.name,
      variantLabel: variant.label,
      sku: variant.sku,
      flavour: product.flavour,
      heroSpecKey: product.heroSpecKey,
      imageUrl: product.imageUrl,
      bgTint: product.bgTint,
      unitPriceCents: variant.priceCents,
      quantity: qty,
      lineTotalCents,
      availableQty,
    });
  }

  // Evaluate Promo Code
  let discountCents = 0;
  let appliedPromoCode: string | null = null;
  let promoMessage = '';
  let freeDeliveryByPromo = false;

  const cleanCode = typeof req.promoCode === 'string' ? req.promoCode.trim().toUpperCase() : '';
  if (cleanCode) {
    const [promo] = await txOrDb
      .select()
      .from(promotions)
      .where(eq(promotions.code, cleanCode))
      .limit(1);

    const now = new Date();
    if (!promo || !promo.isActive) {
      promoMessage = 'Promo code is invalid or inactive.';
    } else if (promo.startsAt && promo.startsAt > now) {
      promoMessage = 'This promo code is not active yet.';
    } else if (promo.endsAt && promo.endsAt < now) {
      promoMessage = 'This promo code has expired.';
    } else if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      promoMessage = 'This promo code has reached its usage limit.';
    } else if (subtotalCents < promo.minSubtotalCents) {
      promoMessage = `Minimum subtotal of KSh ${(promo.minSubtotalCents / 100).toLocaleString('en-KE')} required for ${promo.code}.`;
    } else {
      appliedPromoCode = promo.code;
      if (promo.discountType === 'percent') {
        discountCents = Math.min(subtotalCents, Math.round((subtotalCents * promo.discountValue) / 100));
        promoMessage = `${promo.discountValue}% discount applied (${promo.code}).`;
      } else if (promo.discountType === 'fixed_cents') {
        discountCents = Math.min(subtotalCents, promo.discountValue);
        promoMessage = `Discount applied (${promo.code}).`;
      } else if (promo.discountType === 'free_delivery') {
        freeDeliveryByPromo = true;
        promoMessage = `Free delivery applied (${promo.code}).`;
      }
    }
  }

  // Evaluate Fulfilment & Delivery Fee
  let deliveryFeeCents = 0;
  let fulfilmentValid = false;
  let fulfilmentSummary = '';

  if (req.fulfilmentType === 'delivery') {
    if (!req.deliveryZoneId) {
      fulfilmentSummary = 'Select a configured delivery zone to calculate delivery fee.';
    } else {
      const [zone] = await txOrDb
        .select()
        .from(deliveryZones)
        .where(and(eq(deliveryZones.id, req.deliveryZoneId), eq(deliveryZones.isActive, true)))
        .limit(1);

      if (!zone) {
        issues.push('Selected delivery zone is not currently active.');
      } else if (subtotalCents < zone.minOrderCents) {
        issues.push(
          `Minimum order for ${zone.areaLabel} is KSh ${(zone.minOrderCents / 100).toLocaleString('en-KE')}.`
        );
      } else {
        const afterDiscount = Math.max(0, subtotalCents - discountCents);
        const qualifiesThreshold =
          zone.freeThresholdCents !== null && afterDiscount >= zone.freeThresholdCents;
        deliveryFeeCents = freeDeliveryByPromo || qualifiesThreshold ? 0 : zone.feeCents;
        fulfilmentValid = true;
        fulfilmentSummary = `${zone.county} · ${zone.town} (${zone.areaLabel}) — ${zone.estimateText}`;
      }
    }
  } else {
    if (!req.collectionPointId) {
      fulfilmentSummary = 'Select a pickup collection point.';
    } else {
      const [point] = await txOrDb
        .select()
        .from(collectionPoints)
        .where(and(eq(collectionPoints.id, req.collectionPointId), eq(collectionPoints.isActive, true)))
        .limit(1);

      if (!point) {
        issues.push('Selected collection point is not currently active.');
      } else {
        deliveryFeeCents = freeDeliveryByPromo ? 0 : point.feeCents;
        fulfilmentValid = true;
        fulfilmentSummary = `Pickup: ${point.name} (${point.town})`;
      }
    }
  }

  const afterDiscount = Math.max(0, subtotalCents - discountCents);
  const taxRateBps = settingsRow?.taxRateBps ?? 0;
  const taxCents = taxRateBps > 0 ? Math.round((afterDiscount * taxRateBps) / 10000) : 0;
  const totalCents = afterDiscount + deliveryFeeCents + taxCents;

  return {
    lines,
    issues,
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    taxCents,
    totalCents,
    appliedPromoCode,
    promoMessage,
    fulfilmentValid,
    fulfilmentSummary,
  };
}

export interface CreateOrderInput {
  idempotencyKey: string;
  userUid: string | null;
  customerName: string;
  customerPhoneRaw: string;
  payerPhoneRaw?: string;
  customerEmail?: string;
  fulfilmentType: 'delivery' | 'collection';
  deliveryZoneId?: number | null;
  collectionPointId?: number | null;
  county?: string;
  town?: string;
  estate?: string;
  building?: string;
  landmark?: string;
  deliveryInstructions?: string;
  paymentMethod: 'mpesa_intasend' | 'mpesa_sandbox_sim' | 'pay_on_delivery' | 'pay_on_pickup';
  promoCode?: string | null;
  items: CartQuoteItemInput[];
}

export async function createOrderAtomic(input: CreateOrderInput) {
  const customerPhoneNorm = normalizeKenyanPhone(input.customerPhoneRaw);
  if (!customerPhoneNorm.valid) {
    throw new Error(customerPhoneNorm.error || 'Invalid Kenyan mobile number.');
  }

  const payerPhoneNorm = input.payerPhoneRaw?.trim()
    ? normalizeKenyanPhone(input.payerPhoneRaw)
    : customerPhoneNorm;
  if (!payerPhoneNorm.valid) {
    throw new Error('Payer M-Pesa phone number must be a valid Kenyan mobile number.');
  }

  return db.transaction(async (tx) => {
    const dbTx = tx as unknown as typeof db;
    await releaseExpiredReservations(dbTx);

    // Idempotency check
    const existing = await tx
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      const ord = existing[0];
      const existingItems = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, ord.id));
      const existingTx = await tx
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.orderId, ord.id))
        .limit(1);
      return {
        reused: true,
        order: ord,
        items: existingItems,
        transaction: existingTx[0] ?? null,
        rawAccessToken: null as string | null,
      };
    }

    const [settingsRow] = await tx.select().from(storeSettings).limit(1);
    if (input.paymentMethod === 'pay_on_delivery' && !settingsRow?.allowPayOnDelivery) {
      throw new Error('Pay on Delivery is not enabled by the store.');
    }
    if (input.paymentMethod === 'pay_on_pickup' && !settingsRow?.allowPayOnPickup) {
      throw new Error('Pay on Pickup is not enabled by the store.');
    }

    const quote = await calculateCartQuote(
      {
        items: input.items,
        fulfilmentType: input.fulfilmentType,
        deliveryZoneId: input.deliveryZoneId,
        collectionPointId: input.collectionPointId,
        promoCode: input.promoCode,
      },
      dbTx
    );

    if (quote.issues.length > 0 || quote.lines.length === 0) {
      throw new Error(quote.issues[0] || 'Unable to process items in your bag.');
    }
    if (!quote.fulfilmentValid) {
      throw new Error(quote.fulfilmentSummary || 'Please select a valid delivery zone or collection point.');
    }

    // Reserve stock atomically inside transaction
    for (const line of quote.lines) {
      const [variant] = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, line.variantId))
        .limit(1);

      if (!variant || variant.stockQty - variant.reservedQty < line.quantity) {
        throw new Error(`Insufficient available stock for ${line.productName} (${line.variantLabel}).`);
      }

      await tx
        .update(productVariants)
        .set({
          reservedQty: variant.reservedQty + line.quantity,
        })
        .where(eq(productVariants.id, line.variantId));

      await tx.insert(stockMovements).values({
        variantId: line.variantId,
        delta: -line.quantity,
        reason: 'checkout_reservation',
        referenceId: input.idempotencyKey,
        actorUid: input.userUid || 'guest',
      });
    }

    if (quote.appliedPromoCode) {
      await tx
        .update(promotions)
        .set({
          usedCount: sql`${promotions.usedCount} + 1`,
        })
        .where(eq(promotions.code, quote.appliedPromoCode));
    }

    const rawAccessToken = crypto.randomBytes(24).toString('hex');
    const accessTokenHash = hashAccessToken(rawAccessToken);
    const orderRef = generateOrderRef();
    const isMpesa = input.paymentMethod === 'mpesa_intasend' || input.paymentMethod === 'mpesa_sandbox_sim';
    const reservationExpiresAt = isMpesa ? new Date(Date.now() + 20 * 60 * 1000) : null; // 20-min hold for M-Pesa only

    const [createdOrder] = await tx
      .insert(orders)
      .values({
        orderRef,
        accessTokenHash,
        idempotencyKey: input.idempotencyKey,
        userUid: input.userUid,
        customerName: input.customerName.trim(),
        customerPhone: customerPhoneNorm.e164,
        payerPhone: payerPhoneNorm.e164,
        customerEmail: (input.customerEmail || '').trim().toLowerCase(),
        fulfilmentType: input.fulfilmentType,
        deliveryZoneId: input.deliveryZoneId ?? null,
        collectionPointId: input.collectionPointId ?? null,
        county: (input.county || '').trim(),
        town: (input.town || '').trim(),
        estate: (input.estate || '').trim(),
        building: (input.building || '').trim(),
        landmark: (input.landmark || '').trim(),
        deliveryInstructions: (input.deliveryInstructions || '').trim(),
        paymentMethod: input.paymentMethod,
        paymentStatus: 'awaiting_payment',
        fulfilmentStatus: 'received',
        subtotalCents: quote.subtotalCents,
        discountCents: quote.discountCents,
        deliveryFeeCents: quote.deliveryFeeCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        promoCode: quote.appliedPromoCode,
        reservationExpiresAt,
        stockFinalized: false,
      })
      .returning();

    const createdItems = await tx
      .insert(orderItems)
      .values(
        quote.lines.map((line) => ({
          orderId: createdOrder.id,
          productId: line.productId,
          variantId: line.variantId,
          productNameSnapshot: line.productName,
          variantLabelSnapshot: line.variantLabel,
          skuSnapshot: line.sku,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
          lineTotalCents: line.lineTotalCents,
        }))
      )
      .returning();

    await tx.insert(orderStatusEvents).values({
      orderId: createdOrder.id,
      eventType: 'fulfilment',
      fromStatus: '',
      toStatus: 'received',
      note: 'Order received and inventory reserved.',
      actorUid: input.userUid || 'guest',
    });

    return {
      reused: false,
      order: createdOrder,
      items: createdItems,
      transaction: null,
      rawAccessToken,
      payerPhone254: payerPhoneNorm.intasend,
    };
  });
}

export async function reconcilePaymentResult(params: {
  orderId: number;
  invoiceId: string;
  targetPaymentStatus: PaymentStatus;
  txState: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'CANCELED';
  mpesaReceipt?: string;
  failureReason?: string;
  actorUid?: string;
}) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);

    if (!order) {
      throw new Error('Order not found for payment reconciliation.');
    }

    const currentPayment = order.paymentStatus as PaymentStatus;
    if (currentPayment === params.targetPaymentStatus) {
      return order;
    }

    if (!canTransitionPayment(currentPayment, params.targetPaymentStatus)) {
      return order;
    }

    // Update payment transaction record
    await tx
      .update(paymentTransactions)
      .set({
        state: params.txState,
        mpesaReceipt: params.mpesaReceipt || '',
        failureReason: params.failureReason || '',
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.invoiceId, params.invoiceId));

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    let nextFulfilment = order.fulfilmentStatus as FulfilmentStatus;
    let nextStockFinalized = order.stockFinalized;

    if (params.targetPaymentStatus === 'paid' && !order.stockFinalized) {
      for (const item of items) {
        await tx
          .update(productVariants)
          .set({
            stockQty: sql`GREATEST(0, ${productVariants.stockQty} - ${item.quantity})`,
            reservedQty: sql`GREATEST(0, ${productVariants.reservedQty} - ${item.quantity})`,
          })
          .where(eq(productVariants.id, item.variantId));

        await tx.insert(stockMovements).values({
          variantId: item.variantId,
          delta: -item.quantity,
          reason: 'payment_confirmed',
          referenceId: order.orderRef,
          actorUid: params.actorUid || 'payment_webhook',
        });
      }
      nextStockFinalized = true;
      if (canTransitionFulfilment(nextFulfilment, 'confirmed')) {
        nextFulfilment = 'confirmed';
      }
    } else if (
      (params.targetPaymentStatus === 'failed' || params.targetPaymentStatus === 'cancelled') &&
      !order.stockFinalized
    ) {
      for (const item of items) {
        await tx
          .update(productVariants)
          .set({
            reservedQty: sql`GREATEST(0, ${productVariants.reservedQty} - ${item.quantity})`,
          })
          .where(eq(productVariants.id, item.variantId));

        await tx.insert(stockMovements).values({
          variantId: item.variantId,
          delta: item.quantity,
          reason: `payment_${params.targetPaymentStatus}`,
          referenceId: order.orderRef,
          actorUid: params.actorUid || 'payment_webhook',
        });
      }
      nextStockFinalized = true;
    }

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        paymentStatus: params.targetPaymentStatus,
        fulfilmentStatus: nextFulfilment,
        stockFinalized: nextStockFinalized,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
      .returning();

    await tx.insert(orderStatusEvents).values({
      orderId: order.id,
      eventType: 'payment',
      fromStatus: currentPayment,
      toStatus: params.targetPaymentStatus,
      note:
        params.targetPaymentStatus === 'paid'
          ? `Payment verified${params.mpesaReceipt ? ` (Ref ${params.mpesaReceipt})` : ''}.`
          : params.failureReason || `Payment state updated to ${params.targetPaymentStatus}.`,
      actorUid: params.actorUid || 'payment_webhook',
    });

    if (nextFulfilment !== order.fulfilmentStatus) {
      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        eventType: 'fulfilment',
        fromStatus: order.fulfilmentStatus,
        toStatus: nextFulfilment,
        note: 'Order automatically confirmed after payment verification.',
        actorUid: params.actorUid || 'payment_webhook',
      });
    }

    return updatedOrder;
  });
}

export async function prepareOrderRetryPayment(params: {
  orderId: number;
  payerPhoneRaw?: string;
  actorUid?: string;
}) {
  return db.transaction(async (tx) => {
    const dbTx = tx as unknown as typeof db;
    await releaseExpiredReservations(dbTx);

    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);

    if (!order) {
      throw new Error('Order not found.');
    }

    if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
      throw new Error('This order has already been paid.');
    }
    if (!['failed', 'cancelled', 'awaiting_payment'].includes(order.paymentStatus)) {
      throw new Error('Payment is currently pending confirmation. Please check status first.');
    }

    const payerPhoneNorm = params.payerPhoneRaw?.trim()
      ? normalizeKenyanPhone(params.payerPhoneRaw)
      : normalizeKenyanPhone(order.payerPhone || order.customerPhone);
    if (!payerPhoneNorm.valid) {
      throw new Error(payerPhoneNorm.error || 'Enter a valid Kenyan M-Pesa mobile number.');
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    if (order.stockFinalized) {
      // Previously released on failure/expiry: re-reserve atomically
      for (const item of items) {
        const [variant] = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, item.variantId))
          .limit(1);
        if (!variant || !variant.isActive || variant.stockQty - variant.reservedQty < item.quantity) {
          throw new Error(
            `Sorry, ${item.productNameSnapshot} (${item.variantLabelSnapshot}) no longer has enough available stock to retry this order.`
          );
        }
        await tx
          .update(productVariants)
          .set({ reservedQty: variant.reservedQty + item.quantity })
          .where(eq(productVariants.id, item.variantId));

        await tx.insert(stockMovements).values({
          variantId: item.variantId,
          delta: -item.quantity,
          reason: 'payment_retry_reservation',
          referenceId: order.orderRef,
          actorUid: params.actorUid || 'customer',
        });
      }
    }

    const nextExpires = new Date(Date.now() + 20 * 60 * 1000);
    const nextFulfilment =
      order.fulfilmentStatus === 'cancelled' ? 'received' : order.fulfilmentStatus;

    const [updated] = await tx
      .update(orders)
      .set({
        payerPhone: payerPhoneNorm.e164,
        paymentStatus: 'awaiting_payment',
        fulfilmentStatus: nextFulfilment,
        stockFinalized: false,
        reservationExpiresAt: nextExpires,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
      .returning();

    return { order: updated, payerPhone254: payerPhoneNorm.intasend };
  });
}

export async function finalizeStockForAdminOrderChange(params: {
  orderId: number;
  nextPaymentStatus: PaymentStatus;
  nextFulfilmentStatus: FulfilmentStatus;
  actorUid: string;
}) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
    if (!order || order.stockFinalized) return;

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    if (params.nextPaymentStatus === 'paid' || params.nextFulfilmentStatus === 'delivered') {
      for (const item of items) {
        await tx
          .update(productVariants)
          .set({
            stockQty: sql`GREATEST(0, ${productVariants.stockQty} - ${item.quantity})`,
            reservedQty: sql`GREATEST(0, ${productVariants.reservedQty} - ${item.quantity})`,
          })
          .where(eq(productVariants.id, item.variantId));

        await tx.insert(stockMovements).values({
          variantId: item.variantId,
          delta: -item.quantity,
          reason: 'admin_order_finalized',
          referenceId: order.orderRef,
          actorUid: params.actorUid,
        });
      }
      await tx.update(orders).set({ stockFinalized: true }).where(eq(orders.id, order.id));
    } else if (
      params.nextFulfilmentStatus === 'cancelled' ||
      params.nextPaymentStatus === 'cancelled' ||
      params.nextPaymentStatus === 'failed'
    ) {
      for (const item of items) {
        await tx
          .update(productVariants)
          .set({
            reservedQty: sql`GREATEST(0, ${productVariants.reservedQty} - ${item.quantity})`,
          })
          .where(eq(productVariants.id, item.variantId));

        await tx.insert(stockMovements).values({
          variantId: item.variantId,
          delta: item.quantity,
          reason: 'admin_order_cancelled',
          referenceId: order.orderRef,
          actorUid: params.actorUid,
        });
      }
      await tx.update(orders).set({ stockFinalized: true }).where(eq(orders.id, order.id));
    }
  });
}
