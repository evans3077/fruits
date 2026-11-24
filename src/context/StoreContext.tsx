import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onIdTokenChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  getStoredConsent,
  setStoredConsent,
  trackStoreEvent,
  type ConsentChoice,
} from '../services/analytics';
import type {
  AuthProfileDto,
  CartQuoteDto,
  CollectionPointDto,
  DeliveryZoneDto,
  FaqDto,
  GuestCartItem,
  OrderSummaryDto,
  PaymentProviderInfo,
  ProductDto,
  StoreSettingsDto,
  TestimonialDto,
} from '../types';

const CART_STORAGE_KEY = 'blendy_cart_v1';

interface ToastState {
  id: number;
  message: string;
  tone: 'neutral' | 'success' | 'error';
}

interface StoreContextValue {
  loading: boolean;
  error: string | null;
  settings: StoreSettingsDto | null;
  products: ProductDto[];
  deliveryZones: DeliveryZoneDto[];
  collectionPoints: CollectionPointDto[];
  faqs: FaqDto[];
  testimonials: TestimonialDto[];
  paymentProvider: PaymentProviderInfo;
  mapsApiKey: string;
  reloadBootstrap: (previewDrafts?: boolean) => Promise<void>;

  // Auth & Role
  authReady: boolean;
  firebaseUser: User | null;
  idToken: string | null;
  profile: AuthProfileDto | null;
  myOrders: OrderSummaryDto[];
  hasOwner: boolean | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshAuthProfile: () => Promise<void>;
  claimOwnership: () => Promise<void>;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;

  // Cart & Drawer
  cartItems: GuestCartItem[];
  cartCount: number;
  cartQuote: CartQuoteDto | null;
  cartSyncing: boolean;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  addToCart: (item: GuestCartItem, meta?: { name?: string; variantLabel?: string; priceCents?: number }) => void;
  updateCartQty: (variantId: number, quantity: number) => void;
  removeFromCart: (variantId: number) => void;
  clearCart: () => void;
  reconcileCart: (opts?: {
    fulfilmentType?: 'delivery' | 'collection';
    deliveryZoneId?: number | null;
    collectionPointId?: number | null;
    promoCode?: string | null;
  }) => Promise<CartQuoteDto | null>;

  // Consent & UI Feedback
  consent: ConsentChoice;
  acceptConsent: (choice: Exclude<ConsentChoice, 'pending'>) => void;
  toast: ToastState | null;
  showToast: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
}

const DEFAULT_PROVIDER: PaymentProviderInfo = {
  provider: 'none',
  environment: 'unconfigured',
  mpesaAvailable: false,
  isLive: false,
  label: 'Loading payment gateway...',
};

const StoreContext = createContext<StoreContextValue | null>(null);

function loadStoredCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i) =>
        i &&
        Number.isInteger(i.productId) &&
        i.productId > 0 &&
        Number.isInteger(i.variantId) &&
        i.variantId > 0 &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0
    );
  } catch {
    return [];
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<StoreSettingsDto | null>(null);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneDto[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPointDto[]>([]);
  const [faqs, setFaqs] = useState<FaqDto[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialDto[]>([]);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProviderInfo>(DEFAULT_PROVIDER);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
  );

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfileDto | null>(null);
  const [myOrders, setMyOrders] = useState<OrderSummaryDto[]>([]);
  const [hasOwner, setHasOwner] = useState<boolean | null>(null);

  const [cartItems, setCartItems] = useState<GuestCartItem[]>(() => loadStoredCart());
  const [cartQuote, setCartQuote] = useState<CartQuoteDto | null>(null);
  const [cartSyncing, setCartSyncing] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const [consent, setConsent] = useState<ConsentChoice>(() => getStoredConsent());
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, tone: 'neutral' | 'success' | 'error' = 'neutral') => {
      const id = Date.now();
      setToast({ id, message, tone });
      window.setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 4200);
    },
    []
  );

  const authFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      let activeToken = idToken;
      if (!activeToken && auth.currentUser) {
        activeToken = await auth.currentUser.getIdToken();
      }
      if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(input, { ...init, headers });
    },
    [idToken]
  );

  const reloadBootstrap = useCallback(
    async (previewDrafts = false) => {
      setError(null);
      try {
        const url = previewDrafts
          ? '/api/storefront/bootstrap?previewDrafts=1'
          : '/api/storefront/bootstrap';
        const res = await authFetch(url);
        if (!res.ok) {
          throw new Error('Could not load storefront configuration.');
        }
        const data = await res.json();
        setSettings(data.settings ?? null);
        setProducts(Array.isArray(data.products) ? data.products : []);
        setDeliveryZones(Array.isArray(data.deliveryZones) ? data.deliveryZones : []);
        setCollectionPoints(Array.isArray(data.collectionPoints) ? data.collectionPoints : []);
        setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
        setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : []);
        if (data.paymentProvider) setPaymentProvider(data.paymentProvider);
        const resolvedKey = (
          import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
          data.mapsApiKey ||
          ''
        ).trim();
        setMapsApiKey(resolvedKey);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to reach storefront server.');
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  const fetchAuthProfileWithToken = useCallback(async (token: string) => {
    try {
      const [meRes, bootRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/bootstrap-status', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (meRes.ok) {
        const meData = await meRes.json();
        setProfile(meData.user ?? null);
        setMyOrders(Array.isArray(meData.orders) ? meData.orders : []);
      }
      if (bootRes.ok) {
        const bootData = await bootRes.json();
        setHasOwner(Boolean(bootData.hasOwner));
      }
    } catch {
      // ignore transient errors during auth sync
    }
  }, []);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
        await fetchAuthProfileWithToken(token);
      } else {
        setIdToken(null);
        setProfile(null);
        setMyOrders([]);
        setHasOwner(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [fetchAuthProfileWithToken]);

  useEffect(() => {
    reloadBootstrap(false);
  }, [reloadBootstrap]);

  // Persist minimal guest cart IDs/quantities only (authoritative prices come from server quote)
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore storage quota errors
    }
  }, [cartItems]);

  const reconcileCart = useCallback(
    async (opts?: {
      fulfilmentType?: 'delivery' | 'collection';
      deliveryZoneId?: number | null;
      collectionPointId?: number | null;
      promoCode?: string | null;
    }): Promise<CartQuoteDto | null> => {
      if (cartItems.length === 0) {
        setCartQuote(null);
        return null;
      }
      setCartSyncing(true);
      try {
        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems,
            fulfilmentType: opts?.fulfilmentType ?? 'delivery',
            deliveryZoneId: opts?.deliveryZoneId ?? null,
            collectionPointId: opts?.collectionPointId ?? null,
            promoCode: opts?.promoCode ?? null,
          }),
        });
        if (!res.ok) return null;
        const quote = (await res.json()) as CartQuoteDto;
        setCartQuote(quote);
        return quote;
      } catch {
        return null;
      } finally {
        setCartSyncing(false);
      }
    },
    [cartItems]
  );

  useEffect(() => {
    if (cartItems.length > 0) {
      reconcileCart();
    } else {
      setCartQuote(null);
    }
  }, [cartItems, reconcileCart]);

  const addToCart = useCallback(
    (item: GuestCartItem, meta?: { name?: string; variantLabel?: string; priceCents?: number }) => {
      setCartItems((prev) => {
        const existing = prev.find((i) => i.variantId === item.variantId);
        if (existing) {
          return prev.map((i) =>
            i.variantId === item.variantId
              ? { ...i, quantity: Math.min(100, i.quantity + item.quantity) }
              : i
          );
        }
        return [...prev, item];
      });
      trackStoreEvent('add_to_cart', {
        items: [
          {
            item_id: item.variantId,
            item_name: meta?.name || 'Blendy Smoothie',
            item_variant: meta?.variantLabel || '',
            price: meta?.priceCents ? meta.priceCents / 100 : undefined,
            quantity: item.quantity,
          },
        ],
      });
      showToast(
        meta?.name ? `Added ${meta.name} to your bag.` : 'Added to your shopping bag.',
        'success'
      );
    },
    [showToast]
  );

  const updateCartQty = useCallback((variantId: number, quantity: number) => {
    setCartItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.variantId !== variantId);
      }
      return prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: Math.min(100, quantity) } : i
      );
    });
  }, []);

  const removeFromCart = useCallback((variantId: number) => {
    setCartItems((prev) => prev.filter((i) => i.variantId !== variantId));
    trackStoreEvent('remove_from_cart', { item_id: variantId });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCartQuote(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      await fetchAuthProfileWithToken(token);
      showToast('Signed in successfully.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Google Sign-In was cancelled or failed.',
        'error'
      );
    }
  }, [fetchAuthProfileWithToken, showToast]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setIdToken(null);
    setProfile(null);
    setMyOrders([]);
    setHasOwner(null);
    showToast('Signed out.');
  }, [showToast]);

  const refreshAuthProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    const token = await auth.currentUser.getIdToken(true);
    setIdToken(token);
    await fetchAuthProfileWithToken(token);
  }, [fetchAuthProfileWithToken]);

  const claimOwnership = useCallback(async () => {
    const res = await authFetch('/api/admin/claim-owner', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Could not claim store ownership.');
    }
    await refreshAuthProfile();
    showToast('Store owner role activated.', 'success');
  }, [authFetch, refreshAuthProfile, showToast]);

  const acceptConsent = useCallback((choice: Exclude<ConsentChoice, 'pending'>) => {
    setStoredConsent(choice);
    setConsent(choice);
  }, []);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const value: StoreContextValue = {
    loading,
    error,
    settings,
    products,
    deliveryZones,
    collectionPoints,
    faqs,
    testimonials,
    paymentProvider,
    mapsApiKey,
    reloadBootstrap,
    authReady,
    firebaseUser,
    idToken,
    profile,
    myOrders,
    hasOwner,
    signInWithGoogle,
    signOutUser,
    refreshAuthProfile,
    claimOwnership,
    authFetch,
    cartItems,
    cartCount,
    cartQuote,
    cartSyncing,
    cartDrawerOpen,
    setCartDrawerOpen,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    reconcileCart,
    consent,
    acceptConsent,
    toast,
    showToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
