import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
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

          return http.post<any>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true }).pipe(
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
                message: 'Session expired. Please log in again.',
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
      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        errorMessage = error.error.message;
      } else {
        switch (error.status) {
          case 403:
            errorMessage = 'You do not have permission to perform this action.';
            break;

          case 404:
            errorMessage = 'The requested resource was not found.';
            break;

          case 422:
            errorMessage = error.error?.message || 'Validation failed.';
            break;

          case 429:
            errorMessage = 'Too many requests. Please wait a moment.';
            break;

          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage = 'Server error. Please try again later.';
            break;

          default:
            errorMessage = error.error?.message || error.message || 'An error occurred';
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
