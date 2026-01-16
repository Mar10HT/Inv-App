import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, TransactionType } from '../interfaces/transaction.interface';
import { InventoryItemInterface, InventoryStatus, ItemType } from '../interfaces/inventory-item.interface';

interface TransactionPDFOptions {
  transactions: Transaction[];
  title?: string;
  dateRange?: { from?: string; to?: string };
  typeFilter?: string;
}

interface ValueReportPDFOptions {
  currency: string;
  totalValue: number;
  totalItems: number;
  valueByCategory: { label: string; value: number; count: number }[];
  valueByWarehouse: { label: string; value: number; count: number }[];
  valueBySupplier: { label: string; value: number; count: number }[];
  topItems: (InventoryItemInterface & { totalValue: number })[];
}

interface StatusReportPDFOptions {
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: InventoryItemInterface[];
  outOfStockItems: InventoryItemInterface[];
}

interface AssignmentsReportPDFOptions {
  totalUniqueItems: number;
  assignedCount: number;
  unassignedCount: number;
  assignmentsByUser: {
    userName: string;
    userEmail: string;
    itemCount: number;
    items: InventoryItemInterface[];
  }[];
  unassignedItems: InventoryItemInterface[];
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  private translate = inject(TranslateService);

  // Brand colors
  private readonly PRIMARY_COLOR: [number, number, number] = [77, 124, 111]; // #4d7c6f
  private readonly HEADER_BG: [number, number, number] = [45, 74, 63]; // #2d4a3f
  private readonly TEXT_DARK: [number, number, number] = [30, 41, 59]; // #1e293b
  private readonly TEXT_LIGHT: [number, number, number] = [100, 116, 139]; // #64748b

  // Helper to get translation synchronously
  private t(key: string): string {
    return this.translate.instant(key);
  }

  exportTransactionsToPDF(options: TransactionPDFOptions): void {
    const { transactions, title, dateRange, typeFilter } = options;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header with logo area
    doc.setFillColor(...this.HEADER_BG);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(title || this.t('REPORTS.PDF.TITLE'), 15, 25);

    // Subtitle with date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const locale = this.translate.currentLang === 'en' ? 'en-US' : 'es-HN';
    const currentDate = new Date().toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`${this.t('REPORTS.PDF.GENERATED')}: ${currentDate}`, 15, 33);

    yPos = 50;

