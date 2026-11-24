import crypto from 'node:crypto';

export type PaymentEnvironment = 'live' | 'sandbox' | 'simulator' | 'unconfigured';

export interface PaymentProviderStatus {
  provider: 'intasend' | 'sandbox_sim' | 'none';
  environment: PaymentEnvironment;
  mpesaAvailable: boolean;
  isLive: boolean;
  label: string;
}

export interface StkPushRequest {
  amountCents: number;
  phone254: string;
  orderRef: string;
}

export interface StkPushResponse {
  provider: 'intasend' | 'sandbox_sim';
  environment: PaymentEnvironment;
  invoiceId: string;
  state: 'PENDING' | 'PROCESSING';
  rawMeta: Record<string, unknown>;
}

export interface PaymentStatusResult {
  invoiceId: string;
  state: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'CANCELED';
  mpesaReceipt: string;
  failureReason: string;
  rawMeta: Record<string, unknown>;
}

const INTASEND_BASE_URL = 'https://api.intasend.com/api/v1';

export function getPaymentProviderStatus(): PaymentProviderStatus {
  const secretKey = (process.env.INTASEND_SECRET_KEY || '').trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (secretKey.startsWith('ISSecretKey_live_')) {
    return {
      provider: 'intasend',
      environment: 'live',
      mpesaAvailable: true,
      isLive: true,
      label: 'IntaSend M-Pesa (Live)',
    };
  }

  if (secretKey.startsWith('ISSecretKey_test_') || secretKey.length > 0) {
    return {
      provider: 'intasend',
      environment: 'sandbox',
      mpesaAvailable: true,
      isLive: false,
      label: 'IntaSend M-Pesa (Sandbox)',
    };
  }

  if (!isProd) {
    return {
      provider: 'sandbox_sim',
      environment: 'simulator',
      mpesaAvailable: true,
      isLive: false,
      label: 'Development Payment Simulator (Non-Live)',
    };
  }

  return {
    provider: 'none',
    environment: 'unconfigured',
    mpesaAvailable: false,
    isLive: false,
    label: 'M-Pesa Not Configured',
  };
}

export function verifyIntaSendChallenge(incomingChallenge: unknown): boolean {
  const expected = (process.env.INTASEND_WEBHOOK_CHALLENGE || '').trim();
  if (!expected || typeof incomingChallenge !== 'string') {
    return false;
  }
  const a = Buffer.from(incomingChallenge.trim(), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function initiateMpesaStkPush(input: StkPushRequest): Promise<StkPushResponse> {
  const status = getPaymentProviderStatus();
  if (!status.mpesaAvailable || status.provider === 'none') {
    throw new Error('M-Pesa payment gateway is not configured in this environment.');
  }

  // IntaSend accepts KES major units (integer or 2 decimal amount)
  const amountKes = Math.round(input.amountCents) / 100;

  if (status.provider === 'sandbox_sim') {
    const invoiceId = `SIM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return {
      provider: 'sandbox_sim',
      environment: 'simulator',
      invoiceId,
      state: 'PROCESSING',
      rawMeta: {
        simulator: true,
        note: 'Non-live development simulator. Explicit tester action required to settle.',
        api_ref: input.orderRef,
      },
    };
  }

  const secretKey = (process.env.INTASEND_SECRET_KEY || '').trim();
  const res = await fetch(`${INTASEND_BASE_URL}/payment/mpesa-stk-push/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountKes,
      phone_number: input.phone254,
      api_ref: input.orderRef,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error('Payment provider could not initiate M-Pesa STK Push. Please verify your phone number and try again.');
  }

  const invoiceObj = (payload.invoice && typeof payload.invoice === 'object'
    ? payload.invoice
    : payload) as Record<string, unknown>;

  const invoiceId =
    typeof invoiceObj.invoice_id === 'string'
      ? invoiceObj.invoice_id
      : typeof payload.id === 'string'
        ? payload.id
        : '';

  if (!invoiceId) {
    throw new Error('Payment provider returned an incomplete STK Push reference.');
  }

  return {
    provider: 'intasend',
    environment: status.environment,
    invoiceId,
    state: 'PROCESSING',
    rawMeta: {
      invoice_id: invoiceId,
      state: invoiceObj.state ?? 'PROCESSING',
      api_ref: input.orderRef,
    },
  };
}

export async function queryIntaSendPaymentStatus(invoiceId: string): Promise<PaymentStatusResult> {
  const secretKey = (process.env.INTASEND_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new Error('IntaSend secret key is not configured.');
  }

  const res = await fetch(`${INTASEND_BASE_URL}/payment/status/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invoice_id: invoiceId }),
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error('Unable to query payment status from IntaSend.');
  }

  const invoiceObj = (payload.invoice && typeof payload.invoice === 'object'
    ? payload.invoice
    : payload) as Record<string, unknown>;

  const rawState = typeof invoiceObj.state === 'string' ? invoiceObj.state.toUpperCase() : 'PROCESSING';
  const mappedState: PaymentStatusResult['state'] =
    rawState === 'COMPLETE'
      ? 'COMPLETE'
      : rawState === 'FAILED'
        ? 'FAILED'
        : rawState === 'CANCELED' || rawState === 'CANCELLED'
          ? 'CANCELED'
          : rawState === 'PENDING'
            ? 'PENDING'
            : 'PROCESSING';

  return {
    invoiceId,
    state: mappedState,
    mpesaReceipt:
      typeof invoiceObj.mpesa_reference === 'string'
        ? invoiceObj.mpesa_reference
        : typeof invoiceObj.clearing_status === 'string'
          ? ''
          : '',
    failureReason:
      typeof invoiceObj.failed_reason === 'string' ? invoiceObj.failed_reason : '',
    rawMeta: {
      state: rawState,
      failed_code: invoiceObj.failed_code ?? null,
    },
  };
}
