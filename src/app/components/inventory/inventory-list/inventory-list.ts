import { Component, computed, signal, effect, OnInit, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Angular Material imports - only what's actually used
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InventoryService } from '.././../../services/inventory/inventory.service';
import { NotificationService } from '../../../services/notification.service';
import { InventoryItemInterface, InventoryStatus, ItemType } from '../../../interfaces/inventory-item.interface';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { InventoryItem } from '../inventory-item/inventory-item';
import { ImportDialog } from '../../import/import-dialog';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    LucideAngularModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  templateUrl: './inventory-list.html',
  styleUrl: './inventory-list.css'
})
export class InventoryList implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Expose enums to template
  InventoryStatus = InventoryStatus;
  ItemType = ItemType;

  // Data source for the table
  dataSource = new MatTableDataSource<InventoryItemInterface>([]);

  // Table columns
  displayedColumns: string[] = ['name', 'category', 'quantity', 'status', 'warehouse', 'updatedAt', 'actions'];

  // Filter signals
  searchQuery = signal('');
  selectedCategory = signal('all');
  selectedLocation = signal('all');
  selectedStatus = signal<string>('all');

  // Pagination signals
  pageIndex = signal(0);
  pageSize = signal(10);

  // Debounced search
  private searchSubject = new Subject<string>();

  // Computed values
  categories = computed(() => this.inventoryService.categories());
  locations = computed(() => this.inventoryService.locations());

  // Reactive filtered items with computed signal
  filteredItems = computed(() => {
    const search = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    const location = this.selectedLocation();
    const status = this.selectedStatus();
    const allItems = this.inventoryService.items();

    return allItems.filter(item => {
      const matchesSearch = !search ||
        item.name.toLowerCase().includes(search) ||
        (item.description?.toLowerCase().includes(search) ?? false) ||
        (item.model?.toLowerCase().includes(search) ?? false);

      const matchesCategory = category === 'all' || item.category === category;
      const matchesLocation = location === 'all' || item.warehouse?.name === location;
      const matchesStatus = status === 'all' || item.status === status;

      return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
    });
  });

  // Paginated items for display
  paginatedItems = computed(() => {
    const items = this.filteredItems();
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return items.slice(start, end);
  });

  // Total count for paginator
  totalItems = computed(() => this.filteredItems().length);

  // Single iteration for all stats
  stats = computed(() => {
    const items = this.filteredItems();

    return items.reduce((acc, item) => {
      acc.total++;
      if (item.status === InventoryStatus.IN_STOCK) acc.inStock++;
      else if (item.status === InventoryStatus.LOW_STOCK) acc.lowStock++;
      else if (item.status === InventoryStatus.OUT_OF_STOCK) acc.outOfStock++;
      return acc;
    }, { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
  });

  private inventoryService = inject(InventoryService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  constructor() {
    // Auto-sync filtered items with table data source and handle pagination
    effect(() => {
      const filteredData = this.filteredItems();
      this.dataSource.data = filteredData;

      // Adjust pagination if current page is out of bounds
      if (this.paginator) {
        const pageSize = this.paginator.pageSize;
        const maxPage = Math.ceil(filteredData.length / pageSize) - 1;
        const currentPage = this.paginator.pageIndex;

        if (currentPage > maxPage && maxPage >= 0) {
          // Go to last valid page
          this.paginator.pageIndex = maxPage;
        } else if (filteredData.length === 0) {
          // Reset to first page if no results
          this.paginator.pageIndex = 0;
        }
      }
    });
  }

  ngOnInit(): void {
    // Debounced search - waits 300ms after last keystroke
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchQuery.set(value);
      this.pageIndex.set(0);
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Custom sort for status
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'status':
          const statusOrder: Record<string, number> = {
            [InventoryStatus.OUT_OF_STOCK]: 0,
            [InventoryStatus.LOW_STOCK]: 1,
            [InventoryStatus.IN_STOCK]: 2
          };
          return statusOrder[item.status] ?? 0;
        case 'updatedAt':
          return new Date(item.updatedAt).getTime();
        case 'warehouse':
          return item.warehouse?.name ?? '';
        default:
          return (item as any)[property];
      }
    };
  }

  // Debounced search input
  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  // Filter change handlers
  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
    this.pageIndex.set(0);
  }

  onLocationChange(location: string): void {
    this.selectedLocation.set(location);
    this.pageIndex.set(0);
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(status);
    this.pageIndex.set(0);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.selectedLocation.set('all');
    this.selectedStatus.set('all');
    this.pageIndex.set(0);
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  // CRUD Operations
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
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.ITEM', item.name);
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.ITEM');
          }
        });
      }
    });
  }

  // Utility methods
  getStatusText(item: InventoryItemInterface): string {
    // For UNIQUE items, show "Available" or "Not Available"
    if (item.itemType === ItemType.UNIQUE) {
      return item.status === InventoryStatus.IN_STOCK
        ? this.translate.instant('INVENTORY.STATUS.AVAILABLE')
        : this.translate.instant('INVENTORY.STATUS.NOT_AVAILABLE');
    }
    // For BULK items, show translated status
    const statusKey = `INVENTORY.STATUS.${item.status.replace('_', '_')}`;
    return this.translate.instant(statusKey);
  }

  getStatusColor(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'primary';
      case InventoryStatus.LOW_STOCK: return 'accent';
      case InventoryStatus.OUT_OF_STOCK: return 'warn';
      default: return 'primary';
    }
  }

  getStatusIcon(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'check_circle';
      case InventoryStatus.LOW_STOCK: return 'warning';
      case InventoryStatus.OUT_OF_STOCK: return 'error';
      default: return 'help';
    }
  }

  // Memoized date formatter - created once, reused for all items
  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return this.dateFormatter.format(d);
  }

  // Add new item
  addNewItem(): void {
    this.router.navigate(['/inventory/add']);
  }

  // Open import dialog
  openImportDialog(): void {
    this.dialog.open(ImportDialog, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'import-dialog-container'
    });
  }

  // Export functionality
  exportData(): void {
    const data = this.dataSource.data;
    const csvContent = this.convertToCSV(data);
    this.downloadCSV(csvContent, `inventory-${new Date().toISOString().split('T')[0]}.csv`);
  }

  private convertToCSV(data: InventoryItemInterface[]): string {
    const d = ';'; // Semicolon delimiter for Excel compatibility
    const headers = [
      this.translate.instant('DASHBOARD.TABLE.ITEM'),
      this.translate.instant('ITEM_DETAIL.DESCRIPTION'),
      this.translate.instant('DASHBOARD.TABLE.QUANTITY'),
      this.translate.instant('DASHBOARD.TABLE.CATEGORY'),
      this.translate.instant('DASHBOARD.TABLE.WAREHOUSE'),
      this.translate.instant('DASHBOARD.TABLE.STATUS'),
      this.translate.instant('DASHBOARD.TABLE.LAST_UPDATED')
    ].join(d);

    const rows = data.map(item => [
      `"${item.name}"`,
      `"${item.description ?? ''}"`,
      item.quantity.toString(),
      `"${item.category}"`,
      `"${item.warehouse?.name ?? ''}"`,
      `"${this.getStatusText(item)}"`,
      `"${this.formatDate(item.updatedAt)}"`
    ].join(d));

    return [headers, ...rows].join('\n');
  }

  private downloadCSV(content: string, fileName: string): void {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  trackByFn(index: number, item: InventoryItemInterface): any {
    return item.id;
  }

}
