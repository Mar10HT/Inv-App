import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ReportTransaction, TransactionType } from '../interfaces/transaction.interface';
import { InventoryItemInterface } from '../interfaces/inventory-item.interface';
import { FiscalConfig } from '../interfaces/fiscal-config.interface';
import { PdfDrawingBase } from './pdf/pdf-drawing.base';
import { drawEmptyState, drawHeader, drawScope, drawSectionLabel, drawTable, drawTitle, drawTotals, ensurePageRoom, PAGE_MARGIN, ScopePair, stampFrameAndFooter, TotalsRow } from './pdf/report-components';
import { loadReportLogo } from './pdf/report-logo';
import { formatMoney, formatMoneyByCurrency, MoneyByCurrency } from '../utils/money.utils';
import { localDateKey } from '../utils/date.utils';

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
  fiscal?: FiscalConfig | null;
  userName?: string;
}

interface StatusReportPDFOptions {
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  inUseCount?: number;
  lowStockItems: InventoryItemInterface[];
  outOfStockItems: InventoryItemInterface[];
  fiscal?: FiscalConfig | null;
  userName?: string;
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
  fiscal?: FiscalConfig | null;
  userName?: string;
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
    const { fiscal, userName } = options;
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

    y = drawTitle(doc, this.t('REPORTS.PDF.VALUE_TITLE'), this.t('REPORTS.PDF.SUBTITLE_VALUE'), left, right, y);

    const currencyLabel = options.currency === 'ALL' ? this.t('REPORTS.ALL_CURRENCIES') : options.currency;
    y = drawScope(doc, [
      { label: this.t('REPORTS.PDF.CURRENCY'), value: currencyLabel },
      { label: this.t('REPORTS.TOTAL_ITEMS'), value: options.totalItems.toString() },
    ], left, right, y);

    const valueColumns = [
      { key: 'name', header: this.t('REPORTS.TABLE.NAME') },
      { key: 'items', header: this.t('REPORTS.TABLE.ITEMS'), align: 'center' as const },
      { key: 'value', header: this.t('REPORTS.TABLE.VALUE'), align: 'right' as const },
    ];
    const valueRows = (list: { label: string; value: MoneyByCurrency; count: number }[]) =>
      list.map((item) => ({ name: item.label, items: item.count.toString(), value: formatMoneyByCurrency(item.value) }));

    y = ensurePageRoom(doc, y);
    y = drawSectionLabel(doc, this.t('REPORTS.BY_CATEGORY'), left, y);
    y = drawTable(doc, autoTable, valueColumns, valueRows(options.valueByCategory), left, right, y) + 20;

    y = ensurePageRoom(doc, y);
    y = drawSectionLabel(doc, this.t('REPORTS.BY_WAREHOUSE'), left, y);
    y = drawTable(doc, autoTable, valueColumns, valueRows(options.valueByWarehouse), left, right, y) + 20;

    y = ensurePageRoom(doc, y);
    y = drawSectionLabel(doc, this.t('REPORTS.BY_SUPPLIER'), left, y);
    y = drawTable(doc, autoTable, valueColumns, valueRows(options.valueBySupplier), left, right, y) + 20;

    y = ensurePageRoom(doc, y);
    y = drawSectionLabel(doc, this.t('REPORTS.TOP_ITEMS'), left, y);
    y = drawTable(doc, autoTable, [
      { key: 'idx', header: '#', align: 'center' },
      { key: 'item', header: this.t('REPORTS.TABLE.ITEM') },
      { key: 'category', header: this.t('REPORTS.TABLE.CATEGORY') },
      { key: 'qty', header: this.t('REPORTS.TABLE.QTY'), align: 'center' },
      { key: 'unit', header: this.t('REPORTS.TABLE.UNIT_PRICE'), align: 'right' },
      { key: 'total', header: this.t('REPORTS.TABLE.TOTAL'), align: 'right' },
    ], options.topItems.map((item, idx) => ({
      idx: (idx + 1).toString(),
      item: item.name,
      category: item.category,
      qty: item.quantity.toString(),
      unit: formatMoney(item.price || 0, item.currency),
      total: formatMoney(item.totalValue, item.currency),
    })), left, right, y) + 10;

