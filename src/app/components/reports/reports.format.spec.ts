import { formatDate, formatDateTime, localDateKey, parseDate } from './reports.format';

// A local-time constructor, not an ISO UTC string: the assertions below check
// the day-of-month as rendered, which would shift by one west of UTC (and in
// UTC+12 or beyond) if the date were parsed as UTC instead.
const jan15 = new Date(2026, 0, 15, 12, 30);

describe('reports.format', () => {
  describe('formatDateTime', () => {
    it('formats a Date with the day and the time', () => {
      expect(formatDateTime(jan15)).toMatch(/^15\b.*2026.*12:30/);
    });
  });

  describe('formatDate', () => {
    it('formats a Date in the es-HN short style', () => {
      expect(formatDate(jan15)).toMatch(/^15\b.*2026$/);
    });

    it('does not include the time', () => {
      expect(formatDate(jan15)).not.toMatch(/\d{2}:\d{2}/);
    });

    it('shows a date-only string as that same day, not the previous one west of UTC', () => {
      expect(formatDate('2026-01-15')).toMatch(/^15\b.*2026$/);
    });
  });

  describe('parseDate', () => {
    it('reads a YYYY-MM-DD string as midnight of that local day', () => {
      const parsed = parseDate('2026-09-24');

      expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours()]).toEqual([2026, 8, 24, 0]);
    });

    it('leaves full timestamps and Date objects to the Date constructor', () => {
      expect(parseDate('2026-09-24T12:00:00Z').getTime()).toBe(Date.parse('2026-09-24T12:00:00Z'));
      expect(parseDate(jan15).getTime()).toBe(jan15.getTime());
    });
  });

  describe('localDateKey', () => {
    it('gives the local calendar day at both ends of the day, where toISOString would drift', () => {
      expect(localDateKey(new Date(2026, 8, 24, 0, 30))).toBe('2026-09-24');
      expect(localDateKey(new Date(2026, 8, 24, 23, 30))).toBe('2026-09-24');
    });

    it('pads the month and the day', () => {
      expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
  });
});
