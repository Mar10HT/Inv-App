import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardRecentItems } from './dashboard-recent-items';
import { InventoryItemInterface, InventoryStatus } from '../../../../interfaces/inventory-item.interface';
import { provideTestBedDefaults } from '../../../../../testing/test-providers';

const item = (overrides: Record<string, unknown> = {}): InventoryItemInterface =>
  ({
    id: '1',
    name: 'Laptop',
    description: 'Work laptop',
    category: 'Computers',
    quantity: 3,
    price: 1200,
    currency: 'USD',
    status: InventoryStatus.IN_STOCK,
    ...overrides
  }) as unknown as InventoryItemInterface;

describe('DashboardRecentItems', () => {
  let fixture: ComponentFixture<DashboardRecentItems>;
  let el: HTMLElement;
  let component: DashboardRecentItems;

  const emitted = {
    view: [] as InventoryItemInterface[],
    edit: [] as InventoryItemInterface[],
    del: [] as InventoryItemInterface[],
    add: 0,
    viewAll: 0
  };

  const render = (items: InventoryItemInterface[], loading = false): void => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('loading', loading);
    fixture.detectChanges();
  };
  const buttons = (label: string): HTMLButtonElement[] =>
    Array.from(el.querySelectorAll<HTMLButtonElement>(`button[aria-label^="${label}"]`));

  const first = item({ id: '1', name: 'Laptop' });
  const second = item({ id: '2', name: 'Mouse', price: 0, status: InventoryStatus.LOW_STOCK });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardRecentItems],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardRecentItems);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;

    emitted.view = [];
    emitted.edit = [];
    emitted.del = [];
    emitted.add = 0;
    emitted.viewAll = 0;
    component.viewRequested.subscribe((i) => emitted.view.push(i));
    component.editRequested.subscribe((i) => emitted.edit.push(i));
    component.deleteRequested.subscribe((i) => emitted.del.push(i));
    component.addRequested.subscribe(() => emitted.add++);
    component.viewAllRequested.subscribe(() => emitted.viewAll++);
  });

  describe('empty state', () => {
    it('is shown when there are no items and nothing is loading, and offers to add one', () => {
      render([]);

      expect(el.textContent).toContain('INVENTORY.NO_ITEMS');
      expect(el.querySelector('table')).toBeNull();

      const add = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('DASHBOARD.ADD_NEW_ITEM'));
      add?.click();
      expect(emitted.add).toBe(1);
    });

    it('is not shown while loading', () => {
      render([], true);

      expect(el.textContent).not.toContain('INVENTORY.NO_ITEMS');
      expect(el.querySelector('table')).not.toBeNull();
    });
  });

  describe('table', () => {
    it('renders one row per item with name, category, quantity and formatted price', () => {
      render([first, second]);

      const rows = el.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Laptop');
      expect(rows[0].textContent).toContain('Computers');
      expect(rows[0].textContent).toContain('$1,200');
    });

    it('shows a dash instead of a price when the item has none', () => {
      render([second]);

      expect(el.querySelector('tbody tr')?.textContent).toContain('-');
      expect(el.querySelector('tbody tr')?.textContent).not.toContain('$');
    });

    it('translates the status through its key', () => {
      render([first, second]);

      const text = el.querySelector('tbody')?.textContent ?? '';
      expect(text).toContain('INVENTORY.STATUS.IN_STOCK');
      expect(text).toContain('INVENTORY.STATUS.LOW_STOCK');
    });

    it('also renders a card per item for small screens', () => {
      render([first, second]);

      expect(el.querySelectorAll('[class*="lg:hidden"] [aria-label^="COMMON.VIEW"]').length).toBe(2);
    });
  });

  describe('actions', () => {
    it('clicking a row views that item', () => {
      render([first, second]);

      el.querySelectorAll<HTMLElement>('tbody tr')[1].click();

      expect(emitted.view).toEqual([second]);
    });

    it('the row buttons emit their own action without also opening the item', () => {
      render([first, second]);

      buttons('COMMON.EDIT')[0].click();
      buttons('COMMON.DELETE')[1].click();

      expect(emitted.edit).toEqual([first]);
      expect(emitted.del).toEqual([second]);
      expect(emitted.view).toEqual([]);
    });

    it('the view button emits the item once', () => {
      render([first]);

      buttons('COMMON.VIEW')[0].click();

      expect(emitted.view).toEqual([first]);
    });

    it('the mobile card buttons emit the same actions', () => {
      render([first, second]);

      // Desktop rows come first, so the third button is the first mobile card.
      buttons('COMMON.EDIT')[2].click();
      buttons('COMMON.DELETE')[3].click();

      expect(emitted.edit).toEqual([first]);
      expect(emitted.del).toEqual([second]);
    });

    it('the "view all" link emits viewAllRequested', () => {
      render([first]);

      Array.from(el.querySelectorAll('button'))
        .find((b) => b.textContent?.includes('COMMON.VIEW_ALL'))
        ?.click();

      expect(emitted.viewAll).toBe(1);
    });
  });

  describe('helpers', () => {
    it('maps each status to its translation key and passes unknown ones through', () => {
      expect(component.getStatusKey(InventoryStatus.IN_STOCK)).toBe('INVENTORY.STATUS.IN_STOCK');
      expect(component.getStatusKey(InventoryStatus.LOW_STOCK)).toBe('INVENTORY.STATUS.LOW_STOCK');
      expect(component.getStatusKey(InventoryStatus.OUT_OF_STOCK)).toBe('INVENTORY.STATUS.OUT_OF_STOCK');
      expect(component.getStatusKey(InventoryStatus.IN_USE)).toBe('INVENTORY.STATUS.IN_USE');
      expect(component.getStatusKey('WHATEVER' as InventoryStatus)).toBe('WHATEVER');
    });

    it('formats currency without forced decimals', () => {
      expect(component.formatCurrency(1200)).toBe('$1,200');
      expect(component.formatCurrency(1234.5)).toBe('$1,234.5');
      expect(component.formatCurrency(10, 'EUR')).toBe('€10');
    });

    it('tracks items by id', () => {
      expect(component.trackByFn(0, first)).toBe('1');
    });
  });
});
