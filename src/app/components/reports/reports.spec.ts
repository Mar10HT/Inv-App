import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { Reports } from './reports';
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

const daysAgo = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

describe('Reports', () => {
  let fixture: ComponentFixture<Reports>;
  let component: Reports;

  const warehouses = [warehouse('w1', 'Main'), warehouse('w2', 'Backup')];
  const suppliers = [supplier('s1', 'Acme')];

  const setup = async (
    items: InventoryItemInterface[],
    transactions: Transaction[] = [],
    itemsSource = of(items)
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
        { provide: TransactionService, useValue: { getAll: () => of(transactions) } }
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
    it('returns 30 ascending days ending today, all zeroed when there are no transactions', async () => {
      await setup([]);

      const trends = component.transactionTrends();
      expect(trends).toHaveSize(30);
      expect(trends[29].date).toBe(new Date().toISOString().split('T')[0]);
      expect(trends.map((t) => t.date)).toEqual([...trends.map((t) => t.date)].sort());
      expect(trends.every((t) => t.in + t.out + t.transfer === 0)).toBe(true);
    });

    it('counts transactions per day and type and ignores days outside the window', async () => {
      await setup([], [
        tx({ id: '1', type: TransactionType.IN, date: daysAgo(0) }),
        tx({ id: '2', type: TransactionType.IN, date: daysAgo(0) }),
        tx({ id: '3', type: TransactionType.OUT, date: daysAgo(5) }),
        tx({ id: '4', type: TransactionType.TRANSFER, date: daysAgo(5) }),
        tx({ id: '5', type: TransactionType.IN, date: daysAgo(60) })
      ]);

      const trends = component.transactionTrends();
      expect(trends[29]).toEqual(jasmine.objectContaining({ in: 2, out: 0, transfer: 0 }));
      expect(trends[24]).toEqual(jasmine.objectContaining({ in: 0, out: 1, transfer: 1 }));
      expect(trends.reduce((sum, t) => sum + t.in + t.out + t.transfer, 0)).toBe(4);
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
});
