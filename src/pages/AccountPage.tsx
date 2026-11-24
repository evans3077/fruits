import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { OrderHistory } from '../components/account/OrderHistory';
import { useStore } from '../context/StoreContext';
import { useDocumentMeta } from '../lib/useDocumentMeta';

export const AccountPage: React.FC = () => {
  const {
    authReady,
    firebaseUser,
    profile,
    myOrders,
    hasOwner,
    signInWithGoogle,
    signOutUser,
    claimOwnership,
    showToast,
  } = useStore();
  const [claiming, setClaiming] = useState(false);

  useDocumentMeta('Account & Orders — Blendy Kenya', 'Manage your Blendy account and order history.');

  const isStaff = Boolean(
    profile && ['owner', 'manager', 'fulfilment_staff'].includes(profile.role)
  );

  const handleClaimOwner = async () => {
    setClaiming(true);
    try {
      await claimOwnership();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to claim owner access.', 'error');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-8">
        <div className="border-b border-zinc-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Customer Account
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 mt-1">
              {firebaseUser ? 'Your Account & Orders' : 'Sign in to Blendy'}
            </h1>
          </div>

          {firebaseUser && (
            <div className="flex flex-wrap gap-2.5">
              {isStaff && (
                <Link
                  to="/admin"
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
                >
                  Open Admin Console
                </Link>
              )}
              <button
                type="button"
                onClick={signOutUser}
                className="px-4 py-2 rounded-xl border border-zinc-300 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        {!authReady ? (
          <div className="h-40 rounded-2xl bg-zinc-200/60 animate-pulse" />
        ) : !firebaseUser ? (
          <div className="rounded-2xl bg-white border border-zinc-200 p-8 space-y-5 max-w-xl">
            <h2 className="text-xl font-semibold text-zinc-950">Sign in with Google</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Sign in with your Google account to view past orders placed while signed in, or to
              access store administration if you are an authorized team member. Guest checkout
              remains available without signing in.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={signInWithGoogle}
                className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 cursor-pointer"
              >
                Continue with Google
              </button>
              <Link
                to="/track-order"
                className="px-5 py-3 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Track Guest Order
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-2xl bg-white border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-950">
                  {profile?.displayName || firebaseUser.displayName || 'Blendy Account'}
                </p>
                <p className="text-xs text-zinc-600">{profile?.email || firebaseUser.email}</p>
                <p className="text-xs text-zinc-500">
                  Role: <span className="font-semibold text-zinc-800">{profile?.role || 'customer'}</span>
                </p>
              </div>

              {hasOwner === false && profile?.role === 'customer' && (
                <button
                  type="button"
                  disabled={claiming}
                  onClick={handleClaimOwner}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                >
                  {claiming ? 'Activating...' : 'Claim Store Owner Access'}
                </button>
              )}
            </div>

            <OrderHistory orders={myOrders} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
