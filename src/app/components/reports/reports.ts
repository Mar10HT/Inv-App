import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { forkJoin } from 'rxjs';

import { InventoryService } from '../../services/inventory/inventory.service';
import { TransactionService } from '../../services/transaction.service';
import { UserService } from '../../services/user.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { InventoryItemInterface, InventoryStatus, ItemType } from '../../interfaces/inventory-item.interface';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';

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
    NgApexchartsModule
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {
  private inventoryService = inject(InventoryService);
  private transactionService = inject(TransactionService);
  private userService = inject(UserService);
  private translate = inject(TranslateService);
  private pdfExportService = inject(PdfExportService);

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
    const statuses = [InventoryStatus.IN_STOCK, InventoryStatus.LOW_STOCK, InventoryStatus.OUT_OF_STOCK];

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
        { name: 'Entradas', data: trends.map(t => t.in) },
        { name: 'Salidas', data: trends.map(t => t.out) },
        { name: 'Transferencias', data: trends.map(t => t.transfer) }
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
      default: return 'slate';
    }
  }

  getStatusIcon(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'CheckCircle2';
      case InventoryStatus.LOW_STOCK: return 'AlertTriangle';
      case InventoryStatus.OUT_OF_STOCK: return 'XCircle';
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
    const items = this.filteredItems();
    const warehouses = this.inventoryService.warehouses();
    const suppliers = this.inventoryService.suppliers();
    const t = (key: string) => this.translate.instant(key);
    const d = ';'; // Delimiter - semicolon for Excel compatibility

    // Headers
    let csv = `${t('REPORTS.TABLE.ITEM')}${d}SKU${d}${t('REPORTS.TABLE.CATEGORY')}${d}${t('REPORTS.PDF.WAREHOUSE')}${d}${t('SUPPLIER.TITLE')}${d}${t('REPORTS.TABLE.QTY')}${d}${t('REPORTS.PDF.MIN_QTY')}${d}${t('REPORTS.TABLE.UNIT_PRICE')}${d}${t('REPORTS.TABLE.TOTAL')}${d}${t('REPORTS.PDF.CURRENCY')}${d}${t('COMMON.STATUS')}\n`;

    // Data rows
    for (const item of items) {
      const warehouse = warehouses.find(w => w.id === item.warehouseId);
      const supplier = suppliers.find(s => s.id === item.supplierId);
      const totalValue = (item.price || 0) * item.quantity;
      const statusText = t(`STATUS.${item.status}`);

      csv += `"${this.escapeCSV(item.name)}"${d}"${item.sku || ''}"${d}"${this.escapeCSV(item.category)}"${d}"${this.escapeCSV(warehouse?.name || '')}"${d}"${this.escapeCSV(supplier?.name || '')}"${d}${item.quantity}${d}${item.minQuantity}${d}${this.formatDecimal(item.price || 0)}${d}${this.formatDecimal(totalValue)}${d}"${item.currency || 'USD'}"${d}"${statusText}"\n`;
    }

    this.downloadCSV(csv, `inventario-valor-${currency}-${new Date().toISOString().split('T')[0]}.csv`);
  }

  exportTransactions(): void {
    const transactions = this.filteredTransactions();
    const t = (key: string) => this.translate.instant(key);
    const d = ';'; // Delimiter - semicolon for Excel compatibility

    // Headers
    let csv = `${t('REPORTS.TABLE.DATE')}${d}${t('REPORTS.TABLE.TYPE')}${d}${t('TRANSACTION.SOURCE_WAREHOUSE')}${d}${t('TRANSACTION.DEST_WAREHOUSE')}${d}${t('REPORTS.TABLE.USER')}${d}${t('REPORTS.TABLE.ITEM')}${d}SKU${d}${t('REPORTS.TABLE.QTY')}${d}${t('TRANSACTION.NOTES')}${d}${t('REPORTS.PDF.NOTES')} Item\n`;

    // Data rows - one row per item in each transaction
    for (const tx of transactions) {
      const date = this.formatDateTime(tx.date);
      const typeText = t(`TRANSACTIONS.TYPE.${tx.type}`);
      const source = tx.sourceWarehouse?.name || '';
      const dest = tx.destinationWarehouse?.name || '';
      const user = tx.user?.name || tx.user?.email || '';
      const txNotes = tx.notes || '';

      for (const item of tx.items) {
        const itemName = item.inventoryItem?.name || t('REPORTS.PDF.UNKNOWN_ITEM');
        const itemSku = item.inventoryItem?.sku || '';
        const itemNotes = item.notes || '';

        csv += `"${date}"${d}"${typeText}"${d}"${this.escapeCSV(source)}"${d}"${this.escapeCSV(dest)}"${d}"${this.escapeCSV(user)}"${d}"${this.escapeCSV(itemName)}"${d}"${itemSku}"${d}${item.quantity}${d}"${this.escapeCSV(txNotes)}"${d}"${this.escapeCSV(itemNotes)}"\n`;
      }
    }

    this.downloadCSV(csv, `transacciones-${new Date().toISOString().split('T')[0]}.csv`);
  }

  exportStatusReport(): void {
    const items = this.allItems();
    const warehouses = this.inventoryService.warehouses();
    const t = (key: string) => this.translate.instant(key);
    const d = ';'; // Delimiter - semicolon for Excel compatibility

    // Headers
    let csv = `${t('REPORTS.TABLE.ITEM')}${d}SKU${d}${t('REPORTS.TABLE.CATEGORY')}${d}${t('REPORTS.PDF.WAREHOUSE')}${d}${t('REPORTS.PDF.CURRENT_QTY')}${d}${t('REPORTS.PDF.MIN_QTY')}${d}${t('COMMON.STATUS')}${d}${t('REPORTS.CSV.NEEDS_RESTOCK')}\n`;

    // Data rows - all items with their status
    for (const item of items) {
      const warehouse = warehouses.find(w => w.id === item.warehouseId);
      const needsRestock = item.quantity <= item.minQuantity ? t('COMMON.YES') : t('COMMON.NO');
      const statusText = t(`STATUS.${item.status}`);

      csv += `"${this.escapeCSV(item.name)}"${d}"${item.sku || ''}"${d}"${this.escapeCSV(item.category)}"${d}"${this.escapeCSV(warehouse?.name || '')}"${d}${item.quantity}${d}${item.minQuantity}${d}"${statusText}"${d}"${needsRestock}"\n`;
    }

    this.downloadCSV(csv, `estado-stock-${new Date().toISOString().split('T')[0]}.csv`);
  }

  exportAssignments(): void {
    // Get all unique items (both assigned and unassigned)
    const uniqueItems = this.allItems().filter(item => item.itemType === ItemType.UNIQUE);
    const warehouses = this.inventoryService.warehouses();
    const t = (key: string) => this.translate.instant(key);
    const d = ';'; // Delimiter - semicolon for Excel compatibility

    // Headers
    let csv = `${t('REPORTS.TABLE.ITEM')}${d}${t('REPORTS.PDF.SERVICE_TAG')}${d}${t('REPORTS.PDF.SERIAL_NUMBER')}${d}${t('REPORTS.TABLE.CATEGORY')}${d}${t('REPORTS.PDF.WAREHOUSE')}${d}${t('REPORTS.CSV.ASSIGNED_TO')}${d}${t('REPORTS.PDF.EMAIL')}${d}${t('REPORTS.CSV.ASSIGNMENT_DATE')}${d}${t('REPORTS.CSV.ASSIGNMENT_STATUS')}\n`;

    // Data rows
    for (const item of uniqueItems) {
      const warehouse = warehouses.find(w => w.id === item.warehouseId);
      const assignedTo = item.assignedToUser?.name || '';
      const email = item.assignedToUser?.email || '';
      const assignedDate = item.assignedAt ? this.formatDate(item.assignedAt) : '';
      const assignmentStatus = item.assignedToUserId ? t('REPORTS.ASSIGNED') : t('REPORTS.UNASSIGNED');

      csv += `"${this.escapeCSV(item.name)}"${d}"${item.serviceTag || ''}"${d}"${item.serialNumber || ''}"${d}"${this.escapeCSV(item.category)}"${d}"${this.escapeCSV(warehouse?.name || '')}"${d}"${this.escapeCSV(assignedTo)}"${d}"${email}"${d}"${assignedDate}"${d}"${assignmentStatus}"\n`;
    }

    this.downloadCSV(csv, `asignaciones-${new Date().toISOString().split('T')[0]}.csv`);
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

  private escapeCSV(value: string): string {
    if (!value) return '';
    // Escape double quotes by doubling them
    return value.replace(/"/g, '""');
  }

  private formatDecimal(value: number): string {
    // Fix JavaScript floating point precision issues
    return (Math.round(value * 100) / 100).toFixed(2);
  }

  private downloadCSV(content: string, filename: string): void {
    // Add UTF-8 BOM for Excel to recognize encoding properly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
