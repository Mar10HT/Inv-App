import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { OutflowService } from '../../services/outflow.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import {
  Outflow,
  OutflowReason,
  OutflowStatus,
} from '../../interfaces/outflow.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { OutflowFormDialog, OutflowFormResult } from './outflow-form-dialog';

@Component({
  selector: 'app-outflows',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    LucideAngularModule,
    MatDialogModule,
    TranslateModule,
    NgxPermissionsModule,
    OutflowFormDialog,
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 class="text-4xl font-bold text-foreground mb-2">
              {{ 'OUTFLOWS.TITLE' | translate }}
            </h1>
            <p class="text-[var(--color-on-surface-variant)] text-lg">
              {{ 'OUTFLOWS.SUBTITLE' | translate }}
            </p>
          </div>
          <ng-container *ngxPermissionsOnly="['outflows:create']">
            <button (click)="openCreateDialog()" class="ds-btn ds-btn--primary self-start lg:self-auto">
              <lucide-icon name="Plus" class="shrink-0"></lucide-icon>
              <span>{{ 'OUTFLOWS.NEW_OUTFLOW' | translate }}</span>
            </button>
          </ng-container>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">
                  {{ 'OUTFLOWS.STATS.ACTIVE' | translate }}
                </p>
                <p class="text-2xl font-bold text-foreground">{{ stats().active }}</p>
              </div>
              <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
                <lucide-icon name="PackageMinus" class="!w-5 !h-5 !text-[var(--color-on-surface-variant)]"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">
                  {{ 'OUTFLOWS.STATS.CANCELLED' | translate }}
                </p>
                <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ stats().cancelled }}</p>
              </div>
              <div class="bg-[var(--color-error-bg)] p-3 rounded-lg">
                <lucide-icon name="Ban" class="!w-5 !h-5 !text-[var(--color-status-error)]"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">
                  {{ 'OUTFLOWS.STATS.TOTAL' | translate }}
                </p>
                <p class="text-2xl font-bold text-foreground">{{ stats().total }}</p>
              </div>
              <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
                <lucide-icon name="List" class="!w-5 !h-5 !text-[var(--color-on-surface-variant)]"></lucide-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-surface-variant border border-theme rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <label class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'OUTFLOWS.FILTER_WAREHOUSE' | translate }}
            </label>
            <select
              [ngModel]="filterWarehouseId()"
              (ngModelChange)="filterWarehouseId.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (w of warehouseService.warehouses(); track w.id) {
                <option [value]="w.id">{{ w.name }}</option>
              }
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'OUTFLOWS.FILTER_STATUS' | translate }}
            </label>
            <select
              [ngModel]="filterStatus()"
              (ngModelChange)="filterStatus.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              <option value="ACTIVE">{{ 'OUTFLOWS.STATUS.ACTIVE' | translate }}</option>
              <option value="CANCELLED">{{ 'OUTFLOWS.STATUS.CANCELLED' | translate }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'OUTFLOWS.FILTER_REASON' | translate }}
            </label>
            <select
              [ngModel]="filterReason()"
              (ngModelChange)="filterReason.set($event)"
              class="w-full bg-[var(--color-surface)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm"
            >
              <option value="">{{ 'COMMON.ALL' | translate }}</option>
              @for (r of reasonKeys; track r) {
                <option [value]="r">{{ 'OUTFLOWS.REASONS.' + r | translate }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Loading / Empty -->
        @if (outflowService.loading() && outflows().length === 0) {
          <div class="bg-surface-variant border border-theme rounded-xl p-12 text-center">
            <p class="text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}…</p>
          </div>
        } @else if (filtered().length === 0) {
          <div class="bg-surface-variant border border-theme rounded-xl p-12 text-center">
            <lucide-icon name="PackageMinus" class="!w-12 !h-12 mx-auto mb-3 text-[var(--color-on-surface-muted)]"></lucide-icon>
            <p class="text-[var(--color-on-surface-variant)]">{{ 'OUTFLOWS.EMPTY' | translate }}</p>
          </div>
        } @else {
          <!-- Table (desktop) -->
          <div class="hidden md:block bg-surface-variant border border-theme rounded-xl overflow-hidden">
            <table class="w-full">
              <thead class="bg-[var(--color-surface)] border-b border-theme">
                <tr class="text-left text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th class="px-4 py-3">{{ 'OUTFLOWS.COL_NAME' | translate }}</th>
                  <th class="px-4 py-3">{{ 'OUTFLOWS.COL_WAREHOUSE' | translate }}</th>
                  <th class="px-4 py-3">{{ 'OUTFLOWS.COL_REASON' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'OUTFLOWS.COL_ITEMS' | translate }}</th>
                  <th class="px-4 py-3">{{ 'OUTFLOWS.COL_STATUS' | translate }}</th>
                  <th class="px-4 py-3">{{ 'OUTFLOWS.COL_DATE' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'OUTFLOWS.COL_ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (outflow of filtered(); track outflow.id) {
                  <tr class="border-t border-theme hover:bg-[var(--color-surface)] transition-colors">
                    <td class="px-4 py-3 text-foreground">
                      <div class="font-medium">{{ outflow.name || ('OUTFLOWS.UNNAMED' | translate) }}</div>
                      @if (outflow.notes) {
                        <div class="text-xs text-[var(--color-on-surface-variant)] truncate max-w-xs" [title]="outflow.notes">
                          {{ outflow.notes }}
                        </div>
                      }
                    </td>
                    <td class="px-4 py-3 text-[var(--color-on-surface-variant)]">
                      {{ outflow.warehouse?.name || '—' }}
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-surface)] text-[var(--color-on-surface-variant)]">
                        {{ 'OUTFLOWS.REASONS.' + outflow.reason | translate }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right text-foreground">
                      {{ totalQty(outflow) }} ({{ outflow.items.length }})
                    </td>
                    <td class="px-4 py-3">
                      @if (outflow.status === 'ACTIVE') {
                        <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-status-success)]">
                          {{ 'OUTFLOWS.STATUS.ACTIVE' | translate }}
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-error-bg)] text-[var(--color-status-error)]">
                          {{ 'OUTFLOWS.STATUS.CANCELLED' | translate }}
                        </span>
                      }
                    </td>
                    <td class="px-4 py-3 text-[var(--color-on-surface-variant)] text-sm">
                      {{ outflow.createdAt | date:'medium' }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-2">
                        <button
                          (click)="downloadPdf(outflow)"
                          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:text-foreground hover:border-[var(--color-primary)] text-xs font-medium transition-colors"
                        >
                          <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                          <span>{{ 'OUTFLOWS.DOWNLOAD_PDF' | translate }}</span>
                        </button>
                        @if (outflow.status === 'ACTIVE') {
                          <ng-container *ngxPermissionsOnly="['outflows:cancel']">
                            <button
                              (click)="cancel(outflow)"
                              [title]="'OUTFLOWS.CANCEL_OUTFLOW' | translate"
                              class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors"
                            >
                              <lucide-icon name="Ban" class="!w-4 !h-4"></lucide-icon>
                            </button>
                          </ng-container>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Cards (mobile) -->
          <div class="md:hidden space-y-3">
            @for (outflow of filtered(); track outflow.id) {
              <div class="bg-surface-variant border border-theme rounded-xl p-4">
                <div class="flex items-start justify-between gap-3 mb-2">
                  <div class="min-w-0">
                    <div class="font-medium text-foreground truncate">
                      {{ outflow.name || ('OUTFLOWS.UNNAMED' | translate) }}
                    </div>
                    <div class="text-xs text-[var(--color-on-surface-variant)]">
                      {{ outflow.warehouse?.name }} · {{ 'OUTFLOWS.REASONS.' + outflow.reason | translate }}
                    </div>
                  </div>
                  @if (outflow.status === 'ACTIVE') {
                    <span class="shrink-0 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-status-success)]">
                      {{ 'OUTFLOWS.STATUS.ACTIVE' | translate }}
                    </span>
                  } @else {
                    <span class="shrink-0 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-error-bg)] text-[var(--color-status-error)]">
                      {{ 'OUTFLOWS.STATUS.CANCELLED' | translate }}
                    </span>
                  }
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-[var(--color-on-surface-variant)]">
                    {{ totalQty(outflow) }} ({{ outflow.items.length }} {{ 'OUTFLOWS.COL_ITEMS' | translate }})
                  </span>
                  <span class="text-[var(--color-on-surface-variant)] text-xs">
                    {{ outflow.createdAt | date:'short' }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-3">
                  <button
                    (click)="downloadPdf(outflow)"
                    class="flex-1 py-2 rounded-lg bg-[var(--color-surface)] border border-theme text-sm text-foreground flex items-center justify-center gap-1"
                  >
                    <lucide-icon name="FileDown" class="!w-4 !h-4"></lucide-icon>
                    {{ 'OUTFLOWS.DOWNLOAD_PDF' | translate }}
                  </button>
                  @if (outflow.status === 'ACTIVE') {
                    <ng-container *ngxPermissionsOnly="['outflows:cancel']">
                      <button
                        (click)="cancel(outflow)"
                        class="flex-1 py-2 rounded-lg bg-[var(--color-error-bg)] text-[var(--color-status-error)] text-sm flex items-center justify-center gap-1"
                      >
                        <lucide-icon name="Ban" class="!w-4 !h-4"></lucide-icon>
                        {{ 'OUTFLOWS.CANCEL_OUTFLOW' | translate }}
                      </button>
                    </ng-container>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    @if (showFormDialog()) {
      <app-outflow-form-dialog
        (closed)="closeFormDialog()"
        (created)="onCreated($event)"
      ></app-outflow-form-dialog>
    }
  `,
})
export class OutflowsComponent implements OnInit {
  outflowService = inject(OutflowService);
  warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  showFormDialog = signal(false);

  filterWarehouseId = signal('');
  filterStatus = signal<'' | OutflowStatus>('');
  filterReason = signal<'' | OutflowReason>('');

  readonly reasonKeys = [
    OutflowReason.DAMAGED,
    OutflowReason.LOST,
    OutflowReason.EXPIRED,
    OutflowReason.CONSUMED,
    OutflowReason.SOLD,
    OutflowReason.OTHER,
  ];

  outflows = computed(() => this.outflowService.outflows());
  stats = computed(() => this.outflowService.stats());

  filtered = computed(() => {
    const list = this.outflows();
    const wh = this.filterWarehouseId();
    const st = this.filterStatus();
    const rs = this.filterReason();
    return list.filter((o) => {
      if (wh && o.warehouseId !== wh) return false;
      if (st && o.status !== st) return false;
      if (rs && o.reason !== rs) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.outflowService.loadOutflows();
    this.warehouseService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err),
    });
    this.inventoryService.loadItems();
  }

  openCreateDialog(): void {
    this.showFormDialog.set(true);
  }

  closeFormDialog(): void {
    this.showFormDialog.set(false);
  }

  onCreated(result: OutflowFormResult): void {
    if (result.success) {
      this.showFormDialog.set(false);
      this.outflowService.refresh();
    }
  }

  totalQty(outflow: Outflow): number {
    return outflow.items.reduce((sum, it) => sum + it.quantity, 0);
  }

  downloadPdf(outflow: Outflow): void {
    this.outflowService.downloadPdf(outflow.id);
  }

  cancel(outflow: Outflow): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('OUTFLOWS.CONFIRM_CANCEL_TITLE'),
        message: this.translate.instant('OUTFLOWS.CONFIRM_CANCEL_MESSAGE', {
          name: outflow.name || outflow.id.slice(0, 8),
        }),
        confirmText: this.translate.instant('OUTFLOWS.CANCEL_OUTFLOW'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'warning',
      },
      panelClass: 'confirm-dialog-container',
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((confirmed) => !!confirmed),
        switchMap(() => this.outflowService.cancel(outflow.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          if (result) {
            this.notifications.success(
              this.translate.instant('OUTFLOWS.CANCEL_SUCCESS'),
            );
          }
        },
        error: () => {
          this.notifications.error(
            this.translate.instant('OUTFLOWS.CANCEL_ERROR'),
          );
        },
      });
  }
}
