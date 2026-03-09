import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-stock-take-complete-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
  ],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closed.emit()">
      <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-theme">
          <h2 class="text-xl font-semibold text-foreground">{{ 'STOCK_TAKE.COMPLETE.TITLE' | translate }}</h2>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.COMPLETE.MESSAGE' | translate }}</p>
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              [(ngModel)]="applyToInventory"
              class="mt-1 w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
            />
            <div>
              <p class="text-foreground font-medium">{{ 'STOCK_TAKE.COMPLETE.APPLY_INVENTORY' | translate }}</p>
              <p class="text-[var(--color-on-surface-variant)] text-sm">{{ 'STOCK_TAKE.COMPLETE.APPLY_HINT' | translate }}</p>
            </div>
          </label>
        </div>
        <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
          <button
            (click)="closed.emit()"
            class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            (click)="confirmed.emit(applyToInventory)"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-2 rounded-lg transition-all">
            {{ 'STOCK_TAKE.COMPLETE.BUTTON' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class StockTakeCompleteDialogComponent {
  /** Emitted when the dialog is closed/cancelled */
  closed = output<void>();

  /** Emitted when the user confirms completion, with the applyToInventory flag */
  confirmed = output<boolean>();

  // Local state
  applyToInventory = false;
}
