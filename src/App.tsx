import React, { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { CartDrawer } from './components/CartDrawer';
import { ChatbotWidget } from './components/ChatbotWidget';
import { CookieBanner } from './components/CookieBanner';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { ToastHost } from './components/ToastHost';
import { StoreProvider } from './context/StoreContext';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactPage } from './pages/ContactPage';
import { ContentPage } from './pages/ContentPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { FaqsPage } from './pages/FaqsPage';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ShopPage } from './pages/ShopPage';
import { Studio3DPage } from './pages/Studio3DPage';
import { TrackOrderPage } from './pages/TrackOrderPage';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const LegalRouteWrapper: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  return <ContentPage slug={slug || 'privacy'} />;
};

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
    <Navbar />
    <main className="flex-1 max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">404</p>
      <h1 className="text-3xl font-bold text-zinc-950">Page not found</h1>
      <p className="text-sm text-zinc-600">
        The page you requested could not be found on Blendy Kenya.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
        >
          Back to Home
        </Link>
      </div>
    </main>
    <Footer />
  </div>
);

export function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  return (
    <StoreProvider>
      {mapsQuotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-50 bg-amber-50 border-b border-amber-300 px-4 py-2.5 text-xs sm:text-sm text-amber-950 flex flex-wrap items-center justify-center gap-2 text-center"
        >
          <span>
            Google Maps demo key quota limit (100 requests/day) reached for this preview.
          </span>
          <a
            href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline hover:text-amber-800"
          >
            Learn about Google Maps quota limits
          </a>
        </div>
      )}
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/:slug" element={<ProductDetailPage />} />
        <Route path="/studio" element={<Studio3DPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/story" element={<ContentPage slug="our-story" />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/faqs" element={<FaqsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/legal/:slug" element={<LegalRouteWrapper />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <CartDrawer />
      <ChatbotWidget />
      <CookieBanner />
      <ToastHost />
    </StoreProvider>
  );
}

export default App;
