import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { downloadStyledXLSX, XlsxRow } from '../../utils/xlsx.utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InventoryService } from '../../services/inventory/inventory.service';
import { TransactionService } from '../../services/transaction.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { NotificationService } from '../../services/notification.service';
import { InventoryItemInterface, InventoryStatus, ItemType } from '../../interfaces/inventory-item.interface';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';
import { AssignmentSummary, ReportCurrency, StatusSummary, TopItem, TrendPoint, ValueSummary } from './reports.types';
import { formatDate, formatDateTime } from './reports.format';
import { ReportsAssignmentsTab } from './tabs/reports-assignments-tab';
import { ReportsDownloadsTab } from './tabs/reports-downloads-tab';
import { ReportsStatusTab } from './tabs/reports-status-tab';
import { ReportsTransactionsTab } from './tabs/reports-transactions-tab';
import { ReportsTrendsTab } from './tabs/reports-trends-tab';
import { ReportsValueTab } from './tabs/reports-value-tab';
import { Spinner } from '../shared/spinner/spinner';

@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideAngularModule,
    TranslateModule,
    ReportsAssignmentsTab,
    ReportsDownloadsTab,
    ReportsStatusTab,
    ReportsTransactionsTab,
    ReportsTrendsTab,
    ReportsValueTab,
    Spinner,
  ],
  template: `
<div class="min-h-screen bg-surface p-6">
  <div class="max-w-[1600px] mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-[var(--color-primary-container)] rounded-xl flex items-center justify-center flex-shrink-0">
          <lucide-icon name="BarChart3" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-foreground mb-1">{{ 'REPORTS.TITLE' | translate }}</h1>
          <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'REPORTS.SUBTITLE' | translate }}</p>
        </div>
      </div>
    </div>

    <!-- Global warehouse filter — applies to every tab -->
    <div class="mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
      <div class="flex flex-col gap-1.5 w-full sm:max-w-xs">
        <label for="reports-warehouse-filter" class="text-xs font-medium uppercase tracking-wider" style="color: var(--color-on-surface-variant);">
          {{ 'REPORTS.FILTER_WAREHOUSE' | translate }}
        </label>
        <select
          id="reports-warehouse-filter"
          [value]="selectedWarehouseId()"
          (change)="selectedWarehouseId.set($any($event.target).value)"
          class="select-chevron w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition-colors"
          style="background-color: var(--color-surface-variant); border-color: var(--color-border); color: var(--color-on-surface);">
          <option value="">{{ 'REPORTS.ALL_WAREHOUSES' | translate }}</option>
          @for (w of warehouseOptions(); track w.id) {
            <option [value]="w.id">{{ w.name }}</option>
          }
        </select>
      </div>
      @if (selectedWarehouseId()) {
        <button
          type="button"
          (click)="selectedWarehouseId.set('')"
          class="text-xs px-3 py-2 rounded-lg border transition-colors"
          style="border-color: var(--color-border); color: var(--color-on-surface-variant);">
          {{ 'COMMON.CLEAR' | translate }}
        </button>
      }
    </div>

    <!-- Tabs -->
    <div class="mb-6">
      <div class="flex flex-wrap gap-2 border-b border-theme pb-2" role="tablist" [attr.aria-label]="'REPORTS.TITLE' | translate">
        <button
          (click)="onTabChange(0)"
          role="tab"
          [attr.aria-selected]="activeTab() === 0"
          [class]="activeTab() === 0 ? 'bg-[var(--color-primary)] text-white' : 'bg-surface-elevated text-[var(--color-on-surface-variant)] hover:text-foreground'"
          class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
          <lucide-icon name="DollarSign" class="!w-4 !h-4"></lucide-icon>
          {{ 'REPORTS.TAB_VALUE' | translate }}
        </button>
        <button
          (click)="onTabChange(1)"
          role="tab"
          [attr.aria-selected]="activeTab() === 1"
          [class]="activeTab() === 1 ? 'bg-[var(--color-primary)] text-white' : 'bg-surface-elevated text-[var(--color-on-surface-variant)] hover:text-foreground'"
          class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
          <lucide-icon name="ArrowLeftRight" class="!w-4 !h-4"></lucide-icon>
          {{ 'REPORTS.TAB_TRANSACTIONS' | translate }}
        </button>
        <button
          (click)="onTabChange(2)"
          role="tab"
          [attr.aria-selected]="activeTab() === 2"
          [class]="activeTab() === 2 ? 'bg-[var(--color-primary)] text-white' : 'bg-surface-elevated text-[var(--color-on-surface-variant)] hover:text-foreground'"
          class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
          <lucide-icon name="Package" class="!w-4 !h-4"></lucide-icon>
          {{ 'REPORTS.TAB_STATUS' | translate }}
        </button>
        <button
          (click)="onTabChange(3)"
          role="tab"
          [attr.aria-selected]="activeTab() === 3"
          [class]="activeTab() === 3 ? 'bg-[var(--color-primary)] text-white' : 'bg-surface-elevated text-[var(--color-on-surface-variant)] hover:text-foreground'"
          class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
          <lucide-icon name="UserCheck" class="!w-4 !h-4"></lucide-icon>
          {{ 'REPORTS.TAB_ASSIGNMENTS' | translate }}
        </button>
        <button
          (click)="onTabChange(4)"
          role="tab"
          [attr.aria-selected]="activeTab() === 4"
          [class]="activeTab() === 4 ? 'bg-[var(--color-primary)] text-white' : 'bg-surface-elevated text-[var(--color-on-surface-variant)] hover:text-foreground'"
          class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
          <lucide-icon name="TrendingUp" class="!w-4 !h-4"></lucide-icon>
          {{ 'REPORTS.TAB_TRENDS' | translate }}
        </button>
        <button
          (click)="onTabChange(5)"
          role="tab"
          [attr.aria-selected]="activeTab() === 5"
          [class]="activeTab() === 5 ? 'bg-[var(--color-primary)] text-white' : 'bg-surface-elevated text-[var(--color-on-surface-variant)] hover:text-foreground'"
          class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
          <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
          {{ 'REPORTS.TAB_DOWNLOADS' | translate }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    @if (loading() && activeTab() !== 1) {
      <div class="flex items-center justify-center py-12">
        <app-spinner></app-spinner>
        <span class="ml-3 text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}...</span>
      </div>
    } @else {
      <!-- ========== TAB 0: VALUE REPORT ========== -->
      @if (activeTab() === 0) {
        <app-reports-value-tab
          [currency]="selectedCurrency()"
          [totalValue]="totalValue()"
          [totalItemsCount]="totalItemsCount()"
          [valueByCategory]="valueByCategory()"
          [valueByWarehouse]="valueByWarehouse()"
          [valueBySupplier]="valueBySupplier()"
          [topItems]="topItems()"
          (currencyChange)="onCurrencyChange($event)"
          (csvRequested)="exportReport()"
          (pdfRequested)="exportValueReportPDF()" />
      }

      <!-- ========== TAB 1: TRANSACTIONS REPORT ========== -->
      @if (activeTab() === 1) {
        <app-reports-transactions-tab
          [loading]="transactionsLoading()"
          [dateFrom]="dateFrom()"
          [dateTo]="dateTo()"
          [typeFilter]="transactionTypeFilter()"
          [stats]="transactionStats()"
          [transactions]="filteredTransactions()"
          (dateFromChange)="onDateFromChange($event)"
          (dateToChange)="onDateToChange($event)"
          (typeFilterChange)="onTransactionTypeChange($event)"
          (filtersCleared)="clearTransactionFilters()"
          (csvRequested)="exportTransactions()"
          (pdfRequested)="exportTransactionsPDF()" />
      }

      <!-- ========== TAB 2: STATUS REPORT ========== -->
      @if (activeTab() === 2) {
        <app-reports-status-tab
          [summaries]="statusSummary()"
          [outOfStockItems]="outOfStockItems()"
          [lowStockItems]="lowStockItems()"
          (csvRequested)="exportStatusReport()"
          (pdfRequested)="exportStatusReportPDF()" />
      }

      <!-- ========== TAB 3: ASSIGNMENTS REPORT ========== -->
      @if (activeTab() === 3) {
        <app-reports-assignments-tab
          [assignedItems]="assignedItems()"
          [unassignedUniqueItems]="unassignedUniqueItems()"
          [assignmentsByUser]="assignmentsByUser()"
          (csvRequested)="exportAssignments()"
          (pdfRequested)="exportAssignmentsReportPDF()" />
      }

      <!-- ========== TAB 4: TRENDS ========== -->
      @if (activeTab() === 4) {
        <app-reports-trends-tab [trends]="transactionTrends()" [loading]="transactionsLoading()" />
      }
    }
    <!-- Tab 5: Downloads -->
    @if (activeTab() === 5) {
      <app-reports-downloads-tab [warehouseId]="selectedWarehouseId()" />
    }
  </div>
</div>
  `,
})
export class Reports implements OnInit {
  private inventoryService = inject(InventoryService);
  private transactionService = inject(TransactionService);
  private translate = inject(TranslateService);
  private pdfExportService = inject(PdfExportService);
  private notifications = inject(NotificationService);

