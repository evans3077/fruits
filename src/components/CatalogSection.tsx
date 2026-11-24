import React from 'react';
import { Heart, Search, Star, X } from 'lucide-react';
import { ProductVisual } from './ProductVisual';
import type { FlavourFilter, Product, ProductCategory } from '../types';

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

const CATEGORIES: ('All Products' | ProductCategory)[] = [
  'All Products',
  'Single Bottles',
  'Multi-Packs',
  'Boxes & Bundles',
  'Merch & Gear',
];

const FLAVOUR_FILTERS: FlavourFilter[] = [
  'All',
  'Berry',
  'Kiwi',
  'Banana',
  'Strawberry',
  'Mixed',
];

interface CatalogSectionProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  selectedCategory: 'All Products' | ProductCategory;
  selectedFlavour: FlavourFilter;
  searchQuery: string;
  sortBy: SortOption;
  wishlistIds: string[];
  onCategoryChange: (cat: 'All Products' | ProductCategory) => void;
  onFlavourChange: (flavour: FlavourFilter) => void;
  onSearchChange: (q: string) => void;
  onSortChange: (sort: SortOption) => void;
  onResetFilters: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  products,
  loading,
  error,
  selectedCategory,
  selectedFlavour,
  searchQuery,
  sortBy,
  wishlistIds,
  onCategoryChange,
  onFlavourChange,
  onSearchChange,
  onSortChange,
  onResetFilters,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}) => {
  const hasActiveFilters =
    selectedCategory !== 'All Products' ||
    selectedFlavour !== 'All' ||
    searchQuery.trim().length > 0;

  return (
    <section id="catalog" className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-zinc-900/10">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            Cold-Pressed Collection
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 [text-wrap:balance]">
            Real fruit, bottled cold for your fridge
          </h2>
          <p className="mt-2 text-base text-zinc-600">
            Choose single 330ml glass bottles, build a tasting case, or pick up an insulated tote. Free chilled delivery over $40.
          </p>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="relative">
            <Search
              className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search flavours or fruit..."
              aria-label="Search products"
              className="w-full sm:w-64 h-10 pl-10 pr-8 text-sm bg-white border border-zinc-900/12 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Sort products"
            className="h-10 px-3.5 text-sm font-medium bg-white border border-zinc-900/12 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {/* Category & Flavour Controls */}
      <div className="py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Categories */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0"
          role="tablist"
          aria-label="Product categories"
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onCategoryChange(cat)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-900/[0.04] text-zinc-600 hover:text-zinc-950 hover:bg-zinc-900/[0.08]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Flavour filter bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-zinc-500 mr-1">Flavour:</span>
          {FLAVOUR_FILTERS.map((flavour) => {
            const active = selectedFlavour === flavour;
            return (
              <button
                key={flavour}
                type="button"
                onClick={() => onFlavourChange(flavour)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-zinc-950 border border-zinc-900/25 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950 border border-transparent hover:bg-zinc-900/[0.04]'
                }`}
              >
                {flavour}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-6 flex items-center justify-between text-xs text-zinc-500 tabular-nums">
        <span>
          Showing {products.length} {products.length === 1 ? 'item' : 'items'}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="font-medium text-zinc-800 hover:underline cursor-pointer"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-white border border-zinc-900/8 overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-zinc-100" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-28 bg-zinc-100 rounded" />
                <div className="h-5 w-48 bg-zinc-100 rounded" />
                <div className="h-4 w-24 bg-zinc-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="py-16 px-6 text-center rounded-xl bg-white border border-zinc-900/10">
          <p className="text-lg font-semibold text-zinc-900">No smoothies match those filters</p>
          <p className="mt-1 text-sm text-zinc-500">
            Try clearing your search or switching back to all flavours.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 px-5 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Show All Products
          </button>
        </div>
      )}

      {/* Product Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {products.map((product) => {
            const isWishlisted = wishlistIds.includes(product.id);
            const isOutOfStock = product.stock <= 0;

            return (
              <article
                key={product.id}
                className="group flex flex-col bg-white border border-zinc-900/10 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(24,24,27,0.06)]"
              >
                {/* Visual Area */}
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    aria-label={`View details for ${product.name}`}
                    className="w-full h-full block text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                  >
                    <ProductVisual
                      visualType={product.visualType}
                      flavourIds={product.flavourIds}
                      imageKey={product.imageKey}
                      alt={product.name}
                      bgTint={product.bgTint}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleWishlist(product.id)}
                    aria-label={
                      isWishlisted
                        ? `Remove ${product.name} from wishlist`
                        : `Save ${product.name} to wishlist`
                    }
                    className="absolute top-3 right-3 w-10 h-10 rounded-lg bg-white/90 backdrop-blur-xs border border-zinc-900/10 flex items-center justify-center text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isWishlisted ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    {/* Quiet unboxed metadata line */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="uppercase tracking-wider">{product.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{product.nutrition.volume}</span>
                      {product.tag && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-zinc-800 font-medium">{product.tag}</span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="mt-1.5 text-left block cursor-pointer"
                    >
                      <h3 className="text-base font-semibold text-zinc-950 group-hover:underline decoration-zinc-400 underline-offset-4">
                        {product.name}
                      </h3>
                    </button>

                    <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
                      {product.tagline}
                    </p>
                  </div>

                  {/* Rating + Price + Action */}
                  <div className="pt-3 border-t border-zinc-900/8 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2 tabular-nums">
                        <span className="text-[15px] font-semibold text-zinc-950">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.compareAtPrice && (
                          <span className="text-xs text-zinc-400 line-through">
                            ${product.compareAtPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                        <span className="font-medium text-zinc-800">{product.rating.toFixed(1)}</span>
                        <span>({product.reviewCount})</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => onQuickAdd(product)}
                      className="px-4 py-2.5 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
