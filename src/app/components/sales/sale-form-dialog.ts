import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SaleService } from '../../services/sale.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import {
  CreateSaleDto,
  CustomerType,
} from '../../interfaces/sale.interface';

interface SaleItemEntry {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

export interface SaleFormResult {
  success: boolean;
}

const CUSTOMER_TYPES: CustomerType[] = [
  CustomerType.WHOLESALE,
  CustomerType.DISTRIBUTOR,
  CustomerType.RETAIL,
];

const CURRENCIES = ['USD', 'HNL'];

@Component({
  selector: 'app-sale-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, A11yModule, LucideAngularModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="close()">
      <div
        #dialogEl
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-form-dialog-title"
        tabindex="-1"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
        class="bg-surface-variant border border-theme rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto focus:outline-none"
        (click)="$event.stopPropagation()"
      >
        <div class="px-6 py-4 border-b border-theme">
          <h2 id="sale-form-dialog-title" class="text-xl font-semibold text-foreground">
            {{ 'SALES.NEW_SALE' | translate }}
          </h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">
            {{ 'SALES.NEW_SALE_DESC' | translate }}
          </p>
        </div>

        <div class="p-6 space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'SALES.NAME' | translate }}
            </label>
            <input
              type="text"
              [ngModel]="name()"
              (ngModelChange)="name.set($event)"
              maxlength="120"
              [placeholder]="'SALES.NAME_PLACEHOLDER' | translate"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          <!-- Warehouse -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'SALES.WAREHOUSE' | translate }} *
            </label>
            <select
              [ngModel]="warehouseId()"
              (ngModelChange)="onWarehouseChange($event)"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">{{ 'SALES.SELECT_WAREHOUSE' | translate }}</option>
              @for (warehouse of warehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
              }
            </select>
          </div>

