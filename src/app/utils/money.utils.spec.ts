import { addMoney, currencySymbol, formatMoney, formatMoneyByCurrency, formatNumber, totalOf } from './money.utils';

describe('money.utils', () => {
  describe('formatNumber', () => {
    it('groups thousands and always shows two decimals', () => {
      expect(formatNumber(1234.5)).toBe('1,234.50');
      expect(formatNumber(0)).toBe('0.00');
      expect(formatNumber(1234567.891)).toBe('1,234,567.89');
      expect(formatNumber(1000000)).toBe('1,000,000.00');
    });

    it('keeps the sign of a negative amount', () => {
      expect(formatNumber(-1500)).toBe('-1,500.00');
    });
  });

  describe('currencySymbol', () => {
    it('is L for lempiras and $ for anything else', () => {
      expect(currencySymbol('HNL')).toBe('L');
      expect(currencySymbol('USD')).toBe('$');
      expect(currencySymbol('ALL')).toBe('$');
      expect(currencySymbol(undefined)).toBe('$');
    });
  });

  describe('formatMoney', () => {
    it('puts the symbol of the currency in front of the formatted number', () => {
      expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50');
      expect(formatMoney(1234.5, 'HNL')).toBe('L1,234.50');
    });
  });

  describe('addMoney', () => {
    it('adds to the currency it is given, defaulting to USD, without mutating the total', () => {
      const total = { USD: 10 };

      const next = addMoney(total, 'USD', 5);
      expect(next).toEqual({ USD: 15 });
      expect(total).toEqual({ USD: 10 });

      expect(addMoney(total, 'HNL', 20)).toEqual({ USD: 10, HNL: 20 });
      expect(addMoney({}, undefined, 7)).toEqual({ USD: 7 });
    });
  });

  describe('formatMoneyByCurrency', () => {
    it('formats one currency as a plain amount', () => {
      expect(formatMoneyByCurrency({ USD: 1234.5 })).toBe('$1,234.50');
      expect(formatMoneyByCurrency({ HNL: 5 })).toBe('L5.00');
    });

    it('joins more than one currency instead of summing them', () => {
      expect(formatMoneyByCurrency({ USD: 100, HNL: 50 })).toBe('$100.00 · L50.00');
    });

    it('falls back to $0.00 for an empty total', () => {
      expect(formatMoneyByCurrency({})).toBe('$0.00');
    });
  });

  describe('totalOf', () => {
    it('sums every currency, for ranking rather than for display', () => {
      expect(totalOf({ USD: 100, HNL: 50 })).toBe(150);
      expect(totalOf({})).toBe(0);
    });
  });
});
