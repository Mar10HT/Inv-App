import { Component, computed, signal, effect, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Angular Material imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { InventoryService } from '.././../../services/inventory/inventory.service';
import { InventoryItemInterface } from '../../../interfaces/inventory-item.interface';

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
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatBadgeModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './inventory-list.html',
  styleUrl: './inventory-list.css'
})
export class InventoryList implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data source for the table
  dataSource = new MatTableDataSource<InventoryItemInterface>([]);
  
  // Table columns
  displayedColumns: string[] = ['name', 'category', 'quantity', 'status', 'location', 'lastUpdated', 'actions'];
  
  // Filter signals
  searchQuery = signal('');
  selectedCategory = signal('all');
  selectedLocation = signal('all');
  selectedStatus = signal('all');

  // Debounced search
  private searchSubject = new Subject<string>();

  // Computed values
  categories = computed(() => this.inventoryService.categories());
  locations = computed(() => this.inventoryService.locations());

  // ✅ OPTIMIZED: Reactive filtered items with computed signal
  filteredItems = computed(() => {
    const search = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    const location = this.selectedLocation();
    const status = this.selectedStatus();
    const allItems = this.inventoryService.items();

    return allItems.filter(item => {
      const matchesSearch = !search ||
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search);

      const matchesCategory = category === 'all' || item.category === category;
      const matchesLocation = location === 'all' || item.location === location;
      const matchesStatus = status === 'all' || item.status === status;

      return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
    });
  });

  // ✅ OPTIMIZED: Single iteration for all stats (O(n) instead of O(4n))
  stats = computed(() => {
    const items = this.filteredItems();

    return items.reduce((acc, item) => {
      acc.total++;
      if (item.status === 'in-stock') acc.inStock++;
      else if (item.status === 'low-stock') acc.lowStock++;
      else if (item.status === 'out-of-stock') acc.outOfStock++;
      return acc;
    }, { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
  });

  constructor(
    private inventoryService: InventoryService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    // ✅ OPTIMIZED: Auto-sync filtered items with table data source
    effect(() => {
      this.dataSource.data = this.filteredItems();
    });
  }

  ngOnInit(): void {
    // ✅ OPTIMIZED: Debounced search - waits 300ms after last keystroke
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchQuery.set(value);
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Custom sort for status
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'status':
          const statusOrder = { 'out-of-stock': 0, 'low-stock': 1, 'in-stock': 2 };
          return statusOrder[item.status];
        case 'lastUpdated':
          return item.lastUpdated.getTime();
        default:
          return (item as any)[property];
      }
    };
  }

  // ✅ OPTIMIZED: Debounced search input
  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  // ✅ OPTIMIZED: No need to call applyFilters() - computed signal handles it reactively
  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
  }

  onLocationChange(location: string): void {
    this.selectedLocation.set(location);
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(status);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.selectedLocation.set('all');
    this.selectedStatus.set('all');
  }

  // CRUD Operations
  viewItem(item: InventoryItemInterface): void {
    // Navigate to item detail view
    // Implementation depends on routing setup
    // TODO: Implement navigation
  }

  editItem(item: InventoryItemInterface): void {
    // Navigate to edit form
    // Implementation depends on routing setup
    // TODO: Implement navigation
  }

  deleteItem(item: InventoryItemInterface): void {
    const confirmed = confirm(`Are you sure you want to delete "${item.name}"?`);
    if (confirmed) {
      this.inventoryService.deleteItem(item.id);
      // ✅ OPTIMIZED: No need to call loadData() - signal updates automatically
      this.snackBar.open(`"${item.name}" has been deleted`, 'Close', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
    }
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'in-stock': return 'primary';
      case 'low-stock': return 'accent';
      case 'out-of-stock': return 'warn';
      default: return 'primary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'in-stock': return 'check_circle';
      case 'low-stock': return 'warning';
      case 'out-of-stock': return 'error';
      default: return 'help';
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  // Add new item
  addNewItem(): void {
    this.router.navigate(['/inventory/add']);
  }

  // Export functionality (bonus)
  exportData(): void {
    const data = this.dataSource.data;
    const csvContent = this.convertToCSV(data);
    this.downloadCSV(csvContent, 'inventory-data.csv');
  }

  private convertToCSV(data: InventoryItemInterface[]): string {
    const headers = ['Name', 'Description', 'Quantity', 'Category', 'Location', 'Status', 'Last Updated'];
    const csvData = data.map(item => [
      item.name,
      item.description,
      item.quantity.toString(),
      item.category,
      item.location,
      item.status,
      this.formatDate(item.lastUpdated)
    ]);

    return [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  private downloadCSV(content: string, fileName: string): void {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Add this method to your InventoryList component class
trackByFn(index: number, item: InventoryItemInterface): any {
  return item.id; // or whatever unique identifier your items have
}


  // Reset data (for testing)
  resetData(): void {
    const confirmed = confirm('Are you sure you want to reset all data to default?');
    if (confirmed) {
      this.inventoryService.resetToMockData();
      // ✅ OPTIMIZED: No need to call loadData() - signal updates automatically
      this.snackBar.open('Data has been reset to default', 'Close', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
    }
  }
}
