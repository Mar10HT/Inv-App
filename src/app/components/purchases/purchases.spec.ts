import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { PurchasesComponent } from './purchases';
import { PurchaseInvoiceService } from '../../services/purchase-invoice.service';
import { WarehouseService } from '../../services/warehouse.service';
import { SupplierService } from '../../services/supplier.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import {
  PaymentCondition,
  PurchaseInvoice,
  PurchaseInvoiceStats,
  PurchaseInvoiceStatus,
} from '../../interfaces/purchase-invoice.interface';
import { ItemType } from '../../interfaces/inventory-item.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { warehouse, supplier } from '../../../testing/report-fixtures';

const purchaseInvoice = (overrides: Partial<PurchaseInvoice> = {}): PurchaseInvoice =>
  ({
    id: 'purchase-1234567890',
    number: 'COM-0001',
    invoiceNumber: 'FAC-001',
    supplierId: 's1',
    warehouseId: 'w1',
    status: PurchaseInvoiceStatus.ACTIVE,
    paymentCondition: PaymentCondition.CASH,
    items: [{ quantity: 2 }, { quantity: 3 }],
    ...overrides
  }) as unknown as PurchaseInvoice;

const emptyStats: PurchaseInvoiceStats = { total: 0, active: 0, cancelled: 0, totalByCurrency: {} };

