import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { ChangePasswordDialog } from './change-password-dialog';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
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
