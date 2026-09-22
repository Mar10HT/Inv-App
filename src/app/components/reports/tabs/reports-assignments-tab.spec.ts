import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsAssignmentsTab } from './reports-assignments-tab';
import { AssignmentSummary } from '../reports.types';
import { InventoryItemInterface, ItemType } from '../../../interfaces/inventory-item.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';
import { item } from '../../../../testing/report-fixtures';

const unique = (id: string, overrides: Partial<InventoryItemInterface> = {}): InventoryItemInterface =>
  item({ id, name: `Laptop ${id}`, itemType: ItemType.UNIQUE, ...overrides });

const group = (userName: string, items: InventoryItemInterface[]): AssignmentSummary => ({
  userId: userName,
  userName,
  userEmail: `${userName}@x.com`,
  itemCount: items.length,
  items
});

describe('ReportsAssignmentsTab', () => {
  let fixture: ComponentFixture<ReportsAssignmentsTab>;
  let component: ReportsAssignmentsTab;
  let el: HTMLElement;

  const render = (
    assigned: InventoryItemInterface[],
    unassigned: InventoryItemInterface[],
    groups: AssignmentSummary[]
  ): void => {
    fixture.componentRef.setInput('assignedItems', assigned);
    fixture.componentRef.setInput('unassignedUniqueItems', unassigned);
    fixture.componentRef.setInput('assignmentsByUser', groups);
    fixture.detectChanges();
  };

  const panel = (headerKey: string): HTMLElement | undefined => {
    const h2 = Array.from(el.querySelectorAll('h2')).find((h) => h.textContent?.includes(headerKey));
    return h2?.parentElement?.parentElement ?? undefined;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsAssignmentsTab],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsAssignmentsTab);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
  });

  it('shows the total, assigned and unassigned counters', () => {
    render([unique('1'), unique('2'), unique('3')], [unique('4'), unique('5')], []);

    const counters = Array.from(el.querySelectorAll('p.text-3xl')).map((p) => p.textContent?.trim());
    expect(counters).toEqual(['5', '3', '2']);
  });

  it('shows each user with initial, email and item count', () => {
    render([], [], [group('ana', [unique('1'), unique('2')])]);

    const text = panel('REPORTS.ASSIGNMENTS_BY_USER')?.textContent ?? '';
    expect(text).toContain('ana@x.com');
    expect(text).toContain('2 REPORTS.ITEMS');
    expect(el.querySelector('.w-10')?.textContent?.trim()).toBe('A');
  });

  it('previews five items per user and counts the rest', () => {
    const items = Array.from({ length: 8 }, (_, n) => unique(String(n)));
    render([], [], [group('ana', items)]);

    const text = panel('REPORTS.ASSIGNMENTS_BY_USER')?.textContent ?? '';
    expect(text).toContain('Laptop 4');
    expect(text).not.toContain('Laptop 5');
    expect(text).toContain('+3 REPORTS.MORE');
  });

  it('does not show the remainder when a user has five items or fewer', () => {
    render([], [], [group('ana', [unique('1'), unique('2'), unique('3'), unique('4'), unique('5')])]);

    expect(el.textContent).not.toContain('REPORTS.MORE');
  });

  it('shows an empty message when nobody has assignments', () => {
    render([], [], []);

    expect(panel('REPORTS.ASSIGNMENTS_BY_USER')?.textContent).toContain('REPORTS.NO_ASSIGNMENTS');
  });

  it('lists unassigned items with their tag, serial number or a dash', () => {
    render([], [unique('1', { serviceTag: 'TAG1' }), unique('2', { serialNumber: 'SN2' }), unique('3')], []);

    const labels = Array.from(panel('REPORTS.UNASSIGNED_ITEMS')?.querySelectorAll('p.text-xs') ?? []).map((p) =>
      p.textContent?.trim()
    );
    expect(labels).toEqual(['TAG1', 'SN2', '-']);
  });

  it('hides the unassigned panel when every unique item is assigned', () => {
    render([unique('1')], [], []);

    expect(panel('REPORTS.UNASSIGNED_ITEMS')).toBeUndefined();
  });

  it('asks the parent for the CSV and the PDF export', () => {
    render([], [], []);
    const csv = jasmine.createSpy('csv');
    const pdf = jasmine.createSpy('pdf');
    component.csvRequested.subscribe(csv);
    component.pdfRequested.subscribe(pdf);
    const [csvButton, pdfButton] = Array.from(el.querySelectorAll('button'));

    csvButton.click();
    expect(csv).toHaveBeenCalledTimes(1);
    expect(pdf).not.toHaveBeenCalled();

    pdfButton.click();
    expect(pdf).toHaveBeenCalledTimes(1);
  });
});
