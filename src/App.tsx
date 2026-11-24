import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HeroSlider } from './components/HeroSlider';
import { StickyHeader } from './components/StickyHeader';
import { CatalogSection, type SortOption } from './components/CatalogSection';
import { CraftSection } from './components/CraftSection';
import { Footer } from './components/Footer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AccountModal } from './components/AccountModal';
import type {
  AuthUser,
  CartItem,
  FlavourFilter,
  Order,
  Product,
  ProductCategory,
} from './types';

const CART_STORAGE_KEY = 'blendy_cart_v1';
const WISHLIST_STORAGE_KEY = 'blendy_wishlist_v1';
const ORDERS_STORAGE_KEY = 'blendy_orders_v1';

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(40);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<'All Products' | ProductCategory>(
    'All Products'
  );
  const [selectedFlavour, setSelectedFlavour] = useState<FlavourFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Persisted storefront state
  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    readStoredJson<CartItem[]>(CART_STORAGE_KEY, [])
  );
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    readStoredJson<string[]>(WISHLIST_STORAGE_KEY, [])
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    readStoredJson<Order[]>(ORDERS_STORAGE_KEY, [])
  );

  // Session auth state held strictly in memory
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Promo state
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  // Modals & Drawers
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingProducts(true);
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('Unable to load products.');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
        if (typeof data.freeShippingThreshold === 'number') {
          setFreeShippingThreshold(data.freeShippingThreshold);
        }
      })
      .catch((err) => {
        if (!active) return;
        setProductsError(err instanceof Error ? err.message : 'Could not load catalog.');
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore storage quota error
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore storage quota error
    }
  }, [wishlistIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // ignore storage quota error
    }
  }, [orders]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCategory !== 'All Products' && p.category !== selectedCategory) return false;
      if (selectedFlavour !== 'All' && p.flavour !== selectedFlavour) return false;
      if (q) {
        const hit =
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.flavour.toLowerCase().includes(q) ||
          p.ingredients.some((i) => i.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    if (sortBy === 'rating') {
      return [...list].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    }
    return [...list].sort((a, b) => a.featuredRank - b.featuredRank);
  }, [products, selectedCategory, selectedFlavour, searchQuery, sortBy]);

  const totalCartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const addToCart = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product || product.stock <= 0) return;

      setCartItems((prev) => {
        const existing = prev.find(
          (item) => item.productId === productId && item.variantId === variantId
        );
        if (existing) {
          return prev.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
              : item
          );
        }
        return [...prev, { productId, variantId, quantity: Math.min(product.stock, quantity) }];
      });

      setToastMessage(`Added ${product.name} to your bag`);
    },
    [products]
  );

  const handleQuickAdd = useCallback(
    (product: Product) => {
      const defaultVariant = product.variants[0];
      if (!defaultVariant) return;
      addToCart(product.id, defaultVariant.id, 1);
    },
    [addToCart]
  );

  const handleUpdateQty = useCallback(
    (productId: string, variantId: string, nextQty: number) => {
      if (nextQty <= 0) {
        setCartItems((prev) =>
          prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
        );
        return;
      }
      const product = products.find((p) => p.id === productId);
      const maxStock = product ? Math.max(1, product.stock) : 50;
      setCartItems((prev) =>
        prev.map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity: Math.min(maxStock, nextQty) }
            : i
        )
      );
    },
    [products]
  );

  const handleRemoveItem = useCallback((productId: string, variantId: string) => {
    setCartItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  }, []);

  const handleToggleWishlist = useCallback((productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const handleApplyPromo = useCallback(async (code: string, subtotal: number) => {
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal, deliveryMethod: 'standard' }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid promo code');
    }
    setPromoCode(data.code);
    setPromoDiscount(data.discount);
    setPromoMessage(data.message);
  }, []);

  const handleClearPromo = useCallback(() => {
    setPromoCode(null);
    setPromoDiscount(0);
    setPromoMessage('');
  }, []);

  const handleOrderConfirmed = useCallback((order: Order, updatedProducts: Product[]) => {
    setOrders((prev) => [order, ...prev.filter((o) => o.orderNumber !== order.orderNumber)]);
    if (Array.isArray(updatedProducts) && updatedProducts.length > 0) {
      setProducts(updatedProducts);
    }
    setCartItems([]);
    setPromoCode(null);
    setPromoDiscount(0);
    setPromoMessage('');
  }, []);

  const handleAuthSuccess = useCallback(
    (token: string, nextUser: AuthUser, serverOrders: Order[]) => {
      setAuthToken(token);
      setUser(nextUser);
      if (serverOrders.length > 0) {
        setOrders((prev) => {
          const map = new Map<string, Order>();
          for (const o of [...serverOrders, ...prev]) map.set(o.orderNumber, o);
          return Array.from(map.values());
        });
      }
    },
    []
  );

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const handleProductUpdated = useCallback((updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const scrollToCatalogWithFlavour = useCallback((flavour: FlavourFilter) => {
    setSelectedCategory('All Products');
    setSelectedFlavour(flavour);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToBundles = useCallback(() => {
    setSelectedCategory('Boxes & Bundles');
    setSelectedFlavour('All');
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedCategory('All Products');
    setSelectedFlavour('All');
    setSearchQuery('');
    setSortBy('featured');
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-zinc-900">
      <StickyHeader
        cartCount={totalCartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onSelectBundles={scrollToBundles}
      />

      <HeroSlider
        cartCount={totalCartCount}
        user={user}
        onOpenCart={() => setCartOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onShopFlavour={scrollToCatalogWithFlavour}
      />

      <CatalogSection
        products={filteredProducts}
        loading={loadingProducts}
        error={productsError}
        selectedCategory={selectedCategory}
        selectedFlavour={selectedFlavour}
        searchQuery={searchQuery}
        sortBy={sortBy}
        wishlistIds={wishlistIds}
        onCategoryChange={setSelectedCategory}
        onFlavourChange={setSelectedFlavour}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
        onResetFilters={resetFilters}
        onSelectProduct={(p) => setSelectedProductId(p.id)}
        onQuickAdd={handleQuickAdd}
        onToggleWishlist={handleToggleWishlist}
      />

      <CraftSection onShopBundles={scrollToBundles} />

      <Footer
        onSelectFlavour={scrollToCatalogWithFlavour}
        onOpenAccount={() => setAccountOpen(true)}
      />

      <ProductDetailModal
        product={selectedProduct}
        isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
        onClose={() => setSelectedProductId(null)}
        onAddToCart={addToCart}
        onToggleWishlist={handleToggleWishlist}
        onProductUpdated={handleProductUpdated}
      />

      <CartDrawer
        open={cartOpen}
        items={cartItems}
        products={products}
        promoCode={promoCode}
        promoDiscount={promoDiscount}
        promoMessage={promoMessage}
        freeShippingThreshold={freeShippingThreshold}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onApplyPromo={handleApplyPromo}
        onClearPromo={handleClearPromo}
        onProceedToCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        items={cartItems}
        products={products}
        promoCode={promoCode}
        promoDiscount={promoDiscount}
        freeShippingThreshold={freeShippingThreshold}
        user={user}
        authToken={authToken}
        onClose={() => setCheckoutOpen(false)}
        onOrderConfirmed={handleOrderConfirmed}
      />

      <AccountModal
        open={accountOpen}
        user={user}
        authToken={authToken}
        orders={orders}
        wishlistIds={wishlistIds}
        products={products}
        onClose={() => setAccountOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onSelectProduct={(p) => setSelectedProductId(p.id)}
        onToggleWishlist={handleToggleWishlist}
      />

      {/* Non-intrusive Add-to-Bag Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-40 px-4 py-3 rounded-xl bg-zinc-950 text-white text-sm shadow-xl flex items-center gap-4"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => {
              setToastMessage(null);
              setCartOpen(true);
            }}
            className="font-semibold underline underline-offset-4 hover:text-zinc-200 cursor-pointer"
          >
            View Bag
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
