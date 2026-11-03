import type jsPDF from 'jspdf';
import {
  ACCENT,
  RULE,
  SOFT,
  TEXT_DIM,
  drawHeader,
  drawScope,
  drawSectionLabel,
  drawSheetFrame,
  drawTable,
  drawTitle,
  drawTotals,
  stampFrameAndFooter,
} from './report-components';

/** A fake jsPDF with every method the kit calls spied, plus a stub page size. */
function createFakeDoc(pageCount = 1) {
  return {
    setFont: jasmine.createSpy('setFont'),
    setFontSize: jasmine.createSpy('setFontSize'),
    setTextColor: jasmine.createSpy('setTextColor'),
    setFillColor: jasmine.createSpy('setFillColor'),
    setDrawColor: jasmine.createSpy('setDrawColor'),
    setLineWidth: jasmine.createSpy('setLineWidth'),
    text: jasmine.createSpy('text'),
    rect: jasmine.createSpy('rect'),
    line: jasmine.createSpy('line'),
    getTextWidth: jasmine.createSpy('getTextWidth').and.returnValue(40),
    getImageProperties: jasmine.createSpy('getImageProperties').and.returnValue({ width: 400, height: 100 }),
    addImage: jasmine.createSpy('addImage'),
    getNumberOfPages: jasmine.createSpy('getNumberOfPages').and.returnValue(pageCount),
    setPage: jasmine.createSpy('setPage'),
    internal: { pageSize: { getWidth: () => 612, getHeight: () => 792 } },
    // lastAutoTable is only read by drawTable; tests that need it set it after creation.
    lastAutoTable: { finalY: 0 },
  };
}

type FakeDoc = ReturnType<typeof createFakeDoc>;

/** Casts a fake doc to jsPDF only at the call boundary, so `doc.xyz` assertions elsewhere stay Spy-typed. */
function asDoc(fake: FakeDoc): jsPDF {
  return fake as unknown as jsPDF;
}

