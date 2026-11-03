import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type jsPDF from 'jspdf';
import { ReportTransaction, TransactionType } from '../interfaces/transaction.interface';
import { InventoryItemInterface } from '../interfaces/inventory-item.interface';
import { FiscalConfig } from '../interfaces/fiscal-config.interface';
import { PdfDrawingBase } from './pdf/pdf-drawing.base';
import { drawEmptyState, drawHeader, drawScope, drawTable, drawTitle, PAGE_MARGIN, ScopePair, stampFrameAndFooter } from './pdf/report-components';
import { loadReportLogo } from './pdf/report-logo';
import { formatMoney, formatMoneyByCurrency, MoneyByCurrency } from '../utils/money.utils';
import { localDateKey } from '../utils/date.utils';

/** jsPDF instance augmented with the `lastAutoTable` property that jspdf-autotable
 * attaches at runtime after each `autoTable()` call. The jspdf-autotable type
 * definitions don't expose this on the `jsPDF` type, so we extend it locally. */
interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

interface TransactionPDFOptions {
  transactions: ReportTransaction[];
  dateRange?: { from?: string; to?: string };
  typeFilter?: string;
  fiscal?: FiscalConfig | null;
  userName?: string;
}

/** Matches the backend's fix (pdf-receipts.service.ts fmtDateTime): Node's ICU data
 *  inserts a narrow space before "m." in es-HN's a.m./p.m. — collapse it so the two
 *  repos' PDFs show the same format. */
function formatReportDateTime(date: Date, locale: string): string {
  return date
    .toLocaleString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit' })
    .replace(/\s(?=m\.)/i, '');
}

/** Same join the backend's buildHeaderData() uses for the fiscal address block. */
function buildFiscalAddressLine(fiscal: FiscalConfig | null | undefined): string | null {
  if (!fiscal) return null;
  return [fiscal.address, fiscal.fiscalPhone, fiscal.fiscalEmail].filter(Boolean).join(' · ') || null;
}

interface ValueReportPDFOptions {
  currency: string;
  totalValue: MoneyByCurrency;
  totalItems: number;
  valueByCategory: { label: string; value: MoneyByCurrency; count: number }[];
  valueByWarehouse: { label: string; value: MoneyByCurrency; count: number }[];
  valueBySupplier: { label: string; value: MoneyByCurrency; count: number }[];
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
    const { jsPDF, autoTable } = await this.loadPdfLibs();
    const { transactions, dateRange, typeFilter, fiscal, userName } = options;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const left = PAGE_MARGIN;
    const right = doc.internal.pageSize.getWidth() - PAGE_MARGIN;
    const locale = this.translate.currentLang === 'en' ? 'en-US' : 'es-HN';

    const logoDataUrl = await loadReportLogo();

    let y = drawHeader(doc, {
      logoDataUrl,
      rtn: fiscal?.rtn ?? null,
      addressLine: buildFiscalAddressLine(fiscal),
      docLabel: this.t('REPORTS.PDF.DOC_LABEL'),
      dateLine: formatReportDateTime(new Date(), locale),
      userLine: userName ?? '',
    }, left, right, PAGE_MARGIN);

    y = drawTitle(doc, this.t('REPORTS.PDF.TITLE'), this.t('REPORTS.PDF.SUBTITLE_TRANSACTIONS'), left, right, y);

    const scopePairs: ScopePair[] = [];
    if (dateRange?.from) scopePairs.push({ label: this.t('REPORTS.PDF.FROM'), value: dateRange.from });
    if (dateRange?.to) scopePairs.push({ label: this.t('REPORTS.PDF.TO'), value: dateRange.to });
    if (typeFilter && typeFilter !== 'ALL') {
      scopePairs.push({ label: this.t('REPORTS.PDF.TYPE'), value: this.getTransactionTypeName(typeFilter as TransactionType) });
    }
    if (scopePairs.length > 0) {
      y = drawScope(doc, scopePairs, left, right, y);
    }

    if (transactions.length > 0) {
      // One row per item line, not per transaction: a transaction with N items
      // becomes N rows sharing the same date/type/user (Decision: Transactions
      // becomes a flat 5-column table, losing per-transaction/item notes in the
      // PDF only — they stay visible on screen).
      const rows = transactions.flatMap((tx) =>
        tx.items.map((item) => ({
          date: formatReportDateTime(new Date(tx.date), locale),
          type: this.getTransactionTypeName(tx.type),
          item: item.inventoryItem?.name ?? this.t('REPORTS.PDF.UNKNOWN_ITEM'),
          qty: String(item.quantity),
          user: tx.user?.name || tx.user?.email || 'N/A',
        }))
      );
      drawTable(doc, autoTable, [
        { key: 'date', header: this.t('REPORTS.TABLE.DATE') },
        { key: 'type', header: this.t('REPORTS.TABLE.TYPE') },
        { key: 'item', header: this.t('REPORTS.TABLE.ITEM') },
        { key: 'qty', header: this.t('REPORTS.TABLE.QTY'), align: 'center' },
        { key: 'user', header: this.t('REPORTS.TABLE.USER') },
      ], rows, left, right, y);
    } else {
      drawEmptyState(doc, this.t('REPORTS.PDF.NO_TRANSACTIONS'), left, right, y + 10);
    }

    stampFrameAndFooter(
      doc,
      this.t('REPORTS.PDF.LEGAL'),
      (page, total) => `${this.t('REPORTS.PDF.PAGE')} ${page} ${this.t('REPORTS.PDF.OF')} ${total}`,
      left,
      right,
    );

    doc.save(`transactions-${localDateKey(new Date())}.pdf`);
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
    const currencyLabel = options.currency === 'ALL' ? this.t('REPORTS.ALL_CURRENCIES') : options.currency;
    doc.text(`${this.t('REPORTS.PDF.GENERATED')}: ${currentDate} | ${this.t('REPORTS.PDF.CURRENCY')}: ${currencyLabel}`, 15, 33);

    yPos = 50;

    // Summary cards
    this.drawValueSummaryCards(doc, {
      totalValue: formatMoneyByCurrency(options.totalValue),
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
        formatMoneyByCurrency(item.value)
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
        formatMoneyByCurrency(item.value)
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
        formatMoneyByCurrency(item.value)
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
        formatMoney(item.price || 0, item.currency),
        formatMoney(item.totalValue, item.currency)
      ]),
      theme: 'striped',
      headStyles: { fillColor: this.PRIMARY_COLOR, textColor: [255, 255, 255] },
      margin: { left: 15, right: 15 }
    });

    // Footer
    this.addFooter(doc);

    doc.save(`value-report-${options.currency}-${localDateKey(new Date())}.pdf`);
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

    doc.save(`status-report-${localDateKey(new Date())}.pdf`);
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

    doc.save(`assignments-report-${localDateKey(new Date())}.pdf`);
  }
}
