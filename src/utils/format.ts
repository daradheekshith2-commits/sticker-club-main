import { brand } from '../config/brand';

// Created once and reused: building an Intl formatter is relatively slow.
const priceFormatter = new Intl.NumberFormat(brand.locale, {
  style: 'currency',
  currency: brand.currency,
  maximumFractionDigits: 0,
});

/** 129 → "₹129", 1299 → "₹1,299" (Indian digit grouping via en-IN). */
export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
