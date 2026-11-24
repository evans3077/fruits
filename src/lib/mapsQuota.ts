export function isGmpQuotaError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : JSON.stringify(err ?? '');
  const status = (err as { status?: number; code?: number | string })?.status
    ?? (err as { code?: number | string })?.code;

  if (status === 429 || status === 'RESOURCE_EXHAUSTED' || status === 'OVER_QUERY_LIMIT') {
    return true;
  }

  return /OverQuotaMapError|QuotaExceededError|RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|quota|429/i.test(
    msg
  );
}

export function dispatchGmpQuotaExceeded(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}
