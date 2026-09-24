import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { DischargeListComponent } from './discharge-list';
import { DischargeRequestService } from '../../../services/discharge-request.service';
import { DischargeRequest, DischargeRequestStatus } from '../../../interfaces/discharge-request.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

// Oldest first, like an unsorted API response: Requester 0 is the oldest, Requester 24 the newest.
const requests = (count: number): DischargeRequest[] =>
  Array.from({ length: count }, (_, n) => ({
    id: `dr-${n}`,
    requesterName: `Requester ${n}`,
    warehouseId: 'w1',
    warehouseName: 'Main',
    status: DischargeRequestStatus.PENDING,
    items: [],
    createdAt: new Date(2026, 0, 1 + n),
    updatedAt: new Date(2026, 0, 1 + n)
  }));

describe('DischargeListComponent', () => {
  let fixture: ComponentFixture<DischargeListComponent>;
  let component: DischargeListComponent;
  let el: HTMLElement;
  let serviceRequests: WritableSignal<DischargeRequest[]>;

  const shownNames = (): (string | undefined)[] =>
    Array.from(el.querySelectorAll('tbody tr')).map((row) => row.querySelector('p.font-medium')?.textContent?.trim());

  const flush = (): void => {
    TestBed.tick();
    fixture.detectChanges();
  };

  const setup = async (data: DischargeRequest[]): Promise<void> => {
    serviceRequests = signal(data);
    await TestBed.configureTestingModule({
      imports: [DischargeListComponent],
      providers: [
        ...provideTestBedDefaults(),
        {
          provide: DischargeRequestService,
          useValue: {
            requests: serviceRequests,
            stats: signal({ total: 0, byStatus: { pending: 0, completed: 0, rejected: 0 } }),
            loading: signal(false),
            loadRequests: jasmine.createSpy('loadRequests')
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DischargeListComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    flush();
  };

  describe('pagination', () => {
    beforeEach(() => setup(requests(25)));

    it('shows the newest ten requests on the first page', () => {
      expect(shownNames()).toEqual(
        ['Requester 24', 'Requester 23', 'Requester 22', 'Requester 21', 'Requester 20',
         'Requester 19', 'Requester 18', 'Requester 17', 'Requester 16', 'Requester 15']
      );
    });

    it('moves to the next page when the paginator changes', () => {
      component.onPageChange({ pageIndex: 1, pageSize: 10 });
      fixture.detectChanges();

      expect(shownNames()[0]).toBe('Requester 14');
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
  });

  describe('filters', () => {
    beforeEach(() => setup(requests(25)));

    it('goes back to the first page and narrows the list when searching', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 10 });
      component.searchQuery = 'Requester 1';
      component.applyFilters();
      fixture.detectChanges();

      // Matches 1 and 10 to 19: eleven requests, newest first, back on page one.
      expect(shownNames()[0]).toBe('Requester 19');
      expect(component.filteredRequests()).toHaveSize(11);
    });
  });

  describe('data loading', () => {
    it('shows requests that arrive after the initial render, however late', async () => {
      await setup([]);
      expect(component.paginatedRequests()).toEqual([]);

      // Well past the 100 ms the component used to wait before filtering once.
      await new Promise((resolve) => setTimeout(resolve, 150));
      serviceRequests.set(requests(3));
      flush();

      expect(shownNames()).toEqual(['Requester 2', 'Requester 1', 'Requester 0']);
    });
  });

  describe('sorting', () => {
    it('does not reorder the array owned by the service', async () => {
      await setup(requests(3));

      expect(serviceRequests().map((r) => r.id)).toEqual(['dr-0', 'dr-1', 'dr-2']);
      expect(shownNames()).toEqual(['Requester 2', 'Requester 1', 'Requester 0']);
    });
  });
});
