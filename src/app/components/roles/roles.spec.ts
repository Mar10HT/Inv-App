import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { RolesComponent } from './roles';
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
  let router: Router;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const failure = new Error('boom');

  beforeEach(async () => {
    roles = jasmine.createSpyObj<RolesService>('RolesService', ['getAll', 'remove']);
    roles.getAll.and.returnValue(of([role('admin', { isSystem: true }), role('auditor'), role('clerk')]));
    roles.remove.and.returnValue(of({ message: 'Deleted' }));
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['deleted', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [RolesComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: RolesService, useValue: roles },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RolesComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
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
    it('openAdd navigates to the add route', () => {
      component.openAdd();

      expect(router.navigate).toHaveBeenCalledOnceWith(['/roles', 'add']);
    });

    it('openEdit navigates to the edit route for that role', () => {
      component.openEdit(role('auditor'));

      expect(router.navigate).toHaveBeenCalledOnceWith(['/roles', 'edit', 'auditor']);
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
