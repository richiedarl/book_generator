/**
 * Shared display formatting used by both the payment UI and the admin panel.
 */

export type CurrencyCode = 'ngn' | 'usd';

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  ngn: '\u20A6',
  usd: '$',
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency as CurrencyCode] ?? '';
}

/** Format a major-unit amount, e.g. 4900 → "₦4,900.00". */
export function formatAmount(amount: number, currency: string): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = safeAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currencySymbol(currency)}${formatted}`;
}

/** Format an amount stored in minor units (kobo/cents). */
export function formatMinorUnits(minorUnits: number, currency: string): string {
  return formatAmount(minorUnits / 100, currency);
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Human readable label for a payment or token delivery state. */
export function humanizeStatus(status: string | null): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