    y = ensurePageRoom(doc, y);
    const totalsRows: TotalsRow[] = [
      { label: this.t('REPORTS.TOTAL_VALUE'), value: formatMoneyByCurrency(options.totalValue), grand: true },
    ];
    drawTotals(doc, totalsRows, left, right, y);

    stampFrameAndFooter(
      doc,
      this.t('REPORTS.PDF.LEGAL'),
      (page, total) => `${this.t('REPORTS.PDF.PAGE')} ${page} ${this.t('REPORTS.PDF.OF')} ${total}`,
      left,
      right,
    );

    doc.save(`value-report-${options.currency}-${localDateKey(new Date())}.pdf`);
  }

  // ============ STATUS REPORT PDF ============
  async exportStatusReportToPDF(options: StatusReportPDFOptions): Promise<void> {
    const { jsPDF, autoTable } = await this.loadPdfLibs();
    const { fiscal, userName } = options;
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

    y = drawTitle(doc, this.t('REPORTS.PDF.STATUS_TITLE'), this.t('REPORTS.PDF.SUBTITLE_STATUS'), left, right, y);

    y = drawScope(doc, [
      { label: this.t('STATUS.IN_STOCK'), value: options.inStockCount.toString() },
      { label: this.t('STATUS.LOW_STOCK'), value: options.lowStockCount.toString() },
      { label: this.t('STATUS.OUT_OF_STOCK'), value: options.outOfStockCount.toString() },
    ], left, right, y);

    // Decision: these two tables keep their existing semantic header colors
    // (red/amber) instead of the template's uniform soft header — the color
    // itself is what flags severity at a glance in this report.
    if (options.outOfStockItems.length > 0) {
      y = ensurePageRoom(doc, y);
      y = drawSectionLabel(doc, `${this.t('REPORTS.OUT_OF_STOCK_ITEMS')} (${options.outOfStockItems.length})`, left, y);
      y = drawTable(doc, autoTable, [
        { key: 'item', header: this.t('REPORTS.TABLE.ITEM') },
        { key: 'category', header: this.t('REPORTS.TABLE.CATEGORY') },
        { key: 'warehouse', header: this.t('REPORTS.PDF.WAREHOUSE') },
        { key: 'minQty', header: this.t('REPORTS.PDF.MIN_QTY'), align: 'center' },
      ], options.outOfStockItems.map((item) => ({
        item: item.name,
        category: item.category,
        warehouse: item.warehouse?.name || '-',
        minQty: item.minQuantity.toString(),
      })), left, right, y, { fill: [239, 68, 68], text: [255, 255, 255] }) + 20;
    }

    if (options.lowStockItems.length > 0) {
      y = ensurePageRoom(doc, y);
      y = drawSectionLabel(doc, `${this.t('REPORTS.LOW_STOCK_ITEMS')} (${options.lowStockItems.length})`, left, y);
      drawTable(doc, autoTable, [
        { key: 'item', header: this.t('REPORTS.TABLE.ITEM') },
        { key: 'category', header: this.t('REPORTS.TABLE.CATEGORY') },
        { key: 'qty', header: this.t('REPORTS.PDF.CURRENT_QTY'), align: 'center' },
        { key: 'minQty', header: this.t('REPORTS.PDF.MIN_QTY'), align: 'center' },
        { key: 'warehouse', header: this.t('REPORTS.PDF.WAREHOUSE') },
      ], options.lowStockItems.map((item) => ({
        item: item.name,
        category: item.category,
        qty: item.quantity.toString(),
        minQty: item.minQuantity.toString(),
        warehouse: item.warehouse?.name || '-',
      })), left, right, y, { fill: [245, 158, 11], text: [255, 255, 255] });
    }

    stampFrameAndFooter(
      doc,
      this.t('REPORTS.PDF.LEGAL'),
      (page, total) => `${this.t('REPORTS.PDF.PAGE')} ${page} ${this.t('REPORTS.PDF.OF')} ${total}`,
      left,
      right,
    );

    doc.save(`status-report-${localDateKey(new Date())}.pdf`);
  }

  // ============ ASSIGNMENTS REPORT PDF ============
  async exportAssignmentsReportToPDF(options: AssignmentsReportPDFOptions): Promise<void> {
    const { jsPDF, autoTable } = await this.loadPdfLibs();
    const { fiscal, userName } = options;
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

    y = drawTitle(doc, this.t('REPORTS.PDF.ASSIGNMENTS_TITLE'), this.t('REPORTS.PDF.SUBTITLE_ASSIGNMENTS'), left, right, y);

    y = drawScope(doc, [
      { label: this.t('REPORTS.PDF.TOTAL_ITEMS'), value: options.totalUniqueItems.toString() },
      { label: this.t('REPORTS.PDF.ASSIGNED_ITEMS'), value: options.assignedCount.toString() },
      { label: this.t('REPORTS.UNASSIGNED_ITEMS'), value: options.unassignedCount.toString() },
    ], left, right, y);

    y = drawSectionLabel(doc, this.t('REPORTS.ASSIGNMENTS_BY_USER'), left, y);

    if (options.assignmentsByUser.length > 0) {
      y = drawTable(doc, autoTable, [
        { key: 'user', header: this.t('REPORTS.PDF.USER') },
        { key: 'email', header: this.t('REPORTS.PDF.EMAIL') },
        { key: 'count', header: this.t('REPORTS.PDF.ITEMS_COUNT'), align: 'center' },
        { key: 'items', header: this.t('REPORTS.PDF.ASSIGNED_ITEMS') },
      ], options.assignmentsByUser.map((user) => ({
        user: user.userName,
        email: user.userEmail,
        count: user.itemCount.toString(),
        items: user.items.slice(0, 3).map((i) => i.name).join(', ') + (user.items.length > 3 ? ` +${user.items.length - 3}` : ''),
      })), left, right, y) + 20;
    } else {
      y = drawEmptyState(doc, this.t('REPORTS.NO_ASSIGNMENTS'), left, right, y);
    }

    // Decision: this table keeps its existing gray header instead of the
    // template's accent header — it flags "unassigned" as a neutral/warning
    // state, distinct from the accent used for assigned data.
    if (options.unassignedItems.length > 0) {
      y = ensurePageRoom(doc, y);
      y = drawSectionLabel(doc, `${this.t('REPORTS.UNASSIGNED_ITEMS')} (${options.unassignedItems.length})`, left, y);
      drawTable(doc, autoTable, [
        { key: 'item', header: this.t('REPORTS.TABLE.ITEM') },
        { key: 'serviceTag', header: this.t('REPORTS.PDF.SERVICE_TAG') },
        { key: 'serialNumber', header: this.t('REPORTS.PDF.SERIAL_NUMBER') },
        { key: 'warehouse', header: this.t('REPORTS.PDF.WAREHOUSE') },
      ], options.unassignedItems.map((item) => ({
        item: item.name,
        serviceTag: item.serviceTag || '-',
        serialNumber: item.serialNumber || '-',
        warehouse: item.warehouse?.name || '-',
      })), left, right, y, { fill: [100, 116, 139], text: [255, 255, 255] });
    }

    stampFrameAndFooter(
      doc,
      this.t('REPORTS.PDF.LEGAL'),
      (page, total) => `${this.t('REPORTS.PDF.PAGE')} ${page} ${this.t('REPORTS.PDF.OF')} ${total}`,
      left,
      right,
    );

    doc.save(`assignments-report-${localDateKey(new Date())}.pdf`);
  }
}
