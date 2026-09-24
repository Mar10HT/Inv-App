import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { OutflowService } from './outflow.service';
import { NotificationService } from './notification.service';
import { Outflow, OutflowReason, OutflowStatus } from '../interfaces/outflow.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const outflow = (overrides: Partial<Outflow> = {}): Outflow => ({
  id: 'o1',
  name: null,
  warehouseId: 'w1',
  reason: OutflowReason.DAMAGED,
  status: OutflowStatus.ACTIVE,
  notes: null,
  createdById: 'u1',
  cancelledById: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  items: [],
  ...overrides
});

const url = (path = ''): string => `${environment.apiUrl}/outflows${path}`;

describe('OutflowService', () => {
  let service: OutflowService;
  let backend: HttpTestingController;

  const load = (...outflows: Outflow[]): void => {
    service.loadOutflows();
    backend.expectOne((r) => r.url === url()).flush({ data: outflows });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['reportErrors']) }
      ]
    });
    service = TestBed.inject(OutflowService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('loadOutflows', () => {
    it('asks for at most 200 outflows and keeps what comes back', () => {
      service.loadOutflows();

      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('limit')).toBe('200');
      expect(service.loading()).toBeTrue();
      request.flush({ data: [outflow({ id: 'a' }), outflow({ id: 'b' })] });

      expect(service.outflows().map((o) => o.id)).toEqual(['a', 'b']);
      expect(service.loading()).toBeFalse();
    });

    it('records an error and shows no outflows when the load fails', () => {
      service.loadOutflows();

      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
      expect(service.outflows()).toEqual([]);
      expect(service.loading()).toBeFalse();
    });
  });

  describe('stats', () => {
    it('counts active and cancelled outflows apart', () => {
      load(
        outflow({ id: '1' }),
        outflow({ id: '2' }),
        outflow({ id: '3', status: OutflowStatus.CANCELLED })
      );

      expect(service.stats()).toEqual(jasmine.objectContaining({ total: 3, active: 2, cancelled: 1 }));
    });

    it('counts the active outflows per reason and ignores cancelled ones', () => {
      load(
        outflow({ id: '1', reason: OutflowReason.DAMAGED }),
        outflow({ id: '2', reason: OutflowReason.DAMAGED }),
        outflow({ id: '3', reason: OutflowReason.LOST }),
        outflow({ id: '4', reason: OutflowReason.EXPIRED, status: OutflowStatus.CANCELLED })
      );

      expect(service.stats().byReason).toEqual({ DAMAGED: 2, LOST: 1 });
    });
  });

  describe('create', () => {
    const dto = { warehouseId: 'w1', reason: OutflowReason.DAMAGED, items: [{ inventoryItemId: 'i1', quantity: 1 }] };

    it('puts the new outflow first and returns it', () => {
      load(outflow({ id: 'old' }));
      let result: Outflow | null = null;

      service.create(dto).subscribe((created) => (result = created));
      expect(service.loading()).toBeTrue();
      backend.expectOne((r) => r.method === 'POST').flush(outflow({ id: 'new' }));

      expect((result as Outflow | null)?.id).toBe('new');
      expect(service.outflows().map((o) => o.id)).toEqual(['new', 'old']);
      expect(service.loading()).toBeFalse();
    });

    it('resolves with null, records the message and keeps the list when the API refuses', () => {
      load(outflow({ id: 'old' }));
      let result: Outflow | null | undefined;

      service.create(dto).subscribe((created) => (result = created));
      backend.expectOne((r) => r.method === 'POST').flush({ message: 'Not enough stock' }, { status: 400, statusText: 'Bad Request' });

      expect(result).toBeNull();
      expect(service.error()).toBe('Not enough stock');
      expect(service.outflows().map((o) => o.id)).toEqual(['old']);
      expect(service.loading()).toBeFalse();
    });

    it('clears the previous error when a new call starts', () => {
      service.create(dto).subscribe();
      backend.expectOne((r) => r.method === 'POST').flush(null, { status: 500, statusText: 'Error' });
      expect(service.error()).toBeTruthy();

      service.create(dto).subscribe();

      expect(service.error()).toBeNull();
      backend.expectOne((r) => r.method === 'POST');
    });
  });

  describe('cancel', () => {
    it('replaces only the cancelled outflow and sends the reason', () => {
      load(outflow({ id: 'a' }), outflow({ id: 'b' }));

      service.cancel('a', { reason: 'Registered twice' }).subscribe();
      const request = backend.expectOne(url('/a/cancel'));
      expect(request.request.body).toEqual({ reason: 'Registered twice' });
      request.flush(outflow({ id: 'a', status: OutflowStatus.CANCELLED }));

      expect(service.outflows().map((o) => [o.id, o.status])).toEqual([
        ['a', OutflowStatus.CANCELLED],
        ['b', OutflowStatus.ACTIVE]
      ]);
    });

    it('leaves the outflow as it was and resolves with null when the API refuses', () => {
      load(outflow({ id: 'a' }));
      let result: Outflow | null | undefined;

      service.cancel('a').subscribe((answer) => (result = answer));
      backend.expectOne(url('/a/cancel')).flush(null, { status: 409, statusText: 'Conflict' });

      expect(result).toBeNull();
      expect(service.outflows()[0].status).toBe(OutflowStatus.ACTIVE);
      expect(service.error()).toBeTruthy();
    });
  });
});
