import { parseDate } from '../../utils/date.utils';

const DATE_STYLE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

/** `locale` is the app language's (see localeFor); Spanish (Honduras) when not given. */
export function formatDate(date: Date | string, locale = 'es-HN'): string {
  return parseDate(date).toLocaleDateString(locale, DATE_STYLE);
}

export function formatDateTime(date: Date | string, locale = 'es-HN'): string {
  return parseDate(date).toLocaleDateString(locale, { ...DATE_STYLE, hour: '2-digit', minute: '2-digit' });
}
