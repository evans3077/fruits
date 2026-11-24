import { asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { products, productVariants, stockMovements } from '../db/schema.ts';
import type { ProductDto, ProductVariantDto } from '../types.ts';

export const nutritionSchema = z.record(z.string().min(1).max(60), z.string().max(120));

export const variantInputSchema = z.object({
  id: z.number().int().positive().optional(),
  sku: z.string().min(2).max(50),
  label: z.string().min(1).max(80),
  priceCents: z.number().int().min(0),
  compareAtCents: z.number().int().min(0).nullable().optional(),
  stockQty: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const createProductSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens.'),
  name: z.string().min(2).max(120),
  flavour: z.string().min(2).max(40),
  category: z.string().min(2).max(60).default('Smoothies'),
  shortDescription: z.string().max(400).default(''),
  description: z.string().max(5000).default(''),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  bgTint: z.string().max(20).default('#FAF9F7'),
  heroSpecKey: z.enum(['berry', 'kiwi', 'banana', 'strawberry']).nullable().optional(),
  imageUrl: z.string().max(500).optional().default(''),
  imageAlt: z.string().max(200).optional().default(''),
  ingredientsText: z.string().max(2000).optional().default(''),
  allergensText: z.string().max(500).optional().default(''),
  nutritionJson: nutritionSchema.optional().default({}),
  storageInstructions: z.string().max(500).optional().default(''),
  shelfLife: z.string().max(200).optional().default(''),
  volumeLabel: z.string().max(60).optional().default(''),
  seoTitle: z.string().max(120).optional().default(''),
  seoDescription: z.string().max(240).optional().default(''),
  sortOrder: z.number().int().optional().default(0),
  // Supports either single legacy variant fields or a structured variants array (e.g. 330ml + 1L)
  sku: z.string().min(2).max(50).optional(),
  variantLabel: z.string().min(1).max(80).optional(),
  priceCents: z.number().int().min(0).optional(),
  stockQty: z.number().int().min(0).optional(),
  variants: z.array(variantInputSchema).min(1).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  flavour: z.string().min(2).max(40).optional(),
  category: z.string().min(2).max(60).optional(),
  shortDescription: z.string().max(400).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  heroSpecKey: z.enum(['berry', 'kiwi', 'banana', 'strawberry']).nullable().optional(),
  imageUrl: z.string().max(500).optional(),
  imageAlt: z.string().max(200).optional(),
  bgTint: z.string().max(20).optional(),
  ingredientsText: z.string().max(2000).optional(),
  allergensText: z.string().max(500).optional(),
  nutritionJson: nutritionSchema.optional(),
  storageInstructions: z.string().max(500).optional(),
  shelfLife: z.string().max(200).optional(),
  volumeLabel: z.string().max(60).optional(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(240).optional(),
  sortOrder: z.number().int().optional(),
  variants: z.array(variantInputSchema).optional(),
});

export const createVariantSchema = z.object({
  productId: z.number().int().positive(),
  sku: z.string().min(2).max(50),
  label: z.string().min(1).max(80),
  priceCents: z.number().int().min(0),
  compareAtCents: z.number().int().min(0).nullable().optional(),
  stockQty: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateVariantSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  priceCents: z.number().int().min(0).optional(),
  compareAtCents: z.number().int().min(0).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export function sanitizeNutritionRecord(raw?: Record<string, string>): Record<string, string> {
  if (!raw) return {};
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim();
    const val = String(v ?? '').trim();
    if (key && val) {
      clean[key] = val;
    }
  }
  return clean;
}

function hydrateVariant(v: typeof productVariants.$inferSelect): ProductVariantDto {
  return {
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    label: v.label,
    priceCents: v.priceCents,
    compareAtCents: v.compareAtCents,
    stockQty: v.stockQty,
    reservedQty: v.reservedQty,
    availableQty: Math.max(0, v.stockQty - v.reservedQty),
    lowStockThreshold: v.lowStockThreshold,
    isActive: v.isActive,
    sortOrder: v.sortOrder,
  };
}

function hydrateProduct(
  p: typeof products.$inferSelect,
  variants: ProductVariantDto[]
): ProductDto {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    flavour: p.flavour,
    category: p.category,
    shortDescription: p.shortDescription,
    description: p.description,
    status: p.status as ProductDto['status'],
    heroSpecKey: (p.heroSpecKey as ProductDto['heroSpecKey']) ?? null,
    imageUrl: p.imageUrl,
    imageAlt: p.imageAlt,
    bgTint: p.bgTint,
    ingredientsText: p.ingredientsText,
    allergensText: p.allergensText,
    nutritionJson: p.nutritionJson ?? {},
    storageInstructions: p.storageInstructions,
    shelfLife: p.shelfLife,
    volumeLabel: p.volumeLabel,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    sortOrder: p.sortOrder,
    variants,
  };
}

export interface ListProductsFilter {
  includeDrafts?: boolean;
  flavour?: string;
  category?: string;
  q?: string;
  sort?: 'featured' | 'price-asc' | 'price-desc' | string;
  inStockOnly?: boolean;
}

export async function listProducts(filter: ListProductsFilter = {}): Promise<ProductDto[]> {
  const includeDrafts = Boolean(filter.includeDrafts);

  const prodRows = includeDrafts
    ? await db.select().from(products).orderBy(asc(products.sortOrder), asc(products.id))
    : await db
        .select()
        .from(products)
        .where(eq(products.status, 'published'))
        .orderBy(asc(products.sortOrder), asc(products.id));

  if (prodRows.length === 0) return [];

  const productIds = prodRows.map((p) => p.id);
  const variantRows = await db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.id));

  const variantsByProduct = new Map<number, ProductVariantDto[]>();
  for (const row of variantRows) {
    if (!includeDrafts && !row.isActive) continue;
    const list = variantsByProduct.get(row.productId) ?? [];
    list.push(hydrateVariant(row));
    variantsByProduct.set(row.productId, list);
  }

  let result = prodRows.map((p) => hydrateProduct(p, variantsByProduct.get(p.id) ?? []));

  if (filter.flavour && filter.flavour !== 'All') {
    const fl = filter.flavour.toLowerCase();
    result = result.filter((p) => p.flavour.toLowerCase() === fl);
  }
  if (filter.category && filter.category !== 'All') {
    const cat = filter.category.toLowerCase();
    result = result.filter((p) => p.category.toLowerCase() === cat);
  }
  if (filter.q && filter.q.trim()) {
    const q = filter.q.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.flavour.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.ingredientsText.toLowerCase().includes(q)
    );
  }
  if (filter.inStockOnly) {
    result = result.filter((p) => p.variants.some((v) => v.availableQty > 0));
  }

  if (filter.sort === 'price-asc') {
    result.sort((a, b) => (a.variants[0]?.priceCents ?? 0) - (b.variants[0]?.priceCents ?? 0));
  } else if (filter.sort === 'price-desc') {
    result.sort((a, b) => (b.variants[0]?.priceCents ?? 0) - (a.variants[0]?.priceCents ?? 0));
  }

  return result;
}

