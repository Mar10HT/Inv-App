import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { authInterceptor } from './auth.interceptor';
import { CsrfService } from '../services/csrf.service';
import { environment } from '../../environments/environment';

const api = (path: string): string => `${environment.apiUrl}${path}`;

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let csrf: CsrfService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    csrf = TestBed.inject(CsrfService);
    csrf.csrfToken.set('token-123');
  });

  afterEach(() => backend.verify());

  describe('requests to the API', () => {
    it('sends the session cookies', () => {
      http.get(api('/items')).subscribe();

      expect(backend.expectOne(api('/items')).request.withCredentials).toBeTrue();
    });

    it('does not send the CSRF token on reads, which the API does not protect', () => {
      http.get(api('/items')).subscribe();

      expect(backend.expectOne(api('/items')).request.headers.has('x-csrf-token')).toBeFalse();
    });

    ['POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
      it(`sends the CSRF token on a ${method}`, () => {
        http.request(method, api('/items/1'), { body: {} }).subscribe();

        const request = backend.expectOne(api('/items/1')).request;
        expect(request.headers.get('x-csrf-token')).toBe('token-123');
        expect(request.withCredentials).toBeTrue();
      });
    });

    it('uses the token the CSRF service holds at that moment', () => {
      csrf.csrfToken.set('rotated');

      http.post(api('/items'), {}).subscribe();

      expect(backend.expectOne(api('/items')).request.headers.get('x-csrf-token')).toBe('rotated');
    });
  });

  describe('requests that are not for the authenticated API', () => {
    it('leaves a request to another host alone, so cookies and the token never leave the API', () => {
      http.post('https://third-party.example/collect', {}).subscribe();

      const request = backend.expectOne('https://third-party.example/collect').request;
      expect(request.withCredentials).toBeFalse();
      expect(request.headers.has('x-csrf-token')).toBeFalse();
    });

    it('leaves the public endpoints alone', () => {
      http.post(api('/discharge-requests/public/submit'), {}).subscribe();

      const request = backend.expectOne(api('/discharge-requests/public/submit')).request;
      expect(request.withCredentials).toBeFalse();
      expect(request.headers.has('x-csrf-token')).toBeFalse();
    });
  });
});
