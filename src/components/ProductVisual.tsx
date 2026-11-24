import React from 'react';
import { FLAVOUR_MAP } from '../data/flavours';
import type { FlavourId } from '../types';

interface ProductVisualProps {
  heroSpecKey: FlavourId | null;
  imageUrl?: string;
  alt: string;
  bgTint?: string;
  compact?: boolean;
}

function BottleSprite({ flavourId, className = '' }: { flavourId: FlavourId; className?: string }) {
  const spec = FLAVOUR_MAP[flavourId];
  const [bx, by, bw, bh] = spec.items[0];
  const bgSizeX = (2048 / bw) * 100;
  const bgSizeY = (2048 / bh) * 100;
  const posX = (bx / (2048 - bw)) * 100;
  const posY = (by / (2048 - bh)) * 100;

  return (
    <div
      role="img"
      aria-label={`${spec.word} smoothie bottle`}
      className={className}
      style={{
        aspectRatio: `${bw} / ${bh}`,
        backgroundImage: `url("${spec.sheet}")`,
        backgroundSize: `${bgSizeX.toFixed(4)}% ${bgSizeY.toFixed(4)}%`,
        backgroundPosition: `${posX.toFixed(4)}% ${posY.toFixed(4)}%`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

export const ProductVisual: React.FC<ProductVisualProps> = ({
  heroSpecKey,
  imageUrl,
  alt,
  bgTint = '#FAF9F7',
  compact = false,
}) => {
  if (imageUrl && imageUrl.trim()) {
    return (
      <div
        className="relative w-full h-full overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: bgTint || '#FAF9F7' }}
      >
        <img
          src={imageUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  if (heroSpecKey && FLAVOUR_MAP[heroSpecKey]) {
    return (
      <div
        className="relative w-full h-full overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: bgTint || FLAVOUR_MAP[heroSpecKey].bg }}
      >
        <BottleSprite
          flavourId={heroSpecKey}
          className={`${
            compact ? 'h-[82%]' : 'h-[80%]'
          } drop-shadow-[0_14px_20px_rgba(60,40,80,0.15)] transition-transform duration-300 group-hover:-translate-y-1`}
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden flex items-center justify-center p-4 text-center"
      style={{ backgroundColor: bgTint || '#F4F4F5' }}
    >
      <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        {alt || 'Blendy Product'}
      </span>
    </div>
  );
};
