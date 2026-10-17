import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { FiscalConfigService } from './fiscal-config.service';
import { NotificationService } from './notification.service';
import { FiscalConfig } from '../interfaces/fiscal-config.interface';
import { Currency } from '../interfaces/inventory-item.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const config = (overrides: Partial<FiscalConfig> = {}): FiscalConfig => ({
  id: 'fc1',
  rtn: null,
  fiscalEmail: null,
  fiscalPhone: null,
  address: null,
  currency: Currency.HNL,
  isvPercent: 15,
  fallbackSaleNumber: 1,
  nextPurchaseNumber: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides
});

const url = `${environment.apiUrl}/fiscal-config`;

describe('FiscalConfigService', () => {
  let service: FiscalConfigService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['reportErrors']) }
      ]
    });
    service = TestBed.inject(FiscalConfigService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('has the notification service show the errors of its requests', () => {
    expect(TestBed.inject(NotificationService).reportErrors).toHaveBeenCalledOnceWith(service.error);
  });

  describe('get', () => {
    it('loads the config and fills the signal', () => {
      service.get().subscribe();

      const request = backend.expectOne(url);
      expect(request.request.method).toBe('GET');
      request.flush(config({ rtn: '08011999123456' }));

      expect(service.config()?.rtn).toBe('08011999123456');
      expect(service.loading()).toBeFalse();
    });

    it('leaves the config empty and records an error when the request fails', () => {
      service.get().subscribe();

      backend.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.config()).toBeNull();
      expect(service.error()).toBeTruthy();
    });
  });

  describe('update', () => {
    it('patches the dto and replaces the config with the response', () => {
      let result: FiscalConfig | null = null;

      service.update({ isvPercent: 18 }).subscribe((updated) => (result = updated));
      const request = backend.expectOne(url);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ isvPercent: 18 });
      request.flush(config({ isvPercent: 18 }));

      expect((result as FiscalConfig | null)?.isvPercent).toBe(18);
      expect(service.config()?.isvPercent).toBe(18);
    });

    it('resolves with null and leaves the config untouched when the API refuses', () => {
      service.config.set(config({ isvPercent: 15 }));
      let result: FiscalConfig | null | undefined;

      service.update({ isvPercent: 999 }).subscribe((updated) => (result = updated));
      backend.expectOne(url).flush({ message: 'isvPercent must not be greater than 100' }, { status: 400, statusText: 'Bad Request' });

      expect(result).toBeNull();
      expect(service.config()?.isvPercent).toBe(15);
    });
  });
});
