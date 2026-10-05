import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { NotificationService } from './notification.service';
import { CustomSnackbar, CustomSnackbarData } from '../components/shared/custom-snackbar/custom-snackbar';
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

describe('NotificationService messages', () => {
  let service: NotificationService;
  let open: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(NotificationService);
    open = spyOn(TestBed.inject(MatSnackBar), 'openFromComponent');
  });

  const config = (): { data: CustomSnackbarData; duration: number } => open.calls.mostRecent().args[1];

  it('shows each kind of message with its own type and default duration', () => {
    const cases: [() => void, CustomSnackbarData['type'], number][] = [
      [() => service.success('MSG'), 'success', 3000],
      [() => service.error('MSG'), 'error', 5000],
      [() => service.warning('MSG'), 'warning', 4000],
      [() => service.info('MSG'), 'info', 3000]
    ];

    for (const [show, type, duration] of cases) {
      show();

      expect(open.calls.mostRecent().args[0]).toBe(CustomSnackbar);
      expect(config().data).toEqual({ message: 'MSG', type });
      expect(config().duration).toBe(duration);
    }
  });

  it('lets the caller choose the duration', () => {
    service.info('MSG', { duration: 9000 });

    expect(config().duration).toBe(9000);
  });

  it('translates the message key before showing it', () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { HELLO: 'Hello {{name}}' });
    translate.use('en');

    service.success('HELLO', { interpolateParams: { name: 'Ana' } });

    expect(config().data.message).toBe('Hello Ana');
  });

  describe('created, updated and deleted', () => {
    let success: jasmine.Spy;

    beforeEach(() => {
      success = spyOn(service, 'success');
    });

    const cases: [string, (name?: string) => void, string][] = [
      ['created', (name) => service.created('ENTITY', name), 'CREATED'],
      ['updated', (name) => service.updated('ENTITY', name), 'UPDATED'],
      ['deleted', (name) => service.deleted('ENTITY', name), 'DELETED']
    ];

    for (const [label, notify, key] of cases) {
      it(`says what was ${label}`, () => {
        notify();

        expect(success).toHaveBeenCalledOnceWith(`NOTIFICATIONS.${key}`, { interpolateParams: { entity: 'ENTITY' } });
      });

      it(`says what was ${label} and its name`, () => {
        notify('Laptop');

        expect(success).toHaveBeenCalledOnceWith(`NOTIFICATIONS.${key}_WITH_NAME`, {
          interpolateParams: { entity: 'ENTITY', name: 'Laptop' }
        });
      });
    }
  });

  describe('handleError', () => {
    let error: jasmine.Spy;

    beforeEach(() => {
      error = spyOn(service, 'error');
    });

    const fail = (status: number, body?: unknown, message = ''): HttpErrorResponse =>
      Object.assign(new HttpErrorResponse({ status, error: body }), { message });

    const statuses: [number, string][] = [
      [0, 'NOTIFICATIONS.ERRORS.CONNECTION'],
      [401, 'NOTIFICATIONS.ERRORS.UNAUTHORIZED'],
      [403, 'NOTIFICATIONS.ERRORS.FORBIDDEN'],
      [409, 'NOTIFICATIONS.ERRORS.CONFLICT'],
      [500, 'NOTIFICATIONS.ERRORS.SERVER'],
      [503, 'NOTIFICATIONS.ERRORS.SERVER']
    ];

    for (const [status, key] of statuses) {
      it(`answers a ${status} with its own message`, () => {
        service.handleError(fail(status));

        expect(error).toHaveBeenCalledOnceWith(key);
      });
    }

    it('names the missing thing on a 404 when it is given', () => {
      service.handleError(fail(404), 'ENTITY');

      expect(error).toHaveBeenCalledOnceWith('NOTIFICATIONS.ERRORS.NOT_FOUND', { interpolateParams: { entity: 'ENTITY' } });
    });

    it('leaves the name out of a 404 when it is not given', () => {
      service.handleError(fail(404));

      expect(error).toHaveBeenCalledOnceWith('NOTIFICATIONS.ERRORS.NOT_FOUND', { interpolateParams: { entity: '' } });
    });

    it('shows the message the API sent for any other status', () => {
      service.handleError(fail(400, { message: 'Name is required' }, 'Http failure'));

      expect(error).not.toHaveBeenCalled();
      expect(config().data).toEqual({ message: 'Name is required', type: 'error' });
      expect(config().duration).toBe(5000);
    });

    it('falls back to the message of the response itself', () => {
      service.handleError(fail(400, null, 'Http failure response'));

      expect(config().data.message).toBe('Http failure response');
    });

    it('says the error is unknown when there is nothing to show', () => {
      service.handleError(fail(400));

      expect(error).toHaveBeenCalledOnceWith('NOTIFICATIONS.ERRORS.UNKNOWN');
    });
  });
});