describe('report-components', () => {
  describe('drawSheetFrame', () => {
    it('draws a full-page border and a thick accent line at the very top', () => {
      const doc = createFakeDoc();

      drawSheetFrame(asDoc(doc));

      expect(doc.rect).toHaveBeenCalledWith(0, 0, 612, 792, 'S');
      expect(doc.setDrawColor).toHaveBeenCalledWith(ACCENT);
      expect(doc.line).toHaveBeenCalledWith(0, jasmine.any(Number), 612, jasmine.any(Number));
    });
  });

  describe('drawHeader', () => {
    it('returns a y below the header and paints the accent rule across the full width', () => {
      const doc = createFakeDoc();

      const y = drawHeader(asDoc(doc), {
        logoDataUrl: null,
        rtn: null,
        addressLine: null,
        docLabel: 'Reporte',
        dateLine: '01/11/2026, 10:00am',
        userLine: 'Mario',
      }, 50, 562, 50);

      expect(y).toBeGreaterThan(50);
      // The bottom accent rule spans the full header width, left to right.
      const accentLines = doc.line.calls.allArgs().filter((args) => args[0] === 50 && args[2] === 562);
      expect(accentLines.length).toBe(1);
    });

    it('skips the logo draw when logoDataUrl is null', () => {
      const doc = createFakeDoc();

      drawHeader(asDoc(doc), {
        logoDataUrl: null,
        rtn: null,
        addressLine: null,
        docLabel: 'Reporte',
        dateLine: 'x',
        userLine: 'y',
      }, 50, 562, 50);

      expect(doc.addImage).not.toHaveBeenCalled();
    });

    it('draws the logo and offsets the fiscal text block when logoDataUrl is present', () => {
      const doc = createFakeDoc();

      drawHeader(asDoc(doc), {
        logoDataUrl: 'data:image/png;base64,xyz',
        rtn: '08011999123456',
        addressLine: 'Juticalpa, Olancho',
        docLabel: 'Reporte',
        dateLine: 'x',
        userLine: 'y',
      }, 50, 562, 50);

      expect(doc.addImage).toHaveBeenCalledTimes(1);
      expect(doc.text).toHaveBeenCalledWith('RTN 08011999123456', jasmine.any(Number), jasmine.any(Number), jasmine.objectContaining({ baseline: 'top' }));
    });

    it('degrades to no logo when getImageProperties throws on an unparseable data URL', () => {
      const doc = createFakeDoc();
      doc.getImageProperties.and.throwError("addImage does not support files of type 'UNKNOWN'");

      expect(() => drawHeader(asDoc(doc), {
        logoDataUrl: 'data:text/html;base64,xyz',
        rtn: null,
        addressLine: null,
        docLabel: 'Reporte',
        dateLine: 'x',
        userLine: 'y',
      }, 50, 562, 50)).not.toThrow();
      expect(doc.addImage).not.toHaveBeenCalled();
    });

    it('right-aligns the docbox label and date/user block to the box edge', () => {
      const doc = createFakeDoc();

      drawHeader(asDoc(doc), {
        logoDataUrl: null,
        rtn: null,
        addressLine: null,
        docLabel: 'Reporte',
        dateLine: '01/11/2026',
        userLine: 'Mario',
      }, 50, 562, 50);

      const rightAligned = doc.text.calls.allArgs().filter((args) => {
        const opts = args[3] as { align?: string } | undefined;
        return opts?.align === 'right';
      });
      // docLabel, dateLine, userLine
      expect(rightAligned.length).toBe(3);
    });
  });

  describe('drawTitle', () => {
    it('centers the title and returns a y below it', () => {
      const doc = createFakeDoc();

      const y = drawTitle(asDoc(doc), 'Reporte de Transacciones', null, 50, 562, 50);

      expect(doc.text).toHaveBeenCalledWith('Reporte de Transacciones', 306, 50, jasmine.objectContaining({ align: 'center', baseline: 'top' }));
      expect(y).toBeGreaterThan(50);
    });

    it('adds extra height for the subtitle when present', () => {
      const yNoSubtitle = drawTitle(asDoc(createFakeDoc()), 'Title', null, 50, 562, 50);
      const yWithSubtitle = drawTitle(asDoc(createFakeDoc()), 'Title', 'Subtitle text', 50, 562, 50);

      expect(yWithSubtitle).toBeGreaterThan(yNoSubtitle);
    });
  });

  describe('drawScope', () => {
    it('draws a soft background box and advances x by the measured width of each segment', () => {
      const doc = createFakeDoc();

      const y = drawScope(asDoc(doc), [
        { label: 'Desde', value: '01/10/2026' },
        { label: 'Hasta', value: '31/10/2026' },
      ], 50, 562, 50);

      expect(doc.setFillColor).toHaveBeenCalledWith(SOFT);
      expect(doc.setDrawColor).toHaveBeenCalledWith(RULE);
      // One rect for the box background/border.
      expect(doc.rect).toHaveBeenCalledWith(50, 50, 512, jasmine.any(Number), 'FD');
      // label + value drawn per pair = 4 text calls for 2 pairs.
      expect(doc.text).toHaveBeenCalledTimes(4);
      expect(y).toBeGreaterThan(50);
    });
  });

  describe('drawSectionLabel', () => {
    it('uppercases the text and returns a y below it', () => {
      const doc = createFakeDoc();

      const y = drawSectionLabel(asDoc(doc), 'por categoría', 50, 100);

      expect(doc.text).toHaveBeenCalledWith('POR CATEGORÍA', 50, 100, jasmine.objectContaining({ baseline: 'top' }));
      expect(y).toBeGreaterThan(100);
    });
  });

  describe('drawTable', () => {
    it('calls autoTable with grid theme, soft head styles and a didDrawCell accent-rule hook', () => {
      const doc = createFakeDoc();
      doc.lastAutoTable = { finalY: 150 };
      const runAutoTable = jasmine.createSpy('autoTable');

      const y = drawTable(
        asDoc(doc),
        runAutoTable as unknown as typeof import('jspdf-autotable').default,
        [
          { key: 'date', header: 'Fecha' },
          { key: 'qty', header: 'Cantidad', align: 'center' },
        ],
        [{ date: '01/10/2026', qty: '3' }],
        50,
        562,
        120,
      );

      expect(runAutoTable).toHaveBeenCalledTimes(1);
      const opts = runAutoTable.calls.argsFor(0)[1] as {
        startY: number;
        theme: string;
        head: string[][];
        body: string[][];
        headStyles: { fillColor: string; textColor: string };
        didDrawCell: (data: unknown) => void;
      };
      expect(opts.startY).toBe(120);
      expect(opts.theme).toBe('grid');
      expect(opts.head).toEqual([['FECHA', 'CANTIDAD']]);
      expect(opts.body).toEqual([['01/10/2026', '3']]);
      expect(opts.headStyles.fillColor).toBe(SOFT);
      expect(opts.headStyles.textColor).toBe(TEXT_DIM);

      // The didDrawCell hook paints the accent rule only for the first head row.
      const fakeCellDoc = { setLineWidth: jasmine.createSpy(), setDrawColor: jasmine.createSpy(), line: jasmine.createSpy() };
      opts.didDrawCell({
        section: 'head',
        row: { index: 0 },
        cell: { x: 10, y: 20, width: 100, height: 20 },
        doc: fakeCellDoc,
      });
      expect(fakeCellDoc.line).toHaveBeenCalledWith(10, 20, 110, 20);
      fakeCellDoc.line.calls.reset();
      opts.didDrawCell({ section: 'body', row: { index: 0 }, cell: { x: 10, y: 40, width: 100, height: 20 }, doc: fakeCellDoc });
      expect(fakeCellDoc.line).not.toHaveBeenCalled();

      expect(y).toBe(150);
    });

    it('uses a custom header color and skips the accent rule when one is given', () => {
      const doc = createFakeDoc();
      doc.lastAutoTable = { finalY: 80 };
      const runAutoTable = jasmine.createSpy('autoTable');

      drawTable(
        asDoc(doc),
        runAutoTable as unknown as typeof import('jspdf-autotable').default,
        [{ key: 'item', header: 'Ítem' }],
        [{ item: 'Router' }],
        50,
        562,
        120,
        { fill: [239, 68, 68], text: [255, 255, 255] },
      );

      const opts = runAutoTable.calls.argsFor(0)[1] as {
        headStyles: { fillColor: unknown; textColor: unknown };
        didDrawCell?: (data: unknown) => void;
      };
      expect(opts.headStyles.fillColor).toEqual([239, 68, 68]);
      expect(opts.headStyles.textColor).toEqual([255, 255, 255]);
      // No accent rule on top of a table that's already carrying its own semantic color.
      expect(opts.didDrawCell).toBeUndefined();
    });
  });

  describe('drawTotals', () => {
    it('draws a plain row in dim text and a grand row with an accent rule above it', () => {
      const doc = createFakeDoc();

      drawTotals(asDoc(doc), [
        { label: 'Subtotal', value: 'L. 100.00' },
        { label: 'Total', value: 'L. 100.00', grand: true },
      ], 50, 562, 200);

      expect(doc.setTextColor).toHaveBeenCalledWith(TEXT_DIM);
      expect(doc.setTextColor).toHaveBeenCalledWith(ACCENT);
      // The grand row's rule is the thick one (1.5), drawn before the accent text color is set.
      expect(doc.setLineWidth).toHaveBeenCalledWith(1.5);
      expect(doc.line).toHaveBeenCalledWith(50, jasmine.any(Number), 562, jasmine.any(Number));
    });

    it('right-aligns every value at the right edge', () => {
      const doc = createFakeDoc();

      drawTotals(asDoc(doc), [{ label: 'Subtotal', value: 'L. 100.00' }], 50, 562, 200);

      expect(doc.text).toHaveBeenCalledWith('L. 100.00', 562, jasmine.any(Number), jasmine.objectContaining({ align: 'right' }));
    });
  });

  describe('stampFrameAndFooter', () => {
    it('stamps the frame, rule and footer text on every page', () => {
      const doc = createFakeDoc(3);

      stampFrameAndFooter(asDoc(doc), 'Legal text', (page, total) => `Página ${page} de ${total}`, 50, 562);

      expect(doc.setPage).toHaveBeenCalledTimes(3);
      expect(doc.setPage.calls.allArgs()).toEqual([[1], [2], [3]]);
      expect(doc.text).toHaveBeenCalledWith('Página 1 de 3', 562, jasmine.any(Number), jasmine.objectContaining({ align: 'right' }));
      expect(doc.text).toHaveBeenCalledWith('Página 3 de 3', 562, jasmine.any(Number), jasmine.objectContaining({ align: 'right' }));
    });
  });
});
