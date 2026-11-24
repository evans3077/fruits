import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatKsh, KENYA_COUNTIES } from '../../lib/kenya';
import type { CollectionPointDto, DeliveryZoneDto } from '../../types';

interface PromotionDto {
  id: number;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed_cents' | 'free_delivery';
  discountValue: number;
  minSubtotalCents: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
}

interface AdminFulfilmentTabProps {
  zones: DeliveryZoneDto[];
  points: CollectionPointDto[];
  promotions: PromotionDto[];
  onRefresh: () => Promise<void>;
}

export const AdminFulfilmentTab: React.FC<AdminFulfilmentTabProps> = ({
  zones,
  points,
  promotions,
  onRefresh,
}) => {
  const { authFetch, reloadBootstrap, showToast } = useStore();
  const [zoneForm, setZoneForm] = useState({
    county: 'Nairobi',
    town: 'Nairobi',
    areaLabel: '',
    feeKes: '250',
    freeThresholdKes: '',
    minOrderKes: '0',
    estimateText: 'Same-day / scheduled dispatch',
  });

  const [pointForm, setPointForm] = useState({
    name: '',
    county: 'Nairobi',
    town: 'Nairobi',
    addressLine: '',
    hoursText: '',
    instructions: '',
    feeKes: '0',
  });

  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    discountType: 'percent' as 'percent' | 'fixed_cents' | 'free_delivery',
    discountValue: '10',
    minSubtotalKes: '0',
  });

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admin/delivery-zones', {
        method: 'POST',
        body: JSON.stringify({
          county: zoneForm.county,
          town: zoneForm.town,
          areaLabel: zoneForm.areaLabel,
          feeCents: Math.round(Number(zoneForm.feeKes || 0) * 100),
          freeThresholdCents: zoneForm.freeThresholdKes
            ? Math.round(Number(zoneForm.freeThresholdKes) * 100)
            : null,
          minOrderCents: Math.round(Number(zoneForm.minOrderKes || 0) * 100),
          estimateText: zoneForm.estimateText,
        }),
      });
      if (!res.ok) throw new Error('Could not add delivery zone.');
      setZoneForm({ ...zoneForm, areaLabel: '' });
      await onRefresh();
      await reloadBootstrap(false);
      showToast('Delivery zone added.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed.', 'error');
    }
  };

  const handleToggleZone = async (z: DeliveryZoneDto) => {
    const res = await authFetch(`/api/admin/delivery-zones/${z.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !z.isActive }),
    });
    if (res.ok) {
      await onRefresh();
      await reloadBootstrap(false);
    }
  };

  const handleDeleteZone = async (id: number) => {
    const res = await authFetch(`/api/admin/delivery-zones/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onRefresh();
      await reloadBootstrap(false);
    }
  };

  const handleAddPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admin/collection-points', {
        method: 'POST',
        body: JSON.stringify({
          name: pointForm.name,
          county: pointForm.county,
          town: pointForm.town,
          addressLine: pointForm.addressLine,
          hoursText: pointForm.hoursText,
          instructions: pointForm.instructions,
          feeCents: Math.round(Number(pointForm.feeKes || 0) * 100),
        }),
      });
      if (!res.ok) throw new Error('Could not add collection point.');
      setPointForm({
        name: '',
        county: 'Nairobi',
        town: 'Nairobi',
        addressLine: '',
        hoursText: '',
        instructions: '',
        feeKes: '0',
      });
      await onRefresh();
      await reloadBootstrap(false);
      showToast('Collection point added.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed.', 'error');
    }
  };

  const handleDeletePoint = async (id: number) => {
    const res = await authFetch(`/api/admin/collection-points/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onRefresh();
      await reloadBootstrap(false);
    }
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const val =
        promoForm.discountType === 'fixed_cents'
          ? Math.round(Number(promoForm.discountValue || 0) * 100)
          : Math.round(Number(promoForm.discountValue || 0));
      const res = await authFetch('/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify({
          code: promoForm.code.trim().toUpperCase(),
          description: promoForm.description,
          discountType: promoForm.discountType,
          discountValue: val,
          minSubtotalCents: Math.round(Number(promoForm.minSubtotalKes || 0) * 100),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create promo.');
      setPromoForm({
        code: '',
        description: '',
        discountType: 'percent',
        discountValue: '10',
        minSubtotalKes: '0',
      });
      await onRefresh();
      showToast('Promo code saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed.', 'error');
    }
  };

  const handleTogglePromo = async (p: PromotionDto) => {
    const res = await authFetch(`/api/admin/promotions/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (res.ok) await onRefresh();
  };

  return (
    <div className="space-y-10">
      {/* Delivery Zones */}
      <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-zinc-950">Delivery Zones (Kenya)</h2>

        <form onSubmit={handleAddZone} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <select
            value={zoneForm.county}
            onChange={(e) => setZoneForm({ ...zoneForm, county: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 bg-white"
          >
            {KENYA_COUNTIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            required
            placeholder="Town (e.g. Nairobi)"
            value={zoneForm.town}
            onChange={(e) => setZoneForm({ ...zoneForm, town: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <input
            type="text"
            required
            placeholder="Area Label (e.g. Westlands & Kilimani)"
            value={zoneForm.areaLabel}
            onChange={(e) => setZoneForm({ ...zoneForm, areaLabel: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <input
            type="number"
            min="0"
            required
            placeholder="Fee (KSh)"
            value={zoneForm.feeKes}
            onChange={(e) => setZoneForm({ ...zoneForm, feeKes: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <input
            type="number"
            min="0"
            placeholder="Free delivery over (KSh, optional)"
            value={zoneForm.freeThresholdKes}
            onChange={(e) => setZoneForm({ ...zoneForm, freeThresholdKes: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <input
            type="text"
            required
            placeholder="Delivery estimate"
            value={zoneForm.estimateText}
            onChange={(e) => setZoneForm({ ...zoneForm, estimateText: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold cursor-pointer"
            >
              + Add Delivery Zone
            </button>
          </div>
        </form>

        <div className="divide-y divide-zinc-100 text-xs">
          {zones.map((z) => (
            <div key={z.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-950">
                  {z.county} · {z.areaLabel} ({z.isActive ? 'Active' : 'Paused'})
                </p>
                <p className="text-zinc-600 tabular-nums">
                  Fee: {formatKsh(z.feeCents)}
                  {z.freeThresholdCents !== null ? ` · Free over ${formatKsh(z.freeThresholdCents)}` : ''} ·{' '}
                  {z.estimateText}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleZone(z)}
                  className="px-3 py-1.5 rounded border border-zinc-300 cursor-pointer"
                >
                  {z.isActive ? 'Pause' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteZone(z.id)}
                  className="px-3 py-1.5 rounded border border-red-200 text-red-700 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Collection Points */}
      <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-zinc-950">Pickup Collection Points</h2>

        <form onSubmit={handleAddPoint} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <input
            type="text"
            required
            placeholder="Point Name"
            value={pointForm.name}
            onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <select
            value={pointForm.county}
            onChange={(e) => setPointForm({ ...pointForm, county: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 bg-white"
          >
            {KENYA_COUNTIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            required
            placeholder="Town"
            value={pointForm.town}
            onChange={(e) => setPointForm({ ...pointForm, town: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <input
            type="text"
            required
            placeholder="Physical Address / Building"
            value={pointForm.addressLine}
            onChange={(e) => setPointForm({ ...pointForm, addressLine: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 sm:col-span-2"
          />
          <input
            type="text"
            placeholder="Opening Hours"
            value={pointForm.hoursText}
            onChange={(e) => setPointForm({ ...pointForm, hoursText: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold cursor-pointer"
            >
              + Add Collection Point
            </button>
          </div>
        </form>

        <div className="divide-y divide-zinc-100 text-xs">
          {points.map((p) => (
            <div key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-950">{p.name} ({p.county})</p>
                <p className="text-zinc-600">{p.addressLine} · {p.hoursText}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDeletePoint(p.id)}
                className="px-3 py-1.5 rounded border border-red-200 text-red-700 cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Promotions */}
      <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-zinc-950">Promo Codes</h2>

        <form onSubmit={handleAddPromo} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end">
          <input
            type="text"
            required
            placeholder="Code (e.g. KARIBU10)"
            value={promoForm.code}
            onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 uppercase"
          />
          <select
            value={promoForm.discountType}
            onChange={(e) =>
              setPromoForm({
                ...promoForm,
                discountType: e.target.value as 'percent' | 'fixed_cents' | 'free_delivery',
              })
            }
            className="px-3 py-2 rounded-lg border border-zinc-300 bg-white"
          >
            <option value="percent">Percent (%)</option>
            <option value="fixed_cents">Fixed (KSh)</option>
            <option value="free_delivery">Free Delivery</option>
          </select>
          <input
            type="number"
            min="0"
            required
            placeholder="Value (% or KSh)"
            value={promoForm.discountValue}
            onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <input
            type="number"
            min="0"
            placeholder="Min subtotal (KSh)"
            value={promoForm.minSubtotalKes}
            onChange={(e) => setPromoForm({ ...promoForm, minSubtotalKes: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold cursor-pointer"
          >
            + Add Promo
          </button>
        </form>

        <div className="divide-y divide-zinc-100 text-xs">
          {promotions.map((pr) => (
            <div key={pr.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-950">
                  {pr.code} · {pr.discountType} (
                  {pr.discountType === 'percent'
                    ? `${pr.discountValue}%`
                    : pr.discountType === 'fixed_cents'
                      ? formatKsh(pr.discountValue)
                      : 'Free delivery'}
                  ) · Used {pr.usedCount}×
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePromo(pr)}
                className="px-3 py-1.5 rounded border border-zinc-300 cursor-pointer"
              >
                {pr.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
