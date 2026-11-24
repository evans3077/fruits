import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { DeliveryCoverageMap } from '../components/maps/DeliveryCoverageMap';
import { useStore } from '../context/StoreContext';
import { formatKsh } from '../lib/kenya';
import { useDocumentMeta } from '../lib/useDocumentMeta';

export const DeliveryPage: React.FC = () => {
  const { deliveryZones, collectionPoints, mapsApiKey } = useStore();
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useDocumentMeta(
    'Delivery & Collection — Blendy Kenya',
    'Active Kenyan counties, delivery fees, minimum orders, and collection points for Blendy.'
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-12">
        <div className="space-y-2 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Fulfilment · Kenya
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
            Delivery Zones &amp; Collection Points
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 max-w-2xl">
            Exact delivery availability, fees in KSh, free-delivery thresholds, and pickup hours are
            calculated live from active store configuration.
          </p>
        </div>

        {/* Interactive Google Maps Coverage View */}
        {(deliveryZones.length > 0 || collectionPoints.length > 0) && (
          <section className="space-y-3" aria-label="Kenyan delivery and pickup map">
            <DeliveryCoverageMap
              mapsApiKey={mapsApiKey}
              deliveryZones={deliveryZones}
              collectionPoints={collectionPoints}
              activeKey={activeKey}
              onSelectKey={setActiveKey}
            />
          </section>
        )}

        {/* Active Delivery Zones */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-950">Delivery Coverage</h2>
          {deliveryZones.length === 0 ? (
            <div className="rounded-2xl bg-white border border-zinc-200 p-6 text-sm text-zinc-600">
              No active delivery zones are currently published. Store owners can configure counties,
              towns, fees, and delivery windows in{' '}
              <Link to="/admin" className="font-semibold text-zinc-950 underline">
                Admin → Delivery &amp; Pickup
              </Link>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {deliveryZones.map((zone) => {
                const key = `zone-${zone.id}`;
                const selected = activeKey === key;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setActiveKey(selected ? null : key)}
                    className={`text-left rounded-2xl bg-white border p-6 space-y-2.5 transition-colors cursor-pointer ${
                      selected
                        ? 'border-zinc-950 ring-1 ring-zinc-950'
                        : 'border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {zone.county} · {zone.town}
                    </p>
                    <h3 className="text-lg font-semibold text-zinc-950">{zone.areaLabel}</h3>
                    <dl className="text-sm space-y-1 pt-1 text-zinc-700">
                      <div className="flex justify-between">
                        <dt>Delivery fee</dt>
                        <dd className="font-semibold text-zinc-950 tabular-nums">
                          {zone.feeCents === 0 ? 'Free' : formatKsh(zone.feeCents)}
                        </dd>
                      </div>
                      {zone.freeThresholdCents !== null && (
                        <div className="flex justify-between">
                          <dt>Free delivery threshold</dt>
                          <dd className="font-medium tabular-nums">
                            {formatKsh(zone.freeThresholdCents)}
                          </dd>
                        </div>
                      )}
                      {zone.minOrderCents > 0 && (
                        <div className="flex justify-between">
                          <dt>Minimum order</dt>
                          <dd className="font-medium tabular-nums">
                            {formatKsh(zone.minOrderCents)}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-100">
                      {zone.estimateText}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Active Collection Points */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-950">Pickup Collection Points</h2>
          {collectionPoints.length === 0 ? (
            <div className="rounded-2xl bg-white border border-zinc-200 p-6 text-sm text-zinc-600">
              No pickup collection points are currently configured.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {collectionPoints.map((cp) => {
                const key = `pickup-${cp.id}`;
                const selected = activeKey === key;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => setActiveKey(selected ? null : key)}
                    className={`text-left rounded-2xl bg-white border p-6 space-y-2 transition-colors cursor-pointer ${
                      selected
                        ? 'border-zinc-950 ring-1 ring-zinc-950'
                        : 'border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {cp.county} · {cp.town}
                    </p>
                    <h3 className="text-lg font-semibold text-zinc-950">{cp.name}</h3>
                    <p className="text-sm text-zinc-700">{cp.addressLine}</p>
                    {cp.hoursText && (
                      <p className="text-xs text-zinc-600">Hours: {cp.hoursText}</p>
                    )}
                    {cp.instructions && (
                      <p className="text-xs text-zinc-500 pt-1">{cp.instructions}</p>
                    )}
                    <p className="text-xs font-semibold text-zinc-900 pt-2 tabular-nums">
                      Pickup fee: {cp.feeCents === 0 ? 'Free' : formatKsh(cp.feeCents)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};
