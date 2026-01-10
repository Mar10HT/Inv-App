import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { WarehouseService } from '../../services/warehouse.service';
import { Warehouse } from '../../interfaces/warehouse.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { WarehouseFormDialog } from './warehouse-form-dialog';

@Component({
  selector: 'app-warehouses',
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
  templateUrl: './warehouses.html',
  styleUrl: './warehouses.css'
})
export class Warehouses implements OnInit {
  private warehouseService = inject(WarehouseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  warehouses = computed(() => this.warehouseService.warehouses());
  loading = computed(() => this.warehouseService.loading());
  error = computed(() => this.warehouseService.error());

  // Stats
  stats = computed(() => {
    const all = this.warehouses();
    return {
      total: all.length
    };
  });

  ngOnInit(): void {
    this.loadWarehouses();
  }

  private loadWarehouses(): void {
    this.warehouseService.getAll().subscribe();
  }

  addWarehouse(): void {
    const dialogRef = this.dialog.open(WarehouseFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.snackBar.open('Warehouse created successfully', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      }
    });
  }

  editWarehouse(warehouse: Warehouse): void {
    const dialogRef = this.dialog.open(WarehouseFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: { mode: 'edit', warehouse }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.snackBar.open('Warehouse updated successfully', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      }
    });
  }

  deleteWarehouse(warehouse: Warehouse): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete Warehouse',
        message: `Are you sure you want to delete "${warehouse.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.warehouseService.delete(warehouse.id).subscribe({
          next: () => {
            this.snackBar.open(`"${warehouse.name}" has been deleted`, 'Close', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
          },
          error: (err) => {
            this.snackBar.open(`Error deleting warehouse: ${err.message}`, 'Close', {
              duration: 5000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
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

  trackByFn(index: number, warehouse: Warehouse): string {
    return warehouse.id;
  }
}
