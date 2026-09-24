import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Route, RouterStateSnapshot } from '@angular/router';
import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './services/auth.service';
import { PermissionsService } from './services/permissions.service';
import { provideTestBedDefaults } from '../testing/test-providers';

// The URL is the only thing between a user and a page: hiding a button is not enough, so the
// route itself has to ask for the permission the button is shown for.
describe('inventory routes', () => {
  let granted: Set<string>;

  const inventory = routes.find((r) => r.path === 'inventory') as Route;
  const child = (path: string): Route => inventory.children?.find((c) => c.path === path) as Route;

  /** True when every guard of the route lets the current user through. */
  const canOpen = (route: Route): boolean =>
    (route.canActivate ?? []).every((guard) => {
      const result = TestBed.runInInjectionContext(() =>
        (guard as CanActivateFn)({} as ActivatedRouteSnapshot, { url: '/x' } as RouterStateSnapshot)
      );
      return result === true;
    });

  const as = (...permissions: string[]): void => {
    granted = new Set(permissions);
  };

  beforeEach(() => {
    granted = new Set();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: signal(true),
            permissionsLoaded: signal(true),
            permissionsLoaded$: new BehaviorSubject(true)
          }
        },
        { provide: PermissionsService, useValue: { hasPermission: (p: string) => granted.has(p) } }
      ]
    });
  });

  it('is guarded as a whole by inventory:view', () => {
    as();
    expect(canOpen(inventory)).toBeFalse();

    as('inventory:view');
    expect(canOpen(inventory)).toBeTrue();
  });

  describe('add', () => {
    it('is closed to somebody who can only view the inventory', () => {
      as('inventory:view');

      expect(canOpen(child('add'))).toBeFalse();
    });

    it('is closed to somebody who can edit but not create', () => {
      as('inventory:view', 'inventory:edit');

      expect(canOpen(child('add'))).toBeFalse();
    });

    it('is open to somebody who can create', () => {
      as('inventory:view', 'inventory:create');

      expect(canOpen(child('add'))).toBeTrue();
    });
  });

  describe('edit', () => {
    it('is closed to somebody who can only view the inventory', () => {
      as('inventory:view');

      expect(canOpen(child('edit/:id'))).toBeFalse();
    });

    it('is closed to somebody who can create but not edit', () => {
      as('inventory:view', 'inventory:create');

      expect(canOpen(child('edit/:id'))).toBeFalse();
    });

    it('is open to somebody who can edit', () => {
      as('inventory:view', 'inventory:edit');

      expect(canOpen(child('edit/:id'))).toBeTrue();
    });
  });

  it('keeps the list open to anybody who can view the inventory', () => {
    as('inventory:view');

    expect(canOpen(child(''))).toBeTrue();
  });
});
