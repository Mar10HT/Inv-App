import type { CellObject, WorkBook } from 'xlsx-js-style';

import { downloadStyledXLSX, XlsxSheetConfig } from './xlsx.utils';

type XlsxModule = typeof import('xlsx-js-style');

describe('downloadStyledXLSX', () => {
  const config: XlsxSheetConfig = {
    sheetName: 'Test',
    filename: 'test.xlsx',
    headerColor: '4D7C6F',
    colWidths: [20, 12, 10],
    statusColIndex: 1
  };
  const rows = [
    { Name: 'Laptop', Status: 'IN_STOCK', Qty: 3 },
    { Name: 'Mouse', Status: 'something else', Qty: 0 },
    { Name: 'Cable', Status: 'out of stock', Qty: 7 }
  ];

  let written: { workbook: WorkBook; filename: string }[];

  // What the user downloads is whatever XLSX.writeFile receives, so capture that instead of
  // letting the library click an anchor.
  beforeEach(async () => {
    written = [];
    const loaded = (await import('xlsx-js-style')) as XlsxModule & { default?: XlsxModule };
    const XLSX = loaded.default ?? loaded;
    spyOn(XLSX, 'writeFile').and.callFake(((workbook: WorkBook, filename: string) => {
      written.push({ workbook, filename });
    }) as never);
  });

  const sheet = (name = config.sheetName) => written[0].workbook.Sheets[name];
  const cell = (address: string): CellObject => sheet()[address] as CellObject;
  const fill = (address: string): string | undefined => (cell(address).s as { fill?: { fgColor?: { rgb?: string } } }).fill?.fgColor?.rgb;
  const font = (address: string) => (cell(address).s as { font?: { bold?: boolean; color?: { rgb?: string } } }).font;

  describe('the file', () => {
    it('is written once, under the requested name, with one sheet named as requested', async () => {
      await downloadStyledXLSX(rows, config);

      expect(written).toHaveSize(1);
      expect(written[0].filename).toBe('test.xlsx');
      expect(written[0].workbook.SheetNames).toEqual(['Test']);
    });

    it('still produces a workbook when there are no rows', async () => {
      await downloadStyledXLSX([], config);

      expect(written).toHaveSize(1);
      expect(written[0].workbook.SheetNames).toEqual(['Test']);
    });
  });

  describe('the data', () => {
    it('keeps every header and value', async () => {
      await downloadStyledXLSX(rows, config);

      expect([cell('A1').v, cell('B1').v, cell('C1').v]).toEqual(['Name', 'Status', 'Qty']);
      expect([cell('A2').v, cell('B2').v, cell('C2').v]).toEqual(['Laptop', 'IN_STOCK', 3]);
      expect([cell('A4').v, cell('C4').v]).toEqual(['Cable', 7]);
    });

    it('sizes the columns and the rows', async () => {
      await downloadStyledXLSX(rows, config);

      expect(sheet()['!cols']).toEqual([{ wch: 20 }, { wch: 12 }, { wch: 10 }]);
      expect(sheet()['!rows']?.map((row) => row.hpt)).toEqual([22, 18, 18, 18]);
    });
  });

  describe('the styling', () => {
    it('paints the header with the configured color and white bold text', async () => {
      await downloadStyledXLSX(rows, config);

      expect(fill('A1')).toBe('4D7C6F');
      expect(font('A1')?.bold).toBeTrue();
      expect(font('A1')?.color?.rgb).toBe('FFFFFF');
    });

    it('uses dark header text for light header colors', async () => {
      await downloadStyledXLSX(rows, { ...config, headerColor: 'FEF3C7', headerDarkText: true });

      expect(fill('A1')).toBe('FEF3C7');
      expect(font('A1')?.color?.rgb).toBe('1A1A1A');
    });

    it('stripes the body rows', async () => {
      await downloadStyledXLSX(rows, config);

      expect(fill('A2')).toBe('FFFFFF');
      expect(fill('A3')).toBe('F1F5F9');
      expect(fill('A4')).toBe('FFFFFF');
    });

    it('colors a status cell by its status, whatever the case or the spaces', async () => {
      await downloadStyledXLSX(rows, config);

      expect(fill('B2')).toBe('D1FAE5'); // IN_STOCK
      expect(font('B2')?.color?.rgb).toBe('065F46');
      expect(font('B2')?.bold).toBeTrue();
      expect(fill('B4')).toBe('FEE2E2'); // "out of stock" normalises to OUT_OF_STOCK
      expect(font('B4')?.color?.rgb).toBe('991B1B');
    });

    it('leaves an unknown status with the ordinary striped style', async () => {
      await downloadStyledXLSX(rows, config);

      expect(fill('B3')).toBe('F1F5F9');
      expect(font('B3')?.bold).toBeUndefined();
    });

    it('colors nothing by status when no status column is configured', async () => {
      await downloadStyledXLSX(rows, { ...config, statusColIndex: undefined });

      expect(fill('B2')).toBe('FFFFFF');
      expect(font('B2')?.bold).toBeUndefined();
    });

    it('only colors the configured status column', async () => {
      await downloadStyledXLSX([{ Status: 'IN_STOCK', Other: 'IN_STOCK' }], { ...config, statusColIndex: 0 });

      expect(fill('A2')).toBe('D1FAE5');
      expect(fill('B2')).toBe('FFFFFF');
    });
  });
});
