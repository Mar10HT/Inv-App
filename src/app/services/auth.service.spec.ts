import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
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

  beforeEach(() => {
    localStorage.clear();
    ws = jasmine.createSpyObj<WebSocketService>('WebSocketService', ['connect', 'disconnect']);
    permissions = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['loadPermissions', 'clearPermissions']);

    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: WebSocketService, useValue: ws },
        { provide: PermissionsService, useValue: permissions }
      ]
    });
    backend = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
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
});
