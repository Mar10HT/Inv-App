import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragPlaceholder, CdkDragHandle } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

export interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  category?: { name: string };
}

@Component({
  selector: 'app-dashboard-low-stock',
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
        <h2 class="text-lg font-semibold text-foreground">{{ 'DASHBOARD.LOW_STOCK' | translate }}</h2>
        <p class="text-slate-500 text-xs mt-1">{{ 'DASHBOARD.MANAGE_ITEMS' | translate }}</p>
      </div>
      <button
        (click)="$event.stopPropagation(); viewAll.emit()"
        class="text-sm text-sky-400 hover:text-sky-300 transition-colors cursor-pointer">
        {{ 'COMMON.VIEW_ALL' | translate }}
      </button>
    </div>

    @if (items().length === 0) {
      <div class="flex flex-col items-center justify-center py-12">
        <lucide-icon name="CheckCircle2" class="!w-10 !h-10 text-emerald-500 mb-3"></lucide-icon>
        <p class="text-slate-500 text-sm">{{ 'COMMON.NO_DATA' | translate }}</p>
      </div>
    } @else {
      <div class="divide-y divide-[#242424] max-h-[500px] overflow-y-auto">
        @for (item of items().slice(0, 10); track item.id) {
          <div
            (click)="itemClick.emit(item)"
            class="px-6 py-4 hover:bg-[#1e1e1e] transition-colors cursor-pointer">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-orange-950/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <lucide-icon name="AlertTriangle" class="!w-5 !h-5 text-orange-500"></lucide-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground truncate">{{ item.name }}</p>
                <p class="text-xs text-slate-500">{{ item.category?.name || '-' }}</p>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold text-orange-400">{{ item.quantity }}</p>
                <p class="text-xs text-slate-500">min: {{ item.minQuantity }}</p>
              </div>
            </div>
          </div>
        }
      </div>
      @if (items().length > 10) {
        <div class="px-6 py-3 bg-surface-container border-t border-theme text-center">
          <p class="text-xs text-slate-500">
            Showing 10 of {{ items().length }} low stock items
          </p>
        </div>
      }
    }

    <!-- Drag Placeholder -->
    <div *cdkDragPlaceholder class="bg-[#2a2a2a] rounded-xl border-2 border-dashed border-[#4d7c6f] h-full min-h-[300px]"></div>
  `
})
export class DashboardLowStockComponent {
  items = input<LowStockItem[]>([]);

  viewAll = output<void>();
  itemClick = output<LowStockItem>();
}
