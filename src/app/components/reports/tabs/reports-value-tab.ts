import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ReportCurrency, TopItem, ValueSummary } from '../reports.types';

@Component({
  selector: 'app-reports-value-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, TranslateModule],
  template: `
    <!-- Actions Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <select
          [value]="currency()"
          (change)="currencyChange.emit($any($event.target).value)"
          class="bg-[var(--color-surface-variant)] border border-theme rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-[var(--color-primary)] transition-all cursor-pointer">
          @for (option of currencyOptions; track option.value) {
            <option [value]="option.value">
              {{ option.label.includes('.') ? (option.label | translate) : option.label }}
            </option>
          }
        </select>
      </div>
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

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'REPORTS.TOTAL_VALUE' | translate }}</p>
            <p class="text-3xl font-bold text-[var(--color-primary)]">{{ formatCurrency(totalValue()) }}</p>
          </div>
          <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="DollarSign" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'REPORTS.TOTAL_ITEMS' | translate }}</p>
            <p class="text-3xl font-bold text-[var(--color-status-info)]">{{ totalItemsCount() }}</p>
          </div>
          <div class="bg-[var(--color-info-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Package" class="!text-sky-500 !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'REPORTS.CATEGORIES' | translate }}</p>
            <p class="text-3xl font-bold text-[var(--color-accent-purple)]">{{ valueByCategory().length }}</p>
          </div>
          <div class="bg-[var(--color-accent-purple-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Tag" class="!text-[var(--color-accent-purple)] !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'REPORTS.WAREHOUSES' | translate }}</p>
            <p class="text-3xl font-bold text-[var(--color-status-warning)]">{{ valueByWarehouse().length }}</p>
          </div>
          <div class="bg-[var(--color-warning-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Warehouse" class="!text-orange-500 !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- Reports Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      @for (section of [{title: 'REPORTS.BY_CATEGORY', icon: 'Tag', data: valueByCategory()}, {title: 'REPORTS.BY_WAREHOUSE', icon: 'Warehouse', data: valueByWarehouse()}, {title: 'REPORTS.BY_SUPPLIER', icon: 'Truck', data: valueBySupplier()}]; track section.title) {
        <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-theme flex items-center gap-3">
            <lucide-icon [name]="section.icon" class="!text-[var(--color-primary)] !w-5 !h-5"></lucide-icon>
            <h2 class="text-lg font-semibold text-foreground">{{ section.title | translate }}</h2>
          </div>
          <div class="p-4 max-h-[400px] overflow-y-auto">
            <div class="grid grid-cols-[1fr_70px_100px] gap-3 px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider border-b border-theme">
              <span>{{ 'REPORTS.TABLE.NAME' | translate }}</span>
              <span class="text-center">{{ 'REPORTS.TABLE.ITEMS' | translate }}</span>
              <span class="text-right">{{ 'REPORTS.TABLE.VALUE' | translate }}</span>
            </div>
            @for (item of section.data; track item.label) {
              <div class="grid grid-cols-[1fr_70px_100px] gap-3 px-3 py-3 text-sm hover:bg-[var(--color-surface-variant)] rounded-lg transition-colors">
                <span class="text-foreground truncate">{{ item.label }}</span>
                <span class="text-center text-[var(--color-on-surface-variant)]">{{ item.count }}</span>
                <span class="text-right text-[var(--color-primary)] font-semibold">{{ formatCurrency(item.value) }}</span>
              </div>
            } @empty {
              <div class="py-8 text-center text-[var(--color-on-surface-variant)]">{{ 'COMMON.NO_DATA' | translate }}</div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Top Items -->
    <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
      <div class="px-6 py-4 border-b border-theme flex items-center gap-3">
        <lucide-icon name="TrendingUp" class="!text-[var(--color-primary)] !w-5 !h-5"></lucide-icon>
        <h2 class="text-lg font-semibold text-foreground">{{ 'REPORTS.TOP_ITEMS' | translate }}</h2>
      </div>

      <!-- Desktop Table -->
      <div class="hidden lg:block overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-[var(--color-surface)]">
              <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.ITEM' | translate }}</th>
              <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.CATEGORY' | translate }}</th>
              <th class="text-center px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.QTY' | translate }}</th>
              <th class="text-right px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.UNIT_PRICE' | translate }}</th>
              <th class="text-right px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.TOTAL' | translate }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border-subtle)]">
            @for (item of topItems(); track item.id; let i = $index) {
              <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <span class="w-6 h-6 bg-[var(--color-surface-variant)] rounded-md flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">{{ i + 1 }}</span>
                    <span class="text-foreground font-medium">{{ item.name }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-[var(--color-on-surface-variant)]">{{ item.category }}</td>
                <td class="px-6 py-4 text-center text-foreground">{{ item.quantity }}</td>
                <td class="px-6 py-4 text-right text-[var(--color-on-surface-variant)]">{{ formatCurrency(item.price || 0) }}</td>
                <td class="px-6 py-4 text-right text-[var(--color-primary)] font-bold">{{ formatCurrency(item.totalValue) }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-6 py-12 text-center text-[var(--color-on-surface-variant)]">{{ 'COMMON.NO_DATA' | translate }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View - GRID 2 COLUMNS -->
      <div class="lg:hidden p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (item of topItems(); track item.id; let i = $index) {
            <div class="bg-[var(--color-surface)] border border-theme rounded-xl p-3 hover:border-[var(--color-border)] transition-colors">
              <!-- Rank Badge -->
              <div class="flex justify-between items-start mb-2">
                <span class="w-6 h-6 bg-[var(--color-primary-container)] rounded-md flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">{{ i + 1 }}</span>
                <span class="text-[var(--color-primary)] font-bold text-sm">{{ formatCurrency(item.totalValue) }}</span>
              </div>

              <!-- Item Name -->
              <h3 class="font-semibold text-foreground text-sm mb-1 truncate">{{ item.name }}</h3>
              <p class="text-[var(--color-on-surface-variant)] text-xs truncate mb-2">{{ item.category }}</p>

              <!-- Quick Info -->
              <div class="flex items-center justify-between text-xs">
                <span class="text-[var(--color-on-surface-variant)]">{{ 'COMMON.QTY_SHORT' | translate }}: <span class="text-foreground font-medium">{{ item.quantity }}</span></span>
                <span class="text-[var(--color-on-surface-variant)]">{{ formatCurrency(item.price || 0) }}/u</span>
              </div>
            </div>
          } @empty {
            <div class="col-span-2 py-8 text-center text-[var(--color-on-surface-variant)]">{{ 'COMMON.NO_DATA' | translate }}</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ReportsValueTab {
  currency = input.required<ReportCurrency>();
  totalValue = input.required<number>();
  totalItemsCount = input.required<number>();
  valueByCategory = input.required<ValueSummary[]>();
  valueByWarehouse = input.required<ValueSummary[]>();
  valueBySupplier = input.required<ValueSummary[]>();
  topItems = input.required<TopItem[]>();

  currencyChange = output<ReportCurrency>();
  csvRequested = output<void>();
  pdfRequested = output<void>();

  currencyOptions: { value: ReportCurrency; label: string }[] = [
    { value: 'USD', label: 'USD' },
    { value: 'HNL', label: 'HNL' },
    { value: 'ALL', label: 'REPORTS.ALL_CURRENCIES' }
  ];

  getCurrencySymbol(): string {
    const currency = this.currency();
    if (currency === 'ALL') return '$';
    return currency === 'USD' ? '$' : 'L';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatCurrency(value: number): string {
    return `${this.getCurrencySymbol()}${this.formatNumber(value)}`;
  }
}
