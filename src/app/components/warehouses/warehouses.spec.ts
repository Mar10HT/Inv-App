import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { Warehouses } from './warehouses';
import { WarehouseFormDialog } from './warehouse-form-dialog';
import { WarehouseService } from '../../services/warehouse.service';
import { UserService } from '../../services/user.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { Warehouse } from '../../interfaces/warehouse.interface';
import { User, UserRole } from '../../interfaces/user.interface';
import { CrudDialogData } from '../shared/crud-dialog/crud-dialog-config.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { warehouse } from '../../../testing/report-fixtures';

const main = warehouse('w1', 'Main');
const backup = warehouse('w2', 'Backup');
const ana: User = { id: 'u1', email: 'ana@x.com', name: 'Ana', role: UserRole.USER, createdAt: new Date(0), updatedAt: new Date(0) };

describe('Warehouses', () => {
  let component: Warehouses;
  let fixture: ComponentFixture<Warehouses>;
  let warehouses: ReturnType<typeof signal<Warehouse[]>>;
  let service: jasmine.SpyObj<WarehouseService>;
  let users: jasmine.SpyObj<UserService>;
  let dialog: { open: jasmine.Spy };
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  /** Closes every dialog it opens with `result`. */
  const closeWith = (result: unknown): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(result) });
  };

  const openedData = (): CrudDialogData<Warehouse> => dialog.open.calls.mostRecent().args[1].data;

  beforeEach(async () => {
    warehouses = signal([main, backup]);
    service = jasmine.createSpyObj<WarehouseService>(
      'WarehouseService',
      ['getAll', 'create', 'update', 'delete'],
      { warehouses, loading: signal(false), error: signal(null) } as never
    );
    service.getAll.and.returnValue(of([main, backup]));
    service.create.and.returnValue(of(main));
    service.update.and.returnValue(of(main));
    service.delete.and.returnValue(of(undefined));
    users = jasmine.createSpyObj<UserService>('UserService', ['getAll'], { users: signal([ana]) } as never);
    users.getAll.and.returnValue(of([ana]));
    dialog = { open: jasmine.createSpy('open') };
    closeWith(undefined);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['created', 'updated', 'deleted', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [Warehouses],
      providers: [
        ...provideTestBedDefaults(),
        { provide: WarehouseService, useValue: service },
        { provide: UserService, useValue: users },
        { provide: MatDialog, useValue: dialog },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Warehouses);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('loading', () => {
    it('asks for the warehouses and for the users, who can be chosen as managers', () => {
      expect(service.getAll).toHaveBeenCalledTimes(1);
      expect(users.getAll).toHaveBeenCalledTimes(1);
    });

    it('tells the user when either list fails to load', () => {
      const failure = new Error('boom');
      service.getAll.and.returnValue(throwError(() => failure));
      users.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(Warehouses).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledTimes(2);
    });

    it('counts the warehouses it shows', () => {
      expect(component.stats().total).toBe(2);

      warehouses.set([main]);

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

  describe('addWarehouse', () => {
    it('opens the form in add mode', () => {
      component.addWarehouse();

      expect(dialog.open).toHaveBeenCalledOnceWith(
        WarehouseFormDialog,
        jasmine.objectContaining({ width: '500px', data: jasmine.objectContaining({ mode: 'add' }) })
      );
    });

    it('says the warehouse was created, with its name, when the form saved it', () => {
      closeWith({ saved: true, name: 'Main' });

      component.addWarehouse();

      expect(notifications.created).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.WAREHOUSE', 'Main');
    });

    it('says nothing when the form was dismissed', () => {
      component.addWarehouse();
      closeWith({ saved: false });
      component.addWarehouse();

      expect(notifications.created).not.toHaveBeenCalled();
    });

    it('gives the form the service calls that create and update', () => {
      component.addWarehouse();

      openedData().createFn({ name: 'New' });
      openedData().updateFn('w1', { name: 'Renamed' });

      expect(service.create).toHaveBeenCalledOnceWith({ name: 'New' } as never);
      expect(service.update).toHaveBeenCalledOnceWith('w1', { name: 'Renamed' } as never);
    });

    it('sends no manager as null, whether the field came empty or undefined, and keeps a chosen one', () => {
      component.addWarehouse();

      openedData().createFn({ name: 'A', managerId: '' });
      openedData().createFn({ name: 'B', managerId: undefined });
      openedData().updateFn('w1', { name: 'C', managerId: '' });
      openedData().createFn({ name: 'D', managerId: 'u1' });
      openedData().createFn({ name: 'E' });

      expect(service.create.calls.allArgs()).toEqual([
        [{ name: 'A', managerId: null }],
        [{ name: 'B', managerId: null }],
        [{ name: 'D', managerId: 'u1' }],
        [{ name: 'E' }]
      ] as never);
      expect(service.update).toHaveBeenCalledOnceWith('w1', { name: 'C', managerId: null } as never);
    });
  });

  describe('editWarehouse', () => {
    it('opens the form in edit mode with the warehouse', () => {
      component.editWarehouse(main);

      expect(openedData()).toEqual(jasmine.objectContaining({ mode: 'edit', entity: main }));
    });

    it('says the warehouse was updated when the form saved it', () => {
      closeWith({ saved: true, name: 'Main' });

      component.editWarehouse(main);

      expect(notifications.updated).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.WAREHOUSE', 'Main');
    });

    it('says nothing when the form was dismissed', () => {
      component.editWarehouse(main);

      expect(notifications.updated).not.toHaveBeenCalled();
    });
  });

  describe('deleteWarehouse', () => {
    it('asks the user to confirm before deleting', () => {
      component.deleteWarehouse(main);

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'danger' }));
    });

    it('deletes the warehouse and says so once confirmed', () => {
      component.deleteWarehouse(main);

      expect(service.delete).toHaveBeenCalledOnceWith('w1');
      expect(notifications.deleted).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.WAREHOUSE', 'Main');
    });

    it('deletes nothing when the user cancels', () => {
      confirm.ask.and.returnValue(of(false));

      component.deleteWarehouse(main);

      expect(service.delete).not.toHaveBeenCalled();
      expect(notifications.deleted).not.toHaveBeenCalled();
    });

    it('reports a failed delete and does not say it was deleted', () => {
      const failure = new Error('has stock');
      service.delete.and.returnValue(throwError(() => failure));

      component.deleteWarehouse(main);

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.WAREHOUSE');
      expect(notifications.deleted).not.toHaveBeenCalled();
    });
  });

  it('tracks the warehouses by id', () => {
    expect(component.trackByFn(0, main)).toBe('w1');
  });
});
