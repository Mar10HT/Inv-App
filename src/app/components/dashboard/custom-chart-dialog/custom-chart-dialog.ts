import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'radialBar';
export type DataSource =
  | 'categories' | 'warehouses' | 'status' | 'lowStock'
  | 'valueByCategory' | 'valueByWarehouse' | 'valueBySupplier' | 'valueByStatus' | 'topItemsByValue';
export type ChartCurrency = 'USD' | 'HNL' | 'ALL';

export interface CustomChart {
  id: string;
  title: string;
  chartType: ChartType;
  dataSource: DataSource;
  color: string;
  currency?: ChartCurrency; // For value-based charts
  createdAt: Date;
}

export interface ValueData {
  name: string;
  value: number;
}

export interface InventoryItemData {
  name: string;
  category: string;
  warehouse: string;
  supplier: string;
  status: string;
  price: number;
  quantity: number;
  currency: 'USD' | 'HNL';
}

export interface CustomChartDialogData {
  chart?: CustomChart;
  items: InventoryItemData[]; // Raw items for filtering by currency
  availableData: {
    categories: { name: string; count: number }[];
    warehouses: { name: string; count: number }[];
    status: { name: string; count: number }[];
  };
}

@Component({
  selector: 'app-custom-chart-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    TranslateModule,
    NgApexchartsModule
  ],
  template: `
    <div class="bg-[#1a1a1a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-[#2a2a2a] flex-shrink-0">
        <h2 class="text-xl font-semibold text-foreground">
          {{ isEditing ? ('DASHBOARD.CUSTOM_CHART.EDIT' | translate) : ('DASHBOARD.CUSTOM_CHART.CREATE' | translate) }}
        </h2>
        <button
          (click)="close()"
          class="text-slate-500 hover:text-foreground transition-colors">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto flex-1">
        <form [formGroup]="chartForm" class="space-y-6">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">
              {{ 'DASHBOARD.CUSTOM_CHART.TITLE' | translate }} *
            </label>
            <input
              type="text"
              formControlName="title"
              class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] transition-colors"
              [placeholder]="'DASHBOARD.CUSTOM_CHART.TITLE_PLACEHOLDER' | translate"
            />
          </div>

          <!-- Data Source - Quantity -->
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">
              {{ 'DASHBOARD.CUSTOM_CHART.DATA_SOURCE' | translate }} *
            </label>
            <p class="text-xs text-slate-500 mb-2">{{ 'DASHBOARD.CUSTOM_CHART.BY_QUANTITY' | translate }}</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              @for (source of quantitySources; track source.value) {
                <button
                  type="button"
                  (click)="selectDataSource(source.value)"
                  class="p-3 rounded-lg border transition-all text-center"
                  [class]="chartForm.get('dataSource')?.value === source.value
                    ? 'border-[#4d7c6f] bg-[#4d7c6f]/20 text-[#4d7c6f]'
                    : 'border-[#2a2a2a] bg-[#0a0a0a] text-slate-400 hover:border-[#3a3a3a]'">
                  <mat-icon class="!text-2xl mb-1">{{ source.icon }}</mat-icon>
                  <p class="text-xs">{{ source.label | translate }}</p>
                </button>
              }
            </div>
          </div>

          <!-- Data Source - Value -->
          <div>
            <p class="text-xs text-slate-500 mb-2">{{ 'DASHBOARD.CUSTOM_CHART.BY_VALUE' | translate }}</p>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              @for (source of valueSources; track source.value) {
                <button
                  type="button"
                  (click)="selectDataSource(source.value)"
                  class="p-3 rounded-lg border transition-all text-center"
                  [class]="chartForm.get('dataSource')?.value === source.value
                    ? 'border-[#4d7c6f] bg-[#4d7c6f]/20 text-[#4d7c6f]'
                    : 'border-[#2a2a2a] bg-[#0a0a0a] text-slate-400 hover:border-[#3a3a3a]'">
                  <mat-icon class="!text-2xl mb-1">{{ source.icon }}</mat-icon>
                  <p class="text-xs">{{ source.label | translate }}</p>
                </button>
              }
            </div>
          </div>

          <!-- Currency Selector (only for value sources) -->
          @if (isValueSource(chartForm.get('dataSource')?.value)) {
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">
                {{ 'DASHBOARD.CUSTOM_CHART.CURRENCY' | translate }} *
              </label>
              <div class="grid grid-cols-3 gap-3">
                @for (curr of currencyOptions; track curr.value) {
                  <button
                    type="button"
                    (click)="selectCurrency(curr.value)"
                    class="p-3 rounded-lg border transition-all text-center"
                    [class]="chartForm.get('currency')?.value === curr.value
                      ? 'border-[#4d7c6f] bg-[#4d7c6f]/20 text-[#4d7c6f]'
                      : 'border-[#2a2a2a] bg-[#0a0a0a] text-slate-400 hover:border-[#3a3a3a]'">
                    <mat-icon class="!text-2xl mb-1">{{ curr.icon }}</mat-icon>
                    <p class="text-xs">{{ curr.label | translate }}</p>
                  </button>
                }
              </div>
            </div>
          }

          <!-- Chart Type -->
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">
              {{ 'DASHBOARD.CUSTOM_CHART.CHART_TYPE' | translate }} *
            </label>
            <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
              @for (type of chartTypes; track type.value) {
                <button
                  type="button"
                  (click)="selectChartType(type.value)"
                  class="p-3 rounded-lg border transition-all text-center"
                  [class]="chartForm.get('chartType')?.value === type.value
                    ? 'border-[#4d7c6f] bg-[#4d7c6f]/20 text-[#4d7c6f]'
                    : 'border-[#2a2a2a] bg-[#0a0a0a] text-slate-400 hover:border-[#3a3a3a]'">
                  <mat-icon class="!text-2xl mb-1">{{ type.icon }}</mat-icon>
                  <p class="text-xs">{{ type.label }}</p>
                </button>
              }
            </div>
          </div>

          <!-- Color -->
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">
              {{ 'DASHBOARD.CUSTOM_CHART.COLOR' | translate }}
            </label>
            <div class="flex flex-wrap gap-2">
              @for (color of colorOptions; track color) {
                <button
                  type="button"
                  (click)="selectColor(color)"
                  class="w-8 h-8 rounded-lg border-2 transition-all"
                  [style.background-color]="color"
                  [class]="chartForm.get('color')?.value === color
                    ? 'border-white scale-110'
                    : 'border-transparent hover:scale-105'">
                </button>
              }
            </div>
          </div>

          <!-- Preview -->
          @if (chartForm.valid && previewData().length > 0) {
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">
                {{ 'DASHBOARD.CUSTOM_CHART.PREVIEW' | translate }}
              </label>
              <div class="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a]">
                <apx-chart
                  [series]="previewSeries()"
                  [chart]="previewChartOptions()"
                  [xaxis]="previewXAxis()"
                  [yaxis]="previewYAxis()"
                  [colors]="previewColors()"
                  [labels]="previewLabels()"
                  [plotOptions]="previewPlotOptions()"
                  [tooltip]="previewTooltip()"
                  [dataLabels]="{ enabled: false }"
                  [legend]="{ show: true, position: 'bottom', labels: { colors: '#94a3b8' } }"
                  [grid]="{ borderColor: '#2a2a2a', strokeDashArray: 4 }">
                </apx-chart>
              </div>
            </div>
          }
        </form>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 p-6 border-t border-[#2a2a2a] flex-shrink-0">
        <button
          type="button"
          (click)="close()"
          class="px-4 py-2.5 text-slate-400 hover:text-foreground transition-colors font-medium">
          {{ 'COMMON.CANCEL' | translate }}
        </button>
        <button
          type="button"
          (click)="save()"
          [disabled]="chartForm.invalid"
          class="flex items-center gap-2 px-6 py-2.5 bg-[#4d7c6f] text-white rounded-lg hover:bg-[#5d8c7f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
          <mat-icon class="!text-lg">{{ isEditing ? 'save' : 'add' }}</mat-icon>
          {{ isEditing ? ('COMMON.SAVE' | translate) : ('COMMON.CREATE' | translate) }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CustomChartDialog implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CustomChartDialog>);
  private translate = inject(TranslateService);
  data = inject<CustomChartDialogData>(MAT_DIALOG_DATA);

  isEditing = false;

  chartForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    dataSource: ['categories', Validators.required],
    chartType: ['bar', Validators.required],
    color: ['#4d7c6f'],
    currency: ['USD' as ChartCurrency]
  });

  currencyOptions = [
    { value: 'USD' as ChartCurrency, label: 'DASHBOARD.CUSTOM_CHART.USD_ONLY', icon: 'attach_money' },
    { value: 'HNL' as ChartCurrency, label: 'DASHBOARD.CUSTOM_CHART.HNL_ONLY', icon: 'payments' },
    { value: 'ALL' as ChartCurrency, label: 'DASHBOARD.CUSTOM_CHART.ALL_CURRENCIES', icon: 'currency_exchange' }
  ];

  quantitySources = [
    { value: 'categories' as DataSource, label: 'NAV.CATEGORIES', icon: 'category' },
    { value: 'warehouses' as DataSource, label: 'NAV.WAREHOUSES', icon: 'warehouse' },
    { value: 'status' as DataSource, label: 'COMMON.STATUS', icon: 'donut_large' },
    { value: 'lowStock' as DataSource, label: 'DASHBOARD.LOW_STOCK', icon: 'warning' }
  ];

  valueSources = [
    { value: 'valueByCategory' as DataSource, label: 'NAV.CATEGORIES', icon: 'category' },
    { value: 'valueByWarehouse' as DataSource, label: 'NAV.WAREHOUSES', icon: 'warehouse' },
    { value: 'valueBySupplier' as DataSource, label: 'NAV.SUPPLIERS', icon: 'local_shipping' },
    { value: 'valueByStatus' as DataSource, label: 'COMMON.STATUS', icon: 'donut_large' },
    { value: 'topItemsByValue' as DataSource, label: 'DASHBOARD.CUSTOM_CHART.TOP_ITEMS', icon: 'trending_up' }
  ];

  chartTypes = [
    { value: 'bar' as ChartType, label: 'Bar', icon: 'bar_chart' },
    { value: 'line' as ChartType, label: 'Line', icon: 'show_chart' },
    { value: 'area' as ChartType, label: 'Area', icon: 'area_chart' },
    { value: 'pie' as ChartType, label: 'Pie', icon: 'pie_chart' },
    { value: 'donut' as ChartType, label: 'Donut', icon: 'donut_large' },
    { value: 'radialBar' as ChartType, label: 'Radial', icon: 'data_usage' }
  ];

  colorOptions = [
    '#4d7c6f', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
    '#ec4899', '#f97316', '#eab308', '#ef4444', '#64748b'
  ];

  // Preview signals - updated when form changes
  previewData = signal<{ name: string; count: number }[]>([]);
  previewSeries = signal<any>([]);
  previewLabels = signal<string[]>([]);
  previewChartOptions = signal<any>({});
  previewXAxis = signal<any>({});
  previewYAxis = signal<any>({});
  previewPlotOptions = signal<any>({});
  previewTooltip = signal<any>({});
  previewColor = signal<string>('#4d7c6f');
  previewColors = signal<string[]>(['#4d7c6f']);

  // Format number with thousands separator and 2 decimals
  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  // Complementary color palettes for pie/donut/radial charts
  private readonly colorPalettes: Record<string, string[]> = {
    '#4d7c6f': ['#4d7c6f', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308'],
    '#10b981': ['#10b981', '#ef4444', '#8b5cf6', '#f97316', '#3b82f6', '#ec4899'],
    '#06b6d4': ['#06b6d4', '#f97316', '#10b981', '#ec4899', '#eab308', '#8b5cf6'],
    '#3b82f6': ['#3b82f6', '#f97316', '#10b981', '#ec4899', '#eab308', '#06b6d4'],
    '#8b5cf6': ['#8b5cf6', '#10b981', '#f97316', '#06b6d4', '#ef4444', '#eab308'],
    '#ec4899': ['#ec4899', '#10b981', '#3b82f6', '#f97316', '#06b6d4', '#8b5cf6'],
    '#f97316': ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899'],
    '#eab308': ['#eab308', '#8b5cf6', '#3b82f6', '#ec4899', '#06b6d4', '#10b981'],
    '#ef4444': ['#ef4444', '#10b981', '#3b82f6', '#eab308', '#8b5cf6', '#06b6d4'],
    '#64748b': ['#64748b', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#3b82f6']
  };

  ngOnInit(): void {
    if (this.data?.chart) {
      this.isEditing = true;
      this.chartForm.patchValue({
        title: this.data.chart.title,
        dataSource: this.data.chart.dataSource,
        chartType: this.data.chart.chartType,
        color: this.data.chart.color,
        currency: this.data.chart.currency || 'USD'
      });
      this.previewColor.set(this.data.chart.color);
    }

    // Initial preview update
    this.updatePreview();
  }

  selectDataSource(source: DataSource): void {
    this.chartForm.patchValue({ dataSource: source });
    this.updatePreview();
  }

  selectChartType(type: ChartType): void {
    this.chartForm.patchValue({ chartType: type });
    this.updatePreview();
  }

  selectCurrency(currency: ChartCurrency): void {
    this.chartForm.patchValue({ currency });
    this.updatePreview();
  }

  selectColor(color: string): void {
    this.chartForm.patchValue({ color });
    this.previewColor.set(color);
    this.updateColors(color);
  }

  private updateColors(color: string): void {
    const chartType = this.chartForm.get('chartType')?.value as ChartType;
    const isPieType = ['pie', 'donut', 'radialBar'].includes(chartType);

    if (isPieType) {
      this.previewColors.set(this.colorPalettes[color] || [color]);
    } else {
      this.previewColors.set([color]);
    }
  }

  isValueSource(source: DataSource | string): boolean {
    return ['valueByCategory', 'valueByWarehouse', 'valueBySupplier', 'valueByStatus', 'topItemsByValue'].includes(source);
  }

  private getFilteredItems(): InventoryItemData[] {
    const currency = this.chartForm.get('currency')?.value as ChartCurrency;
    const items = this.data?.items || [];
    if (currency === 'ALL') {
      return items;
    }
    return items.filter(item => item.currency === currency);
  }

  private calculateValueData(groupBy: 'category' | 'warehouse' | 'supplier' | 'status'): { name: string; count: number }[] {
    const items = this.getFilteredItems();
    const grouped = new Map<string, number>();

    items.forEach(item => {
      let key: string;
      switch (groupBy) {
        case 'category':
          key = item.category || 'Sin Categoría';
          break;
        case 'warehouse':
          key = item.warehouse || 'Sin Bodega';
          break;
        case 'supplier':
          key = item.supplier || 'Sin Proveedor';
          break;
        case 'status':
          key = item.status;
          break;
      }
      const value = item.price * item.quantity;
      grouped.set(key, (grouped.get(key) || 0) + value);
    });

    return Array.from(grouped.entries())
      .map(([name, count]) => ({ name, count: Math.round(count * 100) / 100 }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateTopItems(): { name: string; count: number }[] {
    const items = this.getFilteredItems();
    return items
      .map(item => ({
        name: item.name,
        count: Math.round(item.price * item.quantity * 100) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private updatePreview(): void {
    const source = this.chartForm.get('dataSource')?.value as DataSource;
    const chartType = this.chartForm.get('chartType')?.value as ChartType;
    const color = this.chartForm.get('color')?.value || '#4d7c6f';
    const currency = this.chartForm.get('currency')?.value as ChartCurrency;

    // Update colors based on chart type
    this.updateColors(color);

    // Update data based on source
    let data: { name: string; count: number }[] = [];
    if (this.data) {
      switch (source) {
        case 'categories':
          data = this.data.availableData?.categories || [];
          break;
        case 'warehouses':
          data = this.data.availableData?.warehouses || [];
          break;
        case 'status':
          data = this.data.availableData?.status || [];
          break;
        case 'lowStock':
          data = this.data.availableData?.categories?.slice(0, 5) || [];
          break;
        case 'valueByCategory':
          data = this.calculateValueData('category');
          break;
        case 'valueByWarehouse':
          data = this.calculateValueData('warehouse');
          break;
        case 'valueBySupplier':
          data = this.calculateValueData('supplier');
          break;
        case 'valueByStatus':
          data = this.calculateValueData('status');
          break;
        case 'topItemsByValue':
          data = this.calculateTopItems();
          break;
      }
    }
    this.previewData.set(data);
    this.previewLabels.set(data.map(d => d.name));

    // Update series based on chart type
    const isPieType = ['pie', 'donut', 'radialBar'].includes(chartType);
    let seriesName = 'Items';
    if (this.isValueSource(source)) {
      const currencySymbol = currency === 'HNL' ? 'L' : '$';
      seriesName = `Value (${currencySymbol})`;
    }
    if (isPieType) {
      this.previewSeries.set(data.map(d => d.count));
    } else {
      this.previewSeries.set([{ name: seriesName, data: data.map(d => d.count) }]);
    }

    // Update chart options
    this.previewChartOptions.set({
      type: chartType,
      height: 200,
      background: 'transparent',
      foreColor: '#94a3b8',
      toolbar: { show: false }
    });

    // Update xaxis
    if (isPieType) {
      this.previewXAxis.set({});
    } else {
      this.previewXAxis.set({
        categories: data.map(d => d.name),
        labels: {
          style: { colors: '#94a3b8', fontSize: '10px' },
          rotate: -45
        }
      });
    }

    // Update yaxis and tooltip with formatting
    const isValueChart = this.isValueSource(source);
    const currencySymbol = currency === 'HNL' ? 'L' : '$';
    const formatValue = (val: number) => {
      if (isValueChart) {
        return `${currencySymbol}${this.formatNumber(val)}`;
      }
      return val.toLocaleString('en-US');
    };

    this.previewYAxis.set({
      labels: {
        style: { colors: '#94a3b8' },
        formatter: formatValue
      }
    });

    this.previewTooltip.set({
      theme: 'dark',
      y: {
        formatter: formatValue
      }
    });

    // Update plot options
    if (chartType === 'donut' || chartType === 'pie') {
      this.previewPlotOptions.set({
        pie: {
          donut: {
            size: chartType === 'donut' ? '60%' : '0%'
          }
        }
      });
    } else if (chartType === 'radialBar') {
      this.previewPlotOptions.set({
        radialBar: {
          hollow: { size: '50%' },
          dataLabels: {
            name: { fontSize: '12px', color: '#94a3b8' },
            value: { fontSize: '16px', color: '#e2e8f0' }
          }
        }
      });
    } else {
      this.previewPlotOptions.set({
        bar: {
          borderRadius: 4,
          columnWidth: '60%'
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.chartForm.invalid) return;

    const formValue = this.chartForm.value;
    const chart: CustomChart = {
      id: this.data?.chart?.id || crypto.randomUUID(),
      title: formValue.title,
      chartType: formValue.chartType,
      dataSource: formValue.dataSource,
      color: formValue.color,
      currency: this.isValueSource(formValue.dataSource) ? formValue.currency : undefined,
      createdAt: this.data?.chart?.createdAt || new Date()
    };

    this.dialogRef.close(chart);
  }
}
