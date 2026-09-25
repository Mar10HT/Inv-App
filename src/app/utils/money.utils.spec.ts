import { currencySymbol, formatMoney, formatNumber } from './money.utils';

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
});
