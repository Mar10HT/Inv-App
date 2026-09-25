import { TranslateService } from '@ngx-translate/core';
import { ApexNonAxisChartSeries, ApexAxisChartSeries, ApexOptions } from 'ng-apexcharts';
import { DashboardStats, CategoryStats, WarehouseStats } from '../../services/dashboard.service';
import { ThemeService } from '../../services/theme.service';
import { InventoryItemInterface, InventoryStatus } from '../../interfaces/inventory-item.interface';
import { CustomChart, ChartCurrency } from './custom-chart-dialog/custom-chart-dialog';
import { StatusChartOptions, BarChartOptions, LowStockItem } from './components';
import { Signal, WritableSignal } from '@angular/core';
import { chartColors, chartValueFormatter, cssVar, isPieChartType, isValueSource, seriesName } from './chart.utils';

// getCustomChartOptions() always populates these sub-options (unlike ApexOptions'
// own all-optional fields) — narrowing them to required matches what's actually
// returned and satisfies <apx-chart>'s required @Input()s in the template.
export type CustomChartOptions = ApexOptions &
  Required<
    Pick<
      ApexOptions,
      'chart' | 'xaxis' | 'yaxis' | 'colors' | 'grid' | 'plotOptions' | 'dataLabels' | 'legend' | 'tooltip'
    >
  >;

/**
 * Chart data and ApexCharts option builders used by the dashboard. This is plain logic kept apart
 * from the component so each file stays small; the component provides the state declared below.
 */
export abstract class DashboardChartsBase {
  // Provided by the dashboard component.
  protected abstract readonly translate: TranslateService;
  protected abstract readonly themeService: ThemeService;
  protected abstract readonly stats: Signal<DashboardStats | null>;
  protected abstract readonly categoryStats: Signal<CategoryStats[]>;
  protected abstract readonly warehouseStats: Signal<WarehouseStats[]>;
  protected abstract readonly lowStockItems: Signal<LowStockItem[]>;
  protected abstract readonly allItems: Signal<InventoryItemInterface[]>;
  protected abstract readonly statusChartSeries: WritableSignal<ApexNonAxisChartSeries>;
  protected abstract readonly statusChartOptions: WritableSignal<StatusChartOptions | null>;
  protected abstract readonly categoryChartSeries: WritableSignal<ApexAxisChartSeries>;
  protected abstract readonly categoryChartOptions: WritableSignal<BarChartOptions | null>;
  protected abstract readonly warehouseChartSeries: WritableSignal<ApexAxisChartSeries>;
  protected abstract readonly warehouseChartOptions: WritableSignal<BarChartOptions | null>;
  protected abstract getStatusLabel(status: InventoryStatus): string;

  protected get chartForeColor(): string {
    return cssVar('--color-on-surface-variant', '#94a3b8');
  }

  protected get chartGridColor(): string {
    return cssVar('--color-border-subtle', '#2a2a2a');
  }

  protected get chartTextColor(): string {
    return cssVar('--color-on-surface', '#e2e8f0');
  }

  protected get chartTooltipTheme(): string {
    return this.themeService.isDark() ? 'dark' : 'light';
  }

  // Custom chart data methods
  protected getFilteredItemsByCurrency(currency: ChartCurrency = 'USD'): InventoryItemInterface[] {
    const items = this.allItems();
    if (currency === 'ALL') {
      return items;
    }
    return items.filter(item => item.currency === currency);
  }

  protected calculateValueDataForChart(
    groupBy: 'category' | 'warehouse' | 'supplier' | 'status',
    currency: ChartCurrency = 'USD'
  ): { name: string; count: number }[] {
    const items = this.getFilteredItemsByCurrency(currency);
    const grouped = new Map<string, number>();

    items.forEach(item => {
      let key: string;
      switch (groupBy) {
        case 'category':
          key = item.category || this.translate.instant('COMMON.NO_CATEGORY');
          break;
        case 'warehouse':
          key = item.warehouse?.name || this.translate.instant('COMMON.NO_WAREHOUSE');
          break;
        case 'supplier':
          key = item.supplier?.name || this.translate.instant('COMMON.NO_SUPPLIER');
          break;
        case 'status':
          key = this.getStatusLabel(item.status);
          break;
      }
      const value = (item.price || 0) * item.quantity;
      grouped.set(key, (grouped.get(key) || 0) + value);
    });

    return Array.from(grouped.entries())
      .map(([name, count]) => ({ name, count: Math.round(count * 100) / 100 }))
      .sort((a, b) => b.count - a.count);
  }

