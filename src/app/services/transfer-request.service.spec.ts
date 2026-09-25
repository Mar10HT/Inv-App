import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Observable } from 'rxjs';

import { TransferRequestService } from './transfer-request.service';
import { NotificationService } from './notification.service';
import { RawTransferRequest, TransferRequestStatus } from '../interfaces/transfer-request.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const raw = (overrides: Partial<RawTransferRequest> = {}): RawTransferRequest => ({
  id: 'a',
  status: 'PENDING',
  sourceWarehouseId: 'w1',
  sourceWarehouse: { name: 'Main' },
  destinationWarehouseId: 'w2',
  destinationWarehouse: { name: 'Backup' },
  requestedById: 'u1',
  items: [{ id: 'i1', inventoryItemId: 'inv1', inventoryItem: { name: 'Laptop' }, quantity: 2 }],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides
});

const url = (path = ''): string => `${environment.apiUrl}/transfer-requests${path}`;

describe('TransferRequestService', () => {
  let backend: HttpTestingController;

  const create = (...initial: RawTransferRequest[]): TransferRequestService => {
    const service = TestBed.inject(TransferRequestService);
    backend.expectOne((r) => r.url === url()).flush({ data: initial });
    return service;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['reportErrors']) }
      ]
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('loading', () => {
    it('loads at most 200 requests when created and transforms them', () => {
      const service = TestBed.inject(TransferRequestService);

      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('limit')).toBe('200');
      request.flush({ data: [raw({ id: 'x', status: 'APPROVED' })] });

      const [transfer] = service.requests();
      expect(transfer.id).toBe('x');
      expect(transfer.status).toBe(TransferRequestStatus.APPROVED);
      expect(transfer.sourceWarehouseName).toBe('Main');
      expect(transfer.destinationWarehouseName).toBe('Backup');
      expect(transfer.items[0].inventoryItemName).toBe('Laptop');
      expect(transfer.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
      expect(service.loading()).toBeFalse();
    });

    it('records an error and shows nothing when the load fails', () => {
      const service = TestBed.inject(TransferRequestService);

      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
      expect(service.requests()).toEqual([]);
    });
  });

  describe('derived data', () => {
    it('counts the requests of each status and all of them in the total', () => {
      const service = create(
        raw({ id: '1', status: 'PENDING' }),
        raw({ id: '2', status: 'PENDING' }),
        raw({ id: '3', status: 'APPROVED' }),
        raw({ id: '4', status: 'SENT' }),
        raw({ id: '5', status: 'COMPLETED' }),
        raw({ id: '6', status: 'REJECTED' }),
        raw({ id: '7', status: 'CANCELLED' })
      );

      expect(service.stats()).toEqual({
        total: 7,
        byStatus: { pending: 2, approved: 1, sent: 1, completed: 1, rejected: 1, cancelled: 1 }
      });
    });
  });

  describe('createRequest', () => {
    const dto = { sourceWarehouseId: 'w1', destinationWarehouseId: 'w2', items: [{ inventoryItemId: 'inv1', quantity: 1 }] };

    it('adds the new request at the top', () => {
      const service = create(raw({ id: 'old' }));
      let result: { id: string } | null = null;

      service.createRequest(dto).subscribe((created) => (result = created));
      backend.expectOne((r) => r.method === 'POST' && r.url === url()).flush(raw({ id: 'new' }));

      expect((result as { id: string } | null)?.id).toBe('new');
      expect(service.requests().map((r) => r.id)).toEqual(['new', 'old']);
    });

    it('resolves with null and keeps the list when it fails', () => {
      const service = create(raw({ id: 'old' }));
      let result: unknown = 'unset';

      service.createRequest(dto).subscribe((created) => (result = created));
      backend.expectOne((r) => r.method === 'POST').flush({ message: 'Same warehouse' }, { status: 400, statusText: 'Bad Request' });

      expect(result).toBeNull();
      expect(service.error()).toBeTruthy();
      expect(service.requests().map((r) => r.id)).toEqual(['old']);
    });
  });

  describe('the steps of a transfer', () => {
    const steps: [string, (s: TransferRequestService) => Observable<unknown>, string, string, TransferRequestStatus][] = [
      ['approve', (s) => s.approveRequest('a'), '/a/approve', 'APPROVED', TransferRequestStatus.APPROVED],
      ['reject', (s) => s.rejectRequest('a', 'No stock'), '/a/reject', 'REJECTED', TransferRequestStatus.REJECTED],
      ['send', (s) => s.sendTransfer('a'), '/a/send', 'SENT', TransferRequestStatus.SENT],
      ['confirm manually', (s) => s.manualConfirmReceipt('a'), '/a/complete', 'COMPLETED', TransferRequestStatus.COMPLETED],
      ['cancel', (s) => s.cancelRequest('a'), '/a/cancel', 'CANCELLED', TransferRequestStatus.CANCELLED]
    ];

    steps.forEach(([name, call, path, apiStatus, status]) => {
      it(`${name} replaces only that request with the answer of the API`, () => {
        const service = create(raw({ id: 'a' }), raw({ id: 'b' }));

        call(service).subscribe();
        expect(service.loading()).toBeTrue();
        backend.expectOne(url(path)).flush(raw({ id: 'a', status: apiStatus }));

        expect(service.requests().map((r) => [r.id, r.status])).toEqual([
          ['a', status],
          ['b', TransferRequestStatus.PENDING]
        ]);
        expect(service.loading()).toBeFalse();
      });

      it(`${name} resolves with null and leaves the list alone when the API refuses`, () => {
        const service = create(raw({ id: 'a' }));
        let result: unknown = 'unset';

        call(service).subscribe((answer) => (result = answer));
        backend.expectOne(url(path)).flush({ message: 'Not allowed' }, { status: 409, statusText: 'Conflict' });

        expect(result).toBeNull();
        expect(service.error()).toBeTruthy();
        expect(service.requests()[0].status).toBe(TransferRequestStatus.PENDING);
      });
    });

    it('sends the reason when rejecting', () => {
      const service = create(raw({ id: 'a' }));

      service.rejectRequest('a', 'No stock').subscribe();
      const request = backend.expectOne(url('/a/reject'));

      expect(request.request.body).toEqual({ reason: 'No stock' });
      request.flush(raw({ id: 'a', status: 'REJECTED' }));
    });

    it('scanning a QR sends what was scanned and replaces the request the API answers with', () => {
      const service = create(raw({ id: 'a', status: 'SENT' }), raw({ id: 'b', status: 'SENT' }));

      service.scanQr('scanned-text').subscribe();
      const request = backend.expectOne(url('/scan-qr'));
      request.flush(raw({ id: 'b', status: 'COMPLETED' }));

      expect(request.request.body).toEqual({ scannedData: 'scanned-text' });
      expect(service.requests().map((r) => [r.id, r.status])).toEqual([
        ['a', TransferRequestStatus.SENT],
        ['b', TransferRequestStatus.COMPLETED]
      ]);
    });

    it('scanning a QR resolves with null when it is not valid', () => {
      const service = create(raw({ id: 'a' }));
      let result: unknown = 'unset';

      service.scanQr('junk').subscribe((answer) => (result = answer));
      backend.expectOne(url('/scan-qr')).flush(null, { status: 400, statusText: 'Bad Request' });

      expect(result).toBeNull();
      expect(service.error()).toBeTruthy();
    });

    it('sending hands over the QR code of the answer', () => {
      const service = create(raw({ id: 'a' }));
      const answers: unknown[] = [];

      service.sendTransfer('a').subscribe((request) => answers.push(request));
      backend.expectOne(url('/a/send')).flush(raw({ id: 'a', status: 'SENT', qrCodeDataUrl: 'data:image/png;base64,AAA' }));

      expect(answers).toEqual([jasmine.objectContaining({ id: 'a', qrCodeDataUrl: 'data:image/png;base64,AAA' })]);
    });

    it('clears the previous error when a new step starts', () => {
      const service = create(raw({ id: 'a' }));
      service.cancelRequest('a').subscribe();
      backend.expectOne(url('/a/cancel')).flush(null, { status: 500, statusText: 'Error' });
      expect(service.error()).toBeTruthy();

      service.approveRequest('a').subscribe();

      expect(service.error()).toBeNull();
      backend.expectOne(url('/a/approve'));
    });
  });
});
