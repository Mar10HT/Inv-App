import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { DashboardService } from './dashboard.service';
import { InventoryItemInterface, StatsResponse } from '../interfaces/inventory-item.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const api = (path: string): string => `${environment.apiUrl}${path}`;
const items = (count: number): InventoryItemInterface[] =>
  Array.from({ length: count }, (_, i) => ({ id: `i${i}` }) as InventoryItemInterface);

describe('DashboardService', () => {
  let service: DashboardService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(DashboardService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('getStats returns the inventory stats as the API sends them', () => {
    const stats = { totalItems: 3 } as unknown as StatsResponse;
    let result: unknown;

    service.getStats().subscribe((s) => (result = s));
    backend.expectOne(api('/inventory/stats')).flush(stats);

    expect(result).toBe(stats);
  });

  describe('getLowStockItems', () => {
    it('keeps the first ten by default', () => {
      let result: InventoryItemInterface[] = [];

      service.getLowStockItems().subscribe((list) => (result = list));
      backend.expectOne(api('/inventory/low-stock')).flush(items(15));

      expect(result.map((i) => i.id)).toEqual(items(10).map((i) => i.id));
    });

    it('keeps as many as it is asked for', () => {
      let result: InventoryItemInterface[] = [];

      service.getLowStockItems(3).subscribe((list) => (result = list));
      backend.expectOne(api('/inventory/low-stock')).flush(items(15));

      expect(result.length).toBe(3);
    });

    it('answers with an empty list when the API sends nothing', () => {
      let result: InventoryItemInterface[] | undefined;

      service.getLowStockItems().subscribe((list) => (result = list));
      backend.expectOne(api('/inventory/low-stock')).flush(null);

      expect(result).toEqual([]);
    });
  });

  const counts: [string, () => ReturnType<DashboardService['getWarehousesCount']>, string][] = [
    ['warehouses', () => service.getWarehousesCount(), '/warehouses'],
    ['categories', () => service.getCategoriesCount(), '/categories'],
    ['users', () => service.getUsersCount(), '/users']
  ];

  counts.forEach(([name, call, path]) => {
    describe(`the ${name} count`, () => {
      it('is the total the API reports', () => {
        let result = -1;

        call().subscribe((count) => (result = count));
        backend.expectOne(api(path)).flush({ data: [{}, {}], meta: { total: 42 } });

        expect(result).toBe(42);
      });

      it('falls back to the length of the page when there is no total', () => {
        let result = -1;

        call().subscribe((count) => (result = count));
        backend.expectOne(api(path)).flush({ data: [{}, {}, {}] });

        expect(result).toBe(3);
      });

      it('is zero when the API sends neither', () => {
        let result = -1;

        call().subscribe((count) => (result = count));
        backend.expectOne(api(path)).flush({});

        expect(result).toBe(0);
      });
    });
  });
});
