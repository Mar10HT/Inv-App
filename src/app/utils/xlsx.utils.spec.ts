import { downloadStyledXLSX, XlsxSheetConfig } from './xlsx.utils';

describe('downloadStyledXLSX', () => {
  const config: XlsxSheetConfig = {
    sheetName: 'Test',
    filename: 'test.xlsx',
    headerColor: '4D7C6F',
    colWidths: [20, 12, 10],
    statusColIndex: 1
  };

  let clickSpy: jasmine.Spy;

  beforeEach(() => {
    // xlsx-js-style downloads through an anchor click: stub it so specs never write files.
    clickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
  });

  it('builds the workbook and triggers exactly one download', async () => {
    const rows = [
      { Name: 'Laptop', Status: 'IN_STOCK', Qty: 3 },
      { Name: 'Mouse', Status: 'something else', Qty: 0 }
    ];

    await downloadStyledXLSX(rows, config);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('still downloads a workbook when there are no rows', async () => {
    await downloadStyledXLSX([], config);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('works without a status column configured', async () => {
    const withoutStatus: XlsxSheetConfig = {
      sheetName: 'Test',
      filename: 'test.xlsx',
      headerColor: '4D7C6F',
      colWidths: [20, 10]
    };

    await downloadStyledXLSX([{ Name: 'Cable', Qty: 10 }], withoutStatus);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
