import React from 'react';
import { craftPressImg } from '../data/productImages';

interface CraftSectionProps {
  onShopBundles: () => void;
}

export const CraftSection: React.FC<CraftSectionProps> = ({ onShopBundles }) => {
  return (
    <section
      id="craft"
      className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-900/10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        <div className="lg:col-span-6 rounded-2xl overflow-hidden bg-zinc-100">
          <img
            src={craftPressImg}
            alt="Fresh blueberries, raspberries, sliced green kiwi, strawberries, and chilled Blendy smoothie bottles on a limestone counter"
            referrerPolicy="no-referrer"
            className="w-full h-full min-h-[320px] object-cover"
          />
        </div>

        <div className="lg:col-span-6 flex flex-col justify-center py-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            Pressed Cold, Bottled in Glass
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 [text-wrap:balance]">
            Whole orchard fruit, never cooked or concentrated
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            Every Blendy bottle starts with whole berries, green Hayward kiwi, ripe bananas, or Albion strawberries crushed cold and sealed in recyclable glass. Instead of heat pasteurization, we chill-press in small daily batches so natural colour, aroma, and vitamin C stay bright.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-zinc-900/10 tabular-nums">
            <div>
              <div className="text-2xl font-bold text-zinc-950">100%</div>
              <div className="mt-1 text-xs text-zinc-500">Whole pressed fruit</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-950">0g</div>
              <div className="mt-1 text-xs text-zinc-500">Added sugar or gums</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-950">48h</div>
              <div className="mt-1 text-xs text-zinc-500">Harvest to bottle</div>
            </div>
          </div>

          <div className="mt-8">
            <a
              href="#catalog"
              onClick={onShopBundles}
              className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Build a Tasting Crate
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
