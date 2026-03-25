import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { downloadStyledXLSX } from '../../utils/xlsx.utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { forkJoin } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { InventoryService } from '../../services/inventory/inventory.service';
import { TransactionService } from '../../services/transaction.service';
import { UserService } from '../../services/user.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { InventoryItemInterface, InventoryStatus, ItemType } from '../../interfaces/inventory-item.interface';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';
import { environment } from '../../../environments/environment';

type ReportCurrency = 'USD' | 'HNL' | 'ALL';

interface ValueSummary {
  label: string;
  value: number;
  count: number;
}

interface StatusSummary {
  status: InventoryStatus;
  count: number;
  items: InventoryItemInterface[];
}

interface AssignmentSummary {
  userId: string;
  userName: string;
  userEmail: string;
  itemCount: number;
  items: InventoryItemInterface[];
}

interface TrendPoint {
  date: string;
  in: number;
  out: number;
  transfer: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatTabsModule,
    FormsModule,
    TranslateModule,
    NgApexchartsModule,
  ],
  templateUrl: './reports.html'
})
export class Reports implements OnInit {
  private inventoryService = inject(InventoryService);
  private transactionService = inject(TransactionService);
  private userService = inject(UserService);
  private translate = inject(TranslateService);
  private pdfExportService = inject(PdfExportService);
  private http = inject(HttpClient);

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

  // Enums for template
  InventoryStatus = InventoryStatus;
  TransactionType = TransactionType;
  ItemType = ItemType;

  currencyOptions: { value: ReportCurrency; label: string }[] = [
    { value: 'USD', label: 'USD' },
    { value: 'HNL', label: 'HNL' },
    { value: 'ALL', label: 'REPORTS.ALL_CURRENCIES' }
  ];

