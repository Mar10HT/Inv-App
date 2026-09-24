import { Component, ChangeDetectionStrategy, computed, inject, signal, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragPlaceholder, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, catchError, of } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApexNonAxisChartSeries, ApexAxisChartSeries } from 'ng-apexcharts';

import { InventoryService } from '../../services/inventory/inventory.service';
import { DashboardService, DashboardStats, CategoryStats, WarehouseStats } from '../../services/dashboard.service';
import { TransactionService } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '../../services/logger.service';
import { ThemeService } from '../../services/theme.service';
import { InventoryItemInterface, InventoryStatus, StatsResponse } from '../../interfaces/inventory-item.interface';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { InventoryItem } from '../inventory/inventory-item/inventory-item';
import { CustomChartDialog, CustomChart, CustomChartDialogData, InventoryItemData } from './custom-chart-dialog/custom-chart-dialog';
import { NotificationService } from '../../services/notification.service';
import {
  DashboardStatsComponent,
  DashboardChartsComponent,
  DashboardTransactionsComponent,
  DashboardLowStockComponent,
  StatusChartOptions,
  BarChartOptions,
  LowStockItem
} from './components';
import { SkeletonDashboardComponent } from '../shared/skeleton/skeleton-dashboard';
import { DashboardRecentItems } from './components/dashboard-recent-items/dashboard-recent-items';
import { DashboardChartsBase, CustomChartOptions } from './dashboard-charts.base';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDrag,
    CdkDropList,
    CdkDragPlaceholder,
    LucideAngularModule,
    MatSnackBarModule,
    TranslateModule,
    NgApexchartsModule,
    DashboardStatsComponent,
    DashboardChartsComponent,
    SkeletonDashboardComponent,
    DashboardTransactionsComponent,
    DashboardLowStockComponent,
    DashboardRecentItems
  ],
  template: `
<div class="min-h-screen bg-surface p-6">
  <div class="max-w-[1600px] mx-auto">
    <!-- Welcome Section -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-foreground mb-2">
        {{ 'DASHBOARD.WELCOME' | translate }}, {{ userName() }}!
      </h1>
      <p class="text-[var(--color-on-surface-variant)] text-lg">
        {{ 'DASHBOARD.SUBTITLE' | translate }}
      </p>
    </div>

    <!-- Error State -->
    @if (error()) {
      <div class="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-xl p-4 mb-6">
        <div class="flex items-center gap-3">
          <lucide-icon name="AlertCircle" class="!w-5 !h-5 text-[var(--color-status-error)]"></lucide-icon>
          <span class="text-[var(--color-status-error)]">{{ error() }}</span>
        </div>
      </div>
    }

    <!-- Loading State with Skeleton -->
    @if (loading()) {
      <app-skeleton-dashboard />
    } @else {
    <!-- Primary Stats Cards -->
    <app-dashboard-stats [stats]="stats()" />

    <!-- Charts Section Component - Lazy loaded with @defer -->
    @defer (on viewport; prefetch on idle) {
      <app-dashboard-charts
        [widgets]="chartWidgets()"
        [stats]="stats()"
        [categoryStats]="categoryStats()"
        [warehouseStats]="warehouseStats()"
        [statusChartSeries]="statusChartSeries()"
        [statusChartOptions]="statusChartOptions()"
        [categoryChartSeries]="categoryChartSeries()"
        [categoryChartOptions]="categoryChartOptions()"
        [warehouseChartSeries]="warehouseChartSeries()"
        [warehouseChartOptions]="warehouseChartOptions()"
        (widgetDrop)="onChartWidgetDrop($event)" />
    } @placeholder {
      <div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 mb-8">
        @for (i of [1, 2, 3]; track i) {
          <div class="bg-surface-variant rounded-xl border border-theme p-6 animate-pulse">
            <div class="h-6 bg-[var(--color-surface-elevated)] rounded w-1/3 mb-4"></div>
            <div class="h-64 bg-[var(--color-surface-elevated)] rounded"></div>
          </div>
        }
      </div>
    } @loading (minimum 200ms) {
      <div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 mb-8">
        @for (i of [1, 2, 3]; track i) {
          <div class="bg-surface-variant rounded-xl border border-theme p-6">
            <div class="flex items-center justify-center h-72">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          </div>
        }
      </div>
    }

    <!-- Custom Charts Section -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-foreground">{{ 'DASHBOARD.CUSTOM_CHART.SECTION_TITLE' | translate }}</h3>
        <button
          (click)="openCustomChartDialog()"
          class="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium">
          <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
          {{ 'DASHBOARD.CUSTOM_CHART.ADD' | translate }}
        </button>
      </div>

      @if (customCharts().length === 0) {
        <div class="bg-surface-variant rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
          <lucide-icon name="BarChart3" class="!w-10 !h-10 text-[var(--color-on-surface-muted)] mb-3 mx-auto"></lucide-icon>
          <p class="text-[var(--color-on-surface-variant)] text-sm mb-4">{{ 'DASHBOARD.CUSTOM_CHART.EMPTY' | translate }}</p>
          <button
            (click)="openCustomChartDialog()"
            class="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] text-sm font-medium transition-colors">
            {{ 'DASHBOARD.CUSTOM_CHART.CREATE_FIRST' | translate }}
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (chart of customCharts(); track chart.id) {
            <div class="bg-surface-variant rounded-xl border border-theme p-6 hover:border-[var(--color-border)] transition-colors">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-md font-semibold text-foreground truncate">{{ chart.title }}</h4>
                <div class="flex items-center gap-1">
                  <button
                    (click)="openCustomChartDialog(chart)"
                    [attr.aria-label]="('COMMON.EDIT' | translate) + ' ' + chart.title"
                    class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
                    <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                  </button>
                  <button
                    (click)="deleteCustomChart(chart)"
                    [attr.aria-label]="('COMMON.DELETE' | translate) + ' ' + chart.title"
                    class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors">
                    <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                  </button>
                </div>
              </div>

              @if (!dataReady()) {
                <div class="flex flex-col items-center justify-center py-8">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)] mb-2"></div>
                  <p class="text-[var(--color-on-surface-variant)] text-sm">{{ 'COMMON.LOADING' | translate }}...</p>
                </div>
              } @else if (hasChartData(chart)) {
                @defer (on viewport) {
                  <apx-chart
                    [series]="customChartConfigs().get(chart.id)!.data.series"
                    [chart]="customChartConfigs().get(chart.id)!.options.chart"
                    [xaxis]="customChartConfigs().get(chart.id)!.options.xaxis"
                    [yaxis]="customChartConfigs().get(chart.id)!.options.yaxis"
                    [colors]="customChartConfigs().get(chart.id)!.options.colors"
                    [grid]="customChartConfigs().get(chart.id)!.options.grid"
                    [plotOptions]="customChartConfigs().get(chart.id)!.options.plotOptions"
                    [dataLabels]="customChartConfigs().get(chart.id)!.options.dataLabels"
                    [legend]="customChartConfigs().get(chart.id)!.options.legend"
                    [labels]="customChartConfigs().get(chart.id)!.data.labels"
                    [tooltip]="customChartConfigs().get(chart.id)!.options.tooltip">
                  </apx-chart>
                } @placeholder {
                  <div class="h-64 bg-[var(--color-surface-elevated)] rounded animate-pulse"></div>
                }
              } @else {
                <div class="flex flex-col items-center justify-center py-8">
                  <lucide-icon name="BarChart2" class="!w-8 !h-8 text-[var(--color-on-surface-muted)] mb-2"></lucide-icon>
                  <p class="text-[var(--color-on-surface-variant)] text-sm">{{ 'COMMON.NO_DATA' | translate }}</p>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Two Column Layout for Tables (Drag & Drop) -->
    <div
      cdkDropList
      cdkDropListOrientation="horizontal"
      (cdkDropListDropped)="onTableWidgetDrop($event)"
      class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      @for (widget of tableWidgets(); track widget) {
        <div cdkDrag class="bg-surface-variant border border-theme rounded-xl overflow-hidden transition-colors">
          <!-- Transactions Widget -->
          @if (widget === 'transactions') {
            <app-dashboard-transactions
              [transactions]="recentTransactions()"
              (viewAll)="viewAllTransactions()" />
          }

          <!-- Low Stock Widget -->
          @if (widget === 'lowStock') {
            <app-dashboard-low-stock
              [items]="lowStockItems()"
              (viewAll)="viewAllInventory()"
              (itemClick)="viewItem($event)" />
          }

          <!-- Drag Placeholder -->
          <div *cdkDragPlaceholder class="bg-[var(--color-surface-elevated)] rounded-xl border-2 border-dashed border-[var(--color-primary)] h-full min-h-[300px]"></div>
        </div>
      }
    </div>

    <!-- Recent Items Table -->
    <app-dashboard-recent-items
      [items]="items()"
      [loading]="loading()"
      (viewRequested)="viewItem($event)"
      (editRequested)="editItem($event)"
      (deleteRequested)="deleteItem($event)"
      (addRequested)="addNewItem()"
      (viewAllRequested)="viewAllInventory()" />

      <!-- Quick Actions -->
      <div class="mt-6 flex flex-wrap gap-4">
        <button
          (click)="addNewItem()"
          class="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-hover)] transition-all font-medium">
          {{ 'DASHBOARD.ADD_NEW_ITEM' | translate }}
        </button>
        <button
          (click)="viewAllInventory()"
          class="bg-[var(--color-surface-elevated)] text-foreground px-6 py-2 rounded-lg hover:bg-[var(--color-surface-elevated)] transition-all font-medium">
          {{ 'COMMON.VIEW_ALL' | translate }} {{ 'NAV.INVENTORY' | translate }}
        </button>
      </div>
    }
  </div>
</div>
  `,
  styleUrl: './dashboard.css'
})
export class Dashboard extends DashboardChartsBase implements OnInit {
  private inventoryService = inject(InventoryService);
  private dashboardService = inject(DashboardService);
  private transactionService = inject(TransactionService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  protected readonly translate = inject(TranslateService);
  private notifications = inject(NotificationService);
  private logger = inject(LoggerService);
  protected readonly themeService = inject(ThemeService);

  userName = computed(() => this.authService.currentUser()?.name || 'User');

  // Stats from API
  stats = signal<DashboardStats | null>(null);
  categoryStats = signal<CategoryStats[]>([]);
  warehouseStats = signal<WarehouseStats[]>([]);
  recentTransactions = signal<Transaction[]>([]);
  lowStockItems = signal<LowStockItem[]>([]);

  // Reactive data from service
  items = computed(() => this.inventoryService.items().slice(0, 5));

  // Loading and error states
  loading = signal(true);
  error = signal<string | null>(null);

  TransactionType = TransactionType;

  // Dashboard widgets configuration
  private readonly STORAGE_KEY = 'dashboard_layout';
  private readonly CUSTOM_CHARTS_KEY = 'dashboard_custom_charts';
  private readonly DATA_READY_DELAY_MS = 100;

  chartWidgets = signal<string[]>(['status', 'categories', 'warehouses']);
  tableWidgets = signal<string[]>(['transactions', 'lowStock']);
  customCharts = signal<CustomChart[]>([]);

  // Signal to track when dashboard data is ready for custom charts
  dataReady = signal<boolean>(false);

  // Memoized custom chart configs - avoids recalculation on every change detection
  customChartConfigs = computed(() => {
    const charts = this.customCharts();
    const configs = new Map<string, { data: { labels: string[]; series: ApexAxisChartSeries | ApexNonAxisChartSeries }; options: CustomChartOptions }>();
    // Access reactive dependencies to track changes
    this.categoryStats();
    this.warehouseStats();
    this.stats();
    this.lowStockItems();
    this.allItems();
    for (const chart of charts) {
      configs.set(chart.id, {
        data: this.getCustomChartData(chart),
        options: this.getCustomChartOptions(chart)
      });
    }
    return configs;
  });

  // ApexNonAxisChartSeries (pie/donut/radialBar) is number[]; ApexAxisChartSeries
  // is {name, data}[] — narrow on the actual runtime shape rather than fighting
  // the union type in the template.
  hasChartData(chart: CustomChart): boolean {
    const series = this.customChartConfigs().get(chart.id)?.data?.series;
    if (!series || series.length === 0) return false;
    const first = series[0];
    return typeof first === 'number' ? true : (first?.data?.length ?? 0) > 0;
  }

  // Value calculations from inventory items
  allItems = signal<InventoryItemInterface[]>([]);

  // Exchange rate: 1 USD = 25 HNL
  private readonly HNL_TO_USD_RATE = 25;

  // Chart configurations
  statusChartSeries = signal<ApexNonAxisChartSeries>([]);
  statusChartOptions = signal<StatusChartOptions | null>(null);

  categoryChartSeries = signal<ApexAxisChartSeries>([]);
  categoryChartOptions = signal<BarChartOptions | null>(null);

  warehouseChartSeries = signal<ApexAxisChartSeries>([]);
  warehouseChartOptions = signal<BarChartOptions | null>(null);

  constructor() {
    super();
    this.initChartOptions();
    this.loadSavedLayout();
    this.loadCustomCharts();

    // Re-render charts when theme changes
    let initialized = false;
    effect(() => {
      this.themeService.isDark();
      if (!initialized) { initialized = true; return; }
      // Wait for CSS variables to update
      setTimeout(() => {
        this.initChartOptions();
        this.updateCharts();
      }, 50);
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  // Layout persistence
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

  private getItemsForDialog(): InventoryItemData[] {
    return this.allItems().map(item => ({
      name: item.name,
      category: item.category || this.translate.instant('COMMON.NO_CATEGORY'),
      warehouse: item.warehouse?.name || this.translate.instant('COMMON.NO_WAREHOUSE'),
      supplier: item.supplier?.name || this.translate.instant('COMMON.NO_SUPPLIER'),
      status: this.getStatusLabel(item.status),
      price: item.price || 0,
      quantity: item.quantity,
      currency: item.currency as 'USD' | 'HNL'
    }));
  }

  protected getStatusLabel(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK:
        return this.translate.instant('DASHBOARD.IN_STOCK');
      case InventoryStatus.LOW_STOCK:
        return this.translate.instant('DASHBOARD.LOW_STOCK');
      case InventoryStatus.OUT_OF_STOCK:
        return this.translate.instant('DASHBOARD.OUT_OF_STOCK');
      case InventoryStatus.IN_USE:
        return this.translate.instant('DASHBOARD.IN_USE');
      default:
        return 'Unknown';
    }
  }

  openCustomChartDialog(chart?: CustomChart): void {
    const dialogData: CustomChartDialogData = {
      chart,
      items: this.getItemsForDialog(),
      availableData: {
        categories: this.categoryStats().map(c => ({ name: c.category || this.translate.instant('COMMON.NO_CATEGORY'), count: c.count })),
        warehouses: this.warehouseStats().map(w => ({ name: w.name || this.translate.instant('COMMON.NO_WAREHOUSE'), count: w.itemCount })),
        status: [
          { name: this.translate.instant('DASHBOARD.IN_STOCK'), count: this.stats()?.inStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.LOW_STOCK'), count: this.stats()?.lowStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.OUT_OF_STOCK'), count: this.stats()?.outOfStockItems || 0 },
          { name: this.translate.instant('DASHBOARD.IN_USE'), count: this.stats()?.inUseItems || 0 }
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

  private loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

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
        const data: StatsResponse | null = results.stats || null;

        const dashboardStats: DashboardStats = {
          totalItems: data?.total || 0,
          totalUsers: results.usersCount,
          totalWarehouses: results.warehousesCount,
          totalSuppliers: 0,
          totalCategories: results.categoriesCount,
          inStockItems: data?.inStock || 0,
          lowStockItems: data?.lowStock || 0,
          outOfStockItems: data?.outOfStock || 0,
          inUseItems: data?.inUse || 0,
          totalValueUSD: data?.totalValue || 0,
          totalValueHNL: (data?.totalValue || 0) * this.HNL_TO_USD_RATE
        };

        this.stats.set(dashboardStats);
        this.categoryStats.set((data?.categories || []).map((cat) => ({
          category: cat.name,
          count: cat.count,
          totalQuantity: cat.count
        })));
        this.warehouseStats.set((data?.locations || []).map((loc, index: number) => ({
          id: `warehouse-${index}`,
          name: loc.name,
          itemCount: loc.count,
          totalQuantity: loc.count
        })));

        this.lowStockItems.set(results.lowStockItems);
        this.recentTransactions.set(results.recentTransactions);
        this.allItems.set(results.allItems);
        this.loading.set(false);

        this.updateCharts();

        setTimeout(() => {
          this.dataReady.set(true);
        }, this.DATA_READY_DELAY_MS);
      },
      error: (err) => {
        this.logger.error('Error loading dashboard data', err);
        this.error.set(this.translate.instant('ERRORS.LOADING_DATA') + ': ' + (err.message || ''));
        this.loading.set(false);
      }
    });

    this.inventoryService.loadItems();
  }

  // Item actions
  viewItem(item: InventoryItemInterface | LowStockItem): void {
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
        title: this.translate.instant('INVENTORY.DELETE_CONFIRM.TITLE'),
        message: this.translate.instant('INVENTORY.DELETE_CONFIRM.MESSAGE', { name: item.name }),
        confirmText: this.translate.instant('COMMON.DELETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.inventoryService.deleteItem(item.id).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.ITEM', item.name);
            this.loadDashboardData();
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.ITEM');
          }
        });
      }
    });
  }

  // Navigation actions
  addNewItem(): void {
    this.router.navigate(['/inventory/add']);
  }

  viewAllInventory(): void {
    this.router.navigate(['/inventory']);
  }

  viewAllTransactions(): void {
    this.router.navigate(['/transactions']);
  }

  // Utility methods
}
