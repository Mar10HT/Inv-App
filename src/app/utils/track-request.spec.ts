import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';

import { RequestTracker, trackRequest } from './track-request';
import { LoggerService } from '../services/logger.service';

describe('trackRequest', () => {
  let tracker: RequestTracker;
  let logger: jasmine.SpyObj<LoggerService>;

  const run = <T>(request$: Parameters<typeof trackRequest<T>>[0]): { values: (T | null)[]; done: () => boolean } => {
    const values: (T | null)[] = [];
    let completed = false;
    trackRequest(request$, tracker, 'Error doing it', 'THINGS.DO_ERROR').subscribe({
      next: (value) => values.push(value),
      complete: () => (completed = true)
    });
    return { values, done: () => completed };
  };

  beforeEach(() => {
    logger = jasmine.createSpyObj<LoggerService>('LoggerService', ['error']);
    tracker = {
      loading: signal(false),
      error: signal<string | null>(null),
      logger,
      translate: { instant: (key: string) => `translated:${key}` } as unknown as TranslateService
    };
  });

  it('does nothing until it is subscribed', () => {
    tracker.error.set('old failure');
    const request$ = trackRequest(new Subject<string>(), tracker, 'Error doing it', 'THINGS.DO_ERROR');

    expect(tracker.loading()).toBeFalse();
    expect(tracker.error()).toBe('old failure');

    request$.subscribe();
    expect(tracker.loading()).toBeTrue();
  });

  it('is loading while the request runs and stops when it answers', () => {
    const request$ = new Subject<string>();
    run(request$);

    expect(tracker.loading()).toBeTrue();

    request$.next('ok');
    request$.complete();
    expect(tracker.loading()).toBeFalse();
  });

  it('clears the error of the previous request when a new one starts', () => {
    tracker.error.set('old failure');
    run(new Subject<string>());

    expect(tracker.error()).toBeNull();
  });

  it('passes the value through untouched', () => {
    const { values, done } = run(of('ok'));

    expect(values).toEqual(['ok']);
    expect(done()).toBeTrue();
  });

  describe('when the request fails', () => {
    it('resolves with null instead of an error', () => {
      const { values, done } = run(throwError(() => ({ message: 'boom' })));

      expect(values).toEqual([null]);
      expect(done()).toBeTrue();
    });

    it('stops loading', () => {
      run(throwError(() => ({ message: 'boom' })));

      expect(tracker.loading()).toBeFalse();
    });

    it('logs the failure with the given context', () => {
      const failure = { message: 'boom' };
      run(throwError(() => failure));

      expect(logger.error).toHaveBeenCalledOnceWith('Error doing it', failure);
    });

    it('shows the message the API sent', () => {
      run(throwError(() => ({ error: { message: 'Not enough stock' }, message: 'Http failure' })));

      expect(tracker.error()).toBe('Not enough stock');
    });

    it('falls back to the message of the error itself', () => {
      run(throwError(() => ({ message: 'Http failure' })));

      expect(tracker.error()).toBe('Http failure');
    });

    it('falls back to the translated text when the error has no message', () => {
      run(throwError(() => ({})));

      expect(tracker.error()).toBe('translated:THINGS.DO_ERROR');
    });
  });

  it('stops loading when the caller unsubscribes', () => {
    const request$ = new Subject<string>();
    const subscription = trackRequest(request$, tracker, 'Error doing it', 'THINGS.DO_ERROR').subscribe();

    subscription.unsubscribe();

    expect(tracker.loading()).toBeFalse();
  });
});
