import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { TransactionService } from './transaction.service';
import { Transaction, TransactionType } from '../interfaces/transaction.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 't1',
  type: TransactionType.IN,
  userId: 'u1',
  date: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  items: [],
  ...overrides
});

const url = (path = ''): string => `${environment.apiUrl}/transactions${path}`;

describe('TransactionService', () => {
  let service: TransactionService;
  let backend: HttpTestingController;

  const load = (...transactions: Transaction[]): void => {
    service.getAll().subscribe();
    backend.expectOne((r) => r.url === url()).flush({ data: transactions });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(TransactionService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('getAll', () => {
    it('asks for the first page of 50 by default and keeps the data of the answer', () => {
      let result: Transaction[] = [];

      service.getAll().subscribe((transactions) => (result = transactions));
      const request = backend.expectOne((r) => r.url === url());
      expect(request.request.params.get('page')).toBe('1');
      expect(request.request.params.get('limit')).toBe('50');
      expect(service.loading()).toBeTrue();
      request.flush({ data: [transaction({ id: 'a' }), transaction({ id: 'b' })] });

      expect(result.map((t) => t.id)).toEqual(['a', 'b']);
      expect(service.transactions().map((t) => t.id)).toEqual(['a', 'b']);
      expect(service.loading()).toBeFalse();
    });

    it('asks for the page and the limit it is given', () => {
      service.getAll(3, 10).subscribe();

      const request = backend.expectOne((r) => r.url === url());

      expect(request.request.params.get('page')).toBe('3');
      expect(request.request.params.get('limit')).toBe('10');
      request.flush({ data: [] });
    });

    it('records the error, stops loading and hands the error to the caller when it fails', () => {
      let failure: unknown;

      service.getAll().subscribe({ error: (err) => (failure = err) });
      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      expect(failure).toBeTruthy();
      expect(service.error()).toContain('500');
      expect(service.loading()).toBeFalse();
    });

    it('clears the previous error when it asks again', () => {
      service.getAll().subscribe({ error: () => undefined });
      backend.expectOne((r) => r.url === url()).flush(null, { status: 500, statusText: 'Server Error' });

      service.getAll().subscribe();

      expect(service.error()).toBeNull();
      backend.expectOne((r) => r.url === url());
    });
  });

  it('getRecent asks for the last transactions without touching the list', () => {
    let result: Transaction[] = [];

    service.getRecent(5).subscribe((transactions) => (result = transactions));
    backend.expectOne(url('/recent?limit=5')).flush([transaction({ id: 'r1' })]);

    expect(result.map((t) => t.id)).toEqual(['r1']);
    expect(service.transactions()).toEqual([]);
  });

  describe('create', () => {
    const dto = { type: TransactionType.IN, userId: 'u1', date: '2026-01-01', items: [{ inventoryItemId: 'i1', quantity: 1 }] };

    it('puts the new transaction first and returns it', () => {
      load(transaction({ id: 'old' }));
      let created: Transaction | undefined;

      service.create(dto).subscribe((t) => (created = t));
      const request = backend.expectOne((r) => r.method === 'POST');
      expect(request.request.body).toEqual(dto);
      request.flush(transaction({ id: 'new' }));

      expect(created?.id).toBe('new');
      expect(service.transactions().map((t) => t.id)).toEqual(['new', 'old']);
      expect(service.loading()).toBeFalse();
    });

    it('records the error and keeps the list when the API refuses', () => {
      load(transaction({ id: 'old' }));
      let failure: unknown;

      service.create(dto).subscribe({ error: (err) => (failure = err) });
      backend.expectOne((r) => r.method === 'POST').flush({ message: 'No stock' }, { status: 400, statusText: 'Bad Request' });

      expect(failure).toBeTruthy();
      expect(service.error()).toBeTruthy();
      expect(service.transactions().map((t) => t.id)).toEqual(['old']);
      expect(service.loading()).toBeFalse();
    });
  });

  describe('delete', () => {
    it('removes only that transaction from the list', () => {
      load(transaction({ id: 'a' }), transaction({ id: 'b' }));

      service.delete('a').subscribe();
      backend.expectOne(url('/a')).flush(null);

      expect(service.transactions().map((t) => t.id)).toEqual(['b']);
      expect(service.loading()).toBeFalse();
    });

    it('keeps the list and records the error when the API refuses', () => {
      load(transaction({ id: 'a' }));
      let failure: unknown;

      service.delete('a').subscribe({ error: (err) => (failure = err) });
      backend.expectOne(url('/a')).flush(null, { status: 403, statusText: 'Forbidden' });

      expect(failure).toBeTruthy();
      expect(service.error()).toContain('403');
      expect(service.transactions().map((t) => t.id)).toEqual(['a']);
      expect(service.loading()).toBeFalse();
    });
  });
});
