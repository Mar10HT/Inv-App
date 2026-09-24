import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';

import { ResetPasswordComponent } from './reset-password';
import { AuthService } from '../../services/auth.service';
import { ApiError } from '../../interfaces/api-error.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

describe('ResetPasswordComponent failed reset', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let resetPassword: jasmine.Spy;

  const apiError = (status: number, message: string, serverMessage: string | null): ApiError => ({
    status,
    message,
    error: serverMessage ? { message: serverMessage } : null,
    originalError: new HttpErrorResponse({ status })
  });

  const submitWith = (error: ApiError): string => {
    resetPassword.and.returnValue(throwError(() => error));
    component.form.patchValue({ newPassword: 'Abcdef1@', confirmPassword: 'Abcdef1@' });
    component.onSubmit();
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  };

  beforeEach(async () => {
    resetPassword = jasmine.createSpy('resetPassword');

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: AuthService, useValue: { resetPassword } },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { token: 'abc' } } } }
      ]
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('en', {
      AUTH: { RESET_PASSWORD: { INVALID_TOKEN: 'This link is invalid or has expired.' } }
    });
    TestBed.inject(TranslateService).use('en');

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the server reason when the token is rejected', () => {
    const text = submitWith(apiError(400, 'Validation failed.', 'Invalid or expired reset token'));

    expect(text).toContain('Invalid or expired reset token');
  });

  it('shows what actually went wrong on a network failure instead of blaming the token', () => {
    const text = submitWith(apiError(0, 'Connection error. Please check your internet connection.', null));

    expect(text).toContain('Connection error.');
    expect(text).not.toContain('This link is invalid or has expired.');
  });

  it('shows the throttling message when the API answers 429', () => {
    const text = submitWith(apiError(429, 'Too many requests. Please wait a moment.', null));

    expect(text).toContain('Too many requests.');
  });
});
