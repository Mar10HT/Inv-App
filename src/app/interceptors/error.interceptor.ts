import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import { environment } from '../../environments/environment';

let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<boolean>(false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // Use Injector instead of inject(AuthService) directly to avoid the circular
  // dependency: AuthService → HttpClient → errorInterceptor → AuthService.
  const injector = inject(Injector);
  const http = inject(HttpClient);
  const logger = inject(LoggerService);
  const translate = inject(TranslateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Auto-refresh on 401 (skip auth endpoints to avoid loops)
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/logout') &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/csrf-token') &&
        !req.url.includes('/public/')
      ) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshDone$.next(false);

          return http.post<{ access_token: string }>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true }).pipe(
            switchMap(() => {
              isRefreshing = false;
              refreshDone$.next(true);
              return next(req.clone({ withCredentials: true }));
            }),
            catchError((refreshError) => {
              isRefreshing = false;
              refreshDone$.next(true);
              injector.get(AuthService).logout().subscribe();
              return throwError(() => ({
                status: 401,
                message: translate.instant('NOTIFICATIONS.ERRORS.UNAUTHORIZED'),
                originalError: refreshError,
              }));
            }),
          );
        }

        // Another request got 401 while already refreshing - wait and retry
        return refreshDone$.pipe(
          filter((done) => done),
          take(1),
          switchMap(() => next(req.clone({ withCredentials: true }))),
        );
      }

      // Handle other errors
      let errorMessage = translate.instant('NOTIFICATIONS.ERRORS.UNKNOWN');

      if (error.error instanceof ErrorEvent) {
        errorMessage = error.error.message;
      } else {
        switch (error.status) {
          case 403:
            errorMessage = translate.instant('NOTIFICATIONS.ERRORS.FORBIDDEN');
            break;

          case 404:
            errorMessage = translate.instant('NOTIFICATIONS.ERRORS.NOT_FOUND_RESOURCE');
            break;

          case 422:
            errorMessage = translate.instant('NOTIFICATIONS.ERRORS.VALIDATION_FAILED');
            if (!environment.production) {
              logger.error('Validation error detail (dev only)', error.error?.message, { url: req.url });
            }
            break;

          case 429:
            errorMessage = translate.instant('NOTIFICATIONS.ERRORS.TOO_MANY_REQUESTS');
            break;

          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage = translate.instant('NOTIFICATIONS.ERRORS.SERVER');
            break;

          default:
            errorMessage = translate.instant('NOTIFICATIONS.ERRORS.UNKNOWN');
            if (!environment.production) {
              logger.error('Unhandled HTTP error detail (dev only)', error.error?.message || error.message, { url: req.url });
            }
        }
      }

      logger.error('HTTP Error', error, {
        status: error.status,
        message: errorMessage,
        url: req.url
      });

      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        originalError: error
      }));
    })
  );
};
