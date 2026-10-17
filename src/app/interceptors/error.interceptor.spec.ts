import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { TranslateLoader, TranslateModule, TranslateService, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import { ApiError } from '../interfaces/api-error.interface';
import { environment } from '../../environments/environment';

class EmptyLoader implements TranslateLoader {
  getTranslation(): Observable<TranslationObject> {
    return of({} as TranslationObject);
  }
}

const api = (path: string): string => `${environment.apiUrl}${path}`;

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let logout: jasmine.Spy;

  /** Sends a GET and resolves with either the body or the error the caller would see. */
  const get = (path: string): Promise<{ data?: unknown; error?: ApiError }> =>
    new Promise((resolve) =>
      http.get(api(path)).subscribe({
        next: (data) => resolve({ data }),
        error: (error: ApiError) => resolve({ error })
      })
    );

  const fail = (path: string, status: number, body: object | string | null = null): void => {
    backend.expectOne(api(path)).flush(body, { status, statusText: 'x' });
  };

  beforeEach(() => {
    logout = jasmine.createSpy('logout').and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        importProvidersFrom(TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: EmptyLoader } })),
        { provide: AuthService, useValue: { logout } },
        { provide: LoggerService, useValue: { error: jasmine.createSpy('error'), warn: jasmine.createSpy('warn') } }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('error mapping', () => {
    const cases: [number, string][] = [
      [0, 'NOTIFICATIONS.ERRORS.CONNECTION'],
      [400, 'NOTIFICATIONS.ERRORS.VALIDATION_FAILED'],
      [403, 'NOTIFICATIONS.ERRORS.FORBIDDEN'],
      [404, 'NOTIFICATIONS.ERRORS.NOT_FOUND_RESOURCE'],
      [409, 'NOTIFICATIONS.ERRORS.CONFLICT'],
      [422, 'NOTIFICATIONS.ERRORS.VALIDATION_FAILED'],
      [429, 'NOTIFICATIONS.ERRORS.TOO_MANY_REQUESTS'],
      [500, 'NOTIFICATIONS.ERRORS.SERVER'],
      [503, 'NOTIFICATIONS.ERRORS.SERVER'],
      [418, 'NOTIFICATIONS.ERRORS.UNKNOWN']
    ];

    cases.forEach(([status, key]) => {
      it(`maps a ${status} to ${key}`, async () => {
        const result = get('/things');
        fail('/things', status);

        const { error } = await result;
        expect(error?.status).toBe(status);
        expect(error?.message).toBe(key);
        expect(error?.originalError).toBeDefined();
      });
    });

    it('exposes the server message of a 400 so forms can show it', async () => {
      const result = get('/things');
      fail('/things', 400, { statusCode: 400, message: 'Email already in use' });

      const { error } = await result;
      expect(error?.error?.message).toBe('Email already in use');
      expect(error?.message).toBe('NOTIFICATIONS.ERRORS.VALIDATION_FAILED');
    });

    it('joins the list of messages the API sends when there is no translation for them', async () => {
      const result = get('/things');
      fail('/things', 400, { message: ['email must be an email', 'password is too short'] });

      const { error } = await result;
      expect(error?.error?.message).toBe('email must be an email. password is too short');
    });

    describe('with an error code', () => {
      beforeEach(() => {
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('es', {
          NOTIFICATIONS: { ERRORS: { VALIDATION_FAILED: 'Error de validación.', CONFLICT: 'Conflicto.' } },
          API_ERRORS: {
            VALIDATION_FAILED: 'Revisa los datos del formulario.',
            INSUFFICIENT_STOCK: 'Cantidad insuficiente de {{item}}. Disponible: {{available}}, solicitado: {{requested}}.',
            SALE_NOT_EDITABLE: 'No se puede editar una venta en estado {{status}}.',
            EMAIL_ALREADY_EXISTS: 'Ya existe un usuario con este correo electrónico.',
            STATUS_VALUES: { CANCELLED: 'Cancelado' }
          }
        });
        translate.use('es');
      });

      it('shows the translation of the code with its params', async () => {
        const params = { item: 'Mouse', available: 1, requested: 3 };
        const result = get('/things');
        fail('/things', 400, {
          statusCode: 400,
          message: ['Insufficient quantity for item Mouse. Available: 1, Requested: 3'],
          code: 'INSUFFICIENT_STOCK',
          params
        });

        const { error } = await result;
        expect(error?.error).toEqual({
          message: 'Cantidad insuficiente de Mouse. Disponible: 1, solicitado: 3.',
          code: 'INSUFFICIENT_STOCK',
          params
        });
      });

      it('translates a status param the way the user knows it', async () => {
        const result = get('/things');
        fail('/things', 400, {
          message: ['Cannot edit a sale in CANCELLED status'],
          code: 'SALE_NOT_EDITABLE',
          params: { status: 'CANCELLED' }
        });

        expect((await result).error?.error?.message).toBe('No se puede editar una venta en estado Cancelado.');
      });

      it('translates a code sent with a 409', async () => {
        const result = get('/things');
        fail('/things', 409, { message: ['User with this email already exists'], code: 'EMAIL_ALREADY_EXISTS' });

        expect((await result).error?.error?.message).toBe('Ya existe un usuario con este correo electrónico.');
      });

      it('falls back to the server message when the code has no translation', async () => {
        const result = get('/things');
        fail('/things', 400, { message: ['Loan numbering is exhausted'], code: 'SOMETHING_NEW' });

        const { error } = await result;
        expect(error?.error?.message).toBe('Loan numbering is exhausted');
        expect(error?.error?.code).toBe('SOMETHING_NEW');
      });

      it('shows the generic form message for a DTO validation failure, not the English list', async () => {
        const result = get('/things');
        fail('/things', 400, { message: ['email must be an email'], code: 'VALIDATION_FAILED' });

        expect((await result).error?.error?.message).toBe('Revisa los datos del formulario.');
      });

      it('keeps the server text of an error that has no code, and warns so a code gets added', async () => {
        const logger = TestBed.inject(LoggerService) as unknown as { warn: jasmine.Spy };
        const result = get('/things');
        fail('/things', 409, { message: ['A record with this value already exists'] });

        expect((await result).error?.error?.message).toBe('A record with this value already exists');
        expect(logger.warn).toHaveBeenCalledTimes(1);
      });

      it('does not warn about a translated code', async () => {
        const logger = TestBed.inject(LoggerService) as unknown as { warn: jasmine.Spy };
        const result = get('/things');
        fail('/things', 409, { message: ['User with this email already exists'], code: 'EMAIL_ALREADY_EXISTS' });

        await result;
        expect(logger.warn).not.toHaveBeenCalled();
      });
    });

    it('exposes the server message of a 409', async () => {
      const result = get('/things');
      fail('/things', 409, { message: 'Item already exists' });

      expect((await result).error?.error?.message).toBe('Item already exists');
    });

    it('does not expose server messages of 5xx or 404 responses', async () => {
      const server = get('/things');
      fail('/things', 500, { message: 'connect ECONNREFUSED 10.0.0.5:5432' });
      expect((await server).error?.error).toBeNull();

      const missing = get('/other');
      fail('/other', 404, { message: 'Cannot GET /other' });
      expect((await missing).error?.error).toBeNull();
    });

    it('passes successful responses through untouched', async () => {
      const result = get('/things');
      backend.expectOne(api('/things')).flush({ ok: true });

      expect((await result).data).toEqual({ ok: true });
    });
  });

  describe('401 handling', () => {
    it('refreshes the session and retries the request once', async () => {
      const result = get('/things');
      fail('/things', 401);
      backend.expectOne(api('/auth/refresh')).flush({});
      backend.expectOne(api('/things')).flush({ ok: true });

      expect((await result).data).toEqual({ ok: true });
      expect(logout).not.toHaveBeenCalled();
    });

    it('runs a single refresh when several requests get a 401 together', async () => {
      const first = get('/a');
      const second = get('/b');
      fail('/a', 401);
      fail('/b', 401);

      backend.expectOne(api('/auth/refresh')).flush({});
      backend.expectOne(api('/a')).flush('a');
      backend.expectOne(api('/b')).flush('b');

      expect((await first).data).toBe('a');
      expect((await second).data).toBe('b');
    });

    it('signs the user out when the refresh itself fails', async () => {
      const result = get('/things');
      fail('/things', 401);
      backend.expectOne(api('/auth/refresh')).flush(null, { status: 401, statusText: 'x' });

      const { error } = await result;
      expect(logout).toHaveBeenCalledTimes(1);
      expect(error?.status).toBe(401);
      expect(error?.message).toBe('NOTIFICATIONS.ERRORS.UNAUTHORIZED');
    });

    it('reports the real error when the retried request fails, without signing the user out', async () => {
      const result = get('/things');
      fail('/things', 401);
      backend.expectOne(api('/auth/refresh')).flush({});
      fail('/things', 404);

      const { error } = await result;
      expect(error?.status).toBe(404);
      expect(error?.message).toBe('NOTIFICATIONS.ERRORS.NOT_FOUND_RESOURCE');
      expect(logout).not.toHaveBeenCalled();
    });

    it('maps the error of a retried request the same way as any other', async () => {
      const result = get('/things');
      fail('/things', 401);
      backend.expectOne(api('/auth/refresh')).flush({});
      fail('/things', 409, { message: 'Item already exists' });

      const { error } = await result;
      expect(error?.status).toBe(409);
      expect(error?.error?.message).toBe('Item already exists');
    });

    it('does not try to refresh a failed login', async () => {
      const result = get('/auth/login');
      fail('/auth/login', 401, { message: 'Invalid credentials' });

      const { error } = await result;
      expect(error?.status).toBe(401);
      backend.expectNone(api('/auth/refresh'));
    });
  });
});
