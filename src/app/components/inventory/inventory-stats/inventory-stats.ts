import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card';

/** The counters shown in the four cards above the inventory table. */
export interface InventoryStats {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

@Component({
  selector: 'app-inventory-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, TranslateModule, SkeletonCardComponent],
  template: `
    @if (loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        @for (card of [1, 2, 3, 4]; track $index) {
          <app-skeleton-card />
        }
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Items -->
        <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'DASHBOARD.TOTAL_ITEMS' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().total }}</p>
          </div>
          <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Package" class="!text-[var(--color-on-surface-variant)] !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- In Stock -->
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'DASHBOARD.IN_STOCK' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().inStock }}</p>
          </div>
          <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="CheckCircle2" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- Low Stock -->
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'DASHBOARD.LOW_STOCK' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().lowStock }}</p>
          </div>
          <div class="bg-[var(--color-warning-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="AlertTriangle" class="!text-orange-600 !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- Out of Stock -->
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'DASHBOARD.OUT_OF_STOCK' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().outOfStock }}</p>
          </div>
          <div class="p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0" style="background-color: var(--color-error-bg)">
            <lucide-icon name="AlertCircle" class="!w-6 !h-6" style="color: var(--color-status-error)"></lucide-icon>
          </div>
        </div>
      </div>
      </div>
    }
  `
})
export class InventoryStatsCards {
  stats = input.required<InventoryStats>();
  loading = input(false);
}
