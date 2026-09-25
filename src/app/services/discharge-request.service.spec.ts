import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Observable } from 'rxjs';

import { DischargeRequestService } from './discharge-request.service';
import { NotificationService } from './notification.service';
import { DischargeRequest, DischargeRequestStatus, RawDischargeRequest } from '../interfaces/discharge-request.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const raw = (overrides: Partial<RawDischargeRequest> = {}): RawDischargeRequest => ({
  id: 'r1',
  requesterName: 'Ana',
  warehouseId: 'w1',
  warehouse: { name: 'Main' },
  status: 'PENDING',
  items: [{ id: 'i1', inventoryItemId: 'inv1', inventoryItem: { name: 'Laptop', serviceTag: 'TAG-1' }, quantity: 2 }],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  ...overrides
});

const url = (path = ''): string => `${environment.apiUrl}/discharge-requests${path}`;

describe('DischargeRequestService', () => {
  let service: DischargeRequestService;
  let backend: HttpTestingController;

  const load = (...requests: RawDischargeRequest[]): void => {
    service.loadRequests();
    backend.expectOne((r) => r.url === url()).flush({ data: requests });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['reportErrors']) }
      ]
    });
    service = TestBed.inject(DischargeRequestService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('loadRequests', () => {
    it('asks for at most 200 requests and turns them into the front end model', () => {
      service.loadRequests();

      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('limit')).toBe('200');
      request.flush({ data: [raw({ id: 'a', neededByDate: '2026-03-01T00:00:00Z', resolvedBy: { email: 'boss@x.com' } })] });

      const [loaded] = service.requests();
      expect(loaded.id).toBe('a');
      expect(loaded.status).toBe(DischargeRequestStatus.PENDING);
      expect(loaded.warehouseName).toBe('Main');
      expect(loaded.neededByDate).toEqual(new Date('2026-03-01T00:00:00Z'));
      expect(loaded.resolvedByName).toBe('boss@x.com');
      expect(loaded.items[0].inventoryItemName).toBe('Laptop');
      expect(loaded.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
      expect(service.loading()).toBeFalse();
    });

    it('records an error and shows nothing when the load fails', () => {
      service.loadRequests();

      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
      expect(service.requests()).toEqual([]);
      expect(service.loading()).toBeFalse();
    });
  });

  it('counts the requests of each status and all of them in the total', () => {
    load(
      raw({ id: '1', status: 'PENDING' }),
      raw({ id: '2', status: 'PENDING' }),
      raw({ id: '3', status: 'COMPLETED' }),
      raw({ id: '4', status: 'REJECTED' })
    );

    expect(service.stats()).toEqual({ total: 4, byStatus: { pending: 2, completed: 1, rejected: 1 } });
  });

  describe('resolving a request', () => {
    const steps: [string, (s: DischargeRequestService) => Observable<DischargeRequest | null>, string, string, DischargeRequestStatus][] = [
      ['completing', (s) => s.completeRequest('a'), '/a/complete', 'COMPLETED', DischargeRequestStatus.COMPLETED],
      ['rejecting', (s) => s.rejectRequest('a', 'No stock'), '/a/reject', 'REJECTED', DischargeRequestStatus.REJECTED]
    ];

    steps.forEach(([name, call, path, apiStatus, status]) => {
      it(`${name} replaces only that request with the answer of the API`, () => {
        load(raw({ id: 'a' }), raw({ id: 'b' }));

        call(service).subscribe();
        expect(service.loading()).toBeTrue();
        backend.expectOne(url(path)).flush(raw({ id: 'a', status: apiStatus }));

        expect(service.requests().map((r) => [r.id, r.status])).toEqual([
          ['a', status],
          ['b', DischargeRequestStatus.PENDING]
        ]);
        expect(service.loading()).toBeFalse();
      });

      it(`${name} resolves with null, records the message and leaves the list alone when the API refuses`, () => {
        load(raw({ id: 'a' }));
        let result: DischargeRequest | null | undefined;

        call(service).subscribe((answer) => (result = answer));
        backend.expectOne(url(path)).flush({ message: 'Already resolved' }, { status: 409, statusText: 'Conflict' });

        expect(result).toBeNull();
        expect(service.error()).toBe('Already resolved');
        expect(service.requests()[0].status).toBe(DischargeRequestStatus.PENDING);
      });
    });

    it('sends the reason when rejecting', () => {
      load(raw({ id: 'a' }));

      service.rejectRequest('a', 'No stock').subscribe();
      const request = backend.expectOne(url('/a/reject'));

      expect(request.request.body).toEqual({ reason: 'No stock' });
      request.flush(raw({ id: 'a', status: 'REJECTED' }));
    });

    it('clears the previous error when a new step starts', () => {
      load(raw({ id: 'a' }));
      service.completeRequest('a').subscribe();
      backend.expectOne(url('/a/complete')).flush(null, { status: 500, statusText: 'Error' });
      expect(service.error()).toBeTruthy();

      service.rejectRequest('a').subscribe();

      expect(service.error()).toBeNull();
      backend.expectOne(url('/a/reject'));
    });
  });
});
