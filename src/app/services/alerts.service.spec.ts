import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';

import { AlertsService, StockAlert } from './alerts.service';
import { WebSocketService } from './websocket.service';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const alert = (overrides: Partial<StockAlert> = {}): StockAlert => ({
  id: 'a1',
  type: 'LOW_STOCK',
  currentQty: 1,
  threshold: 5,
  notified: false,
  createdAt: '2026-01-01T00:00:00Z',
  item: { name: 'Laptop' },
  ...overrides
});

const activeUrl = `${environment.apiUrl}/alerts/active?limit=20`;

describe('AlertsService', () => {
  let backend: HttpTestingController;
  let alertChanges: Subject<void>;

  const create = (...initial: StockAlert[]): AlertsService => {
    const service = TestBed.inject(AlertsService);
    backend.expectOne((r) => r.url === activeUrl).flush({ data: initial });
    return service;
  };

  beforeEach(() => {
    alertChanges = new Subject<void>();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: WebSocketService, useValue: { onAlertChange: () => alertChanges.asObservable() } }
      ]
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the 20 latest active alerts when created', () => {
    const service = TestBed.inject(AlertsService);

    const request = backend.expectOne((r) => r.url === activeUrl);
    expect(service.isLoading()).toBeTrue();
    request.flush({ data: [alert({ id: 'a' }), alert({ id: 'b' })] });

    expect(service.alerts().map((a) => a.id)).toEqual(['a', 'b']);
    expect(service.isLoading()).toBeFalse();
  });

  it('keeps what it had and stops loading when the load fails', () => {
    const service = create(alert({ id: 'old' }));

    service.loadActive();
    backend.expectOne((r) => r.url === activeUrl).flush(null, { status: 500, statusText: 'Server Error' });

    expect(service.alerts().map((a) => a.id)).toEqual(['old']);
    expect(service.isLoading()).toBeFalse();
  });

  it('counts the alerts that were not notified yet as unread', () => {
    const service = create(alert({ id: '1', notified: false }), alert({ id: '2', notified: true }), alert({ id: '3', notified: false }));

    expect(service.unreadCount()).toBe(2);
  });

  it('loads again when the server reports a change in the alerts', () => {
    const service = create(alert({ id: 'old' }));

    alertChanges.next();
    backend.expectOne((r) => r.url === activeUrl).flush({ data: [alert({ id: 'new' })] });

    expect(service.alerts().map((a) => a.id)).toEqual(['new']);
  });

  it('stops listening to the server when it is destroyed', () => {
    create();

    TestBed.resetTestingModule();
    alertChanges.next();

    backend.expectNone((r) => r.url === activeUrl);
  });

  it('resolving an alert patches it and reloads the list', () => {
    const service = create(alert({ id: 'a' }));
    let done = false;

    service.resolve('a').subscribe(() => (done = true));
    backend.expectOne(`${environment.apiUrl}/alerts/a/resolve`).flush(null);
    backend.expectOne((r) => r.url === activeUrl).flush({ data: [] });

    expect(done).toBeTrue();
    expect(service.alerts()).toEqual([]);
  });
});
