import React, { useEffect, useState } from 'react';
import { Heart, LogOut, Package, Search, User, X } from 'lucide-react';
import { ProductVisual } from './ProductVisual';
import type { AuthUser, Order, Product } from '../types';

interface AccountModalProps {
  open: boolean;
  user: AuthUser | null;
  authToken: string | null;
  orders: Order[];
  wishlistIds: string[];
  products: Product[];
  onClose: () => void;
  onAuthSuccess: (token: string, user: AuthUser, serverOrders: Order[]) => void;
  onLogout: () => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  open,
  user,
  orders,
  wishlistIds,
  products,
  onClose,
  onAuthSuccess,
  onLogout,
  onSelectProduct,
  onToggleWishlist,
}) => {
  const [tab, setTab] = useState<'account' | 'wishlist' | 'orders'>('account');
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Guest order lookup
  const [lookupNumber, setLookupNumber] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<Order | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAuthError(null);
    setLookupError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  const fillTestRegistration = () => {
    setAuthMode('register');
    setName('Jordan Taylor');
    setEmail(`jordan.${Math.floor(100 + Math.random() * 899)}@example.com`);
    setPassword('blendytest123');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        authMode === 'register' ? { name, email, password } : { email, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }

      let serverOrders: Order[] = [];
      try {
        const ordersRes = await fetch('/api/orders', {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (Array.isArray(ordersData.orders)) serverOrders = ordersData.orders;
        }
      } catch {
        // ignore secondary orders fetch failure
      }

      onAuthSuccess(data.token, data.user, serverOrders);
      setPassword('');
    } catch {
      setAuthError('Network error during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(
        `/api/orders/lookup?orderNumber=${encodeURIComponent(lookupNumber)}&email=${encodeURIComponent(lookupEmail)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || 'Order not found.');
        return;
      }
      setLookupResult(data.order);
    } catch {
      setLookupError('Network error looking up order.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-zinc-950/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Account, Wishlist and Orders"
      onClick={onClose}
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl bg-[#FAF9F7] sm:rounded-2xl shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 bg-white border-b border-zinc-900/10 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-bold text-zinc-950">
            {user ? `Welcome, ${user.name}` : 'Account & Orders'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account dialog"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 bg-white border-b border-zinc-900/10 flex items-center gap-6">
          <button
            type="button"
            onClick={() => setTab('account')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              tab === 'account'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <User className="w-4 h-4" />
            {user ? 'Profile' : 'Sign In / Register'}
          </button>

          <button
            type="button"
            onClick={() => setTab('wishlist')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer tabular-nums ${
              tab === 'wishlist'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Heart className="w-4 h-4" />
            Wishlist ({wishlistProducts.length})
          </button>

          <button
            type="button"
            onClick={() => setTab('orders')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer tabular-nums ${
              tab === 'orders'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Package className="w-4 h-4" />
            Orders ({orders.length})
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {tab === 'account' && (
            <>
              {user ? (
                <div className="p-6 rounded-xl bg-white border border-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">Signed in member</p>
                    <p className="mt-1 text-lg font-bold text-zinc-950">{user.name}</p>
                    <p className="text-sm text-zinc-600">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-4 py-2.5 text-sm font-medium text-zinc-800 bg-zinc-100 rounded-lg hover:bg-zinc-200 flex items-center gap-2 self-start cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 p-1 bg-zinc-900/5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setAuthError(null);
                        }}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                          authMode === 'register'
                            ? 'bg-white text-zinc-950 shadow-xs'
                            : 'text-zinc-600'
                        }`}
                      >
                        Create Account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setAuthError(null);
                        }}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                          authMode === 'login'
                            ? 'bg-white text-zinc-950 shadow-xs'
                            : 'text-zinc-600'
                        }`}
                      >
                        Sign In
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={fillTestRegistration}
                      className="text-xs font-medium text-zinc-700 underline hover:text-zinc-950 cursor-pointer"
                    >
                      Fill Test Account
                    </button>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                      {authError}
                    </div>
                  )}

                  {authMode === 'register' && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jordan Taylor"
                        className="w-full h-10 px-3 text-sm bg-white border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-10 px-3 text-sm bg-white border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full h-10 px-3 text-sm bg-white border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full h-11 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:bg-zinc-400 cursor-pointer"
                  >
                    {authLoading
                      ? 'Please wait...'
                      : authMode === 'register'
                        ? 'Create Account'
                        : 'Sign In'}
                  </button>
                </form>
              )}
            </>
          )}

          {tab === 'wishlist' && (
            <div className="space-y-4">
              {wishlistProducts.length === 0 ? (
                <p className="text-sm text-zinc-500 py-8 text-center">
                  No saved smoothies yet. Tap the heart icon on any bottle or pack to save it here.
                </p>
              ) : (
                wishlistProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-3.5 rounded-xl bg-white border border-zinc-900/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        <ProductVisual
                          visualType={product.visualType}
                          flavourIds={product.flavourIds}
                          imageKey={product.imageKey}
                          alt={product.name}
                          bgTint={product.bgTint}
                          compact
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-950 truncate">
                          {product.name}
                        </h4>
                        <p className="text-xs text-zinc-500 tabular-nums">
                          {product.category} · ${product.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectProduct(product);
                        }}
                        className="px-3 py-2 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleWishlist(product.id)}
                        aria-label={`Remove ${product.name} from wishlist`}
                        className="px-2.5 py-2 text-xs font-medium text-zinc-600 hover:text-red-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-6">
              {orders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Recent Orders
                  </h3>
                  {orders.map((order) => (
                    <div
                      key={order.orderNumber}
                      className="p-4 rounded-xl bg-white border border-zinc-900/10 space-y-2 text-sm tabular-nums"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-950">{order.orderNumber}</span>
                        <span className="text-xs font-medium text-emerald-800">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-900/8 text-xs">
                        <span className="text-zinc-500">{order.estimatedDelivery}</span>
                        <span className="font-semibold text-zinc-950">
                          Total ${order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Lookup */}
              <form
                onSubmit={handleLookup}
                className="p-5 rounded-xl bg-white border border-zinc-900/10 space-y-3"
              >
                <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Track an Order by Number
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={lookupNumber}
                    onChange={(e) => setLookupNumber(e.target.value)}
                    placeholder="Order # (e.g. BL-1042)"
                    className="h-9 px-3 text-sm border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900 uppercase"
                  />
                  <input
                    type="email"
                    required
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="Email used at checkout"
                    className="h-9 px-3 text-sm border border-zinc-900/15 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  Look Up Order
                </button>
                {lookupError && <p className="text-xs text-red-700">{lookupError}</p>}
                {lookupResult && (
                  <div className="mt-3 p-3.5 rounded-lg bg-zinc-50 border border-zinc-900/10 text-xs space-y-1 tabular-nums">
                    <div className="font-semibold text-zinc-950">
                      {lookupResult.orderNumber} · {lookupResult.status}
                    </div>
                    <div className="text-zinc-600">{lookupResult.estimatedDelivery}</div>
                    <div className="text-zinc-800 font-medium">
                      Total: ${lookupResult.total.toFixed(2)}
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
