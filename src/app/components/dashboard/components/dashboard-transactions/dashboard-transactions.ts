import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragPlaceholder, CdkDragHandle } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { Transaction, TransactionType } from '../../../../interfaces/transaction.interface';

@Component({
  selector: 'app-dashboard-transactions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CdkDragPlaceholder,
    CdkDragHandle,
    LucideAngularModule,
    TranslateModule
  ],
  template: `
    <div cdkDragHandle class="px-6 py-4 border-b border-theme flex items-center justify-between cursor-grab active:cursor-grabbing">
      <div>
        <h2 class="text-lg font-semibold text-foreground">{{ 'TRANSACTION.TITLE' | translate }}</h2>
        <p class="text-slate-500 text-xs mt-1">{{ 'TRANSACTION.SUBTITLE' | translate }}</p>
      </div>
      <button
        (click)="$event.stopPropagation(); viewAll.emit()"
        class="text-sm text-sky-400 hover:text-sky-300 transition-colors cursor-pointer">
        {{ 'COMMON.VIEW_ALL' | translate }}
      </button>
    </div>

    @if (transactions().length === 0) {
      <div class="flex flex-col items-center justify-center py-12">
        <lucide-icon name="Receipt" class="!w-10 !h-10 text-slate-700 mb-3"></lucide-icon>
        <p class="text-slate-500 text-sm">{{ 'TRANSACTION.NO_TRANSACTIONS' | translate }}</p>
      </div>
    } @else {
      <div class="divide-y divide-[#242424]">
        @for (tx of transactions(); track trackByTransaction($index, tx)) {
          <div class="px-6 py-4 hover:bg-[#1e1e1e] transition-colors">
            <div class="flex items-center gap-4">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                [ngClass]="{
                  'bg-emerald-950/50': tx.type === TransactionType.IN,
                  'bg-rose-950/50': tx.type === TransactionType.OUT,
                  'bg-blue-950/50': tx.type === TransactionType.TRANSFER
                }">
                <lucide-icon [name]="getTransactionTypeIcon(tx.type)" [class]="getTransactionTypeClass(tx.type) + ' !w-5 !h-5'"></lucide-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground">
                  {{ 'TRANSACTION.TYPES.' + tx.type | translate }}
                </p>
                <p class="text-xs text-slate-500">
                  {{ tx.items.length }} {{ 'TRANSACTION.ITEMS_COUNT' | translate }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-500">{{ formatDateTime(tx.date) }}</p>
              </div>
            </div>
          </div>
        }
      </div>
    }

    <!-- Drag Placeholder -->
    <div *cdkDragPlaceholder class="bg-[#2a2a2a] rounded-xl border-2 border-dashed border-[#4d7c6f] h-full min-h-[300px]"></div>
  `
})
export class DashboardTransactionsComponent {
  transactions = input<Transaction[]>([]);

  viewAll = output<void>();

  TransactionType = TransactionType;

  private readonly dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  getTransactionTypeIcon(type: TransactionType): string {
    switch (type) {
      case TransactionType.IN: return 'ArrowDown';
      case TransactionType.OUT: return 'ArrowUp';
      case TransactionType.TRANSFER: return 'ArrowLeftRight';
      default: return 'Receipt';
    }
  }

  getTransactionTypeClass(type: TransactionType): string {
    switch (type) {
      case TransactionType.IN: return '!text-emerald-400';
      case TransactionType.OUT: return '!text-rose-400';
      case TransactionType.TRANSFER: return '!text-blue-400';
      default: return '!text-slate-400';
    }
  }

  formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return this.dateTimeFormatter.format(d);
  }

  trackByTransaction(index: number, transaction: Transaction): string {
    return transaction.id;
  }
}