          <!-- Customer name + type -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
                {{ 'SALES.CUSTOMER_NAME' | translate }}
              </label>
              <input
                type="text"
                [ngModel]="customerName()"
                (ngModelChange)="customerName.set($event)"
                maxlength="120"
                [placeholder]="'SALES.CUSTOMER_NAME_PLACEHOLDER' | translate"
                class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
                {{ 'SALES.CUSTOMER_TYPE_LABEL' | translate }} *
              </label>
              <select
                [ngModel]="customerType()"
                (ngModelChange)="customerType.set($event)"
                class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                <option value="">{{ 'SALES.SELECT_CUSTOMER_TYPE' | translate }}</option>
                @for (c of customerTypes; track c) {
                  <option [value]="c">{{ 'SALES.CUSTOMER_TYPE.' + c | translate }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Currency -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'SALES.CURRENCY' | translate }} *
            </label>
            <select
              [ngModel]="currency()"
              (ngModelChange)="currency.set($event)"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              @for (cur of currencies; track cur) {
                <option [value]="cur">{{ cur }}</option>
              }
            </select>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'SALES.NOTES' | translate }}
            </label>
            <textarea
              [ngModel]="notes()"
              (ngModelChange)="notes.set($event)"
              rows="2"
              [placeholder]="'SALES.NOTES_PLACEHOLDER' | translate"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
            ></textarea>
          </div>

          <!-- Items -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-[var(--color-on-surface-variant)]">
                {{ 'TRANSACTION.ITEMS' | translate }} *
              </label>
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
                    <div class="flex-1 space-y-3">
                      <select
                        [ngModel]="item.inventoryItemId"
                        (ngModelChange)="updateItemId(i, $event)"
                        class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
                      >
                        <option value="">{{ 'TRANSACTION.SELECT_ITEM' | translate }}</option>
                        @for (invItem of availableItems(); track invItem.id) {
                          <option
                            [value]="invItem.id"
                            [disabled]="isAlreadySelected(invItem.id, i)"
                          >
                            {{ invItem.name }} ({{ invItem.quantity }} {{ 'TRANSACTION.AVAILABLE' | translate }})
                          </option>
                        }
                      </select>
                      <div class="flex gap-3">
                        <div class="w-24">
                          <input
                            type="number"
                            [ngModel]="item.quantity"
                            (ngModelChange)="updateItemQuantity(i, $event)"
                            [max]="getAvailable(item.inventoryItemId)"
                            min="1"
                            class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            [placeholder]="'TRANSACTION.QTY_PLACEHOLDER' | translate"
                          />
                        </div>
                        <div class="w-32">
                          <input
                            type="number"
                            [ngModel]="item.unitPrice"
                            (ngModelChange)="updateItemPrice(i, $event)"
                            min="0"
                            step="0.01"
                            class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                            [placeholder]="'SALES.UNIT_PRICE' | translate"
                          />
                        </div>
                        <input
                          type="text"
                          [ngModel]="item.notes"
                          (ngModelChange)="updateItemNotes(i, $event)"
                          class="flex-1 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          [placeholder]="'TRANSACTION.NOTES_OPTIONAL' | translate"
                        />
                      </div>
                      <div class="text-right text-xs text-[var(--color-on-surface-variant)]">
                        {{ 'SALES.SUBTOTAL' | translate }}: {{ currency() }} {{ lineTotal(item).toFixed(2) }}
                      </div>
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

          <!-- Total -->
          @if (items().length > 0) {
            <div class="flex items-center justify-between border-t border-theme pt-4">
              <span class="text-sm font-medium text-[var(--color-on-surface-variant)]">
                {{ 'SALES.TOTAL' | translate }}
              </span>
              <span class="text-xl font-bold text-foreground">
                {{ currency() }} {{ total().toFixed(2) }}
              </span>
            </div>
          }
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
            {{ 'SALES.CREATE' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SaleFormDialog implements AfterViewInit {
  private saleService = inject(SaleService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  private dialogEl = viewChild<ElementRef<HTMLElement>>('dialogEl');

  closed = output<void>();
  created = output<SaleFormResult>();

  ngAfterViewInit(): void {
    queueMicrotask(() => this.dialogEl()?.nativeElement.focus());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  readonly customerTypes = CUSTOMER_TYPES;
  readonly currencies = CURRENCIES;

  name = signal('');
  warehouseId = signal('');
  customerName = signal('');
  customerType = signal<CustomerType | ''>('');
  currency = signal('USD');
  notes = signal('');
  items = signal<SaleItemEntry[]>([]);
  submitting = signal(false);

  warehouses = computed(() => this.warehouseService.warehouses());

  availableItems = computed(() => {
    const wh = this.warehouseId();
    const all = this.inventoryService.items();
    if (!wh) return [];
    return all.filter((item) => item.warehouseId === wh && item.quantity > 0);
  });

  total = computed(() =>
    this.items().reduce((sum, it) => sum + this.lineTotal(it), 0),
  );

  canSubmit = computed(() => {
    if (!this.warehouseId() || !this.customerType()) return false;
    const list = this.items();
    if (list.length === 0) return false;
    return list.every(
      (it) =>
        !!it.inventoryItemId &&
        Number.isFinite(it.quantity) &&
        it.quantity > 0 &&
        it.quantity <= this.getAvailable(it.inventoryItemId) &&
        Number.isFinite(it.unitPrice) &&
        it.unitPrice >= 0,
    );
  });

  lineTotal(item: SaleItemEntry): number {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return Math.round(qty * price * 100) / 100;
  }

  close(): void {
    this.closed.emit();
  }

  onWarehouseChange(id: string): void {
    this.warehouseId.set(id);
    // Clear items because they were scoped to the previous warehouse
    this.items.set([]);
  }

  addItem(): void {
    this.items.update((list) => [
      ...list,
      { inventoryItemId: '', quantity: 1, unitPrice: 0, notes: '' },
    ]);
  }

  updateItemId(index: number, id: string): void {
    // Pre-fill the unit price from the item's current price as a suggestion
    // (the seller can override it for the chosen customer tier).
    const suggested = this.availableItems().find((i) => i.id === id)?.price ?? 0;
    this.items.update((list) => {
      const next = [...list];
      const current = next[index];
      const keepPrice = current.unitPrice && current.inventoryItemId === id;
      next[index] = {
        ...current,
        inventoryItemId: id,
        unitPrice: keepPrice ? current.unitPrice : suggested,
      };
      return next;
    });
  }

  updateItemQuantity(index: number, qty: number): void {
    this.items.update((list) => {
      const next = [...list];
      next[index] = { ...next[index], quantity: qty || 1 };
      return next;
    });
  }

  updateItemPrice(index: number, price: number): void {
    this.items.update((list) => {
      const next = [...list];
      next[index] = { ...next[index], unitPrice: price >= 0 ? price : 0 };
      return next;
    });
  }

  updateItemNotes(index: number, notes: string): void {
    this.items.update((list) => {
      const next = [...list];
      next[index] = { ...next[index], notes };
      return next;
    });
  }

  removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  isAlreadySelected(id: string, currentIndex: number): boolean {
    return this.items().some(
      (it, i) => i !== currentIndex && it.inventoryItemId === id,
    );
  }

  getAvailable(itemId: string): number {
    if (!itemId) return Number.MAX_SAFE_INTEGER;
    return (
      this.availableItems().find((i) => i.id === itemId)?.quantity ??
      Number.MAX_SAFE_INTEGER
    );
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) return;
    this.submitting.set(true);

    const dto: CreateSaleDto = {
      name: this.name().trim() || undefined,
      warehouseId: this.warehouseId(),
      customerName: this.customerName().trim() || undefined,
      customerType: this.customerType() as CustomerType,
      currency: this.currency(),
      notes: this.notes().trim() || undefined,
      items: this.items().map((it) => ({
        inventoryItemId: it.inventoryItemId,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice) || 0,
        notes: it.notes?.trim() || undefined,
      })),
    };

    this.saleService.create(dto).subscribe({
      next: (result) => {
        this.submitting.set(false);
        if (result) {
          this.notifications.success(
            this.translate.instant('SALES.CREATE_SUCCESS'),
          );
          this.created.emit({ success: true });
        } else {
          this.notifications.error(
            this.translate.instant('SALES.CREATE_ERROR'),
          );
        }
      },
      error: () => {
        this.submitting.set(false);
        this.notifications.error(this.translate.instant('SALES.CREATE_ERROR'));
      },
    });
  }
}
