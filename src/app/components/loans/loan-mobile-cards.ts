import { Component, ChangeDetectionStrategy, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NgxPermissionsModule } from 'ngx-permissions';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Loan, LoanStatus } from '../../interfaces/loan.interface';
import { getLoanDueDateClass, getLoanStatusClass, summarizeLoanItems, totalLoanQuantity } from '../../utils/loan.utils';

@Component({
  selector: 'app-loan-mobile-cards',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, LucideAngularModule, NgxPermissionsModule, TranslateModule],
  template: `
    <div class="lg:hidden divide-y divide-[var(--color-border-subtle)]">
      @for (loan of loans(); track loan.id) {
        <div class="p-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-foreground font-medium">{{ loan.name || summarize(loan) }}</p>
              @if (loan.name) {
                <p class="text-[var(--color-on-surface-variant)] text-xs mb-1">{{ summarize(loan) }}</p>
              }
              <p class="text-[var(--color-on-surface-variant)] text-sm">
                {{ 'DASHBOARD.TABLE.QUANTITY' | translate }}: {{ totalQty(loan) }}
                @if (loan.items.length === 1 && loan.items[0].inventoryItemServiceTag) {
                  · {{ loan.items[0].inventoryItemServiceTag }}
                } @else if (loan.items.length > 1) {
                  · {{ loan.items.length }} {{ 'TRANSACTION.ITEMS' | translate }}
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
          <!-- PDF download — always available -->
          <div class="mb-2 flex justify-end">
            <button
              type="button"
              (click)="downloadPdfRequested.emit(loan)"
              class="ds-btn ds-btn--ghost ds-btn--sm">
              <lucide-icon name="FileText" class="shrink-0"></lucide-icon>
              <span>PDF</span>
            </button>
          </div>
          <!-- Mobile Actions -->
          @switch (loan.status) {
            @case (LoanStatus.PENDING) {
              <ng-container *ngxPermissionsOnly="['loans:manage']">
                <div class="flex gap-2">
                  <button
                    (click)="sendRequested.emit(loan)"
                    [disabled]="loading()"
                    class="flex-1 ds-btn ds-btn--send ds-btn--sm justify-center">
                    <lucide-icon name="Send" class="shrink-0"></lucide-icon>
                    <span>{{ 'LOANS.SEND' | translate }}</span>
                  </button>
                  <button
                    (click)="cancelRequested.emit(loan)"
                    [disabled]="loading()"
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
                  (click)="showQrRequested.emit({ loan, type: 'send' })"
                  class="flex-1 ds-btn ds-btn--qr ds-btn--sm justify-center">
                  <lucide-icon name="QrCode" class="shrink-0"></lucide-icon>
                  <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                </button>
                <ng-container *ngxPermissionsOnly="['loans:manage']">
                  <button
                    (click)="confirmReceiptRequested.emit(loan)"
                    [disabled]="loading()"
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
                  (click)="initiateReturnRequested.emit(loan)"
                  [disabled]="loading()"
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
                    (click)="confirmReceiptRequested.emit(loan)"
                    [disabled]="loading()"
                    class="w-full ds-btn ds-btn--ghost ds-btn--sm justify-center">
                    <lucide-icon name="CheckCircle" class="shrink-0"></lucide-icon>
                    <span>{{ 'LOANS.MANUAL_CONFIRM_RECEIPT' | translate }}</span>
                  </button>
                } @else {
                  <div class="flex gap-2">
                    <button
                      (click)="initiateReturnRequested.emit(loan)"
                      [disabled]="loading()"
                      class="flex-1 ds-btn ds-btn--danger ds-btn--sm justify-center">
                      <lucide-icon name="CornerDownLeft" class="shrink-0"></lucide-icon>
                      <span>{{ 'LOANS.INITIATE_RETURN' | translate }}</span>
                    </button>
                    <button
                      (click)="confirmReturnRequested.emit(loan)"
                      [disabled]="loading()"
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
                  (click)="showQrRequested.emit({ loan, type: 'return' })"
                  class="flex-1 ds-btn ds-btn--approve ds-btn--sm justify-center">
                  <lucide-icon name="QrCode" class="shrink-0"></lucide-icon>
                  <span>{{ 'LOANS.QR.SHOW_QR' | translate }}</span>
                </button>
                <ng-container *ngxPermissionsOnly="['loans:manage']">
                  <button
                    (click)="confirmReturnRequested.emit(loan)"
                    [disabled]="loading()"
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
  `
})
export class LoanMobileCards {
  loans = input.required<Loan[]>();
  loading = input(false);

  sendRequested = output<Loan>();
  cancelRequested = output<Loan>();
  showQrRequested = output<{ loan: Loan; type: 'send' | 'return' }>();
  confirmReceiptRequested = output<Loan>();
  confirmReturnRequested = output<Loan>();
  initiateReturnRequested = output<Loan>();
  downloadPdfRequested = output<Loan>();

  protected readonly LoanStatus = LoanStatus;
  private translate = inject(TranslateService);

  protected readonly summarize = summarizeLoanItems;
  protected readonly totalQty = totalLoanQuantity;
  protected readonly getStatusClass = getLoanStatusClass;
  protected readonly getDueDateClass = getLoanDueDateClass;

  protected getStatusLabel(status: LoanStatus): string {
    return this.translate.instant(`LOANS.STATUS.${status}`);
  }
}
