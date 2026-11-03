import { PdfDrawingBase } from './pdf-drawing.base';
import { TransactionType } from '../../interfaces/transaction.interface';

/** Exposes the protected helper; the translate function echoes the key so assertions stay readable. */
class TestPdf extends PdfDrawingBase {
  protected t(key: string): string {
    return key;
  }
  typeName(type: TransactionType): string {
    return this.getTransactionTypeName(type);
  }
}

describe('PdfDrawingBase', () => {
  it('translates the transaction type name through the type key', () => {
    const pdf = new TestPdf();
    expect(pdf.typeName(TransactionType.OUT)).toBe('TRANSACTIONS.TYPE.OUT');
  });
});
