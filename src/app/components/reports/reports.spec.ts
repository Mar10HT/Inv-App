import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal, Type } from '@angular/core';
import { defer, NEVER, of, throwError } from 'rxjs';
import type { WorkBook } from 'xlsx-js-style';

import { Reports } from './reports';
import { ReportsAssignmentsTab } from './tabs/reports-assignments-tab';
import { ReportsDownloadsTab } from './tabs/reports-downloads-tab';
import { ReportsStatusTab } from './tabs/reports-status-tab';
import { ReportsTransactionsTab } from './tabs/reports-transactions-tab';
import { ReportsTrendsTab } from './tabs/reports-trends-tab';
import { ReportsValueTab } from './tabs/reports-value-tab';
import { InventoryService } from '../../services/inventory/inventory.service';
import { TransactionService } from '../../services/transaction.service';
import {
  Currency,
  InventoryItemInterface,
  InventoryStatus,
  ItemType
} from '../../interfaces/inventory-item.interface';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { item, supplier, tx, warehouse } from '../../../testing/report-fixtures';

// The trend window is "the last 30 days from now", so the tests pin "now" instead of racing midnight.
const NOW = new Date(2026, 8, 24, 12, 0);
const daysBefore = (days: number): Date => new Date(2026, 8, 24 - days, 12, 0);

/** Runs `read` with the clock frozen at NOW; the computed signals it reads call `new Date()`. */
const atNow = <T>(read: () => T): T => {
  jasmine.clock().install();
  jasmine.clock().mockDate(NOW);
  try {
    return read();
  } finally {
    jasmine.clock().uninstall();
  }
};

