import type jsPDF from 'jspdf';
import type autoTable from 'jspdf-autotable';
import type { CellHookData, Color } from 'jspdf-autotable';

/**
 * Drawing primitives for the olanchonet report layout, ported in spirit (not
 * in code — PDFKit and jsPDF are different libraries) from
 * Inv-App-API/src/pdf-receipts/receipt-components.ts, the kit the backend's
 * PDF receipts already use. Every function draws and returns the y
 * coordinate right after what it drew, so the caller (pdf-export.service.ts)
 * can keep stacking sections.
 *
 * Unlike the receipts kit, reports have no document number — there's no
 * per-report correlative — so there is no docNumber field and no
 * Courier-Bold value in the docbox, only a plain label.
 *
 * jsPDF footgun this file leans on throughout: doc.text()'s `y` is the text
 * BASELINE by default, not the top of the glyph box like PDFKit. Every call
 * below passes `baseline: 'top'` so the ported vertical-rhythm arithmetic
 * (lifted straight from the PDFKit kit's FONT/SPACING constants) means the
 * same thing here. The other footgun: jsPDF's `align` treats `x` as the edge
 * text is anchored to (the right edge for 'right', the center for 'center'),
 * not a box origin + width like PDFKit's `{ width, align }` — so a PDFKit
 * call `text(x, y, { width: W, align: 'right' })` becomes
 * `text(x + W, y, { align: 'right' })` here, not the same (x, width).
 */

export const PAGE_MARGIN = 50;

// ACCENT also lives as --color-report-accent in src/styles/design-system/colors.css
// for design-system consistency; jsPDF can't read CSS variables, so the hex is
// duplicated here. Keep the two in sync if the brand color ever changes.
export const ACCENT = '#3a5f54';
export const ACCENT_2 = '#4d7c6f';
export const TEXT = '#1c1c18';
export const TEXT_DIM = '#58553f';
export const RULE = '#cfc9b8';
export const SOFT = '#f7f6f1';

const RULE_WIDTH = 0.75;
const THICK_RULE_WIDTH = 1.5;
const TOP_BAR_WIDTH = 3;
// Same approximation the PDFKit kit uses: a single-font line-height factor
// instead of measuring actual glyph metrics per string.
const LINE_HEIGHT = 1.3;
const LOGO_HEIGHT = 27;
const DOCBOX_RESERVE = 150;

const FONT = {
  rtn: 9,
  addr: 7.875,
  docLabel: 7.125,
  docMeta: 7.5,
  h1: 15,
  subtitle: 9,
  scope: 8.25,
  tableHeader: 7.5,
  tableBody: 9.375,
  totalsRow: 9.375,
  totalsGrand: 11.25,
  sectionLabel: 7.5,
  footer: 7.5,
  empty: 11,
} as const;

const SPACING = {
  brandGap: 10.5,
  addrMarginTop: 1.5,
  headerPaddingBottom: 12,
  headerMarginBottom: 13.5,
  docboxPaddingV: 6,
  docboxPaddingH: 10.5,
  docboxMetaPaddingTop: 3.75,
  h1MarginBottom: 3,
  subtitleMarginBottom: 13.5,
  scopePaddingV: 6.75,
  scopePaddingH: 10.5,
  scopeMarginBottom: 16.5,
  tdPaddingV: 6.75,
  tdPaddingH: 7.5,
  thPaddingV: 6,
  totalsRowPaddingV: 3.75,
  totalsGrandPaddingTop: 7.5,
  sectionLabelMarginBottom: 6,
  footerPaddingTop: 9,
  footerReserve: 80,
} as const;

/**
 * Starts a new page when `y` is too close to the footer to fit another section,
 * keeping a section's heading from landing alone at the bottom of a page with
 * its table on the next one. Returns the y to draw at (unchanged, or the top
 * margin after a page break).
 */