describe('PurchasesComponent', () => {
  let fixture: ComponentFixture<PurchasesComponent>;
  let component: PurchasesComponent;
  let purchaseInvoices: ReturnType<typeof signal<PurchaseInvoice[]>>;
  let purchaseInvoiceService: jasmine.SpyObj<PurchaseInvoiceService>;
  let warehouses: jasmine.SpyObj<WarehouseService>;
  let suppliers: jasmine.SpyObj<SupplierService>;
  let inventory: jasmine.SpyObj<InventoryService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    purchaseInvoices = signal([
      purchaseInvoice({ id: 'a' }),
      purchaseInvoice({ id: 'b', warehouseId: 'w2', supplierId: 's2', status: PurchaseInvoiceStatus.CANCELLED })
    ]);
    purchaseInvoiceService = jasmine.createSpyObj<PurchaseInvoiceService>(
      'PurchaseInvoiceService',
      ['loadPurchaseInvoices', 'refresh', 'cancel', 'downloadPdf'],
      { purchaseInvoices, stats: signal(emptyStats), loading: signal(false), error: signal(null) } as never
    );
    purchaseInvoiceService.cancel.and.returnValue(of(purchaseInvoice()));
    warehouses = jasmine.createSpyObj<WarehouseService>('WarehouseService', ['getAll'], {
      warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')])
    } as never);
    warehouses.getAll.and.returnValue(of([]));
    suppliers = jasmine.createSpyObj<SupplierService>('SupplierService', ['getAll'], {
      suppliers: signal([supplier('s1', 'Acme'), supplier('s2', 'Other')])
    } as never);
    suppliers.getAll.and.returnValue(of([]));
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['loadItems']);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [PurchasesComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: PurchaseInvoiceService, useValue: purchaseInvoiceService },
        { provide: WarehouseService, useValue: warehouses },
        { provide: SupplierService, useValue: suppliers },
        { provide: InventoryService, useValue: inventory },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('loading', () => {
    it('asks for the purchases, the warehouses, the suppliers and the items when it opens', () => {
      expect(purchaseInvoiceService.loadPurchaseInvoices).toHaveBeenCalledTimes(1);
      expect(warehouses.getAll).toHaveBeenCalledTimes(1);
      expect(suppliers.getAll).toHaveBeenCalledTimes(1);
      expect(inventory.loadItems).toHaveBeenCalledTimes(1);
    });

    it('tells the user when the warehouses fail to load', () => {
      const failure = new Error('boom');
      warehouses.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(PurchasesComponent).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });
  });

  describe('filtered', () => {
    const ids = (): string[] => component.filtered().map((p) => p.id);

    it('shows every purchase when no filter is set', () => {
      expect(ids()).toEqual(['a', 'b']);
    });

    it('filters by warehouse, by status and by supplier', () => {
      component.filterWarehouseId.set('w2');
      expect(ids()).toEqual(['b']);

      component.filterWarehouseId.set('');
      component.filterStatus.set(PurchaseInvoiceStatus.ACTIVE);
      expect(ids()).toEqual(['a']);

      component.filterStatus.set('');
      component.filterSupplierId.set('s2');
      expect(ids()).toEqual(['b']);
    });

    it('applies every filter at once', () => {
      component.filterWarehouseId.set('w1');
      component.filterSupplierId.set('s2');

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

    it('closes and reloads the purchases once one was created', () => {
      component.showFormDialog.set(true);

      component.onCreated({ success: true });

      expect(component.showFormDialog()).toBeFalse();
      expect(purchaseInvoiceService.refresh).toHaveBeenCalledTimes(1);
    });

    it('stays open and reloads nothing when nothing was created', () => {
      component.showFormDialog.set(true);

      component.onCreated({ success: false });

      expect(component.showFormDialog()).toBeTrue();
      expect(purchaseInvoiceService.refresh).not.toHaveBeenCalled();
    });
  });

  it('downloads the pdf of a purchase by its id', () => {
    component.downloadPdf(purchaseInvoice({ id: 'a' }));

    expect(purchaseInvoiceService.downloadPdf).toHaveBeenCalledOnceWith('a');
  });

  describe('cancel', () => {
    it('asks the user to confirm, naming the internal purchase number', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { PURCHASES: { CONFIRM_CANCEL_MESSAGE: 'Cancel {{number}}?' } });
      translate.use('en');

      component.cancel(purchaseInvoice({ number: 'COM-0007' }));

      expect(confirm.ask.calls.mostRecent().args[0]).toEqual(
        jasmine.objectContaining({ type: 'warning', title: 'PURCHASES.CONFIRM_CANCEL_TITLE', message: 'Cancel COM-0007?' })
      );
    });

    it('cancels the purchase and says so once confirmed', () => {
      component.cancel(purchaseInvoice({ id: 'a' }));

      expect(purchaseInvoiceService.cancel).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('PURCHASES.CANCEL_SUCCESS');
    });

    it('cancels nothing when the user does not confirm', () => {
      confirm.ask.and.returnValue(of(false));

      component.cancel(purchaseInvoice());

      expect(purchaseInvoiceService.cancel).not.toHaveBeenCalled();
      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('does not say it was cancelled, or show its own error, when the service answers with nothing', () => {
      purchaseInvoiceService.cancel.and.returnValue(of(null));

      component.cancel(purchaseInvoice());

      expect(notifications.success).not.toHaveBeenCalled();
      expect(notifications.error).not.toHaveBeenCalled();
    });

    it('refuses to cancel a purchase with a serialized (UNIQUE) line: no confirm dialog, no API call, a translated error instead', () => {
      const withUniqueLine = purchaseInvoice({
        items: [
          { quantity: 1, inventoryItem: { id: 'i1', name: 'Cable', serviceTag: null, quantity: 5, itemType: ItemType.BULK } },
          { quantity: 1, inventoryItem: { id: 'i2', name: 'Laptop', serviceTag: 'SN-1', quantity: 1, itemType: ItemType.UNIQUE } },
        ] as PurchaseInvoice['items']
      });

      component.cancel(withUniqueLine);

      expect(confirm.ask).not.toHaveBeenCalled();
      expect(purchaseInvoiceService.cancel).not.toHaveBeenCalled();
      expect(notifications.error).toHaveBeenCalledOnceWith('PURCHASES.CANNOT_CANCEL_UNIQUE');
    });
  });

  describe('hasUniqueLine', () => {
    it('is false when every line is BULK', () => {
      const purchase = purchaseInvoice({
        items: [{ quantity: 1, inventoryItem: { id: 'i1', name: 'Cable', serviceTag: null, quantity: 5, itemType: ItemType.BULK } }] as PurchaseInvoice['items']
      });

      expect(component.hasUniqueLine(purchase)).toBeFalse();
    });

    it('is true when any line is UNIQUE, even in a mixed invoice', () => {
      const purchase = purchaseInvoice({
        items: [
          { quantity: 1, inventoryItem: { id: 'i1', name: 'Cable', serviceTag: null, quantity: 5, itemType: ItemType.BULK } },
          { quantity: 1, inventoryItem: { id: 'i2', name: 'Laptop', serviceTag: 'SN-1', quantity: 1, itemType: ItemType.UNIQUE } },
        ] as PurchaseInvoice['items']
      });

      expect(component.hasUniqueLine(purchase)).toBeTrue();
    });
  });
});
