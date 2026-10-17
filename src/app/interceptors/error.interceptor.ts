import { HttpInterceptorFn, HttpErrorResponse, HttpEvent, HttpClient } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import { ApiError, ApiErrorParams, isApiError } from '../interfaces/api-error.interface';
import { environment } from '../../environments/environment';

let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<boolean>(false);

// A 401 from these is the answer itself, refreshing would loop.
const NO_REFRESH_URLS = ['/auth/login', '/auth/logout', '/auth/refresh', '/auth/csrf-token', '/public/'];

// Keys under NOTIFICATIONS.ERRORS, by HTTP status (0 is a network failure).
const ERROR_KEYS: Record<number, string> = {
  0: 'CONNECTION',
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND_RESOURCE',
  409: 'CONFLICT',
  422: 'VALIDATION_FAILED',
  429: 'TOO_MANY_REQUESTS',
  500: 'SERVER',
  502: 'SERVER',
  503: 'SERVER',
  504: 'SERVER',
};

// Statuses whose server message is written for the user. Others could leak internals.
const USER_FACING_STATUSES = [400, 409, 422];

/** Body of a 4xx from the API (see the backend's GlobalExceptionFilter and apiError()). */
interface ServerErrorBody {
  /** English text. Nest sends a list of strings for DTO validation. */
  message?: unknown;
  /** Stable error code, translated under API_ERRORS.<code>. */
  code?: unknown;
  /** Values to interpolate into the translation. */
  params?: unknown;
}

function isParams(value: unknown): value is ApiErrorParams {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The text a 400/409/422 shows the user:
 * - a `code` with an API_ERRORS translation gives that translation, with `params` interpolated
 *   (DTO validation failures arrive as VALIDATION_FAILED and get the generic form message);
 * - a code with no translation yet, or no code at all, keeps the server's own text, so the user
 *   still learns what went wrong, and `onUntranslated` reports it so the translation gets added.
 */
function userFacingError(
  error: HttpErrorResponse,
  translate: TranslateService,
  onUntranslated: (code: string | undefined, message: string) => void,
): ApiError['error'] {
  const body: ServerErrorBody | null = typeof error.error === 'object' ? error.error : null;
  if (!body) return null;

  const code = typeof body.code === 'string' && body.code ? body.code : undefined;
  const params = isParams(body.params) ? body.params : undefined;

  if (code) {
    const key = `API_ERRORS.${code}`;
    const text: unknown = translate.instant(key, localizeParams(params, translate));
    if (typeof text === 'string' && text !== key) return { message: text, code, params };
  }

  // The API sends the message as a list (one entry per failed check for DTO validation).
  const raw = body.message;
  const message = Array.isArray(raw) ? raw.filter((m): m is string => typeof m === 'string').join('. ') : raw;
  if (typeof message !== 'string' || !message) return null;
  onUntranslated(code, message);
  return { message, code, params };
}

/** Statuses arrive as enum values (PENDING); show them the way the user knows them. */
function localizeParams(params: ApiErrorParams | undefined, translate: TranslateService): ApiErrorParams | undefined {
  if (typeof params?.['status'] !== 'string') return params;
  const key = `API_ERRORS.STATUS_VALUES.${params['status']}`;
  const status: unknown = translate.instant(key);
  return typeof status === 'string' && status !== key ? { ...params, status } : params;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // Use Injector instead of inject(AuthService) directly to avoid the circular
  // dependency: AuthService → HttpClient → errorInterceptor → AuthService.
  const injector = inject(Injector);
  const http = inject(HttpClient);
  const logger = inject(LoggerService);
  const translate = inject(TranslateService);

  const toApiError = (error: HttpErrorResponse): ApiError => {
    return {
      status: error.status,
      message: translate.instant(`NOTIFICATIONS.ERRORS.${ERROR_KEYS[error.status] ?? 'UNKNOWN'}`),
      error: USER_FACING_STATUSES.includes(error.status)
        ? userFacingError(error, translate, (code, message) =>
            logger.warn(`Untranslated API error ${code ?? '(no code)'}: add API_ERRORS.${code ?? '<code>'} to the i18n files`, { message, url: req.url }))
        : null,
      originalError: error,
    };
  };

  const retry = (): Observable<HttpEvent<unknown>> => next(req.clone({ withCredentials: true }));

  const refreshThenRetry = (): Observable<HttpEvent<unknown>> => {
    if (isRefreshing) {
      // Another request is already refreshing: wait for it, then retry
      return refreshDone$.pipe(
        filter((done) => done),
        take(1),
        switchMap(() => retry()),
      );
    }

    isRefreshing = true;
    refreshDone$.next(false);
    const finishRefresh = (): void => {
      isRefreshing = false;
      refreshDone$.next(true);
    };

    return http.post(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true }).pipe(
      // Only a failed refresh signs the user out; a failed retry is reported as itself.
      catchError((refreshError: HttpErrorResponse) => {
        finishRefresh();
        injector.get(AuthService).logout().subscribe();
        const unauthorized: ApiError = {
          status: 401,
          message: translate.instant('NOTIFICATIONS.ERRORS.UNAUTHORIZED'),
          error: null,
          originalError: refreshError,
        };
        return throwError(() => unauthorized);
      }),
      switchMap(() => {
        finishRefresh();
        return retry();
      }),
    );
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) =>
      error.status === 401 && !NO_REFRESH_URLS.some((url) => req.url.includes(url))
        ? refreshThenRetry()
        : throwError(() => error),
    ),
    // The one place every failure, retried requests included, becomes an ApiError.
    catchError((error: HttpErrorResponse | ApiError) => {
      if (isApiError(error)) return throwError(() => error);
      const apiError = toApiError(error);
      logger.error('HTTP Error', error, { status: apiError.status, message: apiError.message, url: req.url });
      return throwError(() => apiError);
    }),
  );
};
