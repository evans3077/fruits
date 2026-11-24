import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Box, Image, Minus, Plus } from 'lucide-react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { ProductCard } from '../components/ProductCard';
import { ProductVisual } from '../components/ProductVisual';
import { BlendyBottleScene } from '../components/three/BlendyBottleScene';
import { useStore } from '../context/StoreContext';
import { formatKsh } from '../lib/kenya';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { trackStoreEvent } from '../services/analytics';
import type { ProductDto } from '../types';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { authFetch, addToCart, testimonials } = useStore();

  const [product, setProduct] = useState<ProductDto | null>(null);
  const [related, setRelated] = useState<ProductDto[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta(
    product ? product.seoTitle || `${product.name} — Blendy` : 'Product — Blendy Kenya',
    product?.seoDescription || product?.shortDescription || 'Blendy real fruit smoothie.'
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/products/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Product not found.' : 'Unable to load product.');
        }
        const data = await res.json();
        if (!active) return;
        const p = data.product as ProductDto;
        setProduct(p);
        setRelated(Array.isArray(data.related) ? data.related : []);
        const firstActive = p.variants.find((v) => v.isActive && v.priceCents > 0) ?? p.variants[0];
        setSelectedVariantId(firstActive ? firstActive.id : null);
        setQuantity(1);
        trackStoreEvent('view_item', {
          items: [{ item_id: p.id, item_name: p.name }],
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load product.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [slug, authFetch]);

  const selectedVariant =
    product?.variants.find((v) => v.id === selectedVariantId) ?? product?.variants[0] ?? null;

  const canOrder =
    Boolean(product && product.status === 'published') &&
    Boolean(selectedVariant && selectedVariant.isActive && selectedVariant.priceCents > 0) &&
    (selectedVariant?.availableQty ?? 0) > 0;

  const nutritionEntries = Object.entries(product?.nutritionJson ?? {}).filter(
    ([k, v]) => k.trim() && String(v).trim()
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <div className="mb-6">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shop</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="aspect-[4/5] rounded-3xl bg-zinc-200/70 animate-pulse" />
            <div className="space-y-4 py-4">
              <div className="h-8 w-2/3 bg-zinc-200 rounded animate-pulse" />
              <div className="h-24 w-full bg-zinc-200 rounded animate-pulse" />
            </div>
          </div>
        ) : error || !product ? (
          <div className="rounded-2xl bg-white border border-zinc-200 p-10 text-center space-y-4">
            <h1 className="text-2xl font-bold text-zinc-950">{error || 'Product not found'}</h1>
            <Link
              to="/shop"
              className="inline-flex px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
            >
              Return to Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              {/* Visual Column */}
              <div className="lg:col-span-6 space-y-3">
                <div className="aspect-[4/5] rounded-3xl overflow-hidden border border-zinc-200/80 bg-white relative">
                  {viewMode === '3d' ? (
                    <BlendyBottleScene
                      flavourName={product.flavour}
                      heroSpecKey={product.heroSpecKey}
                      bgTint={product.bgTint}
                      sizeLabel={selectedVariant?.label || '330ml Bottle'}
                      nutritionJson={product.nutritionJson}
                      compact
                    />
                  ) : (
                    <ProductVisual
                      heroSpecKey={product.heroSpecKey}
                      imageUrl={product.imageUrl}
                      alt={product.imageAlt || product.name}
                      bgTint={product.bgTint}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewMode('2d')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === '2d'
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <Image className="w-3.5 h-3.5" />
                      <span>2D Artwork</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('3d')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === '3d'
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>3D Bottle ({selectedVariant?.label.replace(/\s+Bottle/i, '') || '330ml'})</span>
                    </button>
                  </div>

                  <Link
                    to="/studio"
                    className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 underline underline-offset-4"
                  >
                    Open Full 3D Studio
                  </Link>
                </div>
              </div>

              {/* Details & Purchase Column */}
              <div className="lg:col-span-6 space-y-6">
                {product.status !== 'published' && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-950">
                    Draft preview — this product is not yet published to public shoppers.
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    {[product.category, product.flavour, product.volumeLabel]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
                    {product.name}
                  </h1>
                </div>

                <div className="flex items-baseline gap-3">
                  {selectedVariant && selectedVariant.priceCents > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-zinc-950 tabular-nums">
                        {formatKsh(selectedVariant.priceCents)}
                      </p>
                      {selectedVariant.compareAtCents &&
                        selectedVariant.compareAtCents > selectedVariant.priceCents && (
                          <p className="text-base text-zinc-400 line-through tabular-nums">
                            {formatKsh(selectedVariant.compareAtCents)}
                          </p>
                        )}
                    </>
                  ) : (
                    <p className="text-base font-medium text-zinc-500">
                      Pricing pending store owner configuration
                    </p>
                  )}
                </div>

                {(product.description || product.shortDescription) && (
                  <p className="text-sm sm:text-base text-zinc-700 leading-relaxed whitespace-pre-line">
                    {product.description || product.shortDescription}
                  </p>
                )}

                {/* Variant Selector */}
                {product.variants.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Size / Pack Option
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {product.variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSelectedVariantId(v.id);
                              setQuantity(1);
                            }}
                            className={`px-4 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-zinc-950 bg-zinc-950 text-white'
                                : 'border-zinc-300 bg-white text-zinc-900 hover:border-zinc-900'
                            }`}
                          >
                            <span className="block text-sm font-semibold">{v.label}</span>
                            <span
                              className={`block text-xs tabular-nums ${
                                isSelected ? 'text-zinc-300' : 'text-zinc-500'
                              }`}
                            >
                              {v.priceCents > 0 ? formatKsh(v.priceCents) : 'Unpriced'} ·{' '}
                              {v.availableQty > 0 ? `${v.availableQty} left` : 'Out of stock'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity & Add Actions */}
                <div className="pt-2 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center border border-zinc-300 rounded-xl bg-white">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                        className="w-11 h-11 flex items-center justify-center text-zinc-800 hover:bg-zinc-100 rounded-l-xl cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center text-sm font-semibold tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) =>
                            Math.min(Math.max(1, selectedVariant?.availableQty ?? 1), q + 1)
                          )
                        }
                        aria-label="Increase quantity"
                        disabled={!selectedVariant || quantity >= selectedVariant.availableQty}
                        className="w-11 h-11 flex items-center justify-center text-zinc-800 hover:bg-zinc-100 rounded-r-xl disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!canOrder || !selectedVariant}
                      onClick={() => {
                        if (!selectedVariant) return;
                        addToCart(
                          {
                            productId: product.id,
                            variantId: selectedVariant.id,
                            quantity,
                          },
                          {
                            name: product.name,
                            variantLabel: selectedVariant.label,
                            priceCents: selectedVariant.priceCents,
                          }
                        );
                      }}
                      className="flex-1 min-w-[180px] py-3.5 px-6 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-45 cursor-pointer"
                    >
                      {!selectedVariant || selectedVariant.priceCents <= 0
                        ? 'Pricing Not Configured'
                        : selectedVariant.availableQty <= 0
                          ? 'Out of Stock'
                          : product.status !== 'published'
                            ? 'Draft Only'
                            : 'Add to Bag'}
                    </button>

                    {canOrder && selectedVariant && (
                      <button
                        type="button"
                        onClick={() => {
                          addToCart(
                            {
                              productId: product.id,
                              variantId: selectedVariant.id,
                              quantity,
                            },
                            {
                              name: product.name,
                              variantLabel: selectedVariant.label,
                              priceCents: selectedVariant.priceCents,
                            }
                          );
                          navigate('/checkout');
                        }}
                        className="py-3.5 px-5 rounded-xl border border-zinc-900 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        Checkout
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500">
                    Delivery fees and pickup collection options are calculated on checkout.{' '}
                    <Link to="/delivery" className="underline hover:text-zinc-900">
                      Check delivery coverage
                    </Link>
                  </p>
                </div>

                {/* Conditional Verified Details (Only rendered when non-empty in DB) */}
                {(product.ingredientsText ||
                  product.allergensText ||
                  product.storageInstructions ||
                  product.shelfLife ||
                  nutritionEntries.length > 0) && (
                  <div className="border-t border-zinc-200 pt-6 space-y-4 text-sm">
                    {product.ingredientsText && (
                      <div>
                        <h2 className="font-semibold text-zinc-950">Ingredients</h2>
                        <p className="text-zinc-700 mt-1">{product.ingredientsText}</p>
                      </div>
                    )}
                    {product.allergensText && (
                      <div>
                        <h2 className="font-semibold text-zinc-950">Allergens</h2>
                        <p className="text-zinc-700 mt-1">{product.allergensText}</p>
                      </div>
                    )}
                    {product.storageInstructions && (
                      <div>
                        <h2 className="font-semibold text-zinc-950">Storage</h2>
                        <p className="text-zinc-700 mt-1">{product.storageInstructions}</p>
                      </div>
                    )}
                    {product.shelfLife && (
                      <div>
                        <h2 className="font-semibold text-zinc-950">Shelf Life</h2>
                        <p className="text-zinc-700 mt-1">{product.shelfLife}</p>
                      </div>
                    )}
                    {nutritionEntries.length > 0 && (
                      <div>
                        <h2 className="font-semibold text-zinc-950 mb-2">Nutrition Information</h2>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 border border-zinc-200 rounded-xl p-4 bg-white">
                          {nutritionEntries.map(([key, val]) => (
                            <React.Fragment key={key}>
                              <dt className="text-zinc-600">{key}</dt>
                              <dd className="font-medium text-zinc-950 text-right">{val}</dd>
                            </React.Fragment>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Reviews */}
            {testimonials.some((t) => t.productId === product.id) && (
              <section className="border-t border-zinc-200 pt-12">
                <h2 className="text-2xl font-bold text-zinc-950 mb-6">Customer Reviews</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {testimonials
                    .filter((t) => t.productId === product.id)
                    .map((review) => (
                      <blockquote
                        key={review.id}
                        className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-3"
                      >
                        <p className="text-sm text-zinc-800 leading-relaxed">“{review.quote}”</p>
                        <footer className="text-xs font-medium text-zinc-500">
                          {review.authorName}
                          {review.locationLabel ? ` · ${review.locationLabel}` : ''}
                        </footer>
                      </blockquote>
                    ))}
                </div>
              </section>
            )}

            {/* Related Products */}
            {related.length > 0 && (
              <section className="border-t border-zinc-200 pt-12">
                <h2 className="text-2xl font-bold text-zinc-950 mb-6">More from Blendy</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {related.map((r) => (
                    <ProductCard key={r.id} product={r} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
