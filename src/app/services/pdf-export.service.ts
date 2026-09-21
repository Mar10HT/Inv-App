import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type jsPDF from 'jspdf';
import { Transaction, TransactionType } from '../interfaces/transaction.interface';
import { InventoryItemInterface } from '../interfaces/inventory-item.interface';
import { PdfDrawingBase } from './pdf/pdf-drawing.base';

/** jsPDF instance augmented with the `lastAutoTable` property that jspdf-autotable
 * attaches at runtime after each `autoTable()` call. The jspdf-autotable type
 * definitions don't expose this on the `jsPDF` type, so we extend it locally. */
interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

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
  inUseCount?: number;
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
export class PdfExportService extends PdfDrawingBase {
  protected readonly translate = inject(TranslateService);

  // Helper to get translation synchronously
  protected t(key: string): string {
    return this.translate.instant(key);
  }

  /** jsPDF and jspdf-autotable are heavy and only needed when a PDF is exported, so they
   *  are loaded on demand instead of being part of the initial bundle. */
  private async loadPdfLibs(): Promise<{
    jsPDF: typeof import('jspdf').default;
    autoTable: typeof import('jspdf-autotable').default;
  }> {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    return { jsPDF, autoTable };
  }

  async exportTransactionsToPDF(options: TransactionPDFOptions): Promise<void> {
    const { jsPDF } = await this.loadPdfLibs();
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
  async exportValueReportToPDF(options: ValueReportPDFOptions): Promise<void> {
    const { jsPDF, autoTable } = await this.loadPdfLibs();
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
    const leftTableHeight = (doc as JsPDFWithAutoTable).lastAutoTable.finalY - yPos;

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

    yPos = Math.max((doc as JsPDFWithAutoTable).lastAutoTable.finalY, yPos + leftTableHeight) + 10;

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

    yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;

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
  async exportStatusReportToPDF(options: StatusReportPDFOptions): Promise<void> {
    const { jsPDF, autoTable } = await this.loadPdfLibs();
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

      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
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
  async exportAssignmentsReportToPDF(options: AssignmentsReportPDFOptions): Promise<void> {
    const { jsPDF, autoTable } = await this.loadPdfLibs();
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

      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
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
}
