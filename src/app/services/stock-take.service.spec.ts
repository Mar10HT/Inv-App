import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { StockTakeService } from './stock-take.service';
import { RawStockTake, RawStockTakeItem, StockTake, StockTakeStatus } from '../interfaces/stock-take.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const rawItem = (overrides: Partial<RawStockTakeItem> = {}): RawStockTakeItem => ({
  id: 'si1',
  stockTakeId: 'a',
  itemId: 'inv1',
  item: { name: 'Laptop', warehouse: { name: 'Main' } },
  expectedQty: 5,
  countedQty: null,
  ...overrides
});

const raw = (overrides: Partial<RawStockTake> = {}): RawStockTake => ({
  id: 'a',
  warehouseId: 'w1',
  warehouse: { name: 'Main' },
  status: StockTakeStatus.IN_PROGRESS,
  startedBy: { name: 'Ana', email: 'ana@x.com' },
  items: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  ...overrides
});

const url = (path = ''): string => `${environment.apiUrl}/stock-take${path}`;

describe('StockTakeService', () => {
  let service: StockTakeService;
  let backend: HttpTestingController;

  const load = (...stockTakes: RawStockTake[]): void => {
    service.loadStockTakes();
    backend.expectOne((r) => r.url === url()).flush({ data: stockTakes });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(StockTakeService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('loadStockTakes', () => {
    it('asks for at most 200 and maps what comes back', () => {
      service.loadStockTakes();

      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('limit')).toBe('200');
      expect(request.request.params.has('status')).toBeFalse();
      expect(service.loading()).toBeTrue();
      request.flush({ data: [raw({ id: 'x', completedAt: '2026-02-01T00:00:00Z' })] });

      const [stockTake] = service.stockTakes();
      expect(stockTake.id).toBe('x');
      expect(stockTake.warehouseName).toBe('Main');
      expect(stockTake.startedByName).toBe('Ana');
      expect(stockTake.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
      expect(stockTake.completedAt).toEqual(new Date('2026-02-01T00:00:00Z'));
      expect(service.loading()).toBeFalse();
    });

    it('filters by status when given one', () => {
      service.loadStockTakes(StockTakeStatus.COMPLETED);

      const request = backend.expectOne((r) => r.url === url());

      expect(request.request.params.get('status')).toBe('COMPLETED');
      request.flush({ data: [] });
    });

    it('records the error and stops loading when the load fails', () => {
      service.loadStockTakes();

      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
      expect(service.loading()).toBeFalse();
    });

    it('clears the previous error when it loads again', () => {
      service.loadStockTakes();
      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      service.loadStockTakes();

      expect(service.error()).toBeNull();
      backend.expectOne((r) => r.url === url());
    });
  });

  describe('mapping', () => {
    it('counts the items that already have a counted quantity', () => {
      load(raw({ items: [rawItem({ id: '1', countedQty: 5 }), rawItem({ id: '2', countedQty: 0 }), rawItem({ id: '3', countedQty: null })] }));

      const [stockTake] = service.stockTakes();
      expect(stockTake.countedItems).toBe(2);
      expect(stockTake.totalItems).toBe(3);
    });

    it('takes the total from the API count when it sends one, since the items may not come along', () => {
      load(raw({ items: undefined, _count: { items: 42 } }));

      expect(service.stockTakes()[0].totalItems).toBe(42);
      expect(service.stockTakes()[0].items).toEqual([]);
    });

    it('falls back to the email of who started it, then to an empty name', () => {
      load(raw({ id: '1', startedBy: { email: 'ana@x.com' } }), raw({ id: '2', startedBy: undefined }));

      expect(service.stockTakes().map((s) => s.startedByName)).toEqual(['ana@x.com', '']);
    });

    it('maps the items with the names of the item and its warehouse', () => {
      load(raw({ items: [rawItem({ countedQty: 3, variance: -2 })] }));

      expect(service.stockTakes()[0].items[0]).toEqual(
        jasmine.objectContaining({ itemName: 'Laptop', warehouseName: 'Main', expectedQty: 5, countedQty: 3, variance: -2 })
      );
    });

    it('uses null for a missing count and variance and an empty name for a missing item', () => {
      load(raw({ items: [rawItem({ countedQty: undefined, variance: undefined, item: undefined })] }));

      expect(service.stockTakes()[0].items[0]).toEqual(
        jasmine.objectContaining({ itemName: '', countedQty: null, variance: null, warehouseName: undefined })
      );
    });
  });

  it('counts the stock takes of each status', () => {
    load(
      raw({ id: '1', status: StockTakeStatus.IN_PROGRESS }),
      raw({ id: '2', status: StockTakeStatus.IN_PROGRESS }),
      raw({ id: '3', status: StockTakeStatus.COMPLETED }),
      raw({ id: '4', status: StockTakeStatus.CANCELLED })
    );

    expect(service.stats()).toEqual({ total: 4, inProgress: 2, completed: 1, cancelled: 1 });
  });

  describe('create', () => {
    it('puts the new stock take first', () => {
      load(raw({ id: 'old' }));
      let created: StockTake | undefined;

      service.create({ warehouseId: 'w1', notes: 'Yearly' }).subscribe((s) => (created = s));
      const request = backend.expectOne((r) => r.method === 'POST');
      expect(request.request.body).toEqual({ warehouseId: 'w1', notes: 'Yearly' });
      request.flush(raw({ id: 'new' }));

      expect(created?.id).toBe('new');
      expect(service.stockTakes().map((s) => s.id)).toEqual(['new', 'old']);
      expect(service.loading()).toBeFalse();
    });

    it('stops loading and hands the error to the caller when the API refuses', () => {
      let failure: unknown;

      service.create({ warehouseId: 'w1' }).subscribe({ error: (err) => (failure = err) });
      expect(service.loading()).toBeTrue();
      backend.expectOne((r) => r.method === 'POST').flush({ message: 'Already open' }, { status: 409, statusText: 'Conflict' });

      expect(failure).toBeTruthy();
      expect(service.loading()).toBeFalse();
    });
  });

  describe('complete and cancel', () => {
    it('complete asks the API to apply the counts to the inventory or not', () => {
      load(raw({ id: 'a' }));

      service.complete('a', true).subscribe();
      const applied = backend.expectOne((r) => r.url === url('/a/complete'));
      expect(applied.request.params.get('applyChanges')).toBe('true');
      applied.flush(raw({ id: 'a', status: StockTakeStatus.COMPLETED }));

      service.complete('a', false).subscribe();
      const kept = backend.expectOne((r) => r.url === url('/a/complete'));
      expect(kept.request.params.get('applyChanges')).toBe('false');
      kept.flush(raw({ id: 'a', status: StockTakeStatus.COMPLETED }));
    });

    it('complete and cancel replace only that stock take', () => {
      load(raw({ id: 'a' }), raw({ id: 'b' }));

      service.complete('a', true).subscribe();
      backend.expectOne((r) => r.url === url('/a/complete')).flush(raw({ id: 'a', status: StockTakeStatus.COMPLETED }));
      service.cancel('b').subscribe();
      backend.expectOne(url('/b/cancel')).flush(raw({ id: 'b', status: StockTakeStatus.CANCELLED }));

      expect(service.stockTakes().map((s) => [s.id, s.status])).toEqual([
        ['a', StockTakeStatus.COMPLETED],
        ['b', StockTakeStatus.CANCELLED]
      ]);
    });

    it('hands the error to the caller and leaves the list alone when the API refuses', () => {
      load(raw({ id: 'a' }));
      let failure: unknown;

      service.cancel('a').subscribe({ error: (err) => (failure = err) });
      backend.expectOne(url('/a/cancel')).flush(null, { status: 409, statusText: 'Conflict' });

      expect(failure).toBeTruthy();
      expect(service.stockTakes()[0].status).toBe(StockTakeStatus.IN_PROGRESS);
    });
  });

  describe('single calls that do not touch the list', () => {
    it('getById maps the stock take', () => {
      let result: StockTake | undefined;

      service.getById('a').subscribe((s) => (result = s));
      backend.expectOne(url('/a')).flush(raw({ id: 'a', items: [rawItem()] }));

      expect(result?.items.length).toBe(1);
      expect(service.stockTakes()).toEqual([]);
    });

    it('updateItem sends the count and maps the answer', () => {
      let result: { itemName: string; countedQty: number | null } | undefined;

      service.updateItem('a', { itemId: 'inv1', countedQty: 4 }).subscribe((i) => (result = i));
      const request = backend.expectOne(url('/a/items'));
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ itemId: 'inv1', countedQty: 4 });
      request.flush(rawItem({ countedQty: 4 }));

      expect(result).toEqual(jasmine.objectContaining({ itemName: 'Laptop', countedQty: 4 }));
    });

    it('getVarianceReport returns the report as the API sends it', () => {
      const report = { stockTake: { id: 'a' }, summary: { totalItems: 1 }, items: [] };
      let result: unknown;

      service.getVarianceReport('a').subscribe((r) => (result = r));
      backend.expectOne(url('/a/variance-report')).flush(report);

      expect(result).toEqual(report);
    });
  });
});
