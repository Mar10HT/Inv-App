import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuditService } from '../../services/audit.service';
import { AuditLog, AuditAction, AuditEntity } from '../../interfaces/audit.interface';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
    TranslateModule
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'AUDIT.TITLE' | translate }}</h1>
              <p class="text-slate-500 text-lg">{{ 'AUDIT.SUBTITLE' | translate }}</p>
            </div>
            <button
              (click)="exportToCSV()"
              class="bg-[#4d7c6f] hover:bg-[#5d8c7f] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium">
              <mat-icon class="!leading-none !block">download</mat-icon>
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
                  class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-slate-500 focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all"
                />
                <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 !text-slate-500 !text-xl !leading-none !block">search</mat-icon>
              </div>
            </div>

            <!-- Action Filter -->
            <div class="lg:w-48">
              <select
                [(ngModel)]="selectedAction"
                (ngModelChange)="applyFilters()"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all cursor-pointer appearance-none"
                style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(148 163 184)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25rem; padding-right: 2.5rem;"
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
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all cursor-pointer appearance-none"
                style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(148 163 184)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25rem; padding-right: 2.5rem;"
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
                class="bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap">
                <mat-icon class="!text-lg !leading-none !block">clear</mat-icon>
                {{ 'COMMON.CLEAR' | translate }}
              </button>
            }
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <p class="text-sm text-slate-500">{{ 'AUDIT.TOTAL_LOGS' | translate }}</p>
            <p class="text-2xl font-bold text-foreground">{{ filteredLogs().length }}</p>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <p class="text-sm text-slate-500">{{ 'AUDIT.CREATES' | translate }}</p>
            <p class="text-2xl font-bold text-emerald-400">{{ countByAction(AuditAction.CREATE) }}</p>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <p class="text-sm text-slate-500">{{ 'AUDIT.UPDATES' | translate }}</p>
            <p class="text-2xl font-bold text-sky-400">{{ countByAction(AuditAction.UPDATE) }}</p>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <p class="text-sm text-slate-500">{{ 'AUDIT.DELETES' | translate }}</p>
            <p class="text-2xl font-bold text-red-400">{{ countByAction(AuditAction.DELETE) }}</p>
          </div>
        </div>

        <!-- Audit Log List -->
        <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'AUDIT.LOG_LIST' | translate }}</h2>
            <p class="text-slate-500 text-sm mt-1">{{ 'AUDIT.SHOWING' | translate:{ count: paginatedLogs().length, total: filteredLogs().length } }}</p>
          </div>

          <!-- Log Items -->
          <div class="divide-y divide-[#1e1e1e]">
            @for (log of paginatedLogs(); track log.id) {
              <div class="p-4 hover:bg-[#1e1e1e] transition-colors">
                <div class="flex items-start gap-4">
                  <!-- Icon -->
                  <div [class]="getActionIconClass(log.action)" class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <mat-icon class="!text-lg !leading-none !block">{{ getActionIcon(log.action) }}</mat-icon>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                      <div>
                        <p class="text-foreground font-medium">
                          <span [class]="getActionTextClass(log.action)">{{ getActionLabel(log.action) }}</span>
                          <span class="text-slate-400"> - </span>
                          <span class="text-slate-400">{{ getEntityLabel(log.entity) }}</span>
                        </p>
                        <p class="text-slate-400 text-sm">{{ log.entityName }}</p>
                      </div>
                      <div class="text-sm text-slate-500">
                        {{ formatDate(log.createdAt) }}
                      </div>
                    </div>

                    <!-- User Info -->
                    <div class="flex items-center gap-2 mt-2 text-sm text-slate-500">
                      <mat-icon class="!text-sm !leading-none !block">person</mat-icon>
                      <span>{{ log.userName }}</span>
                      @if (log.userEmail) {
                        <span class="text-slate-600">({{ log.userEmail }})</span>
                      }
                    </div>

                    <!-- Changes -->
                    @if (log.changes && log.changes.length > 0) {
                      <div class="mt-3 bg-[#1a1a1a] rounded-lg p-3">
                        <p class="text-xs text-slate-500 mb-2">{{ 'AUDIT.CHANGES' | translate }}:</p>
                        <div class="space-y-1">
                          @for (change of log.changes; track change.field) {
                            <div class="text-xs">
                              <span class="text-slate-400">{{ change.field }}:</span>
                              <span class="text-red-400 line-through ml-2">{{ change.oldValue ?? 'null' }}</span>
                              <span class="text-slate-600 mx-1">&rarr;</span>
                              <span class="text-emerald-400">{{ change.newValue ?? 'null' }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- Metadata -->
                    @if (log.metadata) {
                      <div class="mt-2 text-xs text-slate-500">
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
                <mat-icon class="!text-6xl !text-slate-700 mb-4 !leading-none !block">history</mat-icon>
                <h3 class="text-lg font-semibold text-slate-400 mb-2">{{ 'AUDIT.NO_LOGS' | translate }}</h3>
                <p class="text-slate-600">{{ 'AUDIT.NO_LOGS_DESC' | translate }}</p>
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
  private auditService = inject(AuditService);
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

  ngOnInit(): void {
    this.applyFilters();
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

  countByAction(action: AuditAction): number {
    return this.auditService.logs().filter(log => log.action === action).length;
  }

  getActionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
      [AuditAction.CREATE]: this.translate.instant('AUDIT.ACTION.CREATE'),
      [AuditAction.UPDATE]: this.translate.instant('AUDIT.ACTION.UPDATE'),
      [AuditAction.DELETE]: this.translate.instant('AUDIT.ACTION.DELETE'),
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
      [AuditAction.CREATE]: 'add_circle',
      [AuditAction.UPDATE]: 'edit',
      [AuditAction.DELETE]: 'delete',
      [AuditAction.ASSIGN]: 'person_add',
      [AuditAction.UNASSIGN]: 'person_remove',
      [AuditAction.TRANSFER]: 'swap_horiz',
      [AuditAction.LOAN]: 'output',
      [AuditAction.RETURN]: 'input'
    };
    return icons[action] || 'info';
  }

  getActionIconClass(action: AuditAction): string {
    const classes: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'bg-emerald-950/50 text-emerald-400',
      [AuditAction.UPDATE]: 'bg-sky-950/50 text-sky-400',
      [AuditAction.DELETE]: 'bg-red-950/50 text-red-400',
      [AuditAction.ASSIGN]: 'bg-purple-950/50 text-purple-400',
      [AuditAction.UNASSIGN]: 'bg-orange-950/50 text-orange-400',
      [AuditAction.TRANSFER]: 'bg-cyan-950/50 text-cyan-400',
      [AuditAction.LOAN]: 'bg-amber-950/50 text-amber-400',
      [AuditAction.RETURN]: 'bg-teal-950/50 text-teal-400'
    };
    return classes[action] || 'bg-slate-800 text-slate-400';
  }

  getActionTextClass(action: AuditAction): string {
    const classes: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'text-emerald-400',
      [AuditAction.UPDATE]: 'text-sky-400',
      [AuditAction.DELETE]: 'text-red-400',
      [AuditAction.ASSIGN]: 'text-purple-400',
      [AuditAction.UNASSIGN]: 'text-orange-400',
      [AuditAction.TRANSFER]: 'text-cyan-400',
      [AuditAction.LOAN]: 'text-amber-400',
      [AuditAction.RETURN]: 'text-teal-400'
    };
    return classes[action] || 'text-slate-400';
  }

  formatDate(date: Date): string {
    return date.toLocaleString();
  }

  exportToCSV(): void {
    this.auditService.exportToCSV(this.filteredLogs());
  }
}