export function ensurePageRoom(doc: jsPDF, y: number): number {
  const bottomLimit = doc.internal.pageSize.getHeight() - PAGE_MARGIN - SPACING.footerReserve;
  if (y > bottomLimit) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

/** The template's sheet-card border + 4pt accent top bar. Call once per page. */
export function drawSheetFrame(doc: jsPDF): void {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setLineWidth(RULE_WIDTH);
  doc.setDrawColor(RULE);
  doc.rect(0, 0, width, height, 'S');

  doc.setLineWidth(TOP_BAR_WIDTH);
  doc.setDrawColor(ACCENT);
  doc.line(0, TOP_BAR_WIDTH / 2, width, TOP_BAR_WIDTH / 2);
}

export interface ReportHeaderData {
  logoDataUrl: string | null;
  rtn: string | null;
  /** Already joined by the caller (address, phone, email). */
  addressLine: string | null;
  docLabel: string;
  dateLine: string;
  userLine: string;
}

/**
 * Logo + fiscal info on the left, bordered docbox (label + date/user, no
 * document number — reports don't have one) on the right, accent rule across
 * the bottom of the whole block.
 */
export function drawHeader(doc: jsPDF, data: ReportHeaderData, left: number, right: number, top: number): number {
  let logoWidth = 0;
  if (data.logoDataUrl) {
    // report-logo.ts already filters non-image responses, but jsPDF's own parsing
    // (corrupt bytes, a format it doesn't recognize) can still throw — degrade to
    // no logo rather than let that exception take down the whole export.
    try {
      const props = doc.getImageProperties(data.logoDataUrl);
      logoWidth = (LOGO_HEIGHT / props.height) * props.width;
      doc.addImage(data.logoDataUrl, 'PNG', left, top, logoWidth, LOGO_HEIGHT);
    } catch {
      logoWidth = 0;
    }
  }

  const textX = left + (logoWidth ? logoWidth + SPACING.brandGap : 0);
  const textWidth = right - textX - DOCBOX_RESERVE;
  let leftY = top;
  if (data.rtn) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT.rtn);
    doc.setTextColor(TEXT);
    doc.text(`RTN ${data.rtn}`, textX, leftY, { baseline: 'top', maxWidth: textWidth });
    leftY += FONT.rtn * LINE_HEIGHT;
  }
  if (data.addressLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT.addr);
    doc.setTextColor(TEXT_DIM);
    doc.text(data.addressLine, textX, leftY + SPACING.addrMarginTop, { baseline: 'top', maxWidth: textWidth });
    leftY += SPACING.addrMarginTop + FONT.addr * LINE_HEIGHT * 2;
  }
  const leftHeight = Math.max(LOGO_HEIGHT, leftY - top);

  // Size the docbox from the widest of its three lines before drawing any of them.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT.docMeta);
  const metaWidth = Math.max(doc.getTextWidth(data.dateLine), doc.getTextWidth(data.userLine));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT.docLabel);
  const labelWidth = doc.getTextWidth(data.docLabel.toUpperCase());
  const boxContentWidth = Math.max(metaWidth, labelWidth, 70);
  const boxWidth = boxContentWidth + SPACING.docboxPaddingH * 2;
  const boxX = right - boxWidth;
  const boxTextRight = right - SPACING.docboxPaddingH;

  let boxY = top + SPACING.docboxPaddingV;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT.docLabel);
  doc.setTextColor(TEXT_DIM);
  doc.text(data.docLabel.toUpperCase(), boxTextRight, boxY, { baseline: 'top', align: 'right', maxWidth: boxContentWidth });
  boxY += FONT.docLabel * LINE_HEIGHT;

  doc.setLineWidth(RULE_WIDTH);
  doc.setDrawColor(RULE);
  doc.line(boxX + SPACING.docboxPaddingH, boxY, boxX + boxWidth - SPACING.docboxPaddingH, boxY);
  boxY += SPACING.docboxMetaPaddingTop;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT.docMeta);
  doc.setTextColor(TEXT_DIM);
  doc.text(data.dateLine, boxTextRight, boxY, { baseline: 'top', align: 'right', maxWidth: boxContentWidth });
  boxY += FONT.docMeta * LINE_HEIGHT;
  doc.text(data.userLine, boxTextRight, boxY, { baseline: 'top', align: 'right', maxWidth: boxContentWidth });
  boxY += FONT.docMeta * LINE_HEIGHT;

  const boxHeight = boxY + SPACING.docboxPaddingV - top;
  doc.setLineWidth(RULE_WIDTH);
  doc.setDrawColor(ACCENT);
  doc.rect(boxX, top, boxWidth, boxHeight, 'S');

  const headerHeight = Math.max(leftHeight, boxHeight);
  const ruleY = top + headerHeight + SPACING.headerPaddingBottom;
  doc.setLineWidth(RULE_WIDTH);
  doc.setDrawColor(ACCENT);
  doc.line(left, ruleY, right, ruleY);

  doc.setTextColor(TEXT);
  return ruleY + SPACING.headerMarginBottom;
}

