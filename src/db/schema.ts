import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  brandName: text('brand_name').notNull().default('Blendy'),
  strapline: text('strapline').notNull().default('Real fruit smoothies'),
  announcementText: text('announcement_text').notNull().default(''),
  announcementEnabled: boolean('announcement_enabled').notNull().default(false),
  currency: text('currency').notNull().default('KES'),
  timezone: text('timezone').notNull().default('Africa/Nairobi'),
  supportPhone: text('support_phone').notNull().default(''),
  supportEmail: text('support_email').notNull().default(''),
  whatsappNumber: text('whatsapp_number').notNull().default(''),
  physicalAddress: text('physical_address').notNull().default(''),
  operatingHours: text('operating_hours').notNull().default(''),
  taxLabel: text('tax_label').notNull().default('Prices displayed are as configured (VAT status pending owner confirmation)'),
  taxRateBps: integer('tax_rate_bps').notNull().default(0),
  allowPayOnDelivery: boolean('allow_pay_on_delivery').notNull().default(false),
  allowPayOnPickup: boolean('allow_pay_on_pickup').notNull().default(false),
  maintenanceMode: boolean('maintenance_mode').notNull().default(false),
  heroConfigJson: jsonb('hero_config_json').$type<{
    activeFlavours: string[];
    autoplayMs: number;
  }>().notNull().default({ activeFlavours: ['berry', 'kiwi', 'banana', 'strawberry'], autoplayMs: 2600 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  role: text('role').notNull().default('customer'), // 'owner' | 'manager' | 'fulfilment_staff' | 'customer'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    flavour: text('flavour').notNull(), // 'Berry' | 'Kiwi' | 'Banana' | 'Strawberry' | 'Mixed'
    category: text('category').notNull().default('Smoothies'),
    shortDescription: text('short_description').notNull().default(''),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
    heroSpecKey: text('hero_spec_key'), // 'berry' | 'kiwi' | 'banana' | 'strawberry' | null
    imageUrl: text('image_url').notNull().default(''),
    imageAlt: text('image_alt').notNull().default(''),
    bgTint: text('bg_tint').notNull().default('#FAF9F7'),
    ingredientsText: text('ingredients_text').notNull().default(''),
    allergensText: text('allergens_text').notNull().default(''),
    nutritionJson: jsonb('nutrition_json').$type<Record<string, string>>().notNull().default({}),
    storageInstructions: text('storage_instructions').notNull().default(''),
    shelfLife: text('shelf_life').notNull().default(''),
    volumeLabel: text('volume_label').notNull().default(''),
    seoTitle: text('seo_title').notNull().default(''),
    seoDescription: text('seo_description').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('products_status_idx').on(table.status),
    index('products_flavour_idx').on(table.flavour),
  ]
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    sku: text('sku').notNull().unique(),
    label: text('label').notNull(),
    priceCents: integer('price_cents').notNull().default(0), // 0 = unpriced draft
    compareAtCents: integer('compare_at_cents'),
    stockQty: integer('stock_qty').notNull().default(0),
    reservedQty: integer('reserved_qty').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('variants_product_idx').on(table.productId)]
);

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: serial('id').primaryKey(),
    variantId: integer('variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull(),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull(),
    referenceId: text('reference_id').notNull().default(''),
    actorUid: text('actor_uid').notNull().default('system'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('stock_movements_variant_idx').on(table.variantId)]
);

