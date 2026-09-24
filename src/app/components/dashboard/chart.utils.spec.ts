import {
  CHART_PALETTES,
  chartColors,
  chartValueFormatter,
  cssVar,
  currencySymbol,
  formatNumber,
  isPieChartType,
  isValueSource,
  seriesName
} from './chart.utils';

describe('chart.utils', () => {
  describe('isPieChartType', () => {
    it('is true for the charts drawn as a circle', () => {
      for (const type of ['pie', 'donut', 'radialBar']) expect(isPieChartType(type)).withContext(type).toBeTrue();
    });

    it('is false for the charts with axes', () => {
      for (const type of ['bar', 'line', 'area']) expect(isPieChartType(type)).withContext(type).toBeFalse();
    });
  });

  describe('isValueSource', () => {
    it('is true for the sources that add up money', () => {
      for (const source of ['valueByCategory', 'valueByWarehouse', 'valueBySupplier', 'valueByStatus', 'topItemsByValue']) {
        expect(isValueSource(source)).withContext(source).toBeTrue();
      }
    });

    it('is false for the sources that count items', () => {
      for (const source of ['categories', 'warehouses', 'status', 'lowStock']) {
        expect(isValueSource(source)).withContext(source).toBeFalse();
      }
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

  describe('formatNumber', () => {
    it('groups thousands and always shows two decimals', () => {
      expect(formatNumber(1234.5)).toBe('1,234.50');
      expect(formatNumber(0)).toBe('0.00');
      expect(formatNumber(1234567.891)).toBe('1,234,567.89');
    });
  });

  describe('chartValueFormatter', () => {
    it('shows money with its symbol for a value chart', () => {
      expect(chartValueFormatter(true, 'USD')(1234.5)).toBe('$1,234.50');
      expect(chartValueFormatter(true, 'HNL')(1234.5)).toBe('L1,234.50');
    });

    it('shows a plain count for the other charts', () => {
      expect(chartValueFormatter(false, 'USD')(1234)).toBe('1,234');
    });
  });

  describe('seriesName', () => {
    it('names a value series after its currency', () => {
      expect(seriesName('valueByCategory', 'HNL')).toBe('Value (L)');
      expect(seriesName('topItemsByValue', 'USD')).toBe('Value ($)');
    });

    it('calls the series of a count chart Items', () => {
      expect(seriesName('categories', 'USD')).toBe('Items');
    });
  });

  describe('chartColors', () => {
    it('gives a circle chart the palette of the chosen color', () => {
      expect(chartColors('#4d7c6f', 'donut')).toEqual(CHART_PALETTES['#4d7c6f']);
    });

    it('falls back to the color itself for a circle chart when there is no palette', () => {
      expect(chartColors('#123456', 'pie')).toEqual(['#123456']);
    });

    it('uses only the chosen color for a chart with axes', () => {
      expect(chartColors('#4d7c6f', 'bar')).toEqual(['#4d7c6f']);
    });

    it('starts every palette with the color it belongs to', () => {
      for (const [color, palette] of Object.entries(CHART_PALETTES)) expect(palette[0]).withContext(color).toBe(color);
    });
  });

  describe('cssVar', () => {
    afterEach(() => document.documentElement.style.removeProperty('--test-chart-color'));

    it('reads a custom property of the page, trimmed', () => {
      document.documentElement.style.setProperty('--test-chart-color', '  #abcdef ');

      expect(cssVar('--test-chart-color', '#000000')).toBe('#abcdef');
    });

    it('falls back when the property is not defined', () => {
      expect(cssVar('--test-chart-color', '#000000')).toBe('#000000');
    });
  });
});
