import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';

import { OutflowFormDialog } from './outflow-form-dialog';
import { OutflowService } from '../../services/outflow.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { Outflow, OutflowReason } from '../../interfaces/outflow.interface';
import { InventoryItemInterface } from '../../interfaces/inventory-item.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { item, warehouse } from '../../../testing/report-fixtures';

describe('OutflowFormDialog', () => {
  let fixture: ComponentFixture<OutflowFormDialog>;
  let component: OutflowFormDialog;
  let stock: ReturnType<typeof signal<InventoryItemInterface[]>>;
  let outflows: jasmine.SpyObj<OutflowService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let closed: jasmine.Spy;
  let created: jasmine.Spy;

  beforeEach(async () => {
    stock = signal([
      item({ id: 'screen', warehouseId: 'w1', quantity: 5 }),
      item({ id: 'cable', warehouseId: 'w1', quantity: 10 }),
      item({ id: 'sold-out', warehouseId: 'w1', quantity: 0 }),
      item({ id: 'elsewhere', warehouseId: 'w2', quantity: 3 })
    ]);
    outflows = jasmine.createSpyObj<OutflowService>('OutflowService', ['create']);
    outflows.create.and.returnValue(of({ id: 'outflow-1' } as Outflow));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [OutflowFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: OutflowService, useValue: outflows },
        { provide: WarehouseService, useValue: { warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')]) } },
        { provide: InventoryService, useValue: { items: stock } },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OutflowFormDialog);
    component = fixture.componentInstance;
    closed = jasmine.createSpy('closed');
    created = jasmine.createSpy('created');
    component.closed.subscribe(closed);
    component.created.subscribe(created);
    fixture.detectChanges();
  });

  /** A form that can be submitted: a warehouse, a reason and one screen. */
  const readyToSubmit = (): void => {
    component.onWarehouseChange('w1');
    component.reason.set(OutflowReason.DAMAGED);
    component.addItem();
    component.updateItemId(0, 'screen');
  };

  describe('the items that can be taken out', () => {
    it('are none until a warehouse is chosen', () => {
      expect(component.availableItems()).toEqual([]);
    });

    it('are the items of the chosen warehouse that have stock', () => {
      component.onWarehouseChange('w1');

      expect(component.availableItems().map((i) => i.id)).toEqual(['screen', 'cable']);
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

    it('addItem adds a blank line', () => {
      component.addItem();

      expect(component.items()).toEqual([{ inventoryItemId: '', quantity: 1, notes: '' }]);
    });

    it('updateItemId chooses the item of a line without touching the others', () => {
      component.addItem();
      component.addItem();

      component.updateItemId(1, 'cable');

      expect(component.items().map((i) => i.inventoryItemId)).toEqual(['', 'cable']);
    });

    it('updateItemQuantity keeps the quantity, and falls back to 1 for zero or nothing', () => {
      component.addItem();

      component.updateItemQuantity(0, 4);
      expect(component.items()[0].quantity).toBe(4);

      component.updateItemQuantity(0, 0);
      expect(component.items()[0].quantity).toBe(1);

      component.updateItemQuantity(0, NaN);
      expect(component.items()[0].quantity).toBe(1);
    });

    it('updateItemNotes and removeItem change only the line they name', () => {
      component.addItem();
      component.addItem();

      component.updateItemNotes(1, 'cracked');
      expect(component.items().map((i) => i.notes)).toEqual(['', 'cracked']);

      component.removeItem(0);
      expect(component.items().map((i) => i.notes)).toEqual(['cracked']);
    });

    it('does not change the list it was given: each update makes a new one', () => {
      component.addItem();
      const before = component.items();

      component.updateItemQuantity(0, 3);

      expect(before[0].quantity).toBe(1);
    });
  });

  describe('stock and duplicates', () => {
    beforeEach(() => component.onWarehouseChange('w1'));

    it('getAvailable gives the stock of an item, and no limit for a blank or unknown one', () => {
      expect(component.getAvailable('screen')).toBe(5);
      expect(component.getAvailable('')).toBe(Number.MAX_SAFE_INTEGER);
      expect(component.getAvailable('gone')).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('isAlreadySelected ignores the line asking', () => {
      component.addItem();
      component.addItem();
      component.updateItemId(0, 'screen');

      expect(component.isAlreadySelected('screen', 1)).toBeTrue();
      expect(component.isAlreadySelected('screen', 0)).toBeFalse();
      expect(component.isAlreadySelected('cable', 1)).toBeFalse();
    });
  });

  describe('canSubmit', () => {
    it('is false on an empty form', () => {
      expect(component.canSubmit()).toBeFalse();
    });

    it('is true with a warehouse, a reason and a valid line', () => {
      readyToSubmit();

      expect(component.canSubmit()).toBeTrue();
    });

    it('needs a warehouse, a reason and at least one line', () => {
      readyToSubmit();

      component.reason.set('');
      expect(component.canSubmit()).toBeFalse();
      component.reason.set(OutflowReason.LOST);

      component.items.set([]);
      expect(component.canSubmit()).toBeFalse();

      readyToSubmit();
      component.warehouseId.set('');
      expect(component.canSubmit()).toBeFalse();
    });

    it('needs every line to have an item and a quantity within the stock', () => {
      readyToSubmit();

      component.updateItemQuantity(0, 5);
      expect(component.canSubmit()).toBeTrue();

      component.updateItemQuantity(0, 6);
      expect(component.canSubmit()).withContext('more than the stock').toBeFalse();
      component.updateItemQuantity(0, 1);

      component.updateItemId(0, '');
      expect(component.canSubmit()).withContext('no item').toBeFalse();
      component.updateItemId(0, 'screen');

      component.items.update((list) => [{ ...list[0], quantity: NaN }]);
      expect(component.canSubmit()).withContext('quantity is not a number').toBeFalse();
    });

    it('checks every line, not only the first', () => {
      readyToSubmit();
      component.addItem();
      component.updateItemId(1, 'cable');
      component.updateItemQuantity(1, 11);

      expect(component.canSubmit()).toBeFalse();
    });
  });

  describe('submit', () => {
    it('sends nothing while the form cannot be submitted', () => {
      component.submit();

      expect(outflows.create).not.toHaveBeenCalled();
    });

    it('sends the outflow, trimming the text and leaving out what is blank', () => {
      readyToSubmit();
      component.name.set('  Broken screens  ');
      component.notes.set('   ');
      component.updateItemQuantity(0, 2);
      component.updateItemNotes(0, '  cracked  ');

      component.submit();

      expect(outflows.create).toHaveBeenCalledOnceWith({
        name: 'Broken screens',
        warehouseId: 'w1',
        reason: OutflowReason.DAMAGED,
        notes: undefined,
        items: [{ inventoryItemId: 'screen', quantity: 2, notes: 'cracked' }]
      });
    });

    it('tells the user and reports the outflow once it was created', () => {
      readyToSubmit();

      component.submit();

      expect(notifications.success).toHaveBeenCalledOnceWith('OUTFLOWS.CREATE_SUCCESS');
      expect(created).toHaveBeenCalledOnceWith({ success: true });
      expect(component.submitting()).toBeFalse();
    });

    it('reports nothing, and adds no second message, when the service answers with nothing', () => {
      // The service turns a failed request into null and shows the reason itself (reportErrors)
      outflows.create.and.returnValue(of(null));
      readyToSubmit();

      component.submit();

      expect(notifications.error).not.toHaveBeenCalled();
      expect(notifications.success).not.toHaveBeenCalled();
      expect(created).not.toHaveBeenCalled();
      expect(component.submitting()).toBeFalse();
    });

    it('says it failed when the request fails, and lets the user try again', () => {
      outflows.create.and.returnValue(throwError(() => new Error('boom')));
      readyToSubmit();

      component.submit();

      expect(notifications.error).toHaveBeenCalledOnceWith('OUTFLOWS.CREATE_ERROR');
      expect(created).not.toHaveBeenCalled();
      expect(component.submitting()).toBeFalse();
    });

    it('ignores a second submit while the first one is still running', () => {
      outflows.create.and.returnValue(new Subject<Outflow | null>());
      readyToSubmit();

      component.submit();
      component.submit();

      expect(outflows.create).toHaveBeenCalledTimes(1);
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
