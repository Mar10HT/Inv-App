import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { Transaction, TransactionType } from '../../../interfaces/transaction.interface';
import { formatDateTime } from '../reports.format';
import { TransactionStats } from '../reports.types';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-reports-transactions-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, TranslateModule, Spinner],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center py-12">
        <app-spinner></app-spinner>
        <span class="ml-3 text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}...</span>
      </div>
    } @else {
      <!-- Filters -->
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div class="flex flex-wrap items-center gap-3">
          <input
            type="date"
            [value]="dateFrom()"
            (change)="dateFromChange.emit($any($event.target).value)"
            class="bg-[var(--color-surface-variant)] border border-theme rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-[var(--color-primary)] transition-all"
            placeholder="Desde">
          <input
            type="date"
            [value]="dateTo()"
            (change)="dateToChange.emit($any($event.target).value)"
            class="bg-[var(--color-surface-variant)] border border-theme rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-[var(--color-primary)] transition-all"
            placeholder="Hasta">
          <select
            [value]="typeFilter()"
            (change)="typeFilterChange.emit($any($event.target).value)"
            class="bg-[var(--color-surface-variant)] border border-theme rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-[var(--color-primary)] transition-all cursor-pointer">
            <option value="ALL">{{ 'REPORTS.ALL_TYPES' | translate }}</option>
            <option value="IN">{{ 'TRANSACTIONS.TYPE.IN' | translate }}</option>
            <option value="OUT">{{ 'TRANSACTIONS.TYPE.OUT' | translate }}</option>
            <option value="TRANSFER">{{ 'TRANSACTIONS.TYPE.TRANSFER' | translate }}</option>
          </select>
          @if (dateFrom() || dateTo() || typeFilter() !== 'ALL') {
            <button
              (click)="filtersCleared.emit()"
              class="text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors flex items-center gap-1">
              <lucide-icon name="X" class="!w-4 !h-4"></lucide-icon>
              {{ 'COMMON.CLEAR' | translate }}
            </button>
          }
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

      <!-- Transaction Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="bg-surface-variant border border-theme rounded-xl p-4">
          <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'REPORTS.TOTAL_TRANSACTIONS' | translate }}</p>
          <p class="text-2xl font-bold text-foreground">{{ stats().total }}</p>
        </div>
        <div class="bg-surface-variant border border-theme rounded-xl p-4">
          <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'TRANSACTIONS.TYPE.IN' | translate }}</p>
          <p class="text-2xl font-bold text-[var(--color-status-success)]">{{ stats().inCount }}</p>
        </div>
        <div class="bg-surface-variant border border-theme rounded-xl p-4">
          <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'TRANSACTIONS.TYPE.OUT' | translate }}</p>
          <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ stats().outCount }}</p>
        </div>
        <div class="bg-surface-variant border border-theme rounded-xl p-4">
          <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'TRANSACTIONS.TYPE.TRANSFER' | translate }}</p>
          <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ stats().transferCount }}</p>
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
        <!-- Desktop Table -->
        <div class="hidden lg:block overflow-x-auto max-h-[600px] overflow-y-auto">
          <table class="w-full">
            <thead class="sticky top-0 z-10">
              <tr class="bg-[var(--color-surface)]">
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.DATE' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.TYPE' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.FROM' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.TO' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.USER' | translate }}</th>
                <th class="text-center px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'REPORTS.TABLE.ITEMS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-subtle)]">
              @for (tx of transactions(); track tx.id) {
                <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                  <td class="px-6 py-4 text-foreground">{{ formatDateTime(tx.date) }}</td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      [class]="tx.type === 'IN' ? 'bg-emerald-500/20 text-[var(--color-status-success)]' : tx.type === 'OUT' ? 'bg-rose-500/20 text-[var(--color-status-error)]' : 'bg-blue-500/20 text-[var(--color-status-info)]'">
                      <lucide-icon [name]="getTransactionIcon(tx.type)" class="!text-sm !w-4 !h-4"></lucide-icon>
                      {{ tx.type }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-[var(--color-on-surface-variant)]">{{ tx.sourceWarehouse?.name || '-' }}</td>
                  <td class="px-6 py-4 text-[var(--color-on-surface-variant)]">{{ tx.destinationWarehouse?.name || '-' }}</td>
                  <td class="px-6 py-4 text-[var(--color-on-surface-variant)]">{{ tx.user?.name || tx.user?.email || '-' }}</td>
                  <td class="px-6 py-4 text-center text-foreground">{{ tx.items.length }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-[var(--color-on-surface-variant)]">{{ 'COMMON.NO_DATA' | translate }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View - GRID 2 COLUMNS -->
        <div class="lg:hidden p-4 max-h-[600px] overflow-y-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (tx of transactions(); track tx.id) {
              <div class="bg-[var(--color-surface)] border border-theme rounded-xl p-3 hover:border-[var(--color-border)] transition-colors">
                <!-- Type Badge -->
                <div class="flex justify-between items-start mb-2">
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                    [class]="tx.type === 'IN' ? 'bg-emerald-500/20 text-[var(--color-status-success)]' : tx.type === 'OUT' ? 'bg-rose-500/20 text-[var(--color-status-error)]' : 'bg-blue-500/20 text-[var(--color-status-info)]'">
                    <lucide-icon [name]="getTransactionIcon(tx.type)" class="!w-3 !h-3"></lucide-icon>
                    {{ tx.type }}
                  </span>
                  <span class="text-foreground font-medium text-xs">{{ tx.items.length }} items</span>
                </div>

                <!-- Date -->
                <p class="text-[var(--color-on-surface-variant)] text-xs mb-2">{{ formatDateTime(tx.date) }}</p>

                <!-- Warehouses -->
                <div class="text-xs space-y-0.5 mb-1">
                  @if (tx.sourceWarehouse) {
                    <div class="text-[var(--color-on-surface-variant)] truncate">
                      <span class="text-[var(--color-on-surface-muted)]">{{ 'TRANSACTION.FROM' | translate }}:</span> {{ tx.sourceWarehouse.name }}
                    </div>
                  }
                  @if (tx.destinationWarehouse) {
                    <div class="text-[var(--color-on-surface-variant)] truncate">
                      <span class="text-[var(--color-on-surface-muted)]">{{ 'TRANSACTION.TO' | translate }}:</span> {{ tx.destinationWarehouse.name }}
                    </div>
                  }
                </div>

                <!-- User -->
                <p class="text-[var(--color-on-surface-muted)] text-[10px] truncate">{{ tx.user?.name || tx.user?.email || '-' }}</p>
              </div>
            } @empty {
              <div class="col-span-2 py-8 text-center text-[var(--color-on-surface-variant)]">{{ 'COMMON.NO_DATA' | translate }}</div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ReportsTransactionsTab {
  loading = input(false);
  dateFrom = input('');
  dateTo = input('');
  typeFilter = input('ALL');
  stats = input.required<TransactionStats>();
  transactions = input.required<Transaction[]>();

  dateFromChange = output<string>();
  dateToChange = output<string>();
  typeFilterChange = output<string>();
  filtersCleared = output<void>();
  csvRequested = output<void>();
  pdfRequested = output<void>();

  formatDateTime = formatDateTime;

  private static readonly ICONS: Partial<Record<TransactionType, string>> = {
    [TransactionType.IN]: 'ArrowDown',
    [TransactionType.OUT]: 'ArrowUp',
    [TransactionType.TRANSFER]: 'ArrowLeftRight'
  };

  getTransactionIcon(type: TransactionType): string {
    return ReportsTransactionsTab.ICONS[type] ?? 'Receipt';
  }
}
