import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { InventoryService } from '../../../services/inventory/inventory.service';
import { InventoryItemInterface, InventoryStatus, ItemType } from '../../../interfaces/inventory-item.interface';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

export interface InventoryItemDialogData {
  itemId: string;
}

@Component({
  selector: 'app-inventory-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './inventory-item.html',
  styleUrl: './inventory-item.css'
})
export class InventoryItem implements OnInit {
  private dialogRef = inject(MatDialogRef<InventoryItem>);
  private data: InventoryItemDialogData = inject(MAT_DIALOG_DATA);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Reactive state
  item = signal<InventoryItemInterface | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Expose enums to template
  InventoryStatus = InventoryStatus;
  ItemType = ItemType;

  ngOnInit(): void {
    if (this.data?.itemId) {
      this.loadItem(this.data.itemId);
    } else {
      this.error.set('Item ID not provided');
      this.loading.set(false);
    }
  }

  private loadItem(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.inventoryService.getItemById(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Error loading item');
        this.loading.set(false);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  editItem(): void {
    const item = this.item();
    if (item) {
      this.dialogRef.close();
      this.router.navigate(['/inventory/edit', item.id]);
    }
  }

  deleteItem(): void {
    const item = this.item();
    if (!item) return;

    const confirmDialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete Item',
        message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    confirmDialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.inventoryService.deleteItem(item.id).subscribe({
          next: () => {
            this.snackBar.open(`"${item.name}" has been deleted`, 'Close', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.dialogRef.close({ deleted: true });
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

  getStatusKey(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'INVENTORY.STATUS.IN_STOCK';
      case InventoryStatus.LOW_STOCK: return 'INVENTORY.STATUS.LOW_STOCK';
      case InventoryStatus.OUT_OF_STOCK: return 'INVENTORY.STATUS.OUT_OF_STOCK';
      default: return status;
    }
  }

  getItemTypeKey(type: ItemType): string {
    switch (type) {
      case ItemType.UNIQUE: return 'ITEM_DETAIL.TYPE.UNIQUE';
      case ItemType.BULK: return 'ITEM_DETAIL.TYPE.BULK';
      default: return type;
    }
  }

  // Memoized date formatter
  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return this.dateFormatter.format(d);
  }

  formatCurrency(price: number | undefined, currency: string): string {
    if (price === undefined || price === null) return '-';
    const symbol = currency === 'HNL' ? 'L' : '$';
    return `${symbol}${price.toFixed(2)}`;
  }
}
