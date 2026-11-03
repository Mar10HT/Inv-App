import { TransactionType } from '../../interfaces/transaction.interface';

/**
 * Drawing helpers shared by the PDF reports. This is plain jsPDF drawing code, kept apart from
 * the Angular service so each file stays small; the service supplies the translate function.
 */
export abstract class PdfDrawingBase {
  protected abstract t(key: string): string;

  protected getTransactionTypeName(type: TransactionType): string {
    return this.t(`TRANSACTIONS.TYPE.${type}`);
  }
}
