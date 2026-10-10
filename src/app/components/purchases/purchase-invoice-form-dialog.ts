import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

import { PurchaseInvoiceService } from '../../services/purchase-invoice.service';
import { WarehouseService } from '../../services/warehouse.service';
import { SupplierService } from '../../services/supplier.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { FiscalConfigService } from '../../services/fiscal-config.service';
import { ItemType } from '../../interfaces/inventory-item.interface';
import {
  CreatePurchaseInvoiceDto,
  CreatePurchaseInvoiceItemDto,
  PaymentCondition,
} from '../../interfaces/purchase-invoice.interface';

interface PurchaseItemEntry {
  kind: ItemType;
  // BULK fields
  inventoryItemId: string;
  quantity: number;
  // UNIQUE fields
  name: string;
  category: string;
  model: string;
  serviceTag: string;
  serialNumber: string;
  // Common
  unitPrice: number;
  taxPercent?: number;
  notes: string;
}

export interface PurchaseInvoiceFormResult {
  success: boolean;
}

const CURRENCIES = ['USD', 'HNL'];
const PAYMENT_CONDITIONS: PaymentCondition[] = [
  PaymentCondition.CASH,
  PaymentCondition.CREDIT,
];

const emptyItem = (): PurchaseItemEntry => ({
  kind: ItemType.BULK,
  inventoryItemId: '',
  quantity: 1,
  name: '',
  category: '',
  model: '',
  serviceTag: '',
  serialNumber: '',
  unitPrice: 0,
  notes: '',
});

