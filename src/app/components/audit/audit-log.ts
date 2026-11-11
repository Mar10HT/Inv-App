import { Component, computed, signal, inject, OnInit, effect, ChangeDetectionStrategy, HostListener, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuditService } from '../../services/audit.service';
import { NotificationService } from '../../services/notification.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { UserService } from '../../services/user.service';
import { ClientService } from '../../services/client.service';
import { ServiceCatalogService } from '../../services/service-catalog.service';
import { AuditLog, AuditAction } from '../../interfaces/audit.interface';
import { provideTranslatedPaginator } from '../../shared/translated-paginator-intl';
import { AppDatePipe } from '../../shared/app-date.pipe';
import { localeFor } from '../../shared/app-language';
import { AuditDescriber, AuditRefs, NameMap } from './audit-describer';

const namesOf = (list: readonly { id: string; name?: string | null; email?: string }[]): NameMap =>
  new Map(list.map((x) => [x.id, x.name || x.email || x.id]));

@Component({
  selector: 'app-audit-log',
  providers: [provideTranslatedPaginator()],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    A11yModule,
    LucideAngularModule,
    MatPaginatorModule,
    TranslateModule,
    AppDatePipe
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
                  id="audit-search"
                  type="text"
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="applyFilters()"
                  [attr.aria-label]="'AUDIT.SEARCH_PLACEHOLDER' | translate"
                  [placeholder]="'AUDIT.SEARCH_PLACEHOLDER' | translate"
                  class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                />
                <lucide-icon name="Search" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>

            <!-- Action Filter -->
            <div class="lg:w-56">
              <select
                id="audit-action"
                [(ngModel)]="selectedAction"
                (ngModelChange)="onActionFilterChange()"
                [attr.aria-label]="'AUDIT.ALL_ACTIONS' | translate"
                class="select-chevron w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer appearance-none"
              >
                <option value="all">{{ 'AUDIT.ALL_ACTIONS' | translate }}</option>
                @for (action of actions; track action) {
                  <option [value]="action">{{ describer().actionName(action) }}</option>
                }
              </select>
            </div>

            <!-- Record type filter: built from what the loaded entries are about -->
            <div class="lg:w-56">
              <select
                id="audit-entity"
                [(ngModel)]="selectedEntity"
                (ngModelChange)="applyFilters()"
                [attr.aria-label]="'AUDIT.ALL_ENTITIES' | translate"
                class="select-chevron w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer appearance-none"
              >
                <option value="all">{{ 'AUDIT.ALL_ENTITIES' | translate }}</option>
                @for (entity of entityOptions(); track entity.value) {
                  <option [value]="entity.value">{{ entity.label }}</option>
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
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUDIT.TOTAL_LOGS' | translate }}</p>
                <p class="text-2xl font-bold text-foreground">{{ filteredLogs().length }}</p>
              </div>
              <div class="bg-[var(--color-primary-container)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
                <lucide-icon name="History" class="!text-[var(--color-primary)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUDIT.CREATES' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-success)]">{{ actionCounts().create }}</p>
              </div>
              <div class="bg-[var(--color-success-bg)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
                <lucide-icon name="PlusCircle" class="!text-[var(--color-status-success)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUDIT.UPDATES' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ actionCounts().update }}</p>
              </div>
              <div class="bg-[var(--color-info-bg)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
                <lucide-icon name="Pencil" class="!text-[var(--color-status-info)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUDIT.DELETES' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ actionCounts().delete }}</p>
              </div>
              <div class="bg-[var(--color-error-bg)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
                <lucide-icon name="Trash2" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
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

          <!-- One sentence per entry; the detail opens on click -->
          <ul class="divide-y divide-[var(--color-border-subtle)]">
            @for (log of paginatedLogs(); track log.id) {
              <li>
                <button
                  type="button"
                  (click)="openDetail(log)"
                  [attr.aria-label]="('AUDIT.VIEW_DETAIL' | translate) + ': ' + sentenceText(log)"
                  class="w-full text-left p-4 flex items-start gap-4 hover:bg-[var(--color-surface-elevated)] focus-visible:bg-[var(--color-surface-elevated)] focus:outline-none transition-colors">
                  <div [class]="getActionIconClass(log.action)" class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <lucide-icon [name]="getActionIcon(log.action)" class="!w-5 !h-5"></lucide-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-foreground leading-relaxed">
                      <span class="font-semibold">{{ log.userName }}</span>
                      {{ describer().sentence(log).text }}
                    </p>
                    <p class="mt-1 text-sm text-[var(--color-on-surface-variant)] flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span class="px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated)] text-xs">{{ describer().entityName(log.entity) }}</span>
                      <span>{{ log.createdAt | appDate:'medium' }}</span>
                    </p>
                  </div>
                  <lucide-icon name="ChevronRight" class="!w-4 !h-4 mt-3 text-[var(--color-on-surface-muted)] flex-shrink-0" aria-hidden="true"></lucide-icon>
                </button>
              </li>
            } @empty {
              <li class="p-12 text-center">
                <lucide-icon name="History" class="!w-14 !h-14 text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
                <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'AUDIT.NO_LOGS' | translate }}</h3>
                <p class="text-[var(--color-on-surface-muted)]">{{ 'AUDIT.NO_LOGS_DESC' | translate }}</p>
              </li>
            }
          </ul>

          <!-- Pagination -->
          @if (filteredLogs().length > pageSize()) {
            <div class="border-t border-theme px-4 py-2">
              <mat-paginator
                [length]="filteredLogs().length"
                [pageIndex]="pageIndex()"
                [pageSize]="pageSize()"
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

    <!-- Detail of one entry -->
    @if (selected(); as log) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-[var(--color-surface-overlay)]" role="presentation" (click)="closeDetail()"></div>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-detail-title"
          cdkTrapFocus
          cdkTrapFocusAutoCapture
          class="relative bg-surface-variant border border-theme rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-theme flex items-start gap-4">
            <div [class]="getActionIconClass(log.action)" class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
              <lucide-icon [name]="getActionIcon(log.action)" class="!w-5 !h-5"></lucide-icon>
            </div>
            <div class="flex-1 min-w-0">
              <h2 id="audit-detail-title" class="text-lg font-semibold text-foreground">
                {{ describer().entityName(log.entity) }}@if (describer().label(log); as name) {: {{ name }}}
              </h2>
              <p class="text-[var(--color-on-surface-variant)] mt-1">
                <span class="font-semibold text-foreground">{{ log.userName }}</span>
                {{ describer().sentence(log).text }}
              </p>
            </div>
            <button
              type="button"
              (click)="closeDetail()"
              [attr.aria-label]="'COMMON.CLOSE' | translate"
              class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)]">
              <lucide-icon name="X" class="!w-4 !h-4"></lucide-icon>
            </button>
          </div>

          <dl class="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm border-b border-theme">
            <div>
              <dt class="text-[var(--color-on-surface-variant)]">{{ 'AUDIT.DETAIL.USER' | translate }}</dt>
              <dd class="text-foreground">{{ log.userName }}@if (log.userEmail && log.userEmail !== log.userName) {<span class="ml-1 text-[var(--color-on-surface-variant)]">({{ log.userEmail }})</span>}</dd>
            </div>
            <div>
              <dt class="text-[var(--color-on-surface-variant)]">{{ 'AUDIT.DETAIL.DATE' | translate }}</dt>
              <dd class="text-foreground">{{ log.createdAt | appDate:'medium' }}</dd>
            </div>
            <div>
              <dt class="text-[var(--color-on-surface-variant)]">{{ 'AUDIT.DETAIL.ACTION' | translate }}</dt>
              <dd class="text-foreground">{{ describer().actionName(log.action) }}</dd>
            </div>
            <div>
              <dt class="text-[var(--color-on-surface-variant)]">{{ 'AUDIT.DETAIL.RECORD' | translate }}</dt>
              <dd class="text-foreground">{{ describer().entityName(log.entity) }}</dd>
            </div>
          </dl>

          <div class="px-6 py-4">
            @if (detailRows().length) {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-[var(--color-on-surface-variant)]">
                      <th scope="col" class="py-2 pr-4 font-medium">{{ 'AUDIT.DETAIL.FIELD' | translate }}</th>
                      @if (detailHasBefore()) {
                        <th scope="col" class="py-2 pr-4 font-medium">{{ 'AUDIT.DETAIL.BEFORE' | translate }}</th>
                        <th scope="col" class="py-2 font-medium">{{ 'AUDIT.DETAIL.AFTER' | translate }}</th>
                      } @else {
                        <th scope="col" class="py-2 font-medium">{{ 'AUDIT.DETAIL.VALUE' | translate }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[var(--color-border-subtle)]">
                    @for (row of detailRows(); track row.field) {
                      <tr>
                        <th scope="row" class="py-2 pr-4 text-left font-normal text-[var(--color-on-surface-variant)] align-top">{{ row.label }}</th>
                        @if (detailHasBefore()) {
                          <td class="py-2 pr-4 align-top text-[var(--color-status-error)] break-words">{{ row.before }}</td>
                          <td class="py-2 align-top text-[var(--color-status-success)] break-words">{{ row.after }}</td>
                        } @else {
                          <td class="py-2 align-top text-foreground break-words">{{ row.after }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUDIT.DETAIL.NO_FIELDS' | translate }}</p>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class AuditLogComponent implements OnInit {
  auditService = inject(AuditService);
  private translate = inject(TranslateService);
  private notifications = inject(NotificationService);
  private inventory = inject(InventoryService);
  private userService = inject(UserService);
  private clientService = inject(ClientService);
  private serviceCatalog = inject(ServiceCatalogService);
  private startupLocale = inject(LOCALE_ID);

  // Filter options
  actions = Object.values(AuditAction);

  // Filter state
  searchQuery = '';
  selectedAction = 'all';
  selectedEntity = 'all';

  // Pagination (signals: paginatedLogs only re-evaluates when a signal it reads changes)
  pageIndex = signal(0);
  pageSize = signal(10);

  /** The entry whose detail is open. */
  selected = signal<AuditLog | null>(null);

  /** Bumped on a language switch, so the sentences are worded again. */
  private lang = signal(this.translate.getCurrentLang());

  // Lists the names come from: null until loaded (a 403 leaves them null)
  private users = signal<NameMap>(null);
  private clients = signal<NameMap>(null);
  private services = signal<NameMap>(null);

  private refs = computed<AuditRefs>(() => {
    const warehouses = this.inventory.warehouses();
    const suppliers = this.inventory.suppliers();
    const items = this.inventory.items();
    return {
      warehouses: warehouses.length ? namesOf(warehouses) : null,
      suppliers: suppliers.length ? namesOf(suppliers) : null,
      items: items.length ? namesOf(items) : null,
      users: this.users(),
      clients: this.clients(),
      services: this.services(),
    };
  });

  describer = computed(() => {
    const lang = this.lang();
    return new AuditDescriber(
      {
        t: (key, params) => this.translate.instant(key, params),
        has: (key) => this.translate.instant(key) !== key,
        locale: lang ? localeFor(lang) : this.startupLocale,
      },
      this.refs(),
      this.auditService.logs(),
    );
  });

  /** The kinds of record present in the loaded entries, by their translated name. */
  entityOptions = computed(() => {
    const d = this.describer();
    const kinds = [...new Set(this.auditService.logs().map((l) => l.entity as string))];
    return kinds
      .map((value) => ({ value, label: d.entityName(value) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  detailRows = computed(() => {
    const log = this.selected();
    return log ? this.describer().details(log) : [];
  });

  /** A create only has values; an edit has a before and an after. */
  detailHasBefore = computed(() => this.detailRows().some((r) => r.before !== '—'));

  // Filtered logs signal
  private filteredLogsSignal = signal<AuditLog[]>([]);
  filteredLogs = computed(() => this.filteredLogsSignal());

  // Paginated logs
  paginatedLogs = computed(() => {
    const logs = this.filteredLogsSignal();
    const start = this.pageIndex() * this.pageSize();
    return logs.slice(start, start + this.pageSize());
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
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe((e) => this.lang.set(e.lang));

    // Re-apply filters when the logs or their wording change (names arrive after the logs)
    effect(() => {
      this.auditService.logs();
      this.describer();
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    this.reloadFromServer();
    this.loadNames();
  }

  /** Names for the ids in the entries. Warehouses, suppliers and items come with InventoryService. */
  private loadNames(): void {
    this.userService.getAll().subscribe({ next: (list) => this.users.set(namesOf(list)), error: () => undefined });
    this.clientService.getAll().subscribe({ next: (list) => this.clients.set(namesOf(list)), error: () => undefined });
    this.serviceCatalog.getAll().subscribe({ next: (list) => this.services.set(namesOf(list)), error: () => undefined });
  }

  /**
   * The action filter is server-side: the backend hides auth/access events
   * by default, so picking LOGIN/ACCESS in the dropdown requires re-fetching
   * with that action explicitly. Other filters (search, record type) stay
   * client-side over the loaded page.
   */
  private reloadFromServer(): void {
    const options: { limit: number; action?: string } = { limit: 200 };
    if (this.selectedAction !== 'all') {
      options.action = this.selectedAction;
    }
    this.auditService.loadLogs(options);
  }

  onActionFilterChange(): void {
    this.reloadFromServer();
  }

  applyFilters(): void {
    let logs = this.auditService.logs();
    const d = this.describer();

    // Search over what the screen shows: who, the record's name and the sentence
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      logs = logs.filter(log =>
        log.userName.toLowerCase().includes(query) ||
        (log.userEmail?.toLowerCase().includes(query) ?? false) ||
        d.label(log).toLowerCase().includes(query) ||
        d.sentence(log).text.toLowerCase().includes(query)
      );
    }

    if (this.selectedEntity !== 'all') {
      logs = logs.filter(log => log.entity === this.selectedEntity);
    }

    // Sort by date descending, on a copy: with no filter active `logs` is the service's own array
    logs = [...logs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    this.filteredLogsSignal.set(logs);
    this.pageIndex.set(0);
  }

  clearFilters(): void {
    const actionChanged = this.selectedAction !== 'all';
    this.searchQuery = '';
    this.selectedAction = 'all';
    this.selectedEntity = 'all';
    if (actionChanged) {
      this.reloadFromServer();
    } else {
      this.applyFilters();
    }
  }

  hasFilters(): boolean {
    return this.searchQuery !== '' || this.selectedAction !== 'all' || this.selectedEntity !== 'all';
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  sentenceText(log: AuditLog): string {
    return `${log.userName} ${this.describer().sentence(log).text}`;
  }

  openDetail(log: AuditLog): void {
    this.selected.set(log);
  }

  @HostListener('document:keydown.escape')
  closeDetail(): void {
    this.selected.set(null);
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
      [AuditAction.ACCESS]: 'ShieldCheck',
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
      [AuditAction.ACCESS]: 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-muted)]',
      [AuditAction.ASSIGN]: 'bg-[var(--color-accent-purple-bg)] text-[var(--color-accent-purple)]',
      [AuditAction.UNASSIGN]: 'bg-[var(--color-warning-bg)] text-[var(--color-status-warning)]',
      [AuditAction.TRANSFER]: 'bg-[var(--color-accent-cyan-bg)] text-[var(--color-accent-cyan)]',
      [AuditAction.LOAN]: 'bg-[var(--color-accent-amber-bg)] text-[var(--color-accent-amber)]',
      [AuditAction.RETURN]: 'bg-[var(--color-accent-teal-bg)] text-[var(--color-accent-teal)]'
    };
    return classes[action] || 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]';
  }

  /** The Excel file reads like the screen: translated columns, the same sentence and the worded detail. */
  async exportToCSV(): Promise<void> {
    const d = this.describer();
    const t = (key: string) => this.translate.instant(key);
    const lang = this.lang();
    const locale = lang ? localeFor(lang) : this.startupLocale;
    const rows = this.filteredLogs().map((log) => ({
      [t('AUDIT.DETAIL.DATE')]: formatDate(log.createdAt, 'dd/MM/yyyy HH:mm', locale),
      [t('AUDIT.DETAIL.USER')]: log.userEmail && log.userEmail !== log.userName ? `${log.userName} (${log.userEmail})` : log.userName,
      [t('AUDIT.DETAIL.ACTION')]: d.actionName(log.action),
      [t('AUDIT.DETAIL.RECORD')]: [d.entityName(log.entity), d.label(log)].filter(Boolean).join(': '),
      [t('AUDIT.DETAIL.DESCRIPTION')]: this.sentenceText(log),
      [t('AUDIT.CHANGES')]: d.details(log)
        .map((r) => (r.before === '—' ? `${r.label}: ${r.after}` : `${r.label}: ${r.before} → ${r.after}`))
        .join(' | '),
    }));
    await this.notifications.guardExport(() => this.auditService.exportToXLSX(rows));
  }
}
