import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { Users } from './users';
import { ResetLinkDialog } from './reset-link-dialog';
import { SetPasswordDialog } from './set-password-dialog';
import { UserFormDialog } from './user-form-dialog';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { AuthUser, GeneratedResetLink, PendingReset } from '../../interfaces/auth.interface';
import { User, UserRole } from '../../interfaces/user.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const user = (id: string, role: UserRole, overrides: Partial<User> = {}): User => ({
  id,
  email: `${id}@x.com`,
  name: `User ${id}`,
  role,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides
});

const pending = (userId: string): PendingReset => ({ userId }) as unknown as PendingReset;

describe('Users actions', () => {
  let fixture: ComponentFixture<Users>;
  let component: Users;
  let people: ReturnType<typeof signal<User[]>>;
  let currentUser: ReturnType<typeof signal<AuthUser | null>>;
  let users: jasmine.SpyObj<UserService>;
  let auth: jasmine.SpyObj<AuthService>;
  let dialog: { open: jasmine.Spy };
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let logger: jasmine.SpyObj<LoggerService>;

  const failure = new Error('boom');

  /** Closes every dialog it opens with `result`. */
  const closeWith = (result: unknown): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(result) });
  };

  beforeEach(async () => {
    people = signal([
      user('admin', UserRole.SYSTEM_ADMIN),
      user('boss', UserRole.WAREHOUSE_MANAGER),
      user('ana', UserRole.USER),
      user('beto', UserRole.USER, { name: undefined }),
      user('view', UserRole.VIEWER),
      user('ext', UserRole.EXTERNAL)
    ]);
    currentUser = signal<AuthUser | null>({ id: 'admin', email: 'admin@x.com', name: 'Admin', role: UserRole.SYSTEM_ADMIN });
    users = jasmine.createSpyObj<UserService>('UserService', ['getAll', 'delete'], {
      users: people,
      loading: signal(false),
      error: signal(null)
    } as never);
    users.getAll.and.returnValue(of(people()));
    users.delete.and.returnValue(of(undefined));
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getPendingResets', 'generateResetLink'], { currentUser } as never);
    auth.getPendingResets.and.returnValue(of([pending('ana')]));
    auth.generateResetLink.and.returnValue(
      of({ resetUrl: 'https://app/reset/tok', expiresAt: '2026-10-01T00:00:00Z' } as unknown as GeneratedResetLink)
    );
    dialog = { open: jasmine.createSpy('open') };
    closeWith(undefined);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'info',
      'created',
      'updated',
      'deleted',
      'handleError'
    ]);
    logger = jasmine.createSpyObj<LoggerService>('LoggerService', ['debug', 'error']);

    await TestBed.configureTestingModule({
      imports: [Users],
      providers: [
        ...provideTestBedDefaults(),
        { provide: UserService, useValue: users },
        { provide: AuthService, useValue: auth },
        { provide: MatDialog, useValue: dialog },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications },
        { provide: LoggerService, useValue: logger }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Users);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('opening the page', () => {
    it('asks for the users and for the pending password resets', () => {
      expect(users.getAll).toHaveBeenCalledTimes(1);
      expect(auth.getPendingResets).toHaveBeenCalledTimes(1);
      expect(component.pendingResets().map((r) => r.userId)).toEqual(['ana']);
    });

    it('tells the user when the users fail to load', () => {
      users.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(Users).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });

    it('does not bother a user who cannot see the pending resets: it is only logged', () => {
      auth.getPendingResets.and.returnValue(throwError(() => failure));

      TestBed.createComponent(Users).detectChanges();

      expect(logger.debug).toHaveBeenCalledWith('Failed to load pending password resets', failure);
      expect(notifications.handleError).not.toHaveBeenCalled();
    });

    it('follows the loading and error state of the service', () => {
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBeNull();
    });
  });

  it('counts the users by role', () => {
    expect(component.stats()).toEqual({ total: 6, admins: 1, managers: 1, users: 2, viewers: 1, external: 1 });

    people.update((all) => all.filter((u) => u.role !== UserRole.USER));

    expect(component.stats()).toEqual({ total: 4, admins: 1, managers: 1, users: 0, viewers: 1, external: 1 });
  });

  it('hasPendingReset knows which users asked for a reset', () => {
    expect(component.hasPendingReset('ana')).toBeTrue();
    expect(component.hasPendingReset('boss')).toBeFalse();
  });

  describe('resetPassword', () => {
    it('generates a link, shows it named after the user and refreshes the pending resets', () => {
      auth.getPendingResets.calls.reset();

      component.resetPassword(user('ana', UserRole.USER, { name: 'Ana' }));

      expect(auth.generateResetLink).toHaveBeenCalledOnceWith('ana');
      expect(dialog.open).toHaveBeenCalledOnceWith(
        ResetLinkDialog,
        jasmine.objectContaining({ data: { userName: 'Ana', resetUrl: 'https://app/reset/tok', expiresAt: '2026-10-01T00:00:00Z' } })
      );
      expect(auth.getPendingResets).toHaveBeenCalledTimes(1);
    });

    it('names a user without a name by their email', () => {
      component.resetPassword(user('beto', UserRole.USER, { name: undefined }));

      expect(dialog.open.calls.mostRecent().args[1].data.userName).toBe('beto@x.com');
    });

    it('tells the user when the link cannot be generated', () => {
      auth.generateResetLink.and.returnValue(throwError(() => failure));

      component.resetPassword(user('ana', UserRole.USER));

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.USER');
      expect(dialog.open).not.toHaveBeenCalled();
    });
  });

  describe('setPassword', () => {
    it('refuses to change the password of the signed in user here, and points to the profile', () => {
      component.setPassword(user('admin', UserRole.SYSTEM_ADMIN));

      expect(notifications.info).toHaveBeenCalledOnceWith('USER.SET_PASSWORD_DIALOG.SELF_NOT_ALLOWED');
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('opens the dialog for another user, named by their name or their email', () => {
      component.setPassword(user('ana', UserRole.USER, { name: 'Ana' }));
      expect(dialog.open).toHaveBeenCalledWith(
        SetPasswordDialog,
        jasmine.objectContaining({ data: { userId: 'ana', userName: 'Ana' } })
      );

      component.setPassword(user('beto', UserRole.USER, { name: undefined }));
      expect(dialog.open.calls.mostRecent().args[1].data).toEqual({ userId: 'beto', userName: 'beto@x.com' });
    });

    it('says the password was set once the dialog reports success', () => {
      closeWith({ success: true });

      component.setPassword(user('ana', UserRole.USER, { name: 'Ana' }));

      expect(notifications.success).toHaveBeenCalledOnceWith('USER.SET_PASSWORD_DIALOG.SUCCESS', { interpolateParams: { name: 'Ana' } });
    });

    it('says nothing when the dialog was dismissed', () => {
      closeWith(undefined);
      component.setPassword(user('ana', UserRole.USER));
      closeWith({ success: false });
      component.setPassword(user('ana', UserRole.USER));

      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('does not refuse anybody when nobody is signed in', () => {
      currentUser.set(null);

      component.setPassword(user('admin', UserRole.SYSTEM_ADMIN));

      expect(dialog.open).toHaveBeenCalledTimes(1);
    });
  });

  describe('addUser and editUser', () => {
    it('addUser opens the form in add mode and says the user was created, by name or email', () => {
      closeWith({ saved: true, name: 'Carlos', email: 'c@x.com' });
      component.addUser();
      expect(dialog.open).toHaveBeenCalledWith(UserFormDialog, jasmine.objectContaining({ data: { mode: 'add' } }));
      expect(notifications.created).toHaveBeenCalledWith('NOTIFICATIONS.ENTITIES.USER', 'Carlos');

      closeWith({ saved: true, email: 'c@x.com' });
      component.addUser();
      expect(notifications.created).toHaveBeenCalledWith('NOTIFICATIONS.ENTITIES.USER', 'c@x.com');
    });

    it('editUser opens the form in edit mode with the user and says it was updated', () => {
      const ana = user('ana', UserRole.USER);
      closeWith({ saved: true, name: 'Ana', email: 'ana@x.com' });

      component.editUser(ana);

      expect(dialog.open).toHaveBeenCalledWith(UserFormDialog, jasmine.objectContaining({ data: { mode: 'edit', user: ana } }));
      expect(notifications.updated).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.USER', 'Ana');
    });

    it('say nothing when the form was dismissed', () => {
      closeWith(undefined);

      component.addUser();
      component.editUser(user('ana', UserRole.USER));

      expect(notifications.created).not.toHaveBeenCalled();
      expect(notifications.updated).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('asks the user to confirm, and deletes nothing when they decline', () => {
      confirm.ask.and.returnValue(of(false));

      component.deleteUser(user('ana', UserRole.USER));

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'danger' }));
      expect(users.delete).not.toHaveBeenCalled();
    });

    it('deletes the user once confirmed and says so, naming them by name or email', () => {
      component.deleteUser(user('ana', UserRole.USER, { name: 'Ana' }));
      component.deleteUser(user('beto', UserRole.USER, { name: undefined }));

      expect(users.delete.calls.allArgs()).toEqual([['ana'], ['beto']]);
      expect(notifications.deleted.calls.allArgs()).toEqual([
        ['NOTIFICATIONS.ENTITIES.USER', 'Ana'],
        ['NOTIFICATIONS.ENTITIES.USER', 'beto@x.com']
      ]);
    });

    it('reports a failed delete and does not say it was deleted', () => {
      users.delete.and.returnValue(throwError(() => failure));

      component.deleteUser(user('ana', UserRole.USER));

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.USER');
      expect(notifications.deleted).not.toHaveBeenCalled();
    });
  });

  it('gives each role its own badge, and a neutral one to anything else', () => {
    const classes = [
      UserRole.SYSTEM_ADMIN,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.USER,
      UserRole.VIEWER,
      UserRole.EXTERNAL,
      'SOMETHING_ELSE' as UserRole
    ].map((role) => component.getRoleBadgeClass(role));

    expect(new Set(classes).size).toBe(6);
    expect(classes[5]).toContain('surface-elevated');
  });

  it('tracks the users by id', () => {
    expect(component.trackByFn(0, user('ana', UserRole.USER))).toBe('ana');
  });
});
