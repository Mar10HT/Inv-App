import { Component, ChangeDetectionStrategy, computed, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { InventoryService } from '../../services/inventory/inventory.service';
import { DashboardService, DashboardStats, CategoryStats, WarehouseStats, StatusStats } from '../../services/dashboard.service';
import { TransactionService } from '../../services/transaction.service';
import { InventoryItemInterface, InventoryStatus } from '../../interfaces/inventory-item.interface';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { InventoryItem } from '../inventory/inventory-item/inventory-item';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private inventoryService = inject(InventoryService);
  private dashboardService = inject(DashboardService);
  private transactionService = inject(TransactionService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  userName = 'Admin';

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

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.loading.set(true);

    // Load all dashboard data in parallel
    this.dashboardService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => this.error.set(err.message)
    });

    this.dashboardService.getItemsByCategory().subscribe({
      next: (data) => this.categoryStats.set(data),
      error: () => {}
    });

    this.dashboardService.getItemsByWarehouse().subscribe({
      next: (data) => this.warehouseStats.set(data),
      error: () => {}
    });

    this.dashboardService.getItemsByStatus().subscribe({
      next: (data) => this.statusStats.set(data),
      error: () => {}
    });

    this.dashboardService.getLowStockItems(5).subscribe({
      next: (data) => this.lowStockItems.set(data),
      error: () => {}
    });

    this.transactionService.getRecent(5).subscribe({
      next: (data) => {
        this.recentTransactions.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
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
      case TransactionType.IN: return 'arrow_downward';
      case TransactionType.OUT: return 'arrow_upward';
      case TransactionType.TRANSFER: return 'swap_horiz';
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
    const stat = this.statusStats().find(s => s.status === status);
    return stat ? Math.round((stat.count / total) * 100) : 0;
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
    return cat.category;
  }

  trackByWarehouse(index: number, wh: WarehouseStats): string {
    return wh.id;
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
