import * as Sentry from '@sentry/angular';
import { environment } from '../../environments/environment';

/**
 * Initializes Sentry error tracking for the application.
 *
 * No-ops cleanly when `environment.sentryDsn` is empty (e.g. no Sentry project
 * has been provisioned yet). Once a real DSN is set in the environment files,
 * this activates automatically — no other code changes required.
 *
 * Must be called once, as early as possible, before `bootstrapApplication(...)`.
 */
export function initSentry(): void {
  if (!environment.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
  });
}
