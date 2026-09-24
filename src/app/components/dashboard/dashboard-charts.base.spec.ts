import { signal, WritableSignal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ApexAxisChartSeries, ApexNonAxisChartSeries } from 'ng-apexcharts';

import { DashboardChartsBase } from './dashboard-charts.base';
import { CustomChart } from './custom-chart-dialog/custom-chart-dialog';
import { StatusChartOptions, BarChartOptions, LowStockItem } from './components';
import { DashboardStats, CategoryStats, WarehouseStats } from '../../services/dashboard.service';
import { ThemeService } from '../../services/theme.service';
import { InventoryItemInterface, InventoryStatus } from '../../interfaces/inventory-item.interface';

/** Provides the state the component normally owns; the translate stub echoes keys. */
class TestCharts extends DashboardChartsBase {
  protected readonly translate = { instant: (key: string) => key } as unknown as TranslateService;
  dark = false;
  protected readonly themeService = { isDark: () => this.dark } as unknown as ThemeService;
  readonly stats = signal<DashboardStats | null>(null);
  readonly categoryStats = signal<CategoryStats[]>([]);
  readonly warehouseStats = signal<WarehouseStats[]>([]);
  readonly lowStockItems = signal<LowStockItem[]>([]);
  readonly allItems = signal<InventoryItemInterface[]>([]);
  readonly statusChartSeries: WritableSignal<ApexNonAxisChartSeries> = signal([]);
  readonly statusChartOptions: WritableSignal<StatusChartOptions | null> = signal(null);
  readonly categoryChartSeries: WritableSignal<ApexAxisChartSeries> = signal([]);
  readonly categoryChartOptions: WritableSignal<BarChartOptions | null> = signal(null);
  readonly warehouseChartSeries: WritableSignal<ApexAxisChartSeries> = signal([]);
  readonly warehouseChartOptions: WritableSignal<BarChartOptions | null> = signal(null);

  protected getStatusLabel(status: InventoryStatus): string {
    return `STATUS.${status}`;
  }

  // Expose the protected helpers under test.
  byCurrency(currency?: 'USD' | 'HNL' | 'ALL'): InventoryItemInterface[] {
    return this.getFilteredItemsByCurrency(currency);
  }
  valueBy(groupBy: 'category' | 'warehouse' | 'supplier' | 'status', currency?: 'USD' | 'HNL' | 'ALL') {
    return this.calculateValueDataForChart(groupBy, currency);
  }
  topItems(currency?: 'USD' | 'HNL' | 'ALL') {
    return this.calculateTopItemsForChart(currency);
  }
}

const item = (overrides: Record<string, unknown> = {}): InventoryItemInterface =>
  ({
    name: 'Item',
    category: 'Laptops',
    price: 100,
    quantity: 1,
    currency: 'USD',
    status: InventoryStatus.IN_STOCK,
    warehouse: { name: 'North' },
    supplier: { name: 'Acme' },
    ...overrides
  }) as unknown as InventoryItemInterface;

const chart = (dataSource: string, chartType = 'bar', currency?: string): CustomChart =>
  ({ dataSource, chartType, currency }) as unknown as CustomChart;

