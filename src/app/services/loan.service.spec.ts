import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { LoanService } from './loan.service';
import { NotificationService } from './notification.service';
import { LoanStatus, RawLoan } from '../interfaces/loan.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const NOW = new Date('2026-06-15T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number): string => new Date(NOW.getTime() + days * DAY).toISOString();

const raw = (overrides: Partial<RawLoan> = {}): RawLoan => ({
  id: 'l1',
  items: [{ id: 'i1', inventoryItemId: 'inv1', inventoryItem: { name: 'Laptop' }, quantity: 2 }],
  sourceWarehouseId: 'w1',
  sourceWarehouse: { name: 'Main' },
  destinationWarehouseId: 'w2',
  destinationWarehouse: { name: 'Backup' },
  loanDate: NOW.toISOString(),
  dueDate: daysFromNow(30),
  status: 'PENDING',
  createdById: 'u1',
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides
});

const page = (...loans: RawLoan[]): { data: RawLoan[] } => ({ data: loans });
const loansUrl = (path = ''): string => `${environment.apiUrl}/loans${path}`;

describe('LoanService', () => {
  let backend: HttpTestingController;

  const create = (...initial: RawLoan[]): LoanService => {
    const service = TestBed.inject(LoanService);
    backend.expectOne((r) => r.url === loansUrl() && r.method === 'GET').flush(page(...initial));
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
    it('loads the loans when created, asking for at most 200', () => {
      const service = TestBed.inject(LoanService);

      const request = backend.expectOne((r) => r.url === loansUrl());
      expect(request.request.params.get('limit')).toBe('200');
      expect(service.loading()).toBeTrue();
      request.flush(page(raw()));

      expect(service.loading()).toBeFalse();
      expect(service.loans()).toHaveSize(1);
    });

    it('turns the API payload into the front end model', () => {
      const service = create(raw({ id: 'l7', name: 'Trip', status: 'SENT', returnDate: undefined }));

      const [loan] = service.loans();
      expect(loan.id).toBe('l7');
      expect(loan.status).toBe(LoanStatus.SENT);
      expect(loan.loanDate).toEqual(NOW);
      expect(loan.sourceWarehouseName).toBe('Main');
      expect(loan.items[0].inventoryItemName).toBe('Laptop');
    });

    it('treats an unknown status as pending', () => {
      const service = create(raw({ status: 'SOMETHING_NEW' }));

      expect(service.loans()[0].status).toBe(LoanStatus.PENDING);
    });

    it('records an error and keeps an empty list when the load fails', () => {
      const service = TestBed.inject(LoanService);

      backend.expectOne((r) => r.url === loansUrl()).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
      expect(service.loans()).toEqual([]);
      expect(service.loading()).toBeFalse();
    });
  });

  describe('derived data', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(NOW);
    });

    afterEach(() => jasmine.clock().uninstall());

    const statsFor = (...loans: RawLoan[]) => create(...loans).stats();

    it('counts the loans of each status', () => {
      const stats = statsFor(
        raw({ id: '1', status: 'PENDING' }),
        raw({ id: '2', status: 'SENT' }),
        raw({ id: '3', status: 'SENT' }),
        raw({ id: '4', status: 'RECEIVED' }),
        raw({ id: '5', status: 'RETURN_PENDING' }),
        raw({ id: '6', status: 'RETURNED' }),
        raw({ id: '7', status: 'OVERDUE' })
      );

      expect(stats).toEqual(
        jasmine.objectContaining({
          totalPending: 1,
          totalSent: 2,
          totalReceived: 1,
          totalReturnPending: 1,
          totalReturned: 1,
          totalOverdue: 1
        })
      );
    });

    describe('due soon', () => {
      it('counts an active loan due within seven days', () => {
        expect(statsFor(raw({ status: 'SENT', dueDate: daysFromNow(3) })).dueSoon).toBe(1);
      });

      it('includes a loan due in exactly seven days', () => {
        expect(statsFor(raw({ status: 'SENT', dueDate: daysFromNow(7) })).dueSoon).toBe(1);
      });

      it('leaves out a loan due in more than seven days', () => {
        expect(statsFor(raw({ status: 'SENT', dueDate: daysFromNow(8) })).dueSoon).toBe(0);
      });

      it('leaves out a loan whose due date has already passed', () => {
        expect(statsFor(raw({ status: 'RECEIVED', dueDate: daysFromNow(-1) })).dueSoon).toBe(0);
      });

      it('leaves out loans that are not active', () => {
        const stats = statsFor(
          raw({ id: '1', status: 'RETURNED', dueDate: daysFromNow(2) }),
          raw({ id: '2', status: 'CANCELLED', dueDate: daysFromNow(2) }),
          raw({ id: '3', status: 'OVERDUE', dueDate: daysFromNow(2) })
        );

        expect(stats.dueSoon).toBe(0);
      });

      it('counts pending, sent and received loans alike', () => {
        const stats = statsFor(
          raw({ id: '1', status: 'PENDING', dueDate: daysFromNow(1) }),
          raw({ id: '2', status: 'SENT', dueDate: daysFromNow(2) }),
          raw({ id: '3', status: 'RECEIVED', dueDate: daysFromNow(3) })
        );

        expect(stats.dueSoon).toBe(3);
      });
    });

    it('keeps returned and cancelled loans out of the active list', () => {
      const service = create(
        raw({ id: '1', status: 'PENDING' }),
        raw({ id: '2', status: 'RETURNED' }),
        raw({ id: '3', status: 'CANCELLED' }),
        raw({ id: '4', status: 'OVERDUE' })
      );

      expect(service.activeLoans().map((l) => l.id)).toEqual(['1', '4']);
    });
  });

  describe('createLoan', () => {
    const dto = {
      items: [{ inventoryItemId: 'inv1', quantity: 1 }],
      sourceWarehouseId: 'w1',
      destinationWarehouseId: 'w2',
      dueDate: new Date(daysFromNow(10))
    };

    it('adds the new loan at the top of the list and returns it', () => {
      const service = create(raw({ id: 'old' }));
      let result: unknown;

      service.createLoan(dto as never).subscribe((loan) => (result = loan));
      backend.expectOne((r) => r.url === loansUrl() && r.method === 'POST').flush(raw({ id: 'new' }));

      expect((result as { id: string }).id).toBe('new');
      expect(service.loans().map((l) => l.id)).toEqual(['new', 'old']);
      expect(service.loading()).toBeFalse();
    });

    it('resolves with null, records the message and keeps the list when it fails', () => {
      const service = create(raw({ id: 'old' }));
      let result: unknown = 'unset';

      service.createLoan(dto as never).subscribe((loan) => (result = loan));
      backend
        .expectOne((r) => r.method === 'POST')
        .flush({ message: 'Not enough stock' }, { status: 400, statusText: 'Bad Request' });

      expect(result).toBeNull();
      expect(service.error()).toBeTruthy();
      expect(service.loans().map((l) => l.id)).toEqual(['old']);
      expect(service.loading()).toBeFalse();
    });

    it('clears the previous error when a new call starts', () => {
      const service = create();
      service.createLoan(dto as never).subscribe();
      backend.expectOne((r) => r.method === 'POST').flush(null, { status: 500, statusText: 'Error' });
      expect(service.error()).toBeTruthy();

      service.createLoan(dto as never).subscribe();

      expect(service.error()).toBeNull();
      backend.expectOne((r) => r.method === 'POST');
    });
  });
});
