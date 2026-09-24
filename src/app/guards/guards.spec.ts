import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

import { authGuard } from './auth.guard';
import { loginGuard } from './login.guard';
import { permissionGuard } from './permission.guard';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';
import { provideTestBedDefaults } from '../../testing/test-providers';

describe('route guards', () => {
  let authenticated: ReturnType<typeof signal<boolean>>;
  let loaded: ReturnType<typeof signal<boolean>>;
  let loaded$: BehaviorSubject<boolean>;
  let granted: Set<string>;

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/inventory' } as RouterStateSnapshot;

  /** Runs a guard and resolves with where it sends the user: true, false or a URL. */
  const decide = async (guard: CanActivateFn): Promise<boolean | string> => {
    const result = TestBed.runInInjectionContext(() => guard(route, state));
    const value = result instanceof Observable ? await firstValueFrom(result) : await result;
    return value instanceof UrlTree ? TestBed.inject(Router).serializeUrl(value) : (value as boolean);
  };

  beforeEach(() => {
    authenticated = signal(true);
    loaded = signal(true);
    loaded$ = new BehaviorSubject(true);
    granted = new Set();

    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        {
          provide: AuthService,
          useValue: { isAuthenticated: authenticated, permissionsLoaded: loaded, permissionsLoaded$: loaded$ }
        },
        { provide: PermissionsService, useValue: { hasPermission: (p: string) => granted.has(p) } }
      ]
    });
  });

  describe('authGuard', () => {
    it('lets an authenticated user through', async () => {
      expect(await decide(authGuard)).toBeTrue();
    });

    it('sends everybody else to login and remembers where they were going', async () => {
      authenticated.set(false);

      expect(await decide(authGuard)).toBe('/login?returnUrl=%2Finventory');
    });
  });

  describe('loginGuard', () => {
    it('shows the login page to somebody who is not signed in', async () => {
      authenticated.set(false);

      expect(await decide(loginGuard)).toBeTrue();
    });

    it('sends a signed in user on to the dashboard', async () => {
      expect(await decide(loginGuard)).toBe('/dashboard');
    });
  });

  describe('permissionGuard', () => {
    const guard = permissionGuard('inventory:create');

    it('lets a user with the permission through', async () => {
      granted.add('inventory:create');

      expect(await decide(guard)).toBeTrue();
    });

    it('sends a visitor to login with the return url', async () => {
      authenticated.set(false);

      expect(await decide(guard)).toBe('/login?returnUrl=%2Finventory');
    });

    describe('when the permission is missing', () => {
      it('sends the user to the dashboard if they can see it', async () => {
        granted.add('dashboard:view');

        expect(await decide(guard)).toBe('/dashboard');
      });

      it('sends the user to the inventory if they cannot see the dashboard', async () => {
        granted.add('inventory:view');

        expect(await decide(guard)).toBe('/inventory');
      });

      it('sends the user to their profile when nothing else is open to them, not to a page that refuses them again', async () => {
        expect(await decide(guard)).toBe('/profile');
      });

      it('never sends a user without dashboard access back to the dashboard', async () => {
        granted.add('inventory:view');

        expect(await decide(permissionGuard('dashboard:view'))).toBe('/inventory');
      });
    });

    describe('while the permissions are still loading', () => {
      beforeEach(() => {
        loaded.set(false);
        loaded$.next(false);
      });

      it('waits for them and then decides', async () => {
        granted.add('inventory:create');
        const pending = decide(guard);

        loaded$.next(true);

        expect(await pending).toBeTrue();
      });

      it('redirects once loaded when the permission turns out to be missing', async () => {
        const pending = decide(guard);

        loaded$.next(true);

        expect(await pending).toBe('/profile');
      });

      it('cancels the navigation when the session ended in the meantime', async () => {
        const pending = decide(guard);

        authenticated.set(false);
        loaded$.next(true);

        expect(await pending).toBeFalse();
      });
    });
  });
});
