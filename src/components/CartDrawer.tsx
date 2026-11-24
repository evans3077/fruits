import React, { useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { ProductVisual } from './ProductVisual';
import type { CartItem, Product } from '../types';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  products: Product[];
  promoCode: string | null;
  promoDiscount: number;
  promoMessage: string;
  freeShippingThreshold: number;
  onClose: () => void;
  onUpdateQty: (productId: string, variantId: string, qty: number) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onApplyPromo: (code: string, subtotal: number) => Promise<void>;
  onClearPromo: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  items,
  products,
  promoCode,
  promoDiscount,
  promoMessage,
  freeShippingThreshold,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onApplyPromo,
  onClearPromo,
  onProceedToCheckout,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resolvedRows = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const variant = product.variants.find((v) => v.id === item.variantId) ?? product.variants[0];
      return {
        item,
        product,
        variant,
        lineTotal: Math.round(variant.price * item.quantity * 100) / 100,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const subtotal =
    Math.round(resolvedRows.reduce((sum, r) => sum + r.lineTotal, 0) * 100) / 100;
  const effectiveDiscount = Math.min(subtotal, promoDiscount);
  const afterDiscount = Math.max(0, Math.round((subtotal - effectiveDiscount) * 100) / 100);
  const qualifiesFreeShipping =
    afterDiscount >= freeShippingThreshold || promoCode === 'FREESHIP';
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - afterDiscount);
  const shippingFee = resolvedRows.length === 0 ? 0 : qualifiesFreeShipping ? 0 : 5.9;
  const total = Math.round((afterDiscount + shippingFee) * 100) / 100;

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    if (!codeInput.trim()) return;
    setApplyingPromo(true);
    try {
      await onApplyPromo(codeInput.trim(), subtotal);
      setCodeInput('');
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Invalid promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-md h-full bg-[#FAF9F7] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-900/10 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-zinc-900" aria-hidden="true" />
            <h2 className="text-lg font-bold text-zinc-950 tabular-nums">
              Your Bag ({resolvedRows.reduce((s, r) => s + r.item.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bag"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Bar */}
        {resolvedRows.length > 0 && (
          <div className="px-6 py-3 bg-white border-b border-zinc-900/8">
            <div className="text-xs font-medium text-zinc-700 tabular-nums">
              {qualifiesFreeShipping
                ? 'Unlocked: Free chilled insulated delivery'
                : `Add $${remainingForFreeShipping.toFixed(2)} more for free chilled delivery`}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
              <div
                className="h-full bg-zinc-900 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    qualifiesFreeShipping ? 100 : (afterDiscount / freeShippingThreshold) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {resolvedRows.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900/5 flex items-center justify-center text-zinc-400">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <p className="mt-4 text-base font-semibold text-zinc-900">Your bag is empty</p>
              <p className="mt-1 text-sm text-zinc-500 max-w-xs">
                Explore Berry, Kiwi, Banana, and Strawberry smoothies or start with our Signature 4-Pack.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                Browse Smoothies
              </button>
            </div>
          ) : (
            resolvedRows.map(({ item, product, variant, lineTotal }) => (
              <div
                key={`${product.id}-${variant.id}`}
                className="p-3.5 rounded-xl bg-white border border-zinc-900/10 flex gap-3.5"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                  <ProductVisual
                    visualType={product.visualType}
                    flavourIds={product.flavourIds}
                    imageKey={product.imageKey}
                    alt={product.name}
                    bgTint={product.bgTint}
                    compact
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-950 truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {variant.label} · ${variant.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(product.id, variant.id)}
                      aria-label={`Remove ${product.name}`}
                      className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center border border-zinc-900/12 rounded-md h-8">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQty(product.id, variant.id, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                        className="w-8 h-full flex items-center justify-center text-zinc-600 hover:text-zinc-950 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-xs font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQty(product.id, variant.id, item.quantity + 1)
                        }
                        aria-label="Increase quantity"
                        className="w-8 h-full flex items-center justify-center text-zinc-600 hover:text-zinc-950 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-sm font-semibold text-zinc-950 tabular-nums">
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Totals & Promo */}
        {resolvedRows.length > 0 && (
          <div className="px-6 py-5 bg-white border-t border-zinc-900/10 space-y-4">
            {/* Promo Code */}
            <div>
              {promoCode ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <span className="font-medium">{promoMessage || `Code ${promoCode} active`}</span>
                  <button
                    type="button"
                    onClick={onClearPromo}
                    className="font-semibold underline ml-2 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePromoSubmit} className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder="Promo code (e.g. BLENDY10)"
                      aria-label="Promo code"
                      className="flex-1 h-9 px-3 text-xs border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900 uppercase"
                    />
                    <button
                      type="submit"
                      disabled={applyingPromo}
                      className="px-4 h-9 text-xs font-semibold bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="text-xs text-red-600">{promoError}</p>}
                  <p className="text-[11px] text-zinc-400">
                    Test codes: BLENDY10 (10% off), FRESH5 ($5 off $25+), FREESHIP
                  </p>
                </form>
              )}
            </div>

            {/* Summary */}
            <div className="space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {effectiveDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({promoCode})</span>
                  <span>−${effectiveDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <span>Chilled Delivery</span>
                <span>{shippingFee === 0 ? 'Free' : `$${shippingFee.toFixed(2)}`}</span>
              </div>
              <div className="pt-2 border-t border-zinc-900/10 flex justify-between text-base font-bold text-zinc-950">
                <span>Estimated Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full h-12 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
