import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { InventoryService } from '../../services/inventory/inventory.service';
import { InventoryItemInterface, InventoryStatus } from '../../interfaces/inventory-item.interface';
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
export class Dashboard {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  userName = 'Admin';

  // Reactive data from service
  items = computed(() => this.inventoryService.items().slice(0, 10)); // Show recent 10 items

  // Stats computed from items
  stats = computed(() => {
    const allItems = this.inventoryService.items();
    return allItems.reduce((acc, item) => {
      acc.total++;
      acc.totalValue += (item.price ?? 0) * item.quantity;
      if (item.status === InventoryStatus.IN_STOCK) acc.inStock++;
      else if (item.status === InventoryStatus.LOW_STOCK) acc.lowStock++;
      else if (item.status === InventoryStatus.OUT_OF_STOCK) acc.outOfStock++;
      return acc;
    }, { total: 0, inStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
  });

  // Loading and error states
  loading = computed(() => this.inventoryService.loading());
  error = computed(() => this.inventoryService.error());

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

  getStatusKey(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'INVENTORY.STATUS.IN_STOCK';
      case InventoryStatus.LOW_STOCK: return 'INVENTORY.STATUS.LOW_STOCK';
      case InventoryStatus.OUT_OF_STOCK: return 'INVENTORY.STATUS.OUT_OF_STOCK';
      default: return status;
    }
  }

  // Memoized date formatter
  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return this.dateFormatter.format(d);
  }

  trackByFn(index: number, item: InventoryItemInterface): string {
    return item.id;
  }
}
