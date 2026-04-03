import { Component, computed, signal, inject, OnInit, ChangeDetectionStrategy, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { LoanService } from '../../services/loan.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { Loan, LoanStatus } from '../../interfaces/loan.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { LoanFormDialog, LoanFormResult } from './loan-form-dialog';
import { LoanQrDialog, LoanScanDialog, ScanQrResult } from './loan-qr-dialog';

@Component({
  selector: 'app-loans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatPaginatorModule,
    MatMenuModule,
    TranslateModule,
    NgxPermissionsModule,
    LoanFormDialog,
    LoanQrDialog,
    LoanScanDialog,
    DatePipe
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'LOANS.TITLE' | translate }}</h1>
              <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'LOANS.SUBTITLE' | translate }}</p>
            </div>
            <div class="flex gap-2">
              <button
                (click)="openScanDialog()"
                class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap">
                <lucide-icon name="ScanLine" class="!w-5 !h-5 !text-current shrink-0"></lucide-icon>
                <span>{{ 'LOANS.QR.SCAN' | translate }}</span>
              </button>
              <button
                (click)="exportToXLSX()"
                class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap">
                <lucide-icon name="Download" class="!w-5 !h-5 !text-current shrink-0"></lucide-icon>
                <span>{{ 'COMMON.EXPORT' | translate }}</span>
              </button>
              <ng-container *ngxPermissionsOnly="['loans:create']">
                <button
                  (click)="openNewLoanDialog()"
                  class="ds-btn ds-btn--primary">
                  <lucide-icon name="Plus" class="shrink-0"></lucide-icon>
                  <span>{{ 'LOANS.NEW_LOAN' | translate }}</span>
                </button>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.PENDING' | translate }}</p>
                <p class="text-2xl font-bold text-foreground">{{ stats().totalPending }}</p>
              </div>
              <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
                <lucide-icon name="Clock" class="!text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.SENT' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ stats().totalSent }}</p>
              </div>
              <div class="bg-[var(--color-info-bg)] p-3 rounded-lg">
                <lucide-icon name="Send" class="!text-[var(--color-status-info)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.RECEIVED' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-accent-violet)]">{{ stats().totalReceived }}</p>
              </div>
              <div class="bg-[var(--color-accent-violet-bg)] p-3 rounded-lg">
                <lucide-icon name="PackageCheck" class="!text-[var(--color-accent-violet)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.OVERDUE' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ stats().totalOverdue }}</p>
              </div>
              <div class="bg-[var(--color-error-bg)] p-3 rounded-lg">
                <lucide-icon name="AlertTriangle" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.RETURNED' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-success)]">{{ stats().totalReturned }}</p>
              </div>
              <div class="bg-[var(--color-success-bg)] p-3 rounded-lg">
                <lucide-icon name="CheckCircle2" class="!text-[var(--color-status-success)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
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
                  [placeholder]="'LOANS.SEARCH_PLACEHOLDER' | translate"
                  class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                />
                <lucide-icon name="Search" class="absolute left-3 top-1/2 -translate-y-1/2 !text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>

            <!-- Status Filter -->
            <div class="lg:w-56">
              <select
                [(ngModel)]="selectedStatus"
                (ngModelChange)="applyFilters()"
                class="select-chevron w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer appearance-none"
              >
                <option value="all">{{ 'LOANS.ALL_STATUS' | translate }}</option>
                <option [value]="LoanStatus.PENDING">{{ 'LOANS.STATUS.PENDING' | translate }}</option>
                <option [value]="LoanStatus.SENT">{{ 'LOANS.STATUS.SENT' | translate }}</option>
                <option [value]="LoanStatus.RECEIVED">{{ 'LOANS.STATUS.RECEIVED' | translate }}</option>
                <option [value]="LoanStatus.RETURN_PENDING">{{ 'LOANS.STATUS.RETURN_PENDING' | translate }}</option>
                <option [value]="LoanStatus.OVERDUE">{{ 'LOANS.STATUS.OVERDUE' | translate }}</option>
                <option [value]="LoanStatus.RETURNED">{{ 'LOANS.STATUS.RETURNED' | translate }}</option>
                <option [value]="LoanStatus.CANCELLED">{{ 'LOANS.STATUS.CANCELLED' | translate }}</option>
              </select>
            </div>

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

        <!-- Loans List -->
        <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'LOANS.LIST' | translate }}</h2>
          </div>

          <!-- Desktop Table -->
          <div class="hidden lg:block overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-[var(--color-surface)]">
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'LOANS.ITEM' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.QUANTITY' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'LOANS.SOURCE_WAREHOUSE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'LOANS.DEST_WAREHOUSE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'LOANS.DUE_DATE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border-subtle)]">
                @for (loan of paginatedLoans(); track loan.id) {
                  <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                    <td class="px-6 py-4">
                      <div>
                        <p class="text-foreground font-medium">{{ loan.inventoryItemName }}</p>
                        @if (loan.inventoryItemServiceTag) {
                          <p class="text-[var(--color-on-surface-variant)] text-sm">{{ loan.inventoryItemServiceTag }}</p>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4 text-foreground">{{ loan.quantity }}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-[var(--color-on-surface-variant)] !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ loan.sourceWarehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ loan.destinationWarehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="getDueDateClass(loan)">{{ loan.dueDate | date:'mediumDate' }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="getStatusClass(loan.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                        {{ getStatusLabel(loan.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center justify-center gap-2">
                        @switch (loan.status) {
                          @case (LoanStatus.PENDING) {
                            <ng-container *ngxPermissionsOnly="['loans:manage']">
                              <button
                                (click)="sendLoan(loan)"
                                [disabled]="loanService.loading()"
                                class="ds-btn ds-btn--send ds-btn--sm">
                                <lucide-icon name="Send" class="shrink-0"></lucide-icon>
                                <span>{{ 'LOANS.SEND' | translate }}</span>
                              </button>
                              <button
                                (click)="cancelLoan(loan)"
                                [disabled]="loanService.loading()"
                                [attr.aria-label]="'COMMON.CANCEL' | translate"
                                class="ds-btn ds-btn--danger-ghost ds-btn--sm">
                                <lucide-icon name="X" class="shrink-0"></lucide-icon>
                              </button>
                            </ng-container>
                          }
                          @case (LoanStatus.SENT) {
                            <div class="flex gap-1.5">
                              <button
                                (click)="showQrCode(loan, 'send')"
                                class="ds-btn ds-btn--qr ds-btn--sm">
                                <lucide-icon name="QrCode" class="shrink-0"></lucide-icon>
                                <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                              </button>
                              <ng-container *ngxPermissionsOnly="['loans:manage']">
                                <button
                                  (click)="manualConfirmReceipt(loan)"
                                  [disabled]="loanService.loading()"
                                  [attr.title]="'LOANS.MANUAL_CONFIRM_RECEIPT' | translate"
                                  class="ds-btn ds-btn--ghost ds-btn--sm">
                                  <lucide-icon name="CheckCircle" class="shrink-0"></lucide-icon>
                                </button>
                              </ng-container>
                            </div>
                          }
                          @case (LoanStatus.RECEIVED) {
                            <ng-container *ngxPermissionsOnly="['loans:manage']">
                              <button
                                (click)="initiateReturn(loan)"
                                [disabled]="loanService.loading()"
                                class="ds-btn ds-btn--return ds-btn--sm">
                                <lucide-icon name="CornerDownLeft" class="shrink-0"></lucide-icon>
                                <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                              </button>
                            </ng-container>
                          }
                          @case (LoanStatus.OVERDUE) {
                            <ng-container *ngxPermissionsOnly="['loans:manage']">
                              <div class="flex gap-1.5">
                                @if (!loan.receivedAt) {
                                  <button
                                    (click)="manualConfirmReceipt(loan)"
                                    [disabled]="loanService.loading()"
                                    class="ds-btn ds-btn--ghost ds-btn--sm">
                                    <lucide-icon name="CheckCircle" class="shrink-0"></lucide-icon>
                                    <span>{{ 'LOANS.MANUAL_CONFIRM_RECEIPT' | translate }}</span>
                                  </button>
                                } @else {
                                  <button
                                    (click)="initiateReturn(loan)"
                                    [disabled]="loanService.loading()"
                                    class="ds-btn ds-btn--danger ds-btn--sm">
                                    <lucide-icon name="CornerDownLeft" class="shrink-0"></lucide-icon>
                                    <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                                  </button>
                                  <button
                                    (click)="manualConfirmReturn(loan)"
                                    [disabled]="loanService.loading()"
                                    [attr.title]="'LOANS.MANUAL_CONFIRM_RETURN' | translate"
                                    class="ds-btn ds-btn--ghost ds-btn--sm">
                                    <lucide-icon name="CheckCircle" class="shrink-0"></lucide-icon>
                                  </button>
                                }
                              </div>
                            </ng-container>
                          }
                          @case (LoanStatus.RETURN_PENDING) {
                            <div class="flex gap-1.5">
                              <button
                                (click)="showQrCode(loan, 'return')"
                                class="ds-btn ds-btn--approve ds-btn--sm">
                                <lucide-icon name="QrCode" class="shrink-0"></lucide-icon>
                                <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                              </button>
                              <ng-container *ngxPermissionsOnly="['loans:manage']">
                                <button
                                  (click)="manualConfirmReturn(loan)"
                                  [disabled]="loanService.loading()"
                                  [attr.title]="'LOANS.MANUAL_CONFIRM_RETURN' | translate"
                                  class="ds-btn ds-btn--ghost ds-btn--sm">
                                  <lucide-icon name="CheckCircle" class="shrink-0"></lucide-icon>
                                </button>
                              </ng-container>
                            </div>
                          }
                          @case (LoanStatus.RETURNED) {
                            <span class="text-[var(--color-on-surface-variant)] text-sm">{{ loan.returnDate | date:'mediumDate' }}</span>
                          }
                          @case (LoanStatus.CANCELLED) {
                            <span class="text-[var(--color-on-surface-variant)] text-sm">-</span>
                          }
                          @default {
                            <span class="text-[var(--color-on-surface-variant)] text-sm">-</span>
                          }
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="px-6 py-16 text-center">
                      <lucide-icon name="ClipboardList" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
                      <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'LOANS.NO_LOANS' | translate }}</h3>
                      <p class="text-[var(--color-on-surface-muted)]">{{ 'LOANS.NO_LOANS_DESC' | translate }}</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="lg:hidden divide-y divide-[var(--color-border-subtle)]">
            @for (loan of paginatedLoans(); track loan.id) {
              <div class="p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="text-foreground font-medium">{{ loan.inventoryItemName }}</p>
                    <p class="text-[var(--color-on-surface-variant)] text-sm">
                      {{ 'DASHBOARD.TABLE.QUANTITY' | translate }}: {{ loan.quantity }}
                      @if (loan.inventoryItemServiceTag) {
                        · {{ loan.inventoryItemServiceTag }}
                      }
                    </p>
                  </div>
                  <span [class]="getStatusClass(loan.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                    {{ getStatusLabel(loan.status) }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p class="text-[var(--color-on-surface-variant)]">{{ 'LOANS.SOURCE_WAREHOUSE' | translate }}</p>
                    <p class="text-foreground">{{ loan.sourceWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-[var(--color-on-surface-variant)]">{{ 'LOANS.DEST_WAREHOUSE' | translate }}</p>
                    <p class="text-foreground">{{ loan.destinationWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-[var(--color-on-surface-variant)]">{{ 'LOANS.DUE_DATE' | translate }}</p>
                    <p [class]="getDueDateClass(loan)">{{ loan.dueDate | date:'mediumDate' }}</p>
                  </div>
                </div>
                <!-- Mobile Actions -->
                @switch (loan.status) {
                  @case (LoanStatus.PENDING) {
                    <ng-container *ngxPermissionsOnly="['loans:manage']">
                      <div class="flex gap-2">
                        <button
                          (click)="sendLoan(loan)"
                          [disabled]="loanService.loading()"
                          class="flex-1 ds-btn ds-btn--send ds-btn--sm justify-center">
                          <lucide-icon name="Send" class="shrink-0"></lucide-icon>
                          <span>{{ 'LOANS.SEND' | translate }}</span>
                        </button>
                        <button
                          (click)="cancelLoan(loan)"
                          [disabled]="loanService.loading()"
                          [attr.aria-label]="'COMMON.CANCEL' | translate"
                          class="ds-btn ds-btn--danger-ghost ds-btn--sm">
                          <lucide-icon name="X" class="shrink-0"></lucide-icon>
                        </button>
                      </div>
                    </ng-container>
                  }
                  @case (LoanStatus.SENT) {
                    <div class="flex gap-2">
                      <button
                        (click)="showQrCode(loan, 'send')"
                        class="flex-1 ds-btn ds-btn--qr ds-btn--sm justify-center">
                        <lucide-icon name="QrCode" class="shrink-0"></lucide-icon>
                        <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                      </button>
                      <ng-container *ngxPermissionsOnly="['loans:manage']">
                        <button
                          (click)="manualConfirmReceipt(loan)"
                          [disabled]="loanService.loading()"
                          [attr.title]="'LOANS.MANUAL_CONFIRM_RECEIPT' | translate"
                          class="ds-btn ds-btn--ghost ds-btn--sm">
                          <lucide-icon name="CheckCircle" class="shrink-0"></lucide-icon>
                        </button>
                      </ng-container>
                    </div>
                  }
                  @case (LoanStatus.RECEIVED) {
                    <ng-container *ngxPermissionsOnly="['loans:manage']">
                      <button
                        (click)="initiateReturn(loan)"
                        [disabled]="loanService.loading()"
                        class="w-full ds-btn ds-btn--return ds-btn--sm justify-center">
                        <lucide-icon name="CornerDownLeft" class="shrink-0"></lucide-icon>
                        <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                      </button>
                    </ng-container>
                  }
                  @case (LoanStatus.OVERDUE) {
                    <ng-container *ngxPermissionsOnly="['loans:manage']">
                      @if (!loan.receivedAt) {
                        <button
                          (click)="manualConfirmReceipt(loan)"
                          [disabled]="loanService.loading()"
                          class="w-full ds-btn ds-btn--ghost ds-btn--sm justify-center">
                          <lucide-icon name="CheckCircle" class="shrink-0"></lucide-icon>
                          <span>{{ 'LOANS.MANUAL_CONFIRM_RECEIPT' | translate }}</span>
                        </button>
                      } @else {
                        <div class="flex gap-2">
                          <button
                            (click)="initiateReturn(loan)"
                            [disabled]="loanService.loading()"
                            class="flex-1 ds-btn ds-btn--danger ds-btn--sm justify-center">
                            <lucide-icon name="CornerDownLeft" class="shrink-0"></lucide-icon>
                            <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                          </button>
                          <button
                            (click)="manualConfirmReturn(loan)"
                            [disabled]="loanService.loading()"
                            [attr.title]="'LOANS.MANUAL_CONFIRM_RETURN' | translate"
                            class="ds-btn ds-btn--ghost ds-btn--sm">
                            <lucide-icon name="CheckCircle" class="shrink-0"></lucide-icon>
                          </button>
                        </div>
                      }
                    </ng-container>
                  }
                  @case (LoanStatus.RETURN_PENDING) {
                    <div class="flex gap-2">
                      <button
                        (click)="showQrCode(loan, 'return')"
                        class="flex-1 ds-btn ds-btn--approve ds-btn--sm justify-center">
                        <lucide-icon name="QrCode" class="shrink-0"></lucide-icon>
                        <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                      </button>
                      <ng-container *ngxPermissionsOnly="['loans:manage']">
                        <button
                          (click)="manualConfirmReturn(loan)"
                          [disabled]="loanService.loading()"
                          [attr.title]="'LOANS.MANUAL_CONFIRM_RETURN' | translate"
                          class="ds-btn ds-btn--ghost ds-btn--sm">
                          <lucide-icon name="CheckCircle" class="shrink-0"></lucide-icon>
                        </button>
                      </ng-container>
                    </div>
                  }
                }
              </div>
            } @empty {
              <div class="p-8 text-center">
                <lucide-icon name="ClipboardList" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
                <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'LOANS.NO_LOANS' | translate }}</h3>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (filteredLoans().length > pageSize) {
            <div class="border-t border-theme px-4 py-2">
              <mat-paginator
                [length]="filteredLoans().length"
                [pageIndex]="pageIndex"
                [pageSize]="pageSize"
                [pageSizeOptions]="[10, 25, 50]"
                (page)="onPageChange($event)"
                showFirstLastButtons
                class="!bg-transparent">
              </mat-paginator>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- New Loan Dialog -->
    @if (showNewLoanDialog) {
      <app-loan-form-dialog
        (closed)="closeNewLoanDialog()"
        (created)="onLoanCreated($event)"
      />
    }

    <!-- QR Code Dialog -->
    @if (showQrDialog) {
      <app-loan-qr-dialog
        [loan]="currentLoan"
        [type]="qrDialogType"
        [qrDataUrl]="currentQrDataUrl"
        (closed)="closeQrDialog()"
      />
    }

    <!-- Scan QR Dialog -->
    @if (showScanDialog) {
      <app-loan-scan-dialog
        (closed)="closeScanDialog()"
        (scanned)="onQrScanned($event)"
      />
    }
  `
})
export class LoansComponent implements OnInit {
  protected loanService = inject(LoanService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  // Expose enum
  LoanStatus = LoanStatus;

  // Filter state
  searchQuery = '';
  selectedStatus = 'all';

  // Pagination
  pageIndex = 0;
  pageSize = 10;

  // Dialog states
  showNewLoanDialog = false;
  showQrDialog = false;
  showScanDialog = false;

  // QR Dialog state
  qrDialogType: 'send' | 'return' = 'send';
  currentQrDataUrl: string | null = null;
  currentLoan: Loan | null = null;

  // Computed
  stats = computed(() => this.loanService.stats());

  // Filtered loans
  private filteredLoansSignal = signal<Loan[]>([]);
  filteredLoans = computed(() => this.filteredLoansSignal());

  // Paginated loans
  paginatedLoans = computed(() => {
    const loans = this.filteredLoansSignal();
    const start = this.pageIndex * this.pageSize;
    return loans.slice(start, start + this.pageSize);
  });

  constructor() {
    // Reactively re-apply filters whenever the service loans signal updates
    effect(() => {
      this.loanService.loans();
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    // Load required data (loans are loaded by the service constructor)
    this.warehouseService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
    this.inventoryService.loadItems();
  }

  applyFilters(): void {
    let loans = this.loanService.loans();

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      loans = loans.filter(loan =>
        loan.inventoryItemName.toLowerCase().includes(query) ||
        loan.sourceWarehouseName.toLowerCase().includes(query) ||
        loan.destinationWarehouseName.toLowerCase().includes(query) ||
        (loan.inventoryItemServiceTag?.toLowerCase().includes(query) ?? false)
      );
    }

    // Status filter
    if (this.selectedStatus !== 'all') {
      loans = loans.filter(loan => loan.status === this.selectedStatus);
    }

    // Sort by loan date descending
    loans = [...loans].sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());

    this.filteredLoansSignal.set(loans);
    this.pageIndex = 0;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  hasFilters(): boolean {
    return this.searchQuery !== '' || this.selectedStatus !== 'all';
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  // ==================== New Loan Dialog ====================

  openNewLoanDialog(): void {
    this.showNewLoanDialog = true;
  }

  closeNewLoanDialog(): void {
    this.showNewLoanDialog = false;
  }

  onLoanCreated(result: LoanFormResult): void {
    this.closeNewLoanDialog();
    // The WebSocket subscription in LoanService already reloads on changes;
    // calling loadLoans() here would cause a double HTTP request.
    this.applyFilters();
  }

  // ==================== QR Operations ====================

  sendLoan(loan: Loan): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('LOANS.CONFIRM_SEND_TITLE'),
        message: this.translate.instant('LOANS.CONFIRM_SEND_MESSAGE', {
          item: loan.inventoryItemName,
          from: loan.sourceWarehouseName,
          to: loan.destinationWarehouseName
        }),
        confirmText: this.translate.instant('LOANS.SEND'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'info'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (confirmed) {
        this.loanService.sendLoan(loan.id).subscribe({
          next: (result) => {
            if (result) {
              this.notifications.success(this.translate.instant('LOANS.SEND_SUCCESS'));
              this.applyFilters();
              // Show QR code
              if (result.qrCodeDataUrl) {
                this.currentQrDataUrl = result.qrCodeDataUrl;
                this.currentLoan = result;
                this.qrDialogType = 'send';
                this.showQrDialog = true;
              }
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('LOANS.SEND_ERROR'));
          }
        });
      }
    });
  }

  initiateReturn(loan: Loan): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('LOANS.CONFIRM_INITIATE_RETURN_TITLE'),
        message: this.translate.instant('LOANS.CONFIRM_INITIATE_RETURN_MESSAGE', {
          item: loan.inventoryItemName
        }),
        confirmText: this.translate.instant('LOANS.INITIATE_RETURN'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'info'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (confirmed) {
        this.loanService.initiateReturn(loan.id).subscribe({
          next: (result) => {
            if (result) {
              this.notifications.success(this.translate.instant('LOANS.INITIATE_RETURN_SUCCESS'));
              this.applyFilters();
              // Show QR code
              if (result.qrCodeDataUrl) {
                this.currentQrDataUrl = result.qrCodeDataUrl;
                this.currentLoan = result;
                this.qrDialogType = 'return';
                this.showQrDialog = true;
              }
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('LOANS.INITIATE_RETURN_ERROR'));
          }
        });
      }
    });
  }

  cancelLoan(loan: Loan): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('LOANS.CONFIRM_CANCEL_TITLE'),
        message: this.translate.instant('LOANS.CONFIRM_CANCEL_MESSAGE', {
          item: loan.inventoryItemName
        }),
        confirmText: this.translate.instant('LOANS.CANCEL_LOAN'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'warning'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (confirmed) {
        this.loanService.cancelLoan(loan.id).subscribe({
          next: (result) => {
            if (result) {
              this.notifications.success(this.translate.instant('LOANS.CANCEL_SUCCESS'));
              this.applyFilters();
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('LOANS.CANCEL_ERROR'));
          }
        });
      }
    });
  }

  // ==================== Manual Confirmation (No QR) ====================

  manualConfirmReceipt(loan: Loan): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('LOANS.MANUAL_CONFIRM_RECEIPT_TITLE'),
        message: this.translate.instant('LOANS.MANUAL_CONFIRM_RECEIPT_WARNING'),
        confirmText: this.translate.instant('LOANS.MANUAL_CONFIRM_RECEIPT'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'warning'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (confirmed) {
        this.loanService.manualConfirmReceipt(loan.id).subscribe({
          next: (result) => {
            if (result) {
              this.notifications.success(this.translate.instant('LOANS.MANUAL_CONFIRM_RECEIPT_SUCCESS'));
              this.applyFilters();
            } else {
              this.notifications.error(this.translate.instant('LOANS.MANUAL_CONFIRM_ERROR'));
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('LOANS.MANUAL_CONFIRM_ERROR'));
          }
        });
      }
    });
  }

  manualConfirmReturn(loan: Loan): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('LOANS.MANUAL_CONFIRM_RETURN_TITLE'),
        message: this.translate.instant('LOANS.MANUAL_CONFIRM_RETURN_WARNING'),
        confirmText: this.translate.instant('LOANS.MANUAL_CONFIRM_RETURN'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'warning'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (confirmed) {
        this.loanService.manualConfirmReturn(loan.id).subscribe({
          next: (result) => {
            if (result) {
              this.notifications.success(this.translate.instant('LOANS.MANUAL_CONFIRM_RETURN_SUCCESS'));
              this.applyFilters();
            } else {
              this.notifications.error(this.translate.instant('LOANS.MANUAL_CONFIRM_RETURN_ERROR'));
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('LOANS.MANUAL_CONFIRM_RETURN_ERROR'));
          }
        });
      }
    });
  }

  showQrCode(loan: Loan, type: 'send' | 'return'): void {
    this.currentLoan = loan;
    this.qrDialogType = type;
    this.currentQrDataUrl = null;
    this.showQrDialog = true;

    this.loanService.getQrCode(loan.id, type).subscribe({
      next: (qrDataUrl) => {
        this.currentQrDataUrl = qrDataUrl;
      },
      error: () => {
        this.notifications.error(this.translate.instant('LOANS.QR.SCAN_ERROR'));
        this.closeQrDialog();
      }
    });
  }

  closeQrDialog(): void {
    this.showQrDialog = false;
    this.currentQrDataUrl = null;
    this.currentLoan = null;
  }

  // ==================== Scan QR Dialog ====================

  openScanDialog(): void {
    this.showScanDialog = true;
  }

  closeScanDialog(): void {
    this.showScanDialog = false;
  }

  onQrScanned(result: ScanQrResult): void {
    this.closeScanDialog();
    this.applyFilters();
  }

  // ==================== Helper Methods ====================

  getStatusLabel(status: LoanStatus): string {
    const key = `LOANS.STATUS.${status}`;
    return this.translate.instant(key);
  }

  getStatusClass(status: LoanStatus): string {
    const classes: Record<string, string> = {
      [LoanStatus.PENDING]: 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] border border-[var(--color-border)]',
      [LoanStatus.SENT]: 'bg-[var(--color-info-bg)] text-[var(--color-status-info)] border border-[var(--color-info-border)]',
      [LoanStatus.RECEIVED]: 'bg-[var(--color-accent-violet-bg)] text-[var(--color-accent-violet)] border border-[var(--color-accent-violet-bg)]',
      [LoanStatus.RETURN_PENDING]: 'bg-[var(--color-accent-amber-bg)] text-[var(--color-accent-amber)] border border-[var(--color-accent-amber-bg)]',
      [LoanStatus.RETURNED]: 'bg-[var(--color-success-bg)] text-[var(--color-status-success)] border border-[var(--color-success-border)]',
      [LoanStatus.OVERDUE]: 'bg-[var(--color-error-bg)] text-[var(--color-status-error)] border border-[var(--color-error-border)]',
      [LoanStatus.CANCELLED]: 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] border border-[var(--color-border)]'
    };
    return classes[status] || 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]';
  }

  getDueDateClass(loan: Loan): string {
    if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.CANCELLED) {
      return 'text-[var(--color-on-surface-variant)]';
    }
    if (loan.status === LoanStatus.OVERDUE) return 'text-[var(--color-status-error)] font-medium';

    const now = new Date();
    const dueDate = new Date(loan.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 3) return 'text-amber-400 font-medium';
    if (daysUntilDue <= 7) return 'text-yellow-400';
    return 'text-foreground';
  }

  exportToXLSX(): void {
    this.loanService.exportToXLSX(this.filteredLoans());
  }
}