describe('Reports', () => {
  let fixture: ComponentFixture<Reports>;
  let component: Reports;

  const warehouses = [warehouse('w1', 'Main'), warehouse('w2', 'Backup')];
  const suppliers = [supplier('s1', 'Acme')];

  const setup = async (
    items: InventoryItemInterface[],
    transactions: Transaction[] = [],
    itemsSource = of(items),
    transactionsSource = of(transactions)
  ): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        ...provideTestBedDefaults(),
        {
          provide: InventoryService,
          useValue: {
            warehouses: signal(warehouses),
            suppliers: signal(suppliers),
            getItemsObservable: () => itemsSource
          }
        },
        { provide: TransactionService, useValue: { getAll: () => transactionsSource } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('loading', () => {
    it('loads items and transactions and clears both loading flags', async () => {
      await setup([item({ id: 'a' })], [tx({ id: 'x' })]);

      expect(component.allItems().map((i) => i.id)).toEqual(['a']);
      expect(component.allTransactions().map((t) => t.id)).toEqual(['x']);
      expect(component.loading()).toBe(false);
      expect(component.transactionsLoading()).toBe(false);
    });

    it('clears the items loading flag when the request fails', async () => {
      await setup([], [], throwError(() => new Error('boom')) as never);

      expect(component.allItems()).toEqual([]);
      expect(component.loading()).toBe(false);
    });

    it('shows an error with a retry instead of a zeroed report when the items fail', async () => {
      let calls = 0;
      await setup([], [], defer(() => (++calls === 1 ? throwError(() => new Error('boom')) : of([item({ id: 'a' })]))));

      expect(component.itemsError()).toBe(true);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      expect(fixture.debugElement.query(By.directive(ReportsValueTab))).toBeNull();

      (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.itemsError()).toBe(false);
      expect(component.allItems().map((i) => i.id)).toEqual(['a']);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.debugElement.query(By.directive(ReportsValueTab))).not.toBeNull();
    });

    // What each tab shows once it is selected: its own component, or the load error in its place.
    const alert = (): HTMLElement | null => fixture.nativeElement.querySelector('[role="alert"]');
    const has = (type: Type<unknown>): boolean => fixture.debugElement.query(By.directive(type)) !== null;
    const select = (tab: number): void => {
      component.onTabChange(tab);
      fixture.detectChanges();
    };

    it('shows the transactions error only on the tabs that read the transactions', async () => {
      await setup([item({ id: 'a' })], [], undefined, throwError(() => new Error('boom')));

      expect(component.transactionsError()).toBe(true);
      expect(alert()).toBeNull();
      expect(has(ReportsValueTab)).toBe(true);

      for (const tab of [1, 4]) {
        select(tab);
        expect(alert()).not.toBeNull();
      }
      for (const tab of [2, 3]) {
        select(tab);
        expect(alert()).toBeNull();
      }
      select(5);
      expect(alert()).toBeNull();
      expect(has(ReportsDownloadsTab)).toBe(true);
    });

    it('shows the items error only on the tabs that read the items', async () => {
      await setup([], [tx({ id: 't' })], throwError(() => new Error('boom')) as never);

      for (const tab of [0, 2, 3]) {
        select(tab);
        expect(alert()).not.toBeNull();
      }
      select(1);
      expect(alert()).toBeNull();
      expect(has(ReportsTransactionsTab)).toBe(true);
      select(4);
      expect(alert()).toBeNull();
      expect(has(ReportsTrendsTab)).toBe(true);
      select(5);
      expect(alert()).toBeNull();
      expect(has(ReportsDownloadsTab)).toBe(true);
    });

    it('does not cover the tabs that read only the transactions, or the downloads, with the items spinner', async () => {
      await setup([], [tx({ id: 't' })], NEVER);

      select(4);
      expect(has(ReportsTrendsTab)).toBe(true);
      select(5);
      expect(has(ReportsDownloadsTab)).toBe(true);
      expect(fixture.nativeElement.querySelector('app-spinner')).toBeNull();
      select(0);
      expect(fixture.nativeElement.querySelector('app-spinner')).not.toBeNull();
    });

    it('shows the transactions error while the items still load, with the retry blocked until both finish', async () => {
      await setup([], [], NEVER, throwError(() => new Error('boom')));

      select(4);

      expect(alert()).not.toBeNull();
      expect((alert()?.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('value report', () => {
    it('sums price times quantity and counts the filtered items', async () => {
      await setup([item({ id: 'a', price: 10, quantity: 3 }), item({ id: 'b', price: 5, quantity: 2 })]);

      expect(component.totalValue()).toBe(40);
      expect(component.totalItemsCount()).toBe(2);
    });

    it('treats a missing price as zero', async () => {
      await setup([item({ price: undefined, quantity: 4 })]);

      expect(component.totalValue()).toBe(0);
    });

    it('filters by currency unless ALL is selected', async () => {
      await setup([
        item({ id: 'usd', currency: Currency.USD, price: 10 }),
        item({ id: 'hnl', currency: Currency.HNL, price: 20 })
      ]);

      expect(component.filteredItems().map((i) => i.id)).toEqual(['usd']);

      component.selectedCurrency.set('HNL');
      expect(component.filteredItems().map((i) => i.id)).toEqual(['hnl']);

      component.selectedCurrency.set('ALL');
      expect(component.filteredItems().map((i) => i.id)).toEqual(['usd', 'hnl']);
    });

    it('groups value by category, highest value first, with an Uncategorized bucket', async () => {
      await setup([
        item({ id: 'a', category: 'Small', price: 1, quantity: 1 }),
        item({ id: 'b', category: 'Big', price: 10, quantity: 5 }),
        item({ id: 'c', category: 'Big', price: 10, quantity: 1 }),
        item({ id: 'd', category: '', price: 2, quantity: 1 })
      ]);

      expect(component.valueByCategory()).toEqual([
        { label: 'Big', value: 60, count: 2 },
        { label: 'Uncategorized', value: 2, count: 1 },
        { label: 'Small', value: 1, count: 1 }
      ]);
    });

    it('groups value by warehouse name and falls back to No Warehouse', async () => {
      await setup([
        item({ id: 'a', warehouseId: 'w1', price: 10 }),
        item({ id: 'b', warehouseId: 'w2', price: 30 }),
        item({ id: 'c', warehouseId: 'gone', price: 5 })
      ]);

      expect(component.valueByWarehouse()).toEqual([
        { label: 'Backup', value: 30, count: 1 },
        { label: 'Main', value: 10, count: 1 },
        { label: 'No Warehouse', value: 5, count: 1 }
      ]);
    });

    it('groups value by supplier name and falls back to No Supplier', async () => {
      await setup([
        item({ id: 'a', supplierId: 's1', price: 10 }),
        item({ id: 'b', supplierId: undefined, price: 3 })
      ]);

      expect(component.valueBySupplier()).toEqual([
        { label: 'Acme', value: 10, count: 1 },
        { label: 'No Supplier', value: 3, count: 1 }
      ]);
    });

    it('lists the ten most valuable items with their total value', async () => {
      const many = Array.from({ length: 12 }, (_, n) => item({ id: `i${n}`, price: n + 1, quantity: 1 }));
      await setup(many);

      const top = component.topItems();
      expect(top).toHaveSize(10);
      expect(top[0].id).toBe('i11');
      expect(top[0].totalValue).toBe(12);
      expect(top[9].id).toBe('i2');
    });

    it('scopes every aggregate to the selected warehouse', async () => {
      await setup([
        item({ id: 'a', warehouseId: 'w1', price: 10 }),
        item({ id: 'b', warehouseId: 'w2', price: 100 })
      ]);

      component.selectedWarehouseId.set('w2');

      expect(component.totalValue()).toBe(100);
      expect(component.topItems().map((i) => i.id)).toEqual(['b']);
    });
  });

  describe('transactions report', () => {
    const txs = [
      tx({ id: 'in', type: TransactionType.IN, date: new Date('2026-01-15T12:00:00Z'), items: [{ id: '1', inventoryItemId: 'a', quantity: 1 }] }),
      tx({ id: 'out', type: TransactionType.OUT, date: new Date('2026-01-15T12:00:00Z'), items: [{ id: '2', inventoryItemId: 'a', quantity: 1 }, { id: '3', inventoryItemId: 'b', quantity: 1 }] }),
      tx({ id: 'old', type: TransactionType.TRANSFER, date: new Date('2026-01-05T12:00:00Z') }),
      tx({ id: 'new', type: TransactionType.TRANSFER, date: new Date('2026-01-25T12:00:00Z') })
    ];

    it('returns every transaction when no filter is set', async () => {
      await setup([], txs);

      expect(component.filteredTransactions().map((t) => t.id)).toEqual(['in', 'out', 'old', 'new']);
    });

    it('filters by type', async () => {
      await setup([], txs);

      component.onTransactionTypeChange('OUT');

      expect(component.filteredTransactions().map((t) => t.id)).toEqual(['out']);
    });

    it('filters by date range', async () => {
      await setup([], txs);

      component.onDateFromChange('2026-01-10');
      component.onDateToChange('2026-01-20');

      expect(component.filteredTransactions().map((t) => t.id)).toEqual(['in', 'out']);
    });

    it('keeps the first day and the whole last day of the range, in local time', async () => {
      await setup([], [
        tx({ id: 'before', date: new Date(2026, 0, 9, 23, 0) }),
        tx({ id: 'first', date: new Date(2026, 0, 10, 0, 30) }),
        tx({ id: 'last', date: new Date(2026, 0, 20, 22, 0) }),
        tx({ id: 'edge', date: new Date(2026, 0, 20, 23, 59, 59, 500) }),
        tx({ id: 'after', date: new Date(2026, 0, 21, 0, 30) })
      ]);

      component.onDateFromChange('2026-01-10');
      component.onDateToChange('2026-01-20');

      expect(component.filteredTransactions().map((t) => t.id)).toEqual(['first', 'last', 'edge']);
    });

    it('resets every filter with clearTransactionFilters', async () => {
      await setup([], txs);
      component.onTransactionTypeChange('OUT');
      component.onDateFromChange('2026-01-10');
      component.onDateToChange('2026-01-20');

      component.clearTransactionFilters();

      expect(component.filteredTransactions()).toHaveSize(4);
      expect(component.transactionTypeFilter()).toBe('ALL');
    });

    it('scopes to the selected warehouse on the source or the destination side', async () => {
      await setup([], [
        tx({ id: 'src', sourceWarehouseId: 'w1' }),
        tx({ id: 'dst', destinationWarehouseId: 'w1' }),
        tx({ id: 'other', sourceWarehouseId: 'w2' })
      ]);

      component.selectedWarehouseId.set('w1');

      expect(component.filteredTransactions().map((t) => t.id)).toEqual(['src', 'dst']);
    });

    it('counts totals per type and the number of transaction items', async () => {
      await setup([], txs);

      expect(component.transactionStats()).toEqual({
        total: 4,
        inCount: 1,
        outCount: 1,
        transferCount: 2,
        totalItems: 3
      });
    });
  });

  describe('status report', () => {
    const items = [
      item({ id: 'a', status: InventoryStatus.IN_STOCK }),
      item({ id: 'b', status: InventoryStatus.LOW_STOCK }),
      item({ id: 'c', status: InventoryStatus.LOW_STOCK }),
      item({ id: 'd', status: InventoryStatus.OUT_OF_STOCK }),
      item({ id: 'e', status: InventoryStatus.IN_USE })
    ];

    it('summarises the four statuses in a fixed order', async () => {
      await setup(items);

      expect(component.statusSummary().map((s) => [s.status, s.count])).toEqual([
        [InventoryStatus.IN_STOCK, 1],
        [InventoryStatus.LOW_STOCK, 2],
        [InventoryStatus.OUT_OF_STOCK, 1],
        [InventoryStatus.IN_USE, 1]
      ]);
    });

    it('keeps at most ten sample items per status', async () => {
      await setup(Array.from({ length: 15 }, (_, n) => item({ id: `s${n}`, status: InventoryStatus.LOW_STOCK })));

      const low = component.statusSummary().find((s) => s.status === InventoryStatus.LOW_STOCK);
      expect(low?.count).toBe(15);
      expect(low?.items).toHaveSize(10);
    });

    it('exposes the low stock and out of stock lists', async () => {
      await setup(items);

      expect(component.lowStockItems().map((i) => i.id)).toEqual(['b', 'c']);
      expect(component.outOfStockItems().map((i) => i.id)).toEqual(['d']);
    });

    it('ignores the currency filter', async () => {
      await setup([item({ id: 'hnl', currency: Currency.HNL, status: InventoryStatus.LOW_STOCK })]);

      expect(component.lowStockItems().map((i) => i.id)).toEqual(['hnl']);
    });
  });

  describe('assignments report', () => {
    const user = (id: string, name: string, email: string) => ({ id, name, email, role: 'USER' as never });
    const items = [
      item({ id: 'a1', itemType: ItemType.UNIQUE, assignedToUserId: 'u1', assignedToUser: user('u1', 'Ana', 'ana@x.com') }),
      item({ id: 'a2', itemType: ItemType.UNIQUE, assignedToUserId: 'u1', assignedToUser: user('u1', 'Ana', 'ana@x.com') }),
      item({ id: 'b1', itemType: ItemType.UNIQUE, assignedToUserId: 'u2' }),
      item({ id: 'free', itemType: ItemType.UNIQUE }),
      item({ id: 'bulk', itemType: ItemType.BULK, assignedToUserId: 'u1' })
    ];

    it('only counts unique items that have an assignee', async () => {
      await setup(items);

      expect(component.assignedItems().map((i) => i.id)).toEqual(['a1', 'a2', 'b1']);
      expect(component.unassignedUniqueItems().map((i) => i.id)).toEqual(['free']);
    });

    it('groups by user, most items first, with an Unknown fallback name', async () => {
      await setup(items);

      const groups = component.assignmentsByUser();
      expect(groups.map((g) => [g.userId, g.userName, g.userEmail, g.itemCount])).toEqual([
        ['u1', 'Ana', 'ana@x.com', 2],
        ['u2', 'Unknown', '', 1]
      ]);
      expect(groups[0].items.map((i) => i.id)).toEqual(['a1', 'a2']);
    });
  });

  describe('trends', () => {
    it('returns 30 ascending local days ending today, all zeroed when there are no transactions', async () => {
      await setup([]);

      const trends = atNow(() => component.transactionTrends());
      expect(trends).toHaveSize(30);
      expect(trends[0].date).toBe('2026-08-26');
      expect(trends[29].date).toBe('2026-09-24');
      expect(trends.map((t) => t.date)).toEqual([...trends.map((t) => t.date)].sort());
      expect(trends.every((t) => t.in + t.out + t.transfer === 0)).toBe(true);
    });

    it('counts transactions per day and type and ignores days outside the window', async () => {
      await setup([], [
        tx({ id: '1', type: TransactionType.IN, date: daysBefore(0) }),
        tx({ id: '2', type: TransactionType.IN, date: daysBefore(0) }),
        tx({ id: '3', type: TransactionType.OUT, date: daysBefore(5) }),
        tx({ id: '4', type: TransactionType.TRANSFER, date: daysBefore(5) }),
        tx({ id: '5', type: TransactionType.IN, date: daysBefore(60) })
      ]);

      const trends = atNow(() => component.transactionTrends());
      expect(trends[29]).toEqual(jasmine.objectContaining({ in: 2, out: 0, transfer: 0 }));
      expect(trends[24]).toEqual(jasmine.objectContaining({ in: 0, out: 1, transfer: 1 }));
      expect(trends.reduce((sum, t) => sum + t.in + t.out + t.transfer, 0)).toBe(4);
    });

    it('puts a transaction on the local day it happened, right after and right before midnight', async () => {
      await setup([], [
        tx({ id: 'early', type: TransactionType.IN, date: new Date(2026, 8, 24, 0, 30) }),
        tx({ id: 'late', type: TransactionType.IN, date: new Date(2026, 8, 24, 23, 30) })
      ]);

      const today = atNow(() => component.transactionTrends()[29]);

      expect(today).toEqual(jasmine.objectContaining({ date: '2026-09-24', in: 2 }));
    });
  });

  describe('exports', () => {
    type XlsxModule = typeof import('xlsx-js-style');
    let XLSX: XlsxModule;
    let written: { workbook: WorkBook; filename: string }[];

    // What the user downloads is whatever XLSX.writeFile receives (same seam as xlsx.utils.spec).
    beforeEach(async () => {
      written = [];
      const loaded = (await import('xlsx-js-style')) as XlsxModule & { default?: XlsxModule };
      XLSX = loaded.default ?? loaded;
      spyOn(XLSX, 'writeFile').and.callFake(((workbook: WorkBook, filename: string) => {
        written.push({ workbook, filename });
      }) as never);
    });

    /** First column of every row of the last export: the item name. */
    const exportedNames = (): unknown[] => {
      const { workbook } = written[written.length - 1];
      return XLSX.utils
        .sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]])
        .map((row) => Object.values(row)[0]);
    };

    it('exports every item in the status file when no warehouse is selected', async () => {
      await setup([item({ id: 'a', name: 'Main item', warehouseId: 'w1' }), item({ id: 'b', name: 'Backup item', warehouseId: 'w2' })]);

      await component.exportStatusReport();

      expect(exportedNames()).toEqual(['Main item', 'Backup item']);
    });

    it('limits the status file to the selected warehouse', async () => {
      await setup([item({ id: 'a', name: 'Main item', warehouseId: 'w1' }), item({ id: 'b', name: 'Backup item', warehouseId: 'w2' })]);
      component.selectedWarehouseId.set('w1');

      await component.exportStatusReport();

      expect(exportedNames()).toEqual(['Main item']);
    });

    it('limits the assignments file to the unique items of the selected warehouse', async () => {
      await setup([
        item({ id: 'a', name: 'Main laptop', itemType: ItemType.UNIQUE, warehouseId: 'w1' }),
        item({ id: 'b', name: 'Backup laptop', itemType: ItemType.UNIQUE, warehouseId: 'w2' }),
        item({ id: 'c', name: 'Main cable', itemType: ItemType.BULK, warehouseId: 'w1' })
      ]);
      component.selectedWarehouseId.set('w1');

      await component.exportAssignments();

      expect(exportedNames()).toEqual(['Main laptop']);
    });
  });

  describe('tabs', () => {
    it('starts on the value tab and switches with onTabChange', async () => {
      await setup([]);

      expect(component.activeTab()).toBe(0);

      component.onTabChange(3);

      expect(component.activeTab()).toBe(3);
    });
  });

  describe('tab wiring', () => {
    // Guards the split: a swapped input/output between reports.ts and a tab
    // (wrong signal, or csvRequested wired to the PDF export) still passes
    // strictTemplates because the types line up. Only calling through the
    // real DOM catches it.
    const child = <T>(type: Type<T>): T =>
      fixture.debugElement.query(By.directive(type)).componentInstance as T;

    it('passes the value tab its data and forwards its outputs', async () => {
      await setup([item({ id: 'a', price: 10, quantity: 2 })]);

      const tab = child(ReportsValueTab);
      expect(tab.totalValue()).toBe(component.totalValue());
      expect(tab.topItems()).toEqual(component.topItems());

      spyOn(component, 'exportReport');
      spyOn(component, 'exportValueReportPDF');
      tab.csvRequested.emit();
      expect(component.exportReport).toHaveBeenCalledTimes(1);
      expect(component.exportValueReportPDF).not.toHaveBeenCalled();
      tab.pdfRequested.emit();
      expect(component.exportValueReportPDF).toHaveBeenCalledTimes(1);
    });

    it('passes the status tab its data and forwards its outputs', async () => {
      await setup([item({ status: InventoryStatus.LOW_STOCK })]);
      component.onTabChange(2);
      fixture.detectChanges();

      const tab = child(ReportsStatusTab);
      expect(tab.summaries()).toEqual(component.statusSummary());
      expect(tab.lowStockItems()).toEqual(component.lowStockItems());

      spyOn(component, 'exportStatusReport');
      spyOn(component, 'exportStatusReportPDF');
      tab.csvRequested.emit();
      expect(component.exportStatusReport).toHaveBeenCalledTimes(1);
      expect(component.exportStatusReportPDF).not.toHaveBeenCalled();
      tab.pdfRequested.emit();
      expect(component.exportStatusReportPDF).toHaveBeenCalledTimes(1);
    });

    it('passes the assignments tab its data and forwards its outputs', async () => {
      await setup([item({ itemType: ItemType.UNIQUE, assignedToUserId: 'u1' })]);
      component.onTabChange(3);
      fixture.detectChanges();

      const tab = child(ReportsAssignmentsTab);
      expect(tab.assignedItems()).toEqual(component.assignedItems());
      expect(tab.assignmentsByUser()).toEqual(component.assignmentsByUser());

      spyOn(component, 'exportAssignments');
      spyOn(component, 'exportAssignmentsReportPDF');
      tab.csvRequested.emit();
      expect(component.exportAssignments).toHaveBeenCalledTimes(1);
      expect(component.exportAssignmentsReportPDF).not.toHaveBeenCalled();
      tab.pdfRequested.emit();
      expect(component.exportAssignmentsReportPDF).toHaveBeenCalledTimes(1);
    });

    it('passes the transactions tab its own loading flag, not the items one', async () => {
      // Items never resolve (loading() stuck true) while transactions do
      // (transactionsLoading() false), so a swap between the two signals
      // shows up as the tab rendering its spinner forever.
      await setup([], [tx({ id: 't1' })], NEVER);
      component.onTabChange(1);
      fixture.detectChanges();

      const tab = child(ReportsTransactionsTab);
      expect(tab.loading()).toBe(false);
      expect(tab.transactions()).toEqual(component.filteredTransactions());
      expect(tab.stats()).toEqual(component.transactionStats());

      spyOn(component, 'exportTransactions');
      spyOn(component, 'exportTransactionsPDF');
      tab.csvRequested.emit();
      expect(component.exportTransactions).toHaveBeenCalledTimes(1);
      expect(component.exportTransactionsPDF).not.toHaveBeenCalled();
      tab.pdfRequested.emit();
      expect(component.exportTransactionsPDF).toHaveBeenCalledTimes(1);

      const dateSpy = jasmine.createSpy();
      spyOn(component, 'onDateFromChange').and.callFake(dateSpy);
      tab.dateFromChange.emit('2026-01-01');
      expect(dateSpy).toHaveBeenCalledOnceWith('2026-01-01');
    });

    it('passes the trends tab its own loading flag, not the items one', async () => {
      // Transactions never resolve (transactionsLoading() stuck true) while
      // items do (loading() false, so the tab is not hidden behind the
      // parent's own spinner). A swap between the two signals shows up as
      // the tab missing its spinner.
      await setup([], [], undefined, NEVER);
      component.onTabChange(4);
      fixture.detectChanges();

      const tab = child(ReportsTrendsTab);
      expect(tab.loading()).toBe(true);
      expect(tab.trends()).toEqual(component.transactionTrends());
    });

    it('passes the downloads tab the selected warehouse', async () => {
      await setup([]);
      component.onTabChange(5);
      component.selectedWarehouseId.set('w1');
      fixture.detectChanges();

      expect(child(ReportsDownloadsTab).warehouseId()).toBe('w1');
    });
  });
});
