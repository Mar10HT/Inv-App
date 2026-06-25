import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { SaleService } from '../../services/sale.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import {
  Sale,
  CustomerType,
  SaleStatus,
} from '../../interfaces/sale.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { SaleFormDialog, SaleFormResult } from './sale-form-dialog';

@Component({
  selector: 'app-sales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    LucideAngularModule,
    MatDialogModule,
    TranslateModule,
    NgxPermissionsModule,
    SaleFormDialog,
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 class="text-4xl font-bold text-foreground mb-2">
              {{ 'SALES.TITLE' | translate }}
            </h1>
            <p class="text-[var(--color-on-surface-variant)] text-lg">
              {{ 'SALES.SUBTITLE' | translate }}
            </p>
          </div>
          <ng-container *ngxPermissionsOnly="['sales:create']">
            <button (click)="openCreateDialog()" class="ds-btn ds-btn--primary self-start lg:self-auto">
              <lucide-icon name="Plus" class="shrink-0"></lucide-icon>
              <span>{{ 'SALES.NEW_SALE' | translate }}</span>
            </button>
          </ng-container>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">
                  {{ 'SALES.STATS.ACTIVE' | translate }}
                </p>
                <p class="text-2xl font-bold text-foreground">{{ stats().active }}</p>
              </div>
              <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
                <lucide-icon name="ShoppingCart" class="!w-5 !h-5 !text-[var(--color-on-surface-variant)]"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">
                  {{ 'SALES.STATS.REVENUE' | translate }}
                </p>
                <p class="text-lg font-bold text-[var(--color-status-success)]">{{ revenueLabel() }}</p>
              </div>
              <div class="bg-[var(--color-success-bg)] p-3 rounded-lg">
                <lucide-icon name="DollarSign" class="!w-5 !h-5 !text-[var(--color-status-success)]"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">
                  {{ 'SALES.STATS.CANCELLED' | translate }}
                </p>
                <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ stats().cancelled }}</p>
              </div>
              <div class="bg-[var(--color-error-bg)] p-3 rounded-lg">
                <lucide-icon name="Ban" class="!w-5 !h-5 !text-[var(--color-status-error)]"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">
                  {{ 'SALES.STATS.TOTAL' | translate }}
                </p>
                <p class="text-2xl font-bold text-foreground">{{ stats().total }}</p>
              </div>
              <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
                <lucide-icon name="List" class="!w-5 !h-5 !text-[var(--color-on-surface-variant)]"></lucide-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-surface-variant border border-theme rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <label class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'SALES.FILTER_WAREHOUSE' | translate }}
            </label>
            <select
              [ngModel]="filterWarehouseId()"
              (ngModelChange)="filterWarehouseId.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (w of warehouseService.warehouses(); track w.id) {
                <option [value]="w.id">{{ w.name }}</option>
              }
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'SALES.FILTER_STATUS' | translate }}
            </label>
            <select
              [ngModel]="filterStatus()"
              (ngModelChange)="filterStatus.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              <option value="ACTIVE">{{ 'SALES.STATUS.ACTIVE' | translate }}</option>
              <option value="CANCELLED">{{ 'SALES.STATUS.CANCELLED' | translate }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'SALES.FILTER_CUSTOMER_TYPE' | translate }}
            </label>
            <select
              [ngModel]="filterCustomerType()"
              (ngModelChange)="filterCustomerType.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (c of customerTypeKeys; track c) {
                <option [value]="c">{{ 'SALES.CUSTOMER_TYPE.' + c | translate }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Loading / Empty -->
        @if (saleService.loading() && sales().length === 0) {
          <div class="bg-surface-variant border border-theme rounded-xl p-12 text-center">
            <p class="text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}…</p>
          </div>
        } @else if (filtered().length === 0) {
          <div class="bg-surface-variant border border-theme rounded-xl p-12 text-center">
            <lucide-icon name="ShoppingCart" class="!w-12 !h-12 mx-auto mb-3 text-[var(--color-on-surface-muted)]"></lucide-icon>
            <p class="text-[var(--color-on-surface-variant)]">{{ 'SALES.EMPTY' | translate }}</p>
          </div>
        } @else {
          <!-- Table (desktop) -->
          <div class="hidden md:block bg-surface-variant border border-theme rounded-xl overflow-hidden">
            <table class="w-full">
              <thead class="bg-[var(--color-surface)] border-b border-theme">
                <tr class="text-left text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th class="px-4 py-3">{{ 'SALES.COL_NAME' | translate }}</th>
                  <th class="px-4 py-3">{{ 'SALES.COL_WAREHOUSE' | translate }}</th>
                  <th class="px-4 py-3">{{ 'SALES.COL_CUSTOMER' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'SALES.COL_AMOUNT' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'SALES.COL_ITEMS' | translate }}</th>
                  <th class="px-4 py-3">{{ 'SALES.COL_STATUS' | translate }}</th>
                  <th class="px-4 py-3">{{ 'SALES.COL_DATE' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'SALES.COL_ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (sale of filtered(); track sale.id) {
                  <tr class="border-t border-theme hover:bg-[var(--color-surface)] transition-colors">
                    <td class="px-4 py-3 text-foreground">
                      <div class="font-medium">{{ sale.name || ('SALES.UNNAMED' | translate) }}</div>
                      @if (sale.notes) {
                        <div class="text-xs text-[var(--color-on-surface-variant)] truncate max-w-xs" [title]="sale.notes">
                          {{ sale.notes }}
                        </div>
                      }
                    </td>
                    <td class="px-4 py-3 text-[var(--color-on-surface-variant)]">
                      {{ sale.warehouse?.name || '—' }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="text-foreground">{{ sale.customerName || '—' }}</div>
                      <span class="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-[var(--color-surface)] text-[var(--color-on-surface-variant)]">
                        {{ 'SALES.CUSTOMER_TYPE.' + sale.customerType | translate }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-foreground">
                      {{ formatMoney(sale.totalAmount, sale.currency) }}
                    </td>
                    <td class="px-4 py-3 text-right text-foreground">
                      {{ totalQty(sale) }} ({{ sale.items.length }})
                    </td>
                    <td class="px-4 py-3">
                      @if (sale.status === 'ACTIVE') {
                        <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-status-success)]">
                          {{ 'SALES.STATUS.ACTIVE' | translate }}
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-error-bg)] text-[var(--color-status-error)]">
                          {{ 'SALES.STATUS.CANCELLED' | translate }}
                        </span>
                      }
                    </td>
                    <td class="px-4 py-3 text-[var(--color-on-surface-variant)] text-sm">
                      {{ sale.createdAt | date:'medium' }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-2">
                        <button
                          (click)="downloadPdf(sale)"
                          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:text-foreground hover:border-[var(--color-primary)] text-xs font-medium transition-colors"
                        >
                          <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                          <span>{{ 'SALES.DOWNLOAD_PDF' | translate }}</span>
                        </button>
                        @if (sale.status === 'ACTIVE') {
                          <ng-container *ngxPermissionsOnly="['sales:cancel']">
                            <button
                              (click)="cancel(sale)"
                              [title]="'SALES.CANCEL_SALE' | translate"
                              class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors"
                            >
                              <lucide-icon name="Ban" class="!w-4 !h-4"></lucide-icon>
                            </button>
                          </ng-container>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Cards (mobile) -->
          <div class="md:hidden space-y-3">
            @for (sale of filtered(); track sale.id) {
              <div class="bg-surface-variant border border-theme rounded-xl p-4">
                <div class="flex items-start justify-between gap-3 mb-2">
                  <div class="min-w-0">
                    <div class="font-medium text-foreground truncate">
                      {{ sale.name || ('SALES.UNNAMED' | translate) }}
                    </div>
                    <div class="text-xs text-[var(--color-on-surface-variant)]">
                      {{ sale.warehouse?.name }} · {{ 'SALES.CUSTOMER_TYPE.' + sale.customerType | translate }}
                    </div>
                  </div>
                  @if (sale.status === 'ACTIVE') {
                    <span class="shrink-0 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-status-success)]">
                      {{ 'SALES.STATUS.ACTIVE' | translate }}
                    </span>
                  } @else {
                    <span class="shrink-0 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-error-bg)] text-[var(--color-status-error)]">
                      {{ 'SALES.STATUS.CANCELLED' | translate }}
                    </span>
                  }
                </div>
                @if (sale.customerName) {
                  <div class="text-sm text-foreground mb-1">{{ sale.customerName }}</div>
                }
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-foreground">
                    {{ formatMoney(sale.totalAmount, sale.currency) }}
                  </span>
                  <span class="text-[var(--color-on-surface-variant)]">
                    {{ totalQty(sale) }} ({{ sale.items.length }} {{ 'SALES.COL_ITEMS' | translate }})
                  </span>
                </div>
                <div class="text-[var(--color-on-surface-variant)] text-xs mt-1">
                  {{ sale.createdAt | date:'short' }}
                </div>
                <div class="flex items-center gap-2 mt-3">
                  <button
                    (click)="downloadPdf(sale)"
                    class="flex-1 py-2 rounded-lg bg-[var(--color-surface)] border border-theme text-sm text-foreground flex items-center justify-center gap-1"
                  >
                    <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                    {{ 'SALES.DOWNLOAD_PDF' | translate }}
                  </button>
                  @if (sale.status === 'ACTIVE') {
                    <ng-container *ngxPermissionsOnly="['sales:cancel']">
                      <button
                        (click)="cancel(sale)"
                        class="flex-1 py-2 rounded-lg bg-[var(--color-error-bg)] text-[var(--color-status-error)] text-sm flex items-center justify-center gap-1"
                      >
                        <lucide-icon name="Ban" class="!w-4 !h-4"></lucide-icon>
                        {{ 'SALES.CANCEL_SALE' | translate }}
                      </button>
                    </ng-container>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    @if (showFormDialog()) {
      <app-sale-form-dialog
        (closed)="closeFormDialog()"
        (created)="onCreated($event)"
      ></app-sale-form-dialog>
    }
  `,
})
export class SalesComponent implements OnInit {
  saleService = inject(SaleService);
  warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  showFormDialog = signal(false);

  filterWarehouseId = signal('');
  filterStatus = signal<'' | SaleStatus>('');
  filterCustomerType = signal<'' | CustomerType>('');

  readonly customerTypeKeys = [
    CustomerType.WHOLESALE,
    CustomerType.DISTRIBUTOR,
    CustomerType.RETAIL,
  ];

  sales = computed(() => this.saleService.sales());
  stats = computed(() => this.saleService.stats());

  filtered = computed(() => {
    const list = this.sales();
    const wh = this.filterWarehouseId();
    const st = this.filterStatus();
    const ct = this.filterCustomerType();
    return list.filter((s) => {
      if (wh && s.warehouseId !== wh) return false;
      if (st && s.status !== st) return false;
      if (ct && s.customerType !== ct) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.saleService.loadSales();
    this.warehouseService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err),
    });
    this.inventoryService.loadItems();
  }

  openCreateDialog(): void {
    this.showFormDialog.set(true);
  }

  closeFormDialog(): void {
    this.showFormDialog.set(false);
  }

  onCreated(result: SaleFormResult): void {
    if (result.success) {
      this.showFormDialog.set(false);
      this.saleService.refresh();
    }
  }

  totalQty(sale: Sale): number {
    return sale.items.reduce((sum, it) => sum + it.quantity, 0);
  }

  formatMoney(amount: number, currency: string): string {
    return `${currency} ${(amount ?? 0).toFixed(2)}`;
  }

  revenueLabel(): string {
    const rev = this.stats().revenueByCurrency;
    const entries = Object.entries(rev);
    if (entries.length === 0) return '—';
    return entries
      .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
      .join(' · ');
  }

  downloadPdf(sale: Sale): void {
    this.saleService.downloadPdf(sale.id);
  }

  cancel(sale: Sale): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('SALES.CONFIRM_CANCEL_TITLE'),
        message: this.translate.instant('SALES.CONFIRM_CANCEL_MESSAGE', {
          name: sale.name || sale.id.slice(0, 8),
        }),
        confirmText: this.translate.instant('SALES.CANCEL_SALE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'warning',
      },
      panelClass: 'confirm-dialog-container',
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((confirmed) => !!confirmed),
        switchMap(() => this.saleService.cancel(sale.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          if (result) {
            this.notifications.success(
              this.translate.instant('SALES.CANCEL_SUCCESS'),
            );
          }
        },
        error: () => {
          this.notifications.error(this.translate.instant('SALES.CANCEL_ERROR'));
        },
      });
  }
}
