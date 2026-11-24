import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, PackageCheck, Truck, X } from 'lucide-react';
import type { AuthUser, CartItem, Order, Product } from '../types';

interface CheckoutModalProps {
  open: boolean;
  items: CartItem[];
  products: Product[];
  promoCode: string | null;
  promoDiscount: number;
  freeShippingThreshold: number;
  user: AuthUser | null;
  authToken: string | null;
  onClose: () => void;
  onOrderConfirmed: (order: Order, updatedProducts: Product[]) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  items,
  products,
  promoCode,
  promoDiscount,
  freeShippingThreshold,
  user,
  authToken,
  onClose,
  onOrderConfirmed,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (user) {
      setFullName((prev) => prev || user.name);
      setEmail((prev) => prev || user.email);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;

  const handleClose = () => {
    setConfirmedOrder(null);
    setError(null);
    onClose();
  };

  const fillTestDetails = () => {
    setFullName(user?.name || 'Alex Rivera');
    setEmail(user?.email || 'alex.rivera@example.com');
    setPhone('555-0148-220');
    setAddress('742 Orchard Terrace, Apt 4B');
    setCity('Portland');
    setPostalCode('97205');
  };

  const resolvedRows = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const variant = product.variants.find((v) => v.id === item.variantId) ?? product.variants[0];
      return {
        product,
        variant,
        quantity: item.quantity,
        lineTotal: Math.round(variant.price * item.quantity * 100) / 100,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const subtotal =
    Math.round(resolvedRows.reduce((sum, r) => sum + r.lineTotal, 0) * 100) / 100;
  const discount = Math.min(subtotal, promoDiscount);
  const afterDiscount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const shippingFee =
    deliveryMethod === 'express'
      ? 9.9
      : promoCode === 'FREESHIP' || afterDiscount >= freeShippingThreshold
        ? 0
        : 5.9;
  const total = Math.round((afterDiscount + shippingFee) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items,
          promoCode,
          paymentMethod,
          shipping: {
            fullName,
            email,
            phone,
            address,
            city,
            postalCode,
            deliveryMethod,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not place order.');
        return;
      }
      setConfirmedOrder(data.order);
      onOrderConfirmed(data.order, data.products);
    } catch {
      setError('Network error while submitting order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-zinc-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
      onClick={handleClose}
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[92vh] max-w-4xl bg-[#FAF9F7] sm:rounded-2xl shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 bg-white border-b border-zinc-900/10 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-bold text-zinc-950">
            {confirmedOrder ? `Order ${confirmedOrder.orderNumber} Confirmed` : 'Checkout'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close checkout"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedOrder ? (
          <div className="p-6 sm:p-10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-zinc-900/10">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-800">
                  {confirmedOrder.status} · Preparing Chilled Shipment
                </p>
                <h3 className="text-2xl font-bold text-zinc-950">
                  Thank you, {confirmedOrder.shipping.fullName}
                </h3>
                <p className="text-sm text-zinc-600">
                  Receipt for order <span className="font-semibold text-zinc-900">{confirmedOrder.orderNumber}</span> · Estimated arrival: {confirmedOrder.estimatedDelivery}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-white border border-zinc-900/10 space-y-2 text-sm">
                <h4 className="font-semibold text-zinc-950">Delivery Details</h4>
                <p className="text-zinc-600">{confirmedOrder.shipping.fullName}</p>
                <p className="text-zinc-600">{confirmedOrder.shipping.address}</p>
                <p className="text-zinc-600">
                  {confirmedOrder.shipping.city}, {confirmedOrder.shipping.postalCode}
                </p>
                <p className="text-zinc-600">
                  {confirmedOrder.shipping.email} · {confirmedOrder.shipping.phone}
                </p>
                <p className="pt-2 text-xs text-zinc-500">
                  Payment: {confirmedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Test Card'}
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-zinc-900/10 space-y-2.5 text-sm tabular-nums">
                <h4 className="font-semibold text-zinc-950">Order Receipt</h4>
                {confirmedOrder.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex justify-between text-zinc-700"
                  >
                    <span>
                      {item.quantity}× {item.productName} ({item.variantLabel})
                    </span>
                    <span>${item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-zinc-900/10 space-y-1">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal</span>
                    <span>${confirmedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {confirmedOrder.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({confirmedOrder.promoCode})</span>
                      <span>−${confirmedOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-600">
                    <span>Shipping</span>
                    <span>
                      {confirmedOrder.shippingFee === 0
                        ? 'Free'
                        : `$${confirmedOrder.shippingFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-zinc-900/10 flex justify-between text-base font-bold text-zinc-950">
                    <span>Total Paid</span>
                    <span>${confirmedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Fields */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-950">1. Shipping Information</h3>
                <button
                  type="button"
                  onClick={fillTestDetails}
                  className="text-xs font-medium text-zinc-700 underline hover:text-zinc-950 cursor-pointer"
                >
                  Fill Test Address
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full h-10 px-3 text-sm bg-white border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full h-10 px-3 text-sm bg-white border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="555-0148-220"
                    className="w-full h-10 px-3 text-sm bg-white border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="97205"
                    className="w-full h-10 px-3 text-sm bg-white border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="742 Orchard Terrace, Apt 4B"
                    className="w-full h-10 px-3 text-sm bg-white border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Portland"
                    className="w-full h-10 px-3 text-sm bg-white border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              {/* Delivery Speed */}
              <div className="pt-2 space-y-3">
                <h3 className="text-base font-semibold text-zinc-950">2. Chilled Delivery</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('standard')}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      deliveryMethod === 'standard'
                        ? 'bg-white border-zinc-900 ring-1 ring-zinc-900'
                        : 'bg-white border-zinc-900/12 hover:border-zinc-900/35'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm font-semibold text-zinc-950">
                      <span className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Standard Chilled
                      </span>
                      <span className="tabular-nums">
                        {promoCode === 'FREESHIP' || afterDiscount >= freeShippingThreshold
                          ? 'Free'
                          : '$5.90'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">2–3 business days with ice packs</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('express')}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      deliveryMethod === 'express'
                        ? 'bg-white border-zinc-900 ring-1 ring-zinc-900'
                        : 'bg-white border-zinc-900/12 hover:border-zinc-900/35'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm font-semibold text-zinc-950">
                      <span className="flex items-center gap-2">
                        <PackageCheck className="w-4 h-4" />
                        Express Same-Day
                      </span>
                      <span className="tabular-nums">$9.90</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">Cold courier by 7:00 PM today</p>
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div className="pt-2 space-y-3">
                <h3 className="text-base font-semibold text-zinc-950">3. Payment Method</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-white border-zinc-900 ring-1 ring-zinc-900'
                        : 'bg-white border-zinc-900/12 hover:border-zinc-900/35'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                      <CreditCard className="w-4 h-4" />
                      Test Payment Card
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">Simulated instant test checkout</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      paymentMethod === 'cod'
                        ? 'bg-white border-zinc-900 ring-1 ring-zinc-900'
                        : 'bg-white border-zinc-900/12 hover:border-zinc-900/35'
                    }`}
                  >
                    <div className="text-sm font-semibold text-zinc-950">Cash on Delivery</div>
                    <p className="mt-1 text-xs text-zinc-500">Pay the courier upon arrival</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-xl bg-white border border-zinc-900/10 space-y-4 sticky top-24">
                <h3 className="text-base font-semibold text-zinc-950">Order Summary</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {resolvedRows.map(({ product, variant, quantity, lineTotal }) => (
                    <div
                      key={`${product.id}-${variant.id}`}
                      className="flex justify-between gap-3 text-sm tabular-nums"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 truncate">
                          {quantity}× {product.name}
                        </p>
                        <p className="text-xs text-zinc-500">{variant.label}</p>
                      </div>
                      <span className="font-medium text-zinc-900 shrink-0">
                        ${lineTotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-zinc-900/10 space-y-2 text-sm tabular-nums">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({promoCode})</span>
                      <span>−${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-600">
                    <span>Delivery</span>
                    <span>{shippingFee === 0 ? 'Free' : `$${shippingFee.toFixed(2)}`}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-900/10 flex justify-between text-base font-bold text-zinc-950">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || resolvedRows.length === 0}
                  className="w-full h-12 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:bg-zinc-400 transition-colors cursor-pointer tabular-nums"
                >
                  {submitting ? 'Confirming Order...' : `Place Order · $${total.toFixed(2)}`}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
