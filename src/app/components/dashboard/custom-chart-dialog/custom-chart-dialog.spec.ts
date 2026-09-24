import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CustomChartDialog, CustomChartDialogData, InventoryItemData } from './custom-chart-dialog';
import { ThemeService } from '../../../services/theme.service';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

const item = (overrides: Partial<InventoryItemData> = {}): InventoryItemData => ({
  name: 'Laptop',
  category: 'Computers',
  warehouse: 'North',
  supplier: 'Acme',
  status: 'IN_STOCK',
  price: 100,
  quantity: 2,
  currency: 'USD',
  ...overrides
});

const dialogData = (overrides: Partial<CustomChartDialogData> = {}): CustomChartDialogData => ({
  items: [
    item({ name: 'Laptop', category: 'Computers', price: 100, quantity: 2 }),
    item({ name: 'Mouse', category: 'Accessories', price: 10.123, quantity: 3 }),
    item({ name: 'Local desk', category: 'Furniture', price: 1000, quantity: 1, currency: 'HNL' })
  ],
  availableData: {
    categories: [{ name: 'Computers', count: 5 }, { name: 'Accessories', count: 3 }],
    warehouses: [{ name: 'North', count: 8 }],
    status: [{ name: 'In stock', count: 8 }]
  },
  ...overrides
});

