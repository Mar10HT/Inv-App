import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

@Component({
  selector: 'app-stock-take-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslateModule,
  ],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closed.emit()">
      <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-lg" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-theme">
          <h2 class="text-xl font-semibold text-foreground">{{ 'STOCK_TAKE.NEW' | translate }}</h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'STOCK_TAKE.NEW_DESC' | translate }}</p>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'STOCK_TAKE.WAREHOUSE' | translate }} *</label>
            <select
              [(ngModel)]="warehouseId"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">{{ 'STOCK_TAKE.SELECT_WAREHOUSE' | translate }}</option>
              @for (warehouse of warehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'STOCK_TAKE.DESCRIPTION' | translate }}</label>
            <textarea
              [(ngModel)]="notes"
              rows="2"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
              [placeholder]="'STOCK_TAKE.DESCRIPTION_PLACEHOLDER' | translate"
            ></textarea>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
          <button
            (click)="closed.emit()"
            class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            (click)="onSubmit()"
            [disabled]="!warehouseId"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-surface-elevated)] disabled:text-[var(--color-on-surface-variant)] text-white px-6 py-2 rounded-lg transition-all">
            {{ 'COMMON.CREATE' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class StockTakeFormDialogComponent {
  /** List of available warehouses */
  warehouses = input.required<Warehouse[]>();

  /** Emitted when the dialog is closed/cancelled */
  closed = output<void>();

  /** Emitted when the user submits a new stock take */
  created = output<{ warehouseId: string; notes?: string }>();

  // Local form state
  warehouseId = '';
  notes = '';

  onSubmit(): void {
    if (!this.warehouseId) return;
    this.created.emit({
      warehouseId: this.warehouseId,
      notes: this.notes.trim() || undefined,
    });
  }
}
