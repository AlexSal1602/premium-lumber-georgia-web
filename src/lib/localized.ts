import { locales } from './locales';
import type { Localized } from './catalog/types';

/** Older database rows may predate a language. Never let a missing value crash rendering. */
export function localized(value: unknown, defaults?: Partial<Localized>): Localized {
 const input = value && typeof value === 'object' ? value as Partial<Localized> : {};
 const fallback = input.en || input.ka || input.ru || '';
 return Object.fromEntries(locales.map(locale => [locale, input[locale]?.trim() || defaults?.[locale] || fallback])) as Localized;
}
