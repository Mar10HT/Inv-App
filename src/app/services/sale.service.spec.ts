import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { SaleService } from './sale.service';
import { NotificationService } from './notification.service';
import { CustomerType, Sale, SaleStatus } from '../interfaces/sale.interface';
import { PaymentCondition } from '../interfaces/purchase-invoice.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const sale = (overrides: Partial<Sale> = {}): Sale => ({
  id: 's1',
  quoteNumber: null,
  warehouseId: 'w1',
  customerName: null,
  customerType: CustomerType.RETAIL,
  clientId: null,
  paymentCondition: PaymentCondition.CASH,
  currency: 'USD',
  totalAmount: 10,
  taxPercent: null,
  taxAmount: 0,
  status: SaleStatus.ACTIVE,
  notes: null,
  createdById: 'u1',
  cancelledById: null,
  cancelledAt: null,
  cancellationReason: null,
  number: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  items: [],
  ...overrides
});

const url = (path = ''): string => `${environment.apiUrl}/sales${path}`;

describe('SaleService', () => {
  let service: SaleService;
  let backend: HttpTestingController;

  const page = (data: Sale[]) => ({ data, meta: { total: data.length, page: 1, limit: 100, totalPages: 1 } });
  const emptyStats = { total: 0, active: 0, draft: 0, cancelled: 0, byCustomerType: {}, revenueByCurrency: {} };

  const load = (...sales: Sale[]): void => {
    service.loadSales();
    backend.expectOne((r) => r.url === url()).flush(page(sales));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['reportErrors']) }
      ]
    });
    service = TestBed.inject(SaleService);
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

  describe('loadSales', () => {
    it('walks every page the API hands out and keeps all of it', () => {
      service.loadSales();

      const first = backend.expectOne((r) => r.url === url() && r.params.get('page') === '1');
      expect(first.request.params.get('limit')).toBe('100');
      expect(first.request.params.has('onlyWithBalance')).toBeFalse();
      expect(service.loading()).toBeTrue();
      first.flush({ data: [sale({ id: 'a' })], meta: { total: 2, page: 1, limit: 100, totalPages: 2 } });
      backend
        .expectOne((r) => r.url === url() && r.params.get('page') === '2')
        .flush({ data: [sale({ id: 'b' })], meta: { total: 2, page: 2, limit: 100, totalPages: 2 } });

      expect(service.sales().map((s) => s.id)).toEqual(['a', 'b']);
      expect(service.loading()).toBeFalse();
    });

    it('asks only for sales with a balance for accounts receivable, and keeps asking that on refresh', () => {
      service.loadSales(true);
      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('onlyWithBalance')).toBe('true');
      request.flush(page([]));

      service.refresh();
      expect(backend.expectOne((r) => r.url === url()).request.params.get('onlyWithBalance')).toBe('true');
    });

    it('records an error and shows no sales when the load fails', () => {
      service.loadSales();

      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
      expect(service.sales()).toEqual([]);
      expect(service.loading()).toBeFalse();
    });
  });

  describe('stats', () => {
    it('comes from the API, counted over every sale and not just the loaded ones', () => {
      const counted = { total: 250, active: 200, draft: 30, cancelled: 20, byCustomerType: { RETAIL: 200 }, revenueByCurrency: { USD: 1150 } };
      load(sale({ id: '1' }));

      backend.expectOne(url('/stats')).flush(counted);

      expect(service.stats()).toEqual(counted);
    });

    it('starts empty and stays so when the API fails', () => {
      load();
      backend.expectOne(url('/stats')).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.stats()).toEqual(emptyStats);
    });

    it('is asked again after a change', () => {
      service.cancel('s1').subscribe();
      backend.expectOne(url('/s1/cancel')).flush(sale({ status: SaleStatus.CANCELLED }));

      expect(backend.match(url('/stats')).length).toBe(1);
    });
  });

  describe('create', () => {
    const dto = {
      warehouseId: 'w1',
      customerType: CustomerType.RETAIL,
      items: [{ inventoryItemId: 'i1', quantity: 1, unitPrice: 10 }]
    };

    it('puts the new sale first and returns it', () => {
      load(sale({ id: 'old' }));
      let result: Sale | null = null;

      service.create(dto).subscribe((created) => (result = created));
      expect(service.loading()).toBeTrue();
      backend.expectOne((r) => r.method === 'POST').flush(sale({ id: 'new' }));

      expect((result as Sale | null)?.id).toBe('new');
      expect(service.sales().map((s) => s.id)).toEqual(['new', 'old']);
    });

    it('resolves with null and keeps the list when the API refuses', () => {
      load(sale({ id: 'old' }));
      let result: Sale | null | undefined;

      service.create(dto).subscribe((created) => (result = created));
      backend.expectOne((r) => r.method === 'POST').flush({ message: 'Not enough stock' }, { status: 400, statusText: 'Bad Request' });

      expect(result).toBeNull();
      expect(service.error()).toBeTruthy();
      expect(service.sales().map((s) => s.id)).toEqual(['old']);
    });
  });

  describe('cancel', () => {
    it('replaces only the cancelled sale and sends the reason', () => {
      load(sale({ id: 'a' }), sale({ id: 'b' }));

      service.cancel('a', { reason: 'Wrong customer' } as never).subscribe();
      const request = backend.expectOne(url('/a/cancel'));
      expect(request.request.body).toEqual({ reason: 'Wrong customer' });
      request.flush(sale({ id: 'a', status: SaleStatus.CANCELLED }));

      expect(service.sales().map((s) => [s.id, s.status])).toEqual([
        ['a', SaleStatus.CANCELLED],
        ['b', SaleStatus.ACTIVE]
      ]);
    });

    it('leaves the sale as it was when the API refuses', () => {
      load(sale({ id: 'a' }));

      service.cancel('a').subscribe();
      backend.expectOne(url('/a/cancel')).flush(null, { status: 409, statusText: 'Conflict' });

      expect(service.sales()[0].status).toBe(SaleStatus.ACTIVE);
      expect(service.error()).toBeTruthy();
    });
  });

  describe('update', () => {
    it('PATCHes the sale and replaces it in the list', () => {
      load(sale({ id: 'a', status: SaleStatus.DRAFT }));

      service.update('a', { notes: 'Changed' }).subscribe();
      const request = backend.expectOne(url('/a'));
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ notes: 'Changed' });
      request.flush(sale({ id: 'a', status: SaleStatus.DRAFT, notes: 'Changed' }));

      expect(service.sales()[0].notes).toBe('Changed');
    });

    it('leaves the sale as it was when the API refuses', () => {
      load(sale({ id: 'a', status: SaleStatus.DRAFT, notes: null }));

      service.update('a', { notes: 'Changed' }).subscribe();
      backend.expectOne(url('/a')).flush(null, { status: 400, statusText: 'Bad Request' });

      expect(service.sales()[0].notes).toBeNull();
      expect(service.error()).toBeTruthy();
    });
  });

  describe('confirm', () => {
    it('PATCHes the confirm endpoint and replaces the sale with the numbered, active one', () => {
      load(sale({ id: 'a', status: SaleStatus.DRAFT }));

      service.confirm('a').subscribe();
      const request = backend.expectOne(url('/a/confirm'));
      expect(request.request.method).toBe('PATCH');
      request.flush(sale({ id: 'a', status: SaleStatus.ACTIVE, number: 'V-0001' }));

      expect(service.sales()[0]).toEqual(jasmine.objectContaining({ status: SaleStatus.ACTIVE, number: 'V-0001' }));
    });

    it('leaves the sale as it was when the API refuses', () => {
      load(sale({ id: 'a', status: SaleStatus.DRAFT }));

      service.confirm('a').subscribe();
      backend.expectOne(url('/a/confirm')).flush(null, { status: 400, statusText: 'Bad Request' });

      expect(service.sales()[0].status).toBe(SaleStatus.DRAFT);
      expect(service.error()).toBeTruthy();
    });
  });
});
