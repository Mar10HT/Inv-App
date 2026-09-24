import { WritableSignal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, defer, finalize, of } from 'rxjs';

import { LoggerService } from '../services/logger.service';

/** What a service hands over so its requests can report their state through it. */
export interface RequestTracker {
  loading: WritableSignal<boolean>;
  error: WritableSignal<string | null>;
  logger: LoggerService;
  translate: TranslateService;
}

/**
 * Runs a request that changes data: `loading` is true while it runs and `error` is cleared when it starts.
 * A failure is logged, put in `error` (the API message, then the error message, then the translated
 * `fallbackKey`) and the caller gets null instead of an error.
 */
export function trackRequest<T>(
  request$: Observable<T>,
  tracker: RequestTracker,
  logMessage: string,
  fallbackKey: string
): Observable<T | null> {
  return defer(() => {
    tracker.loading.set(true);
    tracker.error.set(null);

    return request$.pipe(
      catchError((err) => {
        tracker.logger.error(logMessage, err);
        tracker.error.set(err.error?.message || err.message || tracker.translate.instant(fallbackKey));
        return of(null);
      }),
      finalize(() => tracker.loading.set(false))
    );
  });
}
