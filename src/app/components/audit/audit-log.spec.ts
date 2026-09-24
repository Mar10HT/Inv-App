import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { AuditLogComponent } from './audit-log';
import { AuditService } from '../../services/audit.service';
import { AuditAction, AuditEntity, AuditLog } from '../../interfaces/audit.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

// Oldest first, like an unsorted API response: log-0 is the oldest, log-24 the newest.
const logs = (count: number): AuditLog[] =>
  Array.from({ length: count }, (_, n) => ({
    id: `log-${n}`,
    action: AuditAction.UPDATE,
    entity: AuditEntity.INVENTORY_ITEM,
    entityId: `e${n}`,
    entityName: `Item ${n}`,
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

  const shownNames = (): (string | undefined)[] =>
    Array.from(el.querySelectorAll('.divide-y > div')).map((row) =>
      row.querySelector('p.text-sm')?.textContent?.trim()
    );

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
});
