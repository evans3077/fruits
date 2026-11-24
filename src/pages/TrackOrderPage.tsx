import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useStore } from '../context/StoreContext';
import { formatKsh, formatNairobiDateTime } from '../lib/kenya';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { trackStoreEvent } from '../services/analytics';
import type { OrderSummaryDto, PaymentProviderInfo } from '../types';

export const TrackOrderPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { authFetch, showToast } = useStore();

  const [refInput, setRefInput] = useState(() => searchParams.get('ref') || '');
  const [tokenInput, setTokenInput] = useState(() => searchParams.get('token') || '');

  const [order, setOrder] = useState<OrderSummaryDto | null>(null);
  const [providerInfo, setProviderInfo] = useState<PaymentProviderInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryPhone, setRetryPhone] = useState('');

  useDocumentMeta(
    order ? `Order ${order.orderRef} — Blendy` : 'Track Order — Blendy Kenya',
    'Check real-time Blendy order payment verification and delivery progress.'
  );

  const loadOrder = useCallback(
    async (orderRef: string, token: string) => {
      const cleanRef = orderRef.trim().toUpperCase();
      if (!cleanRef) return;
      setLoading(true);
      setError(null);
      try {
        const qs = token.trim() ? `?token=${encodeURIComponent(token.trim())}` : '';
        const res = await authFetch(`/api/orders/${encodeURIComponent(cleanRef)}/status${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Could not retrieve order.');
        }
        setOrder(data.order);
        if (data.paymentProvider) setProviderInfo(data.paymentProvider);
        if (data.order?.payerPhone && !retryPhone) {
          setRetryPhone(data.order.payerPhone);
        }
      } catch (err) {
        setOrder(null);
        setError(err instanceof Error ? err.message : 'Unable to find order.');
      } finally {
        setLoading(false);
      }
    },
    [authFetch, retryPhone]
  );

  // Initial load from URL query params
  useEffect(() => {
    const qRef = searchParams.get('ref');
    const qToken = searchParams.get('token') || '';
    if (qRef) {
      loadOrder(qRef, qToken);
    }
  }, [searchParams, loadOrder]);

  // Fire purchase event ONLY when paymentStatus === 'paid'
  useEffect(() => {
    if (order && order.paymentStatus === 'paid') {
      trackStoreEvent('purchase', {
        transaction_id: order.orderRef,
        value: order.totalCents / 100,
      });
    }
  }, [order]);

  const handleCheckPaymentStatus = useCallback(async () => {
    if (!order) return;
    setCheckingPayment(true);
    try {
      const res = await authFetch(
        `/api/orders/${encodeURIComponent(order.orderRef)}/check-payment`,
        {
          method: 'POST',
          body: JSON.stringify({ token: tokenInput.trim() }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not verify payment status.');
      setOrder(data.order);
      if (data.order?.paymentStatus === 'paid') {
        showToast('M-Pesa payment confirmed!', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Status check failed.', 'error');
    } finally {
      setCheckingPayment(false);
    }
  }, [order, authFetch, tokenInput, showToast]);

  // Gentle polling while awaiting IntaSend STK confirmation
  useEffect(() => {
    if (
      !order ||
      order.paymentStatus !== 'pending_confirmation' ||
      providerInfo?.provider !== 'intasend'
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      handleCheckPaymentStatus();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [order, providerInfo?.provider, handleCheckPaymentStatus]);

  const handleSimulateOutcome = async (outcome: 'COMPLETE' | 'FAILED' | 'CANCELED') => {
    if (!order) return;
    setCheckingPayment(true);
    try {
      const res = await authFetch('/api/payments/sandbox-simulate', {
        method: 'POST',
        body: JSON.stringify({
          orderRef: order.orderRef,
          token: tokenInput.trim(),
          outcome,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Simulation failed.');
      setOrder(data.order);
      showToast(`Simulated outcome: ${outcome}`, outcome === 'COMPLETE' ? 'success' : 'neutral');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Simulation failed.', 'error');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleRetryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setRetrying(true);
    try {
      const res = await authFetch(
        `/api/orders/${encodeURIComponent(order.orderRef)}/retry-payment`,
        {
          method: 'POST',
          body: JSON.stringify({
            token: tokenInput.trim(),
            payerPhone: retryPhone.trim(),
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not retry M-Pesa prompt.');
      setOrder(data.order);
      if (data.paymentProvider) setProviderInfo(data.paymentProvider);
      showToast('New M-Pesa prompt initiated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Retry failed.', 'error');
    } finally {
      setRetrying(false);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (refInput.trim()) next.set('ref', refInput.trim().toUpperCase());
    if (tokenInput.trim()) next.set('token', tokenInput.trim());
    setSearchParams(next);
  };

  const latestTx = order?.transactions?.[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-8">
        <div className="border-b border-zinc-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Order Tracking &amp; Verification
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 mt-1">
            {order ? `Order ${order.orderRef}` : 'Track Your Blendy Order'}
          </h1>
        </div>

        {/* Manual Lookup Form (always accessible when no order loaded or switching orders) */}
        <form
          onSubmit={handleLookupSubmit}
          className="rounded-2xl bg-white border border-zinc-200 p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
        >
          <div className="sm:col-span-4 space-y-1">
            <label htmlFor="tr-ref" className="text-xs font-medium text-zinc-700">
              Order Reference
            </label>
            <input
              id="tr-ref"
              type="text"
              required
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="BL-XXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm uppercase focus:outline-none focus:border-zinc-950"
            />
          </div>
          <div className="sm:col-span-5 space-y-1">
            <label htmlFor="tr-token" className="text-xs font-medium text-zinc-700">
              Verification Token (not needed if signed in as owner)
            </label>
            <input
              id="tr-token"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste token from checkout link"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-3 py-2.5 px-4 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 cursor-pointer"
          >
            {loading ? 'Loading...' : 'Look Up Order'}
          </button>
        </form>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
            {error}
          </div>
        )}

        {order && (
          <div className="space-y-6">
            {/* Payment & Verification Status Banner */}
            {order.paymentStatus === 'paid' && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-emerald-950">Payment Confirmed</h2>
                  <p className="text-sm text-emerald-900">
                    Your payment of <strong className="tabular-nums">{formatKsh(order.totalCents)}</strong> has been verified.
                    {latestTx?.mpesaReceipt ? ` Reference: ${latestTx.mpesaReceipt}.` : ''}
                  </p>
                </div>
              </div>
            )}

            {order.paymentStatus === 'pending_confirmation' && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-6 h-6 text-amber-800 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-amber-950">
                      Check your phone to complete M-Pesa payment
                    </h2>
                    <p className="text-sm text-amber-900">
                      A prompt was sent to <strong>{order.payerPhone}</strong> for{' '}
                      <strong className="tabular-nums">{formatKsh(order.totalCents)}</strong>. This
                      order will only move to paid after our server receives provider confirmation.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={checkingPayment}
                    onClick={handleCheckPaymentStatus}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{checkingPayment ? 'Checking...' : 'Check Payment Status'}</span>
                  </button>
                </div>

                {/* Non-Live Simulator Controls (Strictly shown ONLY when dev simulator is active) */}
                {providerInfo?.provider === 'sandbox_sim' &&
                  latestTx?.provider === 'sandbox_sim' && (
                    <div className="border-t border-amber-200 pt-4 space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                        Non-Live Development Simulator Controls
                      </p>
                      <p className="text-xs text-amber-900">
                        No IntaSend API keys are configured in this environment. Choose a simulated
                        callback outcome to test order confirmation or stock release:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={checkingPayment}
                          onClick={() => handleSimulateOutcome('COMPLETE')}
                          className="px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                        >
                          Simulate Paid (COMPLETE)
                        </button>
                        <button
                          type="button"
                          disabled={checkingPayment}
                          onClick={() => handleSimulateOutcome('FAILED')}
                          className="px-3.5 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 cursor-pointer"
                        >
                          Simulate Failed
                        </button>
                        <button
                          type="button"
                          disabled={checkingPayment}
                          onClick={() => handleSimulateOutcome('CANCELED')}
                          className="px-3.5 py-2 rounded-lg border border-amber-700 text-amber-950 text-xs font-semibold hover:bg-amber-100 cursor-pointer"
                        >
                          Simulate Cancelled
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {(order.paymentStatus === 'failed' || order.paymentStatus === 'cancelled') && (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-red-950">
                      Payment {order.paymentStatus === 'cancelled' ? 'Cancelled' : 'Failed'}
                    </h2>
                    <p className="text-sm text-red-900">
                      {latestTx?.failureReason ||
                        'The M-Pesa transaction did not complete. Reserved stock has been released.'}
                    </p>
                  </div>
                </div>

                {(order.paymentMethod === 'mpesa_intasend' ||
                  order.paymentMethod === 'mpesa_sandbox_sim') && (
                  <form onSubmit={handleRetryPayment} className="flex flex-wrap gap-2.5 pt-2">
                    <input
                      type="tel"
                      value={retryPhone}
                      onChange={(e) => setRetryPhone(e.target.value)}
                      placeholder="0712 345 678"
                      aria-label="M-Pesa number for retry"
                      className="px-3.5 py-2 rounded-xl border border-red-300 bg-white text-sm"
                    />
                    <button
                      type="submit"
                      disabled={retrying}
                      className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
                    >
                      {retrying ? 'Sending Prompt...' : 'Retry M-Pesa Payment'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Order Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-3 text-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Order Status
                </h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-zinc-600">Placed</dt>
                    <dd className="font-medium text-zinc-950">
                      {formatNairobiDateTime(order.createdAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-600">Payment Status</dt>
                    <dd className="font-semibold text-zinc-950 capitalize">
                      {order.paymentStatus.replace(/_/g, ' ')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-600">Fulfilment Status</dt>
                    <dd className="font-semibold text-zinc-950 capitalize">
                      {order.fulfilmentStatus.replace(/_/g, ' ')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-600">Payment Method</dt>
                    <dd className="font-medium text-zinc-950">{order.paymentMethod}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-3 text-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {order.fulfilmentType === 'delivery' ? 'Delivery Details' : 'Pickup Collection'}
                </h3>
                <p className="font-semibold text-zinc-950">{order.customerName}</p>
                <p className="text-zinc-600">{order.customerPhone}</p>
                {order.fulfilmentType === 'delivery' && (
                  <p className="text-zinc-700">
                    {[order.estate, order.building, order.town, order.county]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {order.landmark && (
                  <p className="text-xs text-zinc-500">Landmark: {order.landmark}</p>
                )}
              </div>
            </div>

            {/* Itemized Receipt Snapshot */}
            <div className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-950">Items</h3>
              <div className="divide-y divide-zinc-100">
                {order.items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between text-sm">
                    <div>
                      <p className="font-medium text-zinc-950">{item.productNameSnapshot}</p>
                      <p className="text-xs text-zinc-500">
                        {item.variantLabelSnapshot} · SKU {item.skuSnapshot} · ×{item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-zinc-950 tabular-nums">
                      {formatKsh(item.lineTotalCents)}
                    </p>
                  </div>
                ))}
              </div>
              <dl className="border-t border-zinc-200 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatKsh(order.subtotalCents)}</dd>
                </div>
                {order.discountCents > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Discount</dt>
                    <dd className="tabular-nums">-{formatKsh(order.discountCents)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <dt>Delivery / Collection</dt>
                  <dd className="tabular-nums">
                    {order.deliveryFeeCents === 0 ? 'Free' : formatKsh(order.deliveryFeeCents)}
                  </dd>
                </div>
                <div className="flex justify-between text-base font-bold text-zinc-950 pt-1">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatKsh(order.totalCents)}</dd>
                </div>
              </dl>
            </div>

            {/* Status Timeline */}
            <div className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-950">Order Timeline</h3>
              <ul className="space-y-2.5 text-xs">
                {order.events.map((ev) => (
                  <li key={ev.id} className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-zinc-100 pb-2 last:border-0">
                    <div>
                      <span className="font-semibold text-zinc-900 capitalize">
                        {ev.eventType}: {ev.toStatus.replace(/_/g, ' ')}
                      </span>
                      {ev.note && <span className="text-zinc-600"> — {ev.note}</span>}
                    </div>
                    <span className="text-zinc-500 shrink-0">
                      {formatNairobiDateTime(ev.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center pt-2">
              <Link to="/shop" className="text-sm font-semibold text-zinc-900 underline">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
