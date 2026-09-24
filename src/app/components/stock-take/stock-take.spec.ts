import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';

import { StockTakeComponent } from './stock-take';
import { StockTakeService } from '../../services/stock-take.service';
import { WarehouseService } from '../../services/warehouse.service';
import { StockTake, StockTakeStatus } from '../../interfaces/stock-take.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

// Oldest first, like an unsorted API response: Count 0 is the oldest, Count 24 the newest.
const stockTakes = (count: number): StockTake[] =>
  Array.from({ length: count }, (_, n) => ({
    id: `st-${n}`,
    warehouseId: 'w1',
    warehouseName: `Count ${n}`,
    status: StockTakeStatus.IN_PROGRESS,
    startedByName: 'Ana',
    items: [],
    totalItems: 0,
    countedItems: 0,
    createdAt: new Date(2026, 0, 1 + n),
    updatedAt: new Date(2026, 0, 1 + n)
  }));

describe('StockTakeComponent list', () => {
  let fixture: ComponentFixture<StockTakeComponent>;
  let component: StockTakeComponent;
  let el: HTMLElement;
  let serviceItems: WritableSignal<StockTake[]>;

  const shownNames = (): (string | undefined)[] =>
    Array.from(el.querySelectorAll('tbody tr')).map((row) => row.querySelector('p.font-medium')?.textContent?.trim());

  const flush = (): void => {
    TestBed.tick();
    fixture.detectChanges();
  };

  const setup = async (data: StockTake[]): Promise<void> => {
    serviceItems = signal(data);
    await TestBed.configureTestingModule({
      imports: [StockTakeComponent],
      providers: [
        ...provideTestBedDefaults(),
        {
          provide: StockTakeService,
          useValue: {
            stockTakes: serviceItems,
            stats: signal({ total: 0, inProgress: 0, completed: 0, cancelled: 0 }),
            loading: signal(false),
            loadStockTakes: jasmine.createSpy('loadStockTakes')
          }
        },
        { provide: WarehouseService, useValue: { warehouses: signal([]), getAll: () => of([]) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StockTakeComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    flush();
  };

  describe('pagination', () => {
    beforeEach(() => setup(stockTakes(25)));

    it('shows the newest ten stock takes on the first page', () => {
      expect(shownNames()).toEqual(
        ['Count 24', 'Count 23', 'Count 22', 'Count 21', 'Count 20', 'Count 19', 'Count 18', 'Count 17', 'Count 16', 'Count 15']
      );
    });

    it('moves to the next page when the paginator changes', () => {
      component.onPageChange({ pageIndex: 1, pageSize: 10 });
      fixture.detectChanges();

      expect(shownNames()[0]).toBe('Count 14');
      expect(shownNames()).toHaveSize(10);
    });

    it('shows a partial last page', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 10 });
      fixture.detectChanges();

      expect(shownNames()).toHaveSize(5);
    });

    it('honours a new page size', () => {
      component.onPageChange({ pageIndex: 0, pageSize: 25 });
      fixture.detectChanges();

      expect(shownNames()).toHaveSize(25);
      expect(el.querySelector('mat-paginator')).toBeNull();
    });
  });

  describe('data loading', () => {
    it('shows stock takes that arrive after the initial render, however late', async () => {
      await setup([]);
      expect(component.paginatedItems()).toEqual([]);

      // Well past the 100 ms the component used to wait before filtering once.
      await new Promise((resolve) => setTimeout(resolve, 150));
      serviceItems.set(stockTakes(3));
      flush();

      expect(shownNames()).toEqual(['Count 2', 'Count 1', 'Count 0']);
    });
  });

  describe('sorting', () => {
    it('does not reorder the array owned by the service', async () => {
      await setup(stockTakes(3));

      expect(serviceItems().map((st) => st.id)).toEqual(['st-0', 'st-1', 'st-2']);
      expect(shownNames()).toEqual(['Count 2', 'Count 1', 'Count 0']);
    });
  });
});
