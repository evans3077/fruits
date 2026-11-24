import React, { useCallback, useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { AdminCatalogueTab } from '../components/admin/AdminCatalogueTab';
import { AdminContentSettingsTab } from '../components/admin/AdminContentSettingsTab';
import { AdminFulfilmentTab } from '../components/admin/AdminFulfilmentTab';
import { AdminOrdersTab } from '../components/admin/AdminOrdersTab';
import { useStore } from '../context/StoreContext';
import { formatKsh, formatNairobiDateTime } from '../lib/kenya';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import type {
  AuthProfileDto,
  CollectionPointDto,
  ContentPageDto,
  DeliveryZoneDto,
  FaqDto,
  OrderSummaryDto,
  ProductDto,
  StoreSettingsDto,
  TestimonialDto,
  UserRole,
} from '../types';

type AdminTab = 'overview' | 'catalogue' | 'orders' | 'fulfilment' | 'settings' | 'users';

interface OverviewStats {
  periodDays: number;
  paidRevenueCents: number;
  pendingOrderValueCents: number;
  paidOrdersCount: number;
  pendingPaymentCount: number;
  awaitingActionCount: number;
  lowStockAlerts: {
    variantId: number;
    sku: string;
    productName: string;
    label: string;
    availableQty: number;
    lowStockThreshold: number;
  }[];
}

export const AdminPage: React.FC = () => {
  const {
    authReady,
    firebaseUser,
    profile,
    hasOwner,
    signInWithGoogle,
    claimOwnership,
    authFetch,
    reloadBootstrap,
    showToast,
  } = useStore();

  useDocumentMeta('Admin Console — Blendy Kenya', 'Store administration and order operations.');

  const [tab, setTab] = useState<AdminTab>('overview');
  const [periodDays, setPeriodDays] = useState(30);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [orders, setOrders] = useState<OrderSummaryDto[]>([]);
  const [zones, setZones] = useState<DeliveryZoneDto[]>([]);
  const [points, setPoints] = useState<CollectionPointDto[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<StoreSettingsDto | null>(null);
  const [pages, setPages] = useState<ContentPageDto[]>([]);
  const [faqs, setFaqs] = useState<FaqDto[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialDto[]>([]);
  const [usersList, setUsersList] = useState<AuthProfileDto[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const isStaff = Boolean(
    profile && ['owner', 'manager', 'fulfilment_staff'].includes(profile.role)
  );
  const isManager = Boolean(profile && ['owner', 'manager'].includes(profile.role));
  const isOwner = Boolean(profile && profile.role === 'owner');

  const loadAllAdminData = useCallback(
    async (days = periodDays, orderSearch = '') => {
      if (!isStaff) return;
      setLoadingData(true);
      try {
        const reqs: Promise<Response>[] = [
          authFetch(`/api/admin/overview?days=${days}`),
          authFetch('/api/admin/products'),
          authFetch(`/api/admin/orders${orderSearch ? `?q=${encodeURIComponent(orderSearch)}` : ''}`),
          authFetch('/api/admin/fulfilment'),
        ];

        if (isManager) {
          reqs.push(
            authFetch('/api/admin/promotions'),
            authFetch('/api/admin/settings'),
            authFetch('/api/admin/testimonials'),
            authFetch('/api/admin/audit-logs')
          );
        }
        if (isOwner) {
          reqs.push(authFetch('/api/admin/users'));
        }

        const results = await Promise.all(reqs);
        const [ovRes, prodRes, ordRes, fulfRes] = results;

        if (ovRes.ok) setOverview(await ovRes.json());
        if (prodRes.ok) setProducts((await prodRes.json()).products ?? []);
        if (ordRes.ok) setOrders((await ordRes.json()).orders ?? []);
        if (fulfRes.ok) {
          const f = await fulfRes.json();
          setZones(f.deliveryZones ?? []);
          setPoints(f.collectionPoints ?? []);
        }

        if (isManager) {
          const promoRes = results[4];
          const setRes = results[5];
          const testRes = results[6];
          const auditRes = results[7];
          if (promoRes?.ok) setPromotions((await promoRes.json()).promotions ?? []);
          if (setRes?.ok) {
            const s = await setRes.json();
            setAdminSettings(s.settings ?? null);
            setPages(s.pages ?? []);
            setFaqs(s.faqs ?? []);
          }
          if (testRes?.ok) setTestimonials((await testRes.json()).testimonials ?? []);
          if (auditRes?.ok) setAuditLogs((await auditRes.json()).logs ?? []);
        }

        if (isOwner) {
          const usrRes = results[8];
          if (usrRes?.ok) setUsersList((await usrRes.json()).users ?? []);
        }
      } finally {
        setLoadingData(false);
      }
    },
    [authFetch, isManager, isOwner, isStaff, periodDays]
  );

  useEffect(() => {
    if (isStaff) {
      loadAllAdminData(periodDays);
    }
  }, [isStaff, periodDays, loadAllAdminData]);

  const handleLoadDemoTestData = async () => {
    const res = await authFetch('/api/admin/load-demo-test-data', { method: 'POST' });
    if (res.ok) {
      await loadAllAdminData(periodDays);
      await reloadBootstrap(false);
      showToast(
        'Loaded clearly labelled non-live demo KES pricing and sample zones for testing.',
        'success'
      );
    } else {
      showToast('Could not load demo test data.', 'error');
    }
  };

  const handleRoleChange = async (uid: string, role: UserRole) => {
    const res = await authFetch(`/api/admin/users/${encodeURIComponent(uid)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await loadAllAdminData(periodDays);
      showToast('User role updated.', 'success');
    } else {
      showToast(data.error || 'Could not change role.', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Operations Console · {profile?.role || 'Restricted'}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 mt-1">
              Blendy Store Admin
            </h1>
          </div>

          {isStaff && (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['overview', 'Overview'],
                  ['catalogue', 'Catalogue & Stock'],
                  ['orders', 'Orders'],
                  ...(isManager
                    ? [
                        ['fulfilment', 'Delivery & Promos'],
                        ['settings', 'Settings & Content'],
                        ['users', 'Team & Audit'],
                      ]
                    : []),
                ] as [AdminTab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    tab === key
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {!authReady ? (
          <div className="h-44 rounded-2xl bg-zinc-200/60 animate-pulse" />
        ) : !firebaseUser ? (
          <div className="rounded-2xl bg-white border border-zinc-200 p-8 max-w-xl space-y-4">
            <h2 className="text-xl font-bold text-zinc-950">Admin Sign-In Required</h2>
            <p className="text-sm text-zinc-600">
              Sign in with Google using an authorized owner, manager, or fulfilment staff account.
            </p>
            <button
              type="button"
              onClick={signInWithGoogle}
              className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 cursor-pointer"
            >
              Sign in with Google
            </button>
          </div>
        ) : !isStaff ? (
          <div className="rounded-2xl bg-white border border-zinc-200 p-8 max-w-xl space-y-4">
            <h2 className="text-xl font-bold text-zinc-950">
              {hasOwner === false ? 'Claim Initial Store Ownership' : 'Staff Access Required'}
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Signed in as <strong>{profile?.email || firebaseUser.email}</strong> (role:{' '}
              <strong>{profile?.role || 'customer'}</strong>).
              {hasOwner === false
                ? ' No store owner has been assigned yet. Activate initial owner access below to configure products, KSh pricing, and delivery zones.'
                : ' Only users assigned owner, manager, or fulfilment_staff roles by the store owner can view operations.'}
            </p>
            {hasOwner === false && (
              <button
                type="button"
                disabled={claiming}
                onClick={async () => {
                  setClaiming(true);
                  try {
                    await claimOwnership();
                  } catch (err) {
                    showToast(
                      err instanceof Error ? err.message : 'Unable to claim owner access.',
                      'error'
                    );
                  } finally {
                    setClaiming(false);
                  }
                }}
                className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 cursor-pointer"
              >
                {claiming ? 'Claiming...' : 'Claim Store Owner Access'}
              </button>
            )}
          </div>
        ) : (
          <>
            {loadingData && !overview && (
              <p className="text-xs text-zinc-500">Loading store records...</p>
            )}

            {tab === 'overview' && overview && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {[7, 30, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setPeriodDays(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          periodDays === d
                            ? 'bg-zinc-900 text-white'
                            : 'bg-white border border-zinc-200 text-zinc-700'
                        }`}
                      >
                        Last {d} days
                      </button>
                    ))}
                  </div>

                  {isManager && (
                    <button
                      type="button"
                      onClick={handleLoadDemoTestData}
                      className="px-4 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 cursor-pointer"
                    >
                      Load Non-Live Demo Test Prices &amp; Zones
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="rounded-2xl bg-white border border-zinc-200 p-5">
                    <p className="text-xs font-medium text-zinc-500">Confirmed Paid Revenue</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums mt-1">
                      {formatKsh(overview.paidRevenueCents)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {overview.paidOrdersCount} paid order(s)
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white border border-zinc-200 p-5">
                    <p className="text-xs font-medium text-zinc-500">Unpaid / Pending Value</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums mt-1">
                      {formatKsh(overview.pendingOrderValueCents)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {overview.pendingPaymentCount} awaiting confirmation
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white border border-zinc-200 p-5">
                    <p className="text-xs font-medium text-zinc-500">Active Fulfilment Queue</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums mt-1">
                      {overview.awaitingActionCount}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Orders not yet delivered/cancelled</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-zinc-200 p-5">
                    <p className="text-xs font-medium text-zinc-500">Low Stock SKUs</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums mt-1">
                      {overview.lowStockAlerts.length}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">At or below threshold</p>
                  </div>
                </div>

                {overview.lowStockAlerts.length > 0 && (
                  <div className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-3">
                    <h2 className="text-base font-bold text-zinc-950">Low-Stock Alerts</h2>
                    <div className="divide-y divide-zinc-100 text-xs">
                      {overview.lowStockAlerts.map((item) => (
                        <div key={item.variantId} className="py-2 flex justify-between">
                          <span>
                            <strong>{item.productName}</strong> ({item.label} · {item.sku})
                          </span>
                          <span className="font-semibold text-amber-800 tabular-nums">
                            {item.availableQty} available (threshold {item.lowStockThreshold})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'catalogue' && (
              <AdminCatalogueTab
                products={products}
                isManager={isManager}
                onRefresh={() => loadAllAdminData(periodDays)}
              />
            )}

            {tab === 'orders' && (
              <AdminOrdersTab
                orders={orders}
                isManager={isManager}
                onSearch={(q) => loadAllAdminData(periodDays, q)}
                onRefresh={() => loadAllAdminData(periodDays)}
              />
            )}

            {tab === 'fulfilment' && isManager && (
              <AdminFulfilmentTab
                zones={zones}
                points={points}
                promotions={promotions}
                onRefresh={() => loadAllAdminData(periodDays)}
              />
            )}

            {tab === 'settings' && isManager && (
              <AdminContentSettingsTab
                settings={adminSettings}
                pages={pages}
                faqs={faqs}
                testimonials={testimonials}
                onRefresh={() => loadAllAdminData(periodDays)}
              />
            )}

            {tab === 'users' && isManager && (
              <div className="space-y-8">
                {isOwner && (
                  <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4">
                    <h2 className="text-lg font-bold text-zinc-950">Staff &amp; Role Permissions</h2>
                    <div className="divide-y divide-zinc-100 text-xs">
                      {usersList.map((u) => (
                        <div key={u.uid} className="py-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-zinc-950">
                              {u.displayName || u.email}
                            </p>
                            <p className="text-zinc-500">{u.email}</p>
                          </div>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white"
                          >
                            <option value="owner">owner</option>
                            <option value="manager">manager</option>
                            <option value="fulfilment_staff">fulfilment_staff</option>
                            <option value="customer">customer</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-3">
                  <h2 className="text-lg font-bold text-zinc-950">Recent Audit Log</h2>
                  <div className="divide-y divide-zinc-100 text-xs">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1">
                        <div>
                          <span className="font-semibold text-zinc-900">{log.action}</span> ·{' '}
                          <span className="text-zinc-700">{log.summary}</span>{' '}
                          <span className="text-zinc-500">({log.actorEmail})</span>
                        </div>
                        <span className="text-zinc-500">{formatNairobiDateTime(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};
