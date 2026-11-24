import React, { useEffect, useState } from 'react';
import { Check, Heart, Minus, Plus, Star, X } from 'lucide-react';
import { ProductVisual } from './ProductVisual';
import type { Product, ProductReview } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  isWishlisted: boolean;
  onClose: () => void;
  onAddToCart: (productId: string, variantId: string, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
  onProductUpdated: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isWishlisted,
  onClose,
  onAddToCart,
  onToggleWishlist,
  onProductUpdated,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Review form state
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSelectedVariantId(product.variants[0]?.id ?? '');
    setQuantity(1);
    setActiveTab('details');
    setReviewError(null);
    setAddedFeedback(false);

    let active = true;
    setLoadingReviews(true);
    fetch(`/api/products/${encodeURIComponent(product.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingReviews(false);
      });

    return () => {
      active = false;
    };
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  if (!product) return null;

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];
  const isOutOfStock = product.stock <= 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product.id, activeVariant.id, quantity);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1600);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, rating, title, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || 'Could not submit review.');
        return;
      }
      setReviews(data.reviews);
      if (data.product) onProductUpdated(data.product);
      setAuthor('');
      setRating(5);
      setTitle('');
      setComment('');
    } catch {
      setReviewError('Network error submitting review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-zinc-950/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      onClick={onClose}
    >
      <div
        className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-5xl bg-[#FAF9F7] sm:rounded-2xl shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="sticky top-4 float-right mr-4 mt-4 z-20 w-10 h-10 rounded-lg bg-white border border-zinc-900/12 flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left Gallery */}
          <div className="aspect-[4/3] lg:aspect-auto lg:min-h-[480px] w-full overflow-hidden">
            <ProductVisual
              visualType={product.visualType}
              flavourIds={product.flavourIds}
              imageKey={product.imageKey}
              alt={product.name}
              bgTint={product.bgTint}
            />
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="uppercase tracking-wider">{product.category}</span>
                <span aria-hidden="true">·</span>
                <span>SKU {activeVariant.sku}</span>
                <span aria-hidden="true">·</span>
                <span className={product.stock > 0 ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </span>
              </div>

              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-950">
                {product.name}
              </h2>

              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-baseline gap-2 tabular-nums">
                  <span className="text-2xl font-bold text-zinc-950">
                    ${activeVariant.price.toFixed(2)}
                  </span>
                  {activeVariant.compareAtPrice && (
                    <span className="text-sm text-zinc-400 line-through">
                      ${activeVariant.compareAtPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <span className="text-zinc-300" aria-hidden="true">|</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-950 tabular-nums cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-zinc-900">{product.rating.toFixed(1)}</span>
                  <span>({product.reviewCount} reviews)</span>
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                {product.description}
              </p>

              {/* Variant Selector */}
              <div className="mt-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
                  Select Pack / Option
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const active = variant.id === activeVariant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer tabular-nums ${
                          active
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-800 border-zinc-900/15 hover:border-zinc-900/40'
                        }`}
                      >
                        {variant.label} · ${variant.price.toFixed(2)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity & Buy Actions */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center border border-zinc-900/15 bg-white rounded-lg h-11">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-10 h-full flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock || 1, q + 1))}
                    aria-label="Increase quantity"
                    className="w-10 h-full flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAdd}
                  className="flex-1 min-w-[180px] h-11 px-6 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:bg-zinc-300 transition-colors flex items-center justify-center gap-2 cursor-pointer tabular-nums"
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added to Bag
                    </>
                  ) : isOutOfStock ? (
                    'Out of Stock'
                  ) : (
                    `Add to Bag · $${(activeVariant.price * quantity).toFixed(2)}`
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                  className="w-11 h-11 rounded-lg bg-white border border-zinc-900/15 flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
                >
                  <Heart
                    className={`w-5 h-5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Secondary Details & Reviews Tabs */}
            <div className="pt-6 border-t border-zinc-900/10">
              <div className="flex items-center gap-6 border-b border-zinc-900/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'details'
                      ? 'border-zinc-950 text-zinc-950'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Ingredients & Nutrition
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer tabular-nums ${
                    activeTab === 'reviews'
                      ? 'border-zinc-950 text-zinc-950'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Customer Reviews ({reviews.length})
                </button>
              </div>

              {activeTab === 'details' ? (
                <div className="pt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      What’s Inside
                    </h4>
                    <p className="mt-1.5 text-sm text-zinc-800">
                      {product.ingredients.join(' · ')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-white border border-zinc-900/8">
                      <div className="text-xs text-zinc-500">Energy</div>
                      <div className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums">
                        {product.nutrition.calories}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-zinc-900/8">
                      <div className="text-xs text-zinc-500">Added Sugar</div>
                      <div className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums">
                        {product.nutrition.sugarAdded}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-zinc-900/8">
                      <div className="text-xs text-zinc-500">Vitamin C</div>
                      <div className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums">
                        {product.nutrition.vitaminC}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-4 space-y-5 max-h-80 overflow-y-auto pr-1">
                  {loadingReviews ? (
                    <p className="text-sm text-zinc-500">Loading reviews...</p>
                  ) : reviews.length === 0 ? (
                    <p className="text-sm text-zinc-500">No reviews yet. Be the first to review!</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="pb-4 border-b border-zinc-900/8 last:border-b-0">
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span className="font-semibold text-zinc-900">
                              {rev.author} · Verified Buyer
                            </span>
                            <span className="tabular-nums">{rev.createdAt}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < rev.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-zinc-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm font-semibold text-zinc-900">
                              {rev.title}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-600">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Write a Review Form */}
                  <form
                    onSubmit={handleReviewSubmit}
                    className="p-4 rounded-xl bg-white border border-zinc-900/10 space-y-3"
                  >
                    <h4 className="text-sm font-semibold text-zinc-900">Write a review</h4>
                    {reviewError && (
                      <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-md">
                        {reviewError}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Your name"
                        className="h-9 px-3 text-sm border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                      />
                      <select
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        aria-label="Star rating"
                        className="h-9 px-3 text-sm border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                      >
                        <option value={5}>5 Stars — Loved it</option>
                        <option value={4}>4 Stars — Really good</option>
                        <option value={3}>3 Stars — Solid</option>
                        <option value={2}>2 Stars — Okay</option>
                        <option value={1}>1 Star — Not for me</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Review headline"
                      className="w-full h-9 px-3 text-sm border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                    />
                    <textarea
                      required
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="How did it taste?"
                      className="w-full p-3 text-sm border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                    />
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:bg-zinc-400 cursor-pointer"
                    >
                      {submittingReview ? 'Posting...' : 'Post Review'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
