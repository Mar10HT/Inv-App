import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { WarehouseService } from '../../services/warehouse.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import {
  Warehouse,
  CreateWarehouseDto,
  UpdateWarehouseDto,
} from '../../interfaces/warehouse.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { WarehouseFormDialog, buildWarehouseDialogData } from './warehouse-form-dialog';

function normalizeManagerId<T extends { managerId?: string | null }>(payload: T): T {
  if (payload && 'managerId' in payload && (payload.managerId === undefined || payload.managerId === '')) {
    return { ...payload, managerId: null };
  }
  return payload;
}

@Component({
  selector: 'app-warehouses',
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
  template: `
<div class="min-h-screen bg-surface p-6">
  <div class="max-w-[1400px] mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'WAREHOUSE.TITLE' | translate }}</h1>
          <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'WAREHOUSE.SUBTITLE' | translate }}</p>
        </div>
        <ng-container *ngxPermissionsOnly="['warehouse:create']">
          <button
            (click)="addWarehouse()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium">
            <lucide-icon name="Plus" class="!w-5 !h-5"></lucide-icon>
            {{ 'WAREHOUSE.ADD' | translate }}
          </button>
        </ng-container>
      </div>
    </div>

    <!-- Stats Card -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'WAREHOUSE.TOTAL' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().total }}</p>
          </div>
          <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Warehouse" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    @if (loading()) {
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        <span class="ml-3 text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}...</span>
      </div>
    }

    <!-- Error State -->
    @if (error()) {
      <div class="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-xl p-4 mb-6">
        <div class="flex items-center gap-3">
          <lucide-icon name="Info" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
          <span class="text-[var(--color-status-error)]">{{ error() }}</span>
        </div>
      </div>
    }

    <!-- Warehouses Table -->
    <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
      <div class="px-6 py-4 border-b border-theme">
        <h2 class="text-xl font-semibold text-foreground">{{ 'WAREHOUSE.LIST' | translate }}</h2>
      </div>

      @if (warehouses().length === 0 && !loading()) {
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center py-16">
          <lucide-icon name="Warehouse" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
          <p class="text-[var(--color-on-surface-variant)] text-lg mb-2">{{ 'WAREHOUSE.NO_WAREHOUSES' | translate }}</p>
          <p class="text-[var(--color-on-surface-muted)] text-sm mb-6">{{ 'WAREHOUSE.NO_WAREHOUSES_DESC' | translate }}</p>
          <ng-container *ngxPermissionsOnly="['warehouse:create']">
            <button
              (click)="addWarehouse()"
              class="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-hover)] transition-all font-medium">
              {{ 'WAREHOUSE.ADD' | translate }}
            </button>
          </ng-container>
        </div>
      } @else {
        <!-- Desktop Table View -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full" [attr.aria-label]="'WAREHOUSE.TITLE' | translate">
            <thead>
              <tr class="bg-[var(--color-surface)]">
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[200px]">{{ 'WAREHOUSE.NAME' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[200px]">{{ 'WAREHOUSE.LOCATION' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'WAREHOUSE.MANAGER' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'WAREHOUSE.DESCRIPTION' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-subtle)]">
              @for (warehouse of warehouses(); track trackByFn($index, warehouse)) {
                <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                  <!-- Name Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-[var(--color-primary-container)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <lucide-icon name="Warehouse" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                      </div>
                      <div>
                        <p class="font-medium text-foreground">{{ warehouse.name }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Location Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2 text-[var(--color-on-surface-variant)]">
                      <lucide-icon name="MapPin" class="!w-3.5 !h-3.5 !text-[var(--color-on-surface-variant)]"></lucide-icon>
                      <span>{{ warehouse.location }}</span>
                    </div>
                  </td>

                  <!-- Manager Column -->
                  <td class="px-6 py-4">
                    @if (warehouse.manager) {
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 bg-[var(--color-primary-container)] rounded-full flex items-center justify-center flex-shrink-0">
                          <span class="text-[var(--color-primary)] text-xs font-medium">{{ warehouse.manager.name.charAt(0).toUpperCase() || '?' }}</span>
                        </div>
                        <span class="text-sm text-[var(--color-on-surface)]">{{ warehouse.manager.name }}</span>
                      </div>
                    } @else {
                      <span class="text-[var(--color-on-surface-muted)] text-sm">{{ 'WAREHOUSE.NO_MANAGER' | translate }}</span>
                    }
                  </td>

                  <!-- Description Column -->
                  <td class="px-6 py-4">
                    <span class="text-[var(--color-on-surface-variant)] text-sm">{{ warehouse.description || '-' }}</span>
                  </td>

                  <!-- Actions Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-1">
                      <ng-container *ngxPermissionsOnly="['warehouse:edit']">
                        <button
                          type="button"
                          (click)="editWarehouse(warehouse)"
                          [attr.aria-label]="'COMMON.EDIT' | translate"
                          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center justify-center">
                          <lucide-icon name="Pencil" class="!w-5 !h-5"></lucide-icon>
                        </button>
                      </ng-container>
                      <ng-container *ngxPermissionsOnly="['warehouse:delete']">
                        <button
                          type="button"
                          (click)="deleteWarehouse(warehouse)"
                          [attr.aria-label]="'COMMON.DELETE' | translate"
                          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors flex items-center justify-center">
                          <lucide-icon name="Trash2" class="!w-5 !h-5"></lucide-icon>
                        </button>
                      </ng-container>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View - GRID 2 COLUMNS -->
        <div class="lg:hidden p-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (warehouse of warehouses(); track trackByFn($index, warehouse)) {
              <div class="bg-[var(--color-surface)] border border-theme rounded-xl p-3 hover:border-[var(--color-border)] transition-colors">
                <!-- Icon -->
                <div class="w-8 h-8 bg-[var(--color-primary-container)] rounded-lg flex items-center justify-center mb-2">
                  <lucide-icon name="Warehouse" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                </div>

                <!-- Warehouse Info -->
                <h3 class="font-semibold text-foreground text-sm mb-1 truncate">{{ warehouse.name }}</h3>
                <div class="flex items-center gap-1 text-[var(--color-on-surface-variant)] text-xs truncate mb-2">
                  <lucide-icon name="MapPin" class="!w-3 !h-3 flex-shrink-0"></lucide-icon>
                  <span class="truncate">{{ warehouse.location }}</span>
                </div>

                @if (warehouse.manager) {
                  <div class="flex items-center gap-1.5 text-[var(--color-on-surface-variant)] text-xs mb-2">
                    <lucide-icon name="User" class="!w-3 !h-3 flex-shrink-0"></lucide-icon>
                    <span class="truncate">{{ warehouse.manager.name }}</span>
                  </div>
                }

                @if (warehouse.description) {
                  <p class="text-[var(--color-on-surface-muted)] text-xs line-clamp-2 mb-2">{{ warehouse.description }}</p>
                }

                <!-- Actions -->
                <div class="flex justify-end gap-1 pt-2 border-t border-[var(--color-border-subtle)]">
                  <ng-container *ngxPermissionsOnly="['warehouse:edit']">
                    <button
                      type="button"
                      (click)="editWarehouse(warehouse)"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
                      <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </ng-container>
                  <ng-container *ngxPermissionsOnly="['warehouse:delete']">
                    <button
                      type="button"
                      (click)="deleteWarehouse(warehouse)"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors">
                      <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </ng-container>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  </div>
</div>
  `,
})
export class Warehouses implements OnInit {
  private warehouseService = inject(WarehouseService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

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
    this.loadUsers();
  }

