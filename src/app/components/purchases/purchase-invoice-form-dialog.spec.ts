import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of } from 'rxjs';

import { PurchaseInvoiceFormDialog } from './purchase-invoice-form-dialog';
import { PurchaseInvoiceService } from '../../services/purchase-invoice.service';
import { WarehouseService } from '../../services/warehouse.service';
import { SupplierService } from '../../services/supplier.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { ItemType, InventoryItemInterface } from '../../interfaces/inventory-item.interface';
import {
  PaymentCondition,
  PurchaseInvoice,
} from '../../interfaces/purchase-invoice.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { item, warehouse, supplier } from '../../../testing/report-fixtures';

describe('PurchaseInvoiceFormDialog', () => {
  let fixture: ComponentFixture<PurchaseInvoiceFormDialog>;
  let component: PurchaseInvoiceFormDialog;
  let stock: ReturnType<typeof signal<InventoryItemInterface[]>>;
  let purchases: jasmine.SpyObj<PurchaseInvoiceService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let closed: jasmine.Spy;
  let created: jasmine.Spy;

  beforeEach(async () => {
    stock = signal([
      item({ id: 'cable', warehouseId: 'w1', quantity: 10, itemType: ItemType.BULK }),
      item({ id: 'screen', warehouseId: 'w1', quantity: 0, itemType: ItemType.BULK }),
      item({ id: 'laptop-1', warehouseId: 'w1', quantity: 1, itemType: ItemType.UNIQUE }),
      item({ id: 'elsewhere', warehouseId: 'w2', quantity: 3, itemType: ItemType.BULK }),
    ]);
    purchases = jasmine.createSpyObj<PurchaseInvoiceService>('PurchaseInvoiceService', ['create']);
    purchases.create.and.returnValue(of({ id: 'purchase-1' } as PurchaseInvoice));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [PurchaseInvoiceFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: PurchaseInvoiceService, useValue: purchases },
        { provide: WarehouseService, useValue: { warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')]) } },
        { provide: SupplierService, useValue: { suppliers: signal([supplier('s1', 'Acme')]) } },
        { provide: InventoryService, useValue: { items: stock } },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseInvoiceFormDialog);
    component = fixture.componentInstance;
    closed = jasmine.createSpy('closed');
    created = jasmine.createSpy('created');
    component.closed.subscribe(closed);
    component.created.subscribe(created);
    fixture.detectChanges();
  });

  /** A form that can be submitted: supplier, invoice number, warehouse and one BULK line. */
  const readyToSubmit = (): void => {
    component.supplierId.set('s1');
    component.invoiceNumber.set('FAC-001');
    component.onWarehouseChange('w1');
    component.addItem();
    component.updateItemField(0, 'inventoryItemId', 'cable');
    component.updateItemField(0, 'unitPrice', 10);
  };

  describe('the items a BULK line can target', () => {
    it('are none until a warehouse is chosen', () => {
      expect(component.availableBulkItems()).toEqual([]);
    });

    it('are the BULK items of the chosen warehouse, with no stock ceiling', () => {
      component.onWarehouseChange('w1');

      // 'screen' has 0 stock but is still offered (purchases ADD stock);
      // 'laptop-1' is UNIQUE and is never offered as a BULK target.
      expect(component.availableBulkItems().map((i) => i.id)).toEqual(['cable', 'screen']);
    });

    it('changing the warehouse clears the lines, which belonged to the other one', () => {
      readyToSubmit();

      component.onWarehouseChange('w2');

      expect(component.items()).toEqual([]);
      expect(component.warehouseId()).toBe('w2');
    });
  });

  describe('the lines', () => {
    beforeEach(() => component.onWarehouseChange('w1'));

    it('addItem adds a blank BULK line', () => {
      component.addItem();

      expect(component.items()[0].kind).toBe(ItemType.BULK);
      expect(component.items()[0].inventoryItemId).toBe('');
    });

    it('updateItemKind switches a line without touching the others', () => {
      component.addItem();
      component.addItem();

      component.updateItemKind(1, ItemType.UNIQUE);

      expect(component.items().map((i) => i.kind)).toEqual([ItemType.BULK, ItemType.UNIQUE]);
    });

    it('updateItemField changes only the named field of the named line', () => {
      component.addItem();
      component.addItem();

      component.updateItemField(1, 'unitPrice', 50);

      expect(component.items().map((i) => i.unitPrice)).toEqual([0, 50]);
    });

    it('removeItem drops only the named line', () => {
      component.addItem();
      component.addItem();
      component.updateItemField(1, 'unitPrice', 99);

      component.removeItem(0);

      expect(component.items().map((i) => i.unitPrice)).toEqual([99]);
    });

    it('does not change the list it was given: each update makes a new one', () => {
      component.addItem();
      const before = component.items();

      component.updateItemField(0, 'unitPrice', 5);

      expect(before[0].unitPrice).toBe(0);
    });
  });

  describe('canSubmit', () => {
    it('is false on an empty form', () => {
      expect(component.canSubmit()).toBeFalse();
    });

    it('is true with a supplier, invoice number, warehouse and a valid BULK line', () => {
      readyToSubmit();

      expect(component.canSubmit()).toBeTrue();
    });

    it('needs a supplier, an invoice number, a warehouse and at least one line', () => {
      readyToSubmit();

      component.supplierId.set('');
      expect(component.canSubmit()).toBeFalse();
      component.supplierId.set('s1');

      component.invoiceNumber.set('  ');
      expect(component.canSubmit()).toBeFalse();
      component.invoiceNumber.set('FAC-001');

      component.items.set([]);
      expect(component.canSubmit()).toBeFalse();
    });

    it('a BULK line needs an item and a positive quantity', () => {
      readyToSubmit();

      component.updateItemField(0, 'inventoryItemId', '');
      expect(component.canSubmit()).withContext('no item').toBeFalse();
      component.updateItemField(0, 'inventoryItemId', 'cable');

      component.updateItemField(0, 'quantity', 0);
      expect(component.canSubmit()).withContext('zero quantity').toBeFalse();
    });

    it('a UNIQUE line needs a name, a category and a service tag', () => {
      readyToSubmit();
      component.updateItemKind(0, ItemType.UNIQUE);
      expect(component.canSubmit()).withContext('nothing filled yet').toBeFalse();

      component.updateItemField(0, 'name', 'Laptop');
      component.updateItemField(0, 'category', 'Electronics');
      component.updateItemField(0, 'serviceTag', 'SN-001');
      expect(component.canSubmit()).toBeTrue();
    });

    it('rejects a duplicate inventoryItemId across BULK lines', () => {
      readyToSubmit();
      component.addItem();
      component.updateItemField(1, 'inventoryItemId', 'cable');
      component.updateItemField(1, 'unitPrice', 5);

      expect(component.canSubmit()).toBeFalse();
    });

    it('rejects a duplicate serviceTag across UNIQUE lines', () => {
      readyToSubmit();
      component.updateItemKind(0, ItemType.UNIQUE);
      component.updateItemField(0, 'name', 'A');
      component.updateItemField(0, 'category', 'C');
      component.updateItemField(0, 'serviceTag', 'SN-1');
      component.addItem();
      component.updateItemKind(1, ItemType.UNIQUE);
      component.updateItemField(1, 'name', 'B');
      component.updateItemField(1, 'category', 'C');
      component.updateItemField(1, 'serviceTag', 'SN-1');

      expect(component.canSubmit()).toBeFalse();
    });

    it('rejects a negative unit price', () => {
      readyToSubmit();

      component.updateItemField(0, 'unitPrice', -1);

      expect(component.canSubmit()).toBeFalse();
    });
  });

  describe('submit', () => {
    it('sends nothing while the form cannot be submitted', () => {
      component.submit();

      expect(purchases.create).not.toHaveBeenCalled();
    });

    it('sends a BULK line, trimming text and leaving out what is blank', () => {
      readyToSubmit();
      component.invoiceNumber.set('  FAC-001  ');
      component.notes.set('   ');

      component.submit();

      expect(purchases.create).toHaveBeenCalledOnceWith({
        warehouseId: 'w1',
        supplierId: 's1',
        invoiceNumber: 'FAC-001',
        currency: 'USD',
        taxPercent: undefined,
        paymentCondition: PaymentCondition.CASH,
        notes: undefined,
        items: [
          {
            kind: ItemType.BULK,
            inventoryItemId: 'cable',
            quantity: 1,
            unitPrice: 10,
            taxPercent: undefined,
            notes: undefined,
          },
        ],
      });
    });

    it('sends a UNIQUE line with its own fields, not the BULK ones', () => {
      readyToSubmit();
      component.updateItemKind(0, ItemType.UNIQUE);
      component.updateItemField(0, 'name', '  Laptop  ');
      component.updateItemField(0, 'category', '  Electronics  ');
      component.updateItemField(0, 'serviceTag', '  SN-001  ');
      component.updateItemField(0, 'unitPrice', 900);

      component.submit();

      expect(purchases.create).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({
          items: [
            {
              kind: ItemType.UNIQUE,
              name: 'Laptop',
              category: 'Electronics',
              model: undefined,
              serviceTag: 'SN-001',
              serialNumber: undefined,
              unitPrice: 900,
              taxPercent: undefined,
              notes: undefined,
            },
          ],
        }),
      );
    });

    it('tells the user and reports the purchase once it was created', () => {
      readyToSubmit();

      component.submit();

      expect(notifications.success).toHaveBeenCalledOnceWith('PURCHASES.CREATE_SUCCESS');
      expect(created).toHaveBeenCalledOnceWith({ success: true });
      expect(component.submitting()).toBeFalse();
    });

    it('does not emit created or show its own error on a failed request: PurchaseInvoiceService already reported it', () => {
      purchases.create.and.returnValue(of(null));
      readyToSubmit();

      component.submit();

      expect(notifications.error).not.toHaveBeenCalled();
      expect(notifications.success).not.toHaveBeenCalled();
      expect(created).not.toHaveBeenCalled();
      expect(component.submitting()).toBeFalse();
    });

    it('ignores a second submit while the first one is still running', () => {
      purchases.create.and.returnValue(new Subject<PurchaseInvoice | null>());
      readyToSubmit();

      component.submit();
      component.submit();

      expect(purchases.create).toHaveBeenCalledTimes(1);
      expect(component.submitting()).toBeTrue();
    });
  });

  describe('closing', () => {
    it('close asks its parent to close', () => {
      component.close();

      expect(closed).toHaveBeenCalledTimes(1);
    });

    it('the escape key closes it too', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(closed).toHaveBeenCalledTimes(1);
    });
  });
});
