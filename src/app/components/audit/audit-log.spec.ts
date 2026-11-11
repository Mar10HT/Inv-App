import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { AuditLogComponent } from './audit-log';
import { AuditService } from '../../services/audit.service';
import { AuditAction, AuditLog } from '../../interfaces/audit.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

// Oldest first, like an unsorted API response: log-0 is the oldest, log-24 the newest.
const logs = (count: number): AuditLog[] =>
  Array.from({ length: count }, (_, n) => ({
    id: `log-${n}`,
    action: AuditAction.UPDATE,
    entity: 'InventoryItem',
    entityId: `e${n}`,
    entityName: `Item ${n}`,
    after: { name: `Item ${n}` },
    userId: 'u1',
    userName: 'Ana',
    userEmail: 'ana@x.com',
    changes: [],
    createdAt: new Date(2026, 0, 1 + n)
  }));

describe('AuditLogComponent', () => {
  let fixture: ComponentFixture<AuditLogComponent>;
  let component: AuditLogComponent;
  let el: HTMLElement;
  let serviceLogs: WritableSignal<AuditLog[]>;

  // The specs translate to the keys themselves, so the rows' sentences carry no names:
  // the page's own list says which entries are shown, and the DOM has one row per entry
  const shownNames = (): (string | undefined)[] => {
    const shown = component.paginatedLogs().map((l) => l.entityName);
    expect(el.querySelectorAll('ul > li > button').length).toBe(shown.length);
    return shown;
  };

  const setup = async (data: AuditLog[]): Promise<void> => {
    serviceLogs = signal(data);
    await TestBed.configureTestingModule({
      imports: [AuditLogComponent],
      providers: [
        ...provideTestBedDefaults(),
        {
          provide: AuditService,
          useValue: { logs: serviceLogs, loading: signal(false), loadLogs: jasmine.createSpy('loadLogs') }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  };

  describe('pagination', () => {
    beforeEach(() => setup(logs(25)));

    it('shows the newest ten logs on the first page', () => {
      expect(shownNames()).toEqual(
        ['Item 24', 'Item 23', 'Item 22', 'Item 21', 'Item 20', 'Item 19', 'Item 18', 'Item 17', 'Item 16', 'Item 15']
      );
    });

    it('moves to the next page when the paginator changes', () => {
      component.onPageChange({ pageIndex: 1, pageSize: 10 });
      fixture.detectChanges();

      expect(shownNames()[0]).toBe('Item 14');
      expect(shownNames()).toHaveSize(10);
    });

    it('shows a partial last page', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 10 });
      fixture.detectChanges();

      expect(shownNames()).toHaveSize(5);
    });

    it('honours a new page size', () => {
      component.onPageChange({ pageIndex: 0, pageSize: 25 });
      fixture.detectChanges();

      expect(shownNames()).toHaveSize(25);
      expect(el.querySelector('mat-paginator')).toBeNull();
    });

    it('goes back to the first page when a filter changes', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 10 });
      component.searchQuery = 'Item';
      component.applyFilters();
      fixture.detectChanges();

      expect(shownNames()[0]).toBe('Item 24');
    });
  });

  describe('sorting', () => {
    it('does not reorder the array owned by the service', async () => {
      await setup(logs(3));

      expect(serviceLogs().map((l) => l.id)).toEqual(['log-0', 'log-1', 'log-2']);
      expect(shownNames()).toEqual(['Item 2', 'Item 1', 'Item 0']);
    });
  });

  describe('record type filter', () => {
    it('offers the kinds of record in the loaded entries, and keeps only the chosen one', async () => {
      const mixed = [...logs(2), { ...logs(1)[0], id: 'sale', entity: 'Sale', after: { number: 'V-1' } }];
      await setup(mixed);

      expect(component.entityOptions().map((o) => o.value).sort()).toEqual(['InventoryItem', 'Sale']);

      component.selectedEntity = 'Sale';
      component.applyFilters();

      expect(component.filteredLogs().map((l) => l.id)).toEqual(['sale']);
    });
  });

  describe('detail', () => {
    const edited: AuditLog = {
      ...logs(1)[0],
      id: 'edit',
      before: { name: 'Headset', price: 53.7 },
      after: { name: 'Headset', price: 60 },
      changes: [{ field: 'price', oldValue: 53.7, newValue: 60 }],
    };

    it('opens with a row per field, before and after, when an entry is clicked', async () => {
      await setup([edited]);

      (el.querySelector('ul > li > button') as HTMLButtonElement).click();
      fixture.detectChanges();

      const dialog = el.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      const cells = Array.from(dialog!.querySelectorAll('tbody tr > *')).map((c) => c.textContent?.trim());
      // The specs have no translations, so the field falls back to its readable name
      expect(cells).toEqual(['Price', '53.70', '60.00']);
    });

    it('shows a single value column for an entry that only sets values', async () => {
      await setup([{ ...edited, before: undefined, changes: [{ field: 'price', oldValue: null, newValue: 60 }] }]);

      component.openDetail(component.filteredLogs()[0]);
      fixture.detectChanges();

      expect(el.querySelectorAll('[role="dialog"] thead th').length).toBe(2);
    });

    it('closes with Escape', async () => {
      await setup([edited]);
      component.openDetail(edited);
      fixture.detectChanges();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(el.querySelector('[role="dialog"]')).toBeNull();
    });
  });
});
