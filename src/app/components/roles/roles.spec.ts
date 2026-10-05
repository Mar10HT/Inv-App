import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { RolesComponent } from './roles';
import { RoleFormDialog } from './role-form-dialog';
import { RolesService } from '../../services/roles.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { RoleSummary } from '../../interfaces/role.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const role = (id: string, overrides: Partial<RoleSummary> = {}): RoleSummary => ({
  id,
  name: id.toUpperCase(),
  displayName: `Role ${id}`,
  isSystem: false,
  permissionCount: 0,
  userCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides
});

describe('RolesComponent', () => {
  let fixture: ComponentFixture<RolesComponent>;
  let component: RolesComponent;
  let roles: jasmine.SpyObj<RolesService>;
  let dialog: { open: jasmine.Spy };
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const failure = new Error('boom');

  /** Closes every dialog it opens with `result`. */
  const closeWith = (result: unknown): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(result) });
  };

  beforeEach(async () => {
    roles = jasmine.createSpyObj<RolesService>('RolesService', ['getAll', 'remove']);
    roles.getAll.and.returnValue(of([role('admin', { isSystem: true }), role('auditor'), role('clerk')]));
    roles.remove.and.returnValue(of({ message: 'Deleted' }));
    dialog = { open: jasmine.createSpy('open') };
    closeWith(undefined);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['deleted', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [RolesComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: RolesService, useValue: roles },
        { provide: MatDialog, useValue: dialog },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('loading the roles', () => {
    it('loads them when the page opens and counts the system and the custom ones', () => {
      expect(roles.getAll).toHaveBeenCalledTimes(1);
      expect(component.roles().map((r) => r.id)).toEqual(['admin', 'auditor', 'clerk']);
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBeNull();
      expect(component.systemCount()).toBe(1);
      expect(component.customCount()).toBe(2);
    });

    it('tells the user and shows an error when they cannot be loaded', () => {
      roles.getAll.and.returnValue(throwError(() => failure));

      const failed = TestBed.createComponent(RolesComponent);
      failed.detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
      expect(failed.componentInstance.error()).toBe('NOTIFICATIONS.ERRORS.SERVER');
      expect(failed.componentInstance.loading()).toBeFalse();
      expect(failed.componentInstance.roles()).toEqual([]);
    });
  });

  describe('openAdd and openEdit', () => {
    it('openAdd opens the form in add mode and reloads the roles once one was saved', () => {
      closeWith({ saved: true });

      component.openAdd();

      expect(dialog.open).toHaveBeenCalledOnceWith(RoleFormDialog, jasmine.objectContaining({ width: '640px', data: { mode: 'add' } }));
      expect(roles.getAll).toHaveBeenCalledTimes(2);
    });

    it('openEdit opens the form in edit mode with the role and reloads once it was saved', () => {
      const auditor = role('auditor');
      closeWith({ saved: true });

      component.openEdit(auditor);

      expect(dialog.open).toHaveBeenCalledOnceWith(RoleFormDialog, jasmine.objectContaining({ data: { mode: 'edit', role: auditor } }));
      expect(roles.getAll).toHaveBeenCalledTimes(2);
    });

    it('reload nothing when the form was dismissed', () => {
      closeWith(undefined);
      component.openAdd();
      closeWith({ saved: false });
      component.openEdit(role('auditor'));

      expect(roles.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirmDelete', () => {
    it('asks the user to confirm, naming the role, and deletes nothing when they decline', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { ROLES: { DELETE_CONFIRM: { MESSAGE: 'Delete {{name}}?' } } });
      translate.use('en');
      confirm.ask.and.returnValue(of(false));

      component.confirmDelete(role('auditor', { displayName: 'Auditor' }));

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'danger', message: 'Delete Auditor?' }));
      expect(roles.remove).not.toHaveBeenCalled();
    });

    it('deletes the role once confirmed, says so and reloads the list', () => {
      component.confirmDelete(role('auditor', { displayName: 'Auditor' }));

      expect(roles.remove).toHaveBeenCalledOnceWith('auditor');
      expect(notifications.deleted).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.ROLE', 'Auditor');
      expect(roles.getAll).toHaveBeenCalledTimes(2);
    });

    it('reports a failed delete, and neither says it was deleted nor reloads', () => {
      roles.remove.and.returnValue(throwError(() => failure));

      component.confirmDelete(role('auditor'));

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.ROLE');
      expect(notifications.deleted).not.toHaveBeenCalled();
      expect(roles.getAll).toHaveBeenCalledTimes(1);
    });
  });
});
