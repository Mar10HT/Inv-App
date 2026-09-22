import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { InventoryItemInterface } from '../../../interfaces/inventory-item.interface';
import { AssignmentSummary } from '../reports.types';

@Component({
  selector: 'app-reports-assignments-tab',
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

    <!-- Assignment Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
      <div class="bg-surface-variant border border-theme rounded-xl p-6">
        <div class="flex items-center gap-4">
          <div class="bg-[var(--color-primary-container)] p-3 rounded-lg">
            <lucide-icon name="Monitor" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
          </div>
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'REPORTS.TOTAL_UNIQUE_ITEMS' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ assignedItems().length + unassignedUniqueItems().length }}</p>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-6">
        <div class="flex items-center gap-4">
          <div class="bg-emerald-500/20 p-3 rounded-lg">
            <lucide-icon name="UserCheck" class="!text-[var(--color-status-success)] !w-6 !h-6"></lucide-icon>
          </div>
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'REPORTS.ASSIGNED' | translate }}</p>
            <p class="text-3xl font-bold text-[var(--color-status-success)]">{{ assignedItems().length }}</p>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-6">
        <div class="flex items-center gap-4">
          <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
            <lucide-icon name="UserX" class="!text-[var(--color-on-surface-variant)] !w-6 !h-6"></lucide-icon>
          </div>
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'REPORTS.UNASSIGNED' | translate }}</p>
            <p class="text-3xl font-bold text-[var(--color-on-surface-variant)]">{{ unassignedUniqueItems().length }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Assignments by User -->
    <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden mb-6">
      <div class="px-6 py-4 border-b border-theme flex items-center gap-3">
        <lucide-icon name="Users" class="!text-[var(--color-primary)] !w-5 !h-5"></lucide-icon>
        <h2 class="text-lg font-semibold text-foreground">{{ 'REPORTS.ASSIGNMENTS_BY_USER' | translate }}</h2>
      </div>
      <div class="divide-y divide-[var(--color-border-subtle)]">
        @for (user of assignmentsByUser(); track user.userId) {
          <div class="p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold">
                  {{ user.userName.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="text-foreground font-medium">{{ user.userName }}</p>
                  <p class="text-sm text-[var(--color-on-surface-variant)]">{{ user.userEmail }}</p>
                </div>
              </div>
              <span class="bg-[var(--color-primary-container)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                {{ user.itemCount }} {{ 'REPORTS.ITEMS' | translate }}
              </span>
            </div>
            <div class="flex flex-wrap gap-2 ml-13">
              @for (item of user.items.slice(0, 5); track item.id) {
                <span class="bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] px-2 py-1 rounded text-xs">
                  {{ item.name }}
                </span>
              }
              @if (user.items.length > 5) {
                <span class="text-[var(--color-on-surface-variant)] text-xs py-1">+{{ user.items.length - 5 }} {{ 'REPORTS.MORE' | translate }}</span>
              }
            </div>
          </div>
        } @empty {
          <div class="p-8 text-center text-[var(--color-on-surface-variant)]">{{ 'REPORTS.NO_ASSIGNMENTS' | translate }}</div>
        }
      </div>
    </div>

    <!-- Unassigned Items -->
    @if (unassignedUniqueItems().length > 0) {
      <div class="bg-surface-variant border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-theme flex items-center gap-3">
          <lucide-icon name="UserX" class="!text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
          <h2 class="text-lg font-semibold text-[var(--color-on-surface-variant)]">{{ 'REPORTS.UNASSIGNED_ITEMS' | translate }}</h2>
          <span class="ml-auto bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] px-2 py-0.5 rounded text-sm font-medium">{{ unassignedUniqueItems().length }}</span>
        </div>
        <div class="p-4 max-h-[300px] overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (item of unassignedUniqueItems(); track item.id) {
              <div class="bg-[var(--color-surface-variant)] rounded-lg p-3">
                <p class="text-foreground font-medium truncate">{{ item.name }}</p>
                <p class="text-xs text-[var(--color-on-surface-variant)]">{{ item.serviceTag || item.serialNumber || '-' }}</p>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ReportsAssignmentsTab {
  assignedItems = input.required<InventoryItemInterface[]>();
  unassignedUniqueItems = input.required<InventoryItemInterface[]>();
  assignmentsByUser = input.required<AssignmentSummary[]>();

  csvRequested = output<void>();
  pdfRequested = output<void>();
}
