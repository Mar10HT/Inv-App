import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService, REDIRECT_TO_LOGIN } from './auth.service';
import { PermissionsService } from './permissions.service';
import { WebSocketService } from './websocket.service';
import { AuthUser, MeResponse } from '../interfaces/auth.interface';
import { UserRole } from '../interfaces/user.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const user: AuthUser = { id: 'u1', email: 'ana@x.com', name: 'Ana', role: UserRole.USER };
const me: MeResponse = { user, permissions: ['inventory:view'], permissionsVersion: 1 };
const api = (path: string): string => `${environment.apiUrl}/auth${path}`;

describe('AuthService', () => {
  let service: AuthService;
  let backend: HttpTestingController;
  let ws: jasmine.SpyObj<WebSocketService>;
  let permissions: jasmine.SpyObj<PermissionsService>;
  let navigate: jasmine.Spy;
  let redirectToLogin: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    redirectToLogin = jasmine.createSpy('redirectToLogin');
    ws = jasmine.createSpyObj<WebSocketService>('WebSocketService', ['connect', 'disconnect']);
    permissions = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['loadPermissions', 'clearPermissions']);

    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: WebSocketService, useValue: ws },
        { provide: PermissionsService, useValue: permissions },
        { provide: REDIRECT_TO_LOGIN, useValue: redirectToLogin }
      ]
    });
    backend = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    service.ngOnDestroy(); // stops the permissions polling
    localStorage.clear();
  });

  const signIn = (): void => {
    service.login({ email: 'ana@x.com', password: 'abcdef' }).subscribe();
    backend.expectOne(api('/login')).flush({ user, expires_in: 900 });
    backend.expectOne(api('/me')).flush(me);
  };

  describe('login', () => {
    it('loads the session and the permissions', () => {
      signIn();

      expect(service.isAuthenticated()).toBeTrue();
      expect(service.currentUser()).toEqual(user);
      expect(permissions.loadPermissions).toHaveBeenCalledOnceWith(['inventory:view']);
    });

    it('opens the real time socket once the session is established, for this user', () => {
      signIn();

      expect(ws.connect).toHaveBeenCalledTimes(1);
    });

    it('replaces a socket left over from an earlier session instead of reusing it', () => {
      signIn();

      // connect() does nothing when a socket exists, so a stale one has to be closed first
      expect(ws.disconnect).toHaveBeenCalledBefore(ws.connect);
    });

    it('does not open the socket when the credentials are refused', () => {
      service.login({ email: 'ana@x.com', password: 'wrong' }).subscribe({ error: () => undefined });
      backend.expectOne(api('/login')).flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(ws.connect).not.toHaveBeenCalled();
    });

    it('closes the socket and clears the session when /auth/me cannot be verified', () => {
      service.login({ email: 'ana@x.com', password: 'abcdef' }).subscribe();
      backend.expectOne(api('/login')).flush({ user, expires_in: 900 });
      backend.expectOne(api('/me')).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.isAuthenticated()).toBeFalse();
      expect(ws.disconnect).toHaveBeenCalledTimes(1);
      expect(ws.connect).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears the session and the stored user', () => {
      signIn();

      service.logout().subscribe();
      backend.expectOne(api('/logout')).flush({});

      expect(service.isAuthenticated()).toBeFalse();
      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(permissions.clearPermissions).toHaveBeenCalled();
    });

    it('closes the socket so the next user does not inherit this one\'s rooms', () => {
      signIn();
      ws.disconnect.calls.reset();

      service.logout().subscribe();
      backend.expectOne(api('/logout')).flush({});

      expect(ws.disconnect).toHaveBeenCalledTimes(1);
    });

    it('reloads the app on the login page, so nothing of this user stays in memory', () => {
      signIn();

      service.logout().subscribe();
      backend.expectOne(api('/logout')).flush({});

      // The singleton services keep the data they loaded (inventory, loans, warehouses): a
      // navigation inside the app would show it to whoever signs in next in this tab.
      expect(redirectToLogin).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('closes the socket as soon as signing out starts, without waiting for the server', () => {
      signIn();
      ws.disconnect.calls.reset();

      service.logout().subscribe();

      // the /logout request has not been answered yet
      expect(ws.disconnect).toHaveBeenCalledTimes(1);
      backend.expectOne(api('/logout'));
    });

    it('still signs out locally when the server call fails', () => {
      signIn();

      service.logout().subscribe();
      backend.expectOne(api('/logout')).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('account calls', () => {
    it('updateProfile posts the change and keeps the merged user in memory and in storage', () => {
      signIn();
      const change = { name: 'Ana María', email: 'ana@x.com' };

      service.updateProfile(change).subscribe();
      const request = backend.expectOne(api('/profile'));
      expect(request.request.body).toEqual(change);
      expect(request.request.withCredentials).toBeTrue();
      // The API may answer with only what changed: the rest of the user must be kept
      request.flush({ user: { name: 'Ana María' } });

      expect(service.currentUser()).toEqual({ ...user, name: 'Ana María' });
      expect(JSON.parse(localStorage.getItem('auth_user') as string)).toEqual({ ...user, name: 'Ana María' });
    });

    const calls: [string, () => void, string, string, unknown, boolean][] = [
      ['changePassword', () => service.changePassword({ currentPassword: 'old', newPassword: 'new' }).subscribe(), 'POST', '/change-password', { currentPassword: 'old', newPassword: 'new' }, true],
      ['forgotPassword', () => service.forgotPassword('ana@x.com').subscribe(), 'POST', '/forgot-password', { email: 'ana@x.com' }, false],
      ['resetPassword', () => service.resetPassword('tok', 'new').subscribe(), 'POST', '/reset-password/tok', { newPassword: 'new' }, false],
      ['getPendingResets', () => service.getPendingResets().subscribe(), 'GET', '/pending-resets', null, true],
      ['generateResetLink', () => service.generateResetLink('u9').subscribe(), 'POST', '/admin/generate-reset-link/u9', {}, true]
    ];

    for (const [name, call, method, path, body, withCredentials] of calls) {
      it(`${name} sends ${method} ${path}${withCredentials ? ' with the session cookie' : ''}`, () => {
        call();

        const request = backend.expectOne(api(path));
        expect(request.request.method).toBe(method);
        expect(request.request.body).toEqual(body);
        expect(request.request.withCredentials).toBe(withCredentials);
        request.flush({});
      });
    }
  });

  describe('permissions polling', () => {
    const minute = (): void => jasmine.clock().tick(60_000);

    beforeEach(() => jasmine.clock().install());
    // Stop the poll while the fake clock is still installed, so the real clearInterval gets the fake id it made
    afterEach(() => {
      service.ngOnDestroy();
      jasmine.clock().uninstall();
    });

    it('asks /auth/me every minute and reloads the permissions only when their version changed', () => {
      signIn();
      permissions.loadPermissions.calls.reset();

      minute();
      backend.expectOne(api('/me')).flush(me);
      expect(permissions.loadPermissions).not.toHaveBeenCalled();

      minute();
      backend.expectOne(api('/me')).flush({ ...me, permissions: ['inventory:view', 'inventory:edit'], permissionsVersion: 2 });
      expect(permissions.loadPermissions).toHaveBeenCalledOnceWith(['inventory:view', 'inventory:edit']);

      minute();
      backend.expectOne(api('/me')).flush({ ...me, permissionsVersion: 2 });
      expect(permissions.loadPermissions).toHaveBeenCalledTimes(1);
    });

    it('keeps polling after a check fails', () => {
      signIn();

      minute();
      backend.expectOne(api('/me')).flush(null, { status: 500, statusText: 'Server Error' });
      minute();

      const next = backend.expectOne(api('/me'));
      expect(next.request.method).toBe('GET');
      next.flush(me);
    });

    it('runs a single poll even when the user signs in twice', () => {
      signIn();
      signIn();

      minute();

      const polls = backend.match(api('/me'));
      expect(polls).toHaveSize(1);
      polls[0].flush(me);
    });

    it('stops polling when the user signs out', () => {
      signIn();
      service.logout().subscribe();
      backend.expectOne(api('/logout')).flush({});

      minute();

      backend.expectNone(api('/me'));
    });
  });
});

describe('AuthService startup', () => {
  let service: AuthService;
  let backend: HttpTestingController;
  let ws: jasmine.SpyObj<WebSocketService>;
  let permissions: jasmine.SpyObj<PermissionsService>;
  let navigate: jasmine.Spy;

  // The stored user is read while the service is constructed, so it has to be there first
  const create = (stored?: string): void => {
    localStorage.clear();
    if (stored !== undefined) localStorage.setItem('auth_user', stored);
    ws = jasmine.createSpyObj<WebSocketService>('WebSocketService', ['connect', 'disconnect']);
    permissions = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['loadPermissions', 'clearPermissions']);
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: WebSocketService, useValue: ws },
        { provide: PermissionsService, useValue: permissions },
        { provide: REDIRECT_TO_LOGIN, useValue: jasmine.createSpy('redirectToLogin') }
      ]
    });
    backend = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    service = TestBed.inject(AuthService);
  };

  afterEach(() => {
    service.ngOnDestroy();
    localStorage.clear();
  });

  it('starts signed out, with the permissions loaded, when nothing is stored', () => {
    create();

    backend.expectNone(api('/me'));
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.permissionsLoaded()).toBeTrue();
    expect(service.permissionsLoaded$.value).toBeTrue();
  });

  it('ignores a stored user it cannot read', () => {
    create('{not json');

    backend.expectNone(api('/me'));
    expect(service.currentUser()).toBeNull();
    expect(service.permissionsLoaded()).toBeTrue();
  });

  it('trusts the stored user right away and refreshes the session in the background', () => {
    create(JSON.stringify(user));

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()).toEqual(user);
    expect(service.permissionsLoaded()).toBeFalse();

    backend.expectOne(api('/me')).flush(me);

    expect(permissions.loadPermissions).toHaveBeenCalledOnceWith(['inventory:view']);
    expect(service.permissionsLoaded()).toBeTrue();
    expect(service.permissionsLoaded$.value).toBeTrue();
    expect(ws.connect).toHaveBeenCalledTimes(1);
  });

  it('signs out locally and goes to the login page when the stored session cannot be verified', () => {
    create(JSON.stringify(user));

    backend.expectOne(api('/me')).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(permissions.clearPermissions).toHaveBeenCalled();
    expect(service.permissionsLoaded()).toBeTrue();
    expect(navigate).toHaveBeenCalledOnceWith(['/login']);
  });
});
