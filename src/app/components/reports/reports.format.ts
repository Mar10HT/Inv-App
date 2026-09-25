const DATE_STYLE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `new Date('YYYY-MM-DD')` is midnight UTC, which is the previous evening west of UTC
 * (Honduras). A date-only string is a calendar day, so read it as midnight local time.
 */
export function parseDate(date: Date | string): Date {
  const parts = typeof date === 'string' ? DATE_ONLY.exec(date) : null;
  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : new Date(date);
}

/** `YYYY-MM-DD` of the local calendar day (`toISOString` gives the UTC day, which drifts near midnight). */
export function localDateKey(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDate(date: Date | string): string {
  return parseDate(date).toLocaleDateString('es-HN', DATE_STYLE);
}

export function formatDateTime(date: Date | string): string {
  return parseDate(date).toLocaleDateString('es-HN', { ...DATE_STYLE, hour: '2-digit', minute: '2-digit' });
}
