import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsTransactionsTab } from './reports-transactions-tab';
import { TransactionStats } from '../reports.types';
import { Transaction, TransactionType } from '../../../interfaces/transaction.interface';
import { formatDateTime } from '../reports.format';
import { provideTestBedDefaults } from '../../../../testing/test-providers';
import { tx } from '../../../../testing/report-fixtures';

const stats: TransactionStats = { total: 7, inCount: 4, outCount: 2, transferCount: 1, totalItems: 9 };

const sample: Transaction[] = [
  tx({
    id: 'in',
    type: TransactionType.IN,
    destinationWarehouse: { id: 'w1', name: 'Main' },
    user: { id: 'u1', name: 'Ana', email: 'ana@x.com' },
    items: [{ id: '1', inventoryItemId: 'a', quantity: 1 }]
  }),
  tx({
    id: 'out',
    type: TransactionType.OUT,
    sourceWarehouse: { id: 'w2', name: 'Backup' },
    user: { id: 'u2', name: '', email: 'bob@x.com' },
    items: [{ id: '2', inventoryItemId: 'a', quantity: 1 }, { id: '3', inventoryItemId: 'b', quantity: 1 }]
  })
];

describe('ReportsTransactionsTab', () => {
  let fixture: ComponentFixture<ReportsTransactionsTab>;
  let component: ReportsTransactionsTab;
  let el: HTMLElement;

  const render = (inputs: Record<string, unknown> = {}): void => {
    const all = { stats, transactions: sample, ...inputs };
    for (const [name, value] of Object.entries(all)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };

  const rows = (): string[][] =>
    Array.from(el.querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    );

  const button = (label: string): HTMLButtonElement | undefined =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(label));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsTransactionsTab],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsTransactionsTab);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
  });

  describe('loading', () => {
    it('shows only the spinner while loading', () => {
      render({ loading: true });

      expect(el.querySelector('.animate-spin')).not.toBeNull();
      expect(el.querySelector('table')).toBeNull();
      expect(el.querySelector('input[type="date"]')).toBeNull();
    });
  });

  describe('table', () => {
    it('shows the total, in, out and transfer counters', () => {
      render();

      const counters = Array.from(el.querySelectorAll('p.text-2xl')).map((p) => p.textContent?.trim());
      expect(counters).toEqual(['7', '4', '2', '1']);
    });

    it('shows one row per transaction with date, type, warehouses, user and item count', () => {
      render();

      const [inRow, outRow] = rows();
      expect(inRow).toEqual([formatDateTime(sample[0].date), 'IN', '-', 'Main', 'Ana', '1']);
      expect(outRow).toEqual([formatDateTime(sample[1].date), 'OUT', 'Backup', '-', 'bob@x.com', '2']);
    });

    it('shows an empty message when there are no transactions', () => {
      render({ transactions: [] });

      expect(rows()).toEqual([['COMMON.NO_DATA']]);
    });

    it('repeats the transactions as cards for small screens', () => {
      render();

      const cards = el.querySelectorAll('.lg\\:hidden .rounded-xl');
      expect(cards).toHaveSize(2);
      expect(cards[0].textContent).toContain('1 items');
      expect(cards[0].textContent).toContain('Main');
    });

    it('colors the type badge and picks an icon per type', () => {
      render();

      const badges = Array.from(el.querySelectorAll('tbody span.rounded-full'));
      expect(badges[0].className).toContain('bg-emerald-500/20');
      expect(badges[1].className).toContain('bg-rose-500/20');
      expect(component.getTransactionIcon(TransactionType.IN)).toBe('ArrowDown');
      expect(component.getTransactionIcon(TransactionType.OUT)).toBe('ArrowUp');
      expect(component.getTransactionIcon(TransactionType.TRANSFER)).toBe('ArrowLeftRight');
      expect(component.getTransactionIcon('other' as TransactionType)).toBe('Receipt');
    });
  });

  describe('filters', () => {
    it('reflects the date range and the type filter it is given', () => {
      render({ dateFrom: '2026-01-10', dateTo: '2026-01-20', typeFilter: 'OUT' });

      const [from, to] = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="date"]'));
      expect(from.value).toBe('2026-01-10');
      expect(to.value).toBe('2026-01-20');
      expect(el.querySelector('select')?.value).toBe('OUT');
    });

    it('emits the new value when a date or the type changes', () => {
      render();
      const dateFrom = jasmine.createSpy('dateFrom');
      const dateTo = jasmine.createSpy('dateTo');
      const type = jasmine.createSpy('type');
      component.dateFromChange.subscribe(dateFrom);
      component.dateToChange.subscribe(dateTo);
      component.typeFilterChange.subscribe(type);
      const [from, to] = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="date"]'));
      const select = el.querySelector('select') as HTMLSelectElement;

      from.value = '2026-01-10';
      from.dispatchEvent(new Event('change'));
      to.value = '2026-01-20';
      to.dispatchEvent(new Event('change'));
      select.value = 'TRANSFER';
      select.dispatchEvent(new Event('change'));

      expect(dateFrom).toHaveBeenCalledOnceWith('2026-01-10');
      expect(dateTo).toHaveBeenCalledOnceWith('2026-01-20');
      expect(type).toHaveBeenCalledOnceWith('TRANSFER');
    });

    it('hides the clear button until a filter is active', () => {
      render();
      expect(button('COMMON.CLEAR')).toBeUndefined();

      fixture.componentRef.setInput('typeFilter', 'IN');
      fixture.detectChanges();
      expect(button('COMMON.CLEAR')).toBeDefined();
    });

    it('shows the clear button for a date filter and emits filtersCleared', () => {
      render({ dateFrom: '2026-01-10' });
      const cleared = jasmine.createSpy('cleared');
      component.filtersCleared.subscribe(cleared);

      button('COMMON.CLEAR')?.click();

      expect(cleared).toHaveBeenCalledTimes(1);
    });
  });

  describe('exports', () => {
    it('asks the parent for the CSV and the PDF export', () => {
      render();
      const csv = jasmine.createSpy('csv');
      const pdf = jasmine.createSpy('pdf');
      component.csvRequested.subscribe(csv);
      component.pdfRequested.subscribe(pdf);

      button('CSV')?.click();
      expect(csv).toHaveBeenCalledTimes(1);
      expect(pdf).not.toHaveBeenCalled();

      button('PDF')?.click();
      expect(pdf).toHaveBeenCalledTimes(1);
    });
  });
});
