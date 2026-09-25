import { HttpInterceptorFn, HttpErrorResponse, HttpEvent, HttpClient } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import { ApiError, isApiError } from '../interfaces/api-error.interface';
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

/** Nest sends a string, or a list of strings for DTO validation. */
function serverMessage(error: HttpErrorResponse): string | null {
  const message = error.error?.message;
  if (Array.isArray(message)) return message.join('. ');
  return typeof message === 'string' ? message : null;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // Use Injector instead of inject(AuthService) directly to avoid the circular
  // dependency: AuthService → HttpClient → errorInterceptor → AuthService.
  const injector = inject(Injector);
  const http = inject(HttpClient);
  const logger = inject(LoggerService);
  const translate = inject(TranslateService);

  const toApiError = (error: HttpErrorResponse): ApiError => {
    const message = USER_FACING_STATUSES.includes(error.status) ? serverMessage(error) : null;
    return {
      status: error.status,
      message: translate.instant(`NOTIFICATIONS.ERRORS.${ERROR_KEYS[error.status] ?? 'UNKNOWN'}`),
      error: message ? { message } : null,
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
