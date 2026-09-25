import { TestBed } from '@angular/core/testing';

import { LoggerService, SENTRY } from './logger.service';
import { provideTestBedDefaults } from '../../testing/test-providers';
import { environment } from '../../environments/environment';

describe('LoggerService', () => {
  let service: LoggerService;
  let console_: Record<'log' | 'warn' | 'error' | 'debug' | 'info', jasmine.Spy>;
  let sentry: { captureException: jasmine.Spy; captureMessage: jasmine.Spy };

  beforeEach(() => {
    sentry = jasmine.createSpyObj('Sentry', ['captureException', 'captureMessage']);
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults(), { provide: SENTRY, useValue: sentry }] });
    service = TestBed.inject(LoggerService);
    console_ = {
      log: spyOn(console, 'log'),
      warn: spyOn(console, 'warn'),
      error: spyOn(console, 'error'),
      debug: spyOn(console, 'debug'),
      info: spyOn(console, 'info')
    };
  });

  describe('in development', () => {
    it('logs, warns and debugs with a level prefix and the extra arguments', () => {
      service.log('hello', 1);
      service.warn('careful', 2);
      service.debug('detail', 3);

      expect(console_.log).toHaveBeenCalledOnceWith('[INFO] hello', 1);
      expect(console_.warn).toHaveBeenCalledOnceWith('[WARN] careful', 2);
      expect(console_.debug).toHaveBeenCalledOnceWith('[DEBUG] detail', 3);
    });

    it('logs info with its data, or without when there is none', () => {
      service.info('with data', { id: 1 });
      service.info('without data');

      expect(console_.info.calls.allArgs()).toEqual([['[INFO] with data', { id: 1 }], ['[INFO] without data']]);
    });

    it('logs an error with its cause and reports nothing to Sentry', () => {
      const cause = new Error('boom');

      service.error('failed', cause, 'extra');

      expect(console_.error).toHaveBeenCalledOnceWith('[ERROR] failed', cause, 'extra');
      expect(sentry.captureException).not.toHaveBeenCalled();
      expect(sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe('in production', () => {
    beforeEach(() => {
      environment.production = true;
    });

    afterEach(() => {
      environment.production = false;
    });

    it('stays quiet for log, warn, debug and info', () => {
      service.log('hello');
      service.warn('careful');
      service.debug('detail');
      service.info('note', { id: 1 });

      expect(console_.log).not.toHaveBeenCalled();
      expect(console_.warn).not.toHaveBeenCalled();
      expect(console_.debug).not.toHaveBeenCalled();
      expect(console_.info).not.toHaveBeenCalled();
    });

    it('still logs an Error and reports it to Sentry with the message and the extra arguments', () => {
      const cause = new Error('boom');

      service.error('failed', cause, 'extra');

      expect(console_.error).toHaveBeenCalledOnceWith('[ERROR] failed', cause, 'extra');
      expect(sentry.captureException).toHaveBeenCalledOnceWith(cause, { extra: { message: 'failed', args: ['extra'] } });
      expect(sentry.captureMessage).not.toHaveBeenCalled();
    });

    it('reports anything that is not an Error as a message', () => {
      service.error('failed', { status: 500 }, 'extra');

      expect(sentry.captureMessage).toHaveBeenCalledOnceWith('[ERROR] failed', {
        level: 'error',
        extra: { error: { status: 500 }, args: ['extra'] }
      });
      expect(sentry.captureException).not.toHaveBeenCalled();
    });
  });
});
