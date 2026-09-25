import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { SalesComponent } from './sales';
import { SaleService } from '../../services/sale.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { CustomerType, Sale, SaleStats, SaleStatus } from '../../interfaces/sale.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { warehouse } from '../../../testing/report-fixtures';

const sale = (overrides: Partial<Sale> = {}): Sale =>
  ({
    id: 'sale-1234567890',
    name: 'Order 1',
    warehouseId: 'w1',
    status: SaleStatus.ACTIVE,
    customerType: CustomerType.RETAIL,
    items: [{ quantity: 2 }, { quantity: 3 }],
    ...overrides
  }) as unknown as Sale;

const emptyStats: SaleStats = { total: 0, active: 0, cancelled: 0, byCustomerType: {}, revenueByCurrency: {} };

describe('SalesComponent', () => {
  let fixture: ComponentFixture<SalesComponent>;
  let component: SalesComponent;
  let sales: ReturnType<typeof signal<Sale[]>>;
  let stats: ReturnType<typeof signal<SaleStats>>;
  let saleService: jasmine.SpyObj<SaleService>;
  let warehouses: jasmine.SpyObj<WarehouseService>;
  let inventory: jasmine.SpyObj<InventoryService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    sales = signal([sale({ id: 'a' }), sale({ id: 'b', warehouseId: 'w2', status: SaleStatus.CANCELLED, customerType: CustomerType.WHOLESALE })]);
    stats = signal(emptyStats);
    saleService = jasmine.createSpyObj<SaleService>(
      'SaleService',
      ['loadSales', 'refresh', 'cancel', 'downloadPdf'],
      { sales, stats, loading: signal(false), error: signal(null) } as never
    );
    saleService.cancel.and.returnValue(of(sale()));
    warehouses = jasmine.createSpyObj<WarehouseService>('WarehouseService', ['getAll'], {
      warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')])
    } as never);
    warehouses.getAll.and.returnValue(of([]));
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['loadItems']);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [SalesComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: SaleService, useValue: saleService },
        { provide: WarehouseService, useValue: warehouses },
        { provide: InventoryService, useValue: inventory },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('loading', () => {
    it('asks for the sales, the warehouses and the items when it opens', () => {
      expect(saleService.loadSales).toHaveBeenCalledTimes(1);
      expect(warehouses.getAll).toHaveBeenCalledTimes(1);
      expect(inventory.loadItems).toHaveBeenCalledTimes(1);
    });

    it('tells the user when the warehouses fail to load', () => {
      const failure = new Error('boom');
      warehouses.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(SalesComponent).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });
  });

  describe('filtered', () => {
    const ids = (): string[] => component.filtered().map((s) => s.id);

    it('shows every sale when no filter is set', () => {
      expect(ids()).toEqual(['a', 'b']);
    });

    it('filters by warehouse, by status and by customer type', () => {
      component.filterWarehouseId.set('w2');
      expect(ids()).toEqual(['b']);

      component.filterWarehouseId.set('');
      component.filterStatus.set(SaleStatus.ACTIVE);
      expect(ids()).toEqual(['a']);

      component.filterStatus.set('');
      component.filterCustomerType.set(CustomerType.WHOLESALE);
      expect(ids()).toEqual(['b']);
    });

    it('applies every filter at once', () => {
      component.filterWarehouseId.set('w1');
      component.filterCustomerType.set(CustomerType.WHOLESALE);

      expect(ids()).toEqual([]);
    });
  });

  describe('the form dialog', () => {
    it('opens and closes', () => {
      component.openCreateDialog();
      expect(component.showFormDialog()).toBeTrue();

      component.closeFormDialog();
      expect(component.showFormDialog()).toBeFalse();
    });

    it('closes and reloads the sales once a sale was created', () => {
      component.showFormDialog.set(true);

      component.onCreated({ success: true });

      expect(component.showFormDialog()).toBeFalse();
      expect(saleService.refresh).toHaveBeenCalledTimes(1);
    });

    it('stays open and reloads nothing when the sale was not created', () => {
      component.showFormDialog.set(true);

      component.onCreated({ success: false });

      expect(component.showFormDialog()).toBeTrue();
      expect(saleService.refresh).not.toHaveBeenCalled();
    });
  });

  describe('numbers and labels', () => {
    it('adds up the quantity of the items of a sale', () => {
      expect(component.totalQty(sale())).toBe(5);
      expect(component.totalQty(sale({ items: [] }))).toBe(0);
    });

    it('formats money with the currency and two decimals, and a missing amount as zero', () => {
      expect(component.formatMoney(12.5, 'USD')).toBe('USD 12.50');
      expect(component.formatMoney(undefined as unknown as number, 'HNL')).toBe('HNL 0.00');
    });

    it('shows a dash when there is no revenue', () => {
      expect(component.revenueLabel()).toBe('—');
    });

    it('shows the revenue of each currency separately', () => {
      stats.set({ ...emptyStats, revenueByCurrency: { USD: 100, HNL: 2500.5 } });

      expect(component.revenueLabel()).toBe('USD 100.00 · HNL 2500.50');
    });
  });

  it('downloads the pdf of a sale by its id', () => {
    component.downloadPdf(sale({ id: 'a' }));

    expect(saleService.downloadPdf).toHaveBeenCalledOnceWith('a');
  });

  describe('cancel', () => {
    it('asks the user to confirm, naming the sale, or its short id when it has no name', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { SALES: { CONFIRM_CANCEL_MESSAGE: 'Cancel {{name}}?' } });
      translate.use('en');

      component.cancel(sale({ name: 'Order 1' }));
      expect(confirm.ask.calls.mostRecent().args[0]).toEqual(
        jasmine.objectContaining({ type: 'warning', title: 'SALES.CONFIRM_CANCEL_TITLE', message: 'Cancel Order 1?' })
      );

      component.cancel(sale({ name: undefined, id: 'sale-1234567890' }));
      expect(confirm.ask.calls.mostRecent().args[0].message).toBe('Cancel sale-123?');
    });

    it('cancels the sale and says so once confirmed', () => {
      component.cancel(sale({ id: 'a' }));

      expect(saleService.cancel).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('SALES.CANCEL_SUCCESS');
    });

    it('cancels nothing when the user does not confirm', () => {
      confirm.ask.and.returnValue(of(false));

      component.cancel(sale());

      expect(saleService.cancel).not.toHaveBeenCalled();
      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('does not say it was cancelled when the service answers with nothing', () => {
      saleService.cancel.and.returnValue(of(null));

      component.cancel(sale());

      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('tells the user when the cancellation fails', () => {
      saleService.cancel.and.returnValue(throwError(() => new Error('boom')));

      component.cancel(sale());

      expect(notifications.error).toHaveBeenCalledOnceWith('SALES.CANCEL_ERROR');
      expect(notifications.success).not.toHaveBeenCalled();
    });
  });
});
