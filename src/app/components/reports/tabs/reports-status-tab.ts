import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { InventoryItemInterface, InventoryStatus } from '../../../interfaces/inventory-item.interface';
import { StatusSummary } from '../reports.types';

@Component({
  selector: 'app-reports-status-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, TranslateModule],
  template: `
    <!-- Actions -->
    <div class="flex justify-end mb-6">
      <div class="flex items-center gap-2">
        <button
          (click)="csvRequested.emit()"
          class="bg-surface-elevated hover:bg-[var(--color-surface-elevated)] text-foreground px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 font-medium border border-theme">
          <lucide-icon name="Table" class="!w-4 !h-4"></lucide-icon>
          CSV
        </button>
        <button
          (click)="pdfRequested.emit()"
          class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 font-medium">
          <lucide-icon name="FileText" class="!w-4 !h-4"></lucide-icon>
          PDF
        </button>
      </div>
    </div>

    <!-- Status Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      @for (summary of summaries(); track summary.status) {
        <div class="bg-surface-variant border border-theme rounded-xl p-6"
          [class]="summary.status === InventoryStatus.IN_STOCK ? 'border-emerald-800/50' : summary.status === InventoryStatus.LOW_STOCK ? 'border-orange-800/50' : 'border-rose-800/50'">
          <div class="flex items-center gap-4 mb-4">
            <div class="p-3 rounded-lg"
              [class]="summary.status === InventoryStatus.IN_STOCK ? 'bg-emerald-500/20' : summary.status === InventoryStatus.LOW_STOCK ? 'bg-orange-500/20' : 'bg-rose-500/20'">
              <lucide-icon
                [name]="getStatusIcon(summary.status)"
                [class]="summary.status === InventoryStatus.IN_STOCK ? '!text-[var(--color-status-success)]' : summary.status === InventoryStatus.LOW_STOCK ? '!text-[var(--color-status-warning)]' : '!text-[var(--color-status-error)]'"
                class="!w-6 !h-6"></lucide-icon>
            </div>
            <div>
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STATUS.' + summary.status | translate }}</p>
              <p class="text-3xl font-bold"
                [class]="summary.status === InventoryStatus.IN_STOCK ? 'text-[var(--color-status-success)]' : summary.status === InventoryStatus.LOW_STOCK ? 'text-[var(--color-status-warning)]' : 'text-[var(--color-status-error)]'">
                {{ summary.count }}
              </p>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Low Stock & Out of Stock Tables -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Out of Stock -->
      <div class="bg-surface-variant border border-[var(--color-error-border)] rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-theme flex items-center gap-3 bg-[var(--color-error-bg)]">
          <lucide-icon name="XCircle" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
          <h2 class="text-lg font-semibold text-[var(--color-status-error)]">{{ 'REPORTS.OUT_OF_STOCK_ITEMS' | translate }}</h2>
          <span class="ml-auto bg-[var(--color-error-bg)] text-[var(--color-status-error)] px-2 py-0.5 rounded text-sm font-medium">{{ outOfStockItems().length }}</span>
        </div>
        <div class="p-4 max-h-[400px] overflow-y-auto">
          @for (item of outOfStockItems(); track item.id) {
            <div class="flex items-center justify-between px-3 py-3 hover:bg-[var(--color-surface-variant)] rounded-lg transition-colors">
              <div class="flex-1 min-w-0">
                <p class="text-foreground font-medium truncate">{{ item.name }}</p>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ item.category }} - {{ item.warehouse?.name || '-' }}</p>
              </div>
              <span class="text-sm text-[var(--color-on-surface-variant)] ml-4">Min: {{ item.minQuantity }}</span>
            </div>
          } @empty {
            <div class="py-8 text-center text-[var(--color-on-surface-variant)]">{{ 'REPORTS.NO_OUT_OF_STOCK' | translate }}</div>
          }
        </div>
      </div>

      <!-- Low Stock -->
      <div class="bg-surface-variant border border-[var(--color-warning-border)] rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-theme flex items-center gap-3 bg-[var(--color-warning-bg)]">
          <lucide-icon name="AlertTriangle" class="!text-[var(--color-status-warning)] !w-5 !h-5"></lucide-icon>
          <h2 class="text-lg font-semibold text-[var(--color-status-warning)]">{{ 'REPORTS.LOW_STOCK_ITEMS' | translate }}</h2>
          <span class="ml-auto bg-[var(--color-warning-bg)] text-[var(--color-status-warning)] px-2 py-0.5 rounded text-sm font-medium">{{ lowStockItems().length }}</span>
        </div>
        <div class="p-4 max-h-[400px] overflow-y-auto">
          @for (item of lowStockItems(); track item.id) {
            <div class="flex items-center justify-between px-3 py-3 hover:bg-[var(--color-surface-variant)] rounded-lg transition-colors">
              <div class="flex-1 min-w-0">
                <p class="text-foreground font-medium truncate">{{ item.name }}</p>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ item.category }} - {{ item.warehouse?.name || '-' }}</p>
              </div>
              <div class="text-right ml-4">
                <p class="text-[var(--color-status-warning)] font-medium">{{ item.quantity }} / {{ item.minQuantity }}</p>
              </div>
            </div>
          } @empty {
            <div class="py-8 text-center text-[var(--color-on-surface-variant)]">{{ 'REPORTS.NO_LOW_STOCK' | translate }}</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ReportsStatusTab {
  summaries = input.required<StatusSummary[]>();
  outOfStockItems = input.required<InventoryItemInterface[]>();
  lowStockItems = input.required<InventoryItemInterface[]>();

  csvRequested = output<void>();
  pdfRequested = output<void>();

  InventoryStatus = InventoryStatus;

  private static readonly ICONS: Partial<Record<InventoryStatus, string>> = {
    [InventoryStatus.IN_STOCK]: 'CheckCircle2',
    [InventoryStatus.LOW_STOCK]: 'AlertTriangle',
    [InventoryStatus.OUT_OF_STOCK]: 'XCircle',
    [InventoryStatus.IN_USE]: 'User'
  };

  getStatusIcon(status: InventoryStatus): string {
    return ReportsStatusTab.ICONS[status] ?? 'HelpCircle';
  }
}
