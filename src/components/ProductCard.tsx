import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { formatKsh } from '../lib/kenya';
import { trackStoreEvent } from '../services/analytics';
import type { ProductDto } from '../types';
import { ProductVisual } from './ProductVisual';

interface ProductCardProps {
  product: ProductDto;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useStore();
  const activeVariants = product.variants.filter((v) => v.isActive);
  const pricedVariants = activeVariants.filter((v) => v.priceCents > 0);
  const primaryVariant = pricedVariants[0] ?? activeVariants[0] ?? null;

  const minPrice =
    pricedVariants.length > 0
      ? Math.min(...pricedVariants.map((v) => v.priceCents))
      : 0;
  const totalAvailable = activeVariants.reduce((sum, v) => sum + v.availableQty, 0);

  const canQuickAdd =
    product.status === 'published' &&
    primaryVariant !== null &&
    primaryVariant.priceCents > 0 &&
    primaryVariant.availableQty > 0;

  return (
    <article className="group flex flex-col bg-white rounded-2xl border border-zinc-200/80 overflow-hidden transition-shadow hover:shadow-md">
      <Link
        to={`/shop/${product.slug}`}
        onClick={() =>
          trackStoreEvent('select_item', {
            item_id: product.id,
            item_name: product.name,
          })
        }
        className="block aspect-[4/5] w-full overflow-hidden"
      >
        <ProductVisual
          heroSpecKey={product.heroSpecKey}
          imageUrl={product.imageUrl}
          alt={product.imageAlt || product.name}
          bgTint={product.bgTint}
        />
      </Link>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {[product.flavour, product.volumeLabel].filter(Boolean).join(' · ')}
            {product.status !== 'published' ? ` · ${product.status}` : ''}
          </p>
          <h3 className="text-lg font-semibold text-zinc-950 leading-snug">
            <Link to={`/shop/${product.slug}`} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          {product.shortDescription && (
            <p className="text-sm text-zinc-600 line-clamp-2 leading-relaxed">
              {product.shortDescription}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-3">
          <div>
            {minPrice > 0 ? (
              <p className="text-base font-semibold text-zinc-950 tabular-nums">
                {pricedVariants.length > 1 ? `From ${formatKsh(minPrice)}` : formatKsh(minPrice)}
              </p>
            ) : (
              <p className="text-sm font-medium text-zinc-500">Price not set</p>
            )}
            <p className="text-xs text-zinc-500 mt-0.5">
              {totalAvailable > 0 ? `${totalAvailable} in stock` : 'Out of stock'}
            </p>
          </div>

          {canQuickAdd ? (
            <button
              type="button"
              onClick={() =>
                addToCart(
                  {
                    productId: product.id,
                    variantId: primaryVariant.id,
                    quantity: 1,
                  },
                  {
                    name: product.name,
                    variantLabel: primaryVariant.label,
                    priceCents: primaryVariant.priceCents,
                  }
                )
              }
              className="px-4 py-2.5 min-h-10 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Add to Bag
            </button>
          ) : (
            <Link
              to={`/shop/${product.slug}`}
              className="px-4 py-2.5 min-h-10 inline-flex items-center rounded-xl border border-zinc-300 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              View
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};
