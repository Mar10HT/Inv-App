import type jsPDF from 'jspdf';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';

/**
 * Drawing helpers shared by the PDF reports. This is plain jsPDF drawing code, kept apart from
 * the Angular service so each file stays small; the service supplies the translate function.
 */
export abstract class PdfDrawingBase {
  // Brand colors
  protected readonly PRIMARY_COLOR: [number, number, number] = [77, 124, 111]; // #4d7c6f
  protected readonly HEADER_BG: [number, number, number] = [45, 74, 63]; // #2d4a3f
  protected readonly TEXT_DARK: [number, number, number] = [30, 41, 59]; // #1e293b
  protected readonly TEXT_LIGHT: [number, number, number] = [100, 116, 139]; // #64748b

  /** Only the active language is needed here, to pick the date locale. */
  protected abstract readonly translate: { readonly currentLang: string };

  protected abstract t(key: string): string;

  // ============ HELPER METHODS ============
  protected drawValueSummaryCards(
    doc: jsPDF,
    data: { totalValue: string; totalItems: string; categories: string; warehouses: string },
    yPos: number,
    pageWidth: number
  ): void {
    const cardWidth = (pageWidth - 40) / 4;
    const cardHeight = 25;
    const startX = 15;

    const cards = [
      { label: this.t('REPORTS.TOTAL_VALUE'), value: data.totalValue, color: this.PRIMARY_COLOR },
      { label: this.t('REPORTS.TOTAL_ITEMS'), value: data.totalItems, color: [14, 165, 233] as [number, number, number] },
      { label: this.t('REPORTS.CATEGORIES'), value: data.categories, color: [168, 85, 247] as [number, number, number] },
      { label: this.t('REPORTS.WAREHOUSES'), value: data.warehouses, color: [249, 115, 22] as [number, number, number] }
    ];

    cards.forEach((card, index) => {
      const x = startX + (cardWidth + 5) * index;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F');
      doc.setFillColor(...card.color);
      doc.rect(x, yPos, 3, cardHeight, 'F');

      doc.setTextColor(...this.TEXT_LIGHT);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(card.label, x + 8, yPos + 8);

      doc.setTextColor(...card.color);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, x + 8, yPos + 19);
    });
  }

  protected drawStatusSummaryCards(
    doc: jsPDF,
    data: { inStock: number; lowStock: number; outOfStock: number },
    yPos: number,
    pageWidth: number
  ): void {
    const cardWidth = (pageWidth - 35) / 3;
    const cardHeight = 25;
    const startX = 15;

    const cards = [
      { label: this.t('STATUS.IN_STOCK'), value: data.inStock.toString(), color: [16, 185, 129] as [number, number, number] },
      { label: this.t('STATUS.LOW_STOCK'), value: data.lowStock.toString(), color: [245, 158, 11] as [number, number, number] },
      { label: this.t('STATUS.OUT_OF_STOCK'), value: data.outOfStock.toString(), color: [239, 68, 68] as [number, number, number] }
    ];

    cards.forEach((card, index) => {
      const x = startX + (cardWidth + 5) * index;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F');
      doc.setFillColor(...card.color);
      doc.rect(x, yPos, 3, cardHeight, 'F');

      doc.setTextColor(...this.TEXT_LIGHT);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(card.label, x + 8, yPos + 8);

      doc.setTextColor(...card.color);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, x + 8, yPos + 20);
    });
  }

  protected drawAssignmentSummaryCards(
    doc: jsPDF,
    data: { total: number; assigned: number; unassigned: number },
    yPos: number,
    pageWidth: number
  ): void {
    const cardWidth = (pageWidth - 35) / 3;
    const cardHeight = 25;
    const startX = 15;

    const cards = [
      { label: this.t('REPORTS.TOTAL_UNIQUE_ITEMS'), value: data.total.toString(), color: this.PRIMARY_COLOR },
      { label: this.t('REPORTS.ASSIGNED'), value: data.assigned.toString(), color: [16, 185, 129] as [number, number, number] },
      { label: this.t('REPORTS.UNASSIGNED'), value: data.unassigned.toString(), color: [100, 116, 139] as [number, number, number] }
    ];

    cards.forEach((card, index) => {
      const x = startX + (cardWidth + 5) * index;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F');
      doc.setFillColor(...card.color);
      doc.rect(x, yPos, 3, cardHeight, 'F');

      doc.setTextColor(...this.TEXT_LIGHT);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(card.label, x + 8, yPos + 8);

      doc.setTextColor(...card.color);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, x + 8, yPos + 20);
    });
  }

  protected addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...this.TEXT_LIGHT);
      doc.text(
        `${this.t('REPORTS.PDF.PAGE')} ${i} ${this.t('REPORTS.PDF.OF')} ${pageCount} | INV-APP`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  }

  protected calculateStats(transactions: Transaction[]): {
    total: number;
    inCount: number;
    outCount: number;
    transferCount: number;
    totalItems: number;
  } {
    return {
      total: transactions.length,
      inCount: transactions.filter(t => t.type === TransactionType.IN).length,
      outCount: transactions.filter(t => t.type === TransactionType.OUT).length,
      transferCount: transactions.filter(t => t.type === TransactionType.TRANSFER).length,
      totalItems: transactions.reduce((sum, t) => sum + t.items.length, 0)
    };
  }

  protected drawSummaryCards(
    doc: jsPDF,
    stats: { total: number; inCount: number; outCount: number; transferCount: number; totalItems: number },
    yPos: number,
    pageWidth: number
  ): void {
    const cardWidth = (pageWidth - 40) / 4;
    const cardHeight = 25;
    const startX = 15;

    const cards = [
      { label: 'Total', value: stats.total.toString(), color: this.PRIMARY_COLOR },
      { label: this.t('TRANSACTIONS.TYPE.IN'), value: stats.inCount.toString(), color: [16, 185, 129] as [number, number, number] },
      { label: this.t('TRANSACTIONS.TYPE.OUT'), value: stats.outCount.toString(), color: [239, 68, 68] as [number, number, number] },
      { label: this.t('TRANSACTIONS.TYPE.TRANSFER'), value: stats.transferCount.toString(), color: [59, 130, 246] as [number, number, number] }
    ];

    cards.forEach((card, index) => {
      const x = startX + (cardWidth + 5) * index;

      // Card background
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F');

      // Colored left border
      doc.setFillColor(...card.color);
      doc.rect(x, yPos, 3, cardHeight, 'F');

      // Label
      doc.setTextColor(...this.TEXT_LIGHT);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(card.label, x + 8, yPos + 8);

      // Value
      doc.setTextColor(...card.color);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, x + 8, yPos + 20);
    });
  }

  protected drawTransactionCard(
    doc: jsPDF,
    tx: Transaction,
    yPos: number,
    pageWidth: number,
    index: number
  ): number {
    const cardX = 15;
    const cardWidth = pageWidth - 30;
    const itemsHeight = tx.items.length * 6 + 10;
    const cardHeight = Math.max(55, 45 + itemsHeight);

    // Check if card fits on current page
    if (yPos + cardHeight > 280) {
      doc.addPage();
      yPos = 20;
    }

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 3, 3, 'FD');

    // Transaction type badge
    const typeColor = this.getTypeColor(tx.type);
    doc.setFillColor(...typeColor);
    doc.roundedRect(cardX + 5, yPos + 5, 25, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(tx.type, cardX + 17.5, yPos + 10.5, { align: 'center' });

    // Transaction number
    doc.setTextColor(...this.TEXT_LIGHT);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${index}`, cardX + cardWidth - 10, yPos + 10, { align: 'right' });

    // Date and time
    doc.setTextColor(...this.TEXT_DARK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const locale = this.translate.currentLang === 'en' ? 'en-US' : 'es-HN';
    const txDate = new Date(tx.date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(txDate, cardX + 35, yPos + 10);

    // User
    doc.setTextColor(...this.TEXT_LIGHT);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const userName = tx.user?.name || tx.user?.email || 'N/A';
    doc.text(`${this.t('REPORTS.PDF.USER')}: ${userName}`, cardX + 5, yPos + 20);

    // Warehouses
    let warehouseText = '';
    if (tx.type === TransactionType.IN) {
      warehouseText = `${this.t('REPORTS.PDF.DESTINATION')}: ${tx.destinationWarehouse?.name || 'N/A'}`;
    } else if (tx.type === TransactionType.OUT) {
      warehouseText = `${this.t('REPORTS.PDF.ORIGIN')}: ${tx.sourceWarehouse?.name || 'N/A'}`;
    } else if (tx.type === TransactionType.TRANSFER) {
      warehouseText = `${tx.sourceWarehouse?.name || 'N/A'} → ${tx.destinationWarehouse?.name || 'N/A'}`;
    }
    doc.text(warehouseText, cardX + 5, yPos + 27);

    // Notes
    if (tx.notes) {
      doc.setFontSize(8);
      doc.setTextColor(...this.TEXT_LIGHT);
      const truncatedNotes = tx.notes.length > 80 ? tx.notes.substring(0, 80) + '...' : tx.notes;
      doc.text(`${this.t('REPORTS.PDF.NOTES')}: ${truncatedNotes}`, cardX + 5, yPos + 34);
    }

    // Items section
    let itemsY = yPos + (tx.notes ? 42 : 35);
    doc.setFillColor(248, 250, 252);
    doc.rect(cardX + 5, itemsY, cardWidth - 10, itemsHeight, 'F');

    doc.setTextColor(...this.TEXT_DARK);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${this.t('REPORTS.PDF.ITEMS')} (${tx.items.length})`, cardX + 10, itemsY + 6);

    // Items table
    itemsY += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    tx.items.forEach((item, idx) => {
      const itemName = item.inventoryItem?.name || this.t('REPORTS.PDF.UNKNOWN_ITEM');
      const itemSku = item.inventoryItem?.sku ? ` (${item.inventoryItem.sku})` : '';
      const truncatedName = (itemName + itemSku).length > 50
        ? (itemName + itemSku).substring(0, 50) + '...'
        : itemName + itemSku;

      doc.setTextColor(...this.TEXT_DARK);
      doc.text(`• ${truncatedName}`, cardX + 10, itemsY + (idx * 6));

      doc.setTextColor(...this.PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(`x${item.quantity}`, cardX + cardWidth - 20, itemsY + (idx * 6), { align: 'right' });
      doc.setFont('helvetica', 'normal');

      if (item.notes) {
        doc.setTextColor(...this.TEXT_LIGHT);
        doc.setFontSize(7);
        const itemNotes = item.notes.length > 40 ? item.notes.substring(0, 40) + '...' : item.notes;
        doc.text(`   ${itemNotes}`, cardX + 12, itemsY + (idx * 6) + 3);
        doc.setFontSize(8);
      }
    });

    return yPos + cardHeight;
  }

  protected getTypeColor(type: TransactionType): [number, number, number] {
    switch (type) {
      case TransactionType.IN:
        return [16, 185, 129]; // emerald-500
      case TransactionType.OUT:
        return [239, 68, 68]; // rose-500
      case TransactionType.TRANSFER:
        return [59, 130, 246]; // blue-500
      default:
        return [100, 116, 139]; // slate-500
    }
  }

  protected getTransactionTypeName(type: TransactionType): string {
    return this.t(`TRANSACTIONS.TYPE.${type}`);
  }
}
