import React, { useEffect, useRef } from 'react';
import { FLAVOURS, SHADOWS } from '../data/flavours';
import type { AuthUser, FlavourFilter } from '../types';

const COVER_TABLE: [number, number][] = [
  [0, 0],
  [0.031, 0.006],
  [0.134, 0.012],
  [0.206, 0.023],
  [0.278, 0.047],
  [0.34, 0.07],
  [0.412, 0.105],
  [0.485, 0.158],
  [0.546, 0.246],
  [0.583, 0.55],
  [0.62, 0.825],
  [0.69, 0.9],
  [0.79, 0.94],
  [0.85, 0.956],
  [0.93, 0.975],
  [1, 1],
];

const LAYER_FACTORS: Record<'word' | 'shadow' | 'bottle' | 'fruit' | 'corner', number> = {
  word: 0.4,
  shadow: 0.3,
  bottle: 0.15,
  fruit: 0.55,
  corner: 0.75,
};

const LAYER_NAMES = ['word', 'shadow', 'bottle', 'fruit', 'corner'] as const;
type LayerName = (typeof LAYER_NAMES)[number];

const TRANSITION_MS = 970;
const AUTOPLAY_INTERVAL_MS = 2600;
const INTERACTION_PAUSE_MS = 6000;

interface HeroSliderProps {
  cartCount: number;
  user: AuthUser | null;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onShopFlavour: (flavour: FlavourFilter) => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  cartCount,
  user,
  onOpenCart,
  onOpenAccount,
  onShopFlavour,
}) => {
  const stageRef = useRef<HTMLElement | null>(null);
  const tabsRef = useRef<HTMLElement | null>(null);
  const underlineRef = useRef<HTMLSpanElement | null>(null);
  const prevBtnRef = useRef<HTMLButtonElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const activeFlavourIdxRef = useRef<number>(0);

  useEffect(() => {
    const rootEl = document.documentElement;
    const stageEl = stageRef.current;
    const tabsEl = tabsRef.current;
    const underlineEl = underlineRef.current;
    const prevBtn = prevBtnRef.current;
    const nextBtn = nextBtnRef.current;
    if (!stageEl || !tabsEl || !underlineEl || !prevBtn || !nextBtn) return;

    // Clear previous slides if remounted in React StrictMode
    stageEl.innerHTML = '';

    const tabButtons = Array.from(tabsEl.querySelectorAll<HTMLButtonElement>('.blendy-tab'));
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = () => reducedMotionQuery.matches;

    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');

    let currentIndex = 0;
    let isTransitioning = false;
    let lastInteraction = 0;
    let currentU = 1;
    let isMobileLayout = false;
    let openingAnimations: Animation[] = [];
    let openingFinished = false;
    let disposed = false;

    function applySpriteCrop(
      el: HTMLElement,
      sheet: string,
      box: [number, number, number, number],
      targetW: number
    ) {
      const [bx, by, bw, bh] = box;
      const s = targetW / bw;
      const h = bh * s;
      const bgSize = 2048 * s;
      const posX = -bx * s;
      const posY = -by * s;

      el.style.width = `calc(${targetW} * var(--u))`;
      el.style.height = `calc(${h.toFixed(4)} * var(--u))`;
      el.style.backgroundImage = `url("${sheet}")`;
      el.style.backgroundSize = `calc(${bgSize.toFixed(4)} * var(--u)) calc(${bgSize.toFixed(4)} * var(--u))`;
      el.style.backgroundPosition = `calc(${posX.toFixed(4)} * var(--u)) calc(${posY.toFixed(4)} * var(--u))`;
    }

    const slideRefs = FLAVOURS.map((flavour, idx) => {
      const section = document.createElement('section');
      section.className = 'blendy-slide' + (idx === 0 ? ' is-active' : '');
      section.style.backgroundColor = flavour.bg;
      section.setAttribute('aria-hidden', idx === 0 ? 'false' : 'true');

      const frame = document.createElement('div');
      frame.className = 'blendy-frame';

      const layers = {} as Record<LayerName, HTMLDivElement>;
      for (const name of LAYER_NAMES) {
        const layer = document.createElement('div');
        layer.className = `blendy-layer blendy-layer-${name}`;
        layers[name] = layer;
        frame.appendChild(layer);
      }

      const wordEl = document.createElement('div');
      wordEl.className = 'blendy-word';
      wordEl.textContent = flavour.word;
      layers.word.appendChild(wordEl);

      for (const [cx, cy, w, h] of SHADOWS) {
        const shadowEl = document.createElement('div');
        shadowEl.className = 'blendy-floor-shadow';
        shadowEl.style.left = `calc(${cx - w / 2} * var(--u))`;
        shadowEl.style.top = `calc(${cy - h / 2} * var(--u))`;
        shadowEl.style.width = `calc(${w} * var(--u))`;
        shadowEl.style.height = `calc(${h} * var(--u))`;
        layers.shadow.appendChild(shadowEl);
      }

      const bottleEl = document.createElement('div');
      bottleEl.className = 'blendy-bottle';
      bottleEl.style.left = `calc(${flavour.bottle.x} * var(--u))`;
      bottleEl.style.top = `calc(${flavour.bottle.y} * var(--u))`;
      applySpriteCrop(bottleEl, flavour.sheet, flavour.items[0], flavour.bottle.w);
      layers.bottle.appendChild(bottleEl);

      for (const p of flavour.pieces) {
        const box = flavour.items[p.item];
        const s = p.w / box[2];
        const h = box[3] * s;

        const outer = document.createElement('div');
        outer.className = 'blendy-piece';
        outer.style.left = `calc(${p.x} * var(--u))`;
        outer.style.top = `calc(${p.y} * var(--u))`;
        outer.style.width = `calc(${p.w} * var(--u))`;
        outer.style.height = `calc(${h.toFixed(4)} * var(--u))`;
        if (p.mirror) {
          outer.style.transform = 'scaleX(-1)';
        }

        const inner = document.createElement('div');
        inner.className = 'blendy-piece-inner';
        applySpriteCrop(inner, flavour.sheet, box, p.w);
        inner.style.setProperty('--rot', `${p.rot}deg`);

        const dur = (3.2 + Math.random() * 1.8).toFixed(3);
        const delay = (-Math.random() * 4).toFixed(3);
        inner.style.setProperty('--dur', `${dur}s`);
        inner.style.setProperty('--delay', `${delay}s`);

        outer.appendChild(inner);
        layers[p.layer].appendChild(outer);
      }

      section.appendChild(frame);
      stageEl.appendChild(section);

      return { flavour, section, frame, layers, wordEl };
    });

    function measureInkWidthAt100(word: string, letterSpacingEm: number) {
      if (!measureCtx) return word.length * 60;
      measureCtx.font = '700 100px Poppins, system-ui, sans-serif';
      const lsPx = letterSpacingEm * 100;
      if ('letterSpacing' in measureCtx) {
        (measureCtx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${lsPx}px`;
      }
      const m = measureCtx.measureText(word);
      let width =
        typeof m.actualBoundingBoxLeft === 'number' &&
        typeof m.actualBoundingBoxRight === 'number'
          ? m.actualBoundingBoxLeft + m.actualBoundingBoxRight
          : m.width;
      if (!('letterSpacing' in measureCtx) && word.length > 1) {
        width += (word.length - 1) * lsPx;
      }
      return width;
    }

    function layoutWords(vw: number) {
      const visibleMaxWidth = isMobileLayout
        ? Math.min(1440, vw / currentU) * 0.92
        : 1400;

      for (const ref of slideRefs) {
        const word = ref.flavour.word;
        const defaultInk100 = measureInkWidthAt100(word, 0.005);
        const isLongWord = defaultInk100 * 4.45 > 1330;
        const lsEm = isLongWord ? -0.035 : 0.005;
        const ink100 = isLongWord ? measureInkWidthAt100(word, lsEm) : defaultInk100;

        const maxFitSize = ink100 > 0 ? (visibleMaxWidth / ink100) * 100 : 445;
        const F = Math.min(445, maxFitSize);

        const baseline = 403.5 + 0.698 * (F / 2);
        const top = baseline - 0.85 * F;

        ref.wordEl.style.fontSize = `calc(${F.toFixed(3)} * var(--u))`;
        ref.wordEl.style.letterSpacing = `${lsEm}em`;
        ref.wordEl.style.top = `calc(${top.toFixed(3)} * var(--u))`;
      }
    }

    function updateUnderline(index: number) {
      const activeTab = tabButtons[index];
      if (!activeTab || !underlineEl) return;
      underlineEl.style.width = `${activeTab.offsetWidth}px`;
      underlineEl.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      tabButtons.forEach((btn, i) => {
        if (i === index) {
          btn.setAttribute('aria-current', 'true');
        } else {
          btn.removeAttribute('aria-current');
        }
      });
    }

    function layout() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      isMobileLayout = vw <= 820 || vh > vw;
      rootEl.classList.toggle('is-mobile', isMobileLayout);

      const u = isMobileLayout
        ? Math.max(0.1, Math.min(vw / 640, (vh - 200) / 620))
        : Math.min(vw / 1440, vh / 900);
      const fy = isMobileLayout ? 8 : 0;

      currentU = u;
      rootEl.style.setProperty('--u', `${u}px`);
      rootEl.style.setProperty('--fy', `${fy}px`);

      layoutWords(vw);
      updateUnderline(currentIndex);
    }

    function cover(t: number) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      for (let i = 0; i < COVER_TABLE.length - 1; i++) {
        const [t0, c0] = COVER_TABLE[i];
        const [t1, c1] = COVER_TABLE[i + 1];
        if (t >= t0 && t <= t1) {
          const k = (t - t0) / (t1 - t0);
          const s = k * k * (3 - 2 * k);
          return c0 + (c1 - c0) * s;
        }
      }
      return 1;
    }

    function cancelOpeningAnimations() {
      if (openingAnimations.length > 0) {
        for (const anim of openingAnimations) anim.cancel();
        openingAnimations = [];
      }
      for (const name of LAYER_NAMES) {
        slideRefs[0].layers[name].style.transform = '';
      }
      if (!openingFinished) {
        openingFinished = true;
        rootEl.classList.remove('is-hidden', 'is-revealing');
      }
    }

    function goToFlavour(nextIndex: number, dir: number) {
      const targetIndex = ((nextIndex % FLAVOURS.length) + FLAVOURS.length) % FLAVOURS.length;
      if (isTransitioning || targetIndex === currentIndex || disposed) return;

      cancelOpeningAnimations();
      updateUnderline(targetIndex);
      activeFlavourIdxRef.current = targetIndex;

      const slideA = slideRefs[currentIndex];
      const slideB = slideRefs[targetIndex];

      if (prefersReducedMotion()) {
        slideA.section.classList.remove('is-active');
        slideA.section.setAttribute('aria-hidden', 'true');
        slideA.section.style.zIndex = '';
        slideA.section.style.visibility = '';
        slideA.section.style.clipPath = '';

        slideB.section.classList.add('is-active');
        slideB.section.setAttribute('aria-hidden', 'false');
        slideB.section.style.zIndex = '';
        slideB.section.style.visibility = '';
        slideB.section.style.clipPath = '';

        currentIndex = targetIndex;
        return;
      }

      isTransitioning = true;
      const frameWidth = 1440 * currentU;

      slideB.section.style.zIndex = '1';
      slideB.section.style.visibility = 'visible';
      slideB.section.style.clipPath = 'none';
      slideB.section.setAttribute('aria-hidden', 'false');

      slideA.section.style.zIndex = '2';
      slideA.section.style.visibility = 'visible';

      for (const name of LAYER_NAMES) {
        slideB.layers[name].style.transform = `translateX(${dir * LAYER_FACTORS[name] * frameWidth}px)`;
        slideA.layers[name].style.transform = 'translateX(0px)';
      }

      const startTime = performance.now();

      function tick(now: number) {
        if (disposed) return;
        const elapsed = now - startTime;
        const t = elapsed / TRANSITION_MS;

        const c = cover(Math.min(1, t));
        if (dir > 0) {
          slideA.section.style.clipPath = `inset(0 ${(c * 100).toFixed(4)}% 0 0)`;
        } else {
          slideA.section.style.clipPath = `inset(0 0 0 ${(c * 100).toFixed(4)}%)`;
        }

        const xA = -dir * c * 0.14 * frameWidth;
        for (const name of LAYER_NAMES) {
          slideA.layers[name].style.transform = `translateX(${xA.toFixed(3)}px)`;
        }

        const p = Math.max(0, Math.min(1, (t - 0.5) / 0.42));
        const kB = 1 - (1 - p) * (1 - p);

        for (const name of LAYER_NAMES) {
          const xB = dir * (1 - kB) * LAYER_FACTORS[name] * frameWidth;
          slideB.layers[name].style.transform = `translateX(${xB.toFixed(3)}px)`;
        }

        if (t >= 1 && p >= 1) {
          slideB.section.classList.add('is-active');
          slideB.section.style.zIndex = '';
          slideB.section.style.visibility = '';
          slideB.section.style.clipPath = '';

          slideA.section.classList.remove('is-active');
          slideA.section.setAttribute('aria-hidden', 'true');
          slideA.section.style.zIndex = '';
          slideA.section.style.visibility = '';
          slideA.section.style.clipPath = '';

          for (const name of LAYER_NAMES) {
            slideA.layers[name].style.transform = '';
            slideB.layers[name].style.transform = '';
          }

          currentIndex = targetIndex;
          isTransitioning = false;
          return;
        }

        requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }

    const markInteraction = () => {
      lastInteraction = Date.now();
    };

    const tabClickHandlers = tabButtons.map((btn) => {
      const handler = () => {
        markInteraction();
        const targetIndex = Number(btn.dataset.index);
        if (targetIndex === currentIndex) return;
        const dir = targetIndex > currentIndex ? 1 : -1;
        goToFlavour(targetIndex, dir);
      };
      btn.addEventListener('click', handler);
      return { btn, handler };
    });

    const onPrev = () => {
      markInteraction();
      goToFlavour(currentIndex - 1, -1);
    };
    const onNext = () => {
      markInteraction();
      goToFlavour(currentIndex + 1, 1);
    };
    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);

    const onKeyDown = (e: KeyboardEvent) => {
      // Only trigger slider arrows if no modal/input is focused and user is near hero
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (window.scrollY > window.innerHeight * 0.6) return;
      if (e.key === 'ArrowLeft') {
        markInteraction();
        goToFlavour(currentIndex - 1, -1);
      } else if (e.key === 'ArrowRight') {
        markInteraction();
        goToFlavour(currentIndex + 1, 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    let pointerTracking = false;
    let startX = 0;
    let startY = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerTracking = true;
      startX = e.clientX;
      startY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!pointerTracking) return;
      pointerTracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        markInteraction();
        goToFlavour(dx < 0 ? currentIndex + 1 : currentIndex - 1, dx < 0 ? 1 : -1);
      }
    };
    const onPointerCancel = () => {
      pointerTracking = false;
    };

    stageEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('resize', layout);

    if (!prefersReducedMotion()) {
      rootEl.classList.add('is-hidden');
    }

    layout();

    if (!prefersReducedMotion()) {
      const frameWidth = 1440 * currentU;
      for (const name of LAYER_NAMES) {
        slideRefs[0].layers[name].style.transform = `translateX(${LAYER_FACTORS[name] * frameWidth}px)`;
      }
    }

    function startOpeningSequence() {
      if (openingFinished || disposed) return;
      layout();

      if (prefersReducedMotion()) {
        cancelOpeningAnimations();
        return;
      }

      const frameWidth = 1440 * currentU;
      const easing = 'cubic-bezier(0.22, 0.8, 0.3, 1)';

      for (const name of LAYER_NAMES) {
        const layerEl = slideRefs[0].layers[name];
        const startXOffset = LAYER_FACTORS[name] * frameWidth;
        layerEl.style.transform = '';
        const anim = layerEl.animate(
          [
            { transform: `translateX(${startXOffset.toFixed(3)}px)` },
            { transform: 'translateX(0px)' },
          ],
          { duration: 900, easing, fill: 'none' }
        );
        openingAnimations.push(anim);
      }

      rootEl.classList.add('is-revealing');
      void rootEl.offsetWidth;
      rootEl.classList.remove('is-hidden');

      window.setTimeout(() => {
        if (disposed) return;
        openingFinished = true;
        rootEl.classList.remove('is-hidden', 'is-revealing');
        openingAnimations = [];
      }, 1700);
    }

    const failsafeTimer = window.setTimeout(() => {
      if (!openingFinished && !disposed) {
        cancelOpeningAnimations();
        layout();
      }
    }, 3000);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        startOpeningSequence();
      });
    } else {
      startOpeningSequence();
    }

    const autoplayTimer = window.setInterval(() => {
      if (
        !disposed &&
        document.visibilityState === 'visible' &&
        window.scrollY < window.innerHeight * 0.6 &&
        Date.now() - lastInteraction >= INTERACTION_PAUSE_MS &&
        !isTransitioning
      ) {
        goToFlavour(currentIndex + 1, 1);
      }
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearTimeout(failsafeTimer);
      window.clearInterval(autoplayTimer);
      tabClickHandlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
      window.removeEventListener('keydown', onKeyDown);
      stageEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('resize', layout);
    };
  }, []);

  // Re-measure underline when cartCount or user name changes width
  useEffect(() => {
    const tabsEl = tabsRef.current;
    const underlineEl = underlineRef.current;
    if (!tabsEl || !underlineEl) return;
    const activeTab = tabsEl.querySelector<HTMLButtonElement>('.blendy-tab[aria-current="true"]');
    if (activeTab) {
      underlineEl.style.width = `${activeTab.offsetWidth}px`;
      underlineEl.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    }
  }, [cartCount, user]);

  const handleShopNowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const activeFlavour = FLAVOURS[activeFlavourIdxRef.current]?.word as FlavourFilter | undefined;
    onShopFlavour(activeFlavour ?? 'All');
  };

  return (
    <div className="blendy-hero" id="top">
      <main className="w-full h-full relative" ref={stageRef} aria-label="Blendy flavour showcase" />

      <div className="blendy-hero-ui">
        <header className="blendy-header">
          <a
            href="#catalog"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="blendy-logo blendy-reveal-item"
            style={{ '--reveal-delay': '250ms' } as React.CSSProperties}
          >
            Blendy
          </a>

          <nav
            className="blendy-tabs blendy-reveal-item"
            ref={tabsRef}
            aria-label="Smoothie flavours"
            style={{ '--reveal-delay': '330ms' } as React.CSSProperties}
          >
            <button type="button" className="blendy-tab" data-index="0" aria-current="true">
              Berry
            </button>
            <button type="button" className="blendy-tab" data-index="1">
              Kiwi
            </button>
            <button type="button" className="blendy-tab" data-index="2">
              Banana
            </button>
            <button type="button" className="blendy-tab" data-index="3">
              Strawberry
            </button>
            <span className="blendy-tab-underline" ref={underlineRef} aria-hidden="true" />
          </nav>

          <div
            className="blendy-account blendy-reveal-item"
            style={{ '--reveal-delay': '410ms' } as React.CSSProperties}
          >
            <button type="button" onClick={onOpenCart} aria-label="Open shopping bag">
              {cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
            </button>
            <span className="sep" aria-hidden="true">
              |
            </span>
            <button type="button" onClick={onOpenAccount} aria-label="Open account and registration">
              {user ? user.name.split(' ')[0] : 'Register'}
            </button>
          </div>
        </header>

        <button
          type="button"
          className="blendy-arrow blendy-arrow-prev blendy-reveal-item"
          ref={prevBtnRef}
          aria-label="Previous flavour"
          style={{ '--reveal-delay': '490ms' } as React.CSSProperties}
        >
          <svg
            viewBox="0 0 28 28"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M24 14H4 M12 6l-8 8 8 8" />
          </svg>
        </button>

        <a
          href="#catalog"
          onClick={handleShopNowClick}
          className="blendy-shop-now blendy-reveal-item"
          style={{ '--reveal-delay': '570ms' } as React.CSSProperties}
        >
          SHOP NOW
        </a>

        <button
          type="button"
          className="blendy-arrow blendy-arrow-next blendy-reveal-item"
          ref={nextBtnRef}
          aria-label="Next flavour"
          style={{ '--reveal-delay': '650ms' } as React.CSSProperties}
        >
          <svg
            viewBox="0 0 28 28"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 14h20 M16 6l8 8-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
};
