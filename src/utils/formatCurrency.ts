import type { StoreSettings } from '../types/index.ts';

export function formatCurrency(amountInUsd: number, settings: Pick<StoreSettings, 'currency' | 'exchangeRate'>): string {
  if (settings.currency === 'KHR') {
    const amountInKhr = Math.round(amountInUsd * settings.exchangeRate);
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amountInKhr)} ៛`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInUsd);
}
