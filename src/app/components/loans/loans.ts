import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LoanService } from '../../services/loan.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { Loan, LoanStatus, LoanWithQr } from '../../interfaces/loan.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatPaginatorModule,
    MatMenuModule,
    TranslateModule
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'LOANS.TITLE' | translate }}</h1>
              <p class="text-slate-500 text-lg">{{ 'LOANS.SUBTITLE' | translate }}</p>
            </div>
            <div class="flex gap-2">
              <button
                (click)="openScanDialog()"
                class="bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap">
                <lucide-icon name="ScanLine" class="!w-5 !h-5 !text-current shrink-0"></lucide-icon>
                <span>{{ 'LOANS.QR.SCAN' | translate }}</span>
              </button>
              <button
                (click)="exportToCSV()"
                class="bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap">
                <lucide-icon name="Download" class="!w-5 !h-5 !text-current shrink-0"></lucide-icon>
                <span>{{ 'COMMON.EXPORT' | translate }}</span>
              </button>
              <button
                (click)="openNewLoanDialog()"
                class="bg-[#4d7c6f] hover:bg-[#5d8c7f] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium whitespace-nowrap">
                <lucide-icon name="Plus" class="!w-5 !h-5 !text-white shrink-0"></lucide-icon>
                <span>{{ 'LOANS.NEW_LOAN' | translate }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'LOANS.PENDING' | translate }}</p>
                <p class="text-2xl font-bold text-foreground">{{ stats().totalPending }}</p>
              </div>
              <div class="bg-slate-800/50 p-3 rounded-lg">
                <lucide-icon name="Clock" class="!text-slate-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'LOANS.SENT' | translate }}</p>
                <p class="text-2xl font-bold text-sky-400">{{ stats().totalSent }}</p>
              </div>
              <div class="bg-sky-950/50 p-3 rounded-lg">
                <lucide-icon name="Send" class="!text-sky-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'LOANS.RECEIVED' | translate }}</p>
                <p class="text-2xl font-bold text-violet-400">{{ stats().totalReceived }}</p>
              </div>
              <div class="bg-violet-950/50 p-3 rounded-lg">
                <lucide-icon name="PackageCheck" class="!text-violet-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'LOANS.OVERDUE' | translate }}</p>
                <p class="text-2xl font-bold text-red-400">{{ stats().totalOverdue }}</p>
              </div>
              <div class="bg-red-950/50 p-3 rounded-lg">
                <lucide-icon name="AlertTriangle" class="!text-red-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'LOANS.RETURNED' | translate }}</p>
                <p class="text-2xl font-bold text-emerald-400">{{ stats().totalReturned }}</p>
              </div>
              <div class="bg-emerald-950/50 p-3 rounded-lg">
                <lucide-icon name="CheckCircle2" class="!text-emerald-400 !w-5 !h-5"></lucide-icon>
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
                  class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-slate-500 focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all"
                />
                <lucide-icon name="Search" class="absolute left-3 top-1/2 -translate-y-1/2 !text-slate-500 !w-5 !h-5"></lucide-icon>
              </div>
            </div>

            <!-- Status Filter -->
            <div class="lg:w-56">
              <select
                [(ngModel)]="selectedStatus"
                (ngModelChange)="applyFilters()"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all cursor-pointer appearance-none"
                style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(148 163 184)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25rem; padding-right: 2.5rem;"
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
                class="bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap">
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
                <tr class="bg-[#141414]">
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'LOANS.ITEM' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'DASHBOARD.TABLE.QUANTITY' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'LOANS.SOURCE_WAREHOUSE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'LOANS.DEST_WAREHOUSE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'LOANS.DUE_DATE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1e1e1e]">
                @for (loan of paginatedLoans(); track loan.id) {
                  <tr class="hover:bg-[#1e1e1e] transition-colors">
                    <td class="px-6 py-4">
                      <div>
                        <p class="text-foreground font-medium">{{ loan.inventoryItemName }}</p>
                        @if (loan.inventoryItemServiceTag) {
                          <p class="text-slate-500 text-sm">{{ loan.inventoryItemServiceTag }}</p>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4 text-foreground">{{ loan.quantity }}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-slate-500 !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ loan.sourceWarehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-[#4d7c6f] !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ loan.destinationWarehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="getDueDateClass(loan)">{{ formatDate(loan.dueDate) }}</span>
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
                            <button
                              (click)="sendLoan(loan)"
                              class="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="Send" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'LOANS.SEND' | translate }}</span>
                            </button>
                            <button
                              (click)="cancelLoan(loan)"
                              class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 text-sm border border-red-600/50">
                              <lucide-icon name="X" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                            </button>
                          }
                          @case (LoanStatus.SENT) {
                            <button
                              (click)="showQrCode(loan, 'send')"
                              class="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="QrCode" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                            </button>
                          }
                          @case (LoanStatus.RECEIVED) {
                            <button
                              (click)="initiateReturn(loan)"
                              class="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="CornerDownLeft" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                            </button>
                          }
                          @case (LoanStatus.OVERDUE) {
                            <button
                              (click)="initiateReturn(loan)"
                              class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="CornerDownLeft" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                            </button>
                          }
                          @case (LoanStatus.RETURN_PENDING) {
                            <button
                              (click)="showQrCode(loan, 'return')"
                              class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="QrCode" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                            </button>
                          }
                          @case (LoanStatus.RETURNED) {
                            <span class="text-slate-500 text-sm">{{ formatDate(loan.returnDate!) }}</span>
                          }
                          @case (LoanStatus.CANCELLED) {
                            <span class="text-slate-500 text-sm">-</span>
                          }
                          @case (LoanStatus.ACTIVE) {
                            <button
                              (click)="initiateReturn(loan)"
                              class="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="CornerDownLeft" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                            </button>
                          }
                          @default {
                            <span class="text-slate-500 text-sm">-</span>
                          }
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="px-6 py-16 text-center">
                      <lucide-icon name="ClipboardList" class="!w-14 !h-14 !text-slate-700 mb-4"></lucide-icon>
                      <h3 class="text-lg font-semibold text-slate-400 mb-2">{{ 'LOANS.NO_LOANS' | translate }}</h3>
                      <p class="text-slate-600">{{ 'LOANS.NO_LOANS_DESC' | translate }}</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="lg:hidden divide-y divide-[#1e1e1e]">
            @for (loan of paginatedLoans(); track loan.id) {
              <div class="p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="text-foreground font-medium">{{ loan.inventoryItemName }}</p>
                    <p class="text-slate-500 text-sm">
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
                    <p class="text-slate-500">{{ 'LOANS.SOURCE_WAREHOUSE' | translate }}</p>
                    <p class="text-foreground">{{ loan.sourceWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-slate-500">{{ 'LOANS.DEST_WAREHOUSE' | translate }}</p>
                    <p class="text-foreground">{{ loan.destinationWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-slate-500">{{ 'LOANS.DUE_DATE' | translate }}</p>
                    <p [class]="getDueDateClass(loan)">{{ formatDate(loan.dueDate) }}</p>
                  </div>
                </div>
                <!-- Mobile Actions -->
                @switch (loan.status) {
                  @case (LoanStatus.PENDING) {
                    <div class="flex gap-2">
                      <button
                        (click)="sendLoan(loan)"
                        class="flex-1 bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                        <lucide-icon name="Send" class="!w-4 !h-4 !text-white"></lucide-icon>
                        <span>{{ 'LOANS.SEND' | translate }}</span>
                      </button>
                      <button
                        (click)="cancelLoan(loan)"
                        class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-2 rounded-lg border border-red-600/50">
                        <lucide-icon name="X" class="!w-4 !h-4 !text-current"></lucide-icon>
                      </button>
                    </div>
                  }
                  @case (LoanStatus.SENT) {
                    <button
                      (click)="showQrCode(loan, 'send')"
                      class="w-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                      <lucide-icon name="QrCode" class="!w-4 !h-4 !text-white"></lucide-icon>
                      <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                    </button>
                  }
                  @case (LoanStatus.RECEIVED) {
                    <button
                      (click)="initiateReturn(loan)"
                      class="w-full bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                      <lucide-icon name="CornerDownLeft" class="!w-4 !h-4 !text-white"></lucide-icon>
                      <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                    </button>
                  }
                  @case (LoanStatus.OVERDUE) {
                    <button
                      (click)="initiateReturn(loan)"
                      class="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                      <lucide-icon name="CornerDownLeft" class="!w-4 !h-4 !text-white"></lucide-icon>
                      <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                    </button>
                  }
                  @case (LoanStatus.RETURN_PENDING) {
                    <button
                      (click)="showQrCode(loan, 'return')"
                      class="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                      <lucide-icon name="QrCode" class="!w-4 !h-4 !text-white"></lucide-icon>
                      <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                    </button>
                  }
                  @case (LoanStatus.ACTIVE) {
                    <button
                      (click)="initiateReturn(loan)"
                      class="w-full bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                      <lucide-icon name="CornerDownLeft" class="!w-4 !h-4 !text-white"></lucide-icon>
                      <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                    </button>
                  }
                }
              </div>
            } @empty {
              <div class="p-8 text-center">
                <lucide-icon name="ClipboardList" class="!w-14 !h-14 !text-slate-700 mb-4"></lucide-icon>
                <h3 class="text-lg font-semibold text-slate-400 mb-2">{{ 'LOANS.NO_LOANS' | translate }}</h3>
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
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeNewLoanDialog()">
        <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'LOANS.NEW_LOAN' | translate }}</h2>
            <p class="text-slate-500 text-sm mt-1">{{ 'LOANS.NEW_LOAN_DESC' | translate }}</p>
          </div>
          <div class="p-6 space-y-4">
            <!-- Source Warehouse Select -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'LOANS.SOURCE_WAREHOUSE' | translate }} *</label>
              <select
                [ngModel]="selectedSourceWarehouseId()"
                (ngModelChange)="onSourceWarehouseChange($event)"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f]"
              >
                <option value="">{{ 'LOANS.SELECT_SOURCE_WAREHOUSE' | translate }}</option>
                @for (warehouse of warehouses(); track warehouse.id) {
                  <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
                }
              </select>
            </div>

            <!-- Destination Warehouse Select -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'LOANS.DEST_WAREHOUSE' | translate }} *</label>
              <select
                [ngModel]="selectedDestWarehouseId()"
                (ngModelChange)="selectedDestWarehouseId.set($event)"
                [disabled]="!selectedSourceWarehouseId()"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] disabled:opacity-50"
              >
                <option value="">{{ 'LOANS.SELECT_DEST_WAREHOUSE' | translate }}</option>
                @for (warehouse of destinationWarehouses(); track warehouse.id) {
                  <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
                }
              </select>
            </div>

            <!-- Due Date -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'LOANS.DUE_DATE' | translate }} *</label>
              <input
                type="date"
                [ngModel]="selectedDueDate()"
                (ngModelChange)="selectedDueDate.set($event)"
                [min]="minDate"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f]"
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'LOANS.NOTES' | translate }}</label>
              <textarea
                [ngModel]="selectedNotes()"
                (ngModelChange)="selectedNotes.set($event)"
                rows="2"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] resize-none"
                [placeholder]="'LOANS.NOTES_PLACEHOLDER' | translate"
              ></textarea>
            </div>

            <!-- Items Section -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-sm font-medium text-slate-400">
                  {{ 'TRANSACTION.ITEMS' | translate }} *
                </label>
                <button
                  type="button"
                  (click)="addLoanItem()"
                  class="text-sm text-[#4d7c6f] hover:text-[#5d8c7f] flex items-center gap-1">
                  <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
                  {{ 'TRANSACTION.ADD_ITEM' | translate }}
                </button>
              </div>

              <div class="space-y-3">
                @for (item of loanItems(); track $index; let i = $index) {
                  <div class="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <div class="flex items-start gap-3">
                      <div class="flex-1 space-y-3">
                        <select
                          [ngModel]="item.inventoryItemId"
                          (ngModelChange)="updateLoanItemId(i, $event)"
                          class="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer">
                          <option value="">{{ 'TRANSACTION.SELECT_ITEM' | translate }}</option>
                          @for (invItem of availableItemsForLoan(); track invItem.id) {
                            <option [value]="invItem.id" [disabled]="isItemAlreadySelected(invItem.id, i)">
                              {{ invItem.name }} ({{ invItem.quantity }} {{ 'TRANSACTION.AVAILABLE' | translate }})
                            </option>
                          }
                        </select>
                        <div class="flex gap-3">
                          <input
                            type="number"
                            [ngModel]="item.quantity"
                            (ngModelChange)="updateLoanItemQuantity(i, $event)"
                            min="1"
                            class="w-24 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors"
                            [placeholder]="'TRANSACTION.QTY_PLACEHOLDER' | translate"
                          />
                          <input
                            type="text"
                            [ngModel]="item.notes"
                            (ngModelChange)="updateLoanItemNotes(i, $event)"
                            class="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
                            [placeholder]="'TRANSACTION.NOTES_OPTIONAL' | translate"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        (click)="removeLoanItem(i)"
                        class="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors">
                        <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>

              @if (loanItems().length === 0) {
                <p class="text-slate-500 text-sm text-center py-4">{{ 'TRANSACTION.NO_ITEMS' | translate }}</p>
              }
            </div>
          </div>
          <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
            <button
              (click)="closeNewLoanDialog()"
              class="px-4 py-2 text-slate-400 hover:text-foreground transition-colors">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button
              (click)="createLoan()"
              [disabled]="!canCreateLoan()"
              class="bg-[#4d7c6f] hover:bg-[#5d8c7f] disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg transition-all">
              {{ 'LOANS.CREATE_LOAN' | translate }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- QR Code Dialog -->
    @if (showQrDialog) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeQrDialog()">
        <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">
              {{ qrDialogType === 'send' ? ('LOANS.QR.SEND_TITLE' | translate) : ('LOANS.QR.RETURN_TITLE' | translate) }}
            </h2>
            <p class="text-slate-500 text-sm mt-1">
              {{ qrDialogType === 'send' ? ('LOANS.QR.SEND_INSTRUCTIONS' | translate) : ('LOANS.QR.RETURN_INSTRUCTIONS' | translate) }}
            </p>
          </div>
          <div class="p-6 flex flex-col items-center">
            @if (currentQrDataUrl) {
              <div class="bg-white p-4 rounded-lg mb-4">
                <img [src]="currentQrDataUrl" alt="QR Code" class="w-56 h-56 block" />
              </div>
              <p class="text-foreground font-medium text-center mb-1">{{ currentLoan?.inventoryItemName }}</p>
              <p class="text-slate-500 text-sm text-center">
                {{ currentLoan?.sourceWarehouseName }} → {{ currentLoan?.destinationWarehouseName }}
              </p>
            } @else {
              <div class="w-64 h-64 flex items-center justify-center bg-slate-800 rounded-lg mb-4">
                <lucide-icon name="Loader2" class="!w-8 !h-8 !text-slate-500 animate-spin"></lucide-icon>
              </div>
              <p class="text-slate-500 text-sm">Cargando QR...</p>
            }
          </div>
          <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
            <button
              (click)="printQrCode()"
              class="bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-foreground px-4 py-2 rounded-lg transition-all flex items-center gap-2">
              <lucide-icon name="Printer" class="!w-4 !h-4 !text-current"></lucide-icon>
              <span>{{ 'LOANS.QR.PRINT' | translate }}</span>
            </button>
            <button
              (click)="downloadQrCode()"
              class="bg-[#4d7c6f] hover:bg-[#5d8c7f] text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
              <lucide-icon name="Download" class="!w-4 !h-4 !text-white"></lucide-icon>
              <span>{{ 'LOANS.QR.DOWNLOAD' | translate }}</span>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Scan QR Dialog -->
    @if (showScanDialog) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeScanDialog()">
        <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'LOANS.QR.SCAN_TITLE' | translate }}</h2>
            <p class="text-slate-500 text-sm mt-1">{{ 'LOANS.QR.SCAN_INSTRUCTIONS' | translate }}</p>
          </div>
          <div class="p-6">
            <div class="mb-4">
              <label class="block text-sm font-medium text-slate-400 mb-2">QR Code Data</label>
              <textarea
                [(ngModel)]="scannedQrData"
                rows="4"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] resize-none font-mono text-sm"
                placeholder="Paste QR code data here..."
              ></textarea>
            </div>
            <p class="text-slate-500 text-xs">
              Scan the QR code with your device camera or paste the scanned data above.
            </p>
          </div>
          <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
            <button
              (click)="closeScanDialog()"
              class="px-4 py-2 text-slate-400 hover:text-foreground transition-colors">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button
              (click)="processScannedQr()"
              [disabled]="!scannedQrData"
              class="bg-[#4d7c6f] hover:bg-[#5d8c7f] disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg transition-all">
              {{ 'COMMON.CONFIRM' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class LoansComponent implements OnInit {
  private loanService = inject(LoanService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);

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

  // Scan Dialog state
  scannedQrData = '';

  // Form signals for reactivity
  selectedSourceWarehouseId = signal('');
  selectedDestWarehouseId = signal('');
  selectedDueDate = signal('');
  selectedNotes = signal('');

  // Items array (like transaction form)
  loanItems = signal<{ inventoryItemId: string; quantity: number; notes: string }[]>([]);

  // Computed
  stats = computed(() => this.loanService.stats());
  warehouses = computed(() => this.warehouseService.warehouses());

  // Destination warehouses (excludes source)
  destinationWarehouses = computed(() => {
    const all = this.warehouseService.warehouses();
    const sourceId = this.selectedSourceWarehouseId();
    return all.filter(w => w.id !== sourceId);
  });

  // Set of item IDs currently on loan (for fast lookup)
  private itemsOnLoanSet = computed(() => {
    const activeLoans = this.loanService.activeLoans();
    return new Set(activeLoans.map(l => l.inventoryItemId));
  });

  // Items available for loan (computed, not method)
  availableItemsForLoan = computed(() => {
    const sourceId = this.selectedSourceWarehouseId();
    const items = this.inventoryService.items();
    const onLoanSet = this.itemsOnLoanSet();

    if (!sourceId) {
      return items.filter(item => !onLoanSet.has(item.id));
    }

    return items.filter(item =>
      item.warehouseId === sourceId && !onLoanSet.has(item.id)
    );
  });

  // Filtered loans
  private filteredLoansSignal = signal<Loan[]>([]);
  filteredLoans = computed(() => this.filteredLoansSignal());

  // Paginated loans
  paginatedLoans = computed(() => {
    const loans = this.filteredLoansSignal();
    const start = this.pageIndex * this.pageSize;
    return loans.slice(start, start + this.pageSize);
  });

  // Min date for due date picker (tomorrow)
  minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  ngOnInit(): void {
    // Load required data
    this.warehouseService.getAll().subscribe();
    this.inventoryService.loadItems();
    this.loanService.loadLoans();

    // Apply filters after short delay to allow data to load
    setTimeout(() => this.applyFilters(), 100);
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
    loans = loans.sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());

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
    this.selectedSourceWarehouseId.set('');
    this.selectedDestWarehouseId.set('');
    this.selectedDueDate.set('');
    this.selectedNotes.set('');
    this.loanItems.set([]);
    this.showNewLoanDialog = true;
  }

  closeNewLoanDialog(): void {
    this.showNewLoanDialog = false;
  }

  onSourceWarehouseChange(warehouseId: string): void {
    this.selectedSourceWarehouseId.set(warehouseId);
    this.loanItems.set([]);
    this.selectedDestWarehouseId.set('');
  }

  addLoanItem(): void {
    this.loanItems.update(items => [...items, { inventoryItemId: '', quantity: 1, notes: '' }]);
  }

  updateLoanItemId(index: number, itemId: string): void {
    this.loanItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], inventoryItemId: itemId };
      return newItems;
    });
  }

  updateLoanItemQuantity(index: number, quantity: number): void {
    this.loanItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], quantity: quantity || 1 };
      return newItems;
    });
  }

  updateLoanItemNotes(index: number, notes: string): void {
    this.loanItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], notes };
      return newItems;
    });
  }

  removeLoanItem(index: number): void {
    this.loanItems.update(items => items.filter((_, i) => i !== index));
  }

  isItemAlreadySelected(itemId: string, currentIndex: number): boolean {
    return this.loanItems().some((item, i) => i !== currentIndex && item.inventoryItemId === itemId);
  }

  canCreateLoan(): boolean {
    const items = this.loanItems();
    const hasValidItems = items.length > 0 && items.every(item => item.inventoryItemId);
    return hasValidItems &&
           !!this.selectedSourceWarehouseId() &&
           !!this.selectedDestWarehouseId() &&
           !!this.selectedDueDate() &&
           this.selectedSourceWarehouseId() !== this.selectedDestWarehouseId();
  }

  createLoan(): void {
    if (!this.canCreateLoan()) return;

    const items = this.loanItems().filter(item => item.inventoryItemId);
    const generalNotes = this.selectedNotes();
    let successCount = 0;
    let completedCount = 0;

    for (const item of items) {
      const notes = [generalNotes, item.notes].filter(n => n).join(' - ') || undefined;

      this.loanService.createLoan({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
        sourceWarehouseId: this.selectedSourceWarehouseId(),
        destinationWarehouseId: this.selectedDestWarehouseId(),
        dueDate: this.selectedDueDate(),
        notes
      }).subscribe({
        next: (result) => {
          if (result) {
            successCount++;
          }
          completedCount++;
          this.checkAllCompleted(completedCount, items.length, successCount);
        },
        error: () => {
          completedCount++;
          this.checkAllCompleted(completedCount, items.length, successCount);
        }
      });
    }
  }

  private checkAllCompleted(completed: number, total: number, successCount: number): void {
    if (completed === total) {
      if (successCount > 0) {
        const message = successCount === 1
          ? this.translate.instant('LOANS.LOAN_CREATED')
          : this.translate.instant('LOANS.LOANS_CREATED', { count: successCount });
        this.notifications.success(message);
        this.closeNewLoanDialog();
        // Reload loans from server to ensure fresh data
        this.loanService.loadLoans();
        setTimeout(() => this.applyFilters(), 300);
      } else {
        this.notifications.error(this.translate.instant('LOANS.LOAN_ERROR'));
      }
    }
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

    dialogRef.afterClosed().subscribe(confirmed => {
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

    dialogRef.afterClosed().subscribe(confirmed => {
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

    dialogRef.afterClosed().subscribe(confirmed => {
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

  printQrCode(): void {
    if (!this.currentQrDataUrl || !this.currentLoan) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${this.currentLoan.inventoryItemName}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              img { max-width: 300px; }
              h2 { margin-bottom: 5px; }
              p { color: #666; margin: 5px 0; }
            </style>
          </head>
          <body>
            <img src="${this.currentQrDataUrl}" alt="QR Code" />
            <h2>${this.currentLoan.inventoryItemName}</h2>
            <p>${this.currentLoan.sourceWarehouseName} → ${this.currentLoan.destinationWarehouseName}</p>
            <p>${this.qrDialogType === 'send' ? 'Scan to confirm receipt' : 'Scan to confirm return'}</p>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  downloadQrCode(): void {
    if (!this.currentQrDataUrl || !this.currentLoan) return;

    const link = document.createElement('a');
    link.href = this.currentQrDataUrl;
    link.download = `qr-${this.qrDialogType}-${this.currentLoan.id}.png`;
    link.click();
  }

  // ==================== Scan QR Dialog ====================

  openScanDialog(): void {
    this.scannedQrData = '';
    this.showScanDialog = true;
  }

  closeScanDialog(): void {
    this.showScanDialog = false;
    this.scannedQrData = '';
  }

  processScannedQr(): void {
    if (!this.scannedQrData) return;

    this.loanService.scanQr(this.scannedQrData).subscribe({
      next: (result) => {
        if (result) {
          this.notifications.success(this.translate.instant('LOANS.QR.SCAN_SUCCESS'));
          this.closeScanDialog();
          this.applyFilters();
        }
      },
      error: () => {
        this.notifications.error(this.translate.instant('LOANS.QR.SCAN_ERROR'));
      }
    });
  }

  // ==================== Helper Methods ====================

  getStatusLabel(status: LoanStatus): string {
    const key = `LOANS.STATUS.${status}`;
    return this.translate.instant(key);
  }

  getStatusClass(status: LoanStatus): string {
    const classes: Record<string, string> = {
      [LoanStatus.PENDING]: 'bg-slate-800/50 text-slate-400 border border-slate-700',
      [LoanStatus.SENT]: 'bg-sky-950/50 text-sky-400 border border-sky-900',
      [LoanStatus.RECEIVED]: 'bg-violet-950/50 text-violet-400 border border-violet-900',
      [LoanStatus.RETURN_PENDING]: 'bg-amber-950/50 text-amber-400 border border-amber-900',
      [LoanStatus.RETURNED]: 'bg-emerald-950/50 text-emerald-400 border border-emerald-900',
      [LoanStatus.OVERDUE]: 'bg-red-950/50 text-red-400 border border-red-900',
      [LoanStatus.CANCELLED]: 'bg-slate-800/50 text-slate-500 border border-slate-700',
      [LoanStatus.ACTIVE]: 'bg-sky-950/50 text-sky-400 border border-sky-900'
    };
    return classes[status] || 'bg-slate-800 text-slate-400';
  }

  getDueDateClass(loan: Loan): string {
    if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.CANCELLED) {
      return 'text-slate-400';
    }
    if (loan.status === LoanStatus.OVERDUE) return 'text-red-400 font-medium';

    const now = new Date();
    const dueDate = new Date(loan.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 3) return 'text-amber-400 font-medium';
    if (daysUntilDue <= 7) return 'text-yellow-400';
    return 'text-foreground';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }

  exportToCSV(): void {
    this.loanService.exportToCSV(this.filteredLoans());
  }
}
