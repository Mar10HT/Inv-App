import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { SupplierService } from '../../services/supplier.service';
import { NotificationService } from '../../services/notification.service';
import { Supplier } from '../../interfaces/supplier.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { SupplierFormDialog, buildSupplierDialogData } from './supplier-form-dialog';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule,
    NgxPermissionsModule
  ],
  templateUrl: './suppliers.html'
})
export class Suppliers implements OnInit {
  private supplierService = inject(SupplierService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

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
    this.supplierService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
  }

  addSupplier(): void {
    const dialogRef = this.dialog.open(SupplierFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildSupplierDialogData(
        'add',
        (data) => this.supplierService.create(data),
        (id, data) => this.supplierService.update(id, data),
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.created('NOTIFICATIONS.ENTITIES.SUPPLIER', result.name);
      }
    });
  }

  editSupplier(supplier: Supplier): void {
    const dialogRef = this.dialog.open(SupplierFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildSupplierDialogData(
        'edit',
        (data) => this.supplierService.create(data),
        (id, data) => this.supplierService.update(id, data),
        supplier,
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.updated('NOTIFICATIONS.ENTITIES.SUPPLIER', result.name);
      }
    });
  }

  deleteSupplier(supplier: Supplier): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('SUPPLIER.DELETE_CONFIRM.TITLE'),
        message: this.translate.instant('SUPPLIER.DELETE_CONFIRM.MESSAGE', { name: supplier.name }),
        confirmText: this.translate.instant('COMMON.DELETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.supplierService.delete(supplier.id).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.SUPPLIER', supplier.name);
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.SUPPLIER');
          }
        });
      }
    });
  }

  trackByFn(index: number, supplier: Supplier): string {
    return supplier.id;
  }
}
