import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { SupplierService } from '../../services/supplier.service';
import { Supplier } from '../../interfaces/supplier.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { SupplierFormDialog } from './supplier-form-dialog';

@Component({
  selector: 'app-suppliers',
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
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.css'
})
export class Suppliers implements OnInit {
  private supplierService = inject(SupplierService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  suppliers = computed(() => this.supplierService.suppliers());
  loading = computed(() => this.supplierService.loading());
  error = computed(() => this.supplierService.error());

  stats = computed(() => {
    const all = this.suppliers();
    return {
      total: all.length
    };
  });

  ngOnInit(): void {
    this.loadSuppliers();
  }

  private loadSuppliers(): void {
    this.supplierService.getAll().subscribe();
  }

  addSupplier(): void {
    const dialogRef = this.dialog.open(SupplierFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.snackBar.open('Supplier created successfully', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      }
    });
  }

  editSupplier(supplier: Supplier): void {
    const dialogRef = this.dialog.open(SupplierFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: { mode: 'edit', supplier }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.snackBar.open('Supplier updated successfully', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      }
    });
  }

  deleteSupplier(supplier: Supplier): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete Supplier',
        message: `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.supplierService.delete(supplier.id).subscribe({
          next: () => {
            this.snackBar.open(`"${supplier.name}" has been deleted`, 'Close', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
          },
          error: (err) => {
            this.snackBar.open(`Error deleting supplier: ${err.message}`, 'Close', {
              duration: 5000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }

  trackByFn(index: number, supplier: Supplier): string {
    return supplier.id;
  }
}
