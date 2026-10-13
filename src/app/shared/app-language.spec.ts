import { dateFormatterFor, localeFor, savedLanguage, savedLocale } from './app-language';

describe('app language', () => {
  afterEach(() => localStorage.removeItem('language'));

  it('is Spanish (Honduras) when nothing was saved', () => {
    localStorage.removeItem('language');
    expect(savedLanguage()).toBe('es');
    expect(savedLocale()).toBe('es-HN');
  });

  it('follows the language the user picked', () => {
    localStorage.setItem('language', 'en');
    expect(savedLanguage()).toBe('en');
    expect(savedLocale()).toBe('en-US');
  });

  it('ignores an unsupported saved value', () => {
    localStorage.setItem('language', 'fr');
    expect(savedLanguage()).toBe('es');
  });

  it('formats dates for the language being shown, Spanish unless English', () => {
    expect(localeFor('en')).toBe('en-US');
    expect(localeFor('es')).toBe('es-HN');
    expect(localeFor(undefined)).toBe('es-HN');

    const date = new Date(Date.UTC(2027, 2, 1, 12));
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
    expect(dateFormatterFor('en', options).format(date)).toBe('Mar 1, 2027');
    expect(dateFormatterFor('es', options).format(date)).toBe('1 mar 2027');
    expect(dateFormatterFor('es', options)).toBe(dateFormatterFor('es', options));
  });
});
