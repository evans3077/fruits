import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, ShieldCheck, Smartphone } from 'lucide-react';
import { Footer } from '../components/Footer';
import { HeroSlider } from '../components/HeroSlider';
import { Navbar } from '../components/Navbar';
import { ProductCard } from '../components/ProductCard';
import { FLAVOURS } from '../data/flavours';
import { useStore } from '../context/StoreContext';
import { formatKsh } from '../lib/kenya';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { trackStoreEvent } from '../services/analytics';
import type { FlavourId } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    settings,
    products,
    deliveryZones,
    collectionPoints,
    testimonials,
    cartCount,
    setCartDrawerOpen,
    profile,
    firebaseUser,
  } = useStore();

  useDocumentMeta(
    `${settings?.brandName || 'Blendy'} — ${settings?.strapline || 'Real fruit smoothies'}`,
    'Discover Blendy real fruit smoothies in Kenya: Berry, Kiwi, Banana, and Strawberry.'
  );

  useEffect(() => {
    if (products.length > 0) {
      trackStoreEvent('view_item_list', {
        item_list_name: 'home_featured',
        items: products.map((p) => ({ item_id: p.id, item_name: p.name })),
      });
    }
  }, [products]);

  const handleShopFlavour = (flavourId: FlavourId) => {
    const match = products.find(
      (p) => p.heroSpecKey === flavourId || p.flavour.toLowerCase() === flavourId
    );
    if (match) {
      navigate(`/shop/${match.slug}`);
      return;
    }
    const spec = FLAVOURS.find((f) => f.id === flavourId);
    navigate(spec ? `/shop?flavour=${encodeURIComponent(spec.word)}` : '/shop');
  };

  const userName =
    profile?.displayName || firebaseUser?.displayName || firebaseUser?.email || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <HeroSlider
        cartCount={cartCount}
        userName={userName}
        onOpenCart={() => setCartDrawerOpen(true)}
        onOpenAccount={() => navigate('/account')}
        onShopFlavour={handleShopFlavour}
      />

      <Navbar alwaysVisible={false} />

      {/* Featured Published Smoothies */}
      <section id="home-catalogue" className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Direct Online Storefront · KES
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 mt-1">
              Signature Fruit Smoothies
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors"
          >
            <span>View Full Shop</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 sm:p-10 space-y-6">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Catalogue Configuration Pending
              </p>
              <h3 className="text-2xl font-bold text-zinc-950">
                The 4 core Blendy flavours are saved as drafts
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Berry, Kiwi, Banana, and Strawberry are ready in the store database without invented
                prices or ingredients. Sign in as the store owner in Admin to set verified KSh pricing,
                stock, and publish them live—or load clearly marked test prices for verification.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {FLAVOURS.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl p-4 border border-zinc-200/80"
                  style={{ backgroundColor: `${f.bg}33` }}
                >
                  <p className="font-semibold text-zinc-900">{f.word}</p>
                  <p className="text-xs text-zinc-600 mt-1">Draft · Price pending</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800"
              >
                Open Store Admin
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Visit Shop Page
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* How Kenyan Ordering Works */}
      <section className="border-y border-zinc-200/80 bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Ordering &amp; Payment
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 mt-1">
              Built for fast Kenyan mobile checkout
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-950">
                1. Guest checkout with Kenyan mobile
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Order without creating an account using your 07xx or 01xx mobile number, or sign in
                with Google to keep your order history in one place.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-950">
                2. Delivery estate or pickup point
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Select an active Kenyan county, town, and estate with landmark instructions, or pick
                up directly from an active store collection point.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-950">
                3. Verified M-Pesa confirmation
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Orders are only confirmed paid once our server verifies the payment provider callback
                or status check—never on STK initiation alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Coverage Teaser */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Fulfilment Coverage
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 mt-1">
              Delivery zones &amp; collection points
            </h2>
          </div>
          <Link
            to="/delivery"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-600"
          >
            <span>See all coverage details</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {deliveryZones.length > 0 || collectionPoints.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {deliveryZones.slice(0, 4).map((z) => (
              <div key={z.id} className="rounded-2xl bg-white border border-zinc-200 p-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Delivery · {z.county}
                </p>
                <h3 className="text-base font-semibold text-zinc-950">{z.areaLabel}</h3>
                <p className="text-sm text-zinc-700 tabular-nums">
                  Fee: {z.feeCents === 0 ? 'Free' : formatKsh(z.feeCents)}
                  {z.freeThresholdCents !== null
                    ? ` · Free over ${formatKsh(z.freeThresholdCents)}`
                    : ''}
                </p>
                <p className="text-xs text-zinc-500">{z.estimateText}</p>
              </div>
            ))}
            {collectionPoints.slice(0, 2).map((cp) => (
              <div key={cp.id} className="rounded-2xl bg-white border border-zinc-200 p-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Pickup Point · {cp.county}
                </p>
                <h3 className="text-base font-semibold text-zinc-950">{cp.name}</h3>
                <p className="text-sm text-zinc-700">{cp.addressLine}</p>
                <p className="text-xs text-zinc-500">
                  {cp.hoursText || 'Pickup hours configured by store'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-zinc-200 p-6 text-sm text-zinc-600">
            Delivery zones and pickup collection points have not been configured yet. Store owners
            can add Kenyan counties, towns, and delivery fees in{' '}
            <Link to="/admin" className="font-semibold text-zinc-950 underline">
              Admin → Delivery &amp; Pickup
            </Link>
            .
          </div>
        )}
      </section>

      {/* Approved Testimonials (Only shown when real approved quotes exist) */}
      {testimonials.length > 0 && (
        <section className="border-t border-zinc-200/80 bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 mb-8">
              Customer Notes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.slice(0, 6).map((t) => (
                <blockquote
                  key={t.id}
                  className="rounded-2xl border border-zinc-200 bg-[#FAF9F7] p-6 space-y-3"
                >
                  <p className="text-sm text-zinc-800 leading-relaxed">“{t.quote}”</p>
                  <footer className="text-xs font-medium text-zinc-500">
                    {t.authorName}
                    {t.locationLabel ? ` · ${t.locationLabel}` : ''}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};
