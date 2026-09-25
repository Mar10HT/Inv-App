import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Route, RouterStateSnapshot } from '@angular/router';
import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { routes } from './app.routes';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
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

interface Page {
  /** The address the page is served at, with the path of its parents in front. */
  path: string;
  /** The guards of the route and of every route above it. */
  guards: CanActivateFn[];
}

const pagesOf = (list: Route[], parentPath = '', parentGuards: CanActivateFn[] = []): Page[] =>
  list.flatMap((route) => {
    const path = [parentPath, route.path].filter(Boolean).join('/');
    const guards = [...parentGuards, ...((route.canActivate ?? []) as CanActivateFn[])];
    const own = route.loadComponent || route.component || route.loadChildren ? [{ path, guards }] : [];
    return [...own, ...pagesOf(route.children ?? [], path, guards)];
  });

const pages = pagesOf(routes);

// Who may open each page. Changing one of these is a change of who can see what, so it should
// be a decision and not something a refactor does by accident.
const PERMISSIONS: Record<string, string[]> = {
  dashboard: ['dashboard:view'],
  inventory: ['inventory:view'],
  'inventory/add': ['inventory:view', 'inventory:create'],
  'inventory/edit/:id': ['inventory:view', 'inventory:edit'],
  warehouses: ['warehouse:view'],
  suppliers: ['suppliers:view'],
  categories: ['categories:view'],
  settings: ['settings:view'],
  users: ['users:view'],
  roles: ['settings:edit'],
  transactions: ['transactions:view'],
  reports: ['reports:view'],
  audit: ['audit:view'],
  loans: ['loans:view'],
  transfers: ['transfers:view'],
  'stock-take': ['stocktake:view'],
  discharges: ['discharges:view'],
  outflows: ['outflows:view'],
  sales: ['sales:view'],
  'discharges/:id': ['discharges:view']
};

const PUBLIC_PAGES = ['forgot-password', 'reset-password/:token', 'request', '**'];

describe('routes', () => {
  it('sends the empty address to the dashboard', () => {
    expect(routes.find((route) => route.path === '')).toEqual(jasmine.objectContaining({ redirectTo: 'dashboard', pathMatch: 'full' }));
  });

  it('ends with the not found page, so it only catches what nothing else matched', () => {
    expect(routes[routes.length - 1].path).toBe('**');
  });

  it('leaves only the public pages without a guard', () => {
    const unguarded = pages.filter((page) => page.guards.length === 0).map((page) => page.path);

    expect(unguarded.sort()).toEqual([...PUBLIC_PAGES].sort());
  });

  it('keeps the signed in users away from the login page and everybody else out of the profile', () => {
    const guardsOf = (path: string): CanActivateFn[] => pages.find((page) => page.path === path)?.guards ?? [];

    expect(guardsOf('login')).toEqual([loginGuard]);
    expect(guardsOf('profile')).toEqual([authGuard]);
  });

  describe('permissions', () => {
    let asked: string[];
    const state = { url: '/somewhere' } as RouterStateSnapshot;

    beforeEach(() => {
      asked = [];
      TestBed.configureTestingModule({
        providers: [
          ...provideTestBedDefaults(),
          {
            provide: AuthService,
            useValue: { isAuthenticated: () => true, permissionsLoaded: () => true, permissionsLoaded$: new BehaviorSubject(true) }
          },
          {
            provide: PermissionsService,
            useValue: {
              hasPermission: (permission: string) => {
                asked.push(permission);
                return true;
              }
            }
          }
        ]
      });
    });

    /** The permissions a page asks for, in the order its guards run. */
    const permissionsOf = (page: Page): string[] => {
      asked = [];
      for (const guard of page.guards.filter((g) => g !== authGuard && g !== loginGuard)) {
        TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, state));
      }
      return asked;
    };

    it('asks for the right permission on every protected page', () => {
      const actual = Object.fromEntries(
        pages.filter((page) => !PUBLIC_PAGES.includes(page.path) && !['login', 'profile'].includes(page.path)).map((page) => [page.path, permissionsOf(page)])
      );

      expect(actual).toEqual(PERMISSIONS);
    });
  });
});
