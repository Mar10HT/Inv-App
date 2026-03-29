import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { DischargeRequestService } from '../../../services/discharge-request.service';
import { NotificationService } from '../../../services/notification.service';
import { DischargeRequest, DischargeRequestStatus } from '../../../interfaces/discharge-request.interface';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-discharge-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    TranslateModule,
    NgxPermissionsModule,
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-4xl mx-auto">
        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <lucide-icon name="Loader2" class="!w-8 !h-8 !text-[var(--color-on-surface-variant)] animate-spin"></lucide-icon>
          </div>
        } @else if (request()) {
          <!-- Back Button -->
          <button
            (click)="goBack()"
            class="flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-foreground mb-6 transition-colors">
            <lucide-icon name="ArrowLeft" class="!w-5 !h-5"></lucide-icon>
            <span>{{ 'COMMON.BACK' | translate }}</span>
          </button>

          <!-- Header -->
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-3xl font-bold text-foreground">{{ 'DISCHARGES.DETAIL.TITLE' | translate }}</h1>
                <span [class]="getStatusClass(request()!.status)" class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium">
                  {{ getStatusLabel(request()!.status) }}
                </span>
              </div>
              <p class="text-[var(--color-on-surface-variant)]">{{ formatDate(request()!.createdAt) }}</p>
            </div>

            @if (request()!.status === Status.PENDING) {
              <ng-container *ngxPermissionsOnly="['discharges:manage']">
                <div class="flex gap-2">
                  <button
                    (click)="completeRequest()"
                    class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 font-medium">
                    <lucide-icon name="Check" class="!w-5 !h-5 !text-white"></lucide-icon>
                    <span>{{ 'DISCHARGES.COMPLETE' | translate }}</span>
                  </button>
                  <button
                    (click)="openRejectDialog()"
                    class="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-4 py-3 rounded-lg transition-all flex items-center gap-2 border border-red-600/50">
                    <lucide-icon name="X" class="!w-5 !h-5 !text-current"></lucide-icon>
                    <span>{{ 'DISCHARGES.REJECT' | translate }}</span>
                  </button>
                </div>
              </ng-container>
            }
          </div>

          <!-- Requester Card -->
          <div class="bg-surface-variant border border-theme rounded-xl p-6 mb-6">
            <h2 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <lucide-icon name="User" class="!w-5 !h-5 !text-[var(--color-primary)]"></lucide-icon>
              {{ 'DISCHARGES.DETAIL.REQUESTER_INFO' | translate }}
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'DISCHARGES.PUBLIC_FORM.NAME' | translate }}</p>
                <p class="text-foreground font-medium">{{ request()!.requesterName }}</p>
              </div>
              @if (request()!.requesterPosition) {
                <div>
                  <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'DISCHARGES.PUBLIC_FORM.POSITION' | translate }}</p>
                  <p class="text-foreground">{{ request()!.requesterPosition }}</p>
                </div>
              }
              @if (request()!.requesterPhone) {
                <div>
                  <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'DISCHARGES.PUBLIC_FORM.PHONE' | translate }}</p>
                  <p class="text-foreground">{{ request()!.requesterPhone }}</p>
                </div>
              }
              @if (request()!.neededByDate) {
                <div>
                  <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'DISCHARGES.PUBLIC_FORM.NEEDED_BY' | translate }}</p>
                  <p class="text-foreground">{{ formatDate(request()!.neededByDate!) }}</p>
                </div>
              }
              <div>
                <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'DISCHARGES.WAREHOUSE' | translate }}</p>
                <p class="text-foreground">{{ request()!.warehouseName }}</p>
              </div>
            </div>
          </div>

          <!-- Justification -->
          @if (request()!.justification) {
            <div class="bg-surface-variant border border-theme rounded-xl p-6 mb-6">
              <h2 class="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <lucide-icon name="FileText" class="!w-5 !h-5 !text-[var(--color-primary)]"></lucide-icon>
                {{ 'DISCHARGES.PUBLIC_FORM.JUSTIFICATION' | translate }}
              </h2>
              <p class="text-[var(--color-on-surface)]">{{ request()!.justification }}</p>
            </div>
          }

          <!-- Items List -->
          <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden mb-6">
            <div class="px-6 py-4 border-b border-theme">
              <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
                <lucide-icon name="Package" class="!w-5 !h-5 !text-[var(--color-primary)]"></lucide-icon>
                {{ 'DISCHARGES.ITEMS' | translate }} ({{ request()!.items.length }})
              </h2>
            </div>
            <div class="divide-y divide-[var(--color-border-subtle)]">
              @for (item of request()!.items; track item.id) {
                <div class="px-6 py-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="bg-[var(--color-surface-elevated)] p-2 rounded-lg">
                      <lucide-icon name="Box" class="!w-5 !h-5 !text-[var(--color-on-surface-variant)]"></lucide-icon>
                    </div>
                    <div>
                      <p class="text-foreground font-medium">{{ item.inventoryItemName }}</p>
                      @if (item.inventoryItemServiceTag) {
                        <p class="text-[var(--color-on-surface-variant)] text-sm">{{ item.inventoryItemServiceTag }}</p>
                      }
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-foreground font-semibold text-lg">{{ item.quantity }}</p>
                    <p class="text-[var(--color-on-surface-variant)] text-sm">{{ 'DISCHARGES.DETAIL.UNITS' | translate }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Resolution Info -->
          @if (request()!.status !== Status.PENDING) {
            <div class="bg-surface-variant border border-theme rounded-xl p-6">
              <h2 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <lucide-icon name="ClipboardCheck" class="!w-5 !h-5 !text-[var(--color-primary)]"></lucide-icon>
                {{ 'DISCHARGES.DETAIL.RESOLUTION' | translate }}
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'DISCHARGES.DETAIL.RESOLVED_BY' | translate }}</p>
                  <p class="text-foreground">{{ request()!.resolvedByName || '-' }}</p>
                </div>
                <div>
                  <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'DISCHARGES.DETAIL.RESOLVED_AT' | translate }}</p>
                  <p class="text-foreground">{{ request()!.resolvedAt ? formatDate(request()!.resolvedAt!) : '-' }}</p>
                </div>
                @if (request()!.rejectedReason) {
                  <div class="sm:col-span-2">
                    <p class="text-sm text-[var(--color-on-surface-variant)] mb-1">{{ 'DISCHARGES.REJECT_REASON' | translate }}</p>
                    <p class="text-red-400">{{ request()!.rejectedReason }}</p>
                  </div>
                }
              </div>
            </div>
          }
        } @else {
          <!-- Not Found -->
          <div class="text-center py-20">
            <lucide-icon name="SearchX" class="!w-16 !h-16 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
            <h2 class="text-xl font-semibold text-[var(--color-on-surface-variant)]">{{ 'DISCHARGES.NOT_FOUND' | translate }}</h2>
          </div>
        }
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
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'DISCHARGES.REJECT_REASON' | translate }}</label>
            <textarea
              [(ngModel)]="rejectReason"
              rows="3"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
              [placeholder]="'DISCHARGES.REJECT_REASON_PLACEHOLDER' | translate"
            ></textarea>
          </div>
          <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
            <button
              (click)="closeRejectDialog()"
              class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors">
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
  `,
})
export class DischargeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dischargeService = inject(DischargeRequestService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);

  Status = DischargeRequestStatus;

  request = signal<DischargeRequest | null>(null);
  loading = signal(true);

  // Reject dialog
  showRejectDialog = false;
  rejectReason = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.dischargeService.findOne(id).subscribe({
        next: (req) => {
          this.request.set(req);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/discharges']);
  }

  completeRequest(): void {
    const req = this.request();
    if (!req) return;

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
        this.dischargeService.completeRequest(req.id).subscribe({
          next: (result) => {
            if (result) {
              this.request.set(result);
              this.notifications.success(this.translate.instant('DISCHARGES.COMPLETE_SUCCESS'));
            }
          },
          error: () => {
            this.notifications.error(this.translate.instant('DISCHARGES.COMPLETE_ERROR'));
          },
        });
      }
    });
  }

  openRejectDialog(): void {
    this.rejectReason = '';
    this.showRejectDialog = true;
  }

  closeRejectDialog(): void {
    this.showRejectDialog = false;
    this.rejectReason = '';
  }

  confirmReject(): void {
    const req = this.request();
    if (!req) return;

    this.dischargeService.rejectRequest(req.id, this.rejectReason || undefined).subscribe({
      next: (result) => {
        if (result) {
          this.request.set(result);
          this.notifications.success(this.translate.instant('DISCHARGES.REJECT_SUCCESS'));
          this.closeRejectDialog();
        }
      },
      error: () => {
        this.notifications.error(this.translate.instant('DISCHARGES.REJECT_ERROR'));
      },
    });
  }

  getStatusLabel(status: DischargeRequestStatus): string {
    return this.translate.instant(`DISCHARGES.STATUS.${status}`);
  }

  getStatusClass(status: DischargeRequestStatus): string {
    const classes: Record<string, string> = {
      [DischargeRequestStatus.PENDING]: 'bg-[var(--color-accent-amber-bg)] text-[var(--color-accent-amber)] border border-[var(--color-accent-amber-bg)]',
      [DischargeRequestStatus.COMPLETED]: 'bg-[var(--color-success-bg)] text-[var(--color-status-success)] border border-[var(--color-success-border)]',
      [DischargeRequestStatus.REJECTED]: 'bg-[var(--color-error-bg)] text-[var(--color-status-error)] border border-[var(--color-error-border)]',
    };
    return classes[status] || 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }
}
