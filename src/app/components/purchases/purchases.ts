import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs/operators';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { PurchaseInvoiceService } from '../../services/purchase-invoice.service';
import { WarehouseService } from '../../services/warehouse.service';
import { SupplierService } from '../../services/supplier.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { FiscalConfigService } from '../../services/fiscal-config.service';
import {
  PurchaseInvoice,
  PurchaseInvoiceStatus,
} from '../../interfaces/purchase-invoice.interface';
import { ItemType } from '../../interfaces/inventory-item.interface';
import { ConfirmService } from '../../services/confirm.service';
import {
  PurchaseInvoiceFormDialog,
  PurchaseInvoiceFormResult,
} from './purchase-invoice-form-dialog';
import { StatCard } from '../shared/stat-card/stat-card';
import { PaymentFormDialog, PaymentFormDocument } from '../payments/payment-form-dialog';

@Component({
  selector: 'app-purchases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    NgClass,
    LucideAngularModule,
    TranslateModule,
    NgxPermissionsModule,
    PurchaseInvoiceFormDialog,
    PaymentFormDialog,
    StatCard,
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 class="text-4xl font-bold text-foreground mb-2">
              {{ (isPayablesView ? 'ACCOUNTS_PAYABLE.TITLE' : 'PURCHASES.TITLE') | translate }}
            </h1>
            <p class="text-[var(--color-on-surface-variant)] text-lg">
              {{ (isPayablesView ? 'ACCOUNTS_PAYABLE.SUBTITLE' : 'PURCHASES.SUBTITLE') | translate }}
            </p>
          </div>
          <ng-container *ngxPermissionsOnly="['purchases:create']">
            <button (click)="openCreateDialog()" class="ds-btn ds-btn--primary self-start lg:self-auto">
              <lucide-icon name="Plus" class="shrink-0"></lucide-icon>
              <span>{{ 'PURCHASES.NEW_PURCHASE' | translate }}</span>
            </button>
          </ng-container>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <app-stat-card [label]="'PURCHASES.STATS.ACTIVE' | translate" [value]="stats().active" icon="PackagePlus"></app-stat-card>
          <app-stat-card [label]="'PURCHASES.STATS.CANCELLED' | translate" [value]="stats().cancelled" icon="Ban" tone="error"></app-stat-card>
          <app-stat-card [label]="'PURCHASES.STATS.TOTAL' | translate" [value]="stats().total" icon="List"></app-stat-card>
        </div>

        <!-- Filters -->
        <div class="bg-surface-variant border border-theme rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <label for="purchase-filter-warehouse" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'PURCHASES.FILTER_WAREHOUSE' | translate }}
            </label>
            <select
              id="purchase-filter-warehouse"
              [ngModel]="filterWarehouseId()"
              (ngModelChange)="filterWarehouseId.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm select-chevron"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (w of warehouseService.warehouses(); track w.id) {
                <option [value]="w.id">{{ w.name }}</option>
              }
            </select>
          </div>
          <div class="flex-1">
            <label for="purchase-filter-status" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'PURCHASES.FILTER_STATUS' | translate }}
            </label>
            <select
              id="purchase-filter-status"
              [ngModel]="filterStatus()"
              (ngModelChange)="filterStatus.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm select-chevron"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              <option value="ACTIVE">{{ 'PURCHASES.STATUS.ACTIVE' | translate }}</option>
              <option value="CANCELLED">{{ 'PURCHASES.STATUS.CANCELLED' | translate }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label for="purchase-filter-supplier" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'PURCHASES.FILTER_SUPPLIER' | translate }}
            </label>
            <select
              id="purchase-filter-supplier"
              [ngModel]="filterSupplierId()"
              (ngModelChange)="filterSupplierId.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm select-chevron"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (s of supplierService.suppliers(); track s.id) {
                <option [value]="s.id">{{ s.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Loading / Empty -->
        @if (purchaseInvoiceService.loading() && purchaseInvoices().length === 0) {
          <div class="bg-surface-variant border border-theme rounded-xl p-12 text-center">
            <p class="text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}…</p>
          </div>
        } @else if (filtered().length === 0) {
          <div class="bg-surface-variant border border-theme rounded-xl p-12 text-center">
            <lucide-icon name="PackagePlus" class="!w-12 !h-12 mx-auto mb-3 text-[var(--color-on-surface-muted)]"></lucide-icon>
            <p class="text-[var(--color-on-surface-variant)]">{{ (isPayablesView ? 'ACCOUNTS_PAYABLE.EMPTY' : 'PURCHASES.EMPTY') | translate }}</p>
          </div>
        } @else {
          <!-- Table (desktop) -->
          <div class="hidden md:block bg-surface-variant border border-theme rounded-xl overflow-hidden">
            <table class="w-full">
              <thead class="bg-[var(--color-surface)] border-b border-theme">
                <tr class="text-left text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th class="px-4 py-3">{{ 'PURCHASES.COL_NUMBER' | translate }}</th>
                  <th class="px-4 py-3">{{ 'PURCHASES.COL_SUPPLIER' | translate }}</th>
                  <th class="px-4 py-3">{{ 'PURCHASES.COL_INVOICE_NUMBER' | translate }}</th>
                  <th class="px-4 py-3">{{ 'PURCHASES.COL_WAREHOUSE' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'PURCHASES.COL_ITEMS' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'PURCHASES.COL_BALANCE' | translate }}</th>
                  <th class="px-4 py-3">{{ 'PURCHASES.COL_STATUS' | translate }}</th>
                  <th class="px-4 py-3">{{ 'PURCHASES.COL_DATE' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'PURCHASES.COL_ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (purchase of filtered(); track purchase.id) {
                  <tr class="border-t border-theme hover:bg-[var(--color-surface)] transition-colors">
                    <td class="px-4 py-3 text-foreground font-mono text-sm">{{ purchase.number }}</td>
                    <td class="px-4 py-3 text-foreground">{{ purchase.supplier?.name || '—' }}</td>
                    <td class="px-4 py-3 text-[var(--color-on-surface-variant)]">{{ purchase.invoiceNumber }}</td>
                    <td class="px-4 py-3 text-[var(--color-on-surface-variant)]">
                      {{ purchase.warehouse?.name || '—' }}
                    </td>
                    <td class="px-4 py-3 text-right text-foreground">
                      {{ purchase.items.length }}
                    </td>
                    <td class="px-4 py-3 text-right" [ngClass]="(purchase.balance ?? 0) > 0 ? 'text-[var(--color-status-error)]' : 'text-[var(--color-on-surface-variant)]'">
                      {{ formatMoney(purchase.balance ?? 0, purchase.currency) }}
                    </td>
                    <td class="px-4 py-3">
                      @if (purchase.status === 'ACTIVE') {
                        <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-status-success)]">
                          {{ 'PURCHASES.STATUS.ACTIVE' | translate }}
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-error-bg)] text-[var(--color-status-error)]">
                          {{ 'PURCHASES.STATUS.CANCELLED' | translate }}
                        </span>
                      }
                    </td>
                    <td class="px-4 py-3 text-[var(--color-on-surface-variant)] text-sm">
                      {{ purchase.createdAt | date:'medium' }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-2">
                        @if (purchase.status === 'ACTIVE' && (purchase.balance ?? 0) > 0) {
                          <ng-container *ngxPermissionsOnly="['payments:create']">
                            <button
                              (click)="openPaymentDialog(purchase)"
                              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-medium transition-colors"
                            >
                              <lucide-icon name="DollarSign" class="!w-4 !h-4"></lucide-icon>
                              <span>{{ 'PAYMENTS.RECORD_PAYMENT' | translate }}</span>
                            </button>
                          </ng-container>
                        }
                        <button
                          (click)="downloadPdf(purchase)"
                          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:text-foreground hover:border-[var(--color-primary)] text-xs font-medium transition-colors"
                        >
                          <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                          <span>{{ 'PURCHASES.DOWNLOAD_PDF' | translate }}</span>
                        </button>
                        @if (purchase.status === 'ACTIVE') {
                          <ng-container *ngxPermissionsOnly="['purchases:cancel']">
                            <button
                              (click)="cancel(purchase)"
                              [disabled]="hasUniqueLine(purchase)"
                              [title]="(hasUniqueLine(purchase) ? 'PURCHASES.CANNOT_CANCEL_UNIQUE' : 'PURCHASES.CANCEL_PURCHASE') | translate"
                              class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[var(--color-on-surface-variant)] disabled:hover:bg-transparent"
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
            @for (purchase of filtered(); track purchase.id) {
              <div class="bg-surface-variant border border-theme rounded-xl p-4">
                <div class="flex items-start justify-between gap-3 mb-2">
                  <div class="min-w-0">
                    <div class="font-medium text-foreground truncate font-mono text-sm">
                      {{ purchase.number }}
                    </div>
                    <div class="text-xs text-[var(--color-on-surface-variant)]">
                      {{ purchase.supplier?.name }} · {{ purchase.warehouse?.name }}
                    </div>
                  </div>
                  @if (purchase.status === 'ACTIVE') {
                    <span class="shrink-0 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-status-success)]">
                      {{ 'PURCHASES.STATUS.ACTIVE' | translate }}
                    </span>
                  } @else {
                    <span class="shrink-0 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-error-bg)] text-[var(--color-status-error)]">
                      {{ 'PURCHASES.STATUS.CANCELLED' | translate }}
                    </span>
                  }
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-[var(--color-on-surface-variant)]">
                    {{ purchase.items.length }} {{ 'PURCHASES.COL_ITEMS' | translate }}
                  </span>
                  <span class="text-[var(--color-on-surface-variant)] text-xs">
                    {{ purchase.createdAt | date:'short' }}
                  </span>
                </div>
                @if ((purchase.balance ?? 0) > 0) {
                  <div class="flex items-center justify-between text-sm mt-1">
                    <span class="text-[var(--color-on-surface-variant)]">{{ 'PURCHASES.COL_BALANCE' | translate }}</span>
                    <span class="font-medium text-[var(--color-status-error)]">{{ formatMoney(purchase.balance ?? 0, purchase.currency) }}</span>
                  </div>
                }
                <div class="flex items-center gap-2 mt-3">
                  @if (purchase.status === 'ACTIVE' && (purchase.balance ?? 0) > 0) {
                    <ng-container *ngxPermissionsOnly="['payments:create']">
                      <button
                        (click)="openPaymentDialog(purchase)"
                        class="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm flex items-center justify-center gap-1"
                      >
                        <lucide-icon name="DollarSign" class="!w-4 !h-4"></lucide-icon>
                        {{ 'PAYMENTS.RECORD_PAYMENT' | translate }}
                      </button>
                    </ng-container>
                  }
                  <button
                    (click)="downloadPdf(purchase)"
                    class="flex-1 py-2 rounded-lg bg-[var(--color-surface)] border border-theme text-sm text-foreground flex items-center justify-center gap-1"
                  >
                    <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                    {{ 'PURCHASES.DOWNLOAD_PDF' | translate }}
                  </button>
                  @if (purchase.status === 'ACTIVE') {
                    <ng-container *ngxPermissionsOnly="['purchases:cancel']">
                      <button
                        (click)="cancel(purchase)"
                        [disabled]="hasUniqueLine(purchase)"
                        [title]="(hasUniqueLine(purchase) ? 'PURCHASES.CANNOT_CANCEL_UNIQUE' : 'PURCHASES.CANCEL_PURCHASE') | translate"
                        class="flex-1 py-2 rounded-lg bg-[var(--color-error-bg)] text-[var(--color-status-error)] text-sm flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <lucide-icon name="Ban" class="!w-4 !h-4"></lucide-icon>
                        {{ 'PURCHASES.CANCEL_PURCHASE' | translate }}
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
      <app-purchase-invoice-form-dialog
        (closed)="closeFormDialog()"
        (created)="onCreated($event)"
      ></app-purchase-invoice-form-dialog>
    }

    @if (showPaymentDialog() && payingPurchase()) {
      <app-payment-form-dialog
        [document]="toPaymentDocument(payingPurchase()!)"
        (closed)="closePaymentDialog()"
        (paymentRecorded)="onPaymentRecorded()"
      ></app-payment-form-dialog>
    }
  `,
})
export class PurchasesComponent implements OnInit {
  purchaseInvoiceService = inject(PurchaseInvoiceService);
  warehouseService = inject(WarehouseService);
  supplierService = inject(SupplierService);
  private inventoryService = inject(InventoryService);
  private fiscalConfigService = inject(FiscalConfigService);
  private confirm = inject(ConfirmService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  readonly isPayablesView = !!this.route.snapshot.data['onlyWithBalance'];

  showFormDialog = signal(false);

  showPaymentDialog = signal(false);
  payingPurchase = signal<PurchaseInvoice | null>(null);

  filterWarehouseId = signal('');
  filterStatus = signal<'' | PurchaseInvoiceStatus>('');
  filterSupplierId = signal('');

  purchaseInvoices = computed(() => this.purchaseInvoiceService.purchaseInvoices());
  stats = computed(() => this.purchaseInvoiceService.stats());

  filtered = computed(() => {
    const list = this.purchaseInvoices();
    const wh = this.filterWarehouseId();
    const st = this.filterStatus();
    const sup = this.filterSupplierId();
    const payablesOnly = this.isPayablesView;
    return list.filter((p) => {
      if (wh && p.warehouseId !== wh) return false;
      if (st && p.status !== st) return false;
      if (sup && p.supplierId !== sup) return false;
      if (payablesOnly && !(p.status === PurchaseInvoiceStatus.ACTIVE && (p.balance ?? 0) > 0)) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.purchaseInvoiceService.loadPurchaseInvoices();
    this.warehouseService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err),
    });
    this.supplierService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err),
    });
    this.fiscalConfigService.get().subscribe();
    this.inventoryService.loadItems();
  }

  openCreateDialog(): void {
    this.showFormDialog.set(true);
  }

  closeFormDialog(): void {
    this.showFormDialog.set(false);
  }

  onCreated(result: PurchaseInvoiceFormResult): void {
    if (result.success) {
      this.showFormDialog.set(false);
      this.purchaseInvoiceService.refresh();
    }
  }

  downloadPdf(purchase: PurchaseInvoice): void {
    this.purchaseInvoiceService.downloadPdf(purchase.id);
  }

  formatMoney(amount: number, currency: string): string {
    return `${currency} ${(amount ?? 0).toFixed(2)}`;
  }

  openPaymentDialog(purchase: PurchaseInvoice): void {
    this.payingPurchase.set(purchase);
    this.showPaymentDialog.set(true);
  }

  closePaymentDialog(): void {
    this.showPaymentDialog.set(false);
    this.payingPurchase.set(null);
  }

  onPaymentRecorded(): void {
    this.purchaseInvoiceService.refresh();
  }

  toPaymentDocument(purchase: PurchaseInvoice): PaymentFormDocument {
    return {
      id: purchase.id,
      totalAmount: purchase.totalAmount,
      taxAmount: purchase.taxAmount,
      currency: purchase.currency,
      documentType: 'purchase',
    };
  }

  hasUniqueLine(purchase: PurchaseInvoice): boolean {
    return purchase.items.some((item) => item.inventoryItem?.itemType === ItemType.UNIQUE);
  }

  cancel(purchase: PurchaseInvoice): void {
    if (this.hasUniqueLine(purchase)) {
      this.notifications.error('PURCHASES.CANNOT_CANCEL_UNIQUE');
      return;
    }

    this.confirm
      .ask({
        title: this.translate.instant('PURCHASES.CONFIRM_CANCEL_TITLE'),
        message: this.translate.instant('PURCHASES.CONFIRM_CANCEL_MESSAGE', {
          number: purchase.number,
        }),
        confirmText: this.translate.instant('PURCHASES.CANCEL_PURCHASE'),
        type: 'warning',
      })
      .pipe(
        filter((confirmed) => !!confirmed),
        switchMap(() => this.purchaseInvoiceService.cancel(purchase.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result) {
          this.notifications.success('PURCHASES.CANCEL_SUCCESS');
        }
      });
  }
}