  // Tab state
  activeTab = signal<number>(0);

  // Loading states
  loading = signal<boolean>(true);
  transactionsLoading = signal<boolean>(true);

  // Data signals
  allItems = signal<InventoryItemInterface[]>([]);
  allTransactions = signal<Transaction[]>([]);
  selectedCurrency = signal<ReportCurrency>('USD');

  // Transaction filters
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  transactionTypeFilter = signal<string>('ALL');

  // Global warehouse filter — applies to every tab including server-side downloads.
  // Empty = all warehouses the user can access.
  selectedWarehouseId = signal<string>('');
  warehouseOptions = computed(() => this.inventoryService.warehouses());

  /** Items scoped to the currently selected warehouse (or all when empty). */
  private scopedItems = computed(() => {
    const wh = this.selectedWarehouseId();
    const items = this.allItems();
    return wh ? items.filter((i) => i.warehouseId === wh) : items;
  });

  /** Transactions scoped to the currently selected warehouse on source OR destination side. */
  private scopedTransactions = computed(() => {
    const wh = this.selectedWarehouseId();
    const transactions = this.allTransactions();
    if (!wh) return transactions;
    return transactions.filter(
      (t) => t.sourceWarehouseId === wh || t.destinationWarehouseId === wh,
    );
  });

  // ============ VALUE REPORT COMPUTED ============
  filteredItems = computed(() => {
    const items = this.scopedItems();
    const currency = this.selectedCurrency();
    if (currency === 'ALL') return items;
    return items.filter(item => item.currency === currency);
  });