export async function getProductById(
  id: number,
  includeDrafts = true
): Promise<ProductDto | null> {
  const [prod] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!prod) return null;
  if (!includeDrafts && prod.status !== 'published') return null;

  const variantRows = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, prod.id))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.id));

  const variants = variantRows
    .filter((v) => includeDrafts || v.isActive)
    .map(hydrateVariant);

  return hydrateProduct(prod, variants);
}

export async function getProductBySlug(
  slug: string,
  includeDrafts = false
): Promise<{ product: ProductDto; related: ProductDto[] } | null> {
  const all = await listProducts({ includeDrafts });
  const product = all.find((p) => p.slug === slug);
  if (!product) return null;
  const related = all.filter((p) => p.id !== product.id && p.status === 'published').slice(0, 3);
  return { product, related };
}

export async function createProductWithVariants(
  input: z.infer<typeof createProductSchema>,
  actorUid = 'system'
): Promise<ProductDto> {
  const d = createProductSchema.parse(input);

  const variantSpecs =
    d.variants && d.variants.length > 0
      ? d.variants
      : d.sku
        ? [
            {
              sku: d.sku.trim().toUpperCase(),
              label: (d.variantLabel || '330ml Bottle').trim(),
              priceCents: d.priceCents ?? 0,
              compareAtCents: null,
              stockQty: d.stockQty ?? 0,
              lowStockThreshold: 5,
              isActive: true,
              sortOrder: 1,
            },
          ]
        : [];

  if (variantSpecs.length === 0) {
    throw new Error('At least one variant (with SKU and KES price) is required.');
  }

  const createdId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({
        slug: d.slug.trim().toLowerCase(),
        name: d.name.trim(),
        flavour: d.flavour.trim(),
        category: d.category.trim(),
        shortDescription: d.shortDescription,
        description: d.description,
        status: d.status,
        bgTint: d.bgTint,
        heroSpecKey: d.heroSpecKey ?? null,
        imageUrl: d.imageUrl,
        imageAlt: d.imageAlt || `${d.name} bottle`,
        ingredientsText: d.ingredientsText,
        allergensText: d.allergensText,
        nutritionJson: sanitizeNutritionRecord(d.nutritionJson),
        storageInstructions: d.storageInstructions,
        shelfLife: d.shelfLife,
        volumeLabel:
          d.volumeLabel ||
          variantSpecs.map((v) => v.label.replace(/\s+Bottle$/i, '')).join(' · '),
        seoTitle: d.seoTitle || `${d.name} — Blendy`,
        seoDescription: d.seoDescription || d.shortDescription || d.name,
        sortOrder: d.sortOrder,
      })
      .returning();

    for (let i = 0; i < variantSpecs.length; i++) {
      const v = variantSpecs[i];
      const [insertedVar] = await tx
        .insert(productVariants)
        .values({
          productId: created.id,
          sku: v.sku.trim().toUpperCase(),
          label: v.label.trim(),
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents ?? null,
          stockQty: v.stockQty,
          reservedQty: 0,
          lowStockThreshold: v.lowStockThreshold ?? 5,
          isActive: v.isActive ?? true,
          sortOrder: v.sortOrder || i + 1,
        })
        .returning();

      if (v.stockQty > 0) {
        await tx.insert(stockMovements).values({
          variantId: insertedVar.id,
          delta: v.stockQty,
          reason: 'Initial product variant stock',
          actorUid,
        });
      }
    }

    return created.id;
  });

  const hydrated = await getProductById(createdId, true);
  if (!hydrated) throw new Error('Created product could not be reloaded.');
  return hydrated;
}

