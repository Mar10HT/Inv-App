import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { TransferFormDialog } from './transfer-form-dialog';
import { TransferRequestService } from '../../services/transfer-request.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { TransferRequest } from '../../interfaces/transfer-request.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { item, warehouse } from '../../../testing/report-fixtures';

describe('TransferFormDialog', () => {
  let fixture: ComponentFixture<TransferFormDialog>;
  let component: TransferFormDialog;
  let transfers: jasmine.SpyObj<TransferRequestService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let closed: jasmine.Spy;
  let created: jasmine.Spy;

  beforeEach(async () => {
    transfers = jasmine.createSpyObj<TransferRequestService>('TransferRequestService', ['createRequest']);
    transfers.createRequest.and.returnValue(of({ id: 't1' } as TransferRequest));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [TransferFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: TransferRequestService, useValue: transfers },
        { provide: WarehouseService, useValue: { warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup'), warehouse('w3', 'North')]) } },
        {
          provide: InventoryService,
          useValue: {
            items: signal([
              item({ id: 'laptop', warehouseId: 'w1', quantity: 5 }),
              item({ id: 'sold-out', warehouseId: 'w1', quantity: 0 }),
              item({ id: 'cable', warehouseId: 'w2', quantity: 3 })
            ])
          }
        },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransferFormDialog);
    component = fixture.componentInstance;
    closed = jasmine.createSpy('closed');
    created = jasmine.createSpy('created');
    component.closed.subscribe(closed);
    component.created.subscribe(created);
    fixture.detectChanges();
  });

  /** A form that can be submitted: Main to Backup with a laptop. */
  const readyToSubmit = (): void => {
    component.onSourceWarehouseChange('w1');
    component.selectedDestWarehouseId.set('w2');
    component.addItem();
    component.updateItemId(0, 'laptop');
  };

  describe('what can be transferred', () => {
    it('offers every warehouse but the source as destination', () => {
      expect(component.destinationWarehouses().map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);

      component.onSourceWarehouseChange('w1');

      expect(component.destinationWarehouses().map((w) => w.id)).toEqual(['w2', 'w3']);
    });

    it('offers every item until a source is chosen, then only the items of that warehouse that have stock', () => {
      expect(component.availableItems().map((i) => i.id)).toEqual(['laptop', 'sold-out', 'cable']);

      component.onSourceWarehouseChange('w1');

      expect(component.availableItems().map((i) => i.id)).toEqual(['laptop']);
    });

    it('changing the source clears the lines and the destination', () => {
      readyToSubmit();

      component.onSourceWarehouseChange('w3');

      expect(component.requestItems()).toEqual([]);
      expect(component.selectedDestWarehouseId()).toBe('');
    });
  });

  describe('the lines', () => {
    it('addItem adds a blank line of one unit', () => {
      component.addItem();

      expect(component.requestItems()).toEqual([{ inventoryItemId: '', quantity: 1 }]);
    });

    it('each update changes only the line it names, and a quantity of zero or nothing becomes 1', () => {
      component.addItem();
      component.addItem();

      component.updateItemId(1, 'cable');
      component.updateItemQuantity(1, 3);
      expect(component.requestItems()).toEqual([
        { inventoryItemId: '', quantity: 1 },
        { inventoryItemId: 'cable', quantity: 3 }
      ]);

      component.updateItemQuantity(1, 0);
      expect(component.requestItems()[1].quantity).toBe(1);
      component.updateItemQuantity(1, NaN);
      expect(component.requestItems()[1].quantity).toBe(1);
    });

    it('removeItem takes out one line without changing the list it was given', () => {
      component.addItem();
      component.addItem();
      const before = component.requestItems();

      component.removeItem(0);

      expect(before).toHaveSize(2);
      expect(component.requestItems()).toHaveSize(1);
    });

    it('isItemAlreadySelected ignores the line asking', () => {
      component.addItem();
      component.addItem();
      component.updateItemId(0, 'laptop');

      expect(component.isItemAlreadySelected('laptop', 1)).toBeTrue();
      expect(component.isItemAlreadySelected('laptop', 0)).toBeFalse();
    });
  });

  describe('canCreateRequest', () => {
    it('is false on an empty form and true when it is ready', () => {
      expect(component.canCreateRequest()).toBeFalse();

      readyToSubmit();

      expect(component.canCreateRequest()).toBeTrue();
    });

    it('needs a source, a destination different from it, and every line with an item and a quantity', () => {
      readyToSubmit();

      component.selectedDestWarehouseId.set('');
      expect(component.canCreateRequest()).withContext('no destination').toBeFalse();

      component.selectedDestWarehouseId.set('w1');
      expect(component.canCreateRequest()).withContext('destination is the source').toBeFalse();
      component.selectedDestWarehouseId.set('w2');

      component.addItem();
      expect(component.canCreateRequest()).withContext('a line without an item').toBeFalse();
      component.removeItem(1);

      component.requestItems.update((list) => [{ ...list[0], quantity: 0 }]);
      expect(component.canCreateRequest()).withContext('a quantity of zero').toBeFalse();
      component.updateItemQuantity(0, 2);

      component.selectedSourceWarehouseId.set('');
      expect(component.canCreateRequest()).withContext('no source').toBeFalse();
    });
  });

  describe('createRequest', () => {
    it('sends nothing while the form cannot be submitted', () => {
      component.createRequest();

      expect(transfers.createRequest).not.toHaveBeenCalled();
    });

    it('sends the request, trimming the name and leaving out blank notes', () => {
      readyToSubmit();
      component.selectedName.set('  Screens  ');
      component.selectedNotes.set('');
      component.updateItemQuantity(0, 2);

      component.createRequest();

      expect(transfers.createRequest).toHaveBeenCalledOnceWith({
        name: 'Screens',
        sourceWarehouseId: 'w1',
        destinationWarehouseId: 'w2',
        items: [{ inventoryItemId: 'laptop', quantity: 2 }],
        notes: undefined
      });
    });

    it('sends the notes when there are some, and no name when it is blank', () => {
      readyToSubmit();
      component.selectedName.set('   ');
      component.selectedNotes.set('Urgent');

      component.createRequest();

      expect(transfers.createRequest.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ name: undefined, notes: 'Urgent' }));
    });

    it('tells the user and reports the request once it was created', () => {
      readyToSubmit();

      component.createRequest();

      expect(notifications.success).toHaveBeenCalledOnceWith('TRANSFERS.REQUEST_CREATED');
      expect(created).toHaveBeenCalledOnceWith({ success: true });
    });

    it('reports nothing when the service answers with nothing: it already showed the reason', () => {
      transfers.createRequest.and.returnValue(of(null));
      readyToSubmit();

      component.createRequest();

      expect(created).not.toHaveBeenCalled();
      expect(notifications.error).not.toHaveBeenCalled();
    });

    it('tells the user when the request fails', () => {
      transfers.createRequest.and.returnValue(throwError(() => new Error('boom')));
      readyToSubmit();

      component.createRequest();

      expect(notifications.error).toHaveBeenCalledOnceWith('TRANSFERS.REQUEST_ERROR');
      expect(created).not.toHaveBeenCalled();
    });
  });

  it('close asks its parent to close', () => {
    component.close();

    expect(closed).toHaveBeenCalledTimes(1);
  });
});
