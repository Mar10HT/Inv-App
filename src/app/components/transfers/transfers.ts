import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TransferRequestService } from '../../services/transfer-request.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { TransferRequest, TransferRequestStatus, TransferRequestWithQr } from '../../interfaces/transfer-request.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
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
              <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'TRANSFERS.TITLE' | translate }}</h1>
              <p class="text-slate-500 text-lg">{{ 'TRANSFERS.SUBTITLE' | translate }}</p>
            </div>
            <div class="flex gap-2">
              <button
                (click)="openScanDialog()"
                class="bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap">
                <lucide-icon name="ScanLine" class="!w-5 !h-5 !text-current shrink-0"></lucide-icon>
                <span>{{ 'TRANSFERS.QR.SCAN' | translate }}</span>
              </button>
              <button
                (click)="exportToCSV()"
                class="bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap">
                <lucide-icon name="Download" class="!w-5 !h-5 !text-current shrink-0"></lucide-icon>
                <span>{{ 'COMMON.EXPORT' | translate }}</span>
              </button>
              <button
                (click)="openNewRequestDialog()"
                class="bg-[#4d7c6f] hover:bg-[#5d8c7f] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium whitespace-nowrap">
                <lucide-icon name="Plus" class="!w-5 !h-5 !text-white shrink-0"></lucide-icon>
                <span>{{ 'TRANSFERS.NEW_REQUEST' | translate }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'TRANSFERS.PENDING' | translate }}</p>
                <p class="text-2xl font-bold text-foreground">{{ stats().byStatus.pending }}</p>
              </div>
              <div class="bg-slate-800/50 p-3 rounded-lg">
                <lucide-icon name="Clock" class="!text-slate-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'TRANSFERS.APPROVED' | translate }}</p>
                <p class="text-2xl font-bold text-blue-400">{{ stats().byStatus.approved }}</p>
              </div>
              <div class="bg-blue-950/50 p-3 rounded-lg">
                <lucide-icon name="CheckCircle2" class="!text-blue-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'TRANSFERS.SENT' | translate }}</p>
                <p class="text-2xl font-bold text-sky-400">{{ stats().byStatus.sent }}</p>
              </div>
              <div class="bg-sky-950/50 p-3 rounded-lg">
                <lucide-icon name="Send" class="!text-sky-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'TRANSFERS.COMPLETED' | translate }}</p>
                <p class="text-2xl font-bold text-emerald-400">{{ stats().byStatus.completed }}</p>
              </div>
              <div class="bg-emerald-950/50 p-3 rounded-lg">
                <lucide-icon name="PackageCheck" class="!text-emerald-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'TRANSFERS.REJECTED' | translate }}</p>
                <p class="text-2xl font-bold text-red-400">{{ stats().byStatus.rejected }}</p>
              </div>
              <div class="bg-red-950/50 p-3 rounded-lg">
                <lucide-icon name="XCircle" class="!text-red-400 !w-5 !h-5"></lucide-icon>
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
                  [placeholder]="'TRANSFERS.SEARCH_PLACEHOLDER' | translate"
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
                <option value="all">{{ 'TRANSFERS.ALL_STATUS' | translate }}</option>
                <option [value]="Status.PENDING">{{ 'TRANSFERS.STATUS.PENDING' | translate }}</option>
                <option [value]="Status.APPROVED">{{ 'TRANSFERS.STATUS.APPROVED' | translate }}</option>
                <option [value]="Status.SENT">{{ 'TRANSFERS.STATUS.SENT' | translate }}</option>
                <option [value]="Status.COMPLETED">{{ 'TRANSFERS.STATUS.COMPLETED' | translate }}</option>
                <option [value]="Status.REJECTED">{{ 'TRANSFERS.STATUS.REJECTED' | translate }}</option>
                <option [value]="Status.CANCELLED">{{ 'TRANSFERS.STATUS.CANCELLED' | translate }}</option>
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

        <!-- Requests List -->
        <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'TRANSFERS.LIST' | translate }}</h2>
          </div>

          <!-- Desktop Table -->
          <div class="hidden lg:block overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-[#141414]">
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'TRANSFERS.ITEMS' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'TRANSFERS.SOURCE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'TRANSFERS.DESTINATION' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'TRANSFERS.REQUESTED_BY' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.DATE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1e1e1e]">
                @for (request of paginatedRequests(); track request.id) {
                  <tr class="hover:bg-[#1e1e1e] transition-colors">
                    <td class="px-6 py-4">
                      <div>
                        <p class="text-foreground font-medium">{{ request.items.length }} {{ 'TRANSFERS.ITEMS_COUNT' | translate }}</p>
                        <p class="text-slate-500 text-sm truncate max-w-xs">
                          {{ getItemsPreview(request) }}
                        </p>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-slate-500 !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ request.sourceWarehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-[#4d7c6f] !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ request.destinationWarehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-foreground">{{ request.requestedByName }}</td>
                    <td class="px-6 py-4 text-foreground">{{ formatDate(request.createdAt) }}</td>
                    <td class="px-6 py-4">
                      <span [class]="getStatusClass(request.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                        {{ getStatusLabel(request.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center justify-center gap-2">
                        @switch (request.status) {
                          @case (Status.PENDING) {
                            <button
                              (click)="approveRequest(request)"
                              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="Check" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'TRANSFERS.APPROVE' | translate }}</span>
                            </button>
                            <button
                              (click)="rejectRequest(request)"
                              class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 text-sm border border-red-600/50">
                              <lucide-icon name="X" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                            </button>
                          }
                          @case (Status.APPROVED) {
                            <button
                              (click)="sendTransfer(request)"
                              class="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="Send" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'TRANSFERS.SEND' | translate }}</span>
                            </button>
                            <button
                              (click)="cancelRequest(request)"
                              class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 text-sm border border-red-600/50">
                              <lucide-icon name="X" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                            </button>
                          }
                          @case (Status.SENT) {
                            <button
                              (click)="showQrCode(request)"
                              class="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="QrCode" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'TRANSFERS.QR.SHOW_QR' | translate }}</span>
                            </button>
                          }
                          @case (Status.COMPLETED) {
                            <span class="text-slate-500 text-sm">{{ formatDate(request.receivedAt!) }}</span>
                          }
                          @case (Status.REJECTED) {
                            <span class="text-red-400 text-sm truncate max-w-[150px]" [title]="request.rejectedReason">
                              {{ request.rejectedReason || '-' }}
                            </span>
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
                      <lucide-icon name="ArrowLeftRight" class="!w-14 !h-14 !text-slate-700 mb-4"></lucide-icon>
                      <h3 class="text-lg font-semibold text-slate-400 mb-2">{{ 'TRANSFERS.NO_REQUESTS' | translate }}</h3>
                      <p class="text-slate-600">{{ 'TRANSFERS.NO_REQUESTS_DESC' | translate }}</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="lg:hidden divide-y divide-[#1e1e1e]">
            @for (request of paginatedRequests(); track request.id) {
              <div class="p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="text-foreground font-medium">{{ request.items.length }} {{ 'TRANSFERS.ITEMS_COUNT' | translate }}</p>
                    <p class="text-slate-500 text-sm">{{ getItemsPreview(request) }}</p>
                  </div>
                  <span [class]="getStatusClass(request.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                    {{ getStatusLabel(request.status) }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p class="text-slate-500">{{ 'TRANSFERS.SOURCE' | translate }}</p>
                    <p class="text-foreground">{{ request.sourceWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-slate-500">{{ 'TRANSFERS.DESTINATION' | translate }}</p>
                    <p class="text-foreground">{{ request.destinationWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-slate-500">{{ 'COMMON.DATE' | translate }}</p>
                    <p class="text-foreground">{{ formatDate(request.createdAt) }}</p>
                  </div>
                </div>
                <!-- Mobile Actions -->
                @switch (request.status) {
                  @case (Status.PENDING) {
                    <div class="flex gap-2">
                      <button
                        (click)="approveRequest(request)"
                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                        <lucide-icon name="Check" class="!w-4 !h-4 !text-white"></lucide-icon>
                        <span>{{ 'TRANSFERS.APPROVE' | translate }}</span>
                      </button>
                      <button
                        (click)="rejectRequest(request)"
                        class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-2 rounded-lg border border-red-600/50">
                        <lucide-icon name="X" class="!w-4 !h-4 !text-current"></lucide-icon>
                      </button>
                    </div>
                  }
                  @case (Status.APPROVED) {
                    <div class="flex gap-2">
                      <button
                        (click)="sendTransfer(request)"
                        class="flex-1 bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                        <lucide-icon name="Send" class="!w-4 !h-4 !text-white"></lucide-icon>
                        <span>{{ 'TRANSFERS.SEND' | translate }}</span>
                      </button>
                      <button
                        (click)="cancelRequest(request)"
                        class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-2 rounded-lg border border-red-600/50">
                        <lucide-icon name="X" class="!w-4 !h-4 !text-current"></lucide-icon>
                      </button>
                    </div>
                  }
                  @case (Status.SENT) {
                    <button
                      (click)="showQrCode(request)"
                      class="w-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                      <lucide-icon name="QrCode" class="!w-4 !h-4 !text-white"></lucide-icon>
                      <span>{{ 'TRANSFERS.QR.SHOW_QR' | translate }}</span>
                    </button>
                  }
                }
              </div>
            } @empty {
              <div class="p-8 text-center">
                <lucide-icon name="ArrowLeftRight" class="!w-14 !h-14 !text-slate-700 mb-4"></lucide-icon>
                <h3 class="text-lg font-semibold text-slate-400 mb-2">{{ 'TRANSFERS.NO_REQUESTS' | translate }}</h3>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (filteredRequests().length > pageSize) {
            <div class="border-t border-theme px-4 py-2">
              <mat-paginator
                [length]="filteredRequests().length"
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

    <!-- New Request Dialog -->
    @if (showNewRequestDialog) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeNewRequestDialog()">
        <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'TRANSFERS.NEW_REQUEST' | translate }}</h2>
            <p class="text-slate-500 text-sm mt-1">{{ 'TRANSFERS.NEW_REQUEST_DESC' | translate }}</p>
          </div>
          <div class="p-6 space-y-4">
            <!-- Source Warehouse -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'TRANSFERS.SOURCE' | translate }} *</label>
              <select
                [ngModel]="selectedSourceWarehouseId()"
                (ngModelChange)="onSourceWarehouseChange($event)"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f]"
              >
                <option value="">{{ 'TRANSFERS.SELECT_SOURCE' | translate }}</option>
                @for (warehouse of warehouses(); track warehouse.id) {
                  <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
                }
              </select>
            </div>

            <!-- Destination Warehouse -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'TRANSFERS.DESTINATION' | translate }} *</label>
              <select
                [ngModel]="selectedDestWarehouseId()"
                (ngModelChange)="selectedDestWarehouseId.set($event)"
                [disabled]="!selectedSourceWarehouseId()"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] disabled:opacity-50"
              >
                <option value="">{{ 'TRANSFERS.SELECT_DESTINATION' | translate }}</option>
                @for (warehouse of destinationWarehouses(); track warehouse.id) {
                  <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
                }
              </select>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'TRANSFERS.NOTES' | translate }}</label>
              <textarea
                [ngModel]="selectedNotes()"
                (ngModelChange)="selectedNotes.set($event)"
                rows="2"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] resize-none"
                [placeholder]="'TRANSFERS.NOTES_PLACEHOLDER' | translate"
              ></textarea>
            </div>

            <!-- Items Section -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-sm font-medium text-slate-400">{{ 'TRANSFERS.ITEMS' | translate }} *</label>
                <button
                  type="button"
                  (click)="addItem()"
                  class="text-sm text-[#4d7c6f] hover:text-[#5d8c7f] flex items-center gap-1">
                  <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
                  {{ 'TRANSACTION.ADD_ITEM' | translate }}
                </button>
              </div>

              <div class="space-y-3">
                @for (item of requestItems(); track $index; let i = $index) {
                  <div class="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <div class="flex items-start gap-3">
                      <div class="flex-1 space-y-3">
                        <select
                          [ngModel]="item.inventoryItemId"
                          (ngModelChange)="updateItemId(i, $event)"
                          class="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer">
                          <option value="">{{ 'TRANSACTION.SELECT_ITEM' | translate }}</option>
                          @for (invItem of availableItems(); track invItem.id) {
                            <option [value]="invItem.id" [disabled]="isItemAlreadySelected(invItem.id, i)">
                              {{ invItem.name }} ({{ invItem.quantity }} {{ 'TRANSACTION.AVAILABLE' | translate }})
                            </option>
                          }
                        </select>
                        <input
                          type="number"
                          [ngModel]="item.quantity"
                          (ngModelChange)="updateItemQuantity(i, $event)"
                          min="1"
                          class="w-24 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors"
                          [placeholder]="'TRANSACTION.QTY_PLACEHOLDER' | translate"
                        />
                      </div>
                      <button
                        type="button"
                        (click)="removeItem(i)"
                        class="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors">
                        <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>

              @if (requestItems().length === 0) {
                <p class="text-slate-500 text-sm text-center py-4">{{ 'TRANSACTION.NO_ITEMS' | translate }}</p>
              }
            </div>
          </div>
          <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
            <button
              (click)="closeNewRequestDialog()"
              class="px-4 py-2 text-slate-400 hover:text-foreground transition-colors">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button
              (click)="createRequest()"
              [disabled]="!canCreateRequest()"
              class="bg-[#4d7c6f] hover:bg-[#5d8c7f] disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg transition-all">
              {{ 'TRANSFERS.CREATE_REQUEST' | translate }}
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
            <h2 class="text-xl font-semibold text-foreground">{{ 'TRANSFERS.QR.TITLE' | translate }}</h2>
            <p class="text-slate-500 text-sm mt-1">{{ 'TRANSFERS.QR.INSTRUCTIONS' | translate }}</p>
          </div>
          <div class="p-6 flex flex-col items-center">
            @if (currentQrDataUrl) {
              <div class="bg-white p-4 rounded-lg mb-4">
                <img [src]="currentQrDataUrl" alt="QR Code" class="w-56 h-56 block" />
              </div>
              <p class="text-foreground font-medium text-center mb-1">{{ currentRequest?.items?.length }} Items</p>
              <p class="text-slate-500 text-sm text-center">
                {{ currentRequest?.sourceWarehouseName }} -> {{ currentRequest?.destinationWarehouseName }}
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
              <span>{{ 'TRANSFERS.QR.PRINT' | translate }}</span>
            </button>
            <button
              (click)="downloadQrCode()"
              class="bg-[#4d7c6f] hover:bg-[#5d8c7f] text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
              <lucide-icon name="Download" class="!w-4 !h-4 !text-white"></lucide-icon>
              <span>{{ 'TRANSFERS.QR.DOWNLOAD' | translate }}</span>
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
            <h2 class="text-xl font-semibold text-foreground">{{ 'TRANSFERS.QR.SCAN_TITLE' | translate }}</h2>
            <p class="text-slate-500 text-sm mt-1">{{ 'TRANSFERS.QR.SCAN_INSTRUCTIONS' | translate }}</p>
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

    <!-- Reject Dialog -->
    @if (showRejectDialog) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeRejectDialog()">
        <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'TRANSFERS.REJECT_TITLE' | translate }}</h2>
          </div>
          <div class="p-6">
            <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'TRANSFERS.REJECT_REASON' | translate }}</label>
            <textarea
              [(ngModel)]="rejectReason"
              rows="3"
              class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] resize-none"
              [placeholder]="'TRANSFERS.REJECT_REASON_PLACEHOLDER' | translate"
            ></textarea>
          </div>
          <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
            <button
              (click)="closeRejectDialog()"
              class="px-4 py-2 text-slate-400 hover:text-foreground transition-colors">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button
              (click)="confirmReject()"
              class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-all">
              {{ 'TRANSFERS.REJECT' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class TransfersComponent implements OnInit {
  private transferService = inject(TransferRequestService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);

  // Expose enum
  Status = TransferRequestStatus;

  // Filter state
  searchQuery = '';
  selectedStatus = 'all';

  // Pagination
  pageIndex = 0;
  pageSize = 10;

  // Dialog states
  showNewRequestDialog = false;
  showQrDialog = false;
  showScanDialog = false;
  showRejectDialog = false;

  // QR Dialog state
  currentQrDataUrl: string | null = null;
  currentRequest: TransferRequest | null = null;

  // Scan Dialog state
  scannedQrData = '';

  // Reject Dialog state
  rejectReason = '';
  requestToReject: TransferRequest | null = null;

  // Form signals
  selectedSourceWarehouseId = signal('');
  selectedDestWarehouseId = signal('');
  selectedNotes = signal('');

  // Items array
  requestItems = signal<{ inventoryItemId: string; quantity: number }[]>([]);

  // Computed
  stats = computed(() => this.transferService.stats());
  warehouses = computed(() => this.warehouseService.warehouses());

  // Destination warehouses (excludes source)
  destinationWarehouses = computed(() => {
    const all = this.warehouseService.warehouses();
    const sourceId = this.selectedSourceWarehouseId();
    return all.filter(w => w.id !== sourceId);
  });

  // Available items for transfer
  availableItems = computed(() => {
    const sourceId = this.selectedSourceWarehouseId();
    const items = this.inventoryService.items();

    if (!sourceId) return items;
    return items.filter(item => item.warehouseId === sourceId && item.quantity > 0);
  });

  // Filtered requests
  private filteredRequestsSignal = signal<TransferRequest[]>([]);
  filteredRequests = computed(() => this.filteredRequestsSignal());

  // Paginated requests
  paginatedRequests = computed(() => {
    const requests = this.filteredRequestsSignal();
    const start = this.pageIndex * this.pageSize;
    return requests.slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.warehouseService.getAll().subscribe();
    this.inventoryService.loadItems();
    this.transferService.loadRequests();
    setTimeout(() => this.applyFilters(), 100);
  }

  applyFilters(): void {
    let requests = this.transferService.requests();

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      requests = requests.filter(req =>
        req.sourceWarehouseName.toLowerCase().includes(query) ||
        req.destinationWarehouseName.toLowerCase().includes(query) ||
        req.requestedByName.toLowerCase().includes(query) ||
        req.items.some(i => i.inventoryItemName.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (this.selectedStatus !== 'all') {
      requests = requests.filter(req => req.status === this.selectedStatus);
    }

    // Sort by date descending
    requests = requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    this.filteredRequestsSignal.set(requests);
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

  // ==================== New Request Dialog ====================

  openNewRequestDialog(): void {
    this.selectedSourceWarehouseId.set('');
    this.selectedDestWarehouseId.set('');
    this.selectedNotes.set('');
    this.requestItems.set([]);
    this.showNewRequestDialog = true;
  }

  closeNewRequestDialog(): void {
    this.showNewRequestDialog = false;
  }

  onSourceWarehouseChange(warehouseId: string): void {
    this.selectedSourceWarehouseId.set(warehouseId);
    this.requestItems.set([]);
    this.selectedDestWarehouseId.set('');
  }

  addItem(): void {
    this.requestItems.update(items => [...items, { inventoryItemId: '', quantity: 1 }]);
  }

  updateItemId(index: number, itemId: string): void {
    this.requestItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], inventoryItemId: itemId };
      return newItems;
    });
  }

  updateItemQuantity(index: number, quantity: number): void {
    this.requestItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], quantity: quantity || 1 };
      return newItems;
    });
  }

  removeItem(index: number): void {
    this.requestItems.update(items => items.filter((_, i) => i !== index));
  }

  isItemAlreadySelected(itemId: string, currentIndex: number): boolean {
    return this.requestItems().some((item, i) => i !== currentIndex && item.inventoryItemId === itemId);
  }

  canCreateRequest(): boolean {
    const items = this.requestItems();
    const hasValidItems = items.length > 0 && items.every(item => item.inventoryItemId && item.quantity > 0);
    return hasValidItems &&
           !!this.selectedSourceWarehouseId() &&
           !!this.selectedDestWarehouseId() &&
           this.selectedSourceWarehouseId() !== this.selectedDestWarehouseId();
  }

  createRequest(): void {
    if (!this.canCreateRequest()) return;

    this.transferService.createRequest({
      sourceWarehouseId: this.selectedSourceWarehouseId(),
      destinationWarehouseId: this.selectedDestWarehouseId(),
      items: this.requestItems().filter(i => i.inventoryItemId),
      notes: this.selectedNotes() || undefined
    }).subscribe({
      next: (result) => {
        if (result) {
          this.notifications.success(this.translate.instant('TRANSFERS.REQUEST_CREATED'));
          this.closeNewRequestDialog();
          this.applyFilters();
        }
      },
      error: () => {
        this.notifications.error(this.translate.instant('TRANSFERS.REQUEST_ERROR'));
      }
    });
  }

  // ==================== Actions ====================

  approveRequest(request: TransferRequest): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('TRANSFERS.CONFIRM_APPROVE_TITLE'),
        message: this.translate.instant('TRANSFERS.CONFIRM_APPROVE_MESSAGE'),
        confirmText: this.translate.instant('TRANSFERS.APPROVE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'info'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.transferService.approveRequest(request.id).subscribe({
          next: (result) => {
            if (result) {
              this.notifications.success(this.translate.instant('TRANSFERS.APPROVE_SUCCESS'));
              this.applyFilters();
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('TRANSFERS.APPROVE_ERROR'));
          }
        });
      }
    });
  }

  rejectRequest(request: TransferRequest): void {
    this.requestToReject = request;
    this.rejectReason = '';
    this.showRejectDialog = true;
  }

  closeRejectDialog(): void {
    this.showRejectDialog = false;
    this.requestToReject = null;
    this.rejectReason = '';
  }

  confirmReject(): void {
    if (!this.requestToReject) return;

    this.transferService.rejectRequest(this.requestToReject.id, this.rejectReason || undefined).subscribe({
      next: (result) => {
        if (result) {
          this.notifications.success(this.translate.instant('TRANSFERS.REJECT_SUCCESS'));
          this.closeRejectDialog();
          this.applyFilters();
        }
      },
      error: () => {
        this.notifications.error(this.translate.instant('TRANSFERS.REJECT_ERROR'));
      }
    });
  }

  sendTransfer(request: TransferRequest): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('TRANSFERS.CONFIRM_SEND_TITLE'),
        message: this.translate.instant('TRANSFERS.CONFIRM_SEND_MESSAGE'),
        confirmText: this.translate.instant('TRANSFERS.SEND'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'info'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.transferService.sendTransfer(request.id).subscribe({
          next: (result) => {
            if (result) {
              this.notifications.success(this.translate.instant('TRANSFERS.SEND_SUCCESS'));
              this.applyFilters();
              if (result.qrCodeDataUrl) {
                this.currentQrDataUrl = result.qrCodeDataUrl;
                this.currentRequest = result;
                this.showQrDialog = true;
              }
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('TRANSFERS.SEND_ERROR'));
          }
        });
      }
    });
  }

  cancelRequest(request: TransferRequest): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('TRANSFERS.CONFIRM_CANCEL_TITLE'),
        message: this.translate.instant('TRANSFERS.CONFIRM_CANCEL_MESSAGE'),
        confirmText: this.translate.instant('COMMON.CANCEL'),
        cancelText: this.translate.instant('COMMON.BACK'),
        type: 'warning'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.transferService.cancelRequest(request.id).subscribe({
          next: (result) => {
            if (result) {
              this.notifications.success(this.translate.instant('TRANSFERS.CANCEL_SUCCESS'));
              this.applyFilters();
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('TRANSFERS.CANCEL_ERROR'));
          }
        });
      }
    });
  }

  // ==================== QR Operations ====================

  showQrCode(request: TransferRequest): void {
    this.currentRequest = request;
    this.currentQrDataUrl = null;
    this.showQrDialog = true;

    this.transferService.getQrCode(request.id).subscribe({
      next: (qrDataUrl) => {
        this.currentQrDataUrl = qrDataUrl;
      },
      error: () => {
        this.notifications.error(this.translate.instant('TRANSFERS.QR.ERROR'));
        this.closeQrDialog();
      }
    });
  }

  closeQrDialog(): void {
    this.showQrDialog = false;
    this.currentQrDataUrl = null;
    this.currentRequest = null;
  }

  printQrCode(): void {
    if (!this.currentQrDataUrl || !this.currentRequest) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - Transfer</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              img { max-width: 300px; }
              h2 { margin-bottom: 5px; }
              p { color: #666; margin: 5px 0; }
            </style>
          </head>
          <body>
            <img src="${this.currentQrDataUrl}" alt="QR Code" />
            <h2>Transfer: ${this.currentRequest.items.length} Items</h2>
            <p>${this.currentRequest.sourceWarehouseName} -> ${this.currentRequest.destinationWarehouseName}</p>
            <p>Scan to confirm receipt</p>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  downloadQrCode(): void {
    if (!this.currentQrDataUrl || !this.currentRequest) return;

    const link = document.createElement('a');
    link.href = this.currentQrDataUrl;
    link.download = `qr-transfer-${this.currentRequest.id}.png`;
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

    this.transferService.scanQr(this.scannedQrData).subscribe({
      next: (result) => {
        if (result) {
          this.notifications.success(this.translate.instant('TRANSFERS.QR.SCAN_SUCCESS'));
          this.closeScanDialog();
          this.applyFilters();
        }
      },
      error: () => {
        this.notifications.error(this.translate.instant('TRANSFERS.QR.SCAN_ERROR'));
      }
    });
  }

  // ==================== Helper Methods ====================

  getItemsPreview(request: TransferRequest): string {
    return request.items.slice(0, 2).map(i => i.inventoryItemName).join(', ') +
           (request.items.length > 2 ? '...' : '');
  }

  getStatusLabel(status: TransferRequestStatus): string {
    const key = `TRANSFERS.STATUS.${status}`;
    return this.translate.instant(key);
  }

  getStatusClass(status: TransferRequestStatus): string {
    const classes: Record<string, string> = {
      [TransferRequestStatus.PENDING]: 'bg-slate-800/50 text-slate-400 border border-slate-700',
      [TransferRequestStatus.APPROVED]: 'bg-blue-950/50 text-blue-400 border border-blue-900',
      [TransferRequestStatus.SENT]: 'bg-sky-950/50 text-sky-400 border border-sky-900',
      [TransferRequestStatus.COMPLETED]: 'bg-emerald-950/50 text-emerald-400 border border-emerald-900',
      [TransferRequestStatus.REJECTED]: 'bg-red-950/50 text-red-400 border border-red-900',
      [TransferRequestStatus.CANCELLED]: 'bg-slate-800/50 text-slate-500 border border-slate-700'
    };
    return classes[status] || 'bg-slate-800 text-slate-400';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }

  exportToCSV(): void {
    this.transferService.exportToCSV(this.filteredRequests());
  }
}
