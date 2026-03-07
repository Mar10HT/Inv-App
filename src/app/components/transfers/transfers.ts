import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { TransferRequestService } from '../../services/transfer-request.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { TransferRequest, TransferRequestStatus, TransferRequestWithQr } from '../../interfaces/transfer-request.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { TransferFormDialog, TransferFormResult } from './transfer-form-dialog';
import { TransferQrDialog, TransferScanDialog, TransferScanQrResult, TransferRejectDialog, TransferRejectResult } from './transfer-qr-dialog';

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
    TranslateModule,
    NgxPermissionsModule,
    TransferFormDialog,
    TransferQrDialog,
    TransferScanDialog,
    TransferRejectDialog
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'TRANSFERS.TITLE' | translate }}</h1>
              <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'TRANSFERS.SUBTITLE' | translate }}</p>
            </div>
            <div class="flex gap-2">
              <button
                (click)="openScanDialog()"
                class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap">
                <lucide-icon name="ScanLine" class="!w-5 !h-5 !text-current shrink-0"></lucide-icon>
                <span>{{ 'TRANSFERS.QR.SCAN' | translate }}</span>
              </button>
              <button
                (click)="exportToCSV()"
                class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium whitespace-nowrap">
                <lucide-icon name="Download" class="!w-5 !h-5 !text-current shrink-0"></lucide-icon>
                <span>{{ 'COMMON.EXPORT' | translate }}</span>
              </button>
              <ng-container *ngxPermissionsOnly="['create_transfers']">
                <button
                  (click)="openNewRequestDialog()"
                  class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium whitespace-nowrap">
                  <lucide-icon name="Plus" class="!w-5 !h-5 !text-white shrink-0"></lucide-icon>
                  <span>{{ 'TRANSFERS.NEW_REQUEST' | translate }}</span>
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
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'TRANSFERS.PENDING' | translate }}</p>
                <p class="text-2xl font-bold text-foreground">{{ stats().byStatus.pending }}</p>
              </div>
              <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
                <lucide-icon name="Clock" class="!text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'TRANSFERS.APPROVED' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ stats().byStatus.approved }}</p>
              </div>
              <div class="bg-[var(--color-info-bg)] p-3 rounded-lg">
                <lucide-icon name="CheckCircle2" class="!text-[var(--color-status-info)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'TRANSFERS.SENT' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ stats().byStatus.sent }}</p>
              </div>
              <div class="bg-[var(--color-info-bg)] p-3 rounded-lg">
                <lucide-icon name="Send" class="!text-[var(--color-status-info)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'TRANSFERS.COMPLETED' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-success)]">{{ stats().byStatus.completed }}</p>
              </div>
              <div class="bg-[var(--color-success-bg)] p-3 rounded-lg">
                <lucide-icon name="PackageCheck" class="!text-[var(--color-status-success)] !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'TRANSFERS.REJECTED' | translate }}</p>
                <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ stats().byStatus.rejected }}</p>
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
            <!-- Search -->
            <div class="flex-1">
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="applyFilters()"
                  [placeholder]="'TRANSFERS.SEARCH_PLACEHOLDER' | translate"
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
                class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap">
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
                <tr class="bg-[var(--color-surface)]">
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'TRANSFERS.ITEMS' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'TRANSFERS.SOURCE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'TRANSFERS.DESTINATION' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'TRANSFERS.REQUESTED_BY' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.DATE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border-subtle)]">
                @for (request of paginatedRequests(); track request.id) {
                  <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                    <td class="px-6 py-4">
                      <div>
                        <p class="text-foreground font-medium">{{ request.items.length }} {{ 'TRANSFERS.ITEMS_COUNT' | translate }}</p>
                        <p class="text-[var(--color-on-surface-variant)] text-sm truncate max-w-xs">
                          {{ getItemsPreview(request) }}
                        </p>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-[var(--color-on-surface-variant)] !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ request.sourceWarehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
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
                            <ng-container *ngxPermissionsOnly="['manage_transfers']">
                              <button
                                (click)="approveRequest(request)"
                                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                                <lucide-icon name="Check" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                                <span>{{ 'TRANSFERS.APPROVE' | translate }}</span>
                              </button>
                              <button
                                (click)="rejectRequest(request)"
                                class="bg-red-600/20 hover:bg-red-600 text-[var(--color-status-error)] hover:text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 text-sm border border-red-600/50">
                                <lucide-icon name="X" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                              </button>
                            </ng-container>
                          }
                          @case (Status.APPROVED) {
                            <ng-container *ngxPermissionsOnly="['manage_transfers']">
                              <button
                                (click)="sendTransfer(request)"
                                class="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                                <lucide-icon name="Send" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                                <span>{{ 'TRANSFERS.SEND' | translate }}</span>
                              </button>
                              <button
                                (click)="cancelRequest(request)"
                                class="bg-red-600/20 hover:bg-red-600 text-[var(--color-status-error)] hover:text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 text-sm border border-red-600/50">
                                <lucide-icon name="X" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                              </button>
                            </ng-container>
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
                            <span class="text-[var(--color-on-surface-variant)] text-sm">{{ formatDate(request.receivedAt!) }}</span>
                          }
                          @case (Status.REJECTED) {
                            <span class="text-[var(--color-status-error)] text-sm truncate max-w-[150px]" [title]="request.rejectedReason">
                              {{ request.rejectedReason || '-' }}
                            </span>
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
                      <lucide-icon name="ArrowLeftRight" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
                      <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'TRANSFERS.NO_REQUESTS' | translate }}</h3>
                      <p class="text-[var(--color-on-surface-muted)]">{{ 'TRANSFERS.NO_REQUESTS_DESC' | translate }}</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="lg:hidden divide-y divide-[var(--color-border-subtle)]">
            @for (request of paginatedRequests(); track request.id) {
              <div class="p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="text-foreground font-medium">{{ request.items.length }} {{ 'TRANSFERS.ITEMS_COUNT' | translate }}</p>
                    <p class="text-[var(--color-on-surface-variant)] text-sm">{{ getItemsPreview(request) }}</p>
                  </div>
                  <span [class]="getStatusClass(request.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                    {{ getStatusLabel(request.status) }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p class="text-[var(--color-on-surface-variant)]">{{ 'TRANSFERS.SOURCE' | translate }}</p>
                    <p class="text-foreground">{{ request.sourceWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-[var(--color-on-surface-variant)]">{{ 'TRANSFERS.DESTINATION' | translate }}</p>
                    <p class="text-foreground">{{ request.destinationWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-[var(--color-on-surface-variant)]">{{ 'COMMON.DATE' | translate }}</p>
                    <p class="text-foreground">{{ formatDate(request.createdAt) }}</p>
                  </div>
                </div>
                <!-- Mobile Actions -->
                @switch (request.status) {
                  @case (Status.PENDING) {
                    <ng-container *ngxPermissionsOnly="['manage_transfers']">
                      <div class="flex gap-2">
                        <button
                          (click)="approveRequest(request)"
                          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                          <lucide-icon name="Check" class="!w-4 !h-4 !text-white"></lucide-icon>
                          <span>{{ 'TRANSFERS.APPROVE' | translate }}</span>
                        </button>
                        <button
                          (click)="rejectRequest(request)"
                          class="bg-red-600/20 hover:bg-red-600 text-[var(--color-status-error)] hover:text-white px-3 py-2 rounded-lg border border-red-600/50">
                          <lucide-icon name="X" class="!w-4 !h-4 !text-current"></lucide-icon>
                        </button>
                      </div>
                    </ng-container>
                  }
                  @case (Status.APPROVED) {
                    <ng-container *ngxPermissionsOnly="['manage_transfers']">
                      <div class="flex gap-2">
                        <button
                          (click)="sendTransfer(request)"
                          class="flex-1 bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                          <lucide-icon name="Send" class="!w-4 !h-4 !text-white"></lucide-icon>
                          <span>{{ 'TRANSFERS.SEND' | translate }}</span>
                        </button>
                        <button
                          (click)="cancelRequest(request)"
                          class="bg-red-600/20 hover:bg-red-600 text-[var(--color-status-error)] hover:text-white px-3 py-2 rounded-lg border border-red-600/50">
                          <lucide-icon name="X" class="!w-4 !h-4 !text-current"></lucide-icon>
                        </button>
                      </div>
                    </ng-container>
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
                <lucide-icon name="ArrowLeftRight" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
                <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'TRANSFERS.NO_REQUESTS' | translate }}</h3>
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
      <app-transfer-form-dialog
        (closed)="closeNewRequestDialog()"
        (created)="onRequestCreated($event)"
      />
    }

    <!-- QR Code Dialog -->
    @if (showQrDialog) {
      <app-transfer-qr-dialog
        [request]="currentRequest"
        [qrDataUrl]="currentQrDataUrl"
        (closed)="closeQrDialog()"
      />
    }

    <!-- Scan QR Dialog -->
    @if (showScanDialog) {
      <app-transfer-scan-dialog
        (closed)="closeScanDialog()"
        (scanned)="onQrScanned($event)"
      />
    }

    <!-- Reject Dialog -->
    @if (showRejectDialog) {
      <app-transfer-reject-dialog
        [request]="requestToReject"
        (closed)="closeRejectDialog()"
        (rejected)="onRejectConfirmed($event)"
      />
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

  // Reject Dialog state
  requestToReject: TransferRequest | null = null;

  // Computed
  stats = computed(() => this.transferService.stats());

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
    this.warehouseService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
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
    this.showNewRequestDialog = true;
  }

  closeNewRequestDialog(): void {
    this.showNewRequestDialog = false;
  }

  onRequestCreated(result: TransferFormResult): void {
    this.closeNewRequestDialog();
    this.applyFilters();
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
    this.showRejectDialog = true;
  }

  closeRejectDialog(): void {
    this.showRejectDialog = false;
    this.requestToReject = null;
  }

  onRejectConfirmed(result: TransferRejectResult): void {
    if (!this.requestToReject) return;

    this.transferService.rejectRequest(this.requestToReject.id, result.reason).subscribe({
      next: (response) => {
        if (response) {
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

  // ==================== Scan QR Dialog ====================

  openScanDialog(): void {
    this.showScanDialog = true;
  }

  closeScanDialog(): void {
    this.showScanDialog = false;
  }

  onQrScanned(result: TransferScanQrResult): void {
    this.closeScanDialog();
    this.applyFilters();
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
      [TransferRequestStatus.PENDING]: 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] border border-[var(--color-border)]',
      [TransferRequestStatus.APPROVED]: 'bg-[var(--color-info-bg)] text-[var(--color-status-info)] border border-[var(--color-info-border)]',
      [TransferRequestStatus.SENT]: 'bg-[var(--color-info-bg)] text-[var(--color-status-info)] border border-[var(--color-info-border)]',
      [TransferRequestStatus.COMPLETED]: 'bg-[var(--color-success-bg)] text-[var(--color-status-success)] border border-[var(--color-success-border)]',
      [TransferRequestStatus.REJECTED]: 'bg-[var(--color-error-bg)] text-[var(--color-status-error)] border border-[var(--color-error-border)]',
      [TransferRequestStatus.CANCELLED]: 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] border border-[var(--color-border)]'
    };
    return classes[status] || 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }

  exportToCSV(): void {
    this.transferService.exportToCSV(this.filteredRequests());
  }
}
