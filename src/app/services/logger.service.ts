import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  /**
   * Log informational messages
   * Only logs in development mode
   */
  log(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning messages
   * Logs in both development and production
   */
  warn(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log error messages
   * Logs in both development and production
   * In production, you could send errors to a tracking service (Sentry, LogRocket, etc.)
   */
  error(message: string, error?: any, ...args: any[]): void {
    const errorMessage = `[ERROR] ${message}`;

    if (environment.production) {
      // In production, send to error tracking service
      // Example: Sentry.captureException(error, { extra: { message, ...args } });
      console.error(errorMessage, error, ...args);
    } else {
      console.error(errorMessage, error, ...args);
    }
  }

  /**
   * Log debug messages
   * Only logs in development mode
   */
  debug(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info messages with data
   * Useful for tracking user actions or data flow
   */
  info(message: string, data?: any): void {
    if (!environment.production) {
      if (data) {
        console.info(`[INFO] ${message}`, data);
      } else {
        console.info(`[INFO] ${message}`);
      }
    }
  }
}
