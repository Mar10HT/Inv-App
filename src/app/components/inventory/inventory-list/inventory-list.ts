import { Component, computed, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
  
  // Computed values
  categories = computed(() => this.inventoryService.categories());
  locations = computed(() => this.inventoryService.locations());
  
  // Stats
  totalItems = computed(() => this.inventoryService.getTotalItems());
  lowStockItems = computed(() => this.inventoryService.getLowStockItems().length);
  outOfStockItems = computed(() => this.inventoryService.getItemsByStatus('out-of-stock').length);
  inStockItems = computed(() => this.inventoryService.getItemsByStatus('in-stock').length);

  constructor(
    private inventoryService: InventoryService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupFilters();
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

  private loadData(): void {
    this.applyFilters();
  }

  private setupFilters(): void {
    // Watch for filter changes and reapply filters
    const updateFilters = () => {
      this.applyFilters();
    };

    // Set up reactive filters
    setInterval(() => {
      updateFilters();
    }, 100); // Simple polling for demo - in production use proper reactive patterns
  }

  applyFilters(): void {
    const filters = {
      search: this.searchQuery(),
      category: this.selectedCategory(),
      location: this.selectedLocation(),
      status: this.selectedStatus()
    };

    const filteredItems = this.inventoryService.getFilteredItems(filters);
    this.dataSource.data = filteredItems;
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.applyFilters();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
    this.applyFilters();
  }

  onLocationChange(location: string): void {
    this.selectedLocation.set(location);
    this.applyFilters();
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(status);
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.selectedLocation.set('all');
    this.selectedStatus.set('all');
    this.applyFilters();
  }

  // CRUD Operations
  viewItem(item: InventoryItemInterface): void {
    // Navigate to item detail view
    // Implementation depends on routing setup
    console.log('View item:', item);
  }

  editItem(item: InventoryItemInterface): void {
    // Navigate to edit form
    // Implementation depends on routing setup
    console.log('Edit item:', item);
  }

  deleteItem(item: InventoryItemInterface): void {
    const confirmed = confirm(`Are you sure you want to delete "${item.name}"?`);
    if (confirmed) {
      this.inventoryService.deleteItem(item.id);
      this.loadData();
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
    // Navigate to add form
    console.log('Add new item');
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
      this.loadData();
      this.snackBar.open('Data has been reset to default', 'Close', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
    }
  }
}
