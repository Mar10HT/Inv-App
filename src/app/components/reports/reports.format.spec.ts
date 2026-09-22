import { formatDate, formatDateTime } from './reports.format';

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
  });
});
