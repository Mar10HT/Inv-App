import * as XLSX from 'xlsx-js-style';

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

export interface XlsxSheetConfig {
  sheetName: string;
  filename: string;
  /** 6-char hex header background color, e.g. '4D7C6F' */
  headerColor: string;
  /** White or dark header text — use dark for light-colored headers */
  headerDarkText?: boolean;
  colWidths: number[];
  /** 0-based column index that holds status enum values for colored cells */
  statusColIndex?: number;
}

export function downloadStyledXLSX(rows: Record<string, any>[], config: XlsxSheetConfig): void {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  ws['!cols'] = config.colWidths.map(w => ({ wch: w }));

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const headerFontColor = config.headerDarkText ? '1A1A1A' : 'FFFFFF';

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;

      if (R === 0) {
        ws[addr].s = {
          fill: { patternType: 'solid', fgColor: { rgb: config.headerColor } },
          font: { bold: true, color: { rgb: headerFontColor }, sz: 11, name: 'Calibri' },
          alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
        };
      } else {
        const isAlt = R % 2 === 0;
        const baseFill = isAlt ? 'F1F5F9' : 'FFFFFF';

        let cellStyle: any = {
          fill: { patternType: 'solid', fgColor: { rgb: baseFill } },
          font: { sz: 10, name: 'Calibri', color: { rgb: '111827' } },
          alignment: { vertical: 'center' },
        };

        // Status cell coloring
        if (config.statusColIndex !== undefined && C === config.statusColIndex) {
          const val = String(ws[addr].v ?? '').trim().toUpperCase().replace(/ /g, '_');
          const sc = STATUS_COLORS[val];
          if (sc) {
            cellStyle = {
              fill: { patternType: 'solid', fgColor: { rgb: sc.bg } },
              font: { sz: 10, name: 'Calibri', bold: true, color: { rgb: sc.fg } },
              alignment: { vertical: 'center', horizontal: 'center' },
            };
          }
        }

        ws[addr].s = cellStyle;
      }
    }
  }

  ws['!rows'] = Array.from({ length: range.e.r + 1 }, (_, i) => ({ hpt: i === 0 ? 22 : 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.sheetName);
  XLSX.writeFile(wb, config.filename);
}
