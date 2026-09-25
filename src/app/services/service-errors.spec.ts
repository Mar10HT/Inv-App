import { TestBed } from '@angular/core/testing';
import { Signal } from '@angular/core';
import { HttpTestingController } from '@angular/common/http/testing';
import { NEVER, Observable, firstValueFrom } from 'rxjs';

import { LoanService } from './loan.service';
import { TransferRequestService } from './transfer-request.service';
import { SaleService } from './sale.service';
import { OutflowService } from './outflow.service';
import { DischargeRequestService } from './discharge-request.service';
import { NotificationService } from './notification.service';
import { WebSocketService } from './websocket.service';
import { provideTestBedDefaults } from '../../testing/test-providers';

interface ServiceWithErrors {
  error: Signal<string | null>;
}

// Each service swallows a failed call (it records the message in `error` and resolves with
// null), so it is the service that has to tell the user. `start` is what makes the service
// issue a request that will fail.
const services: [string, () => ServiceWithErrors, (s: never) => void][] = [
  ['LoanService', () => TestBed.inject(LoanService), () => undefined],
  ['TransferRequestService', () => TestBed.inject(TransferRequestService), () => undefined],
  ['SaleService', () => TestBed.inject(SaleService), (s: SaleService) => s.loadSales()],
  ['OutflowService', () => TestBed.inject(OutflowService), (s: OutflowService) => s.loadOutflows()],
  [
    'DischargeRequestService',
    () => TestBed.inject(DischargeRequestService),
    (s: DischargeRequestService) => s.loadRequests()
  ]
];

describe('business services report failed calls to the user', () => {
  let backend: HttpTestingController;
  let notifications: NotificationService;
  let errorSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: WebSocketService, useValue: { connect: () => undefined, onLoanChange: () => NEVER } }
      ]
    });
    backend = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
    errorSpy = spyOn(notifications, 'error');
  });

  services.forEach(([name, create, start]) => {
    describe(name, () => {
      it('shows an error when a request fails', () => {
        const service = create();
        TestBed.tick();
        start(service as never);

        backend.expectOne(() => true).flush(null, { status: 500, statusText: 'Server Error' });
        TestBed.tick();

        expect(service.error()).toBeTruthy();
        expect(errorSpy).toHaveBeenCalledOnceWith(service.error() as string);
      });

      it('stays quiet when requests succeed', () => {
        const service = create();
        TestBed.tick();
        start(service as never);

        backend.expectOne(() => true).flush({ data: [] });
        TestBed.tick();

        expect(errorSpy).not.toHaveBeenCalled();
      });
    });
  });
});

describe('getQrCode', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: WebSocketService, useValue: { connect: () => undefined, onLoanChange: () => NEVER } }
      ]
    });
    backend = TestBed.inject(HttpTestingController);
  });

  // The QR dialogs open first and fill in when the code arrives. A failure has to reach them
  // as an error so they can close: a null value left them on the loading spinner for good.
  const loanCase: [string, () => Observable<string | null>, string, (b: HttpTestingController) => void][] = [
    [
      'LoanService',
      () => TestBed.inject(LoanService).getQrCode('l1', 'send'),
      '/loans/l1/qr/send',
      (b) => b.expectOne((r) => r.url.endsWith('/loans')).flush({ data: [] })
    ],
    [
      'TransferRequestService',
      () => TestBed.inject(TransferRequestService).getQrCode('t1'),
      '/transfer-requests/t1/qr',
      (b) => b.expectOne((r) => r.url.endsWith('/transfer-requests')).flush({ data: [] })
    ]
  ];

  loanCase.forEach(([name, request, path, flushInitialLoad]) => {
    it(`${name} emits the code it receives`, async () => {
      const result = firstValueFrom(request());
      flushInitialLoad(backend);

      const code = 'data:image/png;base64,AAA';
      backend.expectOne((r) => r.url.endsWith(path)).flush(name === 'LoanService' ? { qrDataUrl: code } : code);

      expect(await result).toBe(code);
    });

    it(`${name} rejects when the request fails`, async () => {
      const result = firstValueFrom(request()).then(
        () => 'emitted',
        () => 'rejected'
      );
      flushInitialLoad(backend);

      backend.expectOne((r) => r.url.endsWith(path)).flush(null, { status: 500, statusText: 'Server Error' });

      expect(await result).toBe('rejected');
    });
  });
});
