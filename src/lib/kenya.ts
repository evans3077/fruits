/**
 * Centralized Kenyan locale, currency (KES minor units), phone normalization,
 * Africa/Nairobi time formatting, and order state transition helpers.
 */

export const KENYA_TIMEZONE = 'Africa/Nairobi';

export const KENYA_COUNTIES = [
  'Nairobi',
  'Kiambu',
  'Kajiado',
  'Machakos',
  'Mombasa',
  'Nakuru',
  'Kisumu',
  'Uasin Gishu',
  'Nyeri',
  'Laikipia',
  'Kilifi',
  'Kwale',
] as const;

/**
 * Format integer minor units (cents, 100 = KSh 1.00) into Kenyan Shillings.
 */
export function formatKsh(cents: number, showDecimals = false): string {
  const safeCents = Number.isFinite(cents) ? Math.round(cents) : 0;
  const amount = safeCents / 100;
  const formatted = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: showDecimals || safeCents % 100 !== 0 ? 2 : 0,
    maximumFractionDigits: showDecimals || safeCents % 100 !== 0 ? 2 : 0,
  }).format(amount);
  return `KSh ${formatted}`;
}

/**
 * Normalize Kenyan mobile inputs (`07...`, `01...`, `254...`, `+254...`)
 * to E.164 `+2547XXXXXXXX` or `+2541XXXXXXXX`, and IntaSend `2547XXXXXXXX` format.
 */
export function normalizeKenyanPhone(raw: string): {
  valid: boolean;
  e164: string;
  intasend: string;
  error?: string;
} {
  if (typeof raw !== 'string') {
    return { valid: false, e164: '', intasend: '', error: 'Phone number is required.' };
  }
  const cleaned = raw.replace(/[\s\-().]/g, '');
  let national9 = '';

  if (/^\+254([17]\d{8})$/.test(cleaned)) {
    national9 = cleaned.slice(4);
  } else if (/^254([17]\d{8})$/.test(cleaned)) {
    national9 = cleaned.slice(3);
  } else if (/^0([17]\d{8})$/.test(cleaned)) {
    national9 = cleaned.slice(1);
  } else if (/^([17]\d{8})$/.test(cleaned)) {
    national9 = cleaned;
  } else {
    return {
      valid: false,
      e164: '',
      intasend: '',
      error: 'Enter a valid Kenyan mobile number (e.g. 0712 345 678 or 0110 123 456).',
    };
  }

  return {
    valid: true,
    e164: `+254${national9}`,
    intasend: `254${national9}`,
  };
}

export function formatNairobiDateTime(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: KENYA_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export type PaymentStatus =
  | 'awaiting_payment'
  | 'pending_confirmation'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type FulfilmentStatus =
  | 'received'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_collection'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  awaiting_payment: ['pending_confirmation', 'paid', 'failed', 'cancelled'],
  pending_confirmation: ['paid', 'failed', 'cancelled', 'awaiting_payment'],
  paid: ['refunded'],
  failed: ['pending_confirmation', 'awaiting_payment', 'cancelled'],
  cancelled: ['pending_confirmation', 'awaiting_payment'],
  refunded: [],
};

const ALLOWED_FULFILMENT_TRANSITIONS: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  received: ['confirmed', 'preparing', 'cancelled'],
  confirmed: ['preparing', 'ready_for_collection', 'out_for_delivery', 'cancelled'],
  preparing: ['ready_for_collection', 'out_for_delivery', 'cancelled'],
  ready_for_collection: ['delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  return ALLOWED_PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionFulfilment(from: FulfilmentStatus, to: FulfilmentStatus): boolean {
  if (from === to) return true;
  return ALLOWED_FULFILMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
