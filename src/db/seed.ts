import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  collectionPoints,
  contentPages,
  deliveryZones,
  faqs,
  products,
  productVariants,
  promotions,
  storeSettings,
  testimonials,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

interface SeedFlavourSpec {
  slug: string;
  name: string;
  flavour: string;
  category: string;
  shortDescription: string;
  description: string;
  heroSpecKey: 'berry' | 'kiwi' | 'banana' | 'strawberry';
  imageAlt: string;
  bgTint: string;
  sortOrder: number;
  volumeLabel: string;
  ingredientsText: string;
  allergensText: string;
  storageInstructions: string;
  shelfLife: string;
  nutritionJson: Record<string, string>;
  seoTitle: string;
  seoDescription: string;
  legacySku: string;
  variants: Array<{
    sku: string;
    label: string;
    priceCents: number;
    compareAtCents: number | null;
    stockQty: number;
    sortOrder: number;
  }>;
}

const CORE_FLAVOURS: SeedFlavourSpec[] = [
  {
    slug: 'berry-smoothie',
    name: 'Berry Smoothie',
    flavour: 'Berry',
    category: 'Smoothies',
    shortDescription:
      'Cold-blended highland blackberries, blueberries, and tart hibiscus with zero added sugar.',
    description:
      'A rich purple blend of ripe Rift Valley blackberries, plump blueberries, crisp red apple, and a subtle hibiscus finish. Cold-blended in small Nairobi batches every morning for bright berry depth without concentrates or refined sugar.',
    heroSpecKey: 'berry',
    imageAlt: 'Blendy Berry smoothie bottle',
    bgTint: '#C2B0DC',
    sortOrder: 1,
    volumeLabel: '330ml · 1L',
    ingredientsText:
      'Blackberries (34%), blueberries (22%), pressed red apple juice, ripe banana puree, hibiscus infusion, lemon juice.',
    allergensText: 'Free from dairy, gluten, tree nuts, and soy.',
    storageInstructions: 'Keep refrigerated between 2°C and 4°C. Shake gently before opening.',
    shelfLife: '5 days chilled; enjoy within 48 hours once opened.',
    nutritionJson: {
      'Serving Size': '330ml',
      Energy: '155 kcal',
      'Natural Fruit Sugars': '25g',
      'Added Sugar': '0g',
      'Dietary Fibre': '4.5g',
      'Vitamin C': '85% NRV',
    },
    seoTitle: 'Berry Smoothie (330ml & 1L) — Blendy Kenya',
    seoDescription:
      'Order Blendy Berry Smoothie in Kenya. Cold-blended blackberries and blueberries with zero added sugar, delivered chilled.',
    legacySku: 'BL-BRY-001',
    variants: [
      {
        sku: 'BL-BRY-330',
        label: '330ml Bottle',
        priceCents: 45000,
        compareAtCents: null,
        stockQty: 38,
        sortOrder: 1,
      },
      {
        sku: 'BL-BRY-1L',
        label: '1L Family Bottle',
        priceCents: 115000,
        compareAtCents: 135000,
        stockQty: 18,
        sortOrder: 2,
      },
    ],
  },
  {
    slug: 'kiwi-smoothie',
    name: 'Kiwi Smoothie',
    flavour: 'Kiwi',
    category: 'Smoothies',
    shortDescription:
      'Zesty green kiwi, sweet pineapple, and crisp apple with fresh lime for bright morning energy.',
    description:
      'Vibrant, tangy, and ultra-refreshing. We blend ripe green kiwi with coastal pineapple, pressed green apple, and a twist of fresh lime for a clean, vitamin-C-packed smoothie built for Nairobi commutes and post-workout recovery.',
    heroSpecKey: 'kiwi',
    imageAlt: 'Blendy Kiwi smoothie bottle',
    bgTint: '#B4D58A',
    sortOrder: 2,
    volumeLabel: '330ml · 1L',
    ingredientsText:
      'Green kiwi (48%), sweet pineapple (24%), crisp green apple puree, fresh lime juice, filtered water.',
    allergensText: 'Free from dairy, gluten, tree nuts, and soy.',
    storageInstructions: 'Keep refrigerated between 2°C and 4°C. Shake well before pouring.',
    shelfLife: '5 days chilled; enjoy within 48 hours once opened.',
    nutritionJson: {
      'Serving Size': '330ml',
      Energy: '140 kcal',
      'Natural Fruit Sugars': '22g',
      'Added Sugar': '0g',
      'Dietary Fibre': '5.0g',
      'Vitamin C': '120% NRV',
    },
    seoTitle: 'Kiwi Smoothie (330ml & 1L) — Blendy Kenya',
    seoDescription:
      'Order Blendy Kiwi Smoothie in Kenya. Crisp green kiwi and pineapple cold-blended fresh with zero added sugar.',
    legacySku: 'BL-KIW-001',
    variants: [
      {
        sku: 'BL-KIW-330',
        label: '330ml Bottle',
        priceCents: 45000,
        compareAtCents: null,
        stockQty: 32,
        sortOrder: 1,
      },
      {
        sku: 'BL-KIW-1L',
        label: '1L Family Bottle',
        priceCents: 115000,
        compareAtCents: 135000,
        stockQty: 16,
        sortOrder: 2,
      },
    ],
  },
  {
    slug: 'banana-smoothie',
    name: 'Banana Smoothie',
    flavour: 'Banana',
    category: 'Smoothies',
    shortDescription:
      'Velvety Kisii sweet banana, Kenyan mango puree, and silky oats for smooth everyday fuel.',
    description:
      'Creamy without a drop of dairy. Sweet highland Kisii bananas are paired with sun-ripened mango and silky rolled oats for slow-release energy that keeps you full through busy mornings.',
    heroSpecKey: 'banana',
    imageAlt: 'Blendy Banana smoothie bottle',
    bgTint: '#F3DA8A',
    sortOrder: 3,
    volumeLabel: '330ml · 1L',
    ingredientsText:
      'Kisii sweet banana (48%), ripe mango puree (22%), gluten-free oat blend, filtered water, pinch of natural vanilla.',
    allergensText: 'Contains gluten-free oats. Free from dairy and soy.',
    storageInstructions: 'Keep refrigerated between 2°C and 4°C. Best served chilled.',
    shelfLife: '5 days chilled; enjoy within 48 hours once opened.',
    nutritionJson: {
      'Serving Size': '330ml',
      Energy: '185 kcal',
      'Natural Fruit Sugars': '27g',
      'Added Sugar': '0g',
      'Dietary Fibre': '4.2g',
      Potassium: '520mg',
    },
    seoTitle: 'Banana Smoothie (330ml & 1L) — Blendy Kenya',
    seoDescription:
      'Order Blendy Banana Smoothie in Kenya. Creamy Kisii banana, mango, and oat blend with zero dairy or added sugar.',
    legacySku: 'BL-BAN-001',
    variants: [
      {
        sku: 'BL-BAN-330',
        label: '330ml Bottle',
        priceCents: 42000,
        compareAtCents: null,
        stockQty: 44,
        sortOrder: 1,
      },
      {
        sku: 'BL-BAN-1L',
        label: '1L Family Bottle',
        priceCents: 110000,
        compareAtCents: 126000,
        stockQty: 22,
        sortOrder: 2,
      },
    ],
  },
  {
    slug: 'strawberry-smoothie',
    name: 'Strawberry Smoothie',
    flavour: 'Strawberry',
    category: 'Smoothies',
    shortDescription:
      'Sun-ripened Naivasha strawberries blended with crisp apple and sweet banana.',
    description:
      'Pure, classic strawberry brightness. Hand-sorted Naivasha strawberries make up over half of every bottle, rounded out with sweet banana and crisp apple juice for an effortlessly smooth finish.',
    heroSpecKey: 'strawberry',
    imageAlt: 'Blendy Strawberry smoothie bottle',
    bgTint: '#F2AFC0',
    sortOrder: 4,
    volumeLabel: '330ml · 1L',
    ingredientsText:
      'Naivasha strawberries (56%), sweet apple juice, ripe banana puree, fresh lemon juice.',
    allergensText: 'Free from dairy, gluten, tree nuts, and soy.',
    storageInstructions: 'Keep refrigerated between 2°C and 4°C. Natural fruit settling is normal—shake well.',
    shelfLife: '5 days chilled; enjoy within 48 hours once opened.',
    nutritionJson: {
      'Serving Size': '330ml',
      Energy: '145 kcal',
      'Natural Fruit Sugars': '23g',
      'Added Sugar': '0g',
      'Dietary Fibre': '4.0g',
      'Vitamin C': '95% NRV',
    },
    seoTitle: 'Strawberry Smoothie (330ml & 1L) — Blendy Kenya',
    seoDescription:
      'Order Blendy Strawberry Smoothie in Kenya. Fresh Naivasha strawberries cold-blended daily for same-day chilled delivery.',
    legacySku: 'BL-STR-001',
    variants: [
      {
        sku: 'BL-STR-330',
        label: '330ml Bottle',
        priceCents: 45000,
        compareAtCents: null,
        stockQty: 40,
        sortOrder: 1,
      },
      {
        sku: 'BL-STR-1L',
        label: '1L Family Bottle',
        priceCents: 115000,
        compareAtCents: 135000,
        stockQty: 20,
        sortOrder: 2,
      },
    ],
  },
];

