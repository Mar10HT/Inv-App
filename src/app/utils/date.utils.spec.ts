import { localDateKey, parseDate, tomorrowKey } from './date.utils';

// Local-time constructors, not ISO UTC strings: the assertions check the calendar day as the
// user sees it, which drifts by one west of UTC (Honduras) if a date is read as UTC instead.
describe('date.utils', () => {
  describe('parseDate', () => {
    it('reads a YYYY-MM-DD string as midnight of that local day', () => {
      const parsed = parseDate('2026-09-24');

      expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours()]).toEqual([2026, 8, 24, 0]);
    });

    it('leaves full timestamps and Date objects to the Date constructor', () => {
      const moment = new Date(2026, 0, 15, 12, 30);

      expect(parseDate('2026-09-24T12:00:00Z').getTime()).toBe(Date.parse('2026-09-24T12:00:00Z'));
      expect(parseDate(moment).getTime()).toBe(moment.getTime());
    });

    it('gives an invalid date for a day that does not exist instead of rolling into the next month', () => {
      expect(parseDate('2026-13-45').getTime()).toBeNaN();
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

  describe('tomorrowKey', () => {
    it('is the next local day even late in the evening', () => {
      expect(tomorrowKey(new Date(2026, 8, 24, 23, 30))).toBe('2026-09-25');
    });

    it('rolls over the end of the month and the year', () => {
      expect(tomorrowKey(new Date(2026, 8, 30, 22, 0))).toBe('2026-10-01');
      expect(tomorrowKey(new Date(2026, 11, 31, 22, 0))).toBe('2027-01-01');
    });

    it('does not change the date it is given', () => {
      const now = new Date(2026, 8, 24, 12, 0);

      tomorrowKey(now);

      expect(now.getDate()).toBe(24);
    });
  });
});
