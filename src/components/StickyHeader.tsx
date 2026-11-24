import React, { useEffect, useState } from 'react';

interface StickyHeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onSelectBundles: () => void;
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
  cartCount,
  onOpenCart,
  onOpenAccount,
  onSelectBundles,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.78);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 h-12 md:h-14 bg-[#FAF9F7]/95 backdrop-blur-md border-b border-zinc-900/10 transition-all duration-200 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title */}
        <a
          href="#top"
          className="font-brand text-2xl font-extrabold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
        >
          Blendy
        </a>

        {/* Zone 2: 4 Concise Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
          <a
            href="#catalog"
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            Shop All
          </a>
          <a
            href="#catalog"
            onClick={() => onSelectBundles()}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            Boxes & Bundles
          </a>
          <a
            href="#craft"
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            Our Craft
          </a>
          <button
            type="button"
            onClick={onOpenAccount}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Orders & Account
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer"
          >
            {cartCount > 0 ? `Bag (${cartCount})` : 'Bag'}
          </button>
        </div>
      </div>
    </header>
  );
};
