import { savedLanguage, savedLocale } from './app-language';

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
});
