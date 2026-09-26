export const locales = ['ka', 'en', 'ru', 'uk', 'he', 'ar'] as const;
export type Locale = typeof locales[number];
export const localeNames: Record<Locale, string> = { ka: 'ქართული', en: 'English', ru: 'Русский', uk: 'Українська', he: 'עברית', ar: 'العربية' };
export const intlLocales: Record<Locale, string> = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU', uk: 'uk-UA', he: 'he-IL', ar: 'ar' };
export const isLocale = (value: unknown): value is Locale => typeof value === 'string' && locales.includes(value as Locale);
export const direction = (locale: Locale) => locale === 'he' || locale === 'ar' ? 'rtl' : 'ltr';
export function languagePath(path: string, locale: Locale) {
  const url = new URL(path, 'https://local.invalid');
  const parts = url.pathname.split('/');
  if (isLocale(parts[1])) parts[1] = locale;
  else parts.splice(1, 0, locale);
  return `${parts.join('/')}${url.search}${url.hash}`;
}
export const formatDate = (date: Date, locale: Locale) => new Intl.DateTimeFormat(intlLocales[locale], { dateStyle: 'long', calendar: 'gregory', numberingSystem: locale === 'ar' ? 'arab' : 'latn', timeZone: 'Asia/Tbilisi' }).format(date);
