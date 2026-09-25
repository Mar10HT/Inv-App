import { Injectable, InjectionToken, inject } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from '../../environments/environment';

/** The part of Sentry that reports errors, injected so specs can replace it. */
export const SENTRY = new InjectionToken<Pick<typeof Sentry, 'captureException' | 'captureMessage'>>('SENTRY', {
  providedIn: 'root',
  factory: () => Sentry
});

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private sentry = inject(SENTRY);

  /**
   * Log informational messages
   * Only logs in development mode
   */
  log(message: string, ...args: unknown[]): void {
    if (!environment.production) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning messages
   * Logs in both development and production
   */
  warn(message: string, ...args: unknown[]): void {
    if (!environment.production) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log error messages
   * Logs in both development and production
   * In production, errors are also reported to Sentry (no-op if Sentry was never
   * initialized, e.g. no DSN configured — see sentry-init.ts).
   */
  error(message: string, error?: unknown, ...args: unknown[]): void {
    const errorMessage = `[ERROR] ${message}`;
    console.error(errorMessage, error, ...args);

    if (environment.production) {
      if (error instanceof Error) {
        this.sentry.captureException(error, { extra: { message, args } });
      } else {
        this.sentry.captureMessage(errorMessage, { level: 'error', extra: { error, args } });
      }
    }
  }

  /**
   * Log debug messages
   * Only logs in development mode
   */
  debug(message: string, ...args: unknown[]): void {
    if (!environment.production) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info messages with data
   * Useful for tracking user actions or data flow
   */
  info(message: string, data?: unknown): void {
    if (!environment.production) {
      if (data) {
        console.info(`[INFO] ${message}`, data);
      } else {
        console.info(`[INFO] ${message}`);
      }
    }
  }
}
