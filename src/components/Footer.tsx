import React, { useState } from 'react';
import type { FlavourFilter } from '../types';

interface FooterProps {
  onSelectFlavour: (flavour: FlavourFilter) => void;
  onOpenAccount: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectFlavour, onOpenAccount }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Could not subscribe.');
        return;
      }
      setStatus('success');
      setMessage(data.message || 'Subscribed.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Network error subscribing.');
    }
  };

  return (
    <footer className="bg-zinc-950 text-zinc-300 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <a href="#top" className="font-brand text-3xl font-extrabold text-white tracking-tight">
            Blendy
          </a>
          <p className="mt-3 text-sm text-zinc-400 max-w-xs leading-relaxed">
            Real cold-pressed fruit smoothies delivered chilled in recyclable glass bottles.
          </p>
        </div>

        <div className="md:col-span-2 space-y-2.5 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Flavours</h3>
          <ul className="space-y-2">
            {(['Berry', 'Kiwi', 'Banana', 'Strawberry'] as FlavourFilter[]).map((flavour) => (
              <li key={flavour}>
                <a
                  href="#catalog"
                  onClick={() => onSelectFlavour(flavour)}
                  className="hover:text-white transition-colors"
                >
                  {flavour}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2 space-y-2.5 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Store</h3>
          <ul className="space-y-2">
            <li>
              <a href="#catalog" className="hover:text-white transition-colors">
                All Smoothies
              </a>
            </li>
            <li>
              <a href="#craft" className="hover:text-white transition-colors">
                Our Craft
              </a>
            </li>
            <li>
              <button
                type="button"
                onClick={onOpenAccount}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Track Order
              </button>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Seasonal Drops
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Get notified when limited orchard batches press.
          </p>
          <form onSubmit={handleSubscribe} className="mt-3 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address for newsletter"
              className="flex-1 h-10 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-4 h-10 text-xs font-semibold text-zinc-950 bg-white rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
            >
              Join
            </button>
          </form>
          {message && (
            <p
              className={`mt-2 text-xs ${
                status === 'error' ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <span>© 2026 Blendy Smoothies. All rights reserved.</span>
          <span>Test Promo Codes: BLENDY10 · FRESH5 · FREESHIP</span>
        </div>
      </div>
    </footer>
  );
};
