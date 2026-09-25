import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { Login } from './login';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ApiError } from '../../interfaces/api-error.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let login: jasmine.Spy;

  beforeEach(async () => {
    login = jasmine.createSpy('login').and.returnValue(of({ user: { name: 'Ana', email: 'ana@x.com' } }));

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        ...provideTestBedDefaults(),
        { provide: AuthService, useValue: { login } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['success']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('password length', () => {
    // The API accepts passwords of 6 or more characters at login (LoginDto MinLength(6)),
    // and admins can create users with 6, so the form must not be stricter than that.
    it('accepts a 6 character password', () => {
      component.loginForm.patchValue({ email: 'ana@x.com', password: 'abcdef' });

      expect(component.loginForm.valid).toBeTrue();
    });

    it('rejects a 5 character password and explains why', () => {
      component.loginForm.patchValue({ email: 'ana@x.com', password: 'abcde' });
      component.loginForm.markAllAsTouched();
      fixture.detectChanges();

      expect(component.loginForm.valid).toBeFalse();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('LOGIN.VALIDATION.PASSWORD_MIN');
    });

    it('lets a user with a 6 character password sign in', () => {
      component.loginForm.patchValue({ email: 'ana@x.com', password: 'abcdef' });

      component.onSubmit();

      expect(login).toHaveBeenCalledTimes(1);
    });
  });

  describe('failed sign in', () => {
    const apiError = (status: number, message: string): ApiError => ({
      status,
      message,
      error: null,
      originalError: new HttpErrorResponse({ status })
    });

    const submitWith = (error: unknown): string => {
      login.and.returnValue(throwError(() => error));
      component.loginForm.patchValue({ email: 'ana@x.com', password: 'abcdef' });
      component.onSubmit();
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).textContent ?? '';
    };

    beforeEach(() => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', {
        LOGIN: {
          ERROR: { GENERIC: 'We could not sign you in.', INVALID_CREDENTIALS: 'Invalid credentials.' }
        }
      });
      translate.use('en');
    });

    it('says the credentials are wrong on a 401, not that the session expired', () => {
      const text = submitWith(apiError(401, 'Session expired. Please log in again.'));

      expect(text).toContain('Invalid credentials.');
      expect(text).not.toContain('Session expired');
    });

    it('shows the message of other known failures, such as a lost connection', () => {
      const text = submitWith(apiError(0, 'Connection error. Please check your internet connection.'));

      expect(text).toContain('Connection error.');
    });

    it('translates the generic fallback instead of showing its key', () => {
      const text = submitWith({});

      expect(text).toContain('We could not sign you in.');
      expect(text).not.toContain('LOGIN.ERROR.GENERIC');
    });
  });
});
