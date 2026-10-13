export type AppLanguage = 'es' | 'en';

/** Locale Angular's date and number pipes format with, per app language. */
const LOCALES: Record<AppLanguage, string> = { es: 'es-HN', en: 'en-US' };

/**
 * The language the app starts in: the one the user picked before, otherwise
 * Spanish, whatever the browser's language.
 */
export function savedLanguage(): AppLanguage {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('language');
  } catch {
    // Storage blocked: fall through to the default.
  }
  return saved === 'en' || saved === 'es' ? saved : 'es';
}

/** Locale to format dates with for a language; Spanish (Honduras) unless it is English. */
export function localeFor(language: string | null | undefined): string {
  return language === 'en' ? LOCALES.en : LOCALES.es;
}

/**
 * LOCALE_ID, read once at startup. Number pipes use it (es-HN and en-US
 * format numbers the same way); dates go through AppDatePipe and localeFor()
 * instead, so they follow a language switch without reloading.
 */
export function savedLocale(): string {
  return LOCALES[savedLanguage()];
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** A cached Intl.DateTimeFormat for the given app language (see localeFor). */
export function dateFormatterFor(language: string | null | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = localeFor(language);
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}
