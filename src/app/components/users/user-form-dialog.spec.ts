import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';

import { UserFormDialog, UserFormDialogData } from './user-form-dialog';
import { UserService } from '../../services/user.service';
import { WarehouseService } from '../../services/warehouse.service';
import { RolesService } from '../../services/roles.service';
import { NotificationService } from '../../services/notification.service';
import { User, UserRole } from '../../interfaces/user.interface';
import { RoleSummary } from '../../interfaces/role.interface';
import { Warehouse } from '../../interfaces/warehouse.interface';
import { ApiError } from '../../interfaces/api-error.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { warehouse } from '../../../testing/report-fixtures';

const user: User = {
  id: 'u1',
  email: 'ana@x.com',
  name: 'Ana',
  role: UserRole.USER,
  roleId: 'r1',
  createdAt: new Date(0),
  updatedAt: new Date(0)
};

const customRole: RoleSummary = {
  id: 'r1',
  name: 'AUDITOR',
  displayName: 'Auditor',
  isSystem: false,
  permissionCount: 0,
  userCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

const apiError = (status: number, serverMessage: string | null): ApiError => ({
  status,
  message: 'A generic message',
  error: serverMessage ? { message: serverMessage } : null,
  originalError: new HttpErrorResponse({ status })
});

describe('UserFormDialog', () => {
  let fixture: ComponentFixture<UserFormDialog>;
  let component: UserFormDialog;
  let el: HTMLElement;
  let close: jasmine.Spy;
  let users: jasmine.SpyObj<UserService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let assignments$: Subject<Warehouse[]>;

  const setup = async (data: UserFormDialogData): Promise<void> => {
    close = jasmine.createSpy('close');
    assignments$ = new Subject<Warehouse[]>();
    users = jasmine.createSpyObj<UserService>('UserService', ['create', 'update', 'getUserWarehouses', 'assignWarehouses']);
    users.create.and.returnValue(of({ ...user, id: 'new' }));
    users.update.and.returnValue(of(user));
    users.getUserWarehouses.and.returnValue(assignments$);
    users.assignWarehouses.and.returnValue(of([]));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [UserFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: UserService, useValue: users },
        { provide: WarehouseService, useValue: { getAll: () => of([warehouse('w1', 'Main'), warehouse('w2', 'Backup')]) } },
        { provide: RolesService, useValue: { getAll: () => of([customRole]) } },
        { provide: NotificationService, useValue: notifications },
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormDialog);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  };

  const saveButton = (): HTMLButtonElement => el.querySelector('button[type="submit"]') as HTMLButtonElement;
  const settle = (): void => fixture.detectChanges();

  describe('editing a user', () => {
    beforeEach(() => setup({ mode: 'edit', user }));

    it('keeps Save disabled until the assigned warehouses have loaded', () => {
      expect(saveButton().disabled).toBeTrue();

      assignments$.next([warehouse('w1', 'Main')]);
      settle();

      expect(saveButton().disabled).toBeFalse();
    });

    it('says so and keeps Save disabled when the assigned warehouses cannot be loaded', () => {
      assignments$.error(apiError(500, null));
      settle();

      expect(notifications.error).toHaveBeenCalledTimes(1);
      expect(saveButton().disabled).toBeTrue();
    });

    it('sends the assignments that were loaded together with the change the user makes', () => {
      assignments$.next([warehouse('w1', 'Main')]);
      component.toggleWarehouse('w2');

      component.onSubmit();

      expect(users.update).toHaveBeenCalledTimes(1);
      expect(users.assignWarehouses).toHaveBeenCalledOnceWith('u1', ['w1', 'w2']);
    });

    it('waits for the assignments before closing the dialog', () => {
      const pending = new Subject<Warehouse[]>();
      users.assignWarehouses.and.returnValue(pending);
      assignments$.next([]);

      component.onSubmit();
      expect(close).not.toHaveBeenCalled();

      pending.next([]);
      pending.complete();
      expect(close).toHaveBeenCalledOnceWith({ saved: true });
    });

    it('reports a failed assignment and still closes, because the user itself was saved', () => {
      users.assignWarehouses.and.returnValue(new Observable((s) => s.error(apiError(500, null))));
      assignments$.next([]);

      component.onSubmit();

      expect(notifications.error).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledOnceWith({ saved: true });
    });

    it('shows the server message when saving fails and keeps the dialog open', () => {
      users.update.and.returnValue(new Observable((s) => s.error(apiError(409, 'Email already in use'))));
      assignments$.next([]);

      component.onSubmit();

      expect(notifications.error).toHaveBeenCalledOnceWith('Email already in use');
      expect(close).not.toHaveBeenCalled();
      expect(component.saving()).toBeFalse();
    });

    it('sends no roleId when "no custom role" is picked instead of the text "null"', () => {
      assignments$.next([]);
      const select = el.querySelector('#user-role-id') as HTMLSelectElement;

      select.value = select.options[0].value;
      select.dispatchEvent(new Event('change'));
      component.onSubmit();

      expect(component.form.value.roleId).toBeNull();
      expect('roleId' in users.update.calls.mostRecent().args[1]).toBeFalse();
    });
  });

  describe('creating a user', () => {
    beforeEach(() => setup({ mode: 'add' }));

    it('does not wait for assignments that a new user does not have yet', () => {
      component.form.patchValue({ email: 'new@x.com', password: 'abcdef' });
      settle();

      expect(users.getUserWarehouses).not.toHaveBeenCalled();
      expect(saveButton().disabled).toBeFalse();
    });

    it('assigns the chosen warehouses to the new user', () => {
      component.form.patchValue({ email: 'new@x.com', password: 'abcdef' });
      component.toggleWarehouse('w2');

      component.onSubmit();

      expect(users.assignWarehouses).toHaveBeenCalledOnceWith('new', ['w2']);
      expect(close).toHaveBeenCalledOnceWith({ saved: true });
    });
  });
});
