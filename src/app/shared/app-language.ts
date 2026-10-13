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

/**
 * LOCALE_ID is read once at startup, so after switching language the dates
 * follow on the next page load.
 */
export function savedLocale(): string {
  return LOCALES[savedLanguage()];
}