  private loadWarehouses(): void {
    this.warehouseService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
  }

  private loadUsers(): void {
    this.userService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
  }

  addWarehouse(): void {
    const dialogRef = this.dialog.open(WarehouseFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildWarehouseDialogData(
        'add',
        (data: CreateWarehouseDto) => this.warehouseService.create(normalizeManagerId(data)),
        (id, data: UpdateWarehouseDto) => this.warehouseService.update(id, normalizeManagerId(data)),
        this.userService.users(),
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.created('NOTIFICATIONS.ENTITIES.WAREHOUSE', result.name);
      }
    });
  }

  editWarehouse(warehouse: Warehouse): void {
    const dialogRef = this.dialog.open(WarehouseFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildWarehouseDialogData(
        'edit',
        (data: CreateWarehouseDto) => this.warehouseService.create(normalizeManagerId(data)),
        (id, data: UpdateWarehouseDto) => this.warehouseService.update(id, normalizeManagerId(data)),
        this.userService.users(),
        warehouse,
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.updated('NOTIFICATIONS.ENTITIES.WAREHOUSE', result.name);
      }
    });
  }

  deleteWarehouse(warehouse: Warehouse): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('WAREHOUSE.DELETE_CONFIRM.TITLE'),
        message: this.translate.instant('WAREHOUSE.DELETE_CONFIRM.MESSAGE', { name: warehouse.name }),
        confirmText: this.translate.instant('COMMON.DELETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.warehouseService.delete(warehouse.id).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.WAREHOUSE', warehouse.name);
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.WAREHOUSE');
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
