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

  const page = (data: PurchaseInvoice[]) => ({ data, meta: { total: data.length, page: 1, limit: 100, totalPages: 1 } });
  const emptyStats = { total: 0, active: 0, cancelled: 0, totalByCurrency: {} };

  const load = (...invoices: PurchaseInvoice[]): void => {
    service.loadPurchaseInvoices();
    backend.expectOne((r) => r.url === url()).flush(page(invoices));
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

  afterEach(() => {
    // Every load and every change also refreshes the counters
    backend.match(url('/stats')).forEach((r) => r.flush(emptyStats));
    backend.verify();
  });

  it('has the notification service show the errors of its requests', () => {
    expect(TestBed.inject(NotificationService).reportErrors).toHaveBeenCalledOnceWith(service.error);
  });

  describe('loadPurchaseInvoices', () => {
    it('asks for every purchase invoice, a page at a time, and keeps what comes back', () => {
      service.loadPurchaseInvoices();

      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('limit')).toBe('100');
      expect(request.request.params.get('page')).toBe('1');
      expect(service.loading()).toBeTrue();
      request.flush(page([purchaseInvoice({ id: 'a' }), purchaseInvoice({ id: 'b' })]));

      expect(service.purchaseInvoices().map((p) => p.id)).toEqual(['a', 'b']);
      expect(service.loading()).toBeFalse();
    });

    it('asks only for purchases with a balance for accounts payable, and keeps asking that on refresh', () => {
      service.loadPurchaseInvoices(true);
      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('onlyWithBalance')).toBe('true');
      request.flush(page([]));

      service.refresh();
      expect(backend.expectOne((r) => r.url === url()).request.params.get('onlyWithBalance')).toBe('true');
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
    it('comes from the API, counted over every purchase and not just the loaded ones', () => {
      const counted = { total: 300, active: 280, cancelled: 20, totalByCurrency: { USD: 575 } };
      load(purchaseInvoice({ id: '1' }));

      backend.expectOne(url('/stats')).flush(counted);

      expect(service.stats()).toEqual(counted);
    });

    it('is asked again after a change', () => {
      service.cancel('p1').subscribe();
      backend.expectOne(url('/p1/cancel')).flush(purchaseInvoice({ status: PurchaseInvoiceStatus.CANCELLED }));

      expect(backend.match(url('/stats')).length).toBe(1);
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
