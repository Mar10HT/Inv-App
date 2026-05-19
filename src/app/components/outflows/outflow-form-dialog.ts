import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { OutflowService } from '../../services/outflow.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import {
  CreateOutflowDto,
  OutflowReason,
} from '../../interfaces/outflow.interface';

interface OutflowItemEntry {
  inventoryItemId: string;
  quantity: number;
  notes: string;
}

export interface OutflowFormResult {
  success: boolean;
}

const REASONS: OutflowReason[] = [
  OutflowReason.DAMAGED,
  OutflowReason.LOST,
  OutflowReason.EXPIRED,
  OutflowReason.CONSUMED,
  OutflowReason.SOLD,
  OutflowReason.OTHER,
];

@Component({
  selector: 'app-outflow-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="close()">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outflow-form-dialog-title"
        class="bg-surface-variant border border-theme rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <div class="px-6 py-4 border-b border-theme">
          <h2 id="outflow-form-dialog-title" class="text-xl font-semibold text-foreground">
            {{ 'OUTFLOWS.NEW_OUTFLOW' | translate }}
          </h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">
            {{ 'OUTFLOWS.NEW_OUTFLOW_DESC' | translate }}
          </p>
        </div>

        <div class="p-6 space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'OUTFLOWS.NAME' | translate }}
            </label>
            <input
              type="text"
              [ngModel]="name()"
              (ngModelChange)="name.set($event)"
              maxlength="120"
              [placeholder]="'OUTFLOWS.NAME_PLACEHOLDER' | translate"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          <!-- Warehouse -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'OUTFLOWS.WAREHOUSE' | translate }} *
            </label>
            <select
              [ngModel]="warehouseId()"
              (ngModelChange)="onWarehouseChange($event)"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">{{ 'OUTFLOWS.SELECT_WAREHOUSE' | translate }}</option>
              @for (warehouse of warehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
              }
            </select>
          </div>

          <!-- Reason -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'OUTFLOWS.REASON' | translate }} *
            </label>
            <select
              [ngModel]="reason()"
              (ngModelChange)="reason.set($event)"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">{{ 'OUTFLOWS.SELECT_REASON' | translate }}</option>
              @for (r of reasons; track r) {
                <option [value]="r">{{ 'OUTFLOWS.REASONS.' + r | translate }}</option>
              }
            </select>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'OUTFLOWS.NOTES' | translate }}
            </label>
            <textarea
              [ngModel]="notes()"
              (ngModelChange)="notes.set($event)"
              rows="2"
              [placeholder]="'OUTFLOWS.NOTES_PLACEHOLDER' | translate"
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
                        <input
                          type="number"
                          [ngModel]="item.quantity"
                          (ngModelChange)="updateItemQuantity(i, $event)"
                          [max]="getAvailable(item.inventoryItemId)"
                          min="1"
                          class="w-24 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          [placeholder]="'TRANSACTION.QTY_PLACEHOLDER' | translate"
                        />
                        <input
                          type="text"
                          [ngModel]="item.notes"
                          (ngModelChange)="updateItemNotes(i, $event)"
                          class="flex-1 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-foreground text-sm placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          [placeholder]="'TRANSACTION.NOTES_OPTIONAL' | translate"
                        />
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
            {{ 'OUTFLOWS.CREATE' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class OutflowFormDialog {
  private outflowService = inject(OutflowService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  closed = output<void>();
  created = output<OutflowFormResult>();

  readonly reasons = REASONS;

  name = signal('');
  warehouseId = signal('');
  reason = signal<OutflowReason | ''>('');
  notes = signal('');
  items = signal<OutflowItemEntry[]>([]);
  submitting = signal(false);

  warehouses = computed(() => this.warehouseService.warehouses());

  availableItems = computed(() => {
    const wh = this.warehouseId();
    const all = this.inventoryService.items();
    if (!wh) return [];
    return all.filter((item) => item.warehouseId === wh && item.quantity > 0);
  });

  canSubmit = computed(() => {
    if (!this.warehouseId() || !this.reason()) return false;
    const list = this.items();
    if (list.length === 0) return false;
    return list.every(
      (it) =>
        !!it.inventoryItemId &&
        Number.isFinite(it.quantity) &&
        it.quantity > 0 &&
        it.quantity <= this.getAvailable(it.inventoryItemId),
    );
  });

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
      { inventoryItemId: '', quantity: 1, notes: '' },
    ]);
  }

  updateItemId(index: number, id: string): void {
    this.items.update((list) => {
      const next = [...list];
      next[index] = { ...next[index], inventoryItemId: id };
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

    const dto: CreateOutflowDto = {
      name: this.name().trim() || undefined,
      warehouseId: this.warehouseId(),
      reason: this.reason() as OutflowReason,
      notes: this.notes().trim() || undefined,
      items: this.items().map((it) => ({
        inventoryItemId: it.inventoryItemId,
        quantity: it.quantity,
        notes: it.notes?.trim() || undefined,
      })),
    };

    this.outflowService.create(dto).subscribe({
      next: (result) => {
        this.submitting.set(false);
        if (result) {
          this.notifications.success(
            this.translate.instant('OUTFLOWS.CREATE_SUCCESS'),
          );
          this.created.emit({ success: true });
        } else {
          // Service already set its own error signal; surface it
          this.notifications.error(
            this.translate.instant('OUTFLOWS.CREATE_ERROR'),
          );
        }
      },
      error: () => {
        this.submitting.set(false);
        this.notifications.error(
          this.translate.instant('OUTFLOWS.CREATE_ERROR'),
        );
      },
    });
  }
}
