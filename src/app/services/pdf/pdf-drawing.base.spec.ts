import type jsPDF from 'jspdf';

import { PdfDrawingBase } from './pdf-drawing.base';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';

/** Exposes the protected helpers; the translate function echoes the key so assertions stay readable. */
class TestPdf extends PdfDrawingBase {
  protected readonly translate = { currentLang: 'en' };
  protected t(key: string): string {
    return key;
  }
  format(value: number): string {
    return this.formatNumber(value);
  }
  stats(transactions: Transaction[]) {
    return this.calculateStats(transactions);
  }
  color(type: TransactionType): [number, number, number] {
    return this.getTypeColor(type);
  }
  typeName(type: TransactionType): string {
    return this.getTransactionTypeName(type);
  }
  footer(doc: jsPDF): void {
    this.addFooter(doc);
  }
}

const tx = (type: TransactionType, itemCount = 0): Transaction =>
  ({ type, items: new Array(itemCount).fill({}) }) as unknown as Transaction;

describe('PdfDrawingBase', () => {
  const pdf = new TestPdf();

  describe('formatNumber', () => {
    it('always shows two decimals with thousands separators', () => {
      expect(pdf.format(0)).toBe('0.00');
      expect(pdf.format(1234.5)).toBe('1,234.50');
      expect(pdf.format(1000000)).toBe('1,000,000.00');
    });
  });

  describe('calculateStats', () => {
    it('counts each transaction type and the total number of line items', () => {
      const result = pdf.stats([
        tx(TransactionType.IN, 2),
        tx(TransactionType.IN, 1),
        tx(TransactionType.OUT, 3),
        tx(TransactionType.TRANSFER, 4)
      ]);

      expect(result).toEqual({ total: 4, inCount: 2, outCount: 1, transferCount: 1, totalItems: 10 });
    });

    it('returns zeros for an empty list', () => {
      expect(pdf.stats([])).toEqual({ total: 0, inCount: 0, outCount: 0, transferCount: 0, totalItems: 0 });
    });
  });

  describe('getTypeColor', () => {
    it('uses a distinct color per transaction type', () => {
      expect(pdf.color(TransactionType.IN)).toEqual([16, 185, 129]);
      expect(pdf.color(TransactionType.OUT)).toEqual([239, 68, 68]);
      expect(pdf.color(TransactionType.TRANSFER)).toEqual([59, 130, 246]);
    });

    it('falls back to slate for an unknown type', () => {
      expect(pdf.color('SOMETHING_ELSE' as TransactionType)).toEqual([100, 116, 139]);
    });
  });

  it('translates the transaction type name through the type key', () => {
    expect(pdf.typeName(TransactionType.OUT)).toBe('TRANSACTIONS.TYPE.OUT');
  });

  describe('addFooter', () => {
    it('writes a "page i of n" footer on every page', () => {
      const text = jasmine.createSpy('text');
      const setPage = jasmine.createSpy('setPage');
      const doc = {
        getNumberOfPages: () => 2,
        internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
        setPage,
        setFontSize: jasmine.createSpy('setFontSize'),
        setTextColor: jasmine.createSpy('setTextColor'),
        text
      } as unknown as jsPDF;

      pdf.footer(doc);

      expect(setPage.calls.allArgs()).toEqual([[1], [2]]);
      expect(text).toHaveBeenCalledTimes(2);
      expect(text.calls.argsFor(0)).toEqual(['REPORTS.PDF.PAGE 1 REPORTS.PDF.OF 2 | INV-APP', 105, 287, { align: 'center' }]);
      expect(text.calls.argsFor(1)[0]).toBe('REPORTS.PDF.PAGE 2 REPORTS.PDF.OF 2 | INV-APP');
    });
  });
});
