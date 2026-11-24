import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, MapPin, Navigation } from 'lucide-react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import {
  KenyaAddressAutocomplete,
  type ParsedKenyaPlace,
} from '../components/maps/KenyaAddressAutocomplete';
import { useStore } from '../context/StoreContext';
import { formatKsh, KENYA_COUNTIES, normalizeKenyanPhone } from '../lib/kenya';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { trackStoreEvent } from '../services/analytics';
import type { CartQuoteDto } from '../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    settings,
    cartItems,
    deliveryZones,
    collectionPoints,
    paymentProvider,
    mapsApiKey,
    authFetch,
    profile,
    clearCart,
    showToast,
  } = useStore();

  useDocumentMeta('Checkout — Blendy Kenya', 'Complete your Blendy order with Kenyan mobile checkout.');

  const [fulfilmentType, setFulfilmentType] = useState<'delivery' | 'collection'>(() =>
    deliveryZones.length > 0 ? 'delivery' : collectionPoints.length > 0 ? 'collection' : 'delivery'
  );
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(
    () => deliveryZones[0]?.id ?? null
  );
  const [selectedPointId, setSelectedPointId] = useState<number | null>(
    () => collectionPoints[0]?.id ?? null
  );

  const [customerName, setCustomerName] = useState(() => profile?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [useDifferentPayer, setUseDifferentPayer] = useState(false);
  const [payerPhone, setPayerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(() => profile?.email || '');

  const [county, setCounty] = useState(() => deliveryZones[0]?.county || 'Nairobi');
  const [town, setTown] = useState(() => deliveryZones[0]?.town || '');
  const [estate, setEstate] = useState('');
  const [building, setBuilding] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [quote, setQuote] = useState<CartQuoteDto | null>(null);
  const [quoting, setQuoting] = useState(false);

  const defaultMpesaMethod =
    paymentProvider.provider === 'intasend'
      ? 'mpesa_intasend'
      : paymentProvider.provider === 'sandbox_sim'
        ? 'mpesa_sandbox_sim'
        : settings?.allowPayOnDelivery
          ? 'pay_on_delivery'
          : settings?.allowPayOnPickup
            ? 'pay_on_pickup'
            : 'mpesa_intasend';

  const [paymentMethod, setPaymentMethod] = useState<
    'mpesa_intasend' | 'mpesa_sandbox_sim' | 'pay_on_delivery' | 'pay_on_pickup'
  >(defaultMpesaMethod);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `bk-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  // Sync default payment method when provider loads
  useEffect(() => {
    if (paymentProvider.provider === 'intasend' && paymentMethod === 'mpesa_sandbox_sim') {
      setPaymentMethod('mpesa_intasend');
    } else if (paymentProvider.provider === 'sandbox_sim' && paymentMethod === 'mpesa_intasend') {
      setPaymentMethod('mpesa_sandbox_sim');
    }
  }, [paymentProvider.provider, paymentMethod]);

  // Sync default zone/point when bootstrap completes
  useEffect(() => {
    if (deliveryZones.length > 0 && selectedZoneId === null) {
      setSelectedZoneId(deliveryZones[0].id);
      setCounty(deliveryZones[0].county);
      setTown(deliveryZones[0].town);
    }
    if (collectionPoints.length > 0 && selectedPointId === null) {
      setSelectedPointId(collectionPoints[0].id);
    }
  }, [deliveryZones, collectionPoints, selectedZoneId, selectedPointId]);

  useEffect(() => {
    if (cartItems.length > 0) {
      trackStoreEvent('begin_checkout', { items_count: cartItems.length });
    }
  }, [cartItems.length]);

  // Fetch authoritative server quote whenever cart or fulfilment/promo changes
  useEffect(() => {
    if (cartItems.length === 0) {
      setQuote(null);
      return;
    }
    let active = true;
    const loadQuote = async () => {
      setQuoting(true);
      try {
        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems,
            fulfilmentType,
            deliveryZoneId: fulfilmentType === 'delivery' ? selectedZoneId : null,
            collectionPointId: fulfilmentType === 'collection' ? selectedPointId : null,
            promoCode: appliedPromo,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as CartQuoteDto;
        if (active) setQuote(data);
      } finally {
        if (active) setQuoting(false);
      }
    };
    loadQuote();
    return () => {
      active = false;
    };
  }, [cartItems, fulfilmentType, selectedZoneId, selectedPointId, appliedPromo]);

  const phoneValidation = useMemo(() => normalizeKenyanPhone(customerPhone), [customerPhone]);

  const handleSelectAddress = (parsed: ParsedKenyaPlace) => {
    if (parsed.county) setCounty(parsed.county);
    if (parsed.town) setTown(parsed.town);
    if (parsed.estate) setEstate(parsed.estate);
    if (parsed.landmark) setLandmark(parsed.landmark);

    const searchHaystack = `${parsed.county || ''} ${parsed.town || ''} ${parsed.estate || ''} ${parsed.formattedAddress}`.toLowerCase();
    const matchedZone =
      deliveryZones.find((z) => {
        const keywords = z.areaLabel
          .toLowerCase()
          .split(/[,&]+/)
          .map((w) => w.trim())
          .filter(Boolean);
        return (
          z.county.toLowerCase() === (parsed.county || '').toLowerCase() &&
          keywords.some((kw) => searchHaystack.includes(kw))
        );
      }) ||
      deliveryZones.find(
        (z) => z.county.toLowerCase() === (parsed.county || '').toLowerCase()
      );

    if (matchedZone) {
      setSelectedZoneId(matchedZone.id);
    }
    showToast('Delivery address details populated from Google Places.', 'success');
  };

  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      showToast('Browser geolocation is not available on this device.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coordsNote = `GPS pin: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        setLandmark((prev) => (prev ? `${prev} · ${coordsNote}` : coordsNote));
        setLocating(false);
        showToast('Approximate coordinates added to landmark field.', 'success');
      },
      () => {
        setLocating(false);
        showToast('Could not read location permission. Enter your estate and landmark manually.', 'error');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    idempotencyKeyRef.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `bk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setAppliedPromo(promoInput.trim() || null);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!phoneValidation.valid) {
      setSubmitError(phoneValidation.error || 'Enter a valid Kenyan mobile number.');
      return;
    }

    if (fulfilmentType === 'delivery') {
      if (!selectedZoneId) {
        setSubmitError('Select an active delivery zone before placing your order.');
        return;
      }
      if (!county.trim() || !town.trim() || !estate.trim()) {
        setSubmitError('Please enter your County, Town, and Estate / Neighbourhood.');
        return;
      }
    } else if (!selectedPointId) {
      setSubmitError('Select a pickup collection point.');
      return;
    }

    trackStoreEvent('add_shipping_info', { fulfilment_type: fulfilmentType });
    trackStoreEvent('add_payment_info', { payment_method: paymentMethod });

    setSubmitting(true);
    try {
      const res = await authFetch('/api/checkout/orders', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: idempotencyKeyRef.current,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          payerPhone: useDifferentPayer ? payerPhone.trim() : '',
          customerEmail: customerEmail.trim(),
          fulfilmentType,
          deliveryZoneId: fulfilmentType === 'delivery' ? selectedZoneId : null,
          collectionPointId: fulfilmentType === 'collection' ? selectedPointId : null,
          county: fulfilmentType === 'delivery' ? county.trim() : '',
          town: fulfilmentType === 'delivery' ? town.trim() : '',
          estate: fulfilmentType === 'delivery' ? estate.trim() : '',
          building: fulfilmentType === 'delivery' ? building.trim() : '',
          landmark: fulfilmentType === 'delivery' ? landmark.trim() : '',
          deliveryInstructions: deliveryInstructions.trim(),
          paymentMethod,
          promoCode: appliedPromo,
          items: cartItems,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.order?.orderRef && data.accessToken) {
          clearCart();
          navigate(
            `/track-order?ref=${encodeURIComponent(data.order.orderRef)}&token=${encodeURIComponent(
              data.accessToken
            )}`
          );
          return;
        }
        throw new Error(data.error || 'Unable to place order.');
      }

      clearCart();
      const orderRef = data.order?.orderRef;
      const accessToken = data.accessToken;
      if (orderRef && accessToken) {
        navigate(
          `/track-order?ref=${encodeURIComponent(orderRef)}&token=${encodeURIComponent(
            accessToken
          )}`
        );
      } else if (orderRef) {
        navigate(`/track-order?ref=${encodeURIComponent(orderRef)}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
        <Navbar />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-8 py-16 text-center space-y-4">
          <h1 className="text-3xl font-bold text-zinc-950">Your shopping bag is empty</h1>
          <p className="text-sm text-zinc-600">
            Add published smoothie bottles to your bag before checking out.
          </p>
          <Link
            to="/shop"
            className="inline-flex px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
          >
            Browse Smoothies
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <div className="mb-8 border-b border-zinc-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Guest Checkout · Kenyan Shillings (KSh)
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 mt-1">
            Complete Your Order
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Checkout Form */}
          <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-6">
            {submitError && (
              <div
                role="alert"
                className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
              >
                {submitError}
              </div>
            )}

            {/* 1. Customer Details */}
            <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-zinc-950">1. Contact Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="co-name" className="text-xs font-medium text-zinc-700">
                    Full Name *
                  </label>
                  <input
                    id="co-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Amina Wanjiku"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="co-phone" className="text-xs font-medium text-zinc-700">
                    Kenyan Mobile Number *
                  </label>
                  <input
                    id="co-phone"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                  />
                  {customerPhone.trim().length > 0 && (
                    <p
                      className={`text-[11px] ${
                        phoneValidation.valid ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {phoneValidation.valid
                        ? `Formatted: ${phoneValidation.e164}`
                        : phoneValidation.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="co-email" className="text-xs font-medium text-zinc-700">
                  Email Address (optional — for order updates if configured)
                </label>
                <input
                  id="co-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.co.ke"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                />
              </div>
            </section>

            {/* 2. Delivery or Collection */}
            <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-zinc-950">2. Delivery or Pickup</h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfilmentType('delivery')}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                    fulfilmentType === 'delivery'
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setFulfilmentType('collection')}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                    fulfilmentType === 'collection'
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  Pickup Collection
                </button>
              </div>

              {fulfilmentType === 'delivery' ? (
                deliveryZones.length === 0 ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
                    No active delivery zones are configured yet. Switch to Pickup Collection if
                    available, or configure delivery zones in{' '}
                    <Link to="/admin" className="underline font-semibold">
                      Admin
                    </Link>
                    .
                  </div>
                ) : (
                  <div className="space-y-4">
                    <KenyaAddressAutocomplete
                      mapsApiKey={mapsApiKey}
                      onSelectPlace={handleSelectAddress}
                    />
                    <div className="space-y-1.5">
                      <label htmlFor="co-zone" className="text-xs font-medium text-zinc-700">
                        Active Delivery Zone *
                      </label>
                      <select
                        id="co-zone"
                        value={selectedZoneId ?? ''}
                        onChange={(e) => {
                          const zId = Number(e.target.value) || null;
                          setSelectedZoneId(zId);
                          const z = deliveryZones.find((item) => item.id === zId);
                          if (z) {
                            setCounty(z.county);
                            setTown(z.town);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm bg-white focus:outline-none focus:border-zinc-950"
                      >
                        {deliveryZones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.county} · {z.areaLabel} (
                            {z.feeCents === 0 ? 'Free' : formatKsh(z.feeCents)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="co-county" className="text-xs font-medium text-zinc-700">
                          County *
                        </label>
                        <select
                          id="co-county"
                          value={county}
                          onChange={(e) => setCounty(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm bg-white focus:outline-none focus:border-zinc-950"
                        >
                          {KENYA_COUNTIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="co-town" className="text-xs font-medium text-zinc-700">
                          Town / Area *
                        </label>
                        <input
                          id="co-town"
                          type="text"
                          required
                          value={town}
                          onChange={(e) => setTown(e.target.value)}
                          placeholder="e.g. Nairobi"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="co-estate" className="text-xs font-medium text-zinc-700">
                          Estate / Neighbourhood *
                        </label>
                        <input
                          id="co-estate"
                          type="text"
                          required
                          value={estate}
                          onChange={(e) => setEstate(e.target.value)}
                          placeholder="e.g. Kilimani, Argwings Kodhek Rd"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="co-building" className="text-xs font-medium text-zinc-700">
                          Building / Court / House No.
                        </label>
                        <input
                          id="co-building"
                          type="text"
                          value={building}
                          onChange={(e) => setBuilding(e.target.value)}
                          placeholder="e.g. Oak Court, Apt 4B"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="co-landmark" className="text-xs font-medium text-zinc-700">
                          Nearest Landmark / Directions
                        </label>
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={locating}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 hover:text-zinc-950 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>{locating ? 'Reading GPS...' : 'Attach current GPS pin'}</span>
                        </button>
                      </div>
                      <input
                        id="co-landmark"
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Opposite Yaya Centre petrol station"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="co-instr" className="text-xs font-medium text-zinc-700">
                        Rider Instructions (optional)
                      </label>
                      <input
                        id="co-instr"
                        type="text"
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        placeholder="Call on arrival at the main gate"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                  </div>
                )
              ) : collectionPoints.length === 0 ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
                  No pickup collection points are currently active.
                </div>
              ) : (
                <div className="space-y-3">
                  {collectionPoints.map((cp) => (
                    <label
                      key={cp.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${
                        selectedPointId === cp.id
                          ? 'border-zinc-950 bg-zinc-50'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="collectionPoint"
                        checked={selectedPointId === cp.id}
                        onChange={() => setSelectedPointId(cp.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 text-sm">
                        <p className="font-semibold text-zinc-950">
                          {cp.name} ·{' '}
                          <span className="tabular-nums">
                            {cp.feeCents === 0 ? 'Free' : formatKsh(cp.feeCents)}
                          </span>
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {cp.addressLine} ({cp.town}, {cp.county})
                        </p>
                        {cp.hoursText && (
                          <p className="text-xs text-zinc-500 mt-0.5">{cp.hoursText}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* 3. Payment Method */}
            <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-zinc-950">3. Payment Method</h2>
                <span className="text-xs font-medium text-zinc-500">{paymentProvider.label}</span>
              </div>

              <div className="space-y-2.5">
                {paymentProvider.mpesaAvailable && (
                  <label
                    className={`block p-4 rounded-xl border cursor-pointer ${
                      paymentMethod === 'mpesa_intasend' || paymentMethod === 'mpesa_sandbox_sim'
                        ? 'border-zinc-950 bg-zinc-50'
                        : 'border-zinc-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={
                          paymentMethod === 'mpesa_intasend' ||
                          paymentMethod === 'mpesa_sandbox_sim'
                        }
                        onChange={() =>
                          setPaymentMethod(
                            paymentProvider.provider === 'intasend'
                              ? 'mpesa_intasend'
                              : 'mpesa_sandbox_sim'
                          )
                        }
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-950">
                          {paymentProvider.provider === 'intasend'
                            ? 'M-Pesa Express (STK Push)'
                            : 'M-Pesa STK Push (Non-Live Development Simulator)'}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {paymentProvider.provider === 'intasend'
                            ? 'A payment prompt will be sent to your Safaricom phone. Your order is confirmed once payment clears.'
                            : 'No live IntaSend keys are set in this environment. Submitting places a real pending order and lets you test payment confirmation outcomes.'}
                        </p>
                      </div>
                    </div>
                  </label>
                )}

                {settings?.allowPayOnDelivery && fulfilmentType === 'delivery' && (
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${
                      paymentMethod === 'pay_on_delivery'
                        ? 'border-zinc-950 bg-zinc-50'
                        : 'border-zinc-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'pay_on_delivery'}
                      onChange={() => setPaymentMethod('pay_on_delivery')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">Pay on Delivery</p>
                      <p className="text-xs text-zinc-600">
                        Settle via M-Pesa or cash upon rider delivery.
                      </p>
                    </div>
                  </label>
                )}

                {settings?.allowPayOnPickup && fulfilmentType === 'collection' && (
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${
                      paymentMethod === 'pay_on_pickup'
                        ? 'border-zinc-950 bg-zinc-50'
                        : 'border-zinc-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'pay_on_pickup'}
                      onChange={() => setPaymentMethod('pay_on_pickup')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">Pay on Pickup</p>
                      <p className="text-xs text-zinc-600">
                        Settle at the collection desk when collecting your order.
                      </p>
                    </div>
                  </label>
                )}

                {!paymentProvider.mpesaAvailable &&
                  !settings?.allowPayOnDelivery &&
                  !settings?.allowPayOnPickup && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
                      Online M-Pesa credentials are not configured yet and pay-on-delivery is off.
                      Configure IntaSend keys or enable pay-on-delivery/pickup in Admin.
                    </div>
                  )}
              </div>

              {(paymentMethod === 'mpesa_intasend' || paymentMethod === 'mpesa_sandbox_sim') && (
                <div className="pt-2 space-y-2 border-t border-zinc-100">
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDifferentPayer}
                      onChange={(e) => setUseDifferentPayer(e.target.checked)}
                    />
                    <span>Send the M-Pesa STK prompt to a different phone number</span>
                  </label>

                  {useDifferentPayer && (
                    <input
                      type="tel"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="Payer M-Pesa number (07XX XXX XXX)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                    />
                  )}
                </div>
              )}
            </section>

            <button
              type="submit"
              disabled={
                submitting ||
                quoting ||
                !quote ||
                !quote.fulfilmentValid ||
                quote.issues.length > 0
              }
              className="w-full py-4 px-6 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-45 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Placing Order...'
                  : quote
                    ? `Place Order · ${formatKsh(quote.totalCents)}`
                    : 'Place Order'}
              </span>
            </button>
          </form>

          {/* Right: Server-Authoritative Order Summary */}
          <aside className="lg:col-span-5 rounded-2xl bg-white border border-zinc-200 p-6 space-y-5 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-zinc-950">Order Summary</h2>

            {quote?.issues && quote.issues.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 space-y-1">
                {quote.issues.map((issue, idx) => (
                  <p key={idx}>{issue}</p>
                ))}
              </div>
            )}

            <div className="space-y-3 divide-y divide-zinc-100">
              {(quote?.lines ?? []).map((line) => (
                <div key={line.variantId} className="pt-3 first:pt-0 flex justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-zinc-950">{line.productName}</p>
                    <p className="text-xs text-zinc-500">
                      {line.variantLabel} × {line.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-zinc-950 tabular-nums">
                    {formatKsh(line.lineTotalCents)}
                  </p>
                </div>
              ))}
            </div>

            {/* Promo Code */}
            <form onSubmit={handleApplyPromo} className="pt-2 border-t border-zinc-200 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Promo code"
                  aria-label="Promo code"
                  className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 text-xs uppercase focus:outline-none focus:border-zinc-950"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {quote?.promoMessage && (
                <p className="text-xs text-zinc-600">{quote.promoMessage}</p>
              )}
            </form>

            {/* Totals Breakdown */}
            <dl className="border-t border-zinc-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums font-medium text-zinc-900">
                  {quoting ? '...' : formatKsh(quote?.subtotalCents ?? 0)}
                </dd>
              </div>
              {quote && quote.discountCents > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount ({quote.appliedPromoCode})</dt>
                  <dd className="tabular-nums font-medium">
                    -{formatKsh(quote.discountCents)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <dt>{fulfilmentType === 'delivery' ? 'Delivery Fee' : 'Collection Fee'}</dt>
                <dd className="tabular-nums font-medium text-zinc-900">
                  {quote?.fulfilmentValid
                    ? quote.deliveryFeeCents === 0
                      ? 'Free'
                      : formatKsh(quote.deliveryFeeCents)
                    : 'Select zone'}
                </dd>
              </div>
              {quote && quote.taxCents > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <dt>Tax</dt>
                  <dd className="tabular-nums font-medium text-zinc-900">
                    {formatKsh(quote.taxCents)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-zinc-950 border-t border-zinc-200 pt-3">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {quoting ? '...' : formatKsh(quote?.totalCents ?? 0)}
                </dd>
              </div>
            </dl>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              {settings?.taxLabel} · Stock is reserved for 20 minutes while awaiting M-Pesa
              confirmation.
            </p>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};
