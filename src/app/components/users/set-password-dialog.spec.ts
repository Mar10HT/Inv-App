import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';

import { SetPasswordDialog } from './set-password-dialog';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const STRONG = 'Abcdef1@';

describe('SetPasswordDialog', () => {
  let fixture: ComponentFixture<SetPasswordDialog>;
  let component: SetPasswordDialog;
  let el: HTMLElement;
  let close: jasmine.Spy;
  let users: jasmine.SpyObj<UserService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    users = jasmine.createSpyObj<UserService>('UserService', ['setPassword']);
    users.setPassword.and.returnValue(of({ message: 'ok' }));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['handleError']);

    await TestBed.configureTestingModule({
      imports: [SetPasswordDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: UserService, useValue: users },
        { provide: NotificationService, useValue: notifications },
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { userId: 'u1', userName: 'Ana' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SetPasswordDialog);
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
  const fill = (newPassword: string, confirmPassword = newPassword): void => {
    type('#set-new-password', newPassword);
    type('#set-confirm-password', confirmPassword);
  };
  const submitButton = (): HTMLButtonElement => el.querySelector('button[type="submit"]') as HTMLButtonElement;

  it('names the user whose password is being set', () => {
    expect(el.textContent).toContain('Ana');
  });

  it('keeps the submit button disabled until the password is strong and confirmed', () => {
    expect(submitButton().disabled).toBeTrue();

    fill('weak');
    expect(submitButton().disabled).toBeTrue();

    fill(STRONG, 'Different1@');
    expect(submitButton().disabled).toBeTrue();

    fill(STRONG);
    expect(submitButton().disabled).toBeFalse();
  });

  it('explains the rules once the new password was touched and is not strong', () => {
    expect(el.textContent).not.toContain('PASSWORD_RULES');

    type('#set-new-password', 'weak');

    expect(el.textContent).toContain('USER.SET_PASSWORD_DIALOG.PASSWORD_RULES');
  });

  it('says when the two passwords differ, once the confirmation was touched', () => {
    type('#set-new-password', STRONG);
    expect(el.textContent).not.toContain('PASSWORDS_MISMATCH');

    type('#set-confirm-password', 'Different1@');

    expect(el.textContent).toContain('USER.SET_PASSWORD_DIALOG.PASSWORDS_MISMATCH');
  });

  it('shows and hides each password with its own eye button', () => {
    const newPassword = el.querySelector('#set-new-password') as HTMLInputElement;
    const confirm = el.querySelector('#set-confirm-password') as HTMLInputElement;
    expect([newPassword.type, confirm.type]).toEqual(['password', 'password']);

    (el.querySelectorAll('button[aria-label="COMMON.SHOW_PASSWORD"]')[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect([newPassword.type, confirm.type]).toEqual(['text', 'password']);
  });

  describe('onSubmit', () => {
    it('sets the password and closes with a success result', () => {
      fill(STRONG);

      component.onSubmit();

      expect(users.setPassword).toHaveBeenCalledOnceWith('u1', STRONG);
      expect(close).toHaveBeenCalledOnceWith({ success: true });
      expect(component.loading()).toBeFalse();
    });

    it('reports a failure, stays open and stops loading', () => {
      const failure = new Error('boom');
      users.setPassword.and.returnValue(throwError(() => failure));
      fill(STRONG);

      component.onSubmit();

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.USER');
      expect(close).not.toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
    });

    it('sends nothing while the form is invalid or the passwords differ', () => {
      component.onSubmit();
      fill(STRONG, 'Different1@');
      component.onSubmit();

      expect(users.setPassword).not.toHaveBeenCalled();
    });

    it('ignores a second submit while the first one is still running', () => {
      users.setPassword.and.returnValue(new Subject<{ message: string }>());
      fill(STRONG);

      component.onSubmit();
      component.onSubmit();

      expect(users.setPassword).toHaveBeenCalledTimes(1);
      expect(component.loading()).toBeTrue();
    });
  });

  describe('cancel', () => {
    it('closes without a result', () => {
      (el.querySelector('button[type="button"][class*="disabled:opacity-50"]') as HTMLButtonElement).click();

      expect(close).toHaveBeenCalledOnceWith();
    });

    it('is disabled while the password is being saved', () => {
      users.setPassword.and.returnValue(new Subject<{ message: string }>());
      fill(STRONG);
      component.onSubmit();
      fixture.detectChanges();

      expect((el.querySelector('button[type="button"][class*="disabled:opacity-50"]') as HTMLButtonElement).disabled).toBeTrue();
    });
  });
});
