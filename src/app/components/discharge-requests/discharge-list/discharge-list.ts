import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { DischargeRequestService } from '../../../services/discharge-request.service';
import { NotificationService } from '../../../services/notification.service';
import { DischargeRequest, DischargeRequestStatus } from '../../../interfaces/discharge-request.interface';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-discharge-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatPaginatorModule,
    NgxPermissionsModule,
    TranslateModule,
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'DISCHARGES.TITLE' | translate }}</h1>
              <p class="text-slate-500 text-lg">{{ 'DISCHARGES.SUBTITLE' | translate }}</p>
            </div>
            <ng-container *ngxPermissionsOnly="['manage_discharges']">
              <button
                (click)="openShareDialog()"
                class="flex items-center gap-2 px-4 py-2.5 bg-[#4d7c6f] text-white rounded-lg hover:bg-[#5d8c7f] transition-colors font-medium whitespace-nowrap">
                <lucide-icon name="QrCode" class="!w-5 !h-5"></lucide-icon>
                <span>{{ 'DISCHARGES.SHARE_FORM.BUTTON' | translate }}</span>
              </button>
            </ng-container>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'COMMON.TOTAL' | translate }}</p>
                <p class="text-2xl font-bold text-foreground">{{ stats().total }}</p>
              </div>
              <div class="bg-slate-800/50 p-3 rounded-lg">
                <lucide-icon name="ClipboardList" class="!text-slate-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'DISCHARGES.STATUS.PENDING' | translate }}</p>
                <p class="text-2xl font-bold text-amber-400">{{ stats().byStatus.pending }}</p>
              </div>
              <div class="bg-amber-950/50 p-3 rounded-lg">
                <lucide-icon name="Clock" class="!text-amber-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'DISCHARGES.STATUS.COMPLETED' | translate }}</p>
                <p class="text-2xl font-bold text-emerald-400">{{ stats().byStatus.completed }}</p>
              </div>
              <div class="bg-emerald-950/50 p-3 rounded-lg">
                <lucide-icon name="CheckCircle2" class="!text-emerald-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'DISCHARGES.STATUS.REJECTED' | translate }}</p>
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
            <div class="flex-1">
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="applyFilters()"
                  [placeholder]="'DISCHARGES.SEARCH_PLACEHOLDER' | translate"
                  class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-slate-500 focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all"
                />
                <lucide-icon name="Search" class="absolute left-3 top-1/2 -translate-y-1/2 !text-slate-500 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
            <div class="lg:w-56">
              <select
                [(ngModel)]="selectedStatus"
                (ngModelChange)="applyFilters()"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all cursor-pointer appearance-none"
                style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(148 163 184)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25rem; padding-right: 2.5rem;"
              >
                <option value="all">{{ 'DISCHARGES.ALL_STATUS' | translate }}</option>
                <option [value]="Status.PENDING">{{ 'DISCHARGES.STATUS.PENDING' | translate }}</option>
                <option [value]="Status.COMPLETED">{{ 'DISCHARGES.STATUS.COMPLETED' | translate }}</option>
                <option [value]="Status.REJECTED">{{ 'DISCHARGES.STATUS.REJECTED' | translate }}</option>
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
            <h2 class="text-xl font-semibold text-foreground">{{ 'DISCHARGES.LIST' | translate }}</h2>
          </div>

          <!-- Desktop Table -->
          <div class="hidden lg:block overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-[#141414]">
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'DISCHARGES.REQUESTER' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'DISCHARGES.ITEMS' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'DISCHARGES.WAREHOUSE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.DATE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1e1e1e]">
                @for (request of paginatedRequests(); track request.id) {
                  <tr class="hover:bg-[#1e1e1e] transition-colors cursor-pointer" (click)="viewDetail(request)">
                    <td class="px-6 py-4">
                      <div>
                        <p class="text-foreground font-medium">{{ request.requesterName }}</p>
                        <p class="text-slate-500 text-sm">{{ request.requesterPosition || '' }}</p>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div>
                        <p class="text-foreground font-medium">{{ request.items.length }} {{ 'DISCHARGES.ITEMS_COUNT' | translate }}</p>
                        <p class="text-slate-500 text-sm truncate max-w-xs">{{ getItemsPreview(request) }}</p>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-slate-500 !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ request.warehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-foreground">{{ formatDate(request.createdAt) }}</td>
                    <td class="px-6 py-4">
                      <span [class]="getStatusClass(request.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                        {{ getStatusLabel(request.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4" (click)="$event.stopPropagation()">
                      <div class="flex items-center gap-2">
                        <ng-container *ngxPermissionsOnly="['manage_discharges']">
                          @if (request.status === Status.PENDING) {
                            <button
                              (click)="completeRequest(request)"
                              class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                              <lucide-icon name="Check" class="!w-4 !h-4 !text-white shrink-0"></lucide-icon>
                              <span>{{ 'DISCHARGES.COMPLETE' | translate }}</span>
                            </button>
                            <button
                              (click)="rejectRequest(request)"
                              class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 text-sm border border-red-600/50">
                              <lucide-icon name="X" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                            </button>
                          }
                        </ng-container>
                        @if (request.status === Status.COMPLETED) {
                          <span class="text-slate-500 text-sm">{{ formatDate(request.resolvedAt!) }}</span>
                        }
                        @if (request.status === Status.REJECTED) {
                          <span class="text-red-400 text-sm truncate max-w-[150px]" [title]="request.rejectedReason || ''">
                            {{ request.rejectedReason || '-' }}
                          </span>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-6 py-16 text-center">
                      <lucide-icon name="ClipboardList" class="!w-14 !h-14 !text-slate-700 mb-4"></lucide-icon>
                      <h3 class="text-lg font-semibold text-slate-400 mb-2">{{ 'DISCHARGES.NO_REQUESTS' | translate }}</h3>
                      <p class="text-slate-600">{{ 'DISCHARGES.NO_REQUESTS_DESC' | translate }}</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="lg:hidden divide-y divide-[#1e1e1e]">
            @for (request of paginatedRequests(); track request.id) {
              <div class="p-4" (click)="viewDetail(request)">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="text-foreground font-medium">{{ request.requesterName }}</p>
                    <p class="text-slate-500 text-sm">{{ request.items.length }} {{ 'DISCHARGES.ITEMS_COUNT' | translate }}</p>
                  </div>
                  <span [class]="getStatusClass(request.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                    {{ getStatusLabel(request.status) }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p class="text-slate-500">{{ 'DISCHARGES.WAREHOUSE' | translate }}</p>
                    <p class="text-foreground">{{ request.warehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-slate-500">{{ 'COMMON.DATE' | translate }}</p>
                    <p class="text-foreground">{{ formatDate(request.createdAt) }}</p>
                  </div>
                </div>
                <ng-container *ngxPermissionsOnly="['manage_discharges']">
                  @if (request.status === Status.PENDING) {
                    <div class="flex gap-2" (click)="$event.stopPropagation()">
                      <button
                        (click)="completeRequest(request)"
                        class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium">
                        <lucide-icon name="Check" class="!w-4 !h-4 !text-white"></lucide-icon>
                        <span>{{ 'DISCHARGES.COMPLETE' | translate }}</span>
                      </button>
                      <button
                        (click)="rejectRequest(request)"
                        class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-2 rounded-lg border border-red-600/50">
                        <lucide-icon name="X" class="!w-4 !h-4 !text-current"></lucide-icon>
                      </button>
                    </div>
                  }
                </ng-container>
              </div>
            } @empty {
              <div class="p-8 text-center">
                <lucide-icon name="ClipboardList" class="!w-14 !h-14 !text-slate-700 mb-4"></lucide-icon>
                <h3 class="text-lg font-semibold text-slate-400 mb-2">{{ 'DISCHARGES.NO_REQUESTS' | translate }}</h3>
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

    <!-- Reject Dialog -->
    @if (showRejectDialog) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeRejectDialog()">
        <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'DISCHARGES.REJECT_TITLE' | translate }}</h2>
          </div>
          <div class="p-6">
            <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'DISCHARGES.REJECT_REASON' | translate }}</label>
            <textarea
              [(ngModel)]="rejectReason"
              rows="3"
              class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] resize-none"
              [placeholder]="'DISCHARGES.REJECT_REASON_PLACEHOLDER' | translate"
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
              {{ 'DISCHARGES.REJECT' | translate }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Share Form Dialog -->
    @if (showShareDialog) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeShareDialog()">
        <div class="rounded-xl w-full max-w-md border border-theme" [style.background-color]="'var(--color-surface-variant)'" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme flex items-center justify-between">
            <h2 class="text-xl font-semibold" [style.color]="'var(--color-foreground)'">{{ 'DISCHARGES.SHARE_FORM.TITLE' | translate }}</h2>
            <button (click)="closeShareDialog()" class="text-slate-400 hover:text-slate-200 transition-colors">
              <lucide-icon name="X" class="!w-5 !h-5"></lucide-icon>
            </button>
          </div>
          <div class="p-6 flex flex-col items-center gap-5">
            <p class="text-sm text-slate-400 text-center">{{ 'DISCHARGES.SHARE_FORM.DESCRIPTION' | translate }}</p>

            @if (shareLoading()) {
              <div class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4d7c6f]"></div>
              </div>
            } @else if (shareQrDataUrl()) {
              <!-- QR Code -->
              <div class="bg-white rounded-xl p-4">
                <img [src]="shareQrDataUrl()" alt="QR Code" class="w-[250px] h-[250px]" />
              </div>

              <!-- URL -->
              <div class="w-full rounded-lg px-4 py-3 flex items-center gap-2 border border-theme" [style.background-color]="'var(--color-surface-elevated)'">
                <lucide-icon name="Link" class="!w-4 !h-4 !text-slate-500 shrink-0"></lucide-icon>
                <span class="text-sm flex-1 truncate select-all" [style.color]="'var(--color-foreground)'">{{ shareUrl() }}</span>
              </div>

              <!-- Actions -->
              <div class="flex gap-3 w-full">
                <button
                  (click)="copyShareUrl()"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4d7c6f] text-white rounded-lg hover:bg-[#5d8c7f] transition-colors font-medium">
                  <lucide-icon [name]="shareCopied() ? 'Check' : 'Copy'" class="!w-4 !h-4 !text-white"></lucide-icon>
                  {{ shareCopied() ? ('DISCHARGES.SHARE_FORM.COPIED' | translate) : ('DISCHARGES.SHARE_FORM.COPY_URL' | translate) }}
                </button>
                <button
                  (click)="downloadQr()"
                  class="flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent border border-theme text-slate-400 rounded-lg transition-colors">
                  <lucide-icon name="Download" class="!w-4 !h-4 !text-current shrink-0"></lucide-icon>
                  {{ 'DISCHARGES.SHARE_FORM.DOWNLOAD_QR' | translate }}
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class DischargeListComponent implements OnInit {
  private dischargeService = inject(DischargeRequestService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  Status = DischargeRequestStatus;

  // Filter state
  searchQuery = '';
  selectedStatus = 'all';

  // Pagination
  pageIndex = 0;
  pageSize = 10;

  // Reject dialog
  showRejectDialog = false;
  rejectReason = '';
  requestToReject: DischargeRequest | null = null;

  // Share dialog
  showShareDialog = false;
  shareUrl = signal('');
  shareQrDataUrl = signal('');
  shareCopied = signal(false);
  shareLoading = signal(false);

  // Computed
  stats = computed(() => this.dischargeService.stats());

  private filteredRequestsSignal = signal<DischargeRequest[]>([]);
  filteredRequests = computed(() => this.filteredRequestsSignal());

  paginatedRequests = computed(() => {
    const requests = this.filteredRequestsSignal();
    const start = this.pageIndex * this.pageSize;
    return requests.slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.dischargeService.loadRequests();
    setTimeout(() => this.applyFilters(), 100);
  }

  applyFilters(): void {
    let requests = this.dischargeService.requests();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      requests = requests.filter(
        (req) =>
          req.requesterName.toLowerCase().includes(query) ||
          req.warehouseName.toLowerCase().includes(query) ||
          req.items.some((i) => i.inventoryItemName.toLowerCase().includes(query)),
      );
    }

    if (this.selectedStatus !== 'all') {
      requests = requests.filter((req) => req.status === this.selectedStatus);
    }

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

  viewDetail(request: DischargeRequest): void {
    this.router.navigate(['/discharges', request.id]);
  }

  completeRequest(request: DischargeRequest): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('DISCHARGES.CONFIRM_COMPLETE_TITLE'),
        message: this.translate.instant('DISCHARGES.CONFIRM_COMPLETE_MESSAGE'),
        confirmText: this.translate.instant('DISCHARGES.COMPLETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'info',
      },
      panelClass: 'confirm-dialog-container',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.dischargeService.completeRequest(request.id).subscribe({
          next: (result) => {
            if (result) {
              this.notifications.success(this.translate.instant('DISCHARGES.COMPLETE_SUCCESS'));
              this.applyFilters();
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('DISCHARGES.COMPLETE_ERROR'));
          },
        });
      }
    });
  }

  rejectRequest(request: DischargeRequest): void {
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

    this.dischargeService.rejectRequest(this.requestToReject.id, this.rejectReason || undefined).subscribe({
      next: (result) => {
        if (result) {
          this.notifications.success(this.translate.instant('DISCHARGES.REJECT_SUCCESS'));
          this.closeRejectDialog();
          this.applyFilters();
        }
      },
      error: () => {
        this.notifications.error(this.translate.instant('DISCHARGES.REJECT_ERROR'));
      },
    });
  }

  getItemsPreview(request: DischargeRequest): string {
    return (
      request.items
        .slice(0, 2)
        .map((i) => i.inventoryItemName)
        .join(', ') + (request.items.length > 2 ? '...' : '')
    );
  }

  getStatusLabel(status: DischargeRequestStatus): string {
    return this.translate.instant(`DISCHARGES.STATUS.${status}`);
  }

  getStatusClass(status: DischargeRequestStatus): string {
    const classes: Record<string, string> = {
      [DischargeRequestStatus.PENDING]: 'bg-amber-950/50 text-amber-400 border border-amber-900',
      [DischargeRequestStatus.COMPLETED]: 'bg-emerald-950/50 text-emerald-400 border border-emerald-900',
      [DischargeRequestStatus.REJECTED]: 'bg-red-950/50 text-red-400 border border-red-900',
    };
    return classes[status] || 'bg-slate-800 text-slate-400';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }

  openShareDialog(): void {
    this.showShareDialog = true;
    this.shareLoading.set(true);
    this.shareCopied.set(false);

    this.dischargeService.getRequestFormQr().subscribe({
      next: (result) => {
        this.shareUrl.set(result.url);
        this.shareQrDataUrl.set(result.qrDataUrl);
        this.shareLoading.set(false);
      },
      error: () => {
        this.notifications.error(this.translate.instant('COMMON.LOADING') + ' error');
        this.showShareDialog = false;
        this.shareLoading.set(false);
      },
    });
  }

  closeShareDialog(): void {
    this.showShareDialog = false;
    this.shareUrl.set('');
    this.shareQrDataUrl.set('');
  }

  copyShareUrl(): void {
    navigator.clipboard.writeText(this.shareUrl()).then(() => {
      this.shareCopied.set(true);
      setTimeout(() => this.shareCopied.set(false), 2000);
    });
  }

  downloadQr(): void {
    const dataUrl = this.shareQrDataUrl();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'request-form-qr.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