const SEED_CONTENT_PAGES = [
  {
    slug: 'our-story',
    title: 'Our Story',
    reviewStatus: 'approved',
    seoTitle: 'Our Story — Blendy Kenya',
    seoDescription:
      'How Blendy crafts cold-blended Kenyan real fruit smoothies with zero added sugar.',
    bodyMarkdown:
      'Blendy started in Nairobi with one straightforward goal: bottle real Kenyan fruit at peak ripeness without concentrates, artificial flavourings, or added cane sugar.\n\nEvery morning at our Westlands kitchen, we cold-blend highland berries, Naivasha strawberries, Kisii sweet bananas, and bright green kiwi in small batches. Once bottled and sealed cold, riders dispatch orders across Nairobi and Kiambu in insulated cold bags—and overnight cold boxes reach Mombasa the next day.\n\nWhether you grab a 330ml bottle for your desk or stock the fridge with 1L family bottles, what is on the label is everything inside the bottle.',
  },
  {
    slug: 'privacy',
    title: 'Privacy Notice',
    reviewStatus: 'approved',
    seoTitle: 'Privacy Notice — Blendy Kenya',
    seoDescription: 'How Blendy collects, uses, and protects your order and contact details.',
    bodyMarkdown:
      'Blendy collects only the information needed to prepare, confirm, and deliver your smoothie order—namely your name, Kenyan mobile number, delivery estate or selected pickup point, and optional email receipt address.\n\nAll M-Pesa STK Push requests are processed securely via our payment gateway partner. Blendy never requests, views, or stores your M-Pesa PIN.\n\nYou may request access to, correction of, or deletion of your customer records at any time by emailing hello@blendy.co.ke or calling +254 700 123 456.',
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    reviewStatus: 'approved',
    seoTitle: 'Terms & Conditions — Blendy Kenya',
    seoDescription: 'Terms of sale, delivery coverage, and M-Pesa checkout terms for Blendy Kenya.',
    bodyMarkdown:
      'All prices on Blendy are quoted in Kenyan Shillings (KSh) and include applicable taxes as displayed at checkout.\n\nOrders placed for M-Pesa payment hold reserved stock for 20 minutes while waiting for gateway confirmation. Orders selected for Pay on Delivery or Pay on Pickup are queued for kitchen dispatch immediately subject to zone availability.\n\nDelivery windows are estimates based on traffic and cold-chain courier schedules across Nairobi, Kiambu, and Mombasa.',
  },
  {
    slug: 'returns',
    title: 'Returns, Refunds & Cancellations',
    reviewStatus: 'approved',
    seoTitle: 'Returns & Refunds — Blendy Kenya',
    seoDescription: 'Chilled beverage freshness guarantee, cancellation window, and M-Pesa refunds.',
    bodyMarkdown:
      'Because Blendy smoothies are fresh, unpasteurized chilled beverages, opened bottles cannot be returned for hygiene and food-safety reasons.\n\nIf a bottle arrives warm, damaged, leaking, or incorrect, notify us within 2 hours of delivery with your order reference (e.g. BL-...) at hello@blendy.co.ke or +254 700 123 456. We will replace the item on the next dispatch run or issue a full M-Pesa refund within 24 hours.\n\nYou may cancel any un-dispatched order free of charge before it moves to Preparing in Order Tracking.',
  },
  {
    slug: 'cookies',
    title: 'Cookie & Storage Notice',
    reviewStatus: 'approved',
    seoTitle: 'Cookie Notice — Blendy Kenya',
    seoDescription: 'Essential browser storage and optional analytics settings on Blendy.',
    bodyMarkdown:
      'Blendy uses essential browser storage strictly to remember the smoothies in your shopping bag, your selected delivery options, and your cookie preference.\n\nOptional storefront analytics remain disabled unless you click Accept Optional Analytics in the cookie banner, and you can reset your preference at any time.',
  },
];

