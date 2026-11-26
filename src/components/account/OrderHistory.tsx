import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Store,
  Truck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatKsh, formatNairobiDateTime } from '../../lib/kenya';
import { hasActiveOrders } from '../../lib/orderStepper';
import type { OrderSummaryDto } from '../../types';
import { OrderStatusStepper } from './OrderStatusStepper';

interface OrderHistoryProps {
  orders: OrderSummaryDto[];
}

type StatusFilter = 'all' | 'active' | 'delivered' | 'cancelled';

function formatStatusLabel(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'mpesa_intasend':
      return 'M-Pesa Express (STK Push)';
    case 'mpesa_sandbox_sim':
      return 'M-Pesa STK Simulator';
    case 'pay_on_delivery':
      return 'Pay on Delivery';
    case 'pay_on_pickup':
      return 'Pay on Pickup';
    default:
      return method;
  }
}

function getPaymentBadgeClasses(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'pending_confirmation':
    case 'awaiting_payment':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'failed':
    case 'cancelled':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
}

function getFulfilmentBadgeClasses(status: string): string {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'out_for_delivery':
    case 'ready_for_collection':
    case 'preparing':
    case 'confirmed':
      return 'bg-sky-50 text-sky-900 border-sky-200';
    case 'cancelled':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-zinc-100 text-zinc-800 border-zinc-200';
  }
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ orders }) => {
  const {
    products,
    collectionPoints,
    deliveryZones,
    addToCart,
    setCartDrawerOpen,
    refreshAuthProfile,
    showToast,
  } = useStore();

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(() => orders[0]?.id ?? null);
  const autoExpandedRef = useRef(orders.length > 0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(() => new Date());

  const activeOrdersPresent = useMemo(() => hasActiveOrders(orders), [orders]);

  useEffect(() => {
    if (!autoExpandedRef.current && orders.length > 0) {
      setExpandedId(orders[0].id);
      autoExpandedRef.current = true;
    }
  }, [orders]);

  useEffect(() => {
    if (!activeOrdersPresent) return;

    const runSilentSync = async () => {
      if (refreshingRef.current || document.visibilityState !== 'visible') return;
      refreshingRef.current = true;
      try {
        await refreshAuthProfile();
        setLastSyncedAt(new Date());
      } catch {
        // Silent background poll; manual refresh surfaces errors if needed
      } finally {
        refreshingRef.current = false;
      }
    };

    const intervalId = window.setInterval(runSilentSync, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void runSilentSync();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeOrdersPresent, refreshAuthProfile]);

  const handleRefresh = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await refreshAuthProfile();
      setLastSyncedAt(new Date());
      showToast('Order history updated.', 'success');
    } catch {
      showToast('Unable to refresh orders right now.', 'error');
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  };

  const handleReorder = (ord: OrderSummaryDto) => {
    let addedCount = 0;
    let skippedCount = 0;

    for (const item of ord.items) {
      let matchedProduct = null;
      let matchedVariant = null;
      for (const p of products) {
        const found = p.variants.find((v) => v.sku === item.skuSnapshot && v.isActive);
        if (found) {
          matchedProduct = p;
          matchedVariant = found;
          break;
        }
      }

      if (matchedProduct && matchedVariant && matchedVariant.availableQty > 0) {
        const qtyToAdd = Math.min(item.quantity, matchedVariant.availableQty);
        addToCart(
          {
            productId: matchedProduct.id,
            variantId: matchedVariant.id,
            quantity: qtyToAdd,
          },
          {
            name: matchedProduct.name,
            variantLabel: matchedVariant.label,
            priceCents: matchedVariant.priceCents,
          }
        );
        addedCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    if (addedCount > 0) {
      setCartDrawerOpen(true);
      if (skippedCount > 0) {
        showToast(
          `Added ${addedCount} available item(s); ${skippedCount} item(s) currently out of stock.`,
          'neutral'
        );
      }
    } else {
      showToast('Items from this order are currently unavailable or out of stock.', 'error');
    }
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((ord) => {
      if (filter === 'active') {
        if (
          ord.fulfilmentStatus === 'delivered' ||
          ord.fulfilmentStatus === 'cancelled' ||
          ord.paymentStatus === 'failed' ||
          ord.paymentStatus === 'cancelled'
        ) {
          return false;
        }
      } else if (filter === 'delivered') {
        if (ord.fulfilmentStatus !== 'delivered') return false;
      } else if (filter === 'cancelled') {
        if (
          ord.fulfilmentStatus !== 'cancelled' &&
          ord.paymentStatus !== 'failed' &&
          ord.paymentStatus !== 'cancelled'
        ) {
          return false;
        }
      }

      if (!q) return true;
      const haystack = [
        ord.orderRef,
        ord.county,
        ord.town,
        ord.estate,
        ord.building,
        ord.landmark,
        ...ord.items.map((i) => `${i.productNameSnapshot} ${i.variantLabelSnapshot} ${i.skuSnapshot}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, filter, searchQuery]);

  return (
    <section className="space-y-5" aria-labelledby="order-history-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="order-history-heading" className="text-xl font-bold text-zinc-950">
            Order History
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {orders.length === 0
              ? 'Past purchases placed while signed in will appear here.'
              : `Showing ${filteredOrders.length} of ${orders.length} order${orders.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {orders.length > 0 && (
            <span className="text-[11px] text-zinc-500 tabular-nums hidden sm:inline">
              {activeOrdersPresent ? 'Live updates on · ' : ''}
              Synced{' '}
              {new Intl.DateTimeFormat('en-KE', {
                timeZone: 'Africa/Nairobi',
                hour: '2-digit',
                minute: '2-digit',
              }).format(lastSyncedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-200 p-8 text-sm text-zinc-600 space-y-4">
          <div className="space-y-1.5">
            <p className="font-semibold text-zinc-950">No orders linked to this account yet.</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Placed an order as a guest before signing in? Look it up anytime using your order
              reference and verification token on Track Order.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
            >
              Shop Smoothies
            </Link>
            <Link
              to="/track-order"
              className="px-4 py-2.5 rounded-xl border border-zinc-300 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Track Guest Order
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter orders by status">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active' },
                  { id: 'delivered', label: 'Delivered' },
                  { id: 'cancelled', label: 'Cancelled / Failed' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filter === tab.id
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="order-history-search" className="sr-only">
                Search orders
              </label>
              <input
                id="order-history-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ref, flavour, estate..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs focus:outline-none focus:border-zinc-950"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl bg-white border border-zinc-200 p-8 text-center space-y-3">
              <p className="text-sm font-medium text-zinc-700">
                No past orders match your current filter or search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => {
                const isExpanded = expandedId === ord.id;
                const latestTx = ord.transactions?.[0] ?? null;
                const collectionPoint = ord.collectionPointId
                  ? collectionPoints.find((cp) => cp.id === ord.collectionPointId)
                  : undefined;
                const deliveryZone = ord.deliveryZoneId
                  ? deliveryZones.find((z) => z.id === ord.deliveryZoneId)
                  : undefined;
                const totalBottles = ord.items.reduce((sum, i) => sum + i.quantity, 0);

                return (
                  <article
                    key={ord.id}
                    className="rounded-2xl bg-white border border-zinc-200 overflow-hidden"
                  >
                    {/* Summary Header */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : ord.id)}
                      aria-expanded={isExpanded}
                      className="w-full text-left p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/70 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-zinc-950 tracking-tight">
                            {ord.orderRef}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getPaymentBadgeClasses(
                              ord.paymentStatus
                            )}`}
                          >
                            Payment: {formatStatusLabel(ord.paymentStatus)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getFulfilmentBadgeClasses(
                              ord.fulfilmentStatus
                            )}`}
                          >
                            {formatStatusLabel(ord.fulfilmentStatus)}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-500">
                          Placed {formatNairobiDateTime(ord.createdAt)} · {totalBottles} item
                          {totalBottles === 1 ? '' : 's'} ·{' '}
                          {ord.fulfilmentType === 'delivery'
                            ? [ord.estate, ord.town, ord.county].filter(Boolean).join(', ') ||
                              'Delivery'
                            : collectionPoint
                              ? `Pickup: ${collectionPoint.name}`
                              : 'Pickup Collection'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="sm:text-right">
                          <p className="text-base font-bold text-zinc-950 tabular-nums">
                            {formatKsh(ord.totalCents)}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {formatPaymentMethodLabel(ord.paymentMethod)}
                          </p>
                        </div>
                        <span className="w-8 h-8 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-600">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                    </button>

                    {/* Visual Order Status Stepper (Pending -> Packing -> In Transit -> Delivered) */}
                    <OrderStatusStepper order={ord} compact />

                    {/* Expanded Purchase & Delivery Details */}
                    {isExpanded && (
                      <div className="border-t border-zinc-200 bg-[#FAF9F7]/60 p-5 sm:p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Items & Payment Breakdown */}
                          <div className="rounded-xl bg-white border border-zinc-200 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                              <Package className="w-3.5 h-3.5" />
                              <span>Items &amp; Payment Summary</span>
                            </div>

                            <ul className="divide-y divide-zinc-100 text-sm">
                              {ord.items.map((item) => (
                                <li key={item.id} className="py-2.5 flex justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-zinc-950">
                                      {item.productNameSnapshot}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                      {item.variantLabelSnapshot} · ×{item.quantity} @{' '}
                                      {formatKsh(item.unitPriceCents)}
                                    </p>
                                  </div>
                                  <span className="font-semibold text-zinc-950 tabular-nums shrink-0">
                                    {formatKsh(item.lineTotalCents)}
                                  </span>
                                </li>
                              ))}
                            </ul>

                            <dl className="border-t border-zinc-200 pt-2.5 space-y-1 text-xs">
                              <div className="flex justify-between text-zinc-600">
                                <dt>Subtotal</dt>
                                <dd className="tabular-nums">{formatKsh(ord.subtotalCents)}</dd>
                              </div>
                              {ord.discountCents > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                  <dt>Discount{ord.promoCode ? ` (${ord.promoCode})` : ''}</dt>
                                  <dd className="tabular-nums">
                                    -{formatKsh(ord.discountCents)}
                                  </dd>
                                </div>
                              )}
                              <div className="flex justify-between text-zinc-600">
                                <dt>
                                  {ord.fulfilmentType === 'delivery'
                                    ? 'Delivery Fee'
                                    : 'Collection Fee'}
                                </dt>
                                <dd className="tabular-nums">
                                  {ord.deliveryFeeCents === 0
                                    ? 'Free'
                                    : formatKsh(ord.deliveryFeeCents)}
                                </dd>
                              </div>
                              {ord.taxCents > 0 && (
                                <div className="flex justify-between text-zinc-600">
                                  <dt>Tax</dt>
                                  <dd className="tabular-nums">{formatKsh(ord.taxCents)}</dd>
                                </div>
                              )}
                              <div className="flex justify-between text-sm font-bold text-zinc-950 pt-1 border-t border-zinc-100">
                                <dt>Total</dt>
                                <dd className="tabular-nums">{formatKsh(ord.totalCents)}</dd>
                              </div>
                            </dl>

                            <div className="border-t border-zinc-100 pt-2.5 text-xs text-zinc-600 space-y-1">
                              <p className="flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>
                                  {formatPaymentMethodLabel(ord.paymentMethod)}
                                  {ord.payerPhone ? ` · ${ord.payerPhone}` : ''}
                                </span>
                              </p>
                              {latestTx?.mpesaReceipt && (
                                <p className="text-emerald-800 font-medium">
                                  M-Pesa Receipt: {latestTx.mpesaReceipt}
                                </p>
                              )}
                              {latestTx?.failureReason && ord.paymentStatus !== 'paid' && (
                                <p className="text-red-700">Note: {latestTx.failureReason}</p>
                              )}
                            </div>
                          </div>

                          {/* Delivery / Pickup Details */}
                          <div className="rounded-xl bg-white border border-zinc-200 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                              {ord.fulfilmentType === 'delivery' ? (
                                <Truck className="w-3.5 h-3.5" />
                              ) : (
                                <Store className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {ord.fulfilmentType === 'delivery'
                                  ? 'Delivery Details'
                                  : 'Pickup Collection Details'}
                              </span>
                            </div>

                            <div className="text-xs sm:text-sm space-y-1.5 text-zinc-700">
                              <p className="font-semibold text-zinc-950">{ord.customerName}</p>
                              <p className="text-xs text-zinc-600">
                                Mobile: {ord.customerPhone}
                                {ord.customerEmail ? ` · ${ord.customerEmail}` : ''}
                              </p>

                              {ord.fulfilmentType === 'delivery' ? (
                                <div className="pt-2 border-t border-zinc-100 space-y-1 text-xs">
                                  <p className="flex items-start gap-1.5 text-zinc-900 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                                    <span>
                                      {[ord.building, ord.estate, ord.town, ord.county]
                                        .filter(Boolean)
                                        .join(', ')}
                                    </span>
                                  </p>
                                  {ord.landmark && (
                                    <p className="text-zinc-600">
                                      <strong>Landmark:</strong> {ord.landmark}
                                    </p>
                                  )}
                                  {ord.deliveryInstructions && (
                                    <p className="text-zinc-600">
                                      <strong>Rider Instructions:</strong>{' '}
                                      {ord.deliveryInstructions}
                                    </p>
                                  )}
                                  {deliveryZone?.estimateText && (
                                    <p className="text-zinc-500 pt-0.5">
                                      Window: {deliveryZone.estimateText}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="pt-2 border-t border-zinc-100 space-y-1 text-xs">
                                  {collectionPoint ? (
                                    <>
                                      <p className="font-semibold text-zinc-950">
                                        {collectionPoint.name}
                                      </p>
                                      <p className="text-zinc-700">{collectionPoint.addressLine}</p>
                                      {collectionPoint.hoursText && (
                                        <p className="text-zinc-500">
                                          Hours: {collectionPoint.hoursText}
                                        </p>
                                      )}
                                      {collectionPoint.instructions && (
                                        <p className="text-zinc-500">
                                          {collectionPoint.instructions}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-zinc-700">
                                      Collection Point Pickup ({[ord.town, ord.county].filter(Boolean).join(', ') || 'Kenya'})
                                    </p>
                                  )}
                                  {ord.deliveryInstructions && (
                                    <p className="text-zinc-600">
                                      <strong>Pickup Note:</strong> {ord.deliveryInstructions}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {ord.events && ord.events.length > 0 && (
                              <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                  Status Updates
                                </p>
                                <ul className="space-y-1 text-xs">
                                  {ord.events.slice(-4).map((ev) => (
                                    <li
                                      key={ev.id}
                                      className="flex items-start justify-between gap-2 text-zinc-600"
                                    >
                                      <span>
                                        <strong className="text-zinc-900">
                                          {formatStatusLabel(ev.toStatus)}
                                        </strong>
                                        {ev.note ? ` — ${ev.note}` : ''}
                                      </span>
                                      <span className="text-[11px] text-zinc-400 shrink-0">
                                        {formatNairobiDateTime(ev.createdAt)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => handleReorder(ord)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reorder Smoothies</span>
                          </button>

                          <Link
                            to={`/track-order?ref=${encodeURIComponent(ord.orderRef)}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
                          >
                            <span>
                              {ord.paymentStatus === 'pending_confirmation' ||
                              ord.paymentStatus === 'failed'
                                ? 'Verify or Retry Payment'
                                : 'Open Full Order Tracker'}
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
};
