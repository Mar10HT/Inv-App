import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const logger = inject(LoggerService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            // Unauthorized - clear auth and redirect to login
            authService.logout();
            errorMessage = 'Session expired. Please log in again.';
            break;

          case 403:
            // Forbidden
            errorMessage = 'You do not have permission to perform this action.';
            break;

          case 404:
            errorMessage = 'The requested resource was not found.';
            break;

          case 422:
            // Validation error
            errorMessage = error.error?.message || 'Validation failed.';
            break;

          case 429:
            // Rate limited
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

      // Re-throw with a cleaner error object
      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        originalError: error
      }));
    })
  );
};
