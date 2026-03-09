import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

import { VarianceReport } from '../../interfaces/stock-take.interface';

@Component({
  selector: 'app-stock-take-variance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslateModule,
  ],
  template: `
    <!-- Header -->
    <div class="mb-8">
      <button
        (click)="back.emit()"
        class="text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors flex items-center gap-2 mb-4">
        <lucide-icon name="ArrowLeft" class="!w-4 !h-4"></lucide-icon>
        {{ 'STOCK_TAKE.VARIANCE.BACK' | translate }}
      </button>
      <h1 class="text-3xl font-bold text-foreground mb-2">{{ 'STOCK_TAKE.VARIANCE.TITLE' | translate }}</h1>
      <p class="text-[var(--color-on-surface-variant)]">{{ report().stockTake.warehouse.name }}</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.TOTAL_ITEMS' | translate }}</p>
        <p class="text-2xl font-bold text-foreground">{{ report().summary.totalItems }}</p>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.ITEMS_COUNTED' | translate }}</p>
        <p class="text-2xl font-bold text-foreground">{{ report().summary.countedItems }}</p>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.TOTAL_SURPLUS' | translate }}</p>
        <p class="text-2xl font-bold text-[var(--color-status-success)]">+{{ report().summary.totalPositiveVariance }}</p>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.TOTAL_SHORTAGE' | translate }}</p>
        <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ report().summary.totalNegativeVariance }}</p>
      </div>
    </div>

    <!-- Variance Table -->
    <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
      <div class="px-6 py-4 border-b border-theme">
        <h2 class="text-xl font-semibold text-foreground">{{ 'STOCK_TAKE.VARIANCE.SUMMARY' | translate }}</h2>
      </div>

      <!-- Desktop Table -->
      <div class="hidden lg:block overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-[var(--color-surface)]">
              <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.VARIANCE.ITEM' | translate }}</th>
              <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.VARIANCE.EXPECTED' | translate }}</th>
              <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.VARIANCE.COUNTED' | translate }}</th>
              <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.VARIANCE.DIFFERENCE' | translate }}</th>
              <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border-subtle)]">
            @for (item of report().items; track item.id) {
              <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                <td class="px-6 py-4">
                  <p class="text-foreground font-medium">{{ item.itemName }}</p>
                </td>
                <td class="px-6 py-4 text-foreground">{{ item.expectedQty }}</td>
                <td class="px-6 py-4 text-foreground">{{ item.countedQty ?? '-' }}</td>
                <td class="px-6 py-4">
                  <span [class]="getVarianceClass(item.variance ?? 0)" class="font-medium">
                    {{ (item.variance ?? 0) > 0 ? '+' : '' }}{{ item.variance }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  @if ((item.variance ?? 0) > 0) {
                    <span class="bg-[var(--color-success-bg)] text-[var(--color-status-success)] border border-[var(--color-success-border)] inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                      {{ 'STOCK_TAKE.VARIANCE.SURPLUS' | translate }}
                    </span>
                  } @else if ((item.variance ?? 0) < 0) {
                    <span class="bg-[var(--color-error-bg)] text-[var(--color-status-error)] border border-[var(--color-error-border)] inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                      {{ 'STOCK_TAKE.VARIANCE.SHORTAGE' | translate }}
                    </span>
                  } @else {
                    <span class="bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] border border-[var(--color-border)] inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                      {{ 'STOCK_TAKE.VARIANCE.MATCH' | translate }}
                    </span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-6 py-16 text-center">
                  <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.NO_VARIANCE' | translate }}</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="lg:hidden divide-y divide-[var(--color-border-subtle)]">
        @for (item of report().items; track item.id) {
          <div class="p-4">
            <div class="flex justify-between items-start mb-2">
              <p class="text-foreground font-medium">{{ item.itemName }}</p>
              <span [class]="getVarianceClass(item.variance ?? 0)" class="text-sm font-medium">
                {{ (item.variance ?? 0) > 0 ? '+' : '' }}{{ item.variance }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.EXPECTED' | translate }}</p>
                <p class="text-foreground">{{ item.expectedQty }}</p>
              </div>
              <div>
                <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.COUNTED' | translate }}</p>
                <p class="text-foreground">{{ item.countedQty ?? '-' }}</p>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class StockTakeVarianceComponent {
  /** The variance report data */
  report = input.required<VarianceReport>();

  /** Emitted when user clicks back */
  back = output<void>();

  getVarianceClass(variance: number): string {
    if (variance > 0) return 'text-[var(--color-status-success)]';
    if (variance < 0) return 'text-[var(--color-status-error)]';
    return 'text-[var(--color-on-surface-variant)]';
  }
}
