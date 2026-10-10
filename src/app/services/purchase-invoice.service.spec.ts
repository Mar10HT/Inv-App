import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { PurchaseInvoiceService } from './purchase-invoice.service';
import { NotificationService } from './notification.service';
import {
  CreatePurchaseInvoiceDto,
  PaymentCondition,
  PurchaseInvoice,
  PurchaseInvoiceStatus,
} from '../interfaces/purchase-invoice.interface';
import { ItemType } from '../interfaces/inventory-item.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const purchaseInvoice = (overrides: Partial<PurchaseInvoice> = {}): PurchaseInvoice => ({
  id: 'p1',
  number: 'COM-0001',
  invoiceNumber: 'FAC-001',
  supplierId: 's1',
  warehouseId: 'w1',
  status: PurchaseInvoiceStatus.ACTIVE,
  currency: 'USD',
  totalAmount: 100,
  taxPercent: null,
  taxAmount: 0,
  paymentCondition: PaymentCondition.CASH,
  notes: null,
  createdById: 'u1',
  cancelledById: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  items: [],
  ...overrides
});

const url = (path = ''): string => `${environment.apiUrl}/purchase-invoices${path}`;

describe('PurchaseInvoiceService', () => {
  let service: PurchaseInvoiceService;
  let backend: HttpTestingController;

  const load = (...invoices: PurchaseInvoice[]): void => {
    service.loadPurchaseInvoices();
    backend.expectOne((r) => r.url === url()).flush({ data: invoices });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['reportErrors']) }
      ]
    });
    service = TestBed.inject(PurchaseInvoiceService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('has the notification service show the errors of its requests', () => {
    expect(TestBed.inject(NotificationService).reportErrors).toHaveBeenCalledOnceWith(service.error);
  });

  describe('loadPurchaseInvoices', () => {
    it('asks for at most 200 purchase invoices and keeps what comes back', () => {
      service.loadPurchaseInvoices();

      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('limit')).toBe('200');
      expect(service.loading()).toBeTrue();
      request.flush({ data: [purchaseInvoice({ id: 'a' }), purchaseInvoice({ id: 'b' })] });

      expect(service.purchaseInvoices().map((p) => p.id)).toEqual(['a', 'b']);
      expect(service.loading()).toBeFalse();
    });

    it('records an error and shows no purchases when the load fails', () => {
      service.loadPurchaseInvoices();

      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
      expect(service.purchaseInvoices()).toEqual([]);
      expect(service.loading()).toBeFalse();
    });
  });

  describe('stats', () => {
    it('counts active and cancelled purchases apart', () => {
      load(
        purchaseInvoice({ id: '1' }),
        purchaseInvoice({ id: '2' }),
        purchaseInvoice({ id: '3', status: PurchaseInvoiceStatus.CANCELLED })
      );

      expect(service.stats()).toEqual(jasmine.objectContaining({ total: 3, active: 2, cancelled: 1 }));
    });

    it('sums the active total per currency', () => {
      load(
        purchaseInvoice({ id: '1', currency: 'USD', totalAmount: 100 }),
        purchaseInvoice({ id: '2', currency: 'USD', totalAmount: 50 }),
        purchaseInvoice({ id: '3', currency: 'HNL', totalAmount: 500, status: PurchaseInvoiceStatus.CANCELLED })
      );

      expect(service.stats().totalByCurrency).toEqual({ USD: 150 });
    });
  });

  describe('create', () => {
    const dto: CreatePurchaseInvoiceDto = {
      warehouseId: 'w1',
      supplierId: 's1',
      invoiceNumber: 'FAC-002',
      items: [{ kind: ItemType.BULK, inventoryItemId: 'i1', quantity: 1, unitPrice: 10 }]
    };

    it('puts the new purchase first and returns it', () => {
      load(purchaseInvoice({ id: 'old' }));
      let result: PurchaseInvoice | null = null;

      service.create(dto).subscribe((created) => (result = created));
      expect(service.loading()).toBeTrue();
      backend.expectOne((r) => r.method === 'POST').flush(purchaseInvoice({ id: 'new' }));

      expect((result as PurchaseInvoice | null)?.id).toBe('new');
      expect(service.purchaseInvoices().map((p) => p.id)).toEqual(['new', 'old']);
      expect(service.loading()).toBeFalse();
    });

    it('resolves with null, records the message and keeps the list when the API refuses', () => {
      load(purchaseInvoice({ id: 'old' }));
      let result: PurchaseInvoice | null | undefined;

      service.create(dto).subscribe((created) => (result = created));
      backend.expectOne((r) => r.method === 'POST').flush({ message: 'Duplicate invoice' }, { status: 409, statusText: 'Conflict' });

      expect(result).toBeNull();
      expect(service.error()).toBe('Duplicate invoice');
      expect(service.purchaseInvoices().map((p) => p.id)).toEqual(['old']);
      expect(service.loading()).toBeFalse();
    });
  });

  describe('cancel', () => {
    it('replaces only the cancelled purchase and sends the reason', () => {
      load(purchaseInvoice({ id: 'a' }), purchaseInvoice({ id: 'b' }));

      service.cancel('a', { reason: 'Registered twice' }).subscribe();
      const request = backend.expectOne(url('/a/cancel'));
      expect(request.request.body).toEqual({ reason: 'Registered twice' });
      request.flush(purchaseInvoice({ id: 'a', status: PurchaseInvoiceStatus.CANCELLED }));

      expect(service.purchaseInvoices().map((p) => [p.id, p.status])).toEqual([
        ['a', PurchaseInvoiceStatus.CANCELLED],
        ['b', PurchaseInvoiceStatus.ACTIVE]
      ]);
    });

    it('leaves the purchase as it was and resolves with null when the API refuses', () => {
      load(purchaseInvoice({ id: 'a' }));
      let result: PurchaseInvoice | null | undefined;

      service.cancel('a').subscribe((answer) => (result = answer));
      backend.expectOne(url('/a/cancel')).flush(null, { status: 400, statusText: 'Bad Request' });

      expect(result).toBeNull();
      expect(service.purchaseInvoices()[0].status).toBe(PurchaseInvoiceStatus.ACTIVE);
      expect(service.error()).toBeTruthy();
    });
  });
});