@Component({
  selector: 'app-purchase-invoice-form-dialog',
  standalone: true,
  imports: [NgClass, FormsModule, A11yModule, LucideAngularModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div class="absolute inset-0 bg-black/50" role="presentation" (click)="close()"></div>
      <div
        #dialogEl
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-form-dialog-title"
        tabindex="-1"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
        class="relative bg-surface-variant border border-theme rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <div class="px-6 py-4 border-b border-theme">
          <h2 id="purchase-form-dialog-title" class="text-xl font-semibold text-foreground">
            {{ 'PURCHASES.NEW_PURCHASE' | translate }}
          </h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">
            {{ 'PURCHASES.NEW_PURCHASE_DESC' | translate }}
          </p>
        </div>

        <div class="p-6 space-y-4">
          <!-- Supplier -->
          <div>
            <label for="purchase-supplier" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'PURCHASES.SUPPLIER' | translate }} *
            </label>
            <select
              id="purchase-supplier"
              [ngModel]="supplierId()"
              (ngModelChange)="supplierId.set($event)"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">{{ 'PURCHASES.SELECT_SUPPLIER' | translate }}</option>
              @for (supplier of suppliers(); track supplier.id) {
                <option [value]="supplier.id">{{ supplier.name }}</option>
              }
            </select>
          </div>

          <!-- Supplier invoice number -->
          <div>
            <label for="purchase-invoice-number" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'PURCHASES.INVOICE_NUMBER' | translate }} *
            </label>
            <input
              id="purchase-invoice-number"
              type="text"
              [ngModel]="invoiceNumber()"
              (ngModelChange)="invoiceNumber.set($event)"
              maxlength="100"
              [placeholder]="'PURCHASES.INVOICE_NUMBER_PLACEHOLDER' | translate"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          <!-- Warehouse -->
          <div>
            <label for="purchase-warehouse" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'PURCHASES.WAREHOUSE' | translate }} *
            </label>
            <select
              id="purchase-warehouse"
              [ngModel]="warehouseId()"
              (ngModelChange)="onWarehouseChange($event)"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">{{ 'PURCHASES.SELECT_WAREHOUSE' | translate }}</option>
              @for (warehouse of warehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
              }
            </select>
          </div>

          <!-- Currency + Payment condition -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="purchase-currency" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
                {{ 'PURCHASES.CURRENCY' | translate }} *
              </label>
              <select
                id="purchase-currency"
                [ngModel]="currency()"
                (ngModelChange)="currency.set($event)"
                class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                @for (cur of currencies; track cur) {
                  <option [value]="cur">{{ cur }}</option>
                }
              </select>
            </div>
            <div>
              <label for="purchase-payment-condition" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
                {{ 'PURCHASES.PAYMENT_CONDITION' | translate }}
              </label>
              <select
                id="purchase-payment-condition"
                [ngModel]="paymentCondition()"
                (ngModelChange)="paymentCondition.set($event)"
                class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                @for (pc of paymentConditions; track pc) {
                  <option [value]="pc">{{ 'PURCHASES.PAYMENT_CONDITIONS.' + pc | translate }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Tax percent (invoice-level default; a line can override it) -->
          <div>
            <label for="purchase-tax-percent" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'PURCHASES.TAX_PERCENT' | translate }}
            </label>
            <input
              id="purchase-tax-percent"
              type="number"
              [ngModel]="taxPercent()"
              (ngModelChange)="taxPercent.set($event === '' ? undefined : $event)"
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          <!-- Notes -->
          <div>
            <label for="purchase-notes" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'PURCHASES.NOTES' | translate }}
            </label>
            <textarea
              id="purchase-notes"
              [ngModel]="notes()"
              (ngModelChange)="notes.set($event)"
              rows="2"
              [placeholder]="'PURCHASES.NOTES_PLACEHOLDER' | translate"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
            ></textarea>
          </div>

          <!-- Items -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-[var(--color-on-surface-variant)]">
                {{ 'TRANSACTION.ITEMS' | translate }} *
              </span>
              <button
                type="button"
                (click)="addItem()"
                class="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1"
              >
                <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
                {{ 'TRANSACTION.ADD_ITEM' | translate }}
              </button>
            </div>

            <div class="space-y-3">
              @for (item of items(); track $index; let i = $index) {
                <div class="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg p-4">
                  <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0 space-y-3">
                      <!-- Kind toggle -->
                      <div class="flex gap-1 bg-[var(--color-surface-variant)] rounded-lg p-0.5">
                        <button
                          type="button"
                          (click)="updateItemKind(i, ItemType.BULK)"
                          class="flex-1 rounded-md py-1.5 text-xs font-medium transition-colors"
                          [ngClass]="item.kind === ItemType.BULK
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-on-surface-variant)]'"
                        >
                          {{ 'PURCHASES.ITEM_KIND.BULK' | translate }}
                        </button>
                        <button
                          type="button"
                          (click)="updateItemKind(i, ItemType.UNIQUE)"
                          class="flex-1 rounded-md py-1.5 text-xs font-medium transition-colors"
                          [ngClass]="item.kind === ItemType.UNIQUE
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-on-surface-variant)]'"
                        >
                          {{ 'PURCHASES.ITEM_KIND.UNIQUE' | translate }}
                        </button>
                      </div>

                      @if (item.kind === ItemType.BULK) {
                        <select
                          [ngModel]="item.inventoryItemId"
                          (ngModelChange)="updateItemField(i, 'inventoryItemId', $event)"
                          class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
                        >
                          <option value="">{{ 'PURCHASES.SELECT_ITEM' | translate }}</option>
                          @for (invItem of availableBulkItems(); track invItem.id) {
                            <option
                              [value]="invItem.id"
                              [disabled]="isAlreadySelected(invItem.id, i)"
                            >
                              {{ invItem.name }} ({{ invItem.quantity }})
                            </option>
                          }
                        </select>
                        <div class="flex gap-3">
                          <input
                            type="number"
                            [ngModel]="item.quantity"
                            (ngModelChange)="updateItemField(i, 'quantity', $event || 1)"
                            min="1"
                            class="w-24 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            [placeholder]="'TRANSACTION.QTY_PLACEHOLDER' | translate"
                          />
                          <input
                            type="number"
                            [ngModel]="item.unitPrice"
                            (ngModelChange)="updateItemField(i, 'unitPrice', $event || 0)"
                            min="0"
                            step="0.01"
                            class="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            [placeholder]="'PURCHASES.UNIT_PRICE' | translate"
                          />
                        </div>
                      } @else {
                        <input
                          type="text"
                          [ngModel]="item.name"
                          (ngModelChange)="updateItemField(i, 'name', $event)"
                          maxlength="255"
                          class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          [placeholder]="'PURCHASES.NAME_PLACEHOLDER' | translate"
                        />
                        <div class="flex gap-3">
                          <input
                            type="text"
                            [ngModel]="item.category"
                            (ngModelChange)="updateItemField(i, 'category', $event)"
                            class="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            [placeholder]="'PURCHASES.CATEGORY_PLACEHOLDER' | translate"
                          />
                          <input
                            type="text"
                            [ngModel]="item.model"
                            (ngModelChange)="updateItemField(i, 'model', $event)"
                            class="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            [placeholder]="'PURCHASES.MODEL' | translate"
                          />
                        </div>
                        <div class="flex gap-3">
                          <input
                            type="text"
                            [ngModel]="item.serviceTag"
                            (ngModelChange)="updateItemField(i, 'serviceTag', $event)"
                            maxlength="100"
                            class="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            [placeholder]="'PURCHASES.SERVICE_TAG' | translate"
                          />
                          <input
                            type="text"
                            [ngModel]="item.serialNumber"
                            (ngModelChange)="updateItemField(i, 'serialNumber', $event)"
                            maxlength="100"
                            class="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            [placeholder]="'PURCHASES.SERIAL_NUMBER' | translate"
                          />
                        </div>
                        <input
                          type="number"
                          [ngModel]="item.unitPrice"
                          (ngModelChange)="updateItemField(i, 'unitPrice', $event || 0)"
                          min="0"
                          step="0.01"
                          class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          [placeholder]="'PURCHASES.UNIT_PRICE' | translate"
                        />
                      }
                    </div>
                    <button
                      type="button"
                      (click)="removeItem(i)"
                      aria-label="Remove item"
                      class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors"
                    >
                      <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </div>
                </div>
              }
            </div>

            @if (items().length === 0) {
              <p class="text-[var(--color-on-surface-variant)] text-sm text-center py-4">
                {{ 'TRANSACTION.NO_ITEMS' | translate }}
              </p>
            }
          </div>
        </div>

        <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
          <button
            (click)="close()"
            class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors"
          >
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            (click)="submit()"
            [disabled]="!canSubmit() || submitting()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-surface-elevated)] disabled:text-[var(--color-on-surface-variant)] text-white px-6 py-2 rounded-lg transition-all"
          >
            {{ 'PURCHASES.CREATE' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PurchaseInvoiceFormDialog implements AfterViewInit, OnInit {
  private purchaseInvoiceService = inject(PurchaseInvoiceService);
  private warehouseService = inject(WarehouseService);
  private supplierService = inject(SupplierService);
  private inventoryService = inject(InventoryService);
  private notifications = inject(NotificationService);
  private fiscalConfigService = inject(FiscalConfigService);

  private dialogEl = viewChild<ElementRef<HTMLElement>>('dialogEl');

  closed = output<void>();
  created = output<PurchaseInvoiceFormResult>();

  ngOnInit(): void {
    // Suggested default from Fiscal Config's ISV% — always editable, never
    // forced (same contract as Sale.taxPercent; purchase invoices have no
    // edit mode, so this always applies).
    this.taxPercent.set(this.fiscalConfigService.config()?.isvPercent);
  }

  ngAfterViewInit(): void {
    // cdkTrapFocusAutoCapture handles initial focus, but ensure the dialog
    // container itself absorbs focus if nothing inside it is focusable yet.
    queueMicrotask(() => this.dialogEl()?.nativeElement.focus());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  readonly ItemType = ItemType;
  readonly currencies = CURRENCIES;
  readonly paymentConditions = PAYMENT_CONDITIONS;

  supplierId = signal('');
  invoiceNumber = signal('');
  warehouseId = signal('');
  currency = signal('USD');
  paymentCondition = signal<PaymentCondition>(PaymentCondition.CASH);
  taxPercent = signal<number | undefined>(undefined);
  notes = signal('');
  items = signal<PurchaseItemEntry[]>([]);
  submitting = signal(false);

  warehouses = computed(() => this.warehouseService.warehouses());
  suppliers = computed(() => this.supplierService.suppliers());

  // Purchases ADD stock, so unlike Outflows/Sales there is no quantity cap —
  // but only BULK items make sense as a top-up target (a UNIQUE item's
  // quantity must stay exactly 1).
  availableBulkItems = computed(() => {
    const wh = this.warehouseId();
    if (!wh) return [];
    return this.inventoryService
      .items()
      .filter((item) => item.warehouseId === wh && item.itemType === ItemType.BULK);
  });

  canSubmit = computed(() => {
    if (!this.supplierId() || !this.invoiceNumber().trim() || !this.warehouseId()) {
      return false;
    }
    const list = this.items();
    if (list.length === 0) return false;

    const bulkIds = list
      .filter((it) => it.kind === ItemType.BULK)
      .map((it) => it.inventoryItemId);
    if (new Set(bulkIds).size !== bulkIds.length) return false;

    const serviceTags = list
      .filter((it) => it.kind === ItemType.UNIQUE)
      .map((it) => it.serviceTag.trim());
    if (new Set(serviceTags).size !== serviceTags.length) return false;

    return list.every((it) => {
      if (Number(it.unitPrice) < 0) return false;
      if (it.kind === ItemType.BULK) {
        return !!it.inventoryItemId && Number.isFinite(it.quantity) && it.quantity > 0;
      }
      return !!it.name.trim() && !!it.category.trim() && !!it.serviceTag.trim();
    });
  });

  close(): void {
    this.closed.emit();
  }

  onWarehouseChange(id: string): void {
    this.warehouseId.set(id);
    // Clear items because BULK selections were scoped to the previous warehouse
    this.items.set([]);
  }

  addItem(): void {
    this.items.update((list) => [...list, emptyItem()]);
  }

  updateItemKind(index: number, kind: ItemType): void {
    this.items.update((list) => {
      const next = [...list];
      next[index] = { ...next[index], kind };
      return next;
    });
  }

  updateItemField<K extends keyof PurchaseItemEntry>(
    index: number,
    field: K,
    value: PurchaseItemEntry[K],
  ): void {
    this.items.update((list) => {
      const next = [...list];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  isAlreadySelected(id: string, currentIndex: number): boolean {
    return this.items().some(
      (it, i) => i !== currentIndex && it.kind === ItemType.BULK && it.inventoryItemId === id,
    );
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) return;
    this.submitting.set(true);

    const items: CreatePurchaseInvoiceItemDto[] = this.items().map((it) =>
      it.kind === ItemType.BULK
        ? {
            kind: ItemType.BULK,
            inventoryItemId: it.inventoryItemId,
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice) || 0,
            taxPercent: it.taxPercent,
            notes: it.notes?.trim() || undefined,
          }
        : {
            kind: ItemType.UNIQUE,
            name: it.name.trim(),
            category: it.category.trim(),
            model: it.model?.trim() || undefined,
            serviceTag: it.serviceTag.trim(),
            serialNumber: it.serialNumber?.trim() || undefined,
            unitPrice: Number(it.unitPrice) || 0,
            taxPercent: it.taxPercent,
            notes: it.notes?.trim() || undefined,
          },
    );

    const dto: CreatePurchaseInvoiceDto = {
      warehouseId: this.warehouseId(),
      supplierId: this.supplierId(),
      invoiceNumber: this.invoiceNumber().trim(),
      currency: this.currency(),
      taxPercent: this.taxPercent(),
      paymentCondition: this.paymentCondition(),
      notes: this.notes().trim() || undefined,
      items,
    };

    this.purchaseInvoiceService.create(dto).subscribe((result) => {
      this.submitting.set(false);
      if (result) {
        this.notifications.success('PURCHASES.CREATE_SUCCESS');
        this.created.emit({ success: true });
      }
      // A null answer is a failed request: PurchaseInvoiceService already showed the reason (reportErrors)
    });
  }
}