  totalValue = computed(() => {
    return this.filteredItems().reduce((sum, item) => {
      return sum + ((item.price || 0) * item.quantity);
    }, 0);
  });

  totalItemsCount = computed(() => this.filteredItems().length);

  valueByCategory = computed((): ValueSummary[] => {
    const items = this.filteredItems();
    const map = new Map<string, { value: number; count: number }>();

    for (const item of items) {
      const category = item.category || 'Uncategorized';
      const existing = map.get(category) || { value: 0, count: 0 };
      map.set(category, {
        value: existing.value + ((item.price || 0) * item.quantity),
        count: existing.count + 1
      });
    }

    return Array.from(map.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => b.value - a.value);
  });

  valueByWarehouse = computed((): ValueSummary[] => {
    const items = this.filteredItems();
    const warehouses = this.inventoryService.warehouses();
    const map = new Map<string, { value: number; count: number }>();

    for (const item of items) {
      const warehouse = warehouses.find(w => w.id === item.warehouseId);
      const label = warehouse?.name || 'No Warehouse';
      const existing = map.get(label) || { value: 0, count: 0 };
      map.set(label, {
        value: existing.value + ((item.price || 0) * item.quantity),
        count: existing.count + 1
      });
    }

    return Array.from(map.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => b.value - a.value);
  });

  valueBySupplier = computed((): ValueSummary[] => {
    const items = this.filteredItems();
    const suppliers = this.inventoryService.suppliers();
    const map = new Map<string, { value: number; count: number }>();

    for (const item of items) {
      const supplier = suppliers.find(s => s.id === item.supplierId);
      const label = supplier?.name || 'No Supplier';
      const existing = map.get(label) || { value: 0, count: 0 };
      map.set(label, {
        value: existing.value + ((item.price || 0) * item.quantity),
        count: existing.count + 1
      });
    }

    return Array.from(map.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => b.value - a.value);
  });

