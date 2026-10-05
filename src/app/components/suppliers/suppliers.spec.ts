import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { Suppliers } from './suppliers';
import { SupplierFormDialog } from './supplier-form-dialog';
import { SupplierService } from '../../services/supplier.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { Supplier } from '../../interfaces/supplier.interface';
import { CrudDialogData } from '../shared/crud-dialog/crud-dialog-config.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { supplier } from '../../../testing/report-fixtures';

const acme = supplier('s1', 'Acme');
const globex = supplier('s2', 'Globex');

describe('Suppliers', () => {
  let component: Suppliers;
  let fixture: ComponentFixture<Suppliers>;
  let suppliers: ReturnType<typeof signal<Supplier[]>>;
  let service: jasmine.SpyObj<SupplierService>;
  let dialog: { open: jasmine.Spy };
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  /** Closes every dialog it opens with `result`. */
  const closeWith = (result: unknown): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(result) });
  };

  const openedData = (): CrudDialogData<Supplier> => dialog.open.calls.mostRecent().args[1].data;

  beforeEach(async () => {
    suppliers = signal([acme, globex]);
    service = jasmine.createSpyObj<SupplierService>(
      'SupplierService',
      ['getAll', 'create', 'update', 'delete'],
      { suppliers, loading: signal(false), error: signal(null) } as never
    );
    service.getAll.and.returnValue(of([acme, globex]));
    service.create.and.returnValue(of(acme));
    service.update.and.returnValue(of(acme));
    service.delete.and.returnValue(of(undefined));
    dialog = { open: jasmine.createSpy('open') };
    closeWith(undefined);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['created', 'updated', 'deleted', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [Suppliers],
      providers: [
        ...provideTestBedDefaults(),
        { provide: SupplierService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Suppliers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('loading', () => {
    it('asks the service for the list when it opens', () => {
      expect(service.getAll).toHaveBeenCalledTimes(1);
    });

    it('tells the user when the list fails to load', () => {
      const failure = new Error('boom');
      service.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(Suppliers).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });

    it('counts the suppliers it shows', () => {
      expect(component.stats().total).toBe(2);

      suppliers.set([acme]);

      expect(component.stats().total).toBe(1);
    });

    it('follows the loading and error state of the service', () => {
      const state = service as unknown as { loading: WritableSignal<boolean>; error: WritableSignal<string | null> };
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBeNull();

      state.loading.set(true);
      state.error.set('boom');

      expect(component.loading()).toBeTrue();
      expect(component.error()).toBe('boom');
    });
  });

  describe('addSupplier', () => {
    it('opens the form in add mode', () => {
      component.addSupplier();

      expect(dialog.open).toHaveBeenCalledOnceWith(
        SupplierFormDialog,
        jasmine.objectContaining({ width: '500px', data: jasmine.objectContaining({ mode: 'add' }) })
      );
    });

    it('says the supplier was created, with its name, when the form saved it', () => {
      closeWith({ saved: true, name: 'Acme' });

      component.addSupplier();

      expect(notifications.created).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.SUPPLIER', 'Acme');
    });

    it('says nothing when the form was dismissed', () => {
      component.addSupplier();
      closeWith({ saved: false });
      component.addSupplier();

      expect(notifications.created).not.toHaveBeenCalled();
    });

    it('gives the form the service calls that create and update', () => {
      component.addSupplier();

      openedData().createFn({ name: 'New' });
      openedData().updateFn('s1', { name: 'Renamed' });

      expect(service.create).toHaveBeenCalledOnceWith({ name: 'New' } as never);
      expect(service.update).toHaveBeenCalledOnceWith('s1', { name: 'Renamed' } as never);
    });
  });

  describe('editSupplier', () => {
    it('opens the form in edit mode with the supplier', () => {
      component.editSupplier(acme);

      expect(openedData()).toEqual(jasmine.objectContaining({ mode: 'edit', entity: acme }));
    });

    it('says the supplier was updated when the form saved it', () => {
      closeWith({ saved: true, name: 'Acme' });

      component.editSupplier(acme);

      expect(notifications.updated).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.SUPPLIER', 'Acme');
    });

    it('says nothing when the form was dismissed', () => {
      component.editSupplier(acme);

      expect(notifications.updated).not.toHaveBeenCalled();
    });
  });

  describe('deleteSupplier', () => {
    it('asks the user to confirm before deleting', () => {
      component.deleteSupplier(acme);

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'danger' }));
    });

    it('deletes the supplier and says so once confirmed', () => {
      component.deleteSupplier(acme);

      expect(service.delete).toHaveBeenCalledOnceWith('s1');
      expect(notifications.deleted).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.SUPPLIER', 'Acme');
    });

    it('deletes nothing when the user cancels', () => {
      confirm.ask.and.returnValue(of(false));

      component.deleteSupplier(acme);

      expect(service.delete).not.toHaveBeenCalled();
      expect(notifications.deleted).not.toHaveBeenCalled();
    });

    it('reports a failed delete and does not say it was deleted', () => {
      const failure = new Error('in use');
      service.delete.and.returnValue(throwError(() => failure));

      component.deleteSupplier(acme);

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.SUPPLIER');
      expect(notifications.deleted).not.toHaveBeenCalled();
    });
  });

  it('tracks the suppliers by id', () => {
    expect(component.trackByFn(0, acme)).toBe('s1');
  });
});