  // ============ VALUE REPORT COMPUTED ============
  filteredItems = computed(() => {
    const items = this.allItems();
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

  topItems = computed((): (InventoryItemInterface & { totalValue: number })[] => {
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
    let transactions = this.allTransactions();
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
    const items = this.allItems();
    const statuses = [InventoryStatus.IN_STOCK, InventoryStatus.LOW_STOCK, InventoryStatus.OUT_OF_STOCK, InventoryStatus.IN_USE];

    return statuses.map(status => ({
      status,
      count: items.filter(i => i.status === status).length,
      items: items.filter(i => i.status === status).slice(0, 10)
    }));
  });

  outOfStockItems = computed(() => {
    return this.allItems().filter(i => i.status === InventoryStatus.OUT_OF_STOCK);
  });

  lowStockItems = computed(() => {
    return this.allItems().filter(i => i.status === InventoryStatus.LOW_STOCK);
  });

  // ============ ASSIGNMENTS REPORT COMPUTED ============
  assignedItems = computed(() => {
    return this.allItems().filter(item =>
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
    return this.allItems().filter(item =>
      item.itemType === ItemType.UNIQUE && !item.assignedToUserId
    );
  });

  // ============ TRENDS COMPUTED ============
  transactionTrends = computed((): TrendPoint[] => {
    const transactions = this.allTransactions();
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

  trendChartOptions = computed(() => {
    const trends = this.transactionTrends();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    return {
      series: [
        { name: this.translate.instant('TRANSACTIONS.TYPE.IN'), data: trends.map(t => t.in) },
        { name: this.translate.instant('TRANSACTIONS.TYPE.OUT'), data: trends.map(t => t.out) },
        { name: this.translate.instant('TRANSACTIONS.TYPE.TRANSFER'), data: trends.map(t => t.transfer) }
      ],
      chart: {
        type: 'area' as const,
        height: 350,
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      colors: ['#4d7c6f', '#ef4444', '#3b82f6'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth' as const, width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1
        }
      },
      xaxis: {
        categories: trends.map(t => this.formatShortDate(t.date)),
        labels: {
          style: { colors: isDark ? '#94a3b8' : '#64748b' },
          rotate: -45,
          rotateAlways: true
        },
        axisBorder: { color: isDark ? '#334155' : '#e2e8f0' },
        axisTicks: { color: isDark ? '#334155' : '#e2e8f0' }
      },
      yaxis: {
        labels: { style: { colors: isDark ? '#94a3b8' : '#64748b' } }
      },
      grid: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        strokeDashArray: 4
      },
      legend: {
        position: 'top' as const,
        horizontalAlign: 'right' as const,
        labels: { colors: isDark ? '#94a3b8' : '#64748b' }
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light'
      }
    };
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

  getCurrencySymbol(): string {
    const currency = this.selectedCurrency();
    if (currency === 'ALL') return '$';
    return currency === 'USD' ? '$' : 'L';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatCurrency(value: number): string {
    return `${this.getCurrencySymbol()}${this.formatNumber(value)}`;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatShortDate(date: string): string {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  getStatusColor(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'emerald';
      case InventoryStatus.LOW_STOCK: return 'orange';
      case InventoryStatus.OUT_OF_STOCK: return 'rose';
      case InventoryStatus.IN_USE: return 'blue';
      default: return 'slate';
    }
  }

  getStatusIcon(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'CheckCircle2';
      case InventoryStatus.LOW_STOCK: return 'AlertTriangle';
      case InventoryStatus.OUT_OF_STOCK: return 'XCircle';
      case InventoryStatus.IN_USE: return 'User';
      default: return 'HelpCircle';
    }
  }

  getTransactionIcon(type: TransactionType): string {
    switch (type) {
      case TransactionType.IN: return 'ArrowDown';
      case TransactionType.OUT: return 'ArrowUp';
      case TransactionType.TRANSFER: return 'ArrowLeftRight';
      default: return 'Receipt';
    }
  }

  getTransactionColor(type: TransactionType): string {
    switch (type) {
      case TransactionType.IN: return 'emerald';
      case TransactionType.OUT: return 'rose';
      case TransactionType.TRANSFER: return 'blue';
      default: return 'slate';
    }
  }

  exportReport(): void {
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

    downloadStyledXLSX(rows, {
      sheetName:   'Inventory',
      filename:    `inventario-valor-${currency}-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor: '4D7C6F',
      colWidths:   [30, 12, 18, 22, 22, 8, 10, 12, 12, 8, 14],
    });
  }

  exportTransactions(): void {
    const t = (key: string) => this.translate.instant(key);
    const rows: Record<string, any>[] = [];

    for (const tx of this.filteredTransactions()) {
      for (const item of tx.items) {
        rows.push({
          [t('REPORTS.TABLE.DATE')]:               this.formatDateTime(tx.date),
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

    downloadStyledXLSX(rows, {
      sheetName:   'Transactions',
      filename:    `transacciones-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor: '60A5FA',
      colWidths:   [18, 12, 22, 22, 20, 30, 12, 8, 30, 30],
    });
  }

  exportStatusReport(): void {
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

    downloadStyledXLSX(rows, {
      sheetName:        'Stock Status',
      filename:         `estado-stock-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor:      'B45309',
      colWidths:        [30, 12, 18, 22, 12, 10, 14, 14],
    });
  }

  exportAssignments(): void {
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
        [t('REPORTS.CSV.ASSIGNMENT_DATE')]:     item.assignedAt ? this.formatDate(item.assignedAt) : '',
        [t('REPORTS.CSV.ASSIGNMENT_STATUS')]:   item.assignedToUserId ? t('REPORTS.ASSIGNED') : t('REPORTS.UNASSIGNED'),
      }));

    downloadStyledXLSX(rows, {
      sheetName:   'Assignments',
      filename:    `asignaciones-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor: 'A78BFA',
      colWidths:   [30, 14, 14, 18, 22, 22, 28, 16, 14],
    });
  }

  exportTransactionsPDF(): void {
    const transactions = this.filteredTransactions();
    this.pdfExportService.exportTransactionsToPDF({
      transactions,
      title: this.translate.instant('REPORTS.PDF.TITLE'),
      dateRange: {
        from: this.dateFrom() || undefined,
        to: this.dateTo() || undefined
      },
      typeFilter: this.transactionTypeFilter()
    });
  }

  exportValueReportPDF(): void {
    const currency = this.selectedCurrency();
    this.pdfExportService.exportValueReportToPDF({
      currency: currency === 'ALL' ? 'USD' : currency,
      totalValue: this.totalValue(),
      totalItems: this.totalItemsCount(),
      valueByCategory: this.valueByCategory(),
      valueByWarehouse: this.valueByWarehouse(),
      valueBySupplier: this.valueBySupplier(),
      topItems: this.topItems()
    });
  }

  exportStatusReportPDF(): void {
    this.pdfExportService.exportStatusReportToPDF({
      inStockCount: this.statusSummary().find(s => s.status === InventoryStatus.IN_STOCK)?.count || 0,
      lowStockCount: this.statusSummary().find(s => s.status === InventoryStatus.LOW_STOCK)?.count || 0,
      outOfStockCount: this.statusSummary().find(s => s.status === InventoryStatus.OUT_OF_STOCK)?.count || 0,
      inUseCount: this.statusSummary().find(s => s.status === InventoryStatus.IN_USE)?.count || 0,
      lowStockItems: this.lowStockItems(),
      outOfStockItems: this.outOfStockItems()
    });
  }

  exportAssignmentsReportPDF(): void {
    const totalUniqueItems = this.assignedItems().length + this.unassignedUniqueItems().length;
    this.pdfExportService.exportAssignmentsReportToPDF({
      totalUniqueItems,
      assignedCount: this.assignedItems().length,
      unassignedCount: this.unassignedUniqueItems().length,
      assignmentsByUser: this.assignmentsByUser(),
      unassignedItems: this.unassignedUniqueItems()
    });
  }

  // ============ SERVER-SIDE EXCEL DOWNLOADS ============

  private downloadReport(endpoint: string, filename: string): void {
    const locale = this.translate.currentLang === 'es' ? 'es' : 'en';
    this.http.get(`${environment.apiUrl}/${endpoint}?locale=${locale}`, { responseType: 'blob' })
      .subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  exportInventoryExcel(): void {
    const locale = this.translate.currentLang === 'es' ? 'es' : 'en';
    this.downloadReport('reports/inventory/excel', `inventario_${Date.now()}.xlsx`);
  }

  exportLowStockExcel(): void {
    this.downloadReport('reports/low-stock/excel', `stock_bajo_${Date.now()}.xlsx`);
  }

  exportTransactionsExcel(): void {
    this.downloadReport('reports/transactions/excel', `transacciones_${Date.now()}.xlsx`);
  }

  exportLoansExcel(): void {
    this.downloadReport('reports/loans/excel', `prestamos_${Date.now()}.xlsx`);
  }

  exportTransfersExcel(): void {
    this.downloadReport('reports/transfers/excel', `transferencias_${Date.now()}.xlsx`);
  }

  exportStockTakesExcel(): void {
    this.downloadReport('reports/stock-takes/excel', `conteo_fisico_${Date.now()}.xlsx`);
  }

  exportDischargesExcel(): void {
    this.downloadReport('reports/discharges/excel', `bajas_${Date.now()}.xlsx`);
  }

}
