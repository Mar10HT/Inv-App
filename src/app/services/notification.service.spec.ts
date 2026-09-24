import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { NotificationService } from './notification.service';
import { LoggerService } from './logger.service';
import { provideTestBedDefaults } from '../../testing/test-providers';

describe('NotificationService.guardExport', () => {
  let service: NotificationService;
  let errorSpy: jasmine.Spy;
  let logSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(NotificationService);
    errorSpy = spyOn(service, 'error');
    logSpy = spyOn(TestBed.inject(LoggerService), 'error');
  });

  it('runs the task and stays quiet when it succeeds', async () => {
    const task = jasmine.createSpy('task').and.resolveTo(undefined);

    await service.guardExport(task);

    expect(task).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('shows the export error and logs the cause instead of rejecting', async () => {
    const cause = new Error('chunk failed to load');

    await expectAsync(service.guardExport(() => Promise.reject(cause))).toBeResolved();

    expect(errorSpy).toHaveBeenCalledOnceWith('NOTIFICATIONS.ERRORS.EXPORT_FAILED');
    expect(logSpy).toHaveBeenCalledOnceWith(jasmine.any(String), cause);
  });

  it('also handles a task that throws synchronously', async () => {
    await expectAsync(
      service.guardExport(() => {
        throw new Error('sync failure');
      })
    ).toBeResolved();

    expect(errorSpy).toHaveBeenCalledOnceWith('NOTIFICATIONS.ERRORS.EXPORT_FAILED');
  });
});

describe('NotificationService.reportErrors', () => {
  let service: NotificationService;
  let errorSpy: jasmine.Spy;
  let source: ReturnType<typeof signal<string | null>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(NotificationService);
    errorSpy = spyOn(service, 'error');
  });

  const watch = (initial: string | null): void => {
    source = signal<string | null>(initial);
    TestBed.runInInjectionContext(() => service.reportErrors(source));
    TestBed.tick();
  };

  it('shows an error when the source gets a message', () => {
    watch(null);

    source.set('Could not send the loan');
    TestBed.tick();

    expect(errorSpy).toHaveBeenCalledOnceWith('Could not send the loan');
  });

  it('ignores a message that was already there when it started watching', () => {
    watch('Left over from an earlier visit');

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('stays quiet when the message is cleared', () => {
    watch(null);
    source.set('Boom');
    TestBed.tick();
    errorSpy.calls.reset();

    source.set(null);
    TestBed.tick();

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reports the same message again when it fails again after being cleared', () => {
    watch(null);

    source.set('Boom');
    TestBed.tick();
    source.set(null);
    TestBed.tick();
    source.set('Boom');
    TestBed.tick();

    expect(errorSpy).toHaveBeenCalledTimes(2);
  });
});
