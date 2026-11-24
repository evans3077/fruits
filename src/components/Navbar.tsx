import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface NavbarProps {
  alwaysVisible?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ alwaysVisible = true }) => {
  const { settings, cartCount, setCartDrawerOpen, profile, firebaseUser } = useStore();
  const location = useLocation();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const isStaff = Boolean(
    profile && ['owner', 'manager', 'fulfilment_staff'].includes(profile.role)
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (alwaysVisible) return;
    const onScroll = () => {
      setScrolledPastHero(window.scrollY > Math.max(260, window.innerHeight * 0.72));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [alwaysVisible]);

  const showAnnouncement =
    Boolean(settings?.announcementEnabled) &&
    Boolean(settings?.announcementText?.trim()) &&
    !announcementDismissed;

  const visible = alwaysVisible || scrolledPastHero;

  const navLinks = [
    { to: '/shop', label: 'Shop' },
    { to: '/studio', label: '3D Studio' },
    { to: '/story', label: 'Our Story' },
    { to: '/delivery', label: 'Delivery' },
    { to: '/faqs', label: 'FAQs' },
    { to: '/track-order', label: 'Track Order' },
  ];

  return (
    <div
      className={
        alwaysVisible
          ? 'sticky top-0 z-40'
          : `fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
              visible
                ? 'translate-y-0 opacity-100'
                : '-translate-y-full opacity-0 pointer-events-none'
            }`
      }
    >
      {showAnnouncement && (
        <div className="bg-zinc-900 text-white text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-4">
          <p className="text-center font-medium">{settings?.announcementText}</p>
          <button
            type="button"
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss announcement"
            className="p-1 text-zinc-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <header className="bg-[#FAF9F7]/95 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Wordmark */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 -ml-2 text-zinc-800 hover:text-zinc-950"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link
              to="/"
              className="font-brand font-extrabold text-3xl tracking-tight text-zinc-900 leading-none"
            >
              {settings?.brandName || 'Blendy'}
            </Link>
          </div>

          {/* Center: Primary Navigation */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main storefront navigation">
            {navLinks.map((item) => {
              const active =
                location.pathname === item.to ||
                (item.to === '/shop' && location.pathname.startsWith('/shop/'));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm font-medium transition-colors py-1 border-b-2 ${
                    active
                      ? 'text-zinc-950 border-zinc-900'
                      : 'text-zinc-600 border-transparent hover:text-zinc-950'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {isStaff && (
              <Link
                to="/admin"
                className={`text-sm font-semibold transition-colors py-1 border-b-2 ${
                  location.pathname.startsWith('/admin')
                    ? 'text-zinc-950 border-zinc-900'
                    : 'text-zinc-700 border-transparent hover:text-zinc-950'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Right: Account & Bag Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/account"
              className="inline-flex items-center gap-2 px-3 py-2 min-h-10 text-sm font-medium text-zinc-700 hover:text-zinc-950 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">
                {profile?.displayName
                  ? profile.displayName.split(' ')[0]
                  : firebaseUser?.email
                    ? 'Account'
                    : 'Sign in'}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              aria-label="Open shopping bag"
              className="inline-flex items-center gap-2 px-4 py-2 min-h-10 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums">
                Bag{cartCount > 0 ? ` (${cartCount})` : ''}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileOpen && (
          <nav
            className="md:hidden border-t border-zinc-200 bg-[#FAF9F7] px-4 py-4 space-y-1"
            aria-label="Mobile navigation"
          >
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="block px-3 py-2.5 rounded-lg text-base font-medium text-zinc-800 hover:bg-zinc-100"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/contact"
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Contact
            </Link>
            <Link
              to="/admin"
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-zinc-800 hover:bg-zinc-100"
            >
              {isStaff ? 'Store Admin' : 'Staff Console'}
            </Link>
          </nav>
        )}
      </header>
    </div>
  );
};