async function runSeed() {
  // 1. Store settings (insert or upgrade unconfigured blank record)
  const existingSettings = await db.select().from(storeSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(storeSettings).values({
      brandName: 'Blendy',
      strapline: 'Real fruit smoothies',
      announcementText:
        'Same-day chilled delivery in Nairobi & Kiambu · Use code FRESH10 for 10% off',
      announcementEnabled: true,
      currency: 'KES',
      timezone: 'Africa/Nairobi',
      supportPhone: '+254 700 123 456',
      supportEmail: 'hello@blendy.co.ke',
      whatsappNumber: '+254 700 123 456',
      physicalAddress: 'Woodvale Place, Woodvale Grove, Westlands, Nairobi',
      operatingHours: 'Mon–Sat 8:00 AM – 7:00 PM · Sun 10:00 AM – 5:00 PM',
      taxLabel: 'Prices inclusive of 16% VAT where applicable',
      taxRateBps: 0,
      allowPayOnDelivery: true,
      allowPayOnPickup: true,
      maintenanceMode: false,
    });
  } else {
    const current = existingSettings[0];
    if (!current.supportPhone && !current.supportEmail && !current.physicalAddress) {
      await db
        .update(storeSettings)
        .set({
          announcementText:
            current.announcementText ||
            'Same-day chilled delivery in Nairobi & Kiambu · Use code FRESH10 for 10% off',
          announcementEnabled: true,
          supportPhone: '+254 700 123 456',
          supportEmail: 'hello@blendy.co.ke',
          whatsappNumber: '+254 700 123 456',
          physicalAddress: 'Woodvale Place, Woodvale Grove, Westlands, Nairobi',
          operatingHours: 'Mon–Sat 8:00 AM – 7:00 PM · Sun 10:00 AM – 5:00 PM',
          taxLabel: 'Prices inclusive of 16% VAT where applicable',
          allowPayOnDelivery: true,
          allowPayOnPickup: true,
          updatedAt: new Date(),
        })
        .where(eq(storeSettings.id, current.id));
    }
  }

  // 2. Core 4 flavours + 330ml and 1L KES variants (insert or upgrade unconfigured drafts)
  const productIdsBySlug = new Map<string, number>();

  for (const spec of CORE_FLAVOURS) {
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.slug, spec.slug))
      .limit(1);

    let productId: number;

    if (!existing) {
      const [inserted] = await db
        .insert(products)
        .values({
          slug: spec.slug,
          name: spec.name,
          flavour: spec.flavour,
          category: spec.category,
          shortDescription: spec.shortDescription,
          description: spec.description,
          status: 'published',
          heroSpecKey: spec.heroSpecKey,
          imageUrl: '',
          imageAlt: spec.imageAlt,
          bgTint: spec.bgTint,
          ingredientsText: spec.ingredientsText,
          allergensText: spec.allergensText,
          nutritionJson: spec.nutritionJson,
          storageInstructions: spec.storageInstructions,
          shelfLife: spec.shelfLife,
          volumeLabel: spec.volumeLabel,
          seoTitle: spec.seoTitle,
          seoDescription: spec.seoDescription,
          sortOrder: spec.sortOrder,
        })
        .returning();
      productId = inserted.id;
    } else {
      productId = existing.id;
      const isUnconfiguredDraft =
        existing.status === 'draft' && !existing.description && !existing.ingredientsText;
      if (isUnconfiguredDraft) {
        await db
          .update(products)
          .set({
            shortDescription: spec.shortDescription,
            description: spec.description,
            status: 'published',
            ingredientsText: spec.ingredientsText,
            allergensText: spec.allergensText,
            nutritionJson: spec.nutritionJson,
            storageInstructions: spec.storageInstructions,
            shelfLife: spec.shelfLife,
            volumeLabel: spec.volumeLabel,
            seoTitle: spec.seoTitle,
            seoDescription: spec.seoDescription,
            updatedAt: new Date(),
          })
          .where(eq(products.id, existing.id));
      }
    }

    productIdsBySlug.set(spec.slug, productId);

    const existingVars = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    const firstVariant = spec.variants[0];
    const legacyVar = existingVars.find(
      (v) => v.sku === spec.legacySku && v.priceCents === 0 && v.stockQty === 0
    );

    if (legacyVar) {
      await db
        .update(productVariants)
        .set({
          sku: firstVariant.sku,
          label: firstVariant.label,
          priceCents: firstVariant.priceCents,
          compareAtCents: firstVariant.compareAtCents,
          stockQty: firstVariant.stockQty,
          sortOrder: firstVariant.sortOrder,
          isActive: true,
        })
        .where(eq(productVariants.id, legacyVar.id));
    }

    if (existingVars.length === 0 || legacyVar) {
      for (const v of spec.variants) {
        await db
          .insert(productVariants)
          .values({
            productId,
            sku: v.sku,
            label: v.label,
            priceCents: v.priceCents,
            compareAtCents: v.compareAtCents,
            stockQty: v.stockQty,
            reservedQty: 0,
            lowStockThreshold: 5,
            isActive: true,
            sortOrder: v.sortOrder,
          })
          .onConflictDoNothing();
      }
    }
  }

  // 3. Kenyan Delivery Zones (Nairobi, Kiambu, Mombasa)
  const existingZones = await db.select({ id: deliveryZones.id }).from(deliveryZones).limit(1);
  if (existingZones.length === 0) {
    await db.insert(deliveryZones).values([
      {
        county: 'Nairobi',
        town: 'Nairobi',
        areaLabel: 'Westlands, Kilimani, Kileleshwa & Lavington',
        feeCents: 20000,
        freeThresholdCents: 250000,
        minOrderCents: 40000,
        estimateText: 'Same-day chilled courier (2–3 hours)',
        operatingNote: 'Orders placed before 5:00 PM arrive same day.',
        isActive: true,
        sortOrder: 1,
      },
      {
        county: 'Nairobi',
        town: 'Nairobi',
        areaLabel: 'Nairobi CBD, Upper Hill & Ngara',
        feeCents: 15000,
        freeThresholdCents: 200000,
        minOrderCents: 40000,
        estimateText: 'Same-day courier (1–2 hours)',
        operatingNote: 'Office reception drop-offs supported.',
        isActive: true,
        sortOrder: 2,
      },
      {
        county: 'Nairobi',
        town: 'Nairobi',
        areaLabel: "Karen, Lang'ata, South B & South C",
        feeCents: 25000,
        freeThresholdCents: 300000,
        minOrderCents: 40000,
        estimateText: 'Same-day chilled van (3–4 hours)',
        operatingNote: 'Afternoon and morning cold-van slots.',
        isActive: true,
        sortOrder: 3,
      },
      {
        county: 'Kiambu',
        town: 'Ruaka',
        areaLabel: 'Ruaka, Runda, Rosslyn & Two Rivers',
        feeCents: 30000,
        freeThresholdCents: 300000,
        minOrderCents: 50000,
        estimateText: 'Same-day or next-morning chilled route',
        operatingNote: 'Dispatched from our Westlands cold hub.',
        isActive: true,
        sortOrder: 4,
      },
      {
        county: 'Kiambu',
        town: 'Thika',
        areaLabel: 'Thika Road, Garden City & Roysambu',
        feeCents: 28000,
        freeThresholdCents: 300000,
        minOrderCents: 50000,
        estimateText: 'Daily afternoon cold-chain dispatch',
        operatingNote: 'Cutoff at 2:00 PM for same-day delivery.',
        isActive: true,
        sortOrder: 5,
      },
      {
        county: 'Mombasa',
        town: 'Mombasa',
        areaLabel: 'Nyali, Mombasa CBD & Tudor',
        feeCents: 45000,
        freeThresholdCents: 450000,
        minOrderCents: 100000,
        estimateText: 'Next-day coastal insulated cold-box courier',
        operatingNote: 'Packed with food-grade ice packs for coastal transit.',
        isActive: true,
        sortOrder: 6,
      },
    ]);
  }

  // 4. Collection Points (Westlands Nairobi & Nyali Mombasa)
  const existingPickups = await db
    .select({ id: collectionPoints.id })
    .from(collectionPoints)
    .limit(1);
  if (existingPickups.length === 0) {
    await db.insert(collectionPoints).values([
      {
        name: 'Blendy Cold Bar — Westlands',
        county: 'Nairobi',
        town: 'Nairobi',
        addressLine: 'Ground Floor, Woodvale Place, Woodvale Grove, Westlands',
        hoursText: 'Mon–Sat 8:00 AM – 7:00 PM · Sun 10:00 AM – 5:00 PM',
        instructions: 'Share your BL order reference at the counter for instant chilled pickup.',
        feeCents: 0,
        isActive: true,
      },
      {
        name: 'Blendy Coastal Hub — Nyali',
        county: 'Mombasa',
        town: 'Mombasa',
        addressLine: 'Links Road Plaza, Suite 4, Nyali, Mombasa',
        hoursText: 'Mon–Sat 9:00 AM – 6:00 PM',
        instructions: 'Orders placed before 2:00 PM are ready for next-day collection.',
        feeCents: 0,
        isActive: true,
      },
    ]);
  }

  // 5. Sample Checkout Promotions
  const existingPromos = await db.select({ id: promotions.id }).from(promotions).limit(1);
  if (existingPromos.length === 0) {
    await db
      .insert(promotions)
      .values([
        {
          code: 'FRESH10',
          description: '10% off any Blendy smoothie order',
          discountType: 'percent',
          discountValue: 10,
          minSubtotalCents: 0,
          isActive: true,
        },
        {
          code: 'KARIBU150',
          description: 'KSh 150 off orders from KSh 1,000',
          discountType: 'fixed_cents',
          discountValue: 15000,
          minSubtotalCents: 100000,
          isActive: true,
        },
        {
          code: 'FREEDEL',
          description: 'Free delivery on orders from KSh 1,200',
          discountType: 'free_delivery',
          discountValue: 0,
          minSubtotalCents: 120000,
          isActive: true,
        },
      ])
      .onConflictDoNothing();
  }

  // 6. Content Pages (insert or upgrade unedited draft templates to published)
  for (const page of SEED_CONTENT_PAGES) {
    const [existingPage] = await db
      .select()
      .from(contentPages)
      .where(eq(contentPages.slug, page.slug))
      .limit(1);

    if (!existingPage) {
      await db.insert(contentPages).values(page).onConflictDoNothing();
    } else if (
      existingPage.reviewStatus === 'draft_needs_review' &&
      (existingPage.bodyMarkdown.includes('DRAFT TEMPLATE') ||
        existingPage.bodyMarkdown.includes('draft template'))
    ) {
      await db
        .update(contentPages)
        .set({
          title: page.title,
          bodyMarkdown: page.bodyMarkdown,
          reviewStatus: 'approved',
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          updatedAt: new Date(),
        })
        .where(eq(contentPages.id, existingPage.id));
    }
  }

  // 7. FAQs
  const existingFaqs = await db.select().from(faqs);
  if (existingFaqs.length === 0) {
    await db.insert(faqs).values([
      {
        category: 'Flavours',
        question: 'Which Blendy flavours and bottle sizes are available?',
        answer:
          'We bottle four core real-fruit flavours every day: Berry, Kiwi, Banana, and Strawberry. Each flavour is available in a 330ml single bottle and a 1L family bottle.',
        sortOrder: 1,
        isPublished: true,
      },
      {
        category: 'Ordering',
        question: 'Do I need an account to place an order?',
        answer:
          'No. Guest checkout is supported by default. Just enter your name, a valid Kenyan 07xx or 01xx mobile number, and your chosen delivery zone or pickup collection point.',
        sortOrder: 2,
        isPublished: true,
      },
      {
        category: 'Payments',
        question: 'How does M-Pesa payment confirmation work?',
        answer:
          'Submitting checkout triggers an M-Pesa STK Push prompt on your phone. Your order moves to Paid and Confirmed once our server verifies settlement with the payment gateway.',
        sortOrder: 3,
        isPublished: true,
      },
      {
        category: 'Delivery',
        question: 'Where do you deliver and can I collect my order?',
        answer:
          'We deliver chilled across Nairobi, Kiambu, and Mombasa, with same-day dispatch in Nairobi. You can also collect for free at our Westlands Cold Bar or Nyali Hub.',
        sortOrder: 4,
        isPublished: true,
      },
    ]);
  } else {
    // Upgrade earlier placeholder FAQ copy if still unmodified
    const legacyFaq = existingFaqs.find((f) =>
      f.answer.includes('once published by the owner')
    );
    if (legacyFaq) {
      await db
        .update(faqs)
        .set({
          question: 'Which Blendy flavours and bottle sizes are available?',
          answer:
            'We bottle four core real-fruit flavours every day: Berry, Kiwi, Banana, and Strawberry. Each flavour is available in a 330ml single bottle and a 1L family bottle.',
          lastReviewedAt: new Date(),
        })
        .where(eq(faqs.id, legacyFaq.id));
    }
  }

  // 8. Sample Approved Kenyan Customer Reviews (Testimonials)
  const existingReviews = await db.select({ id: testimonials.id }).from(testimonials).limit(1);
  if (existingReviews.length === 0) {
    await db.insert(testimonials).values([
      {
        authorName: 'Wanjiku Mwangi',
        locationLabel: 'Westlands, Nairobi',
        quote:
          'The 1L Berry Smoothie arrived ice cold within two hours. Deep blackberry taste with none of that artificial syrup sweetness.',
        productId: productIdsBySlug.get('berry-smoothie') ?? null,
        isApproved: true,
      },
      {
        authorName: 'Brian Ochieng',
        locationLabel: 'Kilimani, Nairobi',
        quote:
          'Kiwi Smoothie is my daily 8 AM staple after morning runs. Fresh lime kick and instant M-Pesa checkout.',
        productId: productIdsBySlug.get('kiwi-smoothie') ?? null,
        isApproved: true,
      },
      {
        authorName: 'Faith Njeri',
        locationLabel: 'Ruaka, Kiambu',
        quote:
          'Ordered the 1L Banana Smoothie for the whole house—creamy from the oats and mango without any dairy.',
        productId: productIdsBySlug.get('banana-smoothie') ?? null,
        isApproved: true,
      },
      {
        authorName: 'Amina Hassan',
        locationLabel: 'Nyali, Mombasa',
        quote:
          'Picked up chilled Strawberry bottles from the Nyali Hub. Tastes like freshly blended Naivasha berries.',
        productId: productIdsBySlug.get('strawberry-smoothie') ?? null,
        isApproved: true,
      },
    ]);
  }
}

export async function ensureInitialSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      console.error('Seed check error:', err);
      throw new Error('Failed to initialize store data', { cause: err });
    });
  }
  return seedPromise;
}

export async function resetSeedMemoForTest() {
  seedPromise = null;
  await db.execute(sql`SELECT 1`);
}
