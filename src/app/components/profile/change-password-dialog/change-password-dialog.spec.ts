import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';

import { ChangePasswordDialog } from './change-password-dialog';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { ChangePasswordResponse } from '../../../interfaces/auth.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('ChangePasswordDialog new password rules', () => {
  let fixture: ComponentFixture<ChangePasswordDialog>;
  let el: HTMLElement;

  const typeNewPassword = (value: string): void => {
    const input = el.querySelector('#new-password') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };

  const messages = (): string => Array.from(el.querySelectorAll('p.text-sm.mt-1')).map((p) => p.textContent?.trim()).join('|');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: AuthService, useValue: { changePassword: jasmine.createSpy('changePassword') } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['success', 'error']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordDialog);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('shows no message for a password that meets the policy', () => {
    typeNewPassword('Abcdef1@');

    expect(messages()).toBe('');
  });

  it('asks for a lowercase letter', () => {
    typeNewPassword('ABCDEFG1@');

    expect(messages()).toContain('PROFILE.PASSWORD_LOWERCASE');
  });

  it('rejects symbols outside @$!%*?& instead of accepting what the API refuses', () => {
    typeNewPassword('Abcdef1#');

    expect(messages()).toContain('PROFILE.PASSWORD_INVALID_CHARS');
    expect(messages()).toContain('PROFILE.PASSWORD_SPECIAL');
  });

  it('keeps the existing messages for length, uppercase and number', () => {
    typeNewPassword('abc');

    expect(messages()).toContain('PROFILE.PASSWORD_MIN_LENGTH');
    expect(messages()).toContain('PROFILE.PASSWORD_UPPERCASE');
    expect(messages()).toContain('PROFILE.PASSWORD_NUMBER');
  });
});

describe('ChangePasswordDialog', () => {
  const STRONG = 'Abcdef1@';

  let fixture: ComponentFixture<ChangePasswordDialog>;
  let component: ChangePasswordDialog;
  let el: HTMLElement;
  let close: jasmine.Spy;
  let auth: jasmine.SpyObj<AuthService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['changePassword']);
    auth.changePassword.and.returnValue(of({ message: 'ok' } as ChangePasswordResponse));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [ChangePasswordDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: notifications },
        { provide: MatDialogRef, useValue: { close } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordDialog);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  // Typing goes through the DOM, like a person does: the dialog is OnPush, so a value set from the
  // outside does not always refresh the view.
  const type = (selector: string, value: string): void => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const fill = (values: Partial<{ current: string; next: string; confirm: string }> = {}): void => {
    const { current = 'oldpass', next = STRONG, confirm = next } = values;
    type('#current-password', current);
    type('#new-password', next);
    type('#confirm-password', confirm);
  };
  const submitButton = (): HTMLButtonElement => el.querySelector('button[type="submit"]') as HTMLButtonElement;

  describe('the form', () => {
    it('keeps the submit button disabled until every field is valid', () => {
      expect(submitButton().disabled).toBeTrue();

      fill({ current: 'short' });
      expect(submitButton().disabled).toBeTrue();

      fill({ next: 'weak' });
      expect(submitButton().disabled).toBeTrue();

      fill();
      expect(submitButton().disabled).toBeFalse();
    });

    it('asks for the current password and its minimum length once touched', () => {
      type('#current-password', '');
      expect(el.textContent).toContain('FORM.VALIDATION.REQUIRED');

      type('#current-password', 'abc');
      expect(el.textContent).toContain('FORM.VALIDATION.MIN_LENGTH');
    });

    it('asks for the new password once touched', () => {
      type('#new-password', '');

      expect(el.textContent).toContain('FORM.VALIDATION.REQUIRED');
    });

    it('asks for the confirmation once touched', () => {
      type('#confirm-password', '');

      expect(el.textContent).toContain('FORM.VALIDATION.REQUIRED');
    });
  });

  describe('submit', () => {
    it('changes the password, tells the user and closes with true', () => {
      fill();

      component.submit();

      expect(auth.changePassword).toHaveBeenCalledOnceWith({ currentPassword: 'oldpass', newPassword: STRONG });
      expect(notifications.success).toHaveBeenCalledOnceWith('PROFILE.PASSWORD_CHANGED');
      expect(close).toHaveBeenCalledOnceWith(true);
      expect(component.saving()).toBeFalse();
    });

    it('does nothing while the form is invalid', () => {
      component.submit();

      expect(auth.changePassword).not.toHaveBeenCalled();
      expect(notifications.error).not.toHaveBeenCalled();
    });

    it('refuses a confirmation that differs from the new password', () => {
      fill({ confirm: 'Different1@' });

      component.submit();

      expect(notifications.error).toHaveBeenCalledOnceWith('PROFILE.PASSWORD_MISMATCH');
      expect(auth.changePassword).not.toHaveBeenCalled();
      expect(component.saving()).toBeFalse();
    });

    it('shows the reason the API gave and stays open', () => {
      auth.changePassword.and.returnValue(throwError(() => ({ error: { message: 'The current password is wrong' } })));
      fill();

      component.submit();

      expect(notifications.error).toHaveBeenCalledOnceWith('The current password is wrong');
      expect(close).not.toHaveBeenCalled();
      expect(component.saving()).toBeFalse();
    });

    it('falls back to the unknown error message when the API gave no reason', () => {
      auth.changePassword.and.returnValue(throwError(() => ({})));
      fill();

      component.submit();

      expect(notifications.error).toHaveBeenCalledOnceWith('NOTIFICATIONS.ERRORS.UNKNOWN');
    });

    it('shows a spinner and blocks the button while it saves', () => {
      auth.changePassword.and.returnValue(new Subject<ChangePasswordResponse>());
      fill();

      component.submit();
      fixture.detectChanges();

      expect(el.querySelector('app-spinner')).not.toBeNull();
      expect(submitButton().disabled).toBeTrue();
    });
  });

  describe('close', () => {
    it('closes without a result from the X button and from Cancel', () => {
      const buttons = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
      const x = buttons[0];
      const cancel = buttons.find((button) => button.textContent?.includes('COMMON.CANCEL')) as HTMLButtonElement;

      x.click();
      cancel.click();

      expect(close.calls.allArgs()).toEqual([[], []]);
    });
  });
});
