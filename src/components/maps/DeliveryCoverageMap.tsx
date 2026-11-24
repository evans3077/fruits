import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import { formatKsh } from '../../lib/kenya';
import { dispatchGmpQuotaExceeded, isGmpQuotaError } from '../../lib/mapsQuota';
import type { CollectionPointDto, DeliveryZoneDto } from '../../types';

export interface ResolvedMapLocation {
  key: string;
  kind: 'zone' | 'pickup';
  title: string;
  subtitle: string;
  feeLabel: string;
  estimateOrHours: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface DeliveryCoverageMapProps {
  mapsApiKey: string;
  deliveryZones: DeliveryZoneDto[];
  collectionPoints: CollectionPointDto[];
  activeKey: string | null;
  onSelectKey: (key: string | null) => void;
}

const CoveragePins: React.FC<{
  deliveryZones: DeliveryZoneDto[];
  collectionPoints: CollectionPointDto[];
  activeKey: string | null;
  onSelectKey: (key: string | null) => void;
  onResolvedCount?: (count: number) => void;
}> = ({ deliveryZones, collectionPoints, activeKey, onSelectKey, onResolvedCount }) => {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const placesLib = useMapsLibrary('places');
  const [locations, setLocations] = useState<ResolvedMapLocation[]>([]);
  const resolvedCacheRef = useRef<Record<string, ResolvedMapLocation>>({});

  useEffect(() => {
    if (!placesLib || !placesLib.Place) return;
    let cancelled = false;

    const queries: Array<{
      key: string;
      kind: 'zone' | 'pickup';
      query: string;
      title: string;
      subtitle: string;
      feeLabel: string;
      estimateOrHours: string;
    }> = [
      ...deliveryZones.map((z) => ({
        key: `zone-${z.id}`,
        kind: 'zone' as const,
        query: `${z.areaLabel.split(',')[0].trim()}, ${z.town}, ${z.county}, Kenya`,
        title: z.areaLabel,
        subtitle: `${z.county} · ${z.town}`,
        feeLabel: z.feeCents === 0 ? 'Free delivery' : `Delivery ${formatKsh(z.feeCents)}`,
        estimateOrHours: z.estimateText,
      })),
      ...collectionPoints.map((cp) => ({
        key: `pickup-${cp.id}`,
        kind: 'pickup' as const,
        query: `${cp.addressLine}, ${cp.town}, ${cp.county}, Kenya`,
        title: cp.name,
        subtitle: `Pickup · ${cp.county}`,
        feeLabel: cp.feeCents === 0 ? 'Free pickup' : `Pickup ${formatKsh(cp.feeCents)}`,
        estimateOrHours: cp.hoursText || cp.addressLine,
      })),
    ];

    const resolveAll = async () => {
      const next: ResolvedMapLocation[] = [];

      for (const item of queries) {
        if (cancelled) return;
        const cached = resolvedCacheRef.current[item.key];
        if (cached) {
          next.push(cached);
          continue;
        }

        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: item.query,
            fields: ['displayName', 'formattedAddress', 'location'],
            region: 'ke',
            maxResultCount: 1,
          });
          const place = places?.[0];
          const loc = place?.location;
          if (loc) {
            const entry: ResolvedMapLocation = {
              key: item.key,
              kind: item.kind,
              title: item.title,
              subtitle: item.subtitle,
              feeLabel: item.feeLabel,
              estimateOrHours: item.estimateOrHours,
              lat: typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat),
              lng: typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng),
              formattedAddress: place.formattedAddress || item.subtitle,
            };
            resolvedCacheRef.current[item.key] = entry;
            next.push(entry);
          }
        } catch (err) {
          if (isGmpQuotaError(err)) {
            dispatchGmpQuotaExceeded();
            break;
          }
        }
      }

      if (!cancelled) {
        setLocations(next);
        onResolvedCount?.(next.length);
      }
    };

    resolveAll();

    return () => {
      cancelled = true;
    };
  }, [placesLib, deliveryZones, collectionPoints, onResolvedCount]);

  // Fit bounds on initial resolve or pan smoothly when a zone card is selected
  useEffect(() => {
    if (!map || locations.length === 0) return;

    if (activeKey) {
      const target = locations.find((l) => l.key === activeKey);
      if (target) {
        map.panTo({ lat: target.lat, lng: target.lng });
        map.setZoom(13);
        return;
      }
    }

    if (coreLib?.LatLngBounds) {
      const bounds = new coreLib.LatLngBounds();
      for (const loc of locations) {
        bounds.extend({ lat: loc.lat, lng: loc.lng });
      }
      map.fitBounds(bounds, 56);
    }
  }, [map, coreLib, locations, activeKey]);

  const activeLocation = useMemo(
    () => locations.find((l) => l.key === activeKey) ?? null,
    [locations, activeKey]
  );

  return (
    <>
      {locations.map((loc) => (
        <AdvancedMarker
          key={loc.key}
          position={{ lat: loc.lat, lng: loc.lng }}
          title={loc.title}
          onClick={() => onSelectKey(loc.key)}
        >
          <Pin
            background={loc.kind === 'pickup' ? '#059669' : '#6E3F99'}
            glyphColor="#FFFFFF"
            borderColor="#FFFFFF"
          />
        </AdvancedMarker>
      ))}

      {activeLocation && (
        <InfoWindow
          position={{ lat: activeLocation.lat, lng: activeLocation.lng }}
          onCloseClick={() => onSelectKey(null)}
        >
          <div className="max-w-[230px] p-1 space-y-1.5 text-zinc-900">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {activeLocation.subtitle}
            </p>
            <p className="text-sm font-bold leading-snug">{activeLocation.title}</p>
            <p className="text-xs font-semibold text-zinc-800">{activeLocation.feeLabel}</p>
            <p className="text-xs text-zinc-600 leading-snug">{activeLocation.estimateOrHours}</p>
            <Link
              to="/checkout"
              className="inline-block pt-1 text-xs font-semibold text-zinc-950 underline"
            >
              Order to this area →
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const DeliveryCoverageMap: React.FC<DeliveryCoverageMapProps> = ({
  mapsApiKey,
  deliveryZones,
  collectionPoints,
  activeKey,
  onSelectKey,
}) => {
  const [resolvedCount, setResolvedCount] = useState(0);

  if (!mapsApiKey) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center space-y-2">
        <MapPin className="w-6 h-6 text-zinc-500 mx-auto" />
        <p className="text-sm font-semibold text-zinc-900">
          Interactive Google Maps Coverage View
        </p>
        <p className="text-xs text-zinc-600 max-w-md mx-auto">
          Configure a Google Maps Platform API key in your environment to view interactive Kenyan delivery zone and pickup pins.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-white">
      <div className="px-4 py-3 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-800">
            <span className="w-3 h-3 rounded-full bg-[#6E3F99] inline-block" />
            Delivery Zones ({deliveryZones.length})
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-800">
            <span className="w-3 h-3 rounded-full bg-[#059669] inline-block" />
            Pickup Hubs ({collectionPoints.length})
          </span>
        </div>
        <span className="text-zinc-500">
          {resolvedCount > 0
            ? `Showing ${resolvedCount} live locations — click a pin or zone card`
            : 'Resolving Kenyan delivery areas...'}
        </span>
      </div>

      <div className="w-full h-[420px]">
        <APIProvider apiKey={mapsApiKey} language="en" region="KE">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            defaultCenter={{ lat: -1.2921, lng: 36.8219 }}
            defaultZoom={6}
            gestureHandling="greedy"
            className="w-full h-full"
          >
            <CoveragePins
              deliveryZones={deliveryZones}
              collectionPoints={collectionPoints}
              activeKey={activeKey}
              onSelectKey={onSelectKey}
              onResolvedCount={setResolvedCount}
            />
          </GoogleMap>
        </APIProvider>
      </div>
    </div>
  );
};
