import { TestBed } from '@angular/core/testing';

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