  topItems = computed((): TopItem[] => {
    return this.filteredItems()
      .map(item => ({
        ...item,
        totalValue: (item.price || 0) * item.quantity
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  });

  // ============ TRANSACTIONS REPORT COMPUTED ============
  filteredTransactions = computed(() => {
    let transactions = this.scopedTransactions();
    const typeFilter = this.transactionTypeFilter();
    const from = this.dateFrom();
    const to = this.dateTo();

    if (typeFilter !== 'ALL') {
      transactions = transactions.filter(t => t.type === typeFilter);
    }

    if (from) {
      const fromDate = new Date(from);
      transactions = transactions.filter(t => new Date(t.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59);
      transactions = transactions.filter(t => new Date(t.date) <= toDate);
    }

    return transactions;
  });

  transactionStats = computed(() => {
    const transactions = this.filteredTransactions();
    const inCount = transactions.filter(t => t.type === TransactionType.IN).length;
    const outCount = transactions.filter(t => t.type === TransactionType.OUT).length;
    const transferCount = transactions.filter(t => t.type === TransactionType.TRANSFER).length;
    const totalItems = transactions.reduce((sum, t) => sum + t.items.length, 0);

    return { total: transactions.length, inCount, outCount, transferCount, totalItems };
  });

  // ============ STATUS REPORT COMPUTED ============
  statusSummary = computed((): StatusSummary[] => {
    const items = this.scopedItems();
    const statuses = [InventoryStatus.IN_STOCK, InventoryStatus.LOW_STOCK, InventoryStatus.OUT_OF_STOCK, InventoryStatus.IN_USE];

    return statuses.map(status => ({
      status,
      count: items.filter(i => i.status === status).length,
      items: items.filter(i => i.status === status).slice(0, 10)
    }));
  });

  outOfStockItems = computed(() => {
    return this.scopedItems().filter(i => i.status === InventoryStatus.OUT_OF_STOCK);
  });

  lowStockItems = computed(() => {
    return this.scopedItems().filter(i => i.status === InventoryStatus.LOW_STOCK);
  });

  // ============ ASSIGNMENTS REPORT COMPUTED ============
  assignedItems = computed(() => {
    return this.scopedItems().filter(item =>
      item.itemType === ItemType.UNIQUE && item.assignedToUserId
    );
  });

  assignmentsByUser = computed((): AssignmentSummary[] => {
    const items = this.assignedItems();
    const map = new Map<string, AssignmentSummary>();

    for (const item of items) {
      if (!item.assignedToUserId) continue;

      const existing = map.get(item.assignedToUserId);
      if (existing) {
        existing.itemCount++;
        existing.items.push(item);
      } else {
        map.set(item.assignedToUserId, {
          userId: item.assignedToUserId,
          userName: item.assignedToUser?.name || 'Unknown',
          userEmail: item.assignedToUser?.email || '',
          itemCount: 1,
          items: [item]
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.itemCount - a.itemCount);
  });

  unassignedUniqueItems = computed(() => {
    return this.scopedItems().filter(item =>
      item.itemType === ItemType.UNIQUE && !item.assignedToUserId
    );
  });

  // ============ TRENDS COMPUTED ============
  transactionTrends = computed((): TrendPoint[] => {
    const transactions = this.scopedTransactions();
    const map = new Map<string, TrendPoint>();

    // Get last 30 days
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      map.set(dateStr, { date: dateStr, in: 0, out: 0, transfer: 0 });
    }

    for (const tx of transactions) {
      const dateStr = new Date(tx.date).toISOString().split('T')[0];
      const existing = map.get(dateStr);
      if (existing) {
        if (tx.type === TransactionType.IN) existing.in++;
        else if (tx.type === TransactionType.OUT) existing.out++;
        else if (tx.type === TransactionType.TRANSFER) existing.transfer++;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.transactionsLoading.set(true);

    // Load items
    this.inventoryService.getItemsObservable().subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    // Load transactions
    this.transactionService.getAll().subscribe({
      next: (transactions) => {
        this.allTransactions.set(transactions);
        this.transactionsLoading.set(false);
      },
      error: () => this.transactionsLoading.set(false)
    });
  }

  onTabChange(index: number): void {
    this.activeTab.set(index);
  }

  onCurrencyChange(currency: ReportCurrency): void {
    this.selectedCurrency.set(currency);
  }

  onDateFromChange(date: string): void {
    this.dateFrom.set(date);
  }

  onDateToChange(date: string): void {
    this.dateTo.set(date);
  }

  onTransactionTypeChange(type: string): void {
    this.transactionTypeFilter.set(type);
  }

  clearTransactionFilters(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.transactionTypeFilter.set('ALL');
  }

  async exportReport(): Promise<void> {
    const currency = this.selectedCurrency();
    const warehouses = this.inventoryService.warehouses();
    const suppliers = this.inventoryService.suppliers();
    const t = (key: string) => this.translate.instant(key);

    const rows = this.filteredItems().map(item => ({
      [t('REPORTS.TABLE.ITEM')]:       item.name,
      SKU:                             item.sku || '',
      [t('REPORTS.TABLE.CATEGORY')]:   item.category,
      [t('REPORTS.PDF.WAREHOUSE')]:    warehouses.find(w => w.id === item.warehouseId)?.name || '',
      [t('SUPPLIER.TITLE')]:           suppliers.find(s => s.id === item.supplierId)?.name || '',
      [t('REPORTS.TABLE.QTY')]:        item.quantity,
      [t('REPORTS.PDF.MIN_QTY')]:      item.minQuantity,
      [t('REPORTS.TABLE.UNIT_PRICE')]: item.price || 0,
      [t('REPORTS.TABLE.TOTAL')]:      +((item.price || 0) * item.quantity).toFixed(2),
      [t('REPORTS.PDF.CURRENCY')]:     item.currency || 'USD',
      [t('COMMON.STATUS')]:            t(`STATUS.${item.status}`),
    }));

    await this.notifications.guardExport(() => downloadStyledXLSX(rows, {
      sheetName:   'Inventory',
      filename:    `inventario-valor-${currency}-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor: '4D7C6F',
      colWidths:   [30, 12, 18, 22, 22, 8, 10, 12, 12, 8, 14],
    }));
  }

  async exportTransactions(): Promise<void> {
    const t = (key: string) => this.translate.instant(key);
    const rows: XlsxRow[] = [];

    for (const tx of this.filteredTransactions()) {
      for (const item of tx.items) {
        rows.push({
          [t('REPORTS.TABLE.DATE')]:               formatDateTime(tx.date),
          [t('REPORTS.TABLE.TYPE')]:               t(`TRANSACTIONS.TYPE.${tx.type}`),
          [t('TRANSACTION.SOURCE_WAREHOUSE')]:     tx.sourceWarehouse?.name || '',
          [t('TRANSACTION.DEST_WAREHOUSE')]:       tx.destinationWarehouse?.name || '',
          [t('REPORTS.TABLE.USER')]:               tx.user?.name || tx.user?.email || '',
          [t('REPORTS.TABLE.ITEM')]:               item.inventoryItem?.name || t('REPORTS.PDF.UNKNOWN_ITEM'),
          SKU:                                     item.inventoryItem?.sku || '',
          [t('REPORTS.TABLE.QTY')]:               item.quantity,
          [t('TRANSACTION.NOTES')]:               tx.notes || '',
          [`${t('REPORTS.PDF.NOTES')} Item`]:     item.notes || '',
        });
      }
    }

    await this.notifications.guardExport(() => downloadStyledXLSX(rows, {
      sheetName:   'Transactions',
      filename:    `transacciones-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor: '60A5FA',
      colWidths:   [18, 12, 22, 22, 20, 30, 12, 8, 30, 30],
    }));
  }

  async exportStatusReport(): Promise<void> {
    const warehouses = this.inventoryService.warehouses();
    const t = (key: string) => this.translate.instant(key);

    const rows = this.allItems().map(item => ({
      [t('REPORTS.TABLE.ITEM')]:         item.name,
      SKU:                               item.sku || '',
      [t('REPORTS.TABLE.CATEGORY')]:     item.category,
      [t('REPORTS.PDF.WAREHOUSE')]:      warehouses.find(w => w.id === item.warehouseId)?.name || '',
      [t('REPORTS.PDF.CURRENT_QTY')]:    item.quantity,
      [t('REPORTS.PDF.MIN_QTY')]:        item.minQuantity,
      [t('COMMON.STATUS')]:              t(`STATUS.${item.status}`),
      [t('REPORTS.CSV.NEEDS_RESTOCK')]:  item.quantity <= item.minQuantity ? t('COMMON.YES') : t('COMMON.NO'),
    }));

    await this.notifications.guardExport(() => downloadStyledXLSX(rows, {
      sheetName:        'Stock Status',
      filename:         `estado-stock-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor:      'B45309',
      colWidths:        [30, 12, 18, 22, 12, 10, 14, 14],
    }));
  }

  async exportAssignments(): Promise<void> {
    const warehouses = this.inventoryService.warehouses();
    const t = (key: string) => this.translate.instant(key);

    const rows = this.allItems()
      .filter(item => item.itemType === ItemType.UNIQUE)
      .map(item => ({
        [t('REPORTS.TABLE.ITEM')]:              item.name,
        [t('REPORTS.PDF.SERVICE_TAG')]:         item.serviceTag || '',
        [t('REPORTS.PDF.SERIAL_NUMBER')]:       item.serialNumber || '',
        [t('REPORTS.TABLE.CATEGORY')]:          item.category,
        [t('REPORTS.PDF.WAREHOUSE')]:           warehouses.find(w => w.id === item.warehouseId)?.name || '',
        [t('REPORTS.CSV.ASSIGNED_TO')]:         item.assignedToUser?.name || '',
        [t('REPORTS.PDF.EMAIL')]:               item.assignedToUser?.email || '',
        [t('REPORTS.CSV.ASSIGNMENT_DATE')]:     item.assignedAt ? formatDate(item.assignedAt) : '',
        [t('REPORTS.CSV.ASSIGNMENT_STATUS')]:   item.assignedToUserId ? t('REPORTS.ASSIGNED') : t('REPORTS.UNASSIGNED'),
      }));

    await this.notifications.guardExport(() => downloadStyledXLSX(rows, {
      sheetName:   'Assignments',
      filename:    `asignaciones-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor: 'A78BFA',
      colWidths:   [30, 14, 14, 18, 22, 22, 28, 16, 14],
    }));
  }

  async exportTransactionsPDF(): Promise<void> {
    const transactions = this.filteredTransactions();
    await this.notifications.guardExport(() => this.pdfExportService.exportTransactionsToPDF({
      transactions,
      title: this.translate.instant('REPORTS.PDF.TITLE'),
      dateRange: {
        from: this.dateFrom() || undefined,
        to: this.dateTo() || undefined
      },
      typeFilter: this.transactionTypeFilter()
    }));
  }

  async exportValueReportPDF(): Promise<void> {
    const currency = this.selectedCurrency();
    await this.notifications.guardExport(() => this.pdfExportService.exportValueReportToPDF({
      currency: currency === 'ALL' ? 'USD' : currency,
      totalValue: this.totalValue(),
      totalItems: this.totalItemsCount(),
      valueByCategory: this.valueByCategory(),
      valueByWarehouse: this.valueByWarehouse(),
      valueBySupplier: this.valueBySupplier(),
      topItems: this.topItems()
    }));
  }

  async exportStatusReportPDF(): Promise<void> {
    await this.notifications.guardExport(() => this.pdfExportService.exportStatusReportToPDF({
      inStockCount: this.statusSummary().find(s => s.status === InventoryStatus.IN_STOCK)?.count || 0,
      lowStockCount: this.statusSummary().find(s => s.status === InventoryStatus.LOW_STOCK)?.count || 0,
      outOfStockCount: this.statusSummary().find(s => s.status === InventoryStatus.OUT_OF_STOCK)?.count || 0,
      inUseCount: this.statusSummary().find(s => s.status === InventoryStatus.IN_USE)?.count || 0,
      lowStockItems: this.lowStockItems(),
      outOfStockItems: this.outOfStockItems()
    }));
  }

  async exportAssignmentsReportPDF(): Promise<void> {
    const totalUniqueItems = this.assignedItems().length + this.unassignedUniqueItems().length;
    await this.notifications.guardExport(() => this.pdfExportService.exportAssignmentsReportToPDF({
      totalUniqueItems,
      assignedCount: this.assignedItems().length,
      unassignedCount: this.unassignedUniqueItems().length,
      assignmentsByUser: this.assignmentsByUser(),
      unassignedItems: this.unassignedUniqueItems()
    }));
  }
}
