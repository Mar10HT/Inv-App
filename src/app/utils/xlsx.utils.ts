import type { CellStyle } from 'xlsx-js-style';

// Status-based cell colors (enum values, not translated)
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  IN_STOCK:       { bg: 'D1FAE5', fg: '065F46' },
  LOW_STOCK:      { bg: 'FEF3C7', fg: '92400E' },
  OUT_OF_STOCK:   { bg: 'FEE2E2', fg: '991B1B' },
  IN_USE:         { bg: 'E0E7FF', fg: '3730A3' },
  PENDING:        { bg: 'FEF3C7', fg: '92400E' },
  APPROVED:       { bg: 'D1FAE5', fg: '065F46' },
  SENT:           { bg: 'DBEAFE', fg: '1E40AF' },
  RECEIVED:       { bg: 'D1FAE5', fg: '065F46' },
  RETURNED:       { bg: 'D1FAE5', fg: '065F46' },
  RETURN_PENDING: { bg: 'FEF3C7', fg: '92400E' },
  OVERDUE:        { bg: 'FEE2E2', fg: '991B1B' },
  CANCELLED:      { bg: 'F1F5F9', fg: '475569' },
  REJECTED:       { bg: 'FEE2E2', fg: '991B1B' },
  COMPLETED:      { bg: 'D1FAE5', fg: '065F46' },
  CREATE:         { bg: 'D1FAE5', fg: '065F46' },
  UPDATE:         { bg: 'DBEAFE', fg: '1E40AF' },
  DELETE:         { bg: 'FEE2E2', fg: '991B1B' },
  RESTORE:        { bg: 'EDE9FE', fg: '4C1D95' },
};

/** Olancho Net palette, the same as the PDF reports (6-char hex). */
const ACCENT = '3A5F54';
const TEXT = '1C1C18';
const DIM = '58553F';
const RULE = 'CFC9B8';
const SOFT = 'F7F6F1';
const WHITE = 'FFFFFF';

/** Rows the heading takes above the column header. */
const HEADING_ROWS = 6;

/** A single exported row: column header -> cell value. Mirrors the cell value
 *  types xlsx-js-style itself accepts (`CellObject.v`). */
export type XlsxRow = Record<string, string | number | boolean | Date>;

/** The company heading above the table, as in the PDF reports. */
export interface XlsxHeading {
  company: string;
  title: string;
  /** RTN, address, phone and email in one line */
  fiscalLine?: string;
  /** "Generado el ... por ... · Bodega ... · N registros" */
  meta?: string;
}

export interface XlsxSheetConfig {
  sheetName: string;
  filename: string;
  colWidths: number[];
  /** 0-based column index that holds status enum values for colored cells */
  statusColIndex?: number;
  heading?: XlsxHeading;
}

type XlsxModule = typeof import('xlsx-js-style');

/** xlsx-js-style is a CommonJS package: a dynamic `import()` exposes its API under
 *  `default`, while a static `import * as` (or another bundler) exposes it directly. */
async function loadXlsx(): Promise<XlsxModule> {
  const mod = (await import('xlsx-js-style')) as XlsxModule & { default?: XlsxModule };
  return mod.default ?? mod;
}

const font = (extra: CellStyle['font'] = {}): CellStyle['font'] => ({ name: 'Calibri', sz: 10, color: { rgb: TEXT }, ...extra });
const hairline: CellStyle['border'] = { bottom: { style: 'hair', color: { rgb: RULE } } };

/** Builds a styled workbook and triggers the browser download. The xlsx library is
 *  heavy and only needed when the user exports, so it is loaded on demand instead of
 *  being part of the initial bundle. */
export async function downloadStyledXLSX(rows: XlsxRow[], config: XlsxSheetConfig): Promise<void> {
  const XLSX = await loadXlsx();
  const top = config.heading ? HEADING_ROWS : 0;
  const data = rows.length ? rows : [{}];
  const ws = top
    ? XLSX.utils.sheet_add_json(XLSX.utils.aoa_to_sheet([]), data, { origin: { r: top, c: 0 } })
    : XLSX.utils.json_to_sheet(data);
  ws['!cols'] = config.colWidths.map(w => ({ wch: w }));

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  range.s.r = top;

  for (let R = top; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;

      if (R === top) {
        ws[addr].s = {
          fill: { patternType: 'solid', fgColor: { rgb: ACCENT } },
          font: font({ bold: true, color: { rgb: WHITE } }),
          alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
        };
      } else {
        const isAlt = (R - top) % 2 === 0;

        let cellStyle: CellStyle = {
          fill: { patternType: 'solid', fgColor: { rgb: isAlt ? SOFT : WHITE } },
          font: font(),
          alignment: { vertical: 'center' },
          border: hairline,
        };

        // Status cell coloring
        if (config.statusColIndex !== undefined && C === config.statusColIndex) {
          const val = String(ws[addr].v ?? '').trim().toUpperCase().replace(/ /g, '_');
          const sc = STATUS_COLORS[val];
          if (sc) {
            cellStyle = {
              fill: { patternType: 'solid', fgColor: { rgb: sc.bg } },
              font: font({ bold: true, color: { rgb: sc.fg } }),
              alignment: { vertical: 'center', horizontal: 'center' },
              border: hairline,
            };
          }
        }

        ws[addr].s = cellStyle;
      }
    }
  }

  ws['!rows'] = Array.from({ length: range.e.r + 1 }, (_, i) => ({ hpt: i === top ? 22 : 18 }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: top, c: range.s.c }, e: { r: top, c: range.e.c } }) };

  if (config.heading) addHeading(XLSX, ws, config.heading, range.e.c);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.sheetName);
  XLSX.writeFile(wb, config.filename);
}

/** Company, fiscal data, an accent rule, the title and who generated it, each
 *  line merged across the table's width. */
function addHeading(XLSX: XlsxModule, ws: import('xlsx-js-style').WorkSheet, heading: XlsxHeading, lastCol: number): void {
  const lines: [number, string | undefined, CellStyle['font'], number][] = [
    [0, heading.company, font({ sz: 16, bold: true, color: { rgb: ACCENT } }), 24],
    [1, heading.fiscalLine, font({ sz: 9, color: { rgb: DIM } }), 14],
    [3, heading.title, font({ sz: 13, bold: true }), 22],
    [4, heading.meta, font({ sz: 9, color: { rgb: DIM } }), 14],
  ];
  const merges = ws['!merges'] ?? [];
  const rowHeights = ws['!rows'] ?? [];
  for (const [r, text, f, height] of lines) {
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: text ?? '', s: { font: f, alignment: { vertical: 'center' } } };
    if (lastCol > 0) merges.push({ s: { r, c: 0 }, e: { r, c: lastCol } });
    rowHeights[r] = { hpt: height };
  }
  for (let c = 0; c <= lastCol; c++) {
    ws[XLSX.utils.encode_cell({ r: 2, c })] = { t: 's', v: '', s: { border: { bottom: { style: 'medium', color: { rgb: ACCENT } } } } };
  }
  rowHeights[2] = { hpt: 6 };
  rowHeights[5] = { hpt: 8 };
  ws['!merges'] = merges;
  ws['!rows'] = rowHeights;
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  range.s.r = 0;
  ws['!ref'] = XLSX.utils.encode_range(range);
}
