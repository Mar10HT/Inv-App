import { parseDate } from '../../utils/date.utils';

const DATE_STYLE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

export function formatDate(date: Date | string): string {
  return parseDate(date).toLocaleDateString('es-HN', DATE_STYLE);
}

export function formatDateTime(date: Date | string): string {
  return parseDate(date).toLocaleDateString('es-HN', { ...DATE_STYLE, hour: '2-digit', minute: '2-digit' });
}
