import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { TransactionFormDialog } from './transaction-form-dialog';
import { TransactionService } from '../../services/transaction.service';
import { WarehouseService } from '../../services/warehouse.service';
import { UserService } from '../../services/user.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { item, warehouse } from '../../../testing/report-fixtures';

describe('TransactionFormDialog', () => {
  let fixture: ComponentFixture<TransactionFormDialog>;
  let component: TransactionFormDialog;
  let close: jasmine.Spy;
  let create: jasmine.Spy;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    create = jasmine.createSpy('create').and.returnValue(of({}));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [TransactionFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'add' } },
        { provide: TransactionService, useValue: { create } },
        {
          provide: WarehouseService,
          useValue: { warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')]), getAll: () => of([]) }
        },
        {
          provide: UserService,
          useValue: { users: signal([{ id: 'u1', name: 'Ana', email: 'ana@x.com' }]), getAll: () => of([]) }
        },
        {
          provide: InventoryService,
          useValue: { items: signal([item({ id: 'i1', name: 'Cable' })]), loadItems: jasmine.createSpy('loadItems') }
        },
        { provide: NotificationService, useValue: notifications },
        { provide: LoggerService, useValue: { error: jasmine.createSpy('error') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Fills every control an IN transaction needs. */
  const fillValidIn = (): void => {
    component.form.patchValue({ userId: 'u1', destinationWarehouseId: 'w1' });
    component.itemsArray.at(0).patchValue({ inventoryItemId: 'i1' });
  };

  describe('submit', () => {
    it('closes the dialog as saved and leaves the success toast to the list', () => {
      fillValidIn();

      component.onSubmit();

      expect(create).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledOnceWith({ saved: true });
      // transactions.ts already shows the "created" notification after the dialog closes.
      expect(notifications.success).not.toHaveBeenCalled();
    });
  });
});
