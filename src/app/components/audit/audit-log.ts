import { Component, computed, signal, inject, OnInit, effect, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuditService } from '../../services/audit.service';
import { AuditLog, AuditAction, AuditEntity } from '../../interfaces/audit.interface';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    LucideAngularModule,
    MatButtonModule,
    MatPaginatorModule,
    TranslateModule,
    DatePipe
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'AUDIT.TITLE' | translate }}</h1>
              <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'AUDIT.SUBTITLE' | translate }}</p>
            </div>
            <button
              (click)="exportToCSV()"
              class="ds-btn ds-btn--primary">
              <lucide-icon name="Download" class="shrink-0"></lucide-icon>
              {{ 'COMMON.EXPORT' | translate }}
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-surface-variant border border-theme rounded-xl p-6 mb-8">
          <div class="flex flex-col lg:flex-row gap-4">
            <!-- Search -->
            <div class="flex-1">
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="applyFilters()"
                  [placeholder]="'AUDIT.SEARCH_PLACEHOLDER' | translate"
                  class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                />
                <lucide-icon name="Search" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>

            <!-- Action Filter -->
            <div class="lg:w-48">
              <select
                [(ngModel)]="selectedAction"
                (ngModelChange)="applyFilters()"
                class="select-chevron w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer appearance-none"
              >
                <option value="all">{{ 'AUDIT.ALL_ACTIONS' | translate }}</option>
                @for (action of actions; track action) {
                  <option [value]="action">{{ getActionLabel(action) }}</option>
                }
              </select>
            </div>

            <!-- Entity Filter -->
            <div class="lg:w-48">
              <select
                [(ngModel)]="selectedEntity"
                (ngModelChange)="applyFilters()"
                class="select-chevron w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer appearance-none"
              >
                <option value="all">{{ 'AUDIT.ALL_ENTITIES' | translate }}</option>
                @for (entity of entities; track entity) {
                  <option [value]="entity">{{ getEntityLabel(entity) }}</option>
                }
              </select>
            </div>

            <!-- Clear Filters -->
            @if (hasFilters()) {
              <button
                (click)="clearFilters()"
                class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap">
                <lucide-icon name="X" class="!w-4 !h-4"></lucide-icon>
                {{ 'COMMON.CLEAR' | translate }}
              </button>
            }
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUDIT.TOTAL_LOGS' | translate }}</p>
            <p class="text-2xl font-bold text-foreground">{{ filteredLogs().length }}</p>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUDIT.CREATES' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-success)]">{{ actionCounts().create }}</p>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUDIT.UPDATES' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ actionCounts().update }}</p>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUDIT.DELETES' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ actionCounts().delete }}</p>
          </div>
        </div>

        <!-- Loading State -->
        @if (auditService.loading()) {
          <div class="flex items-center justify-center py-16">
            <div class="flex flex-col items-center gap-4">
              <div class="w-10 h-10 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin"></div>
              <p class="text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}...</p>
            </div>
          </div>
        }

        <!-- Audit Log List -->
        <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden" [class.hidden]="auditService.loading()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'AUDIT.LOG_LIST' | translate }}</h2>
            <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'AUDIT.SHOWING' | translate:{ count: paginatedLogs().length, total: filteredLogs().length } }}</p>
          </div>

          <!-- Log Items -->
          <div class="divide-y divide-[var(--color-border-subtle)]">
            @for (log of paginatedLogs(); track log.id) {
              <div class="p-4 hover:bg-[var(--color-surface-variant)] transition-colors">
                <div class="flex items-start gap-4">
                  <!-- Icon -->
                  <div [class]="getActionIconClass(log.action)" class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <lucide-icon [name]="getActionIcon(log.action)" class="!w-5 !h-5"></lucide-icon>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                      <div>
                        <p class="text-foreground font-medium">
                          <span [class]="getActionTextClass(log.action)">{{ getActionLabel(log.action) }}</span>
                          <span class="text-[var(--color-on-surface-variant)]"> - </span>
                          <span class="text-[var(--color-on-surface-variant)]">{{ getEntityLabel(log.entity) }}</span>
                        </p>
                        <p class="text-[var(--color-on-surface-variant)] text-sm">{{ log.entityName }}</p>
                      </div>
                      <div class="text-sm text-[var(--color-on-surface-variant)]">
                        {{ log.createdAt | date:'medium' }}
                      </div>
                    </div>

                    <!-- User Info -->
                    <div class="flex items-center gap-2 mt-2 text-sm text-[var(--color-on-surface-variant)]">
                      <lucide-icon name="User" class="!w-3.5 !h-3.5"></lucide-icon>
                      <span>{{ log.userName }}</span>
                      @if (log.userEmail && log.userEmail !== log.userName) {
                        <span class="text-[var(--color-on-surface-muted)]">({{ log.userEmail }})</span>
                      }
                    </div>

                    <!-- Changes -->
                    @if (log.changes && log.changes.length > 0) {
                      <div class="mt-3 bg-[var(--color-surface-variant)] rounded-lg p-3">
                        <p class="text-xs text-[var(--color-on-surface-variant)] mb-2">{{ 'AUDIT.CHANGES' | translate }}:</p>
                        <div class="space-y-1">
                          @for (change of log.changes; track change.field) {
                            <div class="text-xs">
                              <span class="text-[var(--color-on-surface-variant)]">{{ change.field }}:</span>
                              <span class="text-[var(--color-status-error)] line-through ml-2">{{ change.oldValue ?? 'null' }}</span>
                              <span class="text-[var(--color-on-surface-muted)] mx-1">&rarr;</span>
                              <span class="text-[var(--color-status-success)]">{{ change.newValue ?? 'null' }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- Metadata -->
                    @if (log.metadata) {
                      <div class="mt-2 text-xs text-[var(--color-on-surface-variant)]">
                        @if (log.metadata['assignedTo']) {
                          <span>{{ 'AUDIT.ASSIGNED_TO' | translate }}: {{ log.metadata['assignedTo'] }}</span>
                        }
                        @if (log.metadata['borrower']) {
                          <span>{{ 'AUDIT.BORROWER' | translate }}: {{ log.metadata['borrower'] }}</span>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="p-12 text-center">
                <lucide-icon name="History" class="!w-14 !h-14 text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
                <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'AUDIT.NO_LOGS' | translate }}</h3>
                <p class="text-[var(--color-on-surface-muted)]">{{ 'AUDIT.NO_LOGS_DESC' | translate }}</p>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (filteredLogs().length > pageSize) {
            <div class="border-t border-theme px-4 py-2">
              <mat-paginator
                [length]="filteredLogs().length"
                [pageIndex]="pageIndex"
                [pageSize]="pageSize"
                [pageSizeOptions]="[10, 25, 50, 100]"
                (page)="onPageChange($event)"
                showFirstLastButtons
                class="!bg-transparent">
              </mat-paginator>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AuditLogComponent implements OnInit {
  auditService = inject(AuditService);
  private translate = inject(TranslateService);

  // Expose enums
  AuditAction = AuditAction;
  AuditEntity = AuditEntity;

  // Filter options
  actions = Object.values(AuditAction);
  entities = Object.values(AuditEntity);

  // Filter state
  searchQuery = '';
  selectedAction = 'all';
  selectedEntity = 'all';

  // Pagination
  pageIndex = 0;
  pageSize = 10;

  // Filtered logs signal
  private filteredLogsSignal = signal<AuditLog[]>([]);
  filteredLogs = computed(() => this.filteredLogsSignal());

  // Paginated logs
  paginatedLogs = computed(() => {
    const logs = this.filteredLogsSignal();
    const start = this.pageIndex * this.pageSize;
    return logs.slice(start, start + this.pageSize);
  });

  // Memoized action counts - single pass instead of 3 separate filters
  actionCounts = computed(() => {
    const logs = this.auditService.logs();
    const counts = { create: 0, update: 0, delete: 0 };
    for (const log of logs) {
      if (log.action === AuditAction.CREATE) counts.create++;
      else if (log.action === AuditAction.UPDATE) counts.update++;
      else if (log.action === AuditAction.DELETE) counts.delete++;
    }
    return counts;
  });

  constructor() {
    // Re-apply filters when logs change (e.g., after API response)
    effect(() => {
      this.auditService.logs(); // Track the signal
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    // Load logs from backend API
    this.auditService.loadLogs({ limit: 200 });
  }

  applyFilters(): void {
    let logs = this.auditService.logs();

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      logs = logs.filter(log =>
        log.entityName.toLowerCase().includes(query) ||
        log.userName.toLowerCase().includes(query) ||
        (log.userEmail?.toLowerCase().includes(query) ?? false)
      );
    }

    // Action filter
    if (this.selectedAction !== 'all') {
      logs = logs.filter(log => log.action === this.selectedAction);
    }

    // Entity filter
    if (this.selectedEntity !== 'all') {
      logs = logs.filter(log => log.entity === this.selectedEntity);
    }

    // Sort by date descending
    logs = logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    this.filteredLogsSignal.set(logs);
    this.pageIndex = 0;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedAction = 'all';
    this.selectedEntity = 'all';
    this.applyFilters();
  }

  hasFilters(): boolean {
    return this.searchQuery !== '' || this.selectedAction !== 'all' || this.selectedEntity !== 'all';
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  getActionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
      [AuditAction.CREATE]: this.translate.instant('AUDIT.ACTION.CREATE'),
      [AuditAction.UPDATE]: this.translate.instant('AUDIT.ACTION.UPDATE'),
      [AuditAction.DELETE]: this.translate.instant('AUDIT.ACTION.DELETE'),
      [AuditAction.RESTORE]: this.translate.instant('AUDIT.ACTION.RESTORE'),
      [AuditAction.LOGIN]: this.translate.instant('AUDIT.ACTION.LOGIN'),
      [AuditAction.LOGOUT]: this.translate.instant('AUDIT.ACTION.LOGOUT'),
      [AuditAction.PASSWORD_CHANGE]: this.translate.instant('AUDIT.ACTION.PASSWORD_CHANGE'),
      [AuditAction.ASSIGN]: this.translate.instant('AUDIT.ACTION.ASSIGN'),
      [AuditAction.UNASSIGN]: this.translate.instant('AUDIT.ACTION.UNASSIGN'),
      [AuditAction.TRANSFER]: this.translate.instant('AUDIT.ACTION.TRANSFER'),
      [AuditAction.LOAN]: this.translate.instant('AUDIT.ACTION.LOAN'),
      [AuditAction.RETURN]: this.translate.instant('AUDIT.ACTION.RETURN')
    };
    return labels[action] || action;
  }

  getEntityLabel(entity: AuditEntity): string {
    const labels: Record<AuditEntity, string> = {
      [AuditEntity.INVENTORY_ITEM]: this.translate.instant('AUDIT.ENTITY.INVENTORY_ITEM'),
      [AuditEntity.WAREHOUSE]: this.translate.instant('AUDIT.ENTITY.WAREHOUSE'),
      [AuditEntity.SUPPLIER]: this.translate.instant('AUDIT.ENTITY.SUPPLIER'),
      [AuditEntity.CATEGORY]: this.translate.instant('AUDIT.ENTITY.CATEGORY'),
      [AuditEntity.USER]: this.translate.instant('AUDIT.ENTITY.USER'),
      [AuditEntity.TRANSACTION]: this.translate.instant('AUDIT.ENTITY.TRANSACTION'),
      [AuditEntity.LOAN]: this.translate.instant('AUDIT.ENTITY.LOAN')
    };
    return labels[entity] || entity;
  }

  getActionIcon(action: AuditAction): string {
    const icons: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'PlusCircle',
      [AuditAction.UPDATE]: 'Pencil',
      [AuditAction.DELETE]: 'Trash2',
      [AuditAction.RESTORE]: 'RotateCcw',
      [AuditAction.LOGIN]: 'LogIn',
      [AuditAction.LOGOUT]: 'LogOut',
      [AuditAction.PASSWORD_CHANGE]: 'KeyRound',
      [AuditAction.ASSIGN]: 'UserPlus',
      [AuditAction.UNASSIGN]: 'UserMinus',
      [AuditAction.TRANSFER]: 'ArrowLeftRight',
      [AuditAction.LOAN]: 'ArrowUpRight',
      [AuditAction.RETURN]: 'ArrowDownLeft'
    };
    return icons[action] || 'Info';
  }

  getActionIconClass(action: AuditAction): string {
    const classes: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'bg-[var(--color-success-bg)] text-[var(--color-status-success)]',
      [AuditAction.UPDATE]: 'bg-[var(--color-info-bg)] text-[var(--color-status-info)]',
      [AuditAction.DELETE]: 'bg-[var(--color-error-bg)] text-[var(--color-status-error)]',
      [AuditAction.RESTORE]: 'bg-[var(--color-accent-indigo-bg)] text-[var(--color-accent-indigo)]',
      [AuditAction.LOGIN]: 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]',
      [AuditAction.LOGOUT]: 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]',
      [AuditAction.PASSWORD_CHANGE]: 'bg-[var(--color-accent-yellow-bg)] text-[var(--color-accent-yellow)]',
      [AuditAction.ASSIGN]: 'bg-[var(--color-accent-purple-bg)] text-[var(--color-accent-purple)]',
      [AuditAction.UNASSIGN]: 'bg-[var(--color-warning-bg)] text-[var(--color-status-warning)]',
      [AuditAction.TRANSFER]: 'bg-[var(--color-accent-cyan-bg)] text-[var(--color-accent-cyan)]',
      [AuditAction.LOAN]: 'bg-[var(--color-accent-amber-bg)] text-[var(--color-accent-amber)]',
      [AuditAction.RETURN]: 'bg-[var(--color-accent-teal-bg)] text-[var(--color-accent-teal)]'
    };
    return classes[action] || 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]';
  }

  getActionTextClass(action: AuditAction): string {
    const classes: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'text-[var(--color-status-success)]',
      [AuditAction.UPDATE]: 'text-[var(--color-status-info)]',
      [AuditAction.DELETE]: 'text-[var(--color-status-error)]',
      [AuditAction.RESTORE]: 'text-indigo-400',
      [AuditAction.LOGIN]: 'text-[var(--color-on-surface-variant)]',
      [AuditAction.LOGOUT]: 'text-[var(--color-on-surface-variant)]',
      [AuditAction.PASSWORD_CHANGE]: 'text-yellow-400',
      [AuditAction.ASSIGN]: 'text-purple-400',
      [AuditAction.UNASSIGN]: 'text-[var(--color-status-warning)]',
      [AuditAction.TRANSFER]: 'text-cyan-400',
      [AuditAction.LOAN]: 'text-amber-400',
      [AuditAction.RETURN]: 'text-teal-400'
    };
    return classes[action] || 'text-[var(--color-on-surface-variant)]';
  }

  exportToCSV(): void {
    this.auditService.exportToXLSX(this.filteredLogs());
  }
}
