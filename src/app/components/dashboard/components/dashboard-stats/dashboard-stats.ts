import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardStats } from '../../../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  template: `
    <!-- Primary Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Total Items Card -->
      <div class="bg-surface-variant rounded-xl border border-theme p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'DASHBOARD.TOTAL_ITEMS' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats()?.totalItems || 0 }}</p>
          </div>
          <div class="bg-surface-elevated p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Package" class="!w-6 !h-6 text-[var(--color-on-surface-variant)]"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- In Stock Card -->
      <div class="bg-surface-variant rounded-xl border border-emerald-900/50 p-6 hover:border-emerald-800/50 transition-all">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'DASHBOARD.IN_STOCK' | translate }}</p>
            <p class="text-3xl font-bold text-[var(--color-status-success)]">{{ stats()?.inStockItems || 0 }}</p>
          </div>
          <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="CheckCircle2" class="!w-6 !h-6 text-emerald-500"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- Low Stock Card -->
      <div class="bg-surface-variant rounded-xl border border-orange-900/50 p-6 hover:border-orange-800/50 transition-all">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'DASHBOARD.LOW_STOCK' | translate }}</p>
            <p class="text-3xl font-bold text-[var(--color-status-warning)]">{{ stats()?.lowStockItems || 0 }}</p>
          </div>
          <div class="bg-[var(--color-warning-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="AlertTriangle" class="!w-6 !h-6 text-orange-500"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- Total Value Card -->
      <div class="bg-surface-variant rounded-xl border border-sky-900/50 p-6 hover:border-sky-800/50 transition-all">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'DASHBOARD.TOTAL_VALUE' | translate }}</p>
            <p class="text-3xl font-bold text-[var(--color-status-info)]">{{ formattedTotalValue() }}</p>
          </div>
          <div class="bg-[var(--color-info-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="DollarSign" class="!w-6 !h-6 text-sky-500"></lucide-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- Secondary Stats Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-surface-variant rounded-xl border border-theme p-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'DASHBOARD.TOTAL_USERS' | translate }}</p>
            <p class="text-3xl font-bold text-purple-400">{{ stats()?.totalUsers || 0 }}</p>
          </div>
          <div class="bg-[var(--color-accent-purple-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Users" class="!w-6 !h-6 text-purple-500"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant rounded-xl border border-theme p-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'NAV.WAREHOUSES' | translate }}</p>
            <p class="text-3xl font-bold text-cyan-400">{{ stats()?.totalWarehouses || 0 }}</p>
          </div>
          <div class="bg-[var(--color-accent-cyan-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Warehouse" class="!w-6 !h-6 text-cyan-500"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant rounded-xl border border-theme p-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'NAV.CATEGORIES' | translate }}</p>
            <p class="text-3xl font-bold text-amber-400">{{ stats()?.totalCategories || 0 }}</p>
          </div>
          <div class="bg-[var(--color-accent-amber-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="FolderOpen" class="!w-6 !h-6 text-amber-500"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant rounded-xl border border-theme p-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'DASHBOARD.OUT_OF_STOCK' | translate }}</p>
            <p class="text-3xl font-bold" style="color: var(--color-status-error)">{{ stats()?.outOfStockItems || 0 }}</p>
          </div>
          <div class="ds-icon-container--error p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Ban" class="!w-6 !h-6" style="color: var(--color-status-error)"></lucide-icon>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardStatsComponent {
  stats = input<DashboardStats | null>(null);

  formattedTotalValue = computed(() => {
    const value = this.stats()?.totalValueUSD || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  });
}
