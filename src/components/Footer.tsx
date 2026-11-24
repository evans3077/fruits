import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

export const Footer: React.FC = () => {
  const { settings, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subscribedMessage, setSubscribedMessage] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !marketingConsent) {
      showToast('Enter a valid email and tick the consent box to subscribe.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), marketingConsent: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save subscription.');
      }
      setSubscribedMessage('Subscribed to Blendy launch and flavour updates.');
      setEmail('');
      setMarketingConsent(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Subscription failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-zinc-950 text-zinc-300 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Brand & Configured Contact */}
        <div className="md:col-span-4 space-y-3">
          <Link to="/" className="font-brand font-extrabold text-3xl text-white inline-block">
            {settings?.brandName || 'Blendy'}
          </Link>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
            {settings?.strapline || 'Real fruit smoothies'} · Kenyan Shillings (KSh) · Direct online ordering.
          </p>
          {(settings?.supportPhone || settings?.supportEmail || settings?.physicalAddress) ? (
            <div className="text-xs text-zinc-400 space-y-1 pt-2">
              {settings.supportPhone && <p>Phone: {settings.supportPhone}</p>}
              {settings.supportEmail && <p>Email: {settings.supportEmail}</p>}
              {settings.physicalAddress && <p>Location: {settings.physicalAddress}</p>}
              {settings.operatingHours && <p>Hours: {settings.operatingHours}</p>}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 pt-2">
              Store contact details and operating hours can be configured in the Admin console.
            </p>
          )}
        </div>

        {/* Store Links */}
        <div className="md:col-span-2 space-y-2.5 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Store
          </h3>
          <ul className="space-y-2">
            <li><Link to="/shop" className="hover:text-white transition-colors">Shop Smoothies</Link></li>
            <li><Link to="/studio" className="hover:text-white transition-colors">3D Bottle Studio</Link></li>
            <li><Link to="/story" className="hover:text-white transition-colors">Our Story</Link></li>
            <li><Link to="/delivery" className="hover:text-white transition-colors">Delivery &amp; Pickup</Link></li>
            <li><Link to="/faqs" className="hover:text-white transition-colors">FAQs</Link></li>
            <li><Link to="/track-order" className="hover:text-white transition-colors">Track Order</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Legal & Operations */}
        <div className="md:col-span-2 space-y-2.5 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Policies
          </h3>
          <ul className="space-y-2">
            <li><Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy Notice</Link></li>
            <li><Link to="/legal/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
            <li><Link to="/legal/returns" className="hover:text-white transition-colors">Returns &amp; Refunds</Link></li>
            <li><Link to="/legal/cookies" className="hover:text-white transition-colors">Cookie Notice</Link></li>
            <li><Link to="/admin" className="text-zinc-400 hover:text-white transition-colors">Admin Console</Link></li>
          </ul>
        </div>

        {/* Consent-Gated Newsletter */}
        <div className="md:col-span-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Updates
          </h3>
          <p className="text-sm text-zinc-400">
            Receive restock and seasonal flavour alerts when published. Opt-in only.
          </p>
          {subscribedMessage ? (
            <p className="text-sm text-emerald-400 font-medium">{subscribedMessage}</p>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="flex gap-2">
                <label htmlFor="footer-email" className="sr-only">Email address</label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.co.ke"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-lg bg-white text-zinc-950 text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Join'}
                </button>
              </div>
              <label className="flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-600 bg-zinc-900"
                />
                <span>
                  I agree to receive store updates by email and can unsubscribe at any time.
                </span>
              </label>
            </form>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-800/80 py-5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} {settings?.brandName || 'Blendy'}. All rights reserved.</p>
          <p>{settings?.taxLabel || 'Kenyan Shillings (KSh)'}</p>
        </div>
      </div>
    </footer>
  );
};
