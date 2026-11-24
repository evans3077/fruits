import React from 'react';
import { FLAVOUR_MAP } from '../data/flavours';
import { PRODUCT_PHOTO_MAP } from '../data/productImages';
import type { FlavourId } from '../types';

interface ProductVisualProps {
  visualType: 'sprite' | 'duo-sprite' | 'photo';
  flavourIds: FlavourId[];
  imageKey?: 'variety-pack' | 'tasting-crate' | 'craft-press' | 'cooler-tote';
  alt: string;
  bgTint: string;
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
  visualType,
  flavourIds,
  imageKey,
  alt,
  bgTint,
  compact = false,
}) => {
  if (visualType === 'photo' && imageKey && PRODUCT_PHOTO_MAP[imageKey]) {
    return (
      <div
        className="relative w-full h-full overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: bgTint }}
      >
        <img
          src={PRODUCT_PHOTO_MAP[imageKey]}
          alt={alt}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  if (visualType === 'duo-sprite' && flavourIds.length >= 2) {
    return (
      <div
        className="relative w-full h-full overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: bgTint }}
      >
        <div
          className={`flex items-end justify-center ${
            compact ? 'h-[78%] gap-0.5' : 'h-[78%] -space-x-4'
          }`}
        >
          <BottleSprite
            flavourId={flavourIds[0]}
            className="h-full drop-shadow-[0_12px_18px_rgba(60,40,80,0.14)] -rotate-3 transition-transform duration-300 group-hover:-translate-y-1"
          />
          <BottleSprite
            flavourId={flavourIds[1]}
            className="h-full drop-shadow-[0_12px_18px_rgba(60,40,80,0.14)] rotate-3 transition-transform duration-300 group-hover:-translate-y-1"
          />
        </div>
      </div>
    );
  }

  const primaryFlavour = flavourIds[0] ?? 'berry';
  return (
    <div
      className="relative w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: bgTint }}
    >
      <BottleSprite
        flavourId={primaryFlavour}
        className={`${
          compact ? 'h-[82%]' : 'h-[80%]'
        } drop-shadow-[0_14px_20px_rgba(60,40,80,0.15)] transition-transform duration-300 group-hover:-translate-y-1`}
      />
    </div>
  );
};
