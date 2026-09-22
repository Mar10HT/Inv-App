import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { StockTakeStats } from '../../interfaces/stock-take.interface';

@Component({
  selector: 'app-stock-take-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, TranslateModule],
  template: `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.STATS.TOTAL' | translate }}</p>
            <p class="text-2xl font-bold text-foreground">{{ stats().total }}</p>
          </div>
          <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
            <lucide-icon name="ClipboardCheck" class="!text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.STATS.IN_PROGRESS' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ stats().inProgress }}</p>
          </div>
          <div class="bg-[var(--color-info-bg)] p-3 rounded-lg">
            <lucide-icon name="Clock" class="!text-[var(--color-status-info)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.STATS.COMPLETED' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-success)]">{{ stats().completed }}</p>
          </div>
          <div class="bg-[var(--color-success-bg)] p-3 rounded-lg">
            <lucide-icon name="CheckCircle2" class="!text-[var(--color-status-success)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.STATS.CANCELLED' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ stats().cancelled }}</p>
          </div>
          <div class="bg-[var(--color-error-bg)] p-3 rounded-lg">
            <lucide-icon name="XCircle" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StockTakeStatsCards {
  stats = input.required<StockTakeStats>();
}
