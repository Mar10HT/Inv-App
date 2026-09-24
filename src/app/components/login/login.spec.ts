import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Login } from './login';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
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
});
