import type { Locale } from '@/lib/i18n';

/** Display currency. The backend stores plain decimals with no currency field. */
export const DISPLAY_CURRENCY = 'EGP';

export function formatPrice(value: string | number, locale: Locale): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  // Western digits in both languages for consistency with the rest of the UI.
  const tag = locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-EG';
  return new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: DISPLAY_CURRENCY,
    // Whole-pound prices read as 320; a price with piasters keeps them (185.50) instead of being rounded.
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: string | number, locale: Locale): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-EG').format(n);
}