  protected calculateTopItemsForChart(currency: ChartCurrency = 'USD'): { name: string; count: number }[] {
    const items = this.getFilteredItemsByCurrency(currency);
    return items
      .map(item => ({
        name: item.name,
        count: Math.round((item.price || 0) * item.quantity * 100) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  getCustomChartData(chart: CustomChart): { labels: string[]; series: ApexAxisChartSeries | ApexNonAxisChartSeries } {
    let data: { name: string; count: number }[] = [];
    const currency = chart.currency || 'USD';

    switch (chart.dataSource) {
      case 'categories':
        data = this.categoryStats().map(c => ({ name: c.category || this.translate.instant('COMMON.NO_CATEGORY'), count: c.count }));
        break;
      case 'warehouses':
        data = this.warehouseStats().map(w => ({ name: w.name || this.translate.instant('COMMON.NO_WAREHOUSE'), count: w.itemCount }));
        break;
      case 'status':
        data = [
          { name: this.translate.instant('DASHBOARD.IN_STOCK'), count: this.stats()?.inStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.LOW_STOCK'), count: this.stats()?.lowStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.OUT_OF_STOCK'), count: this.stats()?.outOfStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.IN_USE'), count: this.stats()?.inUseItems || 0 }
        ];
        break;
      case 'lowStock':
        data = this.lowStockItems().slice(0, 5).map(item => ({ name: item.name, count: item.quantity }));
        break;
      case 'valueByCategory':
        data = this.calculateValueDataForChart('category', currency);
        break;
      case 'valueByWarehouse':
        data = this.calculateValueDataForChart('warehouse', currency);
        break;
      case 'valueBySupplier':
        data = this.calculateValueDataForChart('supplier', currency);
        break;
      case 'valueByStatus':
        data = this.calculateValueDataForChart('status', currency);
        break;
      case 'topItemsByValue':
        data = this.calculateTopItemsForChart(currency);
        break;
    }

    const labels = data.map(d => d.name);
    const series = isPieChartType(chart.chartType)
      ? data.map(d => d.count)
      : [{ name: seriesName(chart.dataSource, currency), data: data.map(d => d.count) }];

    return { labels, series };
  }

  getCustomChartOptions(chart: CustomChart): CustomChartOptions {
    const isPieType = isPieChartType(chart.chartType);
    const formatValue = chartValueFormatter(isValueSource(chart.dataSource), chart.currency || 'USD');

    const foreColor = this.chartForeColor;
    const gridColor = this.chartGridColor;

    return {
      chart: {
        type: chart.chartType,
        height: 250,
        background: 'transparent',
        foreColor,
        toolbar: { show: false }
      },
      colors: chartColors(chart.color, chart.chartType),
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      dataLabels: { enabled: false },
      legend: { show: true, position: 'bottom', labels: { colors: foreColor } },
      plotOptions: isPieType ? {
        pie: { donut: { size: chart.chartType === 'donut' ? '60%' : '0%' } },
        radialBar: { hollow: { size: '50%' } }
      } : {
        bar: { borderRadius: 4, columnWidth: '60%' }
      },
      xaxis: isPieType ? {} : {
        labels: { style: { colors: foreColor, fontSize: '10px' }, rotate: -45 }
      },
      yaxis: {
        labels: {
          style: { colors: foreColor },
          formatter: formatValue
        }
      },
      tooltip: {
        theme: this.chartTooltipTheme,
        y: {
          formatter: formatValue
        }
      }
    };
  }

  protected initChartOptions(): void {
    const foreColor = this.chartForeColor;
    const gridColor = this.chartGridColor;
    const textColor = this.chartTextColor;

    this.statusChartOptions.set({
      chart: {
        type: 'donut',
        height: 280,
        background: 'transparent',
        foreColor
      },
      labels: [
        this.translate.instant('DASHBOARD.IN_STOCK'),
        this.translate.instant('DASHBOARD.LOW_STOCK'),
        this.translate.instant('DASHBOARD.OUT_OF_STOCK'),
        this.translate.instant('DASHBOARD.IN_USE')
      ],
      colors: [
        cssVar('--color-status-success', '#10b981'),
        cssVar('--color-status-warning', '#f59e0b'),
        cssVar('--color-status-error', '#ef4444'),
        cssVar('--color-status-info', '#3b82f6'),
      ],
      legend: {
        position: 'bottom',
        labels: { colors: foreColor }
      },
      dataLabels: {
        enabled: true,
        style: { fontSize: '12px', fontWeight: 600 },
        dropShadow: { enabled: false }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: { show: true, fontSize: '14px', color: foreColor },
              value: { show: true, fontSize: '20px', fontWeight: 700, color: textColor },
              total: {
                show: true,
                label: this.translate.instant('DASHBOARD.TOTAL_ITEMS'),
                fontSize: '12px',
                color: foreColor,
                formatter: (w) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
              }
            }
          }
        }
      },
      responsive: [{
        breakpoint: 480,
        options: { chart: { height: 250 }, legend: { position: 'bottom' } }
      }]
    });

    this.categoryChartOptions.set({
      chart: {
        type: 'bar',
        height: 280,
        background: 'transparent',
        foreColor,
        toolbar: { show: false }
      },
      xaxis: {
        categories: [],
        labels: { style: { colors: foreColor, fontSize: '11px' }, rotate: -45, rotateAlways: false, trim: true, maxHeight: 80 },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: { labels: { style: { colors: foreColor } } },
      colors: [cssVar('--color-primary', '#4d7c6f')],
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '60%', distributed: true } },
      dataLabels: { enabled: false },
      tooltip: { theme: this.chartTooltipTheme, y: { formatter: (val: number) => this.translate.instant('COMMON.ITEMS_COUNT', { count: val }) } }
    });

    this.warehouseChartOptions.set({
      chart: {
        type: 'bar',
        height: 280,
        background: 'transparent',
        foreColor,
        toolbar: { show: false }
      },
      xaxis: {
        categories: [],
        labels: { style: { colors: foreColor, fontSize: '11px' }, rotate: -45, rotateAlways: false, trim: true, maxHeight: 80 },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: { labels: { style: { colors: foreColor } } },
      colors: [cssVar('--color-accent-cyan', '#06b6d4')],
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '60%' } },
      dataLabels: { enabled: false },
      tooltip: { theme: this.chartTooltipTheme, y: { formatter: (val: number) => this.translate.instant('COMMON.ITEMS_COUNT', { count: val }) } },
      fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.8 } }
    });
  }

  protected updateCharts(): void {
    const currentStats = this.stats();
    const categories = this.categoryStats();
    const warehouses = this.warehouseStats();

    if (currentStats) {
      this.statusChartSeries.set([
        currentStats.inStockItems || 0,
        currentStats.lowStockItems || 0,
        currentStats.outOfStockItems || 0,
        currentStats.inUseItems || 0
      ]);
    }

    if (categories.length > 0) {
      const categoryOptions = this.categoryChartOptions();
      if (categoryOptions) {
        this.categoryChartOptions.set({
          ...categoryOptions,
          xaxis: { ...categoryOptions.xaxis, categories: categories.map(c => c.category || this.translate.instant('COMMON.NO_CATEGORY')) }
        });
        this.categoryChartSeries.set([{ name: 'Items', data: categories.map(c => c.count) }]);
      }
    }

    if (warehouses.length > 0) {
      const warehouseOptions = this.warehouseChartOptions();
      if (warehouseOptions) {
        this.warehouseChartOptions.set({
          ...warehouseOptions,
          xaxis: { ...warehouseOptions.xaxis, categories: warehouses.map(w => w.name || this.translate.instant('COMMON.NO_WAREHOUSE')) }
        });
        this.warehouseChartSeries.set([{ name: 'Items', data: warehouses.map(w => w.itemCount) }]);
      }
    }
  }
}
