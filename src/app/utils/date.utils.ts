const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `new Date('YYYY-MM-DD')` is midnight UTC, which is the previous evening west of UTC
 * (Honduras). A date-only string is a calendar day, so read it as midnight local time:
 * a date-time without an offset is local by spec.
 */
export function parseDate(date: Date | string): Date {
  return typeof date === 'string' && DATE_ONLY.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
}

/** `YYYY-MM-DD` of the local calendar day (`toISOString` gives the UTC day, which drifts near midnight). */
export function localDateKey(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The local calendar day after `now`, as `YYYY-MM-DD` (what an `<input type="date">` takes). */
export function tomorrowKey(now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDateKey(tomorrow);
}
