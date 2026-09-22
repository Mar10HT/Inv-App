import { formatDate, formatDateTime } from './reports.format';

describe('reports.format', () => {
  describe('formatDateTime', () => {
    it('formats a Date with the day and the time', () => {
      expect(formatDateTime(new Date('2026-01-15T12:00:00Z'))).toMatch(/^15\b.*2026.*\d{2}:\d{2}/);
    });

    it('accepts an ISO string', () => {
      expect(formatDateTime('2026-01-15T12:00:00Z')).toBe(formatDateTime(new Date('2026-01-15T12:00:00Z')));
    });
  });

  describe('formatDate', () => {
    it('formats a Date in the es-HN short style', () => {
      expect(formatDate(new Date('2026-01-15T12:00:00Z'))).toMatch(/^15\b.*2026$/);
    });

    it('accepts an ISO string', () => {
      expect(formatDate('2026-01-15T12:00:00Z')).toBe(formatDate(new Date('2026-01-15T12:00:00Z')));
    });

    it('does not include the time', () => {
      expect(formatDate('2026-01-15T12:00:00Z')).not.toMatch(/\d{2}:\d{2}/);
    });
  });
});
