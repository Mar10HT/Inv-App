import { Component, ChangeDetectionStrategy, computed, inject, signal, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragPlaceholder, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideAngularModule, Package, CheckCircle2, AlertTriangle, DollarSign, Users, Warehouse, FolderOpen, Ban, PieChart, BarChart2, Receipt, Plus, BarChart3, Pencil, Trash2, Eye, ArrowDown, ArrowUp, ArrowLeftRight, AlertCircle } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, catchError, of } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexLegend,
  ApexDataLabels,
  ApexPlotOptions,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexGrid,
  ApexTooltip,
  ApexFill
} from 'ng-apexcharts';

import { InventoryService } from '../../services/inventory/inventory.service';
import { DashboardService, DashboardStats, CategoryStats, WarehouseStats, StatusStats } from '../../services/dashboard.service';
import { TransactionService } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '../../services/logger.service';
import { InventoryItemInterface, InventoryStatus, Currency } from '../../interfaces/inventory-item.interface';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { InventoryItem } from '../inventory/inventory-item/inventory-item';
import { CustomChartDialog, CustomChart, CustomChartDialogData, InventoryItemData, ChartCurrency } from './custom-chart-dialog/custom-chart-dialog';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CdkDrag,
    CdkDropList,
    CdkDragPlaceholder,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule,
    NgApexchartsModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private inventoryService = inject(InventoryService);
  private dashboardService = inject(DashboardService);
  private transactionService = inject(TransactionService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private notifications = inject(NotificationService);
  private logger = inject(LoggerService);

  userName = computed(() => this.authService.currentUser()?.name || 'User');

  // Stats from API
  stats = signal<DashboardStats | null>(null);
  categoryStats = signal<CategoryStats[]>([]);
  warehouseStats = signal<WarehouseStats[]>([]);
  statusStats = signal<StatusStats[]>([]);
  recentTransactions = signal<Transaction[]>([]);
  lowStockItems = signal<any[]>([]);

  // Reactive data from service
  items = computed(() => this.inventoryService.items().slice(0, 5));

  // Loading and error states
  loading = signal(true);
  error = signal<string | null>(null);

  TransactionType = TransactionType;

  // Dashboard widgets configuration
  private readonly STORAGE_KEY = 'dashboard_layout';
  private readonly CUSTOM_CHARTS_KEY = 'dashboard_custom_charts';

  chartWidgets = signal<string[]>(['status', 'categories', 'warehouses']);
  tableWidgets = signal<string[]>(['transactions', 'lowStock']);
  customCharts = signal<CustomChart[]>([]);

  // Signal to track when dashboard data is ready for custom charts
  dataReady = signal<boolean>(false);

  // Value calculations from inventory items
  allItems = signal<InventoryItemInterface[]>([]);

  // Exchange rate: 1 USD = 25 HNL
  private readonly HNL_TO_USD_RATE = 25;

  // Convert item value to USD
  private getItemValueInUSD(item: InventoryItemInterface): number {
    const rawValue = (item.price || 0) * item.quantity;
    if (item.currency === Currency.HNL) {
      return rawValue / this.HNL_TO_USD_RATE;
    }
    return rawValue; // Already in USD
  }

  valueByCategory = computed(() => {
    const items = this.allItems();
    const grouped = new Map<string, number>();
    items.forEach(item => {
      const category = item.category || 'Sin Categoría';
      const value = this.getItemValueInUSD(item);
      grouped.set(category, (grouped.get(category) || 0) + value);
    });
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  });

  valueByWarehouse = computed(() => {
    const items = this.allItems();
    const grouped = new Map<string, number>();
    items.forEach(item => {
      const warehouse = item.warehouse?.name || 'Sin Bodega';
      const value = this.getItemValueInUSD(item);
      grouped.set(warehouse, (grouped.get(warehouse) || 0) + value);
    });
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  });

  valueBySupplier = computed(() => {
    const items = this.allItems();
    const grouped = new Map<string, number>();
    items.forEach(item => {
      const supplier = item.supplier?.name || 'Sin Proveedor';
      const value = this.getItemValueInUSD(item);
      grouped.set(supplier, (grouped.get(supplier) || 0) + value);
    });
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  });

  valueByStatus = computed(() => {
    const items = this.allItems();
    const grouped = new Map<string, number>();
    items.forEach(item => {
      let statusLabel: string;
      switch (item.status) {
        case InventoryStatus.IN_STOCK:
          statusLabel = this.translate.instant('DASHBOARD.IN_STOCK');
          break;
        case InventoryStatus.LOW_STOCK:
          statusLabel = this.translate.instant('DASHBOARD.LOW_STOCK');
          break;
        case InventoryStatus.OUT_OF_STOCK:
          statusLabel = this.translate.instant('DASHBOARD.OUT_OF_STOCK');
          break;
        default:
          statusLabel = 'Unknown';
      }
      const value = this.getItemValueInUSD(item);
      grouped.set(statusLabel, (grouped.get(statusLabel) || 0) + value);
    });
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  });

  topItemsByValue = computed(() => {
    const items = this.allItems();
    return items
      .map(item => ({
        name: item.name,
        value: Math.round(this.getItemValueInUSD(item) * 100) / 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  });

  // Chart configurations
  statusChartSeries = signal<ApexNonAxisChartSeries>([]);
  statusChartOptions = signal<{
    chart: ApexChart;
    labels: string[];
    colors: string[];
    legend: ApexLegend;
    dataLabels: ApexDataLabels;
    plotOptions: ApexPlotOptions;
    responsive: ApexResponsive[];
  } | null>(null);

  categoryChartSeries = signal<ApexAxisChartSeries>([]);
  categoryChartOptions = signal<{
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    colors: string[];
    grid: ApexGrid;
    plotOptions: ApexPlotOptions;
    dataLabels: ApexDataLabels;
    tooltip: ApexTooltip;
  } | null>(null);

  warehouseChartSeries = signal<ApexAxisChartSeries>([]);
  warehouseChartOptions = signal<{
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    colors: string[];
    grid: ApexGrid;
    plotOptions: ApexPlotOptions;
    dataLabels: ApexDataLabels;
    tooltip: ApexTooltip;
    fill: ApexFill;
  } | null>(null);

  constructor() {
    // Initialize chart options
    this.initChartOptions();
    // Load saved layout
    this.loadSavedLayout();
    // Load custom charts
    this.loadCustomCharts();
  }

  private loadSavedLayout(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const layout = JSON.parse(saved);
        if (layout.chartWidgets?.length === 3) {
          this.chartWidgets.set(layout.chartWidgets);
        }
        if (layout.tableWidgets?.length === 2) {
          this.tableWidgets.set(layout.tableWidgets);
        }
      }
    } catch (e) {
      this.logger.warn('Could not load dashboard layout', e);
    }
  }

  private saveLayout(): void {
    const layout = {
      chartWidgets: this.chartWidgets(),
      tableWidgets: this.tableWidgets()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layout));
  }

  onChartWidgetDrop(event: CdkDragDrop<string[]>): void {
    const widgets = [...this.chartWidgets()];
    moveItemInArray(widgets, event.previousIndex, event.currentIndex);
    this.chartWidgets.set(widgets);
    this.saveLayout();
  }

  onTableWidgetDrop(event: CdkDragDrop<string[]>): void {
    const widgets = [...this.tableWidgets()];
    moveItemInArray(widgets, event.previousIndex, event.currentIndex);
    this.tableWidgets.set(widgets);
    this.saveLayout();
  }

  // Custom Charts Methods
  private loadCustomCharts(): void {
    try {
      const saved = localStorage.getItem(this.CUSTOM_CHARTS_KEY);
      if (saved) {
        this.customCharts.set(JSON.parse(saved));
      }
    } catch (e) {
      this.logger.warn('Could not load custom charts', e);
    }
  }

  private saveCustomCharts(): void {
    localStorage.setItem(this.CUSTOM_CHARTS_KEY, JSON.stringify(this.customCharts()));
  }

  // Convert inventory items to simplified format for chart dialog
  private getItemsForDialog(): InventoryItemData[] {
    return this.allItems().map(item => ({
      name: item.name,
      category: item.category || 'Sin Categoría',
      warehouse: item.warehouse?.name || 'Sin Bodega',
      supplier: item.supplier?.name || 'Sin Proveedor',
      status: this.getStatusLabel(item.status),
      price: item.price || 0,
      quantity: item.quantity,
      currency: item.currency as 'USD' | 'HNL'
    }));
  }

  private getStatusLabel(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK:
        return this.translate.instant('DASHBOARD.IN_STOCK');
      case InventoryStatus.LOW_STOCK:
        return this.translate.instant('DASHBOARD.LOW_STOCK');
      case InventoryStatus.OUT_OF_STOCK:
        return this.translate.instant('DASHBOARD.OUT_OF_STOCK');
      default:
        return 'Unknown';
    }
  }

  openCustomChartDialog(chart?: CustomChart): void {
    const dialogData: CustomChartDialogData = {
      chart,
      items: this.getItemsForDialog(),
      availableData: {
        categories: this.categoryStats().map(c => ({ name: c.category || 'Sin Categoría', count: c.count })),
        warehouses: this.warehouseStats().map(w => ({ name: w.name || 'Sin Bodega', count: w.itemCount })),
        status: [
          { name: this.translate.instant('DASHBOARD.IN_STOCK'), count: this.stats()?.inStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.LOW_STOCK'), count: this.stats()?.lowStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.OUT_OF_STOCK'), count: this.stats()?.outOfStockItems || 0 }
        ]
      }
    };

    const dialogRef = this.dialog.open(CustomChartDialog, {
      data: dialogData,
      panelClass: 'custom-dialog-container',
      width: '100%',
      maxWidth: '700px'
    });

    dialogRef.afterClosed().subscribe((result: CustomChart | undefined) => {
      if (result) {
        const charts = [...this.customCharts()];
        const existingIndex = charts.findIndex(c => c.id === result.id);
        const isEditing = existingIndex >= 0;

        if (isEditing) {
          charts[existingIndex] = result;
        } else {
          charts.push(result);
        }

        this.customCharts.set(charts);
        this.saveCustomCharts();

        // Show notification
        if (isEditing) {
          this.notifications.success('DASHBOARD.CUSTOM_CHART.UPDATED', { interpolateParams: { name: result.title } });
        } else {
          this.notifications.success('DASHBOARD.CUSTOM_CHART.CREATED', { interpolateParams: { name: result.title } });
        }
      }
    });
  }

  deleteCustomChart(chart: CustomChart): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('COMMON.DELETE'),
        message: this.translate.instant('DASHBOARD.CUSTOM_CHART.DELETE_CONFIRM', { name: chart.title }),
        confirmText: this.translate.instant('COMMON.DELETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const chartTitle = chart.title;
        const charts = this.customCharts().filter(c => c.id !== chart.id);
        this.customCharts.set(charts);
        this.saveCustomCharts();
        this.notifications.success('DASHBOARD.CUSTOM_CHART.DELETED', { interpolateParams: { name: chartTitle } });
      }
    });
  }

  private isValueSource(source: string): boolean {
    return ['valueByCategory', 'valueByWarehouse', 'valueBySupplier', 'valueByStatus', 'topItemsByValue'].includes(source);
  }

  // Filter items by currency for value charts
  private getFilteredItemsByCurrency(currency: ChartCurrency = 'USD'): InventoryItemInterface[] {
    const items = this.allItems();
    if (currency === 'ALL') {
      return items;
    }
    return items.filter(item => item.currency === currency);
  }

  // Calculate value data grouped by a field
  private calculateValueDataForChart(
    groupBy: 'category' | 'warehouse' | 'supplier' | 'status',
    currency: ChartCurrency = 'USD'
  ): { name: string; count: number }[] {
    const items = this.getFilteredItemsByCurrency(currency);
    const grouped = new Map<string, number>();

    items.forEach(item => {
      let key: string;
      switch (groupBy) {
        case 'category':
          key = item.category || 'Sin Categoría';
          break;
        case 'warehouse':
          key = item.warehouse?.name || 'Sin Bodega';
          break;
        case 'supplier':
          key = item.supplier?.name || 'Sin Proveedor';
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

  // Calculate top items by value
  private calculateTopItemsForChart(currency: ChartCurrency = 'USD'): { name: string; count: number }[] {
    const items = this.getFilteredItemsByCurrency(currency);
    return items
      .map(item => ({
        name: item.name,
        count: Math.round((item.price || 0) * item.quantity * 100) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  getCustomChartData(chart: CustomChart): { labels: string[]; series: any } {
    let data: { name: string; count: number }[] = [];
    const currency = chart.currency || 'USD';

    switch (chart.dataSource) {
      case 'categories':
        data = this.categoryStats().map(c => ({ name: c.category || 'Sin Categoría', count: c.count }));
        break;
      case 'warehouses':
        data = this.warehouseStats().map(w => ({ name: w.name || 'Sin Bodega', count: w.itemCount }));
        break;
      case 'status':
        data = [
          { name: this.translate.instant('DASHBOARD.IN_STOCK'), count: this.stats()?.inStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.LOW_STOCK'), count: this.stats()?.lowStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.OUT_OF_STOCK'), count: this.stats()?.outOfStockItems || 0 }
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
    const isPieType = ['pie', 'donut', 'radialBar'].includes(chart.chartType);
    let seriesName = 'Items';
    if (this.isValueSource(chart.dataSource)) {
      const currencySymbol = currency === 'HNL' ? 'L' : '$';
      seriesName = `Value (${currencySymbol})`;
    }
    const series = isPieType ? data.map(d => d.count) : [{ name: seriesName, data: data.map(d => d.count) }];

    return { labels, series };
  }

  // Complementary color palettes for pie/donut/radial charts
  private readonly customChartPalettes: Record<string, string[]> = {
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

  // Format number with thousands separator and 2 decimals
  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  getCustomChartOptions(chart: CustomChart): any {
    const isPieType = ['pie', 'donut', 'radialBar'].includes(chart.chartType);
    const isValueChart = this.isValueSource(chart.dataSource);
    const currency = chart.currency || 'USD';
    const currencySymbol = currency === 'HNL' ? 'L' : '$';
    const colors = isPieType
      ? (this.customChartPalettes[chart.color] || [chart.color])
      : [chart.color];

    const formatValue = (val: number) => {
      if (isValueChart) {
        return `${currencySymbol}${this.formatNumber(val)}`;
      }
      return val.toLocaleString('en-US');
    };

    return {
      chart: {
        type: chart.chartType,
        height: 250,
        background: 'transparent',
        foreColor: '#94a3b8',
        toolbar: { show: false }
      },
      colors: colors,
      grid: { borderColor: '#2a2a2a', strokeDashArray: 4 },
      dataLabels: { enabled: false },
      legend: { show: true, position: 'bottom', labels: { colors: '#94a3b8' } },
      plotOptions: isPieType ? {
        pie: { donut: { size: chart.chartType === 'donut' ? '60%' : '0%' } },
        radialBar: { hollow: { size: '50%' } }
      } : {
        bar: { borderRadius: 4, columnWidth: '60%' }
      },
      xaxis: isPieType ? {} : {
        labels: { style: { colors: '#94a3b8', fontSize: '10px' }, rotate: -45 }
      },
      yaxis: {
        labels: {
          style: { colors: '#94a3b8' },
          formatter: (val: number) => formatValue(val)
        }
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => formatValue(val)
        }
      }
    };
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private initChartOptions(): void {
    // Status Donut Chart Options
    this.statusChartOptions.set({
      chart: {
        type: 'donut',
        height: 280,
        background: 'transparent',
        foreColor: '#94a3b8'
      },
      labels: [
        this.translate.instant('DASHBOARD.IN_STOCK'),
        this.translate.instant('DASHBOARD.LOW_STOCK'),
        this.translate.instant('DASHBOARD.OUT_OF_STOCK')
      ],
      colors: ['#10b981', '#f97316', '#ef4444'],
      legend: {
        position: 'bottom',
        labels: {
          colors: '#94a3b8'
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
          fontWeight: 600
        },
        dropShadow: {
          enabled: false
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                color: '#94a3b8'
              },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 700,
                color: '#e2e8f0'
              },
              total: {
                show: true,
                label: this.translate.instant('DASHBOARD.TOTAL_ITEMS'),
                fontSize: '12px',
                color: '#94a3b8',
                formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
              }
            }
          }
        }
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            height: 250
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    });

    // Category Bar Chart Options
    this.categoryChartOptions.set({
      chart: {
        type: 'bar',
        height: 280,
        background: 'transparent',
        foreColor: '#94a3b8',
        toolbar: {
          show: false
        }
      },
      xaxis: {
        categories: [],
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '11px'
          },
          rotate: -45,
          rotateAlways: false,
          trim: true,
          maxHeight: 80
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#94a3b8'
          }
        }
      },
      colors: this.chartColors,
      grid: {
        borderColor: '#2a2a2a',
        strokeDashArray: 4
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
          columnWidth: '60%',
          distributed: true
        }
      },
      dataLabels: {
        enabled: false
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => `${val} items`
        }
      }
    });

    // Warehouse Bar Chart Options
    this.warehouseChartOptions.set({
      chart: {
        type: 'bar',
        height: 280,
        background: 'transparent',
        foreColor: '#94a3b8',
        toolbar: {
          show: false
        }
      },
      xaxis: {
        categories: [],
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '11px'
          },
          rotate: -45,
          rotateAlways: false,
          trim: true,
          maxHeight: 80
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#94a3b8'
          }
        }
      },
      colors: ['#06b6d4'],
      grid: {
        borderColor: '#2a2a2a',
        strokeDashArray: 4
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
          columnWidth: '60%'
        }
      },
      dataLabels: {
        enabled: false
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => `${val} items`
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.3,
          opacityFrom: 1,
          opacityTo: 0.8
        }
      }
    });
  }

  private updateCharts(): void {
    const currentStats = this.stats();
    const categories = this.categoryStats();
    const warehouses = this.warehouseStats();

    // Update Status Donut Chart
    if (currentStats) {
      this.statusChartSeries.set([
        currentStats.inStockItems || 0,
        currentStats.lowStockItems || 0,
        currentStats.outOfStockItems || 0
      ]);
    }

    // Update Category Bar Chart
    if (categories.length > 0) {
      const categoryOptions = this.categoryChartOptions();
      if (categoryOptions) {
        this.categoryChartOptions.set({
          ...categoryOptions,
          xaxis: {
            ...categoryOptions.xaxis,
            categories: categories.map(c => c.category || 'Sin Categoría')
          }
        });
        this.categoryChartSeries.set([{
          name: 'Items',
          data: categories.map(c => c.count)
        }]);
      }
    }

    // Update Warehouse Bar Chart
    if (warehouses.length > 0) {
      const warehouseOptions = this.warehouseChartOptions();
      if (warehouseOptions) {
        this.warehouseChartOptions.set({
          ...warehouseOptions,
          xaxis: {
            ...warehouseOptions.xaxis,
            categories: warehouses.map(w => w.name || 'Sin Bodega')
          }
        });
        this.warehouseChartSeries.set([{
          name: 'Items',
          data: warehouses.map(w => w.itemCount)
        }]);
      }
    }
  }

  private loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load all data in parallel using forkJoin
    forkJoin({
      stats: this.dashboardService.getStats().pipe(catchError(() => of(null))),
      usersCount: this.dashboardService.getUsersCount().pipe(catchError(() => of(0))),
      warehousesCount: this.dashboardService.getWarehousesCount().pipe(catchError(() => of(0))),
      categoriesCount: this.dashboardService.getCategoriesCount().pipe(catchError(() => of(0))),
      lowStockItems: this.dashboardService.getLowStockItems(10).pipe(catchError(() => of([]))),
      recentTransactions: this.transactionService.getRecent(5).pipe(catchError(() => of([]))),
      allItems: this.inventoryService.getItemsObservable().pipe(catchError(() => of([])))
    }).subscribe({
      next: (results) => {
        const data = results.stats || {};

        // Map backend response to DashboardStats format with all counts
        const dashboardStats: DashboardStats = {
          totalItems: data.total || 0,
          totalUsers: results.usersCount,
          totalWarehouses: results.warehousesCount,
          totalSuppliers: 0,
          totalCategories: results.categoriesCount,
          inStockItems: data.inStock || 0,
          lowStockItems: data.lowStock || 0,
          outOfStockItems: data.outOfStock || 0,
          totalValueUSD: data.totalValue || 0,
          totalValueHNL: (data.totalValue || 0) * 25
        };

        this.stats.set(dashboardStats);

        // Set category and warehouse stats from the same response
        this.categoryStats.set((data.categories || []).map((cat: any) => ({
          category: cat.name,
          count: cat.count,
          totalQuantity: cat.count
        })));
        this.warehouseStats.set((data.locations || []).map((loc: any, index: number) => ({
          id: `warehouse-${index}`,
          name: loc.name,
          itemCount: loc.count,
          totalQuantity: loc.count
        })));

        this.lowStockItems.set(results.lowStockItems);
        this.recentTransactions.set(results.recentTransactions);
        this.allItems.set(results.allItems);
        this.loading.set(false);

        // Update charts with new data
        this.updateCharts();

        // Mark data as ready for custom charts (with a small delay to ensure DOM is updated)
        setTimeout(() => {
          this.dataReady.set(true);
        }, 100);
      },
      error: (err) => {
        this.logger.error('Error loading dashboard data', err);
        this.error.set('Error loading dashboard data: ' + (err.message || 'Unknown error'));
        this.loading.set(false);
      }
    });

    // Also load inventory items for the table
    this.inventoryService.loadItems();
  }

  viewItem(item: InventoryItemInterface): void {
    this.dialog.open(InventoryItem, {
      data: { itemId: item.id },
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog'
    });
  }

  editItem(item: InventoryItemInterface): void {
    this.router.navigate(['/inventory/edit', item.id]);
  }

  deleteItem(item: InventoryItemInterface): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete Item',
        message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.inventoryService.deleteItem(item.id).subscribe({
          next: () => {
            this.snackBar.open(`"${item.name}" has been deleted`, 'Close', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.loadDashboardData();
          },
          error: (err) => {
            this.snackBar.open(`Error deleting item: ${err.message}`, 'Close', {
              duration: 5000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }

  addNewItem(): void {
    this.router.navigate(['/inventory/add']);
  }

  viewAllInventory(): void {
    this.router.navigate(['/inventory']);
  }

  viewAllTransactions(): void {
    this.router.navigate(['/transactions']);
  }

  getStatusKey(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'INVENTORY.STATUS.IN_STOCK';
      case InventoryStatus.LOW_STOCK: return 'INVENTORY.STATUS.LOW_STOCK';
      case InventoryStatus.OUT_OF_STOCK: return 'INVENTORY.STATUS.OUT_OF_STOCK';
      default: return status;
    }
  }

  getTransactionTypeIcon(type: TransactionType): string {
    switch (type) {
      case TransactionType.IN: return 'arrow-down';
      case TransactionType.OUT: return 'arrow-up';
      case TransactionType.TRANSFER: return 'arrow-left-right';
      default: return 'receipt';
    }
  }

  getTransactionTypeClass(type: TransactionType): string {
    switch (type) {
      case TransactionType.IN: return '!text-emerald-400';
      case TransactionType.OUT: return '!text-rose-400';
      case TransactionType.TRANSFER: return '!text-blue-400';
      default: return '!text-slate-400';
    }
  }

  // Calculate percentage for status bar
  getStatusPercentage(status: string): number {
    const total = this.stats()?.totalItems || 0;
    if (total === 0) return 0;

    let count = 0;
    switch (status) {
      case 'IN_STOCK':
        count = this.stats()?.inStockItems || 0;
        break;
      case 'LOW_STOCK':
        count = this.stats()?.lowStockItems || 0;
        break;
      case 'OUT_OF_STOCK':
        count = this.stats()?.outOfStockItems || 0;
        break;
    }
    return Math.round((count / total) * 100);
  }

  // Memoized date formatter
  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  private readonly dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return this.dateFormatter.format(d);
  }

  formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return this.dateTimeFormatter.format(d);
  }

  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  trackByFn(index: number, item: InventoryItemInterface): string {
    return item.id;
  }

  trackByTransaction(index: number, transaction: Transaction): string {
    return transaction.id;
  }

  trackByCategory(index: number, cat: CategoryStats): string {
    return cat.category || `category-${index}`;
  }

  trackByWarehouse(index: number, wh: WarehouseStats): string {
    return wh.id || wh.name;
  }

  // Get max count for percentage calculations
  getMaxCategoryCount(): number {
    const cats = this.categoryStats();
    if (cats.length === 0) return 1;
    return Math.max(...cats.map(c => c.count), 1);
  }

  getMaxWarehouseCount(): number {
    const whs = this.warehouseStats();
    if (whs.length === 0) return 1;
    return Math.max(...whs.map(w => w.itemCount), 1);
  }

  getCategoryPercentage(count: number): number {
    const max = this.getMaxCategoryCount();
    return Math.round((count / max) * 100);
  }

  getWarehousePercentage(itemCount: number): number {
    const max = this.getMaxWarehouseCount();
    return Math.round((itemCount / max) * 100);
  }

  // Color palette for charts
  private readonly chartColors = [
    '#4d7c6f', '#5d8c7f', '#6d9c8f', '#7dac9f', '#8dbcaf',
    '#9dcdbf', '#3d6c5f', '#2d5c4f', '#1d4c3f', '#0d3c2f'
  ];

  getCategoryColor(index: number): string {
    return this.chartColors[index % this.chartColors.length];
  }
}