/** Serif accent h1, centered, optional gray subtitle below. */
export function drawTitle(doc: jsPDF, title: string, subtitle: string | null, left: number, right: number, top: number): number {
  const width = right - left;
  const centerX = left + width / 2;

  doc.setFont('times', 'bold');
  doc.setFontSize(FONT.h1);
  doc.setTextColor(ACCENT);
  doc.text(title, centerX, top, { baseline: 'top', align: 'center', maxWidth: width });
  let y = top + FONT.h1 * LINE_HEIGHT + SPACING.h1MarginBottom;

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT.subtitle);
    doc.setTextColor(TEXT_DIM);
    doc.text(subtitle, centerX, y, { baseline: 'top', align: 'center', maxWidth: width });
    y += FONT.subtitle * LINE_HEIGHT;
  }

  doc.setTextColor(TEXT);
  return y + SPACING.subtitleMarginBottom;
}

export interface ScopePair {
  label: string;
  value: string;
}

/**
 * Single-line "Label: value    Label: value" strip with a soft background,
 * matching the template's .scope box.
 * ponytail: fixed single-line height, same simplification the PDFKit kit
 * makes — doesn't grow for a very long pair list. Upgrade with
 * splitTextToSize()-based measuring if a real report ever overflows it.
 */
export function drawScope(doc: jsPDF, pairs: ScopePair[], left: number, right: number, top: number): number {
  const width = right - left;
  const height = SPACING.scopePaddingV * 2 + FONT.scope * LINE_HEIGHT;

  doc.setFillColor(SOFT);
  doc.setDrawColor(RULE);
  doc.setLineWidth(RULE_WIDTH);
  doc.rect(left, top, width, height, 'FD');

  let x = left + SPACING.scopePaddingH;
  const y = top + SPACING.scopePaddingV;
  doc.setFontSize(FONT.scope);

  pairs.forEach((pair, i) => {
    // Template uses `gap: 20px` between flex items, no separator glyph —
    // approximate that gap with plain spaces rather than inventing a "·"
    // the design doesn't have.
    const prefix = i === 0 ? `${pair.label}: ` : `    ${pair.label}: `;
    // Order matters: set the font/size BEFORE both drawing and measuring —
    // getTextWidth() reads whatever font is currently active, so measuring
    // after switching fonts (or before setting one) silently returns the
    // wrong width and the next segment overlaps or gaps.
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT);
    doc.text(prefix, x, y, { baseline: 'top' });
    x += doc.getTextWidth(prefix);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_DIM);
    doc.text(pair.value, x, y, { baseline: 'top' });
    x += doc.getTextWidth(pair.value);
  });

  doc.setTextColor(TEXT);
  return top + height + SPACING.scopeMarginBottom;
}

/**
 * Small uppercase rotulo above a table, for reports with several tables
 * (Value, Status, Assignments) — the receipts kit never needs this, a
 * comprobante only ever has one table.
 */
export function drawSectionLabel(doc: jsPDF, text: string, left: number, top: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT.sectionLabel);
  doc.setTextColor(TEXT_DIM);
  doc.text(text.toUpperCase(), left, top, { baseline: 'top' });
  doc.setTextColor(TEXT);
  return top + FONT.sectionLabel * LINE_HEIGHT + SPACING.sectionLabelMarginBottom;
}

export interface ReportTableColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
}

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

/**
 * Declarative-column table via jspdf-autotable (theme 'grid'), restyled to
 * match the template: soft header background, dim uppercase header text, and
 * a 2px accent rule under the header row that autoTable has no option for —
 * added with a didDrawCell hook instead of hand-rolling pagination and row
 * height, which autoTable already does well (see Decision 1 in the plan this
 * ported). Column widths are left to autoTable's own content-based sizing,
 * not fixed, so neither column overflows if a translation runs longer.
 *
 * `headerColors` is an escape hatch for the handful of tables that keep their
 * existing semantic header color (red/amber for Estado's out-of-stock/low-stock,
 * gray for Asignaciones' unassigned — user decision: fidelity to the template
 * everywhere else, but these three colors stay). When given, the accent rule is
 * skipped too — a green accent line over a red header reads as a mistake, not a feature.
 */
