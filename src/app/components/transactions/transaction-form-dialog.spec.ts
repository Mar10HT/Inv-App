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
import { TransactionType } from '../../interfaces/transaction.interface';
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

  const setType = (type: TransactionType): void => {
    component.form.get('type')?.setValue(type);
    fixture.detectChanges();
  };

  const saveButton = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector('button[type="submit"]') as HTMLButtonElement;

  describe('warehouse rules by type', () => {
    beforeEach(() => {
      component.form.patchValue({ userId: 'u1' });
      component.itemsArray.at(0).patchValue({ inventoryItemId: 'i1' });
    });

    it('requires a destination for IN', () => {
      expect(component.form.valid).toBeFalse();

      component.form.patchValue({ destinationWarehouseId: 'w1' });

      expect(component.form.valid).toBeTrue();
    });

    it('requires a source for OUT', () => {
      setType(TransactionType.OUT);
      expect(component.form.valid).toBeFalse();

      component.form.patchValue({ sourceWarehouseId: 'w1' });

      expect(component.form.valid).toBeTrue();
    });

    it('requires both a source and a destination for TRANSFER', () => {
      setType(TransactionType.TRANSFER);
      component.form.patchValue({ sourceWarehouseId: 'w1' });
      expect(component.form.valid).toBeFalse();

      component.form.patchValue({ destinationWarehouseId: 'w2' });

      expect(component.form.valid).toBeTrue();
    });

    it('keeps Save disabled until the required warehouse is chosen', () => {
      fixture.detectChanges();
      expect(saveButton().disabled).toBeTrue();

      component.form.patchValue({ destinationWarehouseId: 'w1' });
      fixture.detectChanges();

      expect(saveButton().disabled).toBeFalse();
    });

    it('clears the warehouse that the new type does not use', () => {
      setType(TransactionType.TRANSFER);
      component.form.patchValue({ sourceWarehouseId: 'w1', destinationWarehouseId: 'w2' });

      setType(TransactionType.IN);
      expect(component.form.value.sourceWarehouseId).toBe('');
      expect(component.form.value.destinationWarehouseId).toBe('w2');

      setType(TransactionType.OUT);
      expect(component.form.value.destinationWarehouseId).toBe('');
    });

    it('does not send the warehouse left over from a previous type', () => {
      setType(TransactionType.TRANSFER);
      component.form.patchValue({ sourceWarehouseId: 'w1', destinationWarehouseId: 'w2' });
      setType(TransactionType.IN);

      component.onSubmit();

      const sent = create.calls.mostRecent().args[0];
      expect(sent.type).toBe(TransactionType.IN);
      expect(sent.destinationWarehouseId).toBe('w2');
      expect('sourceWarehouseId' in sent).toBeFalse();
    });
  });

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
