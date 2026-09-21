import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { InventoryItemInterface, InventoryStatus } from '../../../../interfaces/inventory-item.interface';

@Component({
  selector: 'app-dashboard-recent-items',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, LucideAngularModule, TranslateModule],
  template: `
    <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
      <div class="px-6 py-4 border-b border-theme flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-foreground">{{ 'DASHBOARD.RECENT_ITEMS' | translate }}</h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'DASHBOARD.MANAGE_ITEMS' | translate }}</p>
        </div>
        <button
          (click)="viewAllRequested.emit()"
          class="text-sm text-sky-400 hover:text-sky-300 transition-colors">
          {{ 'COMMON.VIEW_ALL' | translate }}
        </button>
      </div>

      @if (items().length === 0 && !loading()) {
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center py-16">
          <lucide-icon name="Package" class="!w-14 !h-14 text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
          <p class="text-[var(--color-on-surface-variant)] text-lg mb-2">{{ 'INVENTORY.NO_ITEMS' | translate }}</p>
          <p class="text-[var(--color-on-surface-muted)] text-sm mb-6">{{ 'INVENTORY.NO_ITEMS_DESC' | translate }}</p>
          <button
            (click)="addRequested.emit()"
            class="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-hover)] transition-all font-medium">
            {{ 'DASHBOARD.ADD_NEW_ITEM' | translate }}
          </button>
        </div>
      } @else {
        <!-- Desktop Table View -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full" [attr.aria-label]="'DASHBOARD.RECENT_ITEMS' | translate">
            <thead>
              <tr class="bg-surface-container">
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[300px]">{{ 'DASHBOARD.TABLE.ITEM' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[120px]">{{ 'DASHBOARD.TABLE.CATEGORY' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.QUANTITY' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.PRICE' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[100px]">{{ 'DASHBOARD.TABLE.STATUS' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-subtle)]">
              @for (item of items(); track trackByFn($index, item)) {
                <tr
                  (click)="viewRequested.emit(item)"
                  class="hover:bg-[var(--color-surface-variant)] transition-colors cursor-pointer group">
                  <!-- Item Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-[var(--color-primary-container)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <lucide-icon name="Package" class="!w-5 !h-5 text-[var(--color-primary)]"></lucide-icon>
                      </div>
                      <div class="min-w-0 max-w-[350px]">
                        <p class="font-medium text-foreground truncate">{{ item.name }}</p>
                        <p class="text-sm text-[var(--color-on-surface-variant)] truncate">{{ item.description || '-' }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Category Column -->
                  <td class="px-6 py-4">
                    <span class="text-[var(--color-on-surface-variant)]">{{ item.category }}</span>
                  </td>

                  <!-- Quantity Column -->
                  <td class="px-6 py-4">
                    <span class="text-foreground font-medium">{{ item.quantity }}</span>
                  </td>

                  <!-- Price Column -->
                  <td class="px-6 py-4">
                    @if (item.price) {
                      <span class="text-foreground font-medium">{{ formatCurrency(item.price, item.currency) }}</span>
                    } @else {
                      <span class="text-[var(--color-on-surface-muted)]">-</span>
                    }
                  </td>

                  <!-- Status Column -->
                  <td class="px-6 py-4">
                    <span
                      [ngClass]="{
                        'text-[var(--color-status-success)] bg-[var(--color-success-bg)] border border-[var(--color-success-border)]': item.status === 'IN_STOCK',
                        'text-[var(--color-status-warning)] bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]': item.status === 'LOW_STOCK',
                        'text-[var(--color-status-error)] bg-[var(--color-error-bg)] border border-[var(--color-error-border)]': item.status === 'OUT_OF_STOCK'
                      }"
                      class="px-3 py-1 rounded-md text-xs font-medium inline-block">
                      {{ getStatusKey(item.status) | translate }}
                    </span>
                  </td>

                  <!-- Actions Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); viewRequested.emit(item)"
                        [attr.aria-label]="('COMMON.VIEW' | translate) + ' ' + item.name"
                        class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-info)] hover:bg-[var(--color-info-bg)] transition-colors">
                        <lucide-icon name="Eye" class="!w-5 !h-5"></lucide-icon>
                      </button>
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); editRequested.emit(item)"
                        [attr.aria-label]="('COMMON.EDIT' | translate) + ' ' + item.name"
                        class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
                        <lucide-icon name="Pencil" class="!w-5 !h-5"></lucide-icon>
                      </button>
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); deleteRequested.emit(item)"
                        [attr.aria-label]="('COMMON.DELETE' | translate) + ' ' + item.name"
                        class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors">
                        <lucide-icon name="Trash2" class="!w-5 !h-5"></lucide-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View - GRID 2 COLUMNS -->
        <div class="lg:hidden p-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (item of items(); track trackByFn($index, item)) {
              <div
                class="bg-[var(--color-surface)] border border-theme rounded-xl p-3 hover:border-[var(--color-border)] transition-colors cursor-pointer"
                role="button"
                tabindex="0"
                (click)="viewRequested.emit(item)"
                (keydown.enter)="viewRequested.emit(item)">
                <!-- Status Badge -->
                <div class="flex justify-between items-start mb-2">
                  <div class="w-8 h-8 bg-[var(--color-primary-container)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <lucide-icon name="Package" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                  </div>
                  <span
                    [ngClass]="{
                      'bg-[var(--color-success-bg)] text-[var(--color-status-success)]': item.status === 'IN_STOCK',
                      'bg-[var(--color-warning-bg)] text-[var(--color-status-warning)]': item.status === 'LOW_STOCK',
                      'bg-[var(--color-error-bg)] text-[var(--color-status-error)]': item.status === 'OUT_OF_STOCK'
                    }"
                    class="px-1.5 py-0.5 rounded text-[10px] font-medium">
                    {{ getStatusKey(item.status) | translate }}
                  </span>
                </div>

                <!-- Item Name -->
                <h3 class="font-semibold text-foreground text-sm mb-1 truncate">{{ item.name }}</h3>
                <p class="text-[var(--color-on-surface-variant)] text-xs truncate mb-2">{{ item.category }}</p>

                <!-- Quick Info -->
                <div class="flex items-center justify-between text-xs mb-2">
                  <span class="text-[var(--color-on-surface-variant)]">{{ 'COMMON.QTY_SHORT' | translate }}: <span class="text-foreground font-medium">{{ item.quantity }}</span></span>
                  @if (item.price) {
                    <span class="text-[var(--color-status-success)] font-medium">{{ formatCurrency(item.price, item.currency) }}</span>
                  }
                </div>

                <!-- Actions -->
                <div
                  class="flex justify-end gap-1 pt-2 border-t border-[var(--color-border-subtle)]"
                  role="presentation"
                  (click)="$event.stopPropagation()"
                  (keydown)="$event.stopPropagation()">
                  <button
                    type="button"
                    (click)="$event.stopPropagation(); viewRequested.emit(item)"
                    [attr.aria-label]="('COMMON.VIEW' | translate) + ' ' + item.name"
                    class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-info)] hover:bg-[var(--color-info-bg)] transition-colors">
                    <lucide-icon name="Eye" class="!w-4 !h-4"></lucide-icon>
                  </button>
                  <button
                    type="button"
                    (click)="$event.stopPropagation(); editRequested.emit(item)"
                    [attr.aria-label]="('COMMON.EDIT' | translate) + ' ' + item.name"
                    class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
                    <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                  </button>
                  <button
                    type="button"
                    (click)="$event.stopPropagation(); deleteRequested.emit(item)"
                    [attr.aria-label]="('COMMON.DELETE' | translate) + ' ' + item.name"
                    class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors">
                    <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardRecentItems {
  items = input.required<InventoryItemInterface[]>();
  loading = input(false);

  viewRequested = output<InventoryItemInterface>();
  editRequested = output<InventoryItemInterface>();
  deleteRequested = output<InventoryItemInterface>();
  addRequested = output<void>();
  viewAllRequested = output<void>();

  getStatusKey(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'INVENTORY.STATUS.IN_STOCK';
      case InventoryStatus.LOW_STOCK: return 'INVENTORY.STATUS.LOW_STOCK';
      case InventoryStatus.OUT_OF_STOCK: return 'INVENTORY.STATUS.OUT_OF_STOCK';
      case InventoryStatus.IN_USE: return 'INVENTORY.STATUS.IN_USE';
      default: return status;
    }
  }

  formatCurrency(value: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  trackByFn(index: number, item: InventoryItemInterface): string {
    return item.id;
  }
}
