import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatKsh } from '../lib/kenya';
import { trackStoreEvent } from '../services/analytics';
import { ProductVisual } from './ProductVisual';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    cartDrawerOpen,
    setCartDrawerOpen,
    cartItems,
    cartQuote,
    cartSyncing,
    updateCartQty,
    removeFromCart,
    products,
  } = useStore();

  useEffect(() => {
    if (cartDrawerOpen) {
      trackStoreEvent('view_cart', {
        value: cartQuote ? cartQuote.subtotalCents / 100 : 0,
      });
    }
  }, [cartDrawerOpen, cartQuote]);

  useEffect(() => {
    if (!cartDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCartDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cartDrawerOpen, setCartDrawerOpen]);

  if (!cartDrawerOpen) return null;

  const lines = cartQuote?.lines ?? [];
  const hasItems = cartItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-zinc-950/50 backdrop-blur-[2px]"
        onClick={() => setCartDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag"
        className="relative z-10 w-full max-w-md bg-[#FAF9F7] h-full flex flex-col shadow-2xl border-l border-zinc-200"
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-zinc-900" />
            <h2 className="text-lg font-semibold text-zinc-900">Your Shopping Bag</h2>
          </div>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(false)}
            aria-label="Close shopping bag"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {!hasItems && (
            <div className="py-16 text-center space-y-4">
              <p className="text-base font-medium text-zinc-900">Your shopping bag is empty</p>
              <p className="text-sm text-zinc-600">
                Browse published smoothie flavours and select a bottle or pack size to begin.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/shop');
                }}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 cursor-pointer"
              >
                Browse Shop
              </button>
            </div>
          )}

          {cartQuote && cartQuote.issues.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
              {cartQuote.issues.map((issue, idx) => (
                <p key={idx}>{issue}</p>
              ))}
            </div>
          )}

          {lines.map((line) => (
            <div
              key={line.variantId}
              className="flex gap-4 bg-white p-3.5 rounded-xl border border-zinc-200/80"
            >
              <div className="w-20 h-24 rounded-lg overflow-hidden shrink-0">
                <ProductVisual
                  heroSpecKey={line.heroSpecKey}
                  imageUrl={line.imageUrl}
                  alt={line.productName}
                  bgTint={line.bgTint}
                  compact
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 truncate">
                      {line.productName}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeFromCart(line.variantId)}
                      aria-label={`Remove ${line.productName}`}
                      className="text-zinc-400 hover:text-red-600 p-1 -mr-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{line.variantLabel}</p>
                  <p className="text-sm font-medium text-zinc-900 tabular-nums mt-1">
                    {formatKsh(line.unitPriceCents)}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="inline-flex items-center border border-zinc-300 rounded-lg bg-white">
                    <button
                      type="button"
                      onClick={() => updateCartQty(line.variantId, line.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-semibold tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQty(
                          line.variantId,
                          Math.min(line.availableQty, line.quantity + 1)
                        )
                      }
                      aria-label="Increase quantity"
                      disabled={line.quantity >= line.availableQty}
                      className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                    {formatKsh(line.lineTotalCents)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Fallback display while quote loads or if an item became draft/unavailable */}
          {hasItems && lines.length === 0 && !cartSyncing && (
            <div className="space-y-2">
              {cartItems.map((item) => {
                const p = products.find((prod) => prod.id === item.productId);
                return (
                  <div
                    key={item.variantId}
                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-zinc-200 text-sm"
                  >
                    <span className="text-zinc-700">
                      {p?.name || `Item #${item.productId}`} (×{item.quantity})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.variantId)}
                      className="text-xs text-red-600 font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {hasItems && (
          <div className="p-6 bg-white border-t border-zinc-200 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-700">
                <span>Items Subtotal</span>
                <span className="font-semibold text-zinc-950 tabular-nums">
                  {cartSyncing
                    ? 'Calculating...'
                    : formatKsh(cartQuote?.subtotalCents ?? 0)}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Delivery fees or pickup collection selection are calculated at checkout.
              </p>
            </div>

            <button
              type="button"
              disabled={!cartQuote || cartQuote.lines.length === 0 || cartQuote.issues.length > 0}
              onClick={() => {
                setCartDrawerOpen(false);
                navigate('/checkout');
              }}
              className="w-full py-3.5 px-5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
