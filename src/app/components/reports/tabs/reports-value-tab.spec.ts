import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsValueTab } from './reports-value-tab';
import { ReportCurrency, TopItem, ValueSummary } from '../reports.types';
import { provideTestBedDefaults } from '../../../../testing/test-providers';
import { item } from '../../../../testing/report-fixtures';

const byCategory: ValueSummary[] = [
  { label: 'Parts', value: 1200, count: 3 },
  { label: 'Tools', value: 34.5, count: 1 }
];
const byWarehouse: ValueSummary[] = [{ label: 'Main', value: 1234.5, count: 4 }];
const bySupplier: ValueSummary[] = [];
const top: TopItem[] = [
  { ...item({ id: 'a', name: 'Cable', category: 'Parts', quantity: 3, price: 10 }), totalValue: 30 },
  { ...item({ id: 'b', name: 'Router', category: 'Net', quantity: 1, price: undefined }), totalValue: 0 }
];

describe('ReportsValueTab', () => {
  let fixture: ComponentFixture<ReportsValueTab>;
  let component: ReportsValueTab;
  let el: HTMLElement;

  const render = (inputs: Record<string, unknown> = {}): void => {
    const all = {
      currency: 'USD' as ReportCurrency,
      totalValue: 1234.5,
      totalItemsCount: 8,
      valueByCategory: byCategory,
      valueByWarehouse: byWarehouse,
      valueBySupplier: bySupplier,
      topItems: top,
      ...inputs
    };
    for (const [name, value] of Object.entries(all)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };

  const text = (nodes: Iterable<Element>): (string | undefined)[] =>
    Array.from(nodes).map((n) => n.textContent?.replace(/\s+/g, ' ').trim());

  const section = (headerKey: string): HTMLElement => {
    const h2 = Array.from(el.querySelectorAll('h2')).find((h) => h.textContent?.includes(headerKey));
    return h2?.parentElement?.parentElement as HTMLElement;
  };

  const button = (label: string): HTMLButtonElement | undefined =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(label));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsValueTab],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsValueTab);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
  });

  describe('summary cards', () => {
    it('shows the total value, item count, categories and warehouses', () => {
      render();

      expect(text(el.querySelectorAll('p.text-3xl'))).toEqual(['$1,234.50', '8', '2', '1']);
    });

    it('uses the L symbol for HNL', () => {
      render({ currency: 'HNL' });

      expect(el.querySelector('p.text-3xl')?.textContent?.trim()).toBe('L1,234.50');
    });
  });

  describe('currency formatting', () => {
    it('uses $ for USD and ALL and L for HNL', () => {
      render({ currency: 'USD' });
      expect(component.getCurrencySymbol()).toBe('$');

      fixture.componentRef.setInput('currency', 'ALL');
      expect(component.getCurrencySymbol()).toBe('$');

      fixture.componentRef.setInput('currency', 'HNL');
      expect(component.getCurrencySymbol()).toBe('L');
    });

    it('always shows two decimals with thousands separators', () => {
      render();

      expect(component.formatNumber(0)).toBe('0.00');
      expect(component.formatNumber(1234567.891)).toBe('1,234,567.89');
      expect(component.formatCurrency(5)).toBe('$5.00');
    });
  });

  describe('breakdown sections', () => {
    it('lists label, count and formatted value for each row', () => {
      render();

      const category = section('REPORTS.BY_CATEGORY');
      const rows = Array.from(category.querySelectorAll('div.py-3'));
      expect(text(category.querySelectorAll('span.truncate'))).toEqual(['Parts', 'Tools']);
      expect(text(category.querySelectorAll('span.font-semibold'))).toEqual(['$1,200.00', '$34.50']);
      expect(rows.map((row) => row.querySelector('span.text-center')?.textContent?.trim())).toEqual(['3', '1']);
    });

    it('shows an empty message for a section without rows', () => {
      render();

      expect(section('REPORTS.BY_SUPPLIER').textContent).toContain('COMMON.NO_DATA');
      expect(section('REPORTS.BY_WAREHOUSE').textContent).not.toContain('COMMON.NO_DATA');
    });
  });

  describe('top items', () => {
    it('shows rank, name, category, quantity, unit price and total, with a zero price fallback', () => {
      render();

      const rows = Array.from(el.querySelectorAll('tbody tr')).map((tr) => text(tr.querySelectorAll('td')));
      expect(rows).toEqual([
        ['1Cable', 'Parts', '3', '$10.00', '$30.00'],
        ['2Router', 'Net', '1', '$0.00', '$0.00']
      ]);
    });

    it('shows an empty message when there are no items', () => {
      render({ topItems: [] });

      expect(text(el.querySelectorAll('tbody tr'))).toEqual(['COMMON.NO_DATA']);
    });

    it('repeats the items as cards for small screens', () => {
      render();

      const cards = el.querySelectorAll('.lg\\:hidden .rounded-xl');
      expect(cards).toHaveSize(2);
      expect(cards[0].textContent).toContain('$10.00/u');
    });
  });

  describe('actions', () => {
    it('offers USD, HNL and all currencies', () => {
      render();

      const select = el.querySelector('select') as HTMLSelectElement;
      expect(text(select.querySelectorAll('option'))).toEqual(['USD', 'HNL', 'REPORTS.ALL_CURRENCIES']);
    });

    it('emits the chosen currency', () => {
      render();
      const changed = jasmine.createSpy('changed');
      component.currencyChange.subscribe(changed);
      const select = el.querySelector('select') as HTMLSelectElement;

      select.value = 'ALL';
      select.dispatchEvent(new Event('change'));

      expect(changed).toHaveBeenCalledOnceWith('ALL');
    });

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
