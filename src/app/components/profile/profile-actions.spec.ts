import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { Profile } from './profile';
import { ChangePasswordDialog } from './change-password-dialog/change-password-dialog';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { AuthUser, UpdateProfileResponse } from '../../interfaces/auth.interface';
import { UserRole } from '../../interfaces/user.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const ana: AuthUser = { id: 'u1', email: 'ana@x.com', name: 'Ana María', role: UserRole.USER };

describe('Profile actions', () => {
  let fixture: ComponentFixture<Profile>;
  let component: Profile;
  let currentUser: WritableSignal<AuthUser | null>;
  let auth: jasmine.SpyObj<AuthService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let dialog: { open: jasmine.Spy };

  const setup = async (user: AuthUser | null = ana): Promise<void> => {
    currentUser = signal(user);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['updateProfile'], { currentUser } as never);
    auth.updateProfile.and.returnValue(of({ user: ana } as UpdateProfileResponse));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);
    dialog = { open: jasmine.createSpy('open') };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        ...provideTestBedDefaults(),
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: notifications },
        { provide: MatDialog, useValue: dialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('the form', () => {
    it('starts with the name and the email of the signed in user', async () => {
      await setup();

      expect(component.profileForm.value).toEqual({ name: 'Ana María', email: 'ana@x.com' });
    });

    it('starts empty when nobody is signed in, and with an empty name when the user has none', async () => {
      await setup(null);
      expect(component.profileForm.value).toEqual({ name: '', email: '' });

      TestBed.resetTestingModule();
      await setup({ ...ana, name: undefined });
      expect(component.profileForm.value).toEqual({ name: '', email: 'ana@x.com' });
    });

    it('is not valid without a name of two characters and an email address', async () => {
      await setup();

      component.profileForm.patchValue({ name: 'A' });
      expect(component.profileForm.valid).toBeFalse();

      component.profileForm.patchValue({ name: 'Al', email: 'not an email' });
      expect(component.profileForm.valid).toBeFalse();

      component.profileForm.patchValue({ email: 'al@x.com' });
      expect(component.profileForm.valid).toBeTrue();
    });
  });

  describe('userInitials', () => {
    const initialsOf = async (name: string | undefined): Promise<string> => {
      TestBed.resetTestingModule();
      await setup({ ...ana, name });
      return component.userInitials();
    };

    it('takes the first letter of the first two words, in capitals', async () => {
      expect(await initialsOf('ana maría')).toBe('AM');
      expect(await initialsOf('Ana María López')).toBe('AM');
      expect(await initialsOf('Ana')).toBe('A');
    });

    it('is a question mark when the user has no name, or there is no user', async () => {
      expect(await initialsOf(undefined)).toBe('?');

      TestBed.resetTestingModule();
      await setup(null);
      expect(component.userInitials()).toBe('?');
    });
  });

  describe('editing', () => {
    beforeEach(() => setup());

    it('toggleEditMode switches edit mode on and off', () => {
      component.toggleEditMode();
      expect(component.editMode()).toBeTrue();

      component.toggleEditMode();
      expect(component.editMode()).toBeFalse();
    });

    it('leaving edit mode throws away what was typed', () => {
      component.toggleEditMode();
      component.profileForm.patchValue({ name: 'Somebody else' });

      component.toggleEditMode();

      expect(component.profileForm.value.name).toBe('Ana María');
    });

    it('saveProfile sends nothing while the form is invalid', () => {
      component.profileForm.patchValue({ name: '' });

      component.saveProfile();

      expect(auth.updateProfile).not.toHaveBeenCalled();
      expect(component.saving()).toBeFalse();
    });

    it('saveProfile sends the form, leaves edit mode and says so', () => {
      component.toggleEditMode();
      component.profileForm.patchValue({ name: 'Ana M.' });

      component.saveProfile();

      expect(auth.updateProfile).toHaveBeenCalledOnceWith({ name: 'Ana M.', email: 'ana@x.com' });
      expect(component.saving()).toBeFalse();
      expect(component.editMode()).toBeFalse();
      expect(notifications.success).toHaveBeenCalledOnceWith('PROFILE.UPDATED');
    });

    it('saveProfile shows the reason the API gave and stays in edit mode', () => {
      auth.updateProfile.and.returnValue(throwError(() => ({ error: { message: 'Email already in use' } })));
      component.toggleEditMode();

      component.saveProfile();

      expect(notifications.error).toHaveBeenCalledOnceWith('Email already in use');
      expect(component.editMode()).toBeTrue();
      expect(component.saving()).toBeFalse();
    });

    it('saveProfile falls back to the unknown error message when the API gave no reason', () => {
      auth.updateProfile.and.returnValue(throwError(() => ({})));

      component.saveProfile();

      expect(notifications.error).toHaveBeenCalledOnceWith('NOTIFICATIONS.ERRORS.UNKNOWN');
    });
  });

  it('openChangePasswordDialog opens the change password dialog', async () => {
    await setup();

    component.openChangePasswordDialog();

    expect(dialog.open).toHaveBeenCalledOnceWith(
      ChangePasswordDialog,
      jasmine.objectContaining({ width: '100%', maxWidth: '450px' })
    );
  });

  describe('labels', () => {
    beforeEach(() => setup());

    it('getRoleDisplay labels a role with its translation key, and is empty without one', () => {
      expect(component.getRoleDisplay(UserRole.SYSTEM_ADMIN)).toBe('USER.ROLES.SYSTEM_ADMIN');
      expect(component.getRoleDisplay(undefined)).toBe('');
      expect(component.getRoleDisplay('')).toBe('');
    });

    it('formatDate writes a date in full in the language of the app, from a Date or a string', () => {
      expect(component.formatDate(undefined)).toBe('');

      expect(component.formatDate(new Date(2026, 8, 24))).toBe('September 24, 2026');
      expect(component.formatDate('2026-09-24T12:00:00')).toBe('September 24, 2026');

      TestBed.inject(TranslateService).use('es');
      expect(component.formatDate(new Date(2026, 8, 24))).toBe('24 de septiembre de 2026');
    });
  });
});
