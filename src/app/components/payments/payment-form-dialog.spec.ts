import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { PaymentFormDialog, PaymentFormDocument } from './payment-form-dialog';
import { PaymentService } from '../../services/payment.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { Payment, PaymentMethod, PaymentStatus } from '../../interfaces/payment.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'p1',
  saleId: 'sale-1',
  purchaseInvoiceId: null,
  amount: 30,
  method: PaymentMethod.CASH,
  reference: null,
  notes: null,
  status: PaymentStatus.ACTIVE,
  createdById: 'u1',
  cancelledById: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides
});

const doc: PaymentFormDocument = {
  id: 'sale-1',
  totalAmount: 100,
  taxAmount: 0,
  currency: 'USD',
  documentType: 'sale',
};

describe('PaymentFormDialog', () => {
  let fixture: ComponentFixture<PaymentFormDialog>;
  let component: PaymentFormDialog;
  let payments: jasmine.SpyObj<PaymentService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let closed: jasmine.Spy;
  let paymentRecorded: jasmine.Spy;

  beforeEach(async () => {
    payments = jasmine.createSpyObj<PaymentService>('PaymentService', ['findAll', 'create', 'cancel']);
    payments.findAll.and.returnValue(of([]));
    payments.create.and.returnValue(of(payment()));
    payments.cancel.and.returnValue(of(payment({ status: PaymentStatus.CANCELLED })));
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [PaymentFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: PaymentService, useValue: payments },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentFormDialog);
    fixture.componentRef.setInput('document', doc);
    component = fixture.componentInstance;
    closed = jasmine.createSpy('closed');
    paymentRecorded = jasmine.createSpy('paymentRecorded');
    component.closed.subscribe(closed);
    component.paymentRecorded.subscribe(paymentRecorded);
    fixture.detectChanges();
  });

  it('loads the existing payments for the given sale on init', () => {
    expect(payments.findAll).toHaveBeenCalledOnceWith({ saleId: 'sale-1' });
  });

  it('loads the existing payments for the given purchase invoice on init', () => {
    fixture = TestBed.createComponent(PaymentFormDialog);
    fixture.componentRef.setInput('document', { ...doc, id: 'inv-1', documentType: 'purchase' as const });
    fixture.detectChanges();

    expect(payments.findAll).toHaveBeenCalledWith({ purchaseInvoiceId: 'inv-1' });
  });

  describe('currentBalance', () => {
    it('starts at totalAmount + taxAmount when there are no payments yet', () => {
      expect(component.currentBalance()).toBe(100);
    });

    it('subtracts only ACTIVE payments', () => {
      payments.findAll.and.returnValue(of([
        payment({ amount: 30, status: PaymentStatus.ACTIVE }),
        payment({ id: 'p2', amount: 1000, status: PaymentStatus.CANCELLED }),
      ]));
      component.ngOnInit();

      expect(component.currentBalance()).toBe(70);
    });
  });

  describe('canSubmit', () => {
    it('is false with no amount entered', () => {
      expect(component.canSubmit()).toBeFalse();
    });

    it('is false for an amount of 0 or less', () => {
      component.amount.set(0);
      expect(component.canSubmit()).toBeFalse();
      component.amount.set(-5);
      expect(component.canSubmit()).toBeFalse();
    });

    it('is false for an amount greater than the current balance', () => {
      component.amount.set(150);
      expect(component.canSubmit()).toBeFalse();
    });

    it('is true for an amount within the balance', () => {
      component.amount.set(50);
      expect(component.canSubmit()).toBeTrue();
    });
  });

  describe('submit', () => {
    it('sends nothing while the form cannot be submitted', () => {
      component.submit();
      expect(payments.create).not.toHaveBeenCalled();
    });

    it('creates the payment against the sale, trimming optional fields', () => {
      component.amount.set(30);
      component.reference.set('  CHK-100  ');
      component.notes.set('   ');

      component.submit();

      expect(payments.create).toHaveBeenCalledOnceWith({
        saleId: 'sale-1',
        amount: 30,
        method: PaymentMethod.CASH,
        reference: 'CHK-100',
        notes: undefined,
      });
    });

    it('creates the payment against a purchase invoice when documentType is purchase', () => {
      fixture.componentRef.setInput('document', { ...doc, id: 'inv-1', documentType: 'purchase' as const });
      component.amount.set(30);

      component.submit();

      expect(payments.create).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ purchaseInvoiceId: 'inv-1' })
      );
    });

    it('reloads the payment list, clears the form, and tells the parent to refresh — without closing', () => {
      payments.findAll.and.returnValues(of([]), of([payment()]));
      component.amount.set(30);
      component.reference.set('ref');

      component.submit();

      expect(payments.findAll).toHaveBeenCalledTimes(2);
      expect(component.amount()).toBeUndefined();
      expect(component.reference()).toBe('');
      expect(paymentRecorded).toHaveBeenCalledTimes(1);
      expect(closed).not.toHaveBeenCalled();
    });

    it('does not reload or notify when the service answers with nothing (already reported by the service)', () => {
      payments.create.and.returnValue(of(null));
      component.amount.set(30);

      component.submit();

      expect(notifications.success).not.toHaveBeenCalled();
      expect(paymentRecorded).not.toHaveBeenCalled();
    });

    it('ignores a second submit while the first one is still running', () => {
      payments.create.and.returnValue(new Subject());
      component.amount.set(30);

      component.submit();
      component.submit();

      expect(payments.create).toHaveBeenCalledTimes(1);
      expect(component.submitting()).toBeTrue();
    });
  });

  describe('cancelPayment', () => {
    it('asks for confirmation, cancels, and refreshes the list', () => {
      payments.findAll.and.returnValues(of([payment()]), of([payment({ status: PaymentStatus.CANCELLED })]));
      fixture = TestBed.createComponent(PaymentFormDialog);
      fixture.componentRef.setInput('document', doc);
      component = fixture.componentInstance;
      paymentRecorded = jasmine.createSpy('paymentRecorded');
      component.paymentRecorded.subscribe(paymentRecorded);
      fixture.detectChanges();

      component.cancelPayment(payment());

      expect(confirm.ask).toHaveBeenCalledTimes(1);
      expect(payments.cancel).toHaveBeenCalledOnceWith('p1');
      expect(paymentRecorded).toHaveBeenCalledTimes(1);
    });

    it('cancels nothing when the user does not confirm', () => {
      confirm.ask.and.returnValue(of(false));

      component.cancelPayment(payment());

      expect(payments.cancel).not.toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('close asks its parent to close', () => {
      component.close();
      expect(closed).toHaveBeenCalledTimes(1);
    });

    it('the escape key closes it too', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(closed).toHaveBeenCalledTimes(1);
    });
  });
});