export const deliveryZones = pgTable('delivery_zones', {
  id: serial('id').primaryKey(),
  county: text('county').notNull(),
  town: text('town').notNull(),
  areaLabel: text('area_label').notNull(),
  feeCents: integer('fee_cents').notNull().default(0),
  freeThresholdCents: integer('free_threshold_cents'),
  minOrderCents: integer('min_order_cents').notNull().default(0),
  estimateText: text('estimate_text').notNull().default('Estimated timing configured by store'),
  operatingNote: text('operating_note').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const collectionPoints = pgTable('collection_points', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  county: text('county').notNull(),
  town: text('town').notNull(),
  addressLine: text('address_line').notNull(),
  hoursText: text('hours_text').notNull().default(''),
  instructions: text('instructions').notNull().default(''),
  feeCents: integer('fee_cents').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const promotions = pgTable('promotions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description').notNull().default(''),
  discountType: text('discount_type').notNull().default('percent'), // 'percent' | 'fixed_cents' | 'free_delivery'
  discountValue: integer('discount_value').notNull().default(0),
  minSubtotalCents: integer('min_subtotal_cents').notNull().default(0),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    orderRef: text('order_ref').notNull().unique(),
    accessTokenHash: text('access_token_hash').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    userUid: text('user_uid'),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    payerPhone: text('payer_phone').notNull(),
    customerEmail: text('customer_email').notNull().default(''),
    fulfilmentType: text('fulfilment_type').notNull(), // 'delivery' | 'collection'
    deliveryZoneId: integer('delivery_zone_id'),
    collectionPointId: integer('collection_point_id'),
    county: text('county').notNull().default(''),
    town: text('town').notNull().default(''),
    estate: text('estate').notNull().default(''),
    building: text('building').notNull().default(''),
    landmark: text('landmark').notNull().default(''),
    deliveryInstructions: text('delivery_instructions').notNull().default(''),
    paymentMethod: text('payment_method').notNull(), // 'mpesa_intasend' | 'mpesa_sandbox_sim' | 'pay_on_delivery' | 'pay_on_pickup'
    paymentStatus: text('payment_status').notNull().default('awaiting_payment'), // 'awaiting_payment' | 'pending_confirmation' | 'paid' | 'failed' | 'cancelled' | 'refunded'
    fulfilmentStatus: text('fulfilment_status').notNull().default('received'), // 'received' | 'confirmed' | 'preparing' | 'ready_for_collection' | 'out_for_delivery' | 'delivered' | 'cancelled'
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').notNull().default(0),
    deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    promoCode: text('promo_code'),
    reservationExpiresAt: timestamp('reservation_expires_at'),
    stockFinalized: boolean('stock_finalized').notNull().default(false),
    internalNotes: text('internal_notes').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('orders_user_uid_idx').on(table.userUid),
    index('orders_payment_status_idx').on(table.paymentStatus),
    index('orders_fulfilment_status_idx').on(table.fulfilmentStatus),
    index('orders_created_at_idx').on(table.createdAt),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    productId: integer('product_id').notNull(),
    variantId: integer('variant_id').notNull(),
    productNameSnapshot: text('product_name_snapshot').notNull(),
    variantLabelSnapshot: text('variant_label_snapshot').notNull(),
    skuSnapshot: text('sku_snapshot').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)]
);

export const orderStatusEvents = pgTable(
  'order_status_events',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    eventType: text('event_type').notNull(), // 'payment' | 'fulfilment' | 'note'
    fromStatus: text('from_status').notNull().default(''),
    toStatus: text('to_status').notNull(),
    note: text('note').notNull().default(''),
    actorUid: text('actor_uid').notNull().default('system'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('order_events_order_idx').on(table.orderId)]
);

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    provider: text('provider').notNull(), // 'intasend' | 'sandbox_sim' | 'pay_on_delivery'
    environment: text('environment').notNull(), // 'sandbox' | 'live' | 'simulator'
    invoiceId: text('invoice_id').notNull(),
    mpesaReceipt: text('mpesa_receipt').notNull().default(''),
    phoneNumber: text('phone_number').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('KES'),
    state: text('state').notNull().default('PENDING'), // 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'CANCELED'
    failureReason: text('failure_reason').notNull().default(''),
    rawMetaJson: jsonb('raw_meta_json').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('payment_tx_order_idx').on(table.orderId),
    index('payment_tx_invoice_idx').on(table.invoiceId),
  ]
);

export const paymentWebhookEvents = pgTable('payment_webhook_events', {
  id: serial('id').primaryKey(),
  provider: text('provider').notNull(),
  eventKey: text('event_key').notNull().unique(),
  invoiceId: text('invoice_id').notNull(),
  topic: text('topic').notNull().default(''),
  challengeVerified: boolean('challenge_verified').notNull().default(false),
  state: text('state').notNull().default(''),
  payloadJson: jsonb('payload_json').$type<Record<string, unknown>>().notNull().default({}),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});

export const contentPages = pgTable('content_pages', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(), // 'our-story' | 'privacy' | 'terms' | 'returns' | 'cookies'
  title: text('title').notNull(),
  bodyMarkdown: text('body_markdown').notNull().default(''),
  reviewStatus: text('review_status').notNull().default('draft_needs_review'), // 'draft_needs_review' | 'approved'
  seoTitle: text('seo_title').notNull().default(''),
  seoDescription: text('seo_description').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category').notNull().default('Ordering'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(true),
  lastReviewedAt: timestamp('last_reviewed_at').defaultNow().notNull(),
});

export const testimonials = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  authorName: text('author_name').notNull(),
  locationLabel: text('location_label').notNull().default(''),
  quote: text('quote').notNull(),
  productId: integer('product_id'),
  isApproved: boolean('is_approved').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  marketingConsent: boolean('marketing_consent').notNull().default(true),
  consentRecordedAt: timestamp('consent_recorded_at').defaultNow().notNull(),
  unsubscribeToken: text('unsubscribe_token').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    actorUid: text('actor_uid').notNull(),
    actorEmail: text('actor_email').notNull().default(''),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('audit_created_idx').on(table.createdAt)]
);
