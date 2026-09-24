import { buildQrPrintHtml, escapeHtml } from './qr-print.utils';

const parse = (html: string): Document => new DOMParser().parseFromString(html, 'text/html');

describe('qr-print.utils', () => {
  describe('escapeHtml', () => {
    it('escapes the five characters that can start markup or leave an attribute', () => {
      expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
        '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;'
      );
    });

    it('leaves ordinary text alone', () => {
      expect(escapeHtml('Bodega Central → Sucursal 2 ×3')).toBe('Bodega Central → Sucursal 2 ×3');
    });
  });

  describe('buildQrPrintHtml', () => {
    const safe = {
      title: 'QR Code - Laptop',
      dataUrl: 'data:image/png;base64,AAAA',
      heading: 'Laptop ×2',
      route: 'Main → Backup',
      hint: 'Scan to confirm receipt'
    };

    it('renders the QR, the heading, the route and the hint', () => {
      const doc = parse(buildQrPrintHtml(safe));

      expect(doc.title).toBe('QR Code - Laptop');
      expect(doc.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
      expect(doc.querySelector('h2')?.textContent).toBe('Laptop ×2');
      expect(doc.body.textContent).toContain('Main → Backup');
      expect(doc.body.textContent).toContain('Scan to confirm receipt');
    });

    it('prints the page when it loads', () => {
      const scripts = parse(buildQrPrintHtml(safe)).querySelectorAll('script');

      expect(scripts).toHaveSize(1);
      expect(scripts[0].textContent).toContain('window.print()');
    });

    describe('with hostile names, which warehouse and item names are since users type them', () => {
      const hostile = {
        title: '</title><script>alert(1)</script>',
        dataUrl: 'x" onerror="alert(2)',
        heading: '</h2><img src=x onerror=alert(3)>',
        route: '"><script>alert(4)</script>',
        hint: '<b onclick=alert(5)>hint</b>'
      };
      const doc = parse(buildQrPrintHtml(hostile));

      it('adds no script besides the print one', () => {
        expect(doc.querySelectorAll('script')).toHaveSize(1);
      });

      it('adds no event handler attribute to any element', () => {
        const withHandlers = Array.from(doc.querySelectorAll('*')).filter((el) =>
          el.getAttributeNames().some((name) => name.startsWith('on'))
        );

        expect(withHandlers).toEqual([]);
      });

      it('shows the hostile text as plain text instead of running it', () => {
        expect(doc.title).toBe(hostile.title);
        expect(doc.querySelector('h2')?.textContent).toBe(hostile.heading);
        expect(doc.body.textContent).toContain(hostile.route);
        expect(doc.body.textContent).toContain(hostile.hint);
      });

      it('keeps a quote in the QR value inside the src attribute', () => {
        const img = doc.querySelector('img');

        expect(img?.getAttribute('src')).toBe(hostile.dataUrl);
        expect(img?.hasAttribute('onerror')).toBeFalse();
      });
    });
  });
});
