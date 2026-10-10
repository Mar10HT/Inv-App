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

import { SaleService } from '../../services/sale.service';
import { WarehouseService } from '../../services/warehouse.service';
import { ClientService } from '../../services/client.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { FiscalConfigService } from '../../services/fiscal-config.service';
import {
  Sale,
  CustomerType,
  SaleStatus,
} from '../../interfaces/sale.interface';
import { ConfirmService } from '../../services/confirm.service';
import { SaleFormDialog, SaleFormResult } from './sale-form-dialog';
import { StatCard } from '../shared/stat-card/stat-card';
import { PaymentFormDialog, PaymentFormDocument } from '../payments/payment-form-dialog';

@Component({
  selector: 'app-sales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    NgClass,
    LucideAngularModule,
    TranslateModule,
    NgxPermissionsModule,
    SaleFormDialog,
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
              {{ (isReceivablesView ? 'ACCOUNTS_RECEIVABLE.TITLE' : 'SALES.TITLE') | translate }}
            </h1>
            <p class="text-[var(--color-on-surface-variant)] text-lg">
              {{ (isReceivablesView ? 'ACCOUNTS_RECEIVABLE.SUBTITLE' : 'SALES.SUBTITLE') | translate }}
            </p>
          </div>
          <div class="flex gap-2 self-start lg:self-auto">
            <ng-container *ngxPermissionsOnly="['sales:create']">
              <button (click)="openQuotationDialog()" class="ds-btn ds-btn--secondary">
                <lucide-icon name="FileText" class="shrink-0"></lucide-icon>
                <span>{{ 'SALES.NEW_QUOTATION' | translate }}</span>
              </button>
              <button (click)="openCreateDialog()" class="ds-btn ds-btn--primary">
                <lucide-icon name="Plus" class="shrink-0"></lucide-icon>
                <span>{{ 'SALES.NEW_SALE' | translate }}</span>
              </button>
            </ng-container>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <app-stat-card [label]="'SALES.STATS.ACTIVE' | translate" [value]="stats().active" icon="ShoppingCart"></app-stat-card>
          <app-stat-card [label]="'SALES.STATS.DRAFT' | translate" [value]="stats().draft" icon="FileText"></app-stat-card>
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
          <app-stat-card [label]="'SALES.STATS.CANCELLED' | translate" [value]="stats().cancelled" icon="Ban" tone="error"></app-stat-card>
          <app-stat-card [label]="'SALES.STATS.TOTAL' | translate" [value]="stats().total" icon="List"></app-stat-card>
        </div>

        <!-- Filters -->
        <div class="bg-surface-variant border border-theme rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <label for="sale-filter-warehouse" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'SALES.FILTER_WAREHOUSE' | translate }}
            </label>
            <select
              id="sale-filter-warehouse"
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
            <label for="sale-filter-status" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'SALES.FILTER_STATUS' | translate }}
            </label>
            <select
              id="sale-filter-status"
              [ngModel]="filterStatus()"
              (ngModelChange)="filterStatus.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm select-chevron"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              <option value="DRAFT">{{ 'SALES.STATUS.DRAFT' | translate }}</option>
              <option value="ACTIVE">{{ 'SALES.STATUS.ACTIVE' | translate }}</option>
              <option value="CANCELLED">{{ 'SALES.STATUS.CANCELLED' | translate }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label for="sale-filter-customer-type" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'SALES.FILTER_CUSTOMER_TYPE' | translate }}
            </label>
            <select
              id="sale-filter-customer-type"
              [ngModel]="filterCustomerType()"
              (ngModelChange)="filterCustomerType.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm select-chevron"
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
            <p class="text-[var(--color-on-surface-variant)]">{{ (isReceivablesView ? 'ACCOUNTS_RECEIVABLE.EMPTY' : 'SALES.EMPTY') | translate }}</p>
          </div>
        } @else {
          <!-- Table (desktop) -->
          <div class="hidden md:block bg-surface-variant border border-theme rounded-xl overflow-hidden">
            <table class="w-full">
              <thead class="bg-[var(--color-surface)] border-b border-theme">
                <tr class="text-left text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th class="px-4 py-3">{{ 'SALES.COL_NUMBER' | translate }}</th>
                  <th class="px-4 py-3">{{ 'SALES.COL_NAME' | translate }}</th>
                  <th class="px-4 py-3">{{ 'SALES.COL_WAREHOUSE' | translate }}</th>
                  <th class="px-4 py-3">{{ 'SALES.COL_CUSTOMER' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'SALES.COL_AMOUNT' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'SALES.COL_BALANCE' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'SALES.COL_ITEMS' | translate }}</th>
                  <th class="px-4 py-3">{{ 'SALES.COL_STATUS' | translate }}</th>
                  <th class="px-4 py-3">{{ 'SALES.COL_DATE' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'SALES.COL_ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (sale of filtered(); track sale.id) {
                  <tr class="border-t border-theme hover:bg-[var(--color-surface)] transition-colors">
                    <td class="px-4 py-3 font-mono text-sm text-[var(--color-on-surface-variant)]">
                      {{ sale.number || '—' }}
                    </td>
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
                      <div class="text-foreground">{{ customerLabel(sale) }}</div>
                      <span class="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-[var(--color-surface)] text-[var(--color-on-surface-variant)]">
                        {{ 'SALES.CUSTOMER_TYPE.' + sale.customerType | translate }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-foreground">
                      {{ formatMoney(sale.totalAmount, sale.currency) }}
                    </td>
                    <td class="px-4 py-3 text-right" [ngClass]="(sale.balance ?? 0) > 0 ? 'text-[var(--color-status-error)]' : 'text-[var(--color-on-surface-variant)]'">
                      {{ formatMoney(sale.balance ?? 0, sale.currency) }}
                    </td>
                    <td class="px-4 py-3 text-right text-foreground">
                      {{ totalQty(sale) }} ({{ sale.items.length }})
                    </td>
                    <td class="px-4 py-3">
                      <span [class]="getStatusClass(sale.status)" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium">
                        {{ getStatusLabel(sale.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-[var(--color-on-surface-variant)] text-sm">
                      {{ sale.createdAt | date:'medium' }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-2">
                        @switch (sale.status) {
                          @case (Status.DRAFT) {
                            <ng-container *ngxPermissionsOnly="['sales:create']">
                              <button
                                (click)="editSale(sale)"
                                [title]="'COMMON.EDIT' | translate"
                                class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface)] transition-colors"
                              >
                                <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                              </button>
                            </ng-container>
                            <ng-container *ngxPermissionsOnly="['sales:confirm']">
                              <button
                                (click)="confirmSale(sale)"
                                [disabled]="saleService.loading()"
                                [title]="'SALES.CONFIRM_SALE' | translate"
                                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-xs font-medium transition-colors"
                              >
                                <lucide-icon name="Check" class="!w-4 !h-4"></lucide-icon>
                                <span>{{ 'SALES.CONFIRM_SALE' | translate }}</span>
                              </button>
                            </ng-container>
                            <ng-container *ngxPermissionsOnly="['sales:create']">
                              <button
                                (click)="cancel(sale)"
                                [title]="'SALES.CANCEL_SALE' | translate"
                                class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors"
                              >
                                <lucide-icon name="Ban" class="!w-4 !h-4"></lucide-icon>
                              </button>
                            </ng-container>
                          }
                          @case (Status.ACTIVE) {
                            @if ((sale.balance ?? 0) > 0) {
                              <ng-container *ngxPermissionsOnly="['payments:create']">
                                <button
                                  (click)="openPaymentDialog(sale)"
                                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-medium transition-colors"
                                >
                                  <lucide-icon name="DollarSign" class="!w-4 !h-4"></lucide-icon>
                                  <span>{{ 'PAYMENTS.RECORD_PAYMENT' | translate }}</span>
                                </button>
                              </ng-container>
                            }
                            <button
                              (click)="downloadPdf(sale)"
                              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:text-foreground hover:border-[var(--color-primary)] text-xs font-medium transition-colors"
                            >
                              <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                              <span>{{ 'SALES.DOWNLOAD_PDF' | translate }}</span>
                            </button>
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
                          @default {
                            <button
                              (click)="downloadPdf(sale)"
                              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:text-foreground hover:border-[var(--color-primary)] text-xs font-medium transition-colors"
                            >
                              <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                              <span>{{ 'SALES.DOWNLOAD_PDF' | translate }}</span>
                            </button>
                          }
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
                      @if (sale.number) { · <span class="font-mono">{{ sale.number }}</span> }
                    </div>
                  </div>
                  <span [class]="getStatusClass(sale.status)" class="shrink-0 inline-flex items-center px-2 py-1 rounded text-xs font-medium">
                    {{ getStatusLabel(sale.status) }}
                  </span>
                </div>
                @if (sale.client || sale.customerName) {
                  <div class="text-sm text-foreground mb-1">{{ customerLabel(sale) }}</div>
                }
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-foreground">
                    {{ formatMoney(sale.totalAmount, sale.currency) }}
                  </span>
                  <span class="text-[var(--color-on-surface-variant)]">
                    {{ totalQty(sale) }} ({{ sale.items.length }} {{ 'SALES.COL_ITEMS' | translate }})
                  </span>
                </div>
                @if ((sale.balance ?? 0) > 0) {
                  <div class="flex items-center justify-between text-sm mt-1">
                    <span class="text-[var(--color-on-surface-variant)]">{{ 'SALES.COL_BALANCE' | translate }}</span>
                    <span class="font-medium text-[var(--color-status-error)]">{{ formatMoney(sale.balance ?? 0, sale.currency) }}</span>
                  </div>
                }
                <div class="text-[var(--color-on-surface-variant)] text-xs mt-1">
                  {{ sale.createdAt | date:'short' }}
                </div>
                <div class="flex items-center gap-2 mt-3">
                  @switch (sale.status) {
                    @case (Status.DRAFT) {
                      <ng-container *ngxPermissionsOnly="['sales:create']">
                        <button
                          (click)="editSale(sale)"
                          class="flex-1 py-2 rounded-lg bg-[var(--color-surface)] border border-theme text-sm text-foreground flex items-center justify-center gap-1"
                        >
                          <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                          {{ 'COMMON.EDIT' | translate }}
                        </button>
                      </ng-container>
                      <ng-container *ngxPermissionsOnly="['sales:confirm']">
                        <button
                          (click)="confirmSale(sale)"
                          [disabled]="saleService.loading()"
                          class="flex-1 py-2 rounded-lg bg-[var(--color-primary)] disabled:opacity-50 text-white text-sm flex items-center justify-center gap-1"
                        >
                          <lucide-icon name="Check" class="!w-4 !h-4"></lucide-icon>
                          {{ 'SALES.CONFIRM_SALE' | translate }}
                        </button>
                      </ng-container>
                      <ng-container *ngxPermissionsOnly="['sales:create']">
                        <button
                          (click)="cancel(sale)"
                          class="flex-1 py-2 rounded-lg bg-[var(--color-error-bg)] text-[var(--color-status-error)] text-sm flex items-center justify-center gap-1"
                        >
                          <lucide-icon name="Ban" class="!w-4 !h-4"></lucide-icon>
                          {{ 'SALES.CANCEL_SALE' | translate }}
                        </button>
                      </ng-container>
                    }
                    @case (Status.ACTIVE) {
                      @if ((sale.balance ?? 0) > 0) {
                        <ng-container *ngxPermissionsOnly="['payments:create']">
                          <button
                            (click)="openPaymentDialog(sale)"
                            class="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm flex items-center justify-center gap-1"
                          >
                            <lucide-icon name="DollarSign" class="!w-4 !h-4"></lucide-icon>
                            {{ 'PAYMENTS.RECORD_PAYMENT' | translate }}
                          </button>
                        </ng-container>
                      }
                      <button
                        (click)="downloadPdf(sale)"
                        class="flex-1 py-2 rounded-lg bg-[var(--color-surface)] border border-theme text-sm text-foreground flex items-center justify-center gap-1"
                      >
                        <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                        {{ 'SALES.DOWNLOAD_PDF' | translate }}
                      </button>
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
                    @default {
                      <button
                        (click)="downloadPdf(sale)"
                        class="flex-1 py-2 rounded-lg bg-[var(--color-surface)] border border-theme text-sm text-foreground flex items-center justify-center gap-1"
                      >
                        <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                        {{ 'SALES.DOWNLOAD_PDF' | translate }}
                      </button>
                    }
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
        [mode]="dialogMode()"
        [sale]="editingSale()"
        (closed)="closeFormDialog()"
        (created)="onCreated($event)"
      ></app-sale-form-dialog>
    }

    @if (showPaymentDialog() && payingSale()) {
      <app-payment-form-dialog
        [document]="toPaymentDocument(payingSale()!)"
        (closed)="closePaymentDialog()"
        (paymentRecorded)="onPaymentRecorded()"
      ></app-payment-form-dialog>
    }
  `,
})
export class SalesComponent implements OnInit {
  saleService = inject(SaleService);
  warehouseService = inject(WarehouseService);
  private clientService = inject(ClientService);
  private inventoryService = inject(InventoryService);
  private fiscalConfigService = inject(FiscalConfigService);
  private confirm = inject(ConfirmService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  readonly Status = SaleStatus;

  readonly isReceivablesView = !!this.route.snapshot.data['onlyWithBalance'];

  showFormDialog = signal(false);
  dialogMode = signal<'sale' | 'quotation'>('sale');
  editingSale = signal<Sale | null>(null);

  showPaymentDialog = signal(false);
  payingSale = signal<Sale | null>(null);

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
    const receivablesOnly = this.isReceivablesView;
    return list.filter((s) => {
      if (wh && s.warehouseId !== wh) return false;
      if (st && s.status !== st) return false;
      if (ct && s.customerType !== ct) return false;
      if (receivablesOnly && !(s.status === SaleStatus.ACTIVE && (s.balance ?? 0) > 0)) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.saleService.loadSales();
    this.warehouseService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err),
    });
    this.clientService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err),
    });
    this.fiscalConfigService.get().subscribe();
    this.inventoryService.loadItems();
  }

  openCreateDialog(): void {
    this.dialogMode.set('sale');
    this.editingSale.set(null);
    this.showFormDialog.set(true);
  }

  openQuotationDialog(): void {
    this.dialogMode.set('quotation');
    this.editingSale.set(null);
    this.showFormDialog.set(true);
  }

  editSale(sale: Sale): void {
    this.dialogMode.set('quotation');
    this.editingSale.set(sale);
    this.showFormDialog.set(true);
  }

  closeFormDialog(): void {
    this.showFormDialog.set(false);
    this.editingSale.set(null);
  }

  onCreated(result: SaleFormResult): void {
    if (result.success) {
      this.showFormDialog.set(false);
      this.editingSale.set(null);
      this.saleService.refresh();
    }
  }

  openPaymentDialog(sale: Sale): void {
    this.payingSale.set(sale);
    this.showPaymentDialog.set(true);
  }

  closePaymentDialog(): void {
    this.showPaymentDialog.set(false);
    this.payingSale.set(null);
  }

  onPaymentRecorded(): void {
    this.saleService.refresh();
  }

  toPaymentDocument(sale: Sale): PaymentFormDocument {
    return {
      id: sale.id,
      totalAmount: sale.totalAmount,
      taxAmount: sale.taxAmount,
      currency: sale.currency,
      documentType: 'sale',
    };
  }

  totalQty(sale: Sale): number {
    return sale.items.reduce((sum, it) => sum + it.quantity, 0);
  }

  // The linked Client (used for credit-limit tracking) is the authoritative
  // name when present; customerName is only the free-text fallback for a
  // walk-in sale with no client record.
  customerLabel(sale: Sale): string {
    return sale.client?.name || sale.customerName || '—';
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
    // A DRAFT never decremented stock, so cancelling one restores nothing —
    // different copy from cancelling a real, stock-decrementing ACTIVE sale.
    const isDraft = sale.status === SaleStatus.DRAFT;
    this.confirm
      .ask({
        title: this.translate.instant('SALES.CONFIRM_CANCEL_TITLE'),
        message: this.translate.instant(
          isDraft ? 'SALES.CONFIRM_CANCEL_DRAFT_MESSAGE' : 'SALES.CONFIRM_CANCEL_MESSAGE',
          { name: sale.name || sale.id.slice(0, 8) },
        ),
        confirmText: this.translate.instant('SALES.CANCEL_SALE'),
        type: 'warning',
      })
      .pipe(
        filter((confirmed) => !!confirmed),
        switchMap(() => this.saleService.cancel(sale.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result) {
          this.notifications.success(isDraft ? 'SALES.CANCEL_DRAFT_SUCCESS' : 'SALES.CANCEL_SUCCESS');
        }
      });
  }

  confirmSale(sale: Sale): void {
    this.confirm
      .ask({
        title: this.translate.instant('SALES.CONFIRM_CONFIRM_TITLE'),
        message: this.translate.instant('SALES.CONFIRM_CONFIRM_MESSAGE', {
          name: sale.name || sale.id.slice(0, 8),
        }),
        confirmText: this.translate.instant('SALES.CONFIRM_SALE'),
        type: 'warning',
      })
      .pipe(
        filter((confirmed) => !!confirmed),
        switchMap(() => this.saleService.confirm(sale.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result) {
          this.notifications.success('SALES.CONFIRM_SUCCESS');
        }
      });
  }

  getStatusLabel(status: SaleStatus): string {
    return this.translate.instant(`SALES.STATUS.${status}`);
  }

  getStatusClass(status: SaleStatus): string {
    const classes: Record<string, string> = {
      [SaleStatus.DRAFT]: 'bg-[var(--color-info-bg)] text-[var(--color-status-info)]',
      [SaleStatus.ACTIVE]: 'bg-[var(--color-success-bg)] text-[var(--color-status-success)]',
      [SaleStatus.CANCELLED]: 'bg-[var(--color-error-bg)] text-[var(--color-status-error)]',
    };
    return classes[status] || 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]';
  }
}
