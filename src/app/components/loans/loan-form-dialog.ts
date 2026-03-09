import { Component, computed, signal, inject, output, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LoanService } from '../../services/loan.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';

/** Represents a single item in the loan form */
export interface LoanItemEntry {
  inventoryItemId: string;
  quantity: number;
  notes: string;
}

/** Result emitted when a loan is successfully created */
export interface LoanFormResult {
  success: boolean;
  count: number;
}

@Component({
  selector: 'app-loan-form-dialog',
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
          <h2 class="text-xl font-semibold text-foreground">{{ 'LOANS.NEW_LOAN' | translate }}</h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'LOANS.NEW_LOAN_DESC' | translate }}</p>
        </div>
        <div class="p-6 space-y-4">
          <!-- Source Warehouse Select -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'LOANS.SOURCE_WAREHOUSE' | translate }} *</label>
            <select
              [ngModel]="selectedSourceWarehouseId()"
              (ngModelChange)="onSourceWarehouseChange($event)"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">{{ 'LOANS.SELECT_SOURCE_WAREHOUSE' | translate }}</option>
              @for (warehouse of warehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
              }
            </select>
          </div>

          <!-- Destination Warehouse Select -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'LOANS.DEST_WAREHOUSE' | translate }} *</label>
            <select
              [ngModel]="selectedDestWarehouseId()"
              (ngModelChange)="selectedDestWarehouseId.set($event)"
              [disabled]="!selectedSourceWarehouseId()"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              <option value="">{{ 'LOANS.SELECT_DEST_WAREHOUSE' | translate }}</option>
              @for (warehouse of destinationWarehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
              }
            </select>
          </div>

          <!-- Due Date -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'LOANS.DUE_DATE' | translate }} *</label>
            <input
              type="date"
              [ngModel]="selectedDueDate()"
              (ngModelChange)="selectedDueDate.set($event)"
              [min]="minDate"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'LOANS.NOTES' | translate }}</label>
            <textarea
              [ngModel]="selectedNotes()"
              (ngModelChange)="selectedNotes.set($event)"
              rows="2"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
              [placeholder]="'LOANS.NOTES_PLACEHOLDER' | translate"
            ></textarea>
          </div>

          <!-- Items Section -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-[var(--color-on-surface-variant)]">
                {{ 'TRANSACTION.ITEMS' | translate }} *
              </label>
              <button
                type="button"
                (click)="addLoanItem()"
                class="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1">
                <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
                {{ 'TRANSACTION.ADD_ITEM' | translate }}
              </button>
            </div>

            <div class="space-y-3">
              @for (item of loanItems(); track $index; let i = $index) {
                <div class="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg p-4">
                  <div class="flex items-start gap-3">
                    <div class="flex-1 space-y-3">
                      <select
                        [ngModel]="item.inventoryItemId"
                        (ngModelChange)="updateLoanItemId(i, $event)"
                        class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer">
                        <option value="">{{ 'TRANSACTION.SELECT_ITEM' | translate }}</option>
                        @for (invItem of availableItemsForLoan(); track invItem.id) {
                          <option [value]="invItem.id" [disabled]="isItemAlreadySelected(invItem.id, i)">
                            {{ invItem.name }} ({{ invItem.quantity }} {{ 'TRANSACTION.AVAILABLE' | translate }})
                          </option>
                        }
                      </select>
                      <div class="flex gap-3">
                        <input
                          type="number"
                          [ngModel]="item.quantity"
                          (ngModelChange)="updateLoanItemQuantity(i, $event)"
                          min="1"
                          class="w-24 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          [placeholder]="'TRANSACTION.QTY_PLACEHOLDER' | translate"
                        />
                        <input
                          type="text"
                          [ngModel]="item.notes"
                          (ngModelChange)="updateLoanItemNotes(i, $event)"
                          class="flex-1 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          [placeholder]="'TRANSACTION.NOTES_OPTIONAL' | translate"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="removeLoanItem(i)"
                      class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors">
                      <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </div>
                </div>
              }
            </div>

            @if (loanItems().length === 0) {
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
            (click)="createLoan()"
            [disabled]="!canCreateLoan()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-surface-elevated)] disabled:text-[var(--color-on-surface-variant)] text-white px-6 py-2 rounded-lg transition-all">
            {{ 'LOANS.CREATE_LOAN' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class LoanFormDialog {
  private loanService = inject(LoanService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  /** Emits when the dialog should close */
  closed = output<void>();

  /** Emits when a loan is successfully created */
  created = output<LoanFormResult>();

  // Form signals
  selectedSourceWarehouseId = signal('');
  selectedDestWarehouseId = signal('');
  selectedDueDate = signal('');
  selectedNotes = signal('');
  loanItems = signal<LoanItemEntry[]>([]);

  // Computed
  warehouses = computed(() => this.warehouseService.warehouses());

  destinationWarehouses = computed(() => {
    const all = this.warehouseService.warehouses();
    const sourceId = this.selectedSourceWarehouseId();
    return all.filter(w => w.id !== sourceId);
  });

  // Set of item IDs currently on loan (for fast lookup)
  private itemsOnLoanSet = computed(() => {
    const activeLoans = this.loanService.activeLoans();
    return new Set(activeLoans.map(l => l.inventoryItemId));
  });

  availableItemsForLoan = computed(() => {
    const sourceId = this.selectedSourceWarehouseId();
    const items = this.inventoryService.items();
    const onLoanSet = this.itemsOnLoanSet();

    if (!sourceId) {
      return items.filter(item => !onLoanSet.has(item.id));
    }

    return items.filter(item =>
      item.warehouseId === sourceId && !onLoanSet.has(item.id)
    );
  });

  // Min date for due date picker (tomorrow)
  minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  close(): void {
    this.closed.emit();
  }

  onSourceWarehouseChange(warehouseId: string): void {
    this.selectedSourceWarehouseId.set(warehouseId);
    this.loanItems.set([]);
    this.selectedDestWarehouseId.set('');
  }

  addLoanItem(): void {
    this.loanItems.update(items => [...items, { inventoryItemId: '', quantity: 1, notes: '' }]);
  }

  updateLoanItemId(index: number, itemId: string): void {
    this.loanItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], inventoryItemId: itemId };
      return newItems;
    });
  }

  updateLoanItemQuantity(index: number, quantity: number): void {
    this.loanItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], quantity: quantity || 1 };
      return newItems;
    });
  }

  updateLoanItemNotes(index: number, notes: string): void {
    this.loanItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], notes };
      return newItems;
    });
  }

  removeLoanItem(index: number): void {
    this.loanItems.update(items => items.filter((_, i) => i !== index));
  }

  isItemAlreadySelected(itemId: string, currentIndex: number): boolean {
    return this.loanItems().some((item, i) => i !== currentIndex && item.inventoryItemId === itemId);
  }

  canCreateLoan(): boolean {
    const items = this.loanItems();
    const hasValidItems = items.length > 0 && items.every(item => item.inventoryItemId);
    return hasValidItems &&
           !!this.selectedSourceWarehouseId() &&
           !!this.selectedDestWarehouseId() &&
           !!this.selectedDueDate() &&
           this.selectedSourceWarehouseId() !== this.selectedDestWarehouseId();
  }

  createLoan(): void {
    if (!this.canCreateLoan()) return;

    const items = this.loanItems().filter(item => item.inventoryItemId);
    const generalNotes = this.selectedNotes();
    let successCount = 0;
    let completedCount = 0;

    for (const item of items) {
      const notes = [generalNotes, item.notes].filter(n => n).join(' - ') || undefined;

      this.loanService.createLoan({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
        sourceWarehouseId: this.selectedSourceWarehouseId(),
        destinationWarehouseId: this.selectedDestWarehouseId(),
        dueDate: this.selectedDueDate(),
        notes
      }).subscribe({
        next: (result) => {
          if (result) {
            successCount++;
          }
          completedCount++;
          this.checkAllCompleted(completedCount, items.length, successCount);
        },
        error: () => {
          completedCount++;
          this.checkAllCompleted(completedCount, items.length, successCount);
        }
      });
    }
  }

  private checkAllCompleted(completed: number, total: number, successCount: number): void {
    if (completed === total) {
      if (successCount > 0) {
        const message = successCount === 1
          ? this.translate.instant('LOANS.LOAN_CREATED')
          : this.translate.instant('LOANS.LOANS_CREATED', { count: successCount });
        this.notifications.success(message);
        this.created.emit({ success: true, count: successCount });
      } else {
        this.notifications.error(this.translate.instant('LOANS.LOAN_ERROR'));
      }
    }
  }
}
