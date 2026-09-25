import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { StockTakeComponent } from './stock-take';
import { StockTakeService } from '../../services/stock-take.service';
import { WarehouseService } from '../../services/warehouse.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { StockTake, StockTakeItem, StockTakeStatus, VarianceReport } from '../../interfaces/stock-take.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const countItem = (id: string, countedQty: number | null, overrides: Partial<StockTakeItem> = {}): StockTakeItem => ({
  id,
  stockTakeId: 'st1',
  itemId: `inv-${id}`,
  itemName: `Item ${id}`,
  expectedQty: 10,
  countedQty,
  variance: countedQty === null ? null : countedQty - 10,
  ...overrides
});

const take = (id: string, overrides: Partial<StockTake> = {}): StockTake => ({
  id,
  warehouseId: 'w1',
  warehouseName: 'Main',
  status: StockTakeStatus.IN_PROGRESS,
  startedByName: 'Ana',
  items: [],
  totalItems: 0,
  countedItems: 0,
  createdAt: new Date(2026, 0, 1),
  updatedAt: new Date(2026, 0, 1),
  ...overrides
});

describe('StockTakeComponent actions', () => {
  let fixture: ComponentFixture<StockTakeComponent>;
  let component: StockTakeComponent;
  let service: jasmine.SpyObj<StockTakeService>;
  let warehouses: jasmine.SpyObj<WarehouseService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const failure = new Error('boom');
  const ids = (): string[] => component.filteredItems().map((s) => s.id);

  // The detail and variance views are not rendered here: these specs drive the component's methods
  // and read its state, so a partly filled stock take does not have to satisfy the whole template.
  beforeEach(async () => {
    service = jasmine.createSpyObj<StockTakeService>(
      'StockTakeService',
      ['loadStockTakes', 'getById', 'getVarianceReport', 'create', 'updateItem', 'complete', 'cancel'],
      {
        stockTakes: signal([
          take('a', { warehouseName: 'Main', startedByName: 'Ana', createdAt: new Date(2026, 0, 3), notes: 'Quarterly' }),
          take('b', { warehouseName: 'Backup', startedByName: 'Beto', status: StockTakeStatus.COMPLETED, createdAt: new Date(2026, 0, 2) }),
          take('c', { warehouseName: 'Main', startedByName: 'Carla', status: StockTakeStatus.CANCELLED, createdAt: new Date(2026, 0, 1) })
        ]),
        stats: signal({ total: 3, inProgress: 1, completed: 1, cancelled: 1 }),
        loading: signal(false)
      } as never
    );
    service.getById.and.returnValue(of(take('a')));
    service.getVarianceReport.and.returnValue(of({ stockTakeId: 'a' } as unknown as VarianceReport));
    service.create.and.returnValue(of(take('new')));
    service.complete.and.returnValue(of(take('a', { status: StockTakeStatus.COMPLETED })));
    service.cancel.and.returnValue(of(take('a', { status: StockTakeStatus.CANCELLED })));
    warehouses = jasmine.createSpyObj<WarehouseService>('WarehouseService', ['getAll'], { warehouses: signal([]) } as never);
    warehouses.getAll.and.returnValue(of([]));
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [StockTakeComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: StockTakeService, useValue: service },
        { provide: WarehouseService, useValue: warehouses },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StockTakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.tick();
  });

  describe('opening the page', () => {
    it('asks for the warehouses and the stock takes', () => {
      expect(warehouses.getAll).toHaveBeenCalledTimes(1);
      expect(service.loadStockTakes).toHaveBeenCalledTimes(1);
      expect(component.currentView()).toBe('list');
    });

    it('tells the user when the warehouses fail to load', () => {
      warehouses.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(StockTakeComponent).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });
  });

  describe('filters', () => {
    it('filters by status, and shows everything again with "all"', () => {
      component.selectedStatus = StockTakeStatus.COMPLETED;
      component.applyFilters();
      expect(ids()).toEqual(['b']);

      component.selectedStatus = 'all';
      component.applyFilters();
      expect(ids()).toEqual(['a', 'b', 'c']);
    });

    it('searches the warehouse, who started it and the notes, ignoring case', () => {
      component.searchQuery = 'BACKUP';
      component.applyFilters();
      expect(ids()).toEqual(['b']);

      component.searchQuery = 'carla';
      component.applyFilters();
      expect(ids()).toEqual(['c']);

      component.searchQuery = 'quarter';
      component.applyFilters();
      expect(ids()).toEqual(['a']);
    });

    it('combines the search with the status', () => {
      component.searchQuery = 'main';
      component.selectedStatus = StockTakeStatus.CANCELLED;
      component.applyFilters();

      expect(ids()).toEqual(['c']);
    });

    it('knows whether a filter is active, and clearFilters removes them all', () => {
      expect(component.hasFilters()).toBeFalse();

      component.searchQuery = 'ana';
      expect(component.hasFilters()).toBeTrue();
      component.searchQuery = '';
      component.selectedStatus = StockTakeStatus.IN_PROGRESS;
      expect(component.hasFilters()).toBeTrue();

      component.clearFilters();

      expect(component.hasFilters()).toBeFalse();
      expect(ids()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('moving between views', () => {
    it('openDetail loads the stock take and shows it, forgetting any edit in progress', () => {
      component.editingItems = { x: { countedQty: 1, notes: '' } };

      component.openDetail(take('a'));

      expect(service.getById).toHaveBeenCalledOnceWith('a');
      expect(component.selectedStockTake()?.id).toBe('a');
      expect(component.editingItems).toEqual({});
      expect(component.currentView()).toBe('detail');
    });

    it('openDetail tells the user and stays on the list when it cannot be loaded', () => {
      service.getById.and.returnValue(throwError(() => failure));

      component.openDetail(take('a'));

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never);
      expect(component.currentView()).toBe('list');
      expect(component.selectedStockTake()).toBeNull();
    });

    it('backToList goes back, forgets the selection and the edits, and reloads the list', () => {
      component.openDetail(take('a'));
      component.editingItems = { x: { countedQty: 1, notes: '' } };
      service.loadStockTakes.calls.reset();

      component.backToList();

      expect(component.currentView()).toBe('list');
      expect(component.selectedStockTake()).toBeNull();
      expect(component.editingItems).toEqual({});
      expect(service.loadStockTakes).toHaveBeenCalledTimes(1);
    });

    it('openVarianceReport loads the report and shows it', () => {
      component.openVarianceReport(take('a'));

      expect(service.getVarianceReport).toHaveBeenCalledOnceWith('a');
      expect(component.varianceReport()).not.toBeNull();
      expect(component.currentView()).toBe('variance');
    });

    it('openVarianceReport tells the user when the report cannot be loaded', () => {
      service.getVarianceReport.and.returnValue(throwError(() => failure));

      component.openVarianceReport(take('a'));

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never);
      expect(component.currentView()).toBe('list');
    });

    it('backFromVariance returns to the detail when a stock take is open, and to the list otherwise', () => {
      component.openDetail(take('a'));
      component.openVarianceReport(take('a'));

      component.backFromVariance();
      expect(component.currentView()).toBe('detail');
      expect(component.varianceReport()).toBeNull();

      component.selectedStockTake.set(null);
      component.currentView.set('variance');
      component.backFromVariance();
      expect(component.currentView()).toBe('list');
    });
  });

  describe('starting a stock take', () => {
    it('opens and closes the new stock take dialog', () => {
      component.openNewDialog();
      expect(component.showNewDialog).toBeTrue();

      component.closeNewDialog();
      expect(component.showNewDialog).toBeFalse();
    });

    it('creates it, says so, closes the dialog and opens the new stock take', () => {
      component.openNewDialog();

      component.onFormCreated({ warehouseId: 'w1', notes: 'Year end' });

      expect(service.create).toHaveBeenCalledOnceWith({ warehouseId: 'w1', notes: 'Year end' });
      expect(notifications.success).toHaveBeenCalledOnceWith('STOCK_TAKE.CREATE_SUCCESS');
      expect(component.showNewDialog).toBeFalse();
      expect(service.getById).toHaveBeenCalledOnceWith('new');
    });

    it('tells the user when it cannot be created, and keeps the dialog open', () => {
      service.create.and.returnValue(throwError(() => failure));
      component.openNewDialog();

      component.onFormCreated({ warehouseId: 'w1' });

      expect(notifications.error).toHaveBeenCalledOnceWith('STOCK_TAKE.CREATE_ERROR');
      expect(component.showNewDialog).toBeTrue();
      expect(service.getById).not.toHaveBeenCalled();
    });
  });

  describe('counting items', () => {
    const opened = take('a', { items: [countItem('i1', null), countItem('i2', 8, { notes: 'shelf 2' })], totalItems: 2 });

    beforeEach(() => {
      service.getById.and.returnValue(of(opened));
      service.updateItem.and.callFake((_id, dto) => of(countItem('i1', dto.countedQty)));
      component.openDetail(take('a'));
    });

    it('onCountChange starts an edit with the item notes, and then only changes the count', () => {
      component.onCountChange(opened.items[1], 9);
      expect(component.editingItems['i2']).toEqual({ countedQty: 9, notes: 'shelf 2' });

      component.onCountChange(opened.items[1], 7);
      expect(component.editingItems['i2']).toEqual({ countedQty: 7, notes: 'shelf 2' });
    });

    it('onNotesChange starts an edit with the item count, and then only changes the notes', () => {
      component.onNotesChange(opened.items[1], 'shelf 3');
      expect(component.editingItems['i2']).toEqual({ countedQty: 8, notes: 'shelf 3' });

      component.onNotesChange(opened.items[1], 'shelf 4');
      expect(component.editingItems['i2']).toEqual({ countedQty: 8, notes: 'shelf 4' });
    });

    it('saveItemCount sends nothing without an edit, without a count or without an open stock take', () => {
      component.saveItemCount(opened.items[0]);

      component.editingItems['i1'] = { countedQty: null, notes: '' };
      component.saveItemCount(opened.items[0]);

      component.selectedStockTake.set(null);
      component.editingItems['i1'] = { countedQty: 5, notes: '' };
      component.saveItemCount(opened.items[0]);

      expect(service.updateItem).not.toHaveBeenCalled();
    });

    it('saveItemCount saves the count, refreshes the item and the counted total, and says so', () => {
      component.onCountChange(opened.items[0], 6);

      component.saveItemCount(opened.items[0]);

      expect(service.updateItem).toHaveBeenCalledOnceWith('a', { itemId: 'inv-i1', countedQty: 6, notes: undefined });
      expect(component.selectedStockTake()?.items.find((i) => i.id === 'i1')?.countedQty).toBe(6);
      expect(component.selectedStockTake()?.countedItems).toBe(2);
      expect(component.editingItems['i1']).toBeUndefined();
      expect(component.savingItem()).toBeNull();
      expect(notifications.success).toHaveBeenCalledOnceWith('STOCK_TAKE.DETAIL.COUNT_SAVED');
    });

    it('saveItemCount accepts a count of zero: nothing on the shelf is a count', () => {
      component.onCountChange(opened.items[0], 0);

      component.saveItemCount(opened.items[0]);

      expect(service.updateItem).toHaveBeenCalledOnceWith('a', { itemId: 'inv-i1', countedQty: 0, notes: undefined });
    });

    it('saveItemCount sends the notes that were typed', () => {
      component.onCountChange(opened.items[1], 8);
      component.onNotesChange(opened.items[1], 'recounted');

      component.saveItemCount(opened.items[1]);

      expect(service.updateItem.calls.mostRecent().args[1]).toEqual({ itemId: 'inv-i2', countedQty: 8, notes: 'recounted' });
    });

    it('saveItemCount keeps the edit and tells the user when saving fails', () => {
      service.updateItem.and.returnValue(throwError(() => failure));
      component.onCountChange(opened.items[0], 6);

      component.saveItemCount(opened.items[0]);

      expect(notifications.error).toHaveBeenCalledOnceWith('STOCK_TAKE.DETAIL.COUNT_ERROR');
      expect(component.editingItems['i1']).toEqual({ countedQty: 6, notes: '' });
      expect(component.savingItem()).toBeNull();
    });
  });

  describe('completing', () => {
    beforeEach(() => component.openDetail(take('a')));

    it('opens and closes the complete dialog', () => {
      component.completeStockTake();
      expect(component.showCompleteDialog).toBeTrue();

      component.closeCompleteDialog();
      expect(component.showCompleteDialog).toBeFalse();
    });

    it('completes with or without applying the counts to the inventory, and closes the dialog', () => {
      component.completeStockTake();

      component.onCompleteConfirmed(true);
      expect(service.complete).toHaveBeenCalledWith('a', true);
      expect(component.selectedStockTake()?.status).toBe(StockTakeStatus.COMPLETED);
      expect(component.showCompleteDialog).toBeFalse();
      expect(notifications.success).toHaveBeenCalledWith('STOCK_TAKE.COMPLETE.SUCCESS');

      component.onCompleteConfirmed(false);
      expect(service.complete).toHaveBeenCalledWith('a', false);
    });

    it('does nothing when no stock take is open', () => {
      component.selectedStockTake.set(null);

      component.onCompleteConfirmed(true);

      expect(service.complete).not.toHaveBeenCalled();
    });

    it('tells the user when completing fails, and leaves the dialog as it was', () => {
      service.complete.and.returnValue(throwError(() => failure));
      component.completeStockTake();

      component.onCompleteConfirmed(true);

      expect(notifications.error).toHaveBeenCalledOnceWith('STOCK_TAKE.COMPLETE.ERROR');
      expect(component.showCompleteDialog).toBeTrue();
      expect(component.selectedStockTake()?.status).toBe(StockTakeStatus.IN_PROGRESS);
    });
  });

  describe('cancelling', () => {
    it('does nothing when no stock take is open', () => {
      component.cancelStockTake();

      expect(confirm.ask).not.toHaveBeenCalled();
    });

    describe('with one open', () => {
      beforeEach(() => component.openDetail(take('a')));

      it('asks the user to confirm with a way back, and cancels nothing when they decline', () => {
        confirm.ask.and.returnValue(of(false));

        component.cancelStockTake();

        expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'warning', cancelText: 'COMMON.BACK' }));
        expect(service.cancel).not.toHaveBeenCalled();
      });

      it('cancels the stock take once confirmed, shows the new state and says so', () => {
        component.cancelStockTake();

        expect(service.cancel).toHaveBeenCalledOnceWith('a');
        expect(component.selectedStockTake()?.status).toBe(StockTakeStatus.CANCELLED);
        expect(notifications.success).toHaveBeenCalledOnceWith('STOCK_TAKE.CANCEL.SUCCESS');
      });

      it('tells the user when cancelling fails', () => {
        service.cancel.and.returnValue(throwError(() => failure));

        component.cancelStockTake();

        expect(notifications.error).toHaveBeenCalledOnceWith('STOCK_TAKE.CANCEL.ERROR');
        expect(component.selectedStockTake()?.status).toBe(StockTakeStatus.IN_PROGRESS);
      });
    });
  });

  describe('labels and numbers', () => {
    it('getProgress is the share of items counted, rounded, and zero for an empty stock take', () => {
      expect(component.getProgress(take('x', { totalItems: 0, countedItems: 0 }))).toBe(0);
      expect(component.getProgress(take('x', { totalItems: 3, countedItems: 1 }))).toBe(33);
      expect(component.getProgress(take('x', { totalItems: 3, countedItems: 2 }))).toBe(67);
      expect(component.getProgress(take('x', { totalItems: 4, countedItems: 4 }))).toBe(100);
    });

    it('getStatusLabel uses the translation key of the status', () => {
      expect(component.getStatusLabel(StockTakeStatus.COMPLETED)).toBe('STOCK_TAKE.STATUS.COMPLETED');
    });

    it('getStatusClass gives each status its own color and a neutral one to anything else', () => {
      const classes = [
        StockTakeStatus.IN_PROGRESS,
        StockTakeStatus.COMPLETED,
        StockTakeStatus.CANCELLED,
        'SOMETHING_ELSE' as StockTakeStatus
      ].map((status) => component.getStatusClass(status));

      expect(new Set(classes).size).toBe(4);
      expect(classes[3]).toContain('surface-elevated');
    });

    it('getVarianceClass tells a surplus, a shortage and a match apart', () => {
      const classes = [3, -2, 0].map((variance) => component.getVarianceClass(variance));

      expect(new Set(classes).size).toBe(3);
    });
  });
});
