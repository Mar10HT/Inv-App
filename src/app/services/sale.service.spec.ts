import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { SaleService } from './sale.service';
import { NotificationService } from './notification.service';
import { CustomerType, Sale, SaleStatus } from '../interfaces/sale.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const sale = (overrides: Partial<Sale> = {}): Sale => ({
  id: 's1',
  name: null,
  warehouseId: 'w1',
  customerName: null,
  customerType: CustomerType.RETAIL,
  currency: 'USD',
  totalAmount: 10,
  status: SaleStatus.ACTIVE,
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

const url = (path = ''): string => `${environment.apiUrl}/sales${path}`;

describe('SaleService', () => {
  let service: SaleService;
  let backend: HttpTestingController;

  const load = (...sales: Sale[]): void => {
    service.loadSales();
    backend.expectOne((r) => r.url === url()).flush({ data: sales });
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

  afterEach(() => backend.verify());

  describe('loadSales', () => {
    it('asks for at most 200 sales and keeps what comes back', () => {
      service.loadSales();

      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('limit')).toBe('200');
      expect(service.loading()).toBeTrue();
      request.flush({ data: [sale({ id: 'a' }), sale({ id: 'b' })] });

      expect(service.sales().map((s) => s.id)).toEqual(['a', 'b']);
      expect(service.loading()).toBeFalse();
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
    it('counts active and cancelled sales apart', () => {
      load(
        sale({ id: '1' }),
        sale({ id: '2' }),
        sale({ id: '3', status: SaleStatus.CANCELLED })
      );

      expect(service.stats()).toEqual(jasmine.objectContaining({ total: 3, active: 2, cancelled: 1 }));
    });

    it('counts active sales per customer type', () => {
      load(
        sale({ id: '1', customerType: CustomerType.RETAIL }),
        sale({ id: '2', customerType: CustomerType.RETAIL }),
        sale({ id: '3', customerType: CustomerType.WHOLESALE }),
        sale({ id: '4', customerType: CustomerType.DISTRIBUTOR, status: SaleStatus.CANCELLED })
      );

      expect(service.stats().byCustomerType).toEqual({ RETAIL: 2, WHOLESALE: 1 });
    });

    it('adds up the revenue of active sales per currency and ignores cancelled ones', () => {
      load(
        sale({ id: '1', currency: 'USD', totalAmount: 100 }),
        sale({ id: '2', currency: 'USD', totalAmount: 50.5 }),
        sale({ id: '3', currency: 'HNL', totalAmount: 2500 }),
        sale({ id: '4', currency: 'USD', totalAmount: 999, status: SaleStatus.CANCELLED })
      );

      expect(service.stats().revenueByCurrency).toEqual({ USD: 150.5, HNL: 2500 });
    });

    it('does not let floating point drift show up in the revenue', () => {
      load(sale({ id: '1', totalAmount: 0.1 }), sale({ id: '2', totalAmount: 0.2 }));

      // 0.1 + 0.2 is 0.30000000000000004 in floating point
      expect(service.stats().revenueByCurrency['USD']).toBe(0.3);
    });

    it('is empty when there are no sales', () => {
      load();

      expect(service.stats()).toEqual({ total: 0, active: 0, cancelled: 0, byCustomerType: {}, revenueByCurrency: {} });
    });

    it('lists only the active sales as active', () => {
      load(sale({ id: '1' }), sale({ id: '2', status: SaleStatus.CANCELLED }));

      expect(service.active().map((s) => s.id)).toEqual(['1']);
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
});
