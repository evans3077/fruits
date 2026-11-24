import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { trackStoreEvent } from '../services/analytics';
import type { ProductDto } from '../types';

const FLAVOUR_FILTERS = ['All', 'Berry', 'Kiwi', 'Banana', 'Strawberry'];

export const ShopPage: React.FC = () => {
  const { authFetch, profile } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [flavour, setFlavour] = useState(() => searchParams.get('flavour') || 'All');
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [sort, setSort] = useState(() => searchParams.get('sort') || 'featured');
  const [inStockOnly, setInStockOnly] = useState(() => searchParams.get('inStock') === '1');
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<ProductDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isStaff = Boolean(
    profile && ['owner', 'manager', 'fulfilment_staff'].includes(profile.role)
  );

  useDocumentMeta(
    'Shop Smoothies — Blendy Kenya',
    'Browse published Blendy fruit smoothie flavours and pack sizes in Kenyan Shillings.'
  );

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (flavour !== 'All') nextParams.set('flavour', flavour);
    if (query.trim()) nextParams.set('q', query.trim());
    if (sort !== 'featured') nextParams.set('sort', sort);
    if (inStockOnly) nextParams.set('inStock', '1');
    setSearchParams(nextParams, { replace: true });
  }, [flavour, query, sort, inStockOnly, setSearchParams]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          flavour,
          q: query.trim(),
          sort,
          inStock: inStockOnly ? '1' : '0',
          includeDrafts: isStaff && includeDrafts ? '1' : '0',
          page: String(page),
          limit: '12',
        });
        const res = await authFetch(`/api/products?${qs.toString()}`);
        if (!res.ok) throw new Error('Unable to load catalogue.');
        const data = await res.json();
        if (!active) return;
        const list = Array.isArray(data.products) ? (data.products as ProductDto[]) : [];
        setItems(list);
        setTotal(Number(data.total || 0));
        trackStoreEvent('view_item_list', {
          item_list_name: 'shop_catalogue',
          items: list.map((p) => ({ item_id: p.id, item_name: p.name })),
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load catalogue.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [authFetch, flavour, query, sort, inStockOnly, includeDrafts, isStaff, page]);

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Blendy Catalogue · Kenyan Shillings (KSh)
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 mt-1">
              Shop Real Fruit Smoothies
            </h1>
          </div>
          {isStaff && (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDrafts}
                onChange={(e) => {
                  setIncludeDrafts(e.target.checked);
                  setPage(1);
                }}
              />
              <span>Staff preview: include draft products</span>
            </label>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {FLAVOUR_FILTERS.map((f) => {
              const active = flavour.toLowerCase() === f.toLowerCase();
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFlavour(f);
                    setPage(1);
                  }}
                  className={`px-4 py-2 min-h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search smoothies..."
                aria-label="Search smoothies"
                className="w-full pl-9 pr-3 py-2 min-h-10 rounded-lg bg-white border border-zinc-200 text-sm focus:outline-none focus:border-zinc-900"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort products"
              className="px-3 py-2 min-h-10 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-800 focus:outline-none focus:border-zinc-900"
            >
              <option value="featured">Featured order</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>

            <label className="inline-flex items-center gap-2 text-sm text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setPage(1);
                }}
              />
              <span>In stock only</span>
            </label>
          </div>
        </div>

        {/* Grid / States */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-96 rounded-2xl bg-zinc-200/60 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center space-y-3">
            <h2 className="text-lg font-semibold text-zinc-950">No matching published smoothies</h2>
            <p className="text-sm text-zinc-600 max-w-md mx-auto">
              Either your filter matched no items, or products are still in draft status awaiting
              owner pricing and publication in the Admin console.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              {flavour !== 'All' || query || inStockOnly ? (
                <button
                  type="button"
                  onClick={() => {
                    setFlavour('All');
                    setQuery('');
                    setInStockOnly(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium cursor-pointer"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  to="/admin"
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium"
                >
                  Manage Catalogue in Admin
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {items.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-600 tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};
