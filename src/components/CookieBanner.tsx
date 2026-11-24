import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

export const CookieBanner: React.FC = () => {
  const { consent, acceptConsent } = useStore();

  if (consent !== 'pending') return null;

  return (
    <aside
      aria-label="Cookie and storage preferences"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 bg-zinc-950 text-zinc-100 rounded-xl shadow-2xl border border-zinc-800 p-4 sm:p-5"
    >
      <p className="text-sm font-semibold text-white">Cookie &amp; Storage Preferences</p>
      <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
        We use essential storage to keep your shopping bag working. Optional analytics stay off unless you choose to accept them.{' '}
        <Link to="/legal/cookies" className="underline text-white hover:text-zinc-200">
          Cookie Notice
        </Link>
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => acceptConsent('essential_only')}
          className="px-3.5 py-2 rounded-lg border border-zinc-700 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Essential only
        </button>
        <button
          type="button"
          onClick={() => acceptConsent('accepted_all')}
          className="px-3.5 py-2 rounded-lg bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          Accept analytics
        </button>
      </div>
    </aside>
  );
};
