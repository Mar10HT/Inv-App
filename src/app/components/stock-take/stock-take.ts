import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { StockTakeService } from '../../services/stock-take.service';
import { WarehouseService } from '../../services/warehouse.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import {
  StockTake,
  StockTakeStatus,
  StockTakeItem,
  VarianceReport,
} from '../../interfaces/stock-take.interface';

@Component({
  selector: 'app-stock-take',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatPaginatorModule,
    TranslateModule,
    NgxPermissionsModule,
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">

        <!-- ==================== LIST VIEW ==================== -->
        @if (currentView() === 'list') {

          <!-- Header -->
          <div class="mb-8">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'STOCK_TAKE.TITLE' | translate }}</h1>
                <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'STOCK_TAKE.SUBTITLE' | translate }}</p>
              </div>
              <ng-container *ngxPermissionsOnly="['create_stock_takes']">
                <button
                  (click)="openNewDialog()"
                  class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium whitespace-nowrap">
                  <lucide-icon name="Plus" class="!w-5 !h-5 !text-white shrink-0"></lucide-icon>
                  <span>{{ 'STOCK_TAKE.NEW' | translate }}</span>
                </button>
              </ng-container>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-surface-variant border border-theme rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.STATS.TOTAL' | translate }}</p>
                  <p class="text-2xl font-bold text-foreground">{{ stats().total }}</p>
                </div>
                <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
                  <lucide-icon name="ClipboardCheck" class="!text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
                </div>
              </div>
            </div>
            <div class="bg-surface-variant border border-theme rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.STATS.IN_PROGRESS' | translate }}</p>
                  <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ stats().inProgress }}</p>
                </div>
                <div class="bg-[var(--color-info-bg)] p-3 rounded-lg">
                  <lucide-icon name="Clock" class="!text-[var(--color-status-info)] !w-5 !h-5"></lucide-icon>
                </div>
              </div>
            </div>
            <div class="bg-surface-variant border border-theme rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.STATS.COMPLETED' | translate }}</p>
                  <p class="text-2xl font-bold text-[var(--color-status-success)]">{{ stats().completed }}</p>
                </div>
                <div class="bg-[var(--color-success-bg)] p-3 rounded-lg">
                  <lucide-icon name="CheckCircle2" class="!text-[var(--color-status-success)] !w-5 !h-5"></lucide-icon>
                </div>
              </div>
            </div>
            <div class="bg-surface-variant border border-theme rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.STATS.CANCELLED' | translate }}</p>
                  <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ stats().cancelled }}</p>
                </div>
                <div class="bg-[var(--color-error-bg)] p-3 rounded-lg">
                  <lucide-icon name="XCircle" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
                </div>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="bg-surface-variant border border-theme rounded-xl p-6 mb-8">
            <div class="flex flex-col lg:flex-row gap-4">
              <div class="flex-1">
                <div class="relative">
                  <input
                    type="text"
                    [(ngModel)]="searchQuery"
                    (ngModelChange)="applyFilters()"
                    [placeholder]="'STOCK_TAKE.SEARCH_PLACEHOLDER' | translate"
                    class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                  />
                  <lucide-icon name="Search" class="absolute left-3 top-1/2 -translate-y-1/2 !text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
                </div>
              </div>
              <div class="lg:w-56">
                <select
                  [(ngModel)]="selectedStatus"
                  (ngModelChange)="applyFilters()"
                  class="select-chevron w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer appearance-none"
                >
                  <option value="all">{{ 'STOCK_TAKE.ALL_STATUS' | translate }}</option>
                  <option [value]="Status.IN_PROGRESS">{{ 'STOCK_TAKE.STATUS.IN_PROGRESS' | translate }}</option>
                  <option [value]="Status.COMPLETED">{{ 'STOCK_TAKE.STATUS.COMPLETED' | translate }}</option>
                  <option [value]="Status.CANCELLED">{{ 'STOCK_TAKE.STATUS.CANCELLED' | translate }}</option>
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

          <!-- Table -->
          <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
            <div class="px-6 py-4 border-b border-theme">
              <h2 class="text-xl font-semibold text-foreground">{{ 'STOCK_TAKE.LIST' | translate }}</h2>
            </div>

            <!-- Desktop Table -->
            <div class="hidden lg:block overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="bg-[var(--color-surface)]">
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.WAREHOUSE' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.CREATED_BY' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.DATE' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border-subtle)]">
                  @for (st of paginatedItems(); track st.id) {
                    <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                      <td class="px-6 py-4">
                        <div>
                          <div class="flex items-center gap-2">
                            <lucide-icon name="Warehouse" class="!text-[var(--color-on-surface-variant)] !w-4 !h-4"></lucide-icon>
                            <p class="text-foreground font-medium">{{ st.warehouseName }}</p>
                          </div>
                          @if (st.notes) {
                            <p class="text-[var(--color-on-surface-variant)] text-sm truncate max-w-xs mt-1 ml-6">{{ st.notes }}</p>
                          }
                        </div>
                      </td>
                      <td class="px-6 py-4 text-foreground">{{ st.startedByName }}</td>
                      <td class="px-6 py-4 text-foreground">{{ formatDate(st.createdAt) }}</td>
                      <td class="px-6 py-4">
                        <span [class]="getStatusClass(st.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                          {{ getStatusLabel(st.status) }}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          <button
                            (click)="openDetail(st)"
                            class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                            <lucide-icon name="Eye" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                            <span>{{ 'COMMON.VIEW' | translate }}</span>
                          </button>
                          @if (st.status === Status.COMPLETED) {
                            <button
                              (click)="openVarianceReport(st)"
                              class="bg-violet-600/20 hover:bg-violet-600 text-violet-400 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap border border-violet-600/50">
                              <lucide-icon name="BarChart3" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-6 py-16 text-center">
                        <lucide-icon name="ClipboardCheck" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
                        <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'STOCK_TAKE.NO_STOCK_TAKES' | translate }}</h3>
                        <p class="text-[var(--color-on-surface-muted)]">{{ 'STOCK_TAKE.NO_STOCK_TAKES_DESC' | translate }}</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="lg:hidden divide-y divide-[var(--color-border-subtle)]">
              @for (st of paginatedItems(); track st.id) {
                <div class="p-4 cursor-pointer" (click)="openDetail(st)">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <p class="text-foreground font-medium">{{ st.warehouseName }}</p>
                      @if (st.notes) {
                        <p class="text-[var(--color-on-surface-variant)] text-sm truncate">{{ st.notes }}</p>
                      }
                    </div>
                    <span [class]="getStatusClass(st.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                      {{ getStatusLabel(st.status) }}
                    </span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-[var(--color-on-surface-variant)]">{{ st.startedByName }}</span>
                    <span class="text-[var(--color-on-surface-variant)]">{{ formatDate(st.createdAt) }}</span>
                  </div>
                </div>
              } @empty {
                <div class="p-8 text-center">
                  <lucide-icon name="ClipboardCheck" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
                  <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'STOCK_TAKE.NO_STOCK_TAKES' | translate }}</h3>
                </div>
              }
            </div>

            <!-- Pagination -->
            @if (filteredItems().length > pageSize) {
              <div class="border-t border-theme px-4 py-2">
                <mat-paginator
                  [length]="filteredItems().length"
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
        }

        <!-- ==================== DETAIL VIEW ==================== -->
        @if (currentView() === 'detail' && selectedStockTake()) {

          <!-- Header -->
          <div class="mb-8">
            <button
              (click)="backToList()"
              class="text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors flex items-center gap-2 mb-4">
              <lucide-icon name="ArrowLeft" class="!w-4 !h-4"></lucide-icon>
              {{ 'STOCK_TAKE.DETAIL.BACK' | translate }}
            </button>
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div class="flex items-center gap-3 mb-2">
                  <h1 class="text-3xl font-bold text-foreground">{{ selectedStockTake()!.warehouseName }}</h1>
                  <span [class]="getStatusClass(selectedStockTake()!.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                    {{ getStatusLabel(selectedStockTake()!.status) }}
                  </span>
                </div>
                @if (selectedStockTake()!.notes) {
                  <p class="text-[var(--color-on-surface-variant)]">{{ selectedStockTake()!.notes }}</p>
                }
              </div>
              @if (selectedStockTake()!.status === Status.IN_PROGRESS) {
                <div class="flex gap-2">
                  <ng-container *ngxPermissionsOnly="['manage_stock_takes']">
                    <button
                      (click)="cancelStockTake()"
                      class="bg-red-600/20 hover:bg-red-600 text-[var(--color-status-error)] hover:text-white px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm border border-red-600/50 font-medium">
                      <lucide-icon name="X" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                      <span>{{ 'STOCK_TAKE.CANCEL.BUTTON' | translate }}</span>
                    </button>
                    <button
                      (click)="completeStockTake()"
                      class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium">
                      <lucide-icon name="CheckCircle2" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                      <span>{{ 'STOCK_TAKE.COMPLETE.BUTTON' | translate }}</span>
                    </button>
                  </ng-container>
                </div>
              }
              @if (selectedStockTake()!.status === Status.COMPLETED) {
                <button
                  (click)="openVarianceReport(selectedStockTake()!)"
                  class="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium">
                  <lucide-icon name="BarChart3" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                  <span>{{ 'STOCK_TAKE.VARIANCE.VIEW_REPORT' | translate }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="bg-surface-variant border border-theme rounded-xl p-6 mb-8">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.DETAIL.PROGRESS_LABEL' | translate }}</span>
              <span class="text-sm text-foreground font-medium">
                {{ selectedStockTake()!.countedItems }} {{ 'STOCK_TAKE.DETAIL.ITEMS_OF' | translate }} {{ selectedStockTake()!.totalItems }} {{ 'STOCK_TAKE.DETAIL.ITEMS_COUNTED' | translate }}
              </span>
            </div>
            <div class="w-full bg-[var(--color-surface-elevated)] rounded-full h-3">
              <div class="bg-[var(--color-primary)] h-3 rounded-full transition-all" [style.width.%]="getProgress(selectedStockTake()!)"></div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
            <div class="px-6 py-4 border-b border-theme">
              <h2 class="text-xl font-semibold text-foreground">{{ 'STOCK_TAKE.DETAIL.TITLE' | translate }}</h2>
            </div>

            <!-- Desktop Table -->
            <div class="hidden lg:block overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="bg-[var(--color-surface)]">
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.DETAIL.ITEM' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.DETAIL.EXPECTED_QTY' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.DETAIL.COUNTED_QTY' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.DETAIL.VARIANCE' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.DETAIL.NOTES' | translate }}</th>
                    @if (selectedStockTake()!.status === Status.IN_PROGRESS) {
                      <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
                    }
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border-subtle)]">
                  @for (item of selectedStockTake()!.items; track item.id) {
                    <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                      <td class="px-6 py-4">
                        <div>
                          <p class="text-foreground font-medium">{{ item.itemName }}</p>
                          @if (item.warehouseName) {
                            <p class="text-[var(--color-on-surface-variant)] text-sm">{{ item.warehouseName }}</p>
                          }
                        </div>
                      </td>
                      <td class="px-6 py-4 text-foreground">{{ item.expectedQty }}</td>
                      <td class="px-6 py-4">
                        @if (selectedStockTake()!.status === Status.IN_PROGRESS) {
                          <input
                            type="number"
                            [ngModel]="editingItems[item.id]?.countedQty ?? item.countedQty"
                            (ngModelChange)="onCountChange(item, $event)"
                            min="0"
                            [placeholder]="'STOCK_TAKE.DETAIL.ENTER_QTY' | translate"
                            class="w-24 bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          />
                        } @else {
                          <span [class]="item.countedQty !== null ? 'text-foreground' : 'text-[var(--color-on-surface-muted)]'">
                            {{ item.countedQty !== null ? item.countedQty : ('STOCK_TAKE.DETAIL.NOT_COUNTED' | translate) }}
                          </span>
                        }
                      </td>
                      <td class="px-6 py-4">
                        @if (item.countedQty !== null) {
                          <span [class]="getVarianceClass(item.variance ?? 0)">
                            {{ (item.variance ?? 0) > 0 ? '+' : '' }}{{ item.variance }}
                          </span>
                        } @else {
                          <span class="text-[var(--color-on-surface-muted)]">-</span>
                        }
                      </td>
                      <td class="px-6 py-4">
                        @if (selectedStockTake()!.status === Status.IN_PROGRESS) {
                          <input
                            type="text"
                            [ngModel]="editingItems[item.id]?.notes ?? item.notes ?? ''"
                            (ngModelChange)="onNotesChange(item, $event)"
                            [placeholder]="'STOCK_TAKE.DETAIL.ENTER_NOTES' | translate"
                            class="w-full max-w-[200px] bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          />
                        } @else {
                          <span class="text-[var(--color-on-surface-variant)] text-sm">{{ item.notes || '-' }}</span>
                        }
                      </td>
                      @if (selectedStockTake()!.status === Status.IN_PROGRESS) {
                        <td class="px-6 py-4">
                          @if (editingItems[item.id]) {
                            <button
                              (click)="saveItemCount(item)"
                              [disabled]="savingItem() === item.id"
                              class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-surface-elevated)] text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              @if (savingItem() === item.id) {
                                <lucide-icon name="Loader2" class="!w-4 !h-4 !text-white animate-spin shrink-0"></lucide-icon>
                              } @else {
                                <lucide-icon name="Save" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              }
                              <span>{{ 'STOCK_TAKE.DETAIL.SAVE_COUNT' | translate }}</span>
                            </button>
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="lg:hidden divide-y divide-[var(--color-border-subtle)]">
              @for (item of selectedStockTake()!.items; track item.id) {
                <div class="p-4">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <p class="text-foreground font-medium">{{ item.itemName }}</p>
                      @if (item.warehouseName) {
                        <p class="text-[var(--color-on-surface-variant)] text-sm">{{ item.warehouseName }}</p>
                      }
                    </div>
                    @if (item.countedQty !== null) {
                      <span [class]="getVarianceClass(item.variance ?? 0)" class="text-sm font-medium">
                        {{ (item.variance ?? 0) > 0 ? '+' : '' }}{{ item.variance }}
                      </span>
                    }
                  </div>
                  <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.DETAIL.EXPECTED_QTY' | translate }}</p>
                      <p class="text-foreground">{{ item.expectedQty }}</p>
                    </div>
                    <div>
                      <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.DETAIL.COUNTED_QTY' | translate }}</p>
                      @if (selectedStockTake()!.status === Status.IN_PROGRESS) {
                        <input
                          type="number"
                          [ngModel]="editingItems[item.id]?.countedQty ?? item.countedQty"
                          (ngModelChange)="onCountChange(item, $event)"
                          min="0"
                          [placeholder]="'STOCK_TAKE.DETAIL.ENTER_QTY' | translate"
                          class="w-20 bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-2 py-1 text-foreground text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                      } @else {
                        <p [class]="item.countedQty !== null ? 'text-foreground' : 'text-[var(--color-on-surface-muted)]'">
                          {{ item.countedQty !== null ? item.countedQty : '-' }}
                        </p>
                      }
                    </div>
                  </div>
                  @if (selectedStockTake()!.status === Status.IN_PROGRESS && editingItems[item.id]) {
                    <button
                      (click)="saveItemCount(item)"
                      [disabled]="savingItem() === item.id"
                      class="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-surface-elevated)] text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                      <lucide-icon name="Save" class="!w-4 !h-4 !text-white"></lucide-icon>
                      <span>{{ 'STOCK_TAKE.DETAIL.SAVE_COUNT' | translate }}</span>
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- ==================== VARIANCE VIEW ==================== -->
        @if (currentView() === 'variance' && varianceReport()) {

          <!-- Header -->
          <div class="mb-8">
            <button
              (click)="backFromVariance()"
              class="text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors flex items-center gap-2 mb-4">
              <lucide-icon name="ArrowLeft" class="!w-4 !h-4"></lucide-icon>
              {{ 'STOCK_TAKE.VARIANCE.BACK' | translate }}
            </button>
            <h1 class="text-3xl font-bold text-foreground mb-2">{{ 'STOCK_TAKE.VARIANCE.TITLE' | translate }}</h1>
            <p class="text-[var(--color-on-surface-variant)]">{{ varianceReport()!.stockTake.warehouse.name }}</p>
          </div>

          <!-- Summary Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-surface-variant border border-theme rounded-xl p-4">
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.TOTAL_ITEMS' | translate }}</p>
              <p class="text-2xl font-bold text-foreground">{{ varianceReport()!.summary.totalItems }}</p>
            </div>
            <div class="bg-surface-variant border border-theme rounded-xl p-4">
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.ITEMS_COUNTED' | translate }}</p>
              <p class="text-2xl font-bold text-foreground">{{ varianceReport()!.summary.countedItems }}</p>
            </div>
            <div class="bg-surface-variant border border-theme rounded-xl p-4">
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.TOTAL_SURPLUS' | translate }}</p>
              <p class="text-2xl font-bold text-[var(--color-status-success)]">+{{ varianceReport()!.summary.totalPositiveVariance }}</p>
            </div>
            <div class="bg-surface-variant border border-theme rounded-xl p-4">
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.TOTAL_SHORTAGE' | translate }}</p>
              <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ varianceReport()!.summary.totalNegativeVariance }}</p>
            </div>
          </div>

          <!-- Variance Table -->
          <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
            <div class="px-6 py-4 border-b border-theme">
              <h2 class="text-xl font-semibold text-foreground">{{ 'STOCK_TAKE.VARIANCE.SUMMARY' | translate }}</h2>
            </div>

            <!-- Desktop Table -->
            <div class="hidden lg:block overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="bg-[var(--color-surface)]">
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.VARIANCE.ITEM' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.VARIANCE.EXPECTED' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.VARIANCE.COUNTED' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'STOCK_TAKE.VARIANCE.DIFFERENCE' | translate }}</th>
                    <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border-subtle)]">
                  @for (item of varianceReport()!.items; track item.id) {
                    <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                      <td class="px-6 py-4">
                        <p class="text-foreground font-medium">{{ item.itemName }}</p>
                      </td>
                      <td class="px-6 py-4 text-foreground">{{ item.expectedQty }}</td>
                      <td class="px-6 py-4 text-foreground">{{ item.countedQty ?? '-' }}</td>
                      <td class="px-6 py-4">
                        <span [class]="getVarianceClass(item.variance ?? 0)" class="font-medium">
                          {{ (item.variance ?? 0) > 0 ? '+' : '' }}{{ item.variance }}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        @if ((item.variance ?? 0) > 0) {
                          <span class="bg-[var(--color-success-bg)] text-[var(--color-status-success)] border border-[var(--color-success-border)] inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                            {{ 'STOCK_TAKE.VARIANCE.SURPLUS' | translate }}
                          </span>
                        } @else if ((item.variance ?? 0) < 0) {
                          <span class="bg-[var(--color-error-bg)] text-[var(--color-status-error)] border border-[var(--color-error-border)] inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                            {{ 'STOCK_TAKE.VARIANCE.SHORTAGE' | translate }}
                          </span>
                        } @else {
                          <span class="bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] border border-[var(--color-border)] inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                            {{ 'STOCK_TAKE.VARIANCE.MATCH' | translate }}
                          </span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-6 py-16 text-center">
                        <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.NO_VARIANCE' | translate }}</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="lg:hidden divide-y divide-[var(--color-border-subtle)]">
              @for (item of varianceReport()!.items; track item.id) {
                <div class="p-4">
                  <div class="flex justify-between items-start mb-2">
                    <p class="text-foreground font-medium">{{ item.itemName }}</p>
                    <span [class]="getVarianceClass(item.variance ?? 0)" class="text-sm font-medium">
                      {{ (item.variance ?? 0) > 0 ? '+' : '' }}{{ item.variance }}
                    </span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.EXPECTED' | translate }}</p>
                      <p class="text-foreground">{{ item.expectedQty }}</p>
                    </div>
                    <div>
                      <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.VARIANCE.COUNTED' | translate }}</p>
                      <p class="text-foreground">{{ item.countedQty ?? '-' }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>

    <!-- New Stock Take Dialog -->
    @if (showNewDialog) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeNewDialog()">
        <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-lg" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'STOCK_TAKE.NEW' | translate }}</h2>
            <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'STOCK_TAKE.NEW_DESC' | translate }}</p>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'STOCK_TAKE.WAREHOUSE' | translate }} *</label>
              <select
                [(ngModel)]="newWarehouseId"
                class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                <option value="">{{ 'STOCK_TAKE.SELECT_WAREHOUSE' | translate }}</option>
                @for (warehouse of warehouses(); track warehouse.id) {
                  <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'STOCK_TAKE.DESCRIPTION' | translate }}</label>
              <textarea
                [(ngModel)]="newNotes"
                rows="2"
                class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                [placeholder]="'STOCK_TAKE.DESCRIPTION_PLACEHOLDER' | translate"
              ></textarea>
            </div>
          </div>
          <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
            <button
              (click)="closeNewDialog()"
              class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button
              (click)="createStockTake()"
              [disabled]="!newWarehouseId"
              class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-surface-elevated)] disabled:text-[var(--color-on-surface-variant)] text-white px-6 py-2 rounded-lg transition-all">
              {{ 'COMMON.CREATE' | translate }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Complete Dialog -->
    @if (showCompleteDialog) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeCompleteDialog()">
        <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'STOCK_TAKE.COMPLETE.TITLE' | translate }}</h2>
          </div>
          <div class="p-6 space-y-4">
            <p class="text-[var(--color-on-surface-variant)]">{{ 'STOCK_TAKE.COMPLETE.MESSAGE' | translate }}</p>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                [(ngModel)]="applyToInventory"
                class="mt-1 w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
              />
              <div>
                <p class="text-foreground font-medium">{{ 'STOCK_TAKE.COMPLETE.APPLY_INVENTORY' | translate }}</p>
                <p class="text-[var(--color-on-surface-variant)] text-sm">{{ 'STOCK_TAKE.COMPLETE.APPLY_HINT' | translate }}</p>
              </div>
            </label>
          </div>
          <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
            <button
              (click)="closeCompleteDialog()"
              class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button
              (click)="confirmComplete()"
              class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-2 rounded-lg transition-all">
              {{ 'STOCK_TAKE.COMPLETE.BUTTON' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class StockTakeComponent implements OnInit {
  private stockTakeService = inject(StockTakeService);
  private warehouseService = inject(WarehouseService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);

  Status = StockTakeStatus;

  // View management
  currentView = signal<'list' | 'detail' | 'variance'>('list');
  selectedStockTake = signal<StockTake | null>(null);
  varianceReport = signal<VarianceReport | null>(null);

  // List state
  searchQuery = '';
  selectedStatus = 'all';
  pageIndex = 0;
  pageSize = 10;

  // New dialog
  showNewDialog = false;
  newNotes = '';
  newWarehouseId = '';

  // Complete dialog
  showCompleteDialog = false;
  applyToInventory = false;

  // Editing state
  editingItems: Record<string, { countedQty: number | null; notes: string }> = {};
  savingItem = signal<string | null>(null);

  // Computed
  stats = computed(() => this.stockTakeService.stats());
  warehouses = computed(() => this.warehouseService.warehouses());

  private filteredItemsSignal = signal<StockTake[]>([]);
  filteredItems = computed(() => this.filteredItemsSignal());

  paginatedItems = computed(() => {
    const items = this.filteredItemsSignal();
    const start = this.pageIndex * this.pageSize;
    return items.slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.warehouseService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err),
    });
    this.stockTakeService.loadStockTakes();
    setTimeout(() => this.applyFilters(), 100);
  }

  applyFilters(): void {
    let items = this.stockTakeService.stockTakes();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      items = items.filter(
        (st) =>
          st.warehouseName.toLowerCase().includes(query) ||
          st.startedByName.toLowerCase().includes(query) ||
          (st.notes && st.notes.toLowerCase().includes(query)),
      );
    }

    if (this.selectedStatus !== 'all') {
      items = items.filter((st) => st.status === this.selectedStatus);
    }

    items = items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    this.filteredItemsSignal.set(items);
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

  // ==================== Navigation ====================

  openDetail(st: StockTake): void {
    this.stockTakeService.getById(st.id).subscribe({
      next: (detail) => {
        this.selectedStockTake.set(detail);
        this.editingItems = {};
        this.currentView.set('detail');
      },
      error: (err) => this.notifications.handleError(err),
    });
  }

  backToList(): void {
    this.currentView.set('list');
    this.selectedStockTake.set(null);
    this.editingItems = {};
    this.stockTakeService.loadStockTakes();
    setTimeout(() => this.applyFilters(), 100);
  }

  openVarianceReport(st: StockTake): void {
    this.stockTakeService.getVarianceReport(st.id).subscribe({
      next: (report) => {
        this.varianceReport.set(report);
        this.currentView.set('variance');
      },
      error: (err) => this.notifications.handleError(err),
    });
  }

  backFromVariance(): void {
    const st = this.selectedStockTake();
    if (st) {
      this.currentView.set('detail');
    } else {
      this.currentView.set('list');
    }
    this.varianceReport.set(null);
  }

  // ==================== New Dialog ====================

  openNewDialog(): void {
    this.newNotes = '';
    this.newWarehouseId = '';
    this.showNewDialog = true;
  }

  closeNewDialog(): void {
    this.showNewDialog = false;
  }

  createStockTake(): void {
    if (!this.newWarehouseId) return;

    this.stockTakeService
      .create({
        warehouseId: this.newWarehouseId,
        notes: this.newNotes.trim() || undefined,
      })
      .subscribe({
        next: (created) => {
          this.notifications.success(this.translate.instant('STOCK_TAKE.CREATE_SUCCESS'));
          this.closeNewDialog();
          this.applyFilters();
          this.openDetail(created);
        },
        error: () => {
          this.notifications.error(this.translate.instant('STOCK_TAKE.CREATE_ERROR'));
        },
      });
  }

  // ==================== Item Editing ====================

  onCountChange(item: StockTakeItem, value: number | null): void {
    if (!this.editingItems[item.id]) {
      this.editingItems[item.id] = { countedQty: value, notes: item.notes || '' };
    } else {
      this.editingItems[item.id].countedQty = value;
    }
  }

  onNotesChange(item: StockTakeItem, value: string): void {
    if (!this.editingItems[item.id]) {
      this.editingItems[item.id] = { countedQty: item.countedQty, notes: value };
    } else {
      this.editingItems[item.id].notes = value;
    }
  }

  saveItemCount(item: StockTakeItem): void {
    const st = this.selectedStockTake();
    const edit = this.editingItems[item.id];
    if (!st || !edit || edit.countedQty === null || edit.countedQty === undefined) return;

    this.savingItem.set(item.id);

    this.stockTakeService
      .updateItem(st.id, {
        itemId: item.itemId,
        countedQty: edit.countedQty,
        notes: edit.notes || undefined,
      })
      .subscribe({
        next: (updatedItem) => {
          // Update the item in the selectedStockTake
          const current = this.selectedStockTake();
          if (current) {
            const updatedItems = current.items.map((i) =>
              i.id === updatedItem.id ? updatedItem : i,
            );
            const countedItems = updatedItems.filter((i) => i.countedQty !== null).length;
            this.selectedStockTake.set({
              ...current,
              items: updatedItems,
              countedItems,
            });
          }
          delete this.editingItems[item.id];
          this.savingItem.set(null);
          this.notifications.success(this.translate.instant('STOCK_TAKE.DETAIL.COUNT_SAVED'));
        },
        error: () => {
          this.savingItem.set(null);
          this.notifications.error(this.translate.instant('STOCK_TAKE.DETAIL.COUNT_ERROR'));
        },
      });
  }

  // ==================== Complete / Cancel ====================

  completeStockTake(): void {
    this.applyToInventory = false;
    this.showCompleteDialog = true;
  }

  closeCompleteDialog(): void {
    this.showCompleteDialog = false;
  }

  confirmComplete(): void {
    const st = this.selectedStockTake();
    if (!st) return;

    this.stockTakeService.complete(st.id, this.applyToInventory).subscribe({
      next: (updated) => {
        this.selectedStockTake.set(updated);
        this.closeCompleteDialog();
        this.notifications.success(this.translate.instant('STOCK_TAKE.COMPLETE.SUCCESS'));
      },
      error: () => {
        this.notifications.error(this.translate.instant('STOCK_TAKE.COMPLETE.ERROR'));
      },
    });
  }

  cancelStockTake(): void {
    const st = this.selectedStockTake();
    if (!st) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('STOCK_TAKE.CANCEL.TITLE'),
        message: this.translate.instant('STOCK_TAKE.CANCEL.MESSAGE'),
        confirmText: this.translate.instant('STOCK_TAKE.CANCEL.BUTTON'),
        cancelText: this.translate.instant('COMMON.BACK'),
        type: 'warning',
      },
      panelClass: 'confirm-dialog-container',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.stockTakeService.cancel(st.id).subscribe({
          next: (updated) => {
            this.selectedStockTake.set(updated);
            this.notifications.success(this.translate.instant('STOCK_TAKE.CANCEL.SUCCESS'));
          },
          error: () => {
            this.notifications.error(this.translate.instant('STOCK_TAKE.CANCEL.ERROR'));
          },
        });
      }
    });
  }

  // ==================== Helpers ====================

  getProgress(st: StockTake): number {
    if (st.totalItems === 0) return 0;
    return Math.round((st.countedItems / st.totalItems) * 100);
  }

  getStatusLabel(status: StockTakeStatus): string {
    return this.translate.instant(`STOCK_TAKE.STATUS.${status}`);
  }

  getStatusClass(status: StockTakeStatus): string {
    const classes: Record<string, string> = {
      [StockTakeStatus.IN_PROGRESS]: 'bg-[var(--color-info-bg)] text-[var(--color-status-info)] border border-[var(--color-info-border)]',
      [StockTakeStatus.COMPLETED]: 'bg-[var(--color-success-bg)] text-[var(--color-status-success)] border border-[var(--color-success-border)]',
      [StockTakeStatus.CANCELLED]: 'bg-[var(--color-error-bg)] text-[var(--color-status-error)] border border-[var(--color-error-border)]',
    };
    return classes[status] || 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]';
  }

  getVarianceClass(variance: number): string {
    if (variance > 0) return 'text-[var(--color-status-success)]';
    if (variance < 0) return 'text-[var(--color-status-error)]';
    return 'text-[var(--color-on-surface-variant)]';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }
}
