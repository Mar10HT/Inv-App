import { Component, computed, signal, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TransferRequestService } from '../../services/transfer-request.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';

/** Represents a single item in the transfer form */
export interface TransferItemEntry {
  inventoryItemId: string;
  quantity: number;
}

/** Result emitted when a transfer request is successfully created */
export interface TransferFormResult {
  success: boolean;
}

@Component({
  selector: 'app-transfer-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="close()">
      <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-theme">
          <h2 class="text-xl font-semibold text-foreground">{{ 'TRANSFERS.NEW_REQUEST' | translate }}</h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'TRANSFERS.NEW_REQUEST_DESC' | translate }}</p>
        </div>
        <div class="p-6 space-y-4">
          <!-- Source Warehouse -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'TRANSFERS.SOURCE' | translate }} *</label>
            <select
              [ngModel]="selectedSourceWarehouseId()"
              (ngModelChange)="onSourceWarehouseChange($event)"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">{{ 'TRANSFERS.SELECT_SOURCE' | translate }}</option>
              @for (warehouse of warehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
              }
            </select>
          </div>

          <!-- Destination Warehouse -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'TRANSFERS.DESTINATION' | translate }} *</label>
            <select
              [ngModel]="selectedDestWarehouseId()"
              (ngModelChange)="selectedDestWarehouseId.set($event)"
              [disabled]="!selectedSourceWarehouseId()"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              <option value="">{{ 'TRANSFERS.SELECT_DESTINATION' | translate }}</option>
              @for (warehouse of destinationWarehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
              }
            </select>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'TRANSFERS.NOTES' | translate }}</label>
            <textarea
              [ngModel]="selectedNotes()"
              (ngModelChange)="selectedNotes.set($event)"
              rows="2"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
              [placeholder]="'TRANSFERS.NOTES_PLACEHOLDER' | translate"
            ></textarea>
          </div>

          <!-- Items Section -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'TRANSFERS.ITEMS' | translate }} *</label>
              <button
                type="button"
                (click)="addItem()"
                class="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1">
                <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
                {{ 'TRANSACTION.ADD_ITEM' | translate }}
              </button>
            </div>

            <div class="space-y-3">
              @for (item of requestItems(); track $index; let i = $index) {
                <div class="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg p-4">
                  <div class="flex items-start gap-3">
                    <div class="flex-1 space-y-3">
                      <select
                        [ngModel]="item.inventoryItemId"
                        (ngModelChange)="updateItemId(i, $event)"
                        class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer">
                        <option value="">{{ 'TRANSACTION.SELECT_ITEM' | translate }}</option>
                        @for (invItem of availableItems(); track invItem.id) {
                          <option [value]="invItem.id" [disabled]="isItemAlreadySelected(invItem.id, i)">
                            {{ invItem.name }} ({{ invItem.quantity }} {{ 'TRANSACTION.AVAILABLE' | translate }})
                          </option>
                        }
                      </select>
                      <input
                        type="number"
                        [ngModel]="item.quantity"
                        (ngModelChange)="updateItemQuantity(i, $event)"
                        min="1"
                        class="w-24 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                        [placeholder]="'TRANSACTION.QTY_PLACEHOLDER' | translate"
                      />
                    </div>
                    <button
                      type="button"
                      (click)="removeItem(i)"
                      [attr.aria-label]="'COMMON.DELETE' | translate"
                      class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors">
                      <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </div>
                </div>
              }
            </div>

            @if (requestItems().length === 0) {
              <p class="text-[var(--color-on-surface-variant)] text-sm text-center py-4">{{ 'TRANSACTION.NO_ITEMS' | translate }}</p>
            }
          </div>
        </div>
        <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
          <button
            (click)="close()"
            class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            (click)="createRequest()"
            [disabled]="!canCreateRequest()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-surface-elevated)] disabled:text-[var(--color-on-surface-variant)] text-white px-6 py-2 rounded-lg transition-all">
            {{ 'TRANSFERS.CREATE_REQUEST' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class TransferFormDialog {
  private transferService = inject(TransferRequestService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  /** Emits when the dialog should close */
  closed = output<void>();

  /** Emits when a transfer request is successfully created */
  created = output<TransferFormResult>();

  // Form signals
  selectedSourceWarehouseId = signal('');
  selectedDestWarehouseId = signal('');
  selectedNotes = signal('');
  requestItems = signal<TransferItemEntry[]>([]);

  // Computed
  warehouses = computed(() => this.warehouseService.warehouses());

  destinationWarehouses = computed(() => {
    const all = this.warehouseService.warehouses();
    const sourceId = this.selectedSourceWarehouseId();
    return all.filter(w => w.id !== sourceId);
  });

  availableItems = computed(() => {
    const sourceId = this.selectedSourceWarehouseId();
    const items = this.inventoryService.items();

    if (!sourceId) return items;
    return items.filter(item => item.warehouseId === sourceId && item.quantity > 0);
  });

  close(): void {
    this.closed.emit();
  }

  onSourceWarehouseChange(warehouseId: string): void {
    this.selectedSourceWarehouseId.set(warehouseId);
    this.requestItems.set([]);
    this.selectedDestWarehouseId.set('');
  }

  addItem(): void {
    this.requestItems.update(items => [...items, { inventoryItemId: '', quantity: 1 }]);
  }

  updateItemId(index: number, itemId: string): void {
    this.requestItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], inventoryItemId: itemId };
      return newItems;
    });
  }

  updateItemQuantity(index: number, quantity: number): void {
    this.requestItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], quantity: quantity || 1 };
      return newItems;
    });
  }

  removeItem(index: number): void {
    this.requestItems.update(items => items.filter((_, i) => i !== index));
  }

  isItemAlreadySelected(itemId: string, currentIndex: number): boolean {
    return this.requestItems().some((item, i) => i !== currentIndex && item.inventoryItemId === itemId);
  }

  canCreateRequest(): boolean {
    const items = this.requestItems();
    const hasValidItems = items.length > 0 && items.every(item => item.inventoryItemId && item.quantity > 0);
    return hasValidItems &&
           !!this.selectedSourceWarehouseId() &&
           !!this.selectedDestWarehouseId() &&
           this.selectedSourceWarehouseId() !== this.selectedDestWarehouseId();
  }

  createRequest(): void {
    if (!this.canCreateRequest()) return;

    this.transferService.createRequest({
      sourceWarehouseId: this.selectedSourceWarehouseId(),
      destinationWarehouseId: this.selectedDestWarehouseId(),
      items: this.requestItems().filter(i => i.inventoryItemId),
      notes: this.selectedNotes() || undefined
    }).subscribe({
      next: (result) => {
        if (result) {
          this.notifications.success(this.translate.instant('TRANSFERS.REQUEST_CREATED'));
          this.created.emit({ success: true });
        }
      },
      error: () => {
        this.notifications.error(this.translate.instant('TRANSFERS.REQUEST_ERROR'));
      }
    });
  }
}