export async function updateProductWithDetails(
  productId: number,
  input: z.infer<typeof updateProductSchema>,
  actorUid = 'system'
): Promise<ProductDto | null> {
  const parsed = updateProductSchema.parse(input);
  const { variants: variantUpdates, nutritionJson, ...productFields } = parsed;

  const updatedRow = await db.transaction(async (tx) => {
    const updatePayload: Record<string, unknown> = {
      ...productFields,
      updatedAt: new Date(),
    };
    if (nutritionJson !== undefined) {
      updatePayload.nutritionJson = sanitizeNutritionRecord(nutritionJson);
    }

    const [updated] = await tx
      .update(products)
      .set(updatePayload)
      .where(eq(products.id, productId))
      .returning();

    if (!updated) return null;

    if (variantUpdates && variantUpdates.length > 0) {
      for (let i = 0; i < variantUpdates.length; i++) {
        const v = variantUpdates[i];
        if (v.id) {
          await tx
            .update(productVariants)
            .set({
              label: v.label,
              priceCents: v.priceCents,
              compareAtCents: v.compareAtCents ?? null,
              lowStockThreshold: v.lowStockThreshold,
              isActive: v.isActive,
              sortOrder: v.sortOrder || i + 1,
            })
            .where(eq(productVariants.id, v.id));
        } else {
          const [insertedVar] = await tx
            .insert(productVariants)
            .values({
              productId,
              sku: v.sku.trim().toUpperCase(),
              label: v.label.trim(),
              priceCents: v.priceCents,
              compareAtCents: v.compareAtCents ?? null,
              stockQty: v.stockQty ?? 0,
              reservedQty: 0,
              lowStockThreshold: v.lowStockThreshold ?? 5,
              isActive: v.isActive ?? true,
              sortOrder: v.sortOrder || i + 1,
            })
            .returning();
          if ((v.stockQty ?? 0) > 0) {
            await tx.insert(stockMovements).values({
              variantId: insertedVar.id,
              delta: v.stockQty ?? 0,
              reason: 'Added variant stock during product update',
              actorUid,
            });
          }
        }
      }
    }

    return updated;
  });

  if (!updatedRow) return null;
  return getProductById(updatedRow.id, true);
}

