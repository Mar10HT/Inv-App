import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';

import { RoleFormDialog, RoleFormDialogData } from './role-form-dialog';
import { RolesService } from '../../services/roles.service';
import { NotificationService } from '../../services/notification.service';
import { ApiError } from '../../interfaces/api-error.interface';
import { RoleDetail, RoleSummary } from '../../interfaces/role.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const role: RoleSummary = {
  id: 'r1',
  name: 'AUDITOR',
  displayName: 'Auditor',
  description: 'Reads audit logs',
  isSystem: false,
  permissionCount: 0,
  userCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

describe('RoleFormDialog', () => {
  let fixture: ComponentFixture<RoleFormDialog>;
  let el: HTMLElement;
  let close: jasmine.Spy;
  let roles: jasmine.SpyObj<RolesService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const setup = async (
    data: RoleFormDialogData,
    configure: (r: jasmine.SpyObj<RolesService>) => void = () => undefined
  ): Promise<void> => {
    close = jasmine.createSpy('close');
    roles = jasmine.createSpyObj<RolesService>('RolesService', ['getPermissions', 'getOne', 'create', 'update']);
    roles.getPermissions.and.returnValue(of([]));
    roles.create.and.returnValue(of({ ...role, permissions: [] }));
    roles.update.and.returnValue(of({ ...role, permissions: [] }));
    roles.getOne.and.returnValue(of({ ...role, permissions: [] }));
    configure(roles);
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [RoleFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: RolesService, useValue: roles },
        { provide: NotificationService, useValue: notifications },
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoleFormDialog);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  };

  const type = (selector: string, value: string): void => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const saveButton = (): HTMLButtonElement =>
    Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('COMMON.SAVE')
    ) as HTMLButtonElement;

  describe('add mode', () => {
    beforeEach(() => setup({ mode: 'add' }));

    it('starts with Save disabled', () => {
      expect(saveButton().disabled).toBeTrue();
    });

    it('enables Save once both the name and the display name are filled', () => {
      type('#role-name', 'auditor');
      expect(saveButton().disabled).toBeTrue();

      type('#role-display-name', 'Auditor');

      expect(saveButton().disabled).toBeFalse();
    });

    it('keeps Save disabled when only whitespace is typed', () => {
      type('#role-name', '   ');
      type('#role-display-name', '   ');

      expect(saveButton().disabled).toBeTrue();
    });

    it('creates the role with a normalized name and closes the dialog', () => {
      type('#role-name', 'stock auditor');
      type('#role-display-name', ' Stock Auditor ');

      saveButton().click();

      expect(roles.create).toHaveBeenCalledOnceWith({
        name: 'STOCK_AUDITOR',
        displayName: 'Stock Auditor',
        description: undefined,
        permissionIds: []
      });
      expect(close).toHaveBeenCalledOnceWith({ saved: true });
    });
  });

  describe('edit mode', () => {
    beforeEach(() => setup({ mode: 'edit', role }));

    it('starts with Save enabled because the display name is preloaded', () => {
      expect(saveButton().disabled).toBeFalse();
    });

    it('disables Save when the display name is cleared', () => {
      type('#role-display-name', '');

      expect(saveButton().disabled).toBeTrue();
    });
  });

  describe('editing safely', () => {
    const apiError = (status: number, serverMessage: string | null): ApiError => ({
      status,
      message: 'A generic message',
      error: serverMessage ? { message: serverMessage } : null,
      originalError: new HttpErrorResponse({ status })
    });
    const failing = (error: ApiError): Observable<never> => new Observable((subscriber) => subscriber.error(error));
    const detail = (ids: string[]): RoleDetail => ({
      ...role,
      permissions: ids.map((id) => ({ id, key: 'x:' + id, module: 'x', action: id, description: '' }))
    });

    it('keeps Save disabled until the current permissions have loaded', async () => {
      const current = new Subject<RoleDetail>();
      await setup({ mode: 'edit', role }, (r) => r.getOne.and.returnValue(current));
      expect(saveButton().disabled).toBeTrue();

      current.next(detail(['p1']));
      fixture.detectChanges();

      expect(saveButton().disabled).toBeFalse();
    });

    it('says so and keeps Save disabled when the current permissions cannot be loaded', async () => {
      await setup({ mode: 'edit', role }, (r) => r.getOne.and.returnValue(failing(apiError(500, null))));
      fixture.detectChanges();

      expect(notifications.error).toHaveBeenCalledTimes(1);
      expect(saveButton().disabled).toBeTrue();
    });

    it('says so and keeps Save disabled when the permission list cannot be loaded', async () => {
      await setup({ mode: 'edit', role }, (r) => r.getPermissions.and.returnValue(failing(apiError(500, null))));
      fixture.detectChanges();

      expect(notifications.error).toHaveBeenCalledTimes(1);
      expect(saveButton().disabled).toBeTrue();
    });

    it('saves with the permissions it loaded, not an empty list', async () => {
      await setup({ mode: 'edit', role }, (r) => r.getOne.and.returnValue(of(detail(['p1', 'p2']))));
      fixture.detectChanges();

      saveButton().click();

      expect(roles.update).toHaveBeenCalledOnceWith('r1', {
        displayName: 'Auditor',
        description: 'Reads audit logs',
        permissionIds: ['p1', 'p2']
      });
    });

    it('shows the server message when saving fails and keeps the dialog open', async () => {
      await setup({ mode: 'edit', role }, (r) => r.update.and.returnValue(failing(apiError(409, 'Role name already exists'))));
      fixture.detectChanges();

      saveButton().click();

      expect(notifications.error).toHaveBeenCalledOnceWith('Role name already exists');
      expect(close).not.toHaveBeenCalled();
    });
  });
});