describe('DashboardChartsBase', () => {
  let charts: TestCharts;

  beforeEach(() => {
    charts = new TestCharts();
  });

  describe('currency filtering', () => {
    beforeEach(() => {
      charts.allItems.set([item({ name: 'a', currency: 'USD' }), item({ name: 'b', currency: 'HNL' })]);
    });

    it('defaults to USD', () => {
      expect(charts.byCurrency().map((i) => i.name)).toEqual(['a']);
    });

    it('filters by the given currency', () => {
      expect(charts.byCurrency('HNL').map((i) => i.name)).toEqual(['b']);
    });

    it('returns every item for ALL', () => {
      expect(charts.byCurrency('ALL').length).toBe(2);
    });
  });

  describe('value calculations', () => {
    beforeEach(() => {
      charts.allItems.set([
        item({ name: 'a', category: 'Laptops', price: 10.01, quantity: 3 }),
        item({ name: 'b', category: 'Laptops', price: 5, quantity: 2 }),
        item({ name: 'c', category: 'Cables', price: 1, quantity: 1 }),
        item({ name: 'd', category: '', price: 2, quantity: 1 })
      ]);
    });

    it('groups value by category, rounded to cents and sorted from highest to lowest', () => {
      expect(charts.valueBy('category')).toEqual([
        { name: 'Laptops', count: 40.03 },
        { name: 'COMMON.NO_CATEGORY', count: 2 },
        { name: 'Cables', count: 1 }
      ]);
    });

    it('groups value by warehouse, supplier and status using their labels', () => {
      expect(charts.valueBy('warehouse')).toEqual([{ name: 'North', count: 43.03 }]);
      expect(charts.valueBy('supplier')[0].name).toBe('Acme');
      expect(charts.valueBy('status')[0].name).toBe('STATUS.IN_STOCK');
    });

    it('falls back to the "no warehouse" and "no supplier" labels', () => {
      charts.allItems.set([item({ warehouse: undefined, supplier: undefined })]);

      expect(charts.valueBy('warehouse')[0].name).toBe('COMMON.NO_WAREHOUSE');
      expect(charts.valueBy('supplier')[0].name).toBe('COMMON.NO_SUPPLIER');
    });

    it('lists the ten most valuable items first', () => {
      charts.allItems.set(Array.from({ length: 12 }, (_, i) => item({ name: `i${i}`, price: i + 1, quantity: 1 })));

      const top = charts.topItems();

      expect(top.length).toBe(10);
      expect(top[0]).toEqual({ name: 'i11', count: 12 });
      expect(top[9]).toEqual({ name: 'i2', count: 3 });
    });
  });

  describe('getCustomChartData', () => {
    it('counts items per category', () => {
      charts.categoryStats.set([{ category: 'Laptops', count: 4 }, { category: '', count: 1 }] as CategoryStats[]);

      const result = charts.getCustomChartData(chart('categories'));

      expect(result.labels).toEqual(['Laptops', 'COMMON.NO_CATEGORY']);
      expect(result.series).toEqual([{ name: 'Items', data: [4, 1] }]);
    });

    it('counts items per warehouse', () => {
      charts.warehouseStats.set([{ name: 'North', itemCount: 7 }] as WarehouseStats[]);

      expect(charts.getCustomChartData(chart('warehouses')).series).toEqual([{ name: 'Items', data: [7] }]);
    });

    it('splits the inventory by stock status', () => {
      charts.stats.set({ inStockItems: 5, lowStockItems: 2, outOfStockItems: 1, inUseItems: 3 } as DashboardStats);

      const result = charts.getCustomChartData(chart('status'));

      expect(result.labels).toEqual(['DASHBOARD.IN_STOCK', 'DASHBOARD.LOW_STOCK', 'DASHBOARD.OUT_OF_STOCK', 'DASHBOARD.IN_USE']);
      expect(result.series).toEqual([{ name: 'Items', data: [5, 2, 1, 3] }]);
    });

    it('treats missing stats as zero', () => {
      const result = charts.getCustomChartData(chart('status'));

      expect(result.series).toEqual([{ name: 'Items', data: [0, 0, 0, 0] }]);
    });

    it('shows only the five lowest stock items', () => {
      charts.lowStockItems.set(Array.from({ length: 8 }, (_, i) => ({ name: `n${i}`, quantity: i })) as LowStockItem[]);

      const result = charts.getCustomChartData(chart('lowStock'));

      expect(result.labels.length).toBe(5);
    });

    it('uses a plain number series for pie, donut and radialBar charts', () => {
      charts.categoryStats.set([{ category: 'Laptops', count: 4 }] as CategoryStats[]);

      for (const type of ['pie', 'donut', 'radialBar']) {
        expect(charts.getCustomChartData(chart('categories', type)).series).toEqual([4]);
      }
    });

    it('names the series after the currency for value sources', () => {
      charts.allItems.set([item({ price: 2, quantity: 5, currency: 'HNL' })]);

      expect(charts.getCustomChartData(chart('valueByCategory', 'bar', 'HNL')).series).toEqual([
        { name: 'Value (L)', data: [10] }
      ]);

      charts.allItems.set([item({ price: 2, quantity: 5, currency: 'USD' })]);
      expect(charts.getCustomChartData(chart('valueByCategory', 'bar')).series).toEqual([
        { name: 'Value ($)', data: [10] }
      ]);
    });

    it('returns the top items by value', () => {
      charts.allItems.set([item({ name: 'x', price: 3, quantity: 1 }), item({ name: 'y', price: 9, quantity: 1 })]);

      expect(charts.getCustomChartData(chart('topItemsByValue')).labels).toEqual(['y', 'x']);
    });
  });

  describe('getCustomChartOptions', () => {
    const options = (dataSource: string, chartType = 'bar', currency?: string, color = '#4d7c6f') =>
      charts.getCustomChartOptions({ dataSource, chartType, currency, color } as unknown as CustomChart);

    it('draws a chart with axes in the chosen color only', () => {
      expect(options('categories', 'bar').colors).toEqual(['#4d7c6f']);
    });

    it('draws a circle chart with the palette of the chosen color', () => {
      expect(options('categories', 'donut').colors).toEqual(['#4d7c6f', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308']);
    });

    it('uses the color alone for a circle chart that has no palette', () => {
      expect(options('categories', 'pie', undefined, '#123456').colors).toEqual(['#123456']);
    });

    it('sizes the hole of a donut and closes the one of a pie', () => {
      expect(options('categories', 'donut').plotOptions.pie?.donut?.size).toBe('60%');
      expect(options('categories', 'pie').plotOptions.pie?.donut?.size).toBe('0%');
    });

    it('rounds the bars of a chart with axes', () => {
      expect(options('categories', 'bar').plotOptions.bar?.borderRadius).toBe(4);
    });

    it('leaves the x axis alone for a circle chart and tilts the labels of the others', () => {
      expect(options('categories', 'pie').xaxis).toEqual({});
      expect(options('categories', 'bar').xaxis.labels?.rotate).toBe(-45);
    });

    it('shows money on the axis and the tooltip of a value chart, in USD by default', () => {
      const chart = options('valueByCategory');
      const yaxisFormatter = chart.yaxis as { labels: { formatter: (v: number) => string } };

      expect(yaxisFormatter.labels.formatter(1234.5)).toBe('$1,234.50');
      expect(chart.tooltip.y).toEqual({ formatter: jasmine.any(Function) });
      expect((chart.tooltip.y as { formatter: (v: number) => string }).formatter(1234.5)).toBe('$1,234.50');
    });

    it('shows lempiras for a HNL value chart', () => {
      const yaxisFormatter = options('topItemsByValue', 'bar', 'HNL').yaxis as { labels: { formatter: (v: number) => string } };

      expect(yaxisFormatter.labels.formatter(1234.5)).toBe('L1,234.50');
    });

    it('shows a plain count for a chart of item counts', () => {
      const yaxisFormatter = options('categories').yaxis as { labels: { formatter: (v: number) => string } };

      expect(yaxisFormatter.labels.formatter(1234)).toBe('1,234');
    });

    it('follows the theme in the tooltip', () => {
      expect(options('categories').tooltip.theme).toBe('light');
      charts.dark = true;
      expect(options('categories').tooltip.theme).toBe('dark');
    });
  });
});