export async function createVariant(
  input: z.infer<typeof createVariantSchema>,
  actorUid = 'system'
): Promise<ProductVariantDto> {
  const d = createVariantSchema.parse(input);
  const created = await db.transaction(async (tx) => {
    const [variant] = await tx
      .insert(productVariants)
      .values({
        productId: d.productId,
        sku: d.sku.trim().toUpperCase(),
        label: d.label.trim(),
        priceCents: d.priceCents,
        compareAtCents: d.compareAtCents ?? null,
        stockQty: d.stockQty,
        reservedQty: 0,
        lowStockThreshold: d.lowStockThreshold,
        isActive: d.isActive,
        sortOrder: d.sortOrder,
      })
      .returning();

    if (d.stockQty > 0) {
      await tx.insert(stockMovements).values({
        variantId: variant.id,
        delta: d.stockQty,
        reason: 'Initial variant stock',
        actorUid,
      });
    }
    return variant;
  });
  return hydrateVariant(created);
}

export async function updateVariant(
  variantId: number,
  input: z.infer<typeof updateVariantSchema>
): Promise<ProductVariantDto | null> {
  const d = updateVariantSchema.parse(input);
  const [updated] = await db
    .update(productVariants)
    .set(d)
    .where(eq(productVariants.id, variantId))
    .returning();
  return updated ? hydrateVariant(updated) : null;
}

export async function adjustVariantStock(
  variantId: number,
  delta: number,
  reason: string,
  actorUid = 'system'
): Promise<ProductVariantDto> {
  const updated = await db.transaction(async (tx) => {
    const [variant] = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);
    if (!variant) {
      throw new Error('Variant not found.');
    }

    const nextStock = variant.stockQty + delta;
    if (nextStock < variant.reservedQty) {
      throw new Error(
        `Cannot reduce stock below active reservations (${variant.reservedQty}).`
      );
    }

    const [saved] = await tx
      .update(productVariants)
      .set({ stockQty: nextStock })
      .where(eq(productVariants.id, variant.id))
      .returning();

    await tx.insert(stockMovements).values({
      variantId: variant.id,
      delta,
      reason,
      actorUid,
    });

    return saved;
  });

  return hydrateVariant(updated);
}

export async function getCatalogueGroundingContext(): Promise<string> {
  const published = await listProducts({ includeDrafts: false });
  if (published.length === 0) {
    return 'No smoothie products are currently published.';
  }

  return published
    .map((p) => {
      const variants = p.variants
        .map(
          (v) =>
            `${v.label} (SKU ${v.sku}): KSh ${Math.round(v.priceCents / 100)} — ${
              v.availableQty > 0 ? `${v.availableQty} in stock` : 'Out of stock'
            }`
        )
        .join('; ');
      const nutrition = Object.entries(p.nutritionJson || {})
        .map(([k, val]) => `${k}: ${val}`)
        .join(', ');

      return [
        `- **${p.name}** (${p.flavour}, slug: /shop/${p.slug})`,
        `  Summary: ${p.shortDescription}`,
        `  Variants & KES Pricing: ${variants || 'Not priced'}`,
        p.ingredientsText ? `  Ingredients: ${p.ingredientsText}` : null,
        p.allergensText ? `  Allergens: ${p.allergensText}` : null,
        nutrition ? `  Nutrition (${p.volumeLabel || 'per serving'}): ${nutrition}` : null,
        p.shelfLife ? `  Shelf Life & Storage: ${p.shelfLife}. ${p.storageInstructions}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}