    // Filters applied section
    if (dateRange?.from || dateRange?.to || (typeFilter && typeFilter !== 'ALL')) {
      doc.setTextColor(...this.TEXT_DARK);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.t('REPORTS.PDF.FILTERS_APPLIED')}:`, 15, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...this.TEXT_LIGHT);

      if (dateRange?.from) {
        doc.text(`${this.t('REPORTS.PDF.FROM')}: ${dateRange.from}`, 15, yPos);
        yPos += 5;
      }
      if (dateRange?.to) {
        doc.text(`${this.t('REPORTS.PDF.TO')}: ${dateRange.to}`, 15, yPos);
        yPos += 5;
      }
      if (typeFilter && typeFilter !== 'ALL') {
        doc.text(`${this.t('REPORTS.PDF.TYPE')}: ${this.getTransactionTypeName(typeFilter as TransactionType)}`, 15, yPos);
        yPos += 5;
      }
      yPos += 5;
    }

    // Summary statistics
    const stats = this.calculateStats(transactions);
    this.drawSummaryCards(doc, stats, yPos, pageWidth);
    yPos += 35;

    // Transactions detail
    doc.setTextColor(...this.TEXT_DARK);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('REPORTS.PDF.TRANSACTIONS_DETAIL'), 15, yPos);
    yPos += 8;

    // Table with transactions
    if (transactions.length > 0) {
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];

        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        // Transaction card
        yPos = this.drawTransactionCard(doc, tx, yPos, pageWidth, i + 1);
        yPos += 5;
      }
    } else {
      doc.setTextColor(...this.TEXT_LIGHT);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      doc.text(this.t('REPORTS.PDF.NO_TRANSACTIONS'), pageWidth / 2, yPos + 10, { align: 'center' });
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
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

    // Generate filename
    const filename = `transactions-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  // ============ VALUE REPORT PDF ============
  exportValueReportToPDF(options: ValueReportPDFOptions): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(...this.HEADER_BG);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('REPORTS.PDF.VALUE_TITLE'), 15, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const locale = this.translate.currentLang === 'en' ? 'en-US' : 'es-HN';
    const currentDate = new Date().toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`${this.t('REPORTS.PDF.GENERATED')}: ${currentDate} | ${this.t('REPORTS.PDF.CURRENCY')}: ${options.currency}`, 15, 33);

    yPos = 50;

    // Summary cards
    const symbol = options.currency === 'HNL' ? 'L' : '$';
    this.drawValueSummaryCards(doc, {
      totalValue: `${symbol}${this.formatNumber(options.totalValue)}`,
      totalItems: options.totalItems.toString(),
      categories: options.valueByCategory.length.toString(),
      warehouses: options.valueByWarehouse.length.toString()
    }, yPos, pageWidth);
    yPos += 35;

    // Value by Category
    doc.setTextColor(...this.TEXT_DARK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('REPORTS.BY_CATEGORY'), 15, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [[this.t('REPORTS.TABLE.NAME'), this.t('REPORTS.TABLE.ITEMS'), this.t('REPORTS.TABLE.VALUE')]],
      body: options.valueByCategory.map(item => [
        item.label,
        item.count.toString(),
        `${symbol}${this.formatNumber(item.value)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: this.PRIMARY_COLOR, textColor: [255, 255, 255] },
      margin: { left: 15, right: 15 },
      tableWidth: (pageWidth - 30) / 2 - 5
    });

    // Value by Warehouse (right column)
    const leftTableHeight = (doc as any).lastAutoTable.finalY - yPos;

    autoTable(doc, {
      startY: yPos,
      head: [[this.t('REPORTS.TABLE.NAME'), this.t('REPORTS.TABLE.ITEMS'), this.t('REPORTS.TABLE.VALUE')]],
      body: options.valueByWarehouse.map(item => [
        item.label,
        item.count.toString(),
        `${symbol}${this.formatNumber(item.value)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: this.PRIMARY_COLOR, textColor: [255, 255, 255] },
      margin: { left: pageWidth / 2 + 2.5, right: 15 },
      tableWidth: (pageWidth - 30) / 2 - 5
    });

    yPos = Math.max((doc as any).lastAutoTable.finalY, yPos + leftTableHeight) + 10;

    // Check for new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    // Value by Supplier
    doc.setTextColor(...this.TEXT_DARK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('REPORTS.BY_SUPPLIER'), 15, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [[this.t('REPORTS.TABLE.NAME'), this.t('REPORTS.TABLE.ITEMS'), this.t('REPORTS.TABLE.VALUE')]],
      body: options.valueBySupplier.map(item => [
        item.label,
        item.count.toString(),
        `${symbol}${this.formatNumber(item.value)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: this.PRIMARY_COLOR, textColor: [255, 255, 255] },
      margin: { left: 15, right: 15 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Check for new page
    if (yPos > 180) {
      doc.addPage();
      yPos = 20;
    }

    // Top Items
    doc.setTextColor(...this.TEXT_DARK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('REPORTS.TOP_ITEMS'), 15, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [[
        '#',
        this.t('REPORTS.TABLE.ITEM'),
        this.t('REPORTS.TABLE.CATEGORY'),
        this.t('REPORTS.TABLE.QTY'),
        this.t('REPORTS.TABLE.UNIT_PRICE'),
        this.t('REPORTS.TABLE.TOTAL')
      ]],
      body: options.topItems.map((item, idx) => [
        (idx + 1).toString(),
        item.name,
        item.category,
        item.quantity.toString(),
        `${symbol}${this.formatNumber(item.price || 0)}`,
        `${symbol}${this.formatNumber(item.totalValue)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: this.PRIMARY_COLOR, textColor: [255, 255, 255] },
      margin: { left: 15, right: 15 }
    });

    // Footer
    this.addFooter(doc);

    doc.save(`value-report-${options.currency}-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // ============ STATUS REPORT PDF ============
  exportStatusReportToPDF(options: StatusReportPDFOptions): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(...this.HEADER_BG);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('REPORTS.PDF.STATUS_TITLE'), 15, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const locale = this.translate.currentLang === 'en' ? 'en-US' : 'es-HN';
    const currentDate = new Date().toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`${this.t('REPORTS.PDF.GENERATED')}: ${currentDate}`, 15, 33);

    yPos = 50;

    // Status summary cards
    this.drawStatusSummaryCards(doc, {
      inStock: options.inStockCount,
      lowStock: options.lowStockCount,
      outOfStock: options.outOfStockCount
    }, yPos, pageWidth);
    yPos += 35;

    // Out of Stock Items
    if (options.outOfStockItems.length > 0) {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.t('REPORTS.OUT_OF_STOCK_ITEMS')} (${options.outOfStockItems.length})`, 15, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [[
          this.t('REPORTS.TABLE.ITEM'),
          this.t('REPORTS.TABLE.CATEGORY'),
          this.t('REPORTS.PDF.WAREHOUSE'),
          this.t('REPORTS.PDF.MIN_QTY')
        ]],
        body: options.outOfStockItems.map(item => [
          item.name,
          item.category,
          item.warehouse?.name || '-',
          item.minQuantity.toString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
        margin: { left: 15, right: 15 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Check for new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    // Low Stock Items
    if (options.lowStockItems.length > 0) {
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.t('REPORTS.LOW_STOCK_ITEMS')} (${options.lowStockItems.length})`, 15, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [[
          this.t('REPORTS.TABLE.ITEM'),
          this.t('REPORTS.TABLE.CATEGORY'),
          this.t('REPORTS.PDF.CURRENT_QTY'),
          this.t('REPORTS.PDF.MIN_QTY'),
          this.t('REPORTS.PDF.WAREHOUSE')
        ]],
        body: options.lowStockItems.map(item => [
          item.name,
          item.category,
          item.quantity.toString(),
          item.minQuantity.toString(),
          item.warehouse?.name || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
        margin: { left: 15, right: 15 }
      });
    }

    // Footer
    this.addFooter(doc);

    doc.save(`status-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // ============ ASSIGNMENTS REPORT PDF ============
  exportAssignmentsReportToPDF(options: AssignmentsReportPDFOptions): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(...this.HEADER_BG);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('REPORTS.PDF.ASSIGNMENTS_TITLE'), 15, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const locale = this.translate.currentLang === 'en' ? 'en-US' : 'es-HN';
    const currentDate = new Date().toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`${this.t('REPORTS.PDF.GENERATED')}: ${currentDate}`, 15, 33);

    yPos = 50;

    // Summary cards
    this.drawAssignmentSummaryCards(doc, {
      total: options.totalUniqueItems,
      assigned: options.assignedCount,
      unassigned: options.unassignedCount
    }, yPos, pageWidth);
    yPos += 35;

    // Assignments by User
    doc.setTextColor(...this.TEXT_DARK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(this.t('REPORTS.ASSIGNMENTS_BY_USER'), 15, yPos);
    yPos += 5;

    if (options.assignmentsByUser.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [[
          this.t('REPORTS.PDF.USER'),
          this.t('REPORTS.PDF.EMAIL'),
          this.t('REPORTS.PDF.ITEMS_COUNT'),
          this.t('REPORTS.PDF.ASSIGNED_ITEMS')
        ]],
        body: options.assignmentsByUser.map(user => [
          user.userName,
          user.userEmail,
          user.itemCount.toString(),
          user.items.slice(0, 3).map(i => i.name).join(', ') + (user.items.length > 3 ? ` +${user.items.length - 3}` : '')
        ]),
        theme: 'striped',
        headStyles: { fillColor: this.PRIMARY_COLOR, textColor: [255, 255, 255] },
        margin: { left: 15, right: 15 },
        columnStyles: {
          3: { cellWidth: 60 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setTextColor(...this.TEXT_LIGHT);
      doc.setFontSize(10);
      doc.text(this.t('REPORTS.NO_ASSIGNMENTS'), 15, yPos + 5);
      yPos += 15;
    }

    // Check for new page
    if (yPos > 200 && options.unassignedItems.length > 0) {
      doc.addPage();
      yPos = 20;
    }

    // Unassigned Items
    if (options.unassignedItems.length > 0) {
      doc.setTextColor(...this.TEXT_DARK);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.t('REPORTS.UNASSIGNED_ITEMS')} (${options.unassignedItems.length})`, 15, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [[
          this.t('REPORTS.TABLE.ITEM'),
          this.t('REPORTS.PDF.SERVICE_TAG'),
          this.t('REPORTS.PDF.SERIAL_NUMBER'),
          this.t('REPORTS.PDF.WAREHOUSE')
        ]],
        body: options.unassignedItems.map(item => [
          item.name,
          item.serviceTag || '-',
          item.serialNumber || '-',
          item.warehouse?.name || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255] },
        margin: { left: 15, right: 15 }
      });
    }

    // Footer
    this.addFooter(doc);

    doc.save(`assignments-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // ============ HELPER METHODS ============
  private drawValueSummaryCards(
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

  private drawStatusSummaryCards(
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

  private drawAssignmentSummaryCards(
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

  private addFooter(doc: jsPDF): void {
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

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private calculateStats(transactions: Transaction[]): {
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

  private drawSummaryCards(
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

  private drawTransactionCard(
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

  private getTypeColor(type: TransactionType): [number, number, number] {
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

  private getTransactionTypeName(type: TransactionType): string {
    return this.t(`TRANSACTIONS.TYPE.${type}`);
  }

  // Generic method for simple table PDFs
  exportTableToPDF(options: {
    title: string;
    headers: string[];
    data: string[][];
    filename: string;
    subtitle?: string;
  }): void {
    const { title, headers, data, filename, subtitle } = options;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(...this.HEADER_BG);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, 22);

    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 15, 30);
    }

    // Table
    autoTable(doc, {
      startY: 45,
      head: [headers],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: this.PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        textColor: this.TEXT_DARK,
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 15, right: 15 }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
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

    doc.save(filename);
  }
}
