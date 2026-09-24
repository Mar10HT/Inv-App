import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { InventoryItem } from './inventory-item';
import { ConfirmService } from '../../../services/confirm.service';
import { InventoryService } from '../../../services/inventory/inventory.service';
import { NotificationService } from '../../../services/notification.service';
import { InventoryItemInterface } from '../../../interfaces/inventory-item.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('InventoryItem', () => {
  let component: InventoryItem;
  let fixture: ComponentFixture<InventoryItem>;
  let confirm: ConfirmService;
  let inventoryService: InventoryService;
  let notifications: NotificationService;
  let dialogRef: jasmine.SpyObj<MatDialogRef<InventoryItem>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<InventoryItem>>('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [InventoryItem],
      providers: [
        ...provideTestBedDefaults(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { itemId: 'test-item-id' } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryItem);
    component = fixture.componentInstance;
    fixture.detectChanges();

    confirm = TestBed.inject(ConfirmService);
    inventoryService = TestBed.inject(InventoryService);
    notifications = TestBed.inject(NotificationService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('deleteItem', () => {
    const item = { id: 'item-1', name: 'Laptop' } as InventoryItemInterface;

    beforeEach(() => component.item.set(item));

    it('asks for confirmation with translated texts', () => {
      const ask = spyOn(confirm, 'ask').and.returnValue(of(false));

      component.deleteItem();

      expect(ask).toHaveBeenCalledOnceWith({
        title: 'INVENTORY.DELETE_CONFIRM.TITLE',
        message: 'INVENTORY.DELETE_CONFIRM.MESSAGE',
        confirmText: 'COMMON.DELETE',
        type: 'danger'
      });
    });

    it('deletes nothing when the user cancels', () => {
      spyOn(confirm, 'ask').and.returnValue(of(false));
      const remove = spyOn(inventoryService, 'deleteItem');

      component.deleteItem();

      expect(remove).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('deletes the item, tells the user and closes the dialog when confirmed', () => {
      spyOn(confirm, 'ask').and.returnValue(of(true));
      const remove = spyOn(inventoryService, 'deleteItem').and.returnValue(of(undefined));
      const deleted = spyOn(notifications, 'deleted');

      component.deleteItem();

      expect(remove).toHaveBeenCalledOnceWith('item-1');
      expect(deleted).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.ITEM', 'Laptop');
      expect(dialogRef.close).toHaveBeenCalledOnceWith({ deleted: true });
    });

    it('reports the failure and keeps the dialog open when the API refuses', () => {
      const failure = new HttpErrorResponse({ status: 409 });
      spyOn(confirm, 'ask').and.returnValue(of(true));
      spyOn(inventoryService, 'deleteItem').and.returnValue(throwError(() => failure));
      const handleError = spyOn(notifications, 'handleError');

      component.deleteItem();

      expect(handleError).toHaveBeenCalledOnceWith(failure, 'NOTIFICATIONS.ENTITIES.ITEM');
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });
});
