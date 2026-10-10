import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { PaymentService } from './payment.service';
import { NotificationService } from './notification.service';
import { Payment, PaymentMethod, PaymentStatus } from '../interfaces/payment.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'p1',
  saleId: 's1',
  purchaseInvoiceId: null,
  amount: 50,
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

const url = (path = ''): string => `${environment.apiUrl}/payments${path}`;

describe('PaymentService', () => {
  let service: PaymentService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['reportErrors']) }
      ]
    });
    service = TestBed.inject(PaymentService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('has the notification service show the errors of its requests', () => {
    expect(TestBed.inject(NotificationService).reportErrors).toHaveBeenCalledOnceWith(service.error);
  });

  describe('findAll', () => {
    it('scopes the request to the given saleId', () => {
      let result: Payment[] | undefined;
      service.findAll({ saleId: 's1' }).subscribe((data) => (result = data));

      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('saleId')).toBe('s1');
      request.flush({ data: [payment({ id: 'a' }), payment({ id: 'b' })] });

      expect(result?.map((p) => p.id)).toEqual(['a', 'b']);
    });

    it('scopes the request to the given purchaseInvoiceId', () => {
      service.findAll({ purchaseInvoiceId: 'inv-1' }).subscribe();

      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('purchaseInvoiceId')).toBe('inv-1');
      request.flush({ data: [] });
    });

    it('resolves with an empty list and records an error when the request fails', () => {
      let result: Payment[] | undefined;
      service.findAll({ saleId: 's1' }).subscribe((data) => (result = data));

      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      expect(result).toEqual([]);
      expect(service.error()).toBeTruthy();
    });
  });

  describe('create', () => {
    it('posts the dto and returns the created payment', () => {
      let result: Payment | null = null;
      const dto = { saleId: 's1', amount: 50, method: PaymentMethod.CASH };

      service.create(dto).subscribe((created) => (result = created));
      const request = backend.expectOne((r) => r.method === 'POST');
      expect(request.request.body).toEqual(dto);
      request.flush(payment());

      expect((result as Payment | null)?.id).toBe('p1');
    });

    it('resolves with null and records the message when the API refuses (e.g. overpayment)', () => {
      let result: Payment | null | undefined;
      service.create({ saleId: 's1', amount: 999, method: PaymentMethod.CASH }).subscribe((created) => (result = created));

      backend.expectOne((r) => r.method === 'POST').flush(
        { message: 'Payment amount exceeds the current balance' },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(result).toBeNull();
      expect(service.error()).toBe('Payment amount exceeds the current balance');
    });
  });

  describe('cancel', () => {
    it('sends the reason and returns the cancelled payment', () => {
      let result: Payment | null = null;

      service.cancel('p1', { reason: 'Entered twice' }).subscribe((updated) => (result = updated));
      const request = backend.expectOne(url('/p1/cancel'));
      expect(request.request.body).toEqual({ reason: 'Entered twice' });
      request.flush(payment({ status: PaymentStatus.CANCELLED }));

      expect((result as Payment | null)?.status).toBe(PaymentStatus.CANCELLED);
    });

    it('resolves with null when the API refuses', () => {
      let result: Payment | null | undefined;
      service.cancel('p1').subscribe((updated) => (result = updated));

      backend.expectOne(url('/p1/cancel')).flush(null, { status: 409, statusText: 'Conflict' });

      expect(result).toBeNull();
    });
  });
});
