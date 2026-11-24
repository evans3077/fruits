import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Google Maps Demo-Key Quota Defense (Tier 1: Maps JS SDK auth/quota failure signals)
if (typeof window !== 'undefined') {
  const gmpWin = window as Window & { gm_authFailure?: () => void };
  gmpWin.gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  };

  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    origConsoleError.apply(console, args);
    const msg = args.map((a) => String(a)).join(' ');
    if (/OverQuotaMapError|QuotaExceededError|You have exceeded your request quota/i.test(msg)) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
