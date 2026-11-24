/**
 * Consent-gated storefront analytics abstraction.
 * Events are only emitted when the visitor explicitly opts into analytics cookies.
 * Never attaches customer PII (names, phone numbers, addresses, emails).
 */

export type AnalyticsEventName =
  | 'view_item_list'
  | 'select_item'
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'add_shipping_info'
  | 'add_payment_info'
  | 'purchase';

const CONSENT_KEY = 'blendy_consent_v1';
const PURCHASE_TRACKED_KEY = 'blendy_tracked_orders_v1';

export type ConsentChoice = 'pending' | 'essential_only' | 'accepted_all';

export function getStoredConsent(): ConsentChoice {
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === 'essential_only' || val === 'accepted_all') return val;
  } catch {
    // ignore storage restriction
  }
  return 'pending';
}

export function setStoredConsent(choice: Exclude<ConsentChoice, 'pending'>): void {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // ignore storage restriction
  }
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackStoreEvent(
  event: AnalyticsEventName,
  payload: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') return;
  if (getStoredConsent() !== 'accepted_all') return;

  if (event === 'purchase') {
    const ref = typeof payload.transaction_id === 'string' ? payload.transaction_id : '';
    if (!ref) return;
    try {
      const seenRaw = sessionStorage.getItem(PURCHASE_TRACKED_KEY);
      const seen: string[] = seenRaw ? JSON.parse(seenRaw) : [];
      if (seen.includes(ref)) return;
      seen.push(ref);
      sessionStorage.setItem(PURCHASE_TRACKED_KEY, JSON.stringify(seen));
    } catch {
      // continue if sessionStorage unavailable
    }
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    currency: 'KES',
    ...payload,
  });
}
