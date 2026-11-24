import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatKsh, formatNairobiDateTime } from '../../lib/kenya';
import type { OrderSummaryDto } from '../../types';

interface AdminOrdersTabProps {
  orders: OrderSummaryDto[];
  isManager: boolean;
  onSearch: (q: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const FULFILMENT_STATES = [
  'received',
  'confirmed',
  'preparing',
  'ready_for_collection',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

const PAYMENT_STATES = [
  'awaiting_payment',
  'pending_confirmation',
  'paid',
  'failed',
  'cancelled',
  'refunded',
] as const;

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders,
  isManager,
  onSearch,
  onRefresh,
}) => {
  const { authFetch, showToast } = useStore();
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusDraft, setStatusDraft] = useState('');
  const [paymentDraft, setPaymentDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const openOrder = (o: OrderSummaryDto) => {
    setSelectedOrderId(o.id);
    setStatusDraft(o.fulfilmentStatus);
    setPaymentDraft(o.paymentStatus);
    setNotesDraft(o.internalNotes || '');
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setBusy(true);
    try {
      const payload: Record<string, string> = {
        fulfilmentStatus: statusDraft,
        internalNotes: notesDraft,
      };
      if (isManager && paymentDraft) {
        payload.paymentStatus = paymentDraft;
      }
      const res = await authFetch(`/api/admin/orders/${selectedOrderId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update order.');
      await onRefresh();
      showToast('Order updated.', 'success');
      setSelectedOrderId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Order update failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await authFetch('/api/admin/orders/export.csv');
      if (!res.ok) throw new Error('Export failed.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'blendy-orders.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not export CSV.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(search);
          }}
          className="flex gap-2"
        >
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ref, name, or phone..."
            className="w-64 px-3.5 py-2 rounded-xl border border-zinc-300 bg-white text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold cursor-pointer"
          >
            Search
          </button>
        </form>

        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 cursor-pointer"
        >
          Export Orders CSV
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-200 p-8 text-sm text-zinc-600">
          No orders recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl bg-white border border-zinc-200 p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-zinc-950">
                    {o.orderRef} · {o.customerName} ({o.customerPhone})
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatNairobiDateTime(o.createdAt)} ·{' '}
                    {o.fulfilmentType === 'delivery'
                      ? `Delivery: ${[o.estate, o.town, o.county].filter(Boolean).join(', ')}`
                      : 'Pickup Collection'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-zinc-950 tabular-nums">
                    {formatKsh(o.totalCents)}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Payment: <strong>{o.paymentStatus}</strong> · Fulfilment:{' '}
                    <strong>{o.fulfilmentStatus}</strong>
                  </p>
                </div>
              </div>

              <div className="text-xs text-zinc-700 border-t border-zinc-100 pt-2.5 flex flex-wrap items-center justify-between gap-2">
                <span>
                  {o.items
                    .map((i) => `${i.productNameSnapshot} (${i.variantLabelSnapshot}) ×${i.quantity}`)
                    .join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => (selectedOrderId === o.id ? setSelectedOrderId(null) : openOrder(o))}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-300 font-semibold hover:bg-zinc-50 cursor-pointer"
                >
                  {selectedOrderId === o.id ? 'Close' : 'Manage Order'}
                </button>
              </div>

              {selectedOrderId === o.id && (
                <form
                  onSubmit={handleUpdateOrder}
                  className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
                >
                  <label className="space-y-1">
                    <span className="font-semibold">Fulfilment Status</span>
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                    >
                      {FULFILMENT_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  {isManager && (
                    <label className="space-y-1">
                      <span className="font-semibold">Payment Status</span>
                      <select
                        value={paymentDraft}
                        onChange={(e) => setPaymentDraft(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                      >
                        {PAYMENT_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="space-y-1 sm:col-span-3">
                    <span className="font-semibold">Internal Rider / Kitchen Notes</span>
                    <input
                      type="text"
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                    />
                  </label>

                  {o.landmark && (
                    <p className="sm:col-span-3 text-zinc-600">
                      Landmark: {o.landmark} {o.deliveryInstructions ? `· ${o.deliveryInstructions}` : ''}
                    </p>
                  )}

                  <div className="sm:col-span-3 flex justify-end gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold cursor-pointer"
                    >
                      Save Order Update
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
