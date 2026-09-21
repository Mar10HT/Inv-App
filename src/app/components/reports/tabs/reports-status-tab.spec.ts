import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsStatusTab } from './reports-status-tab';
import { StatusSummary } from '../reports.types';
import { InventoryStatus } from '../../../interfaces/inventory-item.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';
import { item, warehouse } from '../../../../testing/report-fixtures';

const summary: StatusSummary[] = [
  { status: InventoryStatus.IN_STOCK, count: 5, items: [] },
  { status: InventoryStatus.LOW_STOCK, count: 2, items: [] },
  { status: InventoryStatus.OUT_OF_STOCK, count: 1, items: [] },
  { status: InventoryStatus.IN_USE, count: 3, items: [] }
];

describe('ReportsStatusTab', () => {
  let fixture: ComponentFixture<ReportsStatusTab>;
  let component: ReportsStatusTab;
  let el: HTMLElement;

  const render = (lowStock = [item()], outOfStock = [item()]): void => {
    fixture.componentRef.setInput('summaries', summary);
    fixture.componentRef.setInput('lowStockItems', lowStock);
    fixture.componentRef.setInput('outOfStockItems', outOfStock);
    fixture.detectChanges();
  };

  const panel = (headerKey: string): HTMLElement => {
    const h2 = Array.from(el.querySelectorAll('h2')).find((h) => h.textContent?.includes(headerKey));
    return h2?.parentElement?.parentElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsStatusTab],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsStatusTab);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
  });

  it('shows one card per status with its count', () => {
    render();

    const cards = Array.from(el.querySelectorAll('p.text-3xl')).map((p) => p.textContent?.trim());
    expect(cards).toEqual(['5', '2', '1', '3']);
    for (const status of Object.values(InventoryStatus)) {
      expect(el.textContent).toContain(`STATUS.${status}`);
    }
  });

  it('lists out of stock items with category, warehouse and minimum', () => {
    render([], [
      item({ id: 'a', name: 'Cable', category: 'Parts', minQuantity: 4, warehouse: warehouse('w1', 'Main') }),
      item({ id: 'b', name: 'Router', category: 'Net', minQuantity: 1, warehouse: undefined })
    ]);

    const text = panel('REPORTS.OUT_OF_STOCK_ITEMS').textContent ?? '';
    expect(text).toContain('Cable');
    expect(text).toContain('Parts - Main');
    expect(text).toContain('Min: 4');
    expect(text).toContain('Net - -');
  });

  it('lists low stock items as quantity over minimum', () => {
    render([item({ name: 'Cable', quantity: 2, minQuantity: 5 })], []);

    const text = panel('REPORTS.LOW_STOCK_ITEMS').textContent ?? '';
    expect(text).toContain('Cable');
    expect(text).toContain('2 / 5');
  });

  it('shows the list sizes in the panel headers', () => {
    render([item({ id: '1' }), item({ id: '2' })], [item({ id: '3' })]);

    expect(panel('REPORTS.LOW_STOCK_ITEMS').querySelector('span.ml-auto')?.textContent?.trim()).toBe('2');
    expect(panel('REPORTS.OUT_OF_STOCK_ITEMS').querySelector('span.ml-auto')?.textContent?.trim()).toBe('1');
  });

  it('shows an empty message when a list has no items', () => {
    render([], []);

    expect(panel('REPORTS.OUT_OF_STOCK_ITEMS').textContent).toContain('REPORTS.NO_OUT_OF_STOCK');
    expect(panel('REPORTS.LOW_STOCK_ITEMS').textContent).toContain('REPORTS.NO_LOW_STOCK');
  });

  it('asks the parent for the CSV and the PDF export', () => {
    render();
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

  it('picks an icon per status', () => {
    expect(component.getStatusIcon(InventoryStatus.IN_STOCK)).toBe('CheckCircle2');
    expect(component.getStatusIcon(InventoryStatus.LOW_STOCK)).toBe('AlertTriangle');
    expect(component.getStatusIcon(InventoryStatus.OUT_OF_STOCK)).toBe('XCircle');
    expect(component.getStatusIcon(InventoryStatus.IN_USE)).toBe('User');
    expect(component.getStatusIcon('other' as InventoryStatus)).toBe('HelpCircle');
  });
});