export function drawTable(
  doc: jsPDF,
  runAutoTable: typeof autoTable,
  columns: ReportTableColumn[],
  rows: Record<string, string>[],
  left: number,
  right: number,
  top: number,
  headerColors?: { fill: Color; text: Color },
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  runAutoTable(doc, {
    startY: top,
    margin: { left, right: pageWidth - right, top: PAGE_MARGIN, bottom: PAGE_MARGIN },
    theme: 'grid',
    head: [columns.map((col) => col.header.toUpperCase())],
    body: rows.map((row) => columns.map((col) => row[col.key] ?? '')),
    columnStyles: Object.fromEntries(columns.map((col, i) => [i, { halign: col.align ?? 'left' }])),
    styles: {
      font: 'helvetica',
      fontSize: FONT.tableBody,
      textColor: TEXT,
      lineColor: RULE,
      lineWidth: RULE_WIDTH,
      cellPadding: { top: SPACING.tdPaddingV, bottom: SPACING.tdPaddingV, left: SPACING.tdPaddingH, right: SPACING.tdPaddingH },
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: headerColors?.fill ?? SOFT,
      textColor: headerColors?.text ?? TEXT_DIM,
      fontStyle: 'bold',
      fontSize: FONT.tableHeader,
      cellPadding: { top: SPACING.thPaddingV, bottom: SPACING.thPaddingV, left: SPACING.tdPaddingH, right: SPACING.tdPaddingH },
      lineColor: RULE,
      lineWidth: RULE_WIDTH,
    },
    ...(headerColors ? {} : {
      didDrawCell: (data: CellHookData) => {
        if (data.section === 'head' && data.row.index === 0) {
          const cellDoc = data.doc as unknown as jsPDF;
          cellDoc.setLineWidth(THICK_RULE_WIDTH);
          cellDoc.setDrawColor(ACCENT);
          cellDoc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
        }
      },
    }),
  });

  return (doc as JsPDFWithAutoTable).lastAutoTable.finalY;
}

export interface TotalsRow {
  label: string;
  value: string;
  grand?: boolean;
}

/**
 * Subtotal/tax rows in dim small text, grand total row with a 2px accent
 * rule above it and larger bold accent text. Values are right-aligned
 * directly at `right` — jsPDF's align:'right' anchors x to the text's right
 * edge, unlike PDFKit's box-based alignment, so there's no separate
 * label/value column width to compute here.
 */
export function drawTotals(doc: jsPDF, rows: TotalsRow[], left: number, right: number, top: number): number {
  let y = top;
  const labelWidth = (right - left) * 0.7;

  for (const row of rows) {
    if (row.grand) {
      doc.setLineWidth(THICK_RULE_WIDTH);
      doc.setDrawColor(ACCENT);
      doc.line(left, y, right, y);
      y += SPACING.totalsGrandPaddingTop;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT.totalsGrand);
      doc.setTextColor(ACCENT);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT.totalsRow);
      doc.setTextColor(TEXT_DIM);
    }

    doc.text(row.label, left, y, { baseline: 'top', maxWidth: labelWidth });
    doc.text(row.value, right, y, { baseline: 'top', align: 'right' });

    y += row.grand
      ? FONT.totalsGrand * LINE_HEIGHT + SPACING.totalsRowPaddingV
      : FONT.totalsRow * LINE_HEIGHT + SPACING.totalsRowPaddingV;
  }

  doc.setTextColor(TEXT);
  return y;
}

/**
 * Stamps the sheet frame, a footer rule, legal text and a page label on
 * every page already in the document. Simpler than the backend's
 * stampFooterAndVoidWatermark: jsPDF lets setPage() revisit any page that
 * already exists, so this is one pass over doc.getNumberOfPages() after the
 * whole body is laid out — no bufferPages/switchToPage dance, and it covers
 * pages autoTable added on its own.
 */
export function stampFrameAndFooter(
  doc: jsPDF,
  legalText: string,
  pageLabel: (page: number, total: number) => string,
  left: number,
  right: number,
): void {
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ruleY = pageHeight - PAGE_MARGIN;
  const footerTop = ruleY + SPACING.footerPaddingTop;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawSheetFrame(doc);

    doc.setLineWidth(RULE_WIDTH);
    doc.setDrawColor(RULE);
    doc.line(left, ruleY, right, ruleY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT.footer);
    doc.setTextColor(TEXT_DIM);
    doc.text(legalText, left, footerTop, { baseline: 'top', maxWidth: right - left - 150 });
    doc.text(pageLabel(i, pageCount), right, footerTop, { baseline: 'top', align: 'right' });
  }

  doc.setTextColor(TEXT);
}

/** Centered italic placeholder text for an empty report table. */
export function drawEmptyState(doc: jsPDF, text: string, left: number, right: number, top: number): number {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(FONT.empty);
  doc.setTextColor(TEXT_DIM);
  doc.text(text, left + (right - left) / 2, top, { baseline: 'top', align: 'center' });
  doc.setTextColor(TEXT);
  return top + FONT.empty * LINE_HEIGHT;
}
