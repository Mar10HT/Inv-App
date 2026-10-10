import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';
import { filter, switchMap } from 'rxjs/operators';

import { PaymentService } from '../../services/payment.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import {
  CreatePaymentDto,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../../interfaces/payment.interface';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Minimal document shape the dialog needs — reusable from both Sales and Purchases rows. */
export interface PaymentFormDocument {
  id: string;
  totalAmount: number;
  taxAmount: number | null;
  currency: string;
  documentType: 'sale' | 'purchase';
}

const METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CHECK,
];

@Component({
  selector: 'app-payment-form-dialog',
  standalone: true,
  imports: [FormsModule, A11yModule, LucideAngularModule, TranslateModule, DatePipe, NgxPermissionsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div class="absolute inset-0 bg-black/50" role="presentation" (click)="close()"></div>
      <div
        #dialogEl
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-form-dialog-title"
        tabindex="-1"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
        class="relative bg-surface-variant border border-theme rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <div class="px-6 py-4 border-b border-theme">
          <h2 id="payment-form-dialog-title" class="text-xl font-semibold text-foreground">
            {{ 'PAYMENTS.TITLE' | translate }}
          </h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">
            {{ 'PAYMENTS.BALANCE' | translate }}: {{ document().currency }} {{ currentBalance() }}
          </p>
        </div>

        <div class="p-6 space-y-4">
          <!-- Existing payments -->
          <div>
            <span class="text-sm font-medium text-[var(--color-on-surface-variant)]">
              {{ 'PAYMENTS.TITLE' | translate }}
            </span>
            <div class="space-y-2 mt-2">
              @for (p of payments(); track p.id) {
                <div class="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg p-3 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-sm text-foreground" [class.line-through]="p.status === 'CANCELLED'">
                      {{ document().currency }} {{ p.amount }} · {{ 'PAYMENTS.METHOD_OPTIONS.' + p.method | translate }}
                    </div>
                    <div class="text-xs text-[var(--color-on-surface-variant)]">
                      {{ p.createdAt | date:'short' }}
                      @if (p.reference) { · {{ p.reference }} }
                    </div>
                  </div>
                  @if (p.status === 'ACTIVE') {
                    <ng-container *ngxPermissionsOnly="['payments:cancel']">
                      <button
                        type="button"
                        (click)="cancelPayment(p)"
                        [title]="'PAYMENTS.CANCEL_PAYMENT' | translate"
                        class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors shrink-0"
                      >
                        <lucide-icon name="Ban" class="!w-4 !h-4"></lucide-icon>
                      </button>
                    </ng-container>
                  }
                </div>
              }
              @if (payments().length === 0) {
                <p class="text-[var(--color-on-surface-variant)] text-sm text-center py-2">
                  {{ 'PAYMENTS.NO_PAYMENTS' | translate }}
                </p>
              }
            </div>
          </div>

          <!-- New payment form -->
          <ng-container *ngxPermissionsOnly="['payments:create']">
            <div class="border-t border-theme pt-4 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="payment-amount" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
                    {{ 'PAYMENTS.AMOUNT' | translate }} *
                  </label>
                  <input
                    id="payment-amount"
                    type="number"
                    [ngModel]="amount()"
                    (ngModelChange)="amount.set($event === '' ? undefined : $event)"
                    min="0.01"
                    step="0.01"
                    class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label for="payment-method" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
                    {{ 'PAYMENTS.METHOD' | translate }} *
                  </label>
                  <select
                    id="payment-method"
                    [ngModel]="method()"
                    (ngModelChange)="method.set($event)"
                    class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  >
                    @for (m of methods; track m) {
                      <option [value]="m">{{ 'PAYMENTS.METHOD_OPTIONS.' + m | translate }}</option>
                    }
                  </select>
                </div>
              </div>

              <div>
                <label for="payment-reference" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
                  {{ 'PAYMENTS.REFERENCE' | translate }}
                </label>
                <input
                  id="payment-reference"
                  type="text"
                  [ngModel]="reference()"
                  (ngModelChange)="reference.set($event)"
                  maxlength="100"
                  class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label for="payment-notes" class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
                  {{ 'PAYMENTS.NOTES' | translate }}
                </label>
                <textarea
                  id="payment-notes"
                  [ngModel]="notes()"
                  (ngModelChange)="notes.set($event)"
                  rows="2"
                  class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                ></textarea>
              </div>

              <button
                type="button"
                (click)="submit()"
                [disabled]="!canSubmit() || submitting()"
                class="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-surface-elevated)] disabled:text-[var(--color-on-surface-variant)] text-white px-6 py-2 rounded-lg transition-all"
              >
                {{ 'PAYMENTS.RECORD_PAYMENT' | translate }}
              </button>
            </div>
          </ng-container>
        </div>

        <div class="px-6 py-4 border-t border-theme flex justify-end">
          <button
            (click)="close()"
            class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors"
          >
            {{ 'COMMON.CLOSE' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PaymentFormDialog implements OnInit, AfterViewInit {
  private paymentService = inject(PaymentService);
  private confirm = inject(ConfirmService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  private dialogEl = viewChild<ElementRef<HTMLElement>>('dialogEl');

  document = input.required<PaymentFormDocument>();

  closed = output<void>();
  // Fired after a payment is successfully created OR cancelled — tells the
  // parent list (Sales/Purchases) to reload so its balance column catches
  // up. Does NOT close the dialog; payment history stays visible so more
  // than one payment can be recorded in one sitting.
  paymentRecorded = output<void>();

  ngOnInit(): void {
    this.loadPayments();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.dialogEl()?.nativeElement.focus());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  readonly methods = METHODS;

  payments = signal<Payment[]>([]);
  amount = signal<number | undefined>(undefined);
  method = signal<PaymentMethod>(PaymentMethod.CASH);
  reference = signal('');
  notes = signal('');
  submitting = signal(false);

  /**
   * Never trusts a balance figure passed in from the parent row — recomputed
   * live from this.payments(), the exact same formula the backend uses
   * (totalAmount + taxAmount - sum of ACTIVE payments). Self-correcting as
   * payments are created/cancelled within this dialog session.
   */
  currentBalance = computed(() => {
    const doc = this.document();
    const paid = this.payments()
      .filter((p) => p.status === PaymentStatus.ACTIVE)
      .reduce((sum, p) => sum + p.amount, 0);
    return round2(doc.totalAmount + (doc.taxAmount ?? 0) - paid);
  });

  canSubmit = computed(() => {
    const amt = this.amount();
    return amt !== undefined && amt > 0 && amt <= this.currentBalance();
  });

  private loadPayments(): void {
    const doc = this.document();
    const params =
      doc.documentType === 'sale'
        ? { saleId: doc.id }
        : { purchaseInvoiceId: doc.id };
    this.paymentService.findAll(params).subscribe((data) => this.payments.set(data));
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) return;
    this.submitting.set(true);

    const doc = this.document();
    const dto: CreatePaymentDto = {
      ...(doc.documentType === 'sale' ? { saleId: doc.id } : { purchaseInvoiceId: doc.id }),
      amount: this.amount() as number,
      method: this.method(),
      reference: this.reference().trim() || undefined,
      notes: this.notes().trim() || undefined,
    };

    this.paymentService.create(dto).subscribe((result) => {
      this.submitting.set(false);
      if (result) {
        this.notifications.success('PAYMENTS.CREATE_SUCCESS');
        this.amount.set(undefined);
        this.reference.set('');
        this.notes.set('');
        this.loadPayments();
        this.paymentRecorded.emit();
      }
      // A null answer is a failed request: PaymentService already showed the reason (reportErrors)
    });
  }

  cancelPayment(payment: Payment): void {
    this.confirm
      .ask({
        title: this.translate.instant('PAYMENTS.CANCEL_PAYMENT'),
        message: this.translate.instant('PAYMENTS.CONFIRM_CANCEL_MESSAGE', {
          amount: payment.amount,
        }),
        confirmText: this.translate.instant('PAYMENTS.CANCEL_PAYMENT'),
        type: 'warning',
      })
      .pipe(
        filter((confirmed) => !!confirmed),
        switchMap(() => this.paymentService.cancel(payment.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result) {
          this.notifications.success('PAYMENTS.CANCEL_SUCCESS');
          this.loadPayments();
          this.paymentRecorded.emit();
        }
      });
  }
}