describe('CustomChartDialog', () => {
  let fixture: ComponentFixture<CustomChartDialog>;
  let component: CustomChartDialog;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CustomChartDialog>>;

  const create = async (data: CustomChartDialogData = dialogData()): Promise<void> => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<CustomChartDialog>>('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [CustomChartDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CustomChartDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const pick = (source: Parameters<CustomChartDialog['selectDataSource']>[0], type?: Parameters<CustomChartDialog['selectChartType']>[0]): void => {
    component.selectDataSource(source);
    if (type) component.selectChartType(type);
  };

  const yFormatter = (): ((value: number) => string) =>
    (component.previewYAxis().labels as { formatter: (value: number) => string }).formatter;

  it('starts as a bar chart of the categories', async () => {
    await create();

    expect(component.chartForm.value).toEqual(jasmine.objectContaining({ dataSource: 'categories', chartType: 'bar', currency: 'USD' }));
    expect(component.previewLabels()).toEqual(['Computers', 'Accessories']);
    expect(component.previewSeries()).toEqual([{ name: 'Items', data: [5, 3] }]);
  });

  describe('data sources', () => {
    beforeEach(() => create());

    it('takes the warehouses and the status counts from the available data', () => {
      pick('warehouses');
      expect(component.previewData()).toEqual([{ name: 'North', count: 8 }]);

      pick('status');
      expect(component.previewData()).toEqual([{ name: 'In stock', count: 8 }]);
    });

    it('adds up price times quantity per category for USD items, rounded and highest first', () => {
      pick('valueByCategory');

      expect(component.previewData()).toEqual([
        { name: 'Computers', count: 200 },
        { name: 'Accessories', count: 30.37 }
      ]);
    });

    it('only counts the items in the chosen currency', () => {
      pick('valueByCategory');
      component.selectCurrency('HNL');

      expect(component.previewData()).toEqual([{ name: 'Furniture', count: 1000 }]);
    });

    it('counts every currency together for ALL', () => {
      pick('valueByCategory');
      component.selectCurrency('ALL');

      expect(component.previewData().map((d) => d.name)).toEqual(['Furniture', 'Computers', 'Accessories']);
    });

    it('groups the value by warehouse, supplier and status', () => {
      pick('valueByWarehouse');
      expect(component.previewData()).toEqual([{ name: 'North', count: 230.37 }]);

      pick('valueBySupplier');
      expect(component.previewData()).toEqual([{ name: 'Acme', count: 230.37 }]);

      pick('valueByStatus');
      expect(component.previewData()).toEqual([{ name: 'IN_STOCK', count: 230.37 }]);
    });

    it('lists the most valuable items first', () => {
      pick('topItemsByValue');

      expect(component.previewData().map((d) => d.name)).toEqual(['Laptop', 'Mouse']);
    });

    it('knows which sources add up money', () => {
      expect(component.isValueSource('valueByCategory')).toBeTrue();
      expect(component.isValueSource('categories')).toBeFalse();
    });
  });

  describe('series', () => {
    beforeEach(() => create());

    it('names a value series after the currency', () => {
      pick('valueByCategory');
      expect(component.previewSeries()).toEqual([{ name: 'Value ($)', data: [200, 30.37] }]);

      component.selectCurrency('HNL');
      expect(component.previewSeries()).toEqual([{ name: 'Value (L)', data: [1000] }]);
    });

    it('is a plain list of numbers for the charts drawn as a circle', () => {
      pick('categories', 'donut');

      expect(component.previewSeries()).toEqual([5, 3]);
    });
  });

  describe('colors', () => {
    beforeEach(() => create());

    it('uses the chosen color alone for a chart with axes', () => {
      component.selectColor('#3b82f6');

      expect(component.previewColors()).toEqual(['#3b82f6']);
    });

    it('uses the palette of the chosen color for a circle chart', () => {
      pick('categories', 'pie');
      component.selectColor('#3b82f6');

      expect(component.previewColors()).toEqual(['#3b82f6', '#f97316', '#10b981', '#ec4899', '#eab308', '#06b6d4']);
    });

    it('falls back to the color alone when it has no palette', () => {
      pick('categories', 'pie');
      component.selectColor('#123456');

      expect(component.previewColors()).toEqual(['#123456']);
    });
  });

  describe('chart options', () => {
    beforeEach(() => create());

    it('uses the chosen type and a transparent background', () => {
      pick('categories', 'line');

      expect(component.previewChartOptions()).toEqual(jasmine.objectContaining({ type: 'line', height: 200, background: 'transparent' }));
    });

    it('labels the x axis with the names and tilts them, except for a circle chart', () => {
      pick('categories', 'bar');
      expect(component.previewXAxis().categories).toEqual(['Computers', 'Accessories']);
      expect(component.previewXAxis().labels?.rotate).toBe(-45);

      component.selectChartType('pie');
      expect(component.previewXAxis()).toEqual({});
    });

    it('sizes the hole of a donut, closes the one of a pie and rounds the bars', () => {
      component.selectChartType('donut');
      expect(component.previewPlotOptions().pie?.donut?.size).toBe('60%');

      component.selectChartType('pie');
      expect(component.previewPlotOptions().pie?.donut?.size).toBe('0%');

      component.selectChartType('radialBar');
      expect(component.previewPlotOptions().radialBar?.hollow?.size).toBe('50%');

      component.selectChartType('bar');
      expect(component.previewPlotOptions().bar?.borderRadius).toBe(4);
    });

    it('shows money on the axis and the tooltip of a value chart and a plain count otherwise', () => {
      pick('valueByCategory');
      expect(yFormatter()(1234.5)).toBe('$1,234.50');
      expect((component.previewTooltip().y as { formatter: (v: number) => string }).formatter(1234.5)).toBe('$1,234.50');

      component.selectCurrency('HNL');
      expect(yFormatter()(1234.5)).toBe('L1,234.50');

      pick('categories');
      expect(yFormatter()(1234)).toBe('1,234');
    });

    it('follows the theme in the tooltip', () => {
      const theme = TestBed.inject(ThemeService);
      theme.toggle();
      TestBed.tick();

      expect(component.previewTooltip().theme).toBe(theme.isDark() ? 'dark' : 'light');
    });
  });

  describe('save', () => {
    beforeEach(() => create());

    it('does nothing while the form is invalid', () => {
      component.save();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('closes with the chart that was built, keeping the currency of a value chart', () => {
      component.chartForm.patchValue({ title: 'My chart' });
      pick('valueByCategory');
      component.selectCurrency('HNL');

      component.save();

      expect(dialogRef.close).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ title: 'My chart', dataSource: 'valueByCategory', chartType: 'bar', currency: 'HNL' })
      );
    });

    it('drops the currency of a chart that counts items', () => {
      component.chartForm.patchValue({ title: 'My chart' });
      component.selectCurrency('HNL');

      component.save();

      expect((dialogRef.close.calls.mostRecent().args[0] as { currency?: string }).currency).toBeUndefined();
    });
  });

  it('shows the first five categories for low stock', async () => {
    const categories = Array.from({ length: 7 }, (_, i) => ({ name: `Category ${i}`, count: 10 - i }));
    await create(dialogData({ availableData: { categories, warehouses: [], status: [] } }));

    pick('lowStock');

    expect(component.previewData().map((d) => d.name)).toEqual(categories.slice(0, 5).map((c) => c.name));
  });

  it('opens an existing chart with its values', async () => {
    await create(
      dialogData({
        chart: { id: 'c1', title: 'Old', chartType: 'donut', dataSource: 'warehouses', color: '#10b981', createdAt: new Date() }
      })
    );

    expect(component.isEditing).toBeTrue();
    expect(component.chartForm.value).toEqual(jasmine.objectContaining({ title: 'Old', chartType: 'donut', dataSource: 'warehouses', color: '#10b981' }));
    expect(component.previewSeries()).toEqual([8]);
  });
});
