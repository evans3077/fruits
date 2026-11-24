import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { BlendyBottleScene } from '../components/three/BlendyBottleScene';
import { useStore } from '../context/StoreContext';
import { formatKsh } from '../lib/kenya';
import { useDocumentMeta } from '../lib/useDocumentMeta';

export const Studio3DPage: React.FC = () => {
  const { products, addToCart, loading } = useStore();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  useDocumentMeta(
    '3D Bottle Studio — Blendy Kenya',
    'Inspect Blendy Berry, Kiwi, Banana, and Strawberry bottles in interactive 3D and compare 330ml and 1L sizes.'
  );

  useEffect(() => {
    if (products.length > 0 && selectedProductId === null) {
      setSelectedProductId(products[0].id);
      const v = products[0].variants[0];
      if (v) setSelectedVariantId(v.id);
    }
  }, [products, selectedProductId]);

  const activeProduct =
    products.find((p) => p.id === selectedProductId) ?? products[0] ?? null;

  const activeVariant =
    activeProduct?.variants.find((v) => v.id === selectedVariantId) ??
    activeProduct?.variants[0] ??
    null;

  const handleSelectProduct = (productId: number) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    const matchingSize = prod?.variants.find((v) => v.label === activeVariant?.label);
    setSelectedVariantId((matchingSize ?? prod?.variants[0])?.id ?? null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Interactive WebGL Studio
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 mt-1">
              3D Smoothie Bottle Studio
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Drag to orbit, scroll to zoom, switch between 330ml &amp; 1L bottles, or inspect layers with Explode.
            </p>
          </div>
          <Link
            to="/shop"
            className="text-sm font-semibold text-zinc-900 underline underline-offset-4 hover:text-zinc-600"
          >
            Back to Full Catalogue
          </Link>
        </div>

        {loading || !activeProduct ? (
          <div className="h-[540px] rounded-3xl bg-zinc-200/70 animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* 3D Canvas Stage */}
            <div className="lg:col-span-7 h-[460px] sm:h-[580px] rounded-3xl overflow-hidden border border-zinc-200 bg-white">
              <BlendyBottleScene
                flavourName={activeProduct.flavour}
                heroSpecKey={activeProduct.heroSpecKey}
                bgTint={activeProduct.bgTint}
                sizeLabel={activeVariant?.label || '330ml Bottle'}
                nutritionJson={activeProduct.nutritionJson}
              />
            </div>

            {/* Flavour, Size & Nutrition Controls */}
            <aside className="lg:col-span-5 rounded-3xl bg-white border border-zinc-200 p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  1. Choose Flavour
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {products.map((prod) => {
                    const active = prod.id === activeProduct.id;
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleSelectProduct(prod.id)}
                        className={`px-3.5 py-2.5 rounded-xl border text-left text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2.5 ${
                          active
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: prod.bgTint || '#DDD6FE' }}
                        />
                        <span className="truncate">{prod.flavour}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  2. Bottle Size &amp; Price (KES)
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {activeProduct.variants.map((v) => {
                    const active = v.id === activeVariant?.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{v.label}</span>
                        <span
                          className={`block text-xs tabular-nums mt-0.5 ${
                            active ? 'text-zinc-300' : 'text-zinc-500'
                          }`}
                        >
                          {formatKsh(v.priceCents)} ·{' '}
                          {v.availableQty > 0 ? `${v.availableQty} left` : 'Out of stock'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 border-t border-zinc-100 pt-4">
                <h2 className="text-lg font-bold text-zinc-950">{activeProduct.name}</h2>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  {activeProduct.shortDescription}
                </p>
                {activeProduct.ingredientsText && (
                  <p className="text-xs text-zinc-500 pt-1">
                    <strong>Ingredients:</strong> {activeProduct.ingredientsText}
                  </p>
                )}
              </div>

              {Object.keys(activeProduct.nutritionJson || {}).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Nutrition Facts
                  </p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs bg-[#FAF9F7] rounded-xl p-3.5 border border-zinc-200">
                    {Object.entries(activeProduct.nutritionJson).map(([k, v]) => (
                      <React.Fragment key={k}>
                        <dt className="text-zinc-600">{k}</dt>
                        <dd className="font-semibold text-zinc-950 text-right">{v}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  disabled={!activeVariant || activeVariant.availableQty <= 0}
                  onClick={() => {
                    if (!activeVariant) return;
                    addToCart(
                      {
                        productId: activeProduct.id,
                        variantId: activeVariant.id,
                        quantity: 1,
                      },
                      {
                        name: activeProduct.name,
                        variantLabel: activeVariant.label,
                        priceCents: activeVariant.priceCents,
                      }
                    );
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-45 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {activeVariant && activeVariant.availableQty > 0
                      ? `Add ${activeVariant.label} · ${formatKsh(activeVariant.priceCents)}`
                      : 'Out of Stock'}
                  </span>
                </button>
                <Link
                  to={`/shop/${activeProduct.slug}`}
                  className="py-3 px-4 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  Details
                </Link>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
