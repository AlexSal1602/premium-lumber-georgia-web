import type { Localized } from '../catalog/types';

export const targetLocales = ['en', 'ru', 'uk', 'he', 'ar'] as const;
export type TargetLocale = typeof targetLocales[number];
export type TranslationValue = Localized & { _sources?: Partial<Record<TargetLocale, string>> };

export function sourceFingerprint(text: string) {
  let hash = 2166136261;
  const source = text.trim();
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return `${source.length}:${hash >>> 0}`;
}

export function translationStatus(value: TranslationValue, locale: TargetLocale) {
  if (!value[locale]?.trim()) return 'missing';
  if (value._sources?.[locale] !== undefined && value._sources[locale] !== sourceFingerprint(value.ka)) return 'stale';
  return 'ready';
}

// Snapshot legacy translations before changing their Georgian source.
export function changeSource(value: TranslationValue, ka: string): TranslationValue {
  return { ...value, ka, _sources: Object.fromEntries(targetLocales.map(locale => [locale, value._sources?.[locale] ?? sourceFingerprint(value.ka)])) };
}

export function acceptTranslation(value: TranslationValue, locale: TargetLocale, text: string): TranslationValue {
  return { ...value, [locale]: text, _sources: { ...value._sources, [locale]: sourceFingerprint(value.ka) } };
}
