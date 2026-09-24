const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/** Escapes text for HTML content and for single or double quoted attributes. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/**
 * True for the base64 raster image the API sends as a QR code. The value is written into a page and
 * used as a download link, so anything else (javascript:, text/html, svg, stray quotes) is refused.
 */
export function isImageDataUrl(value: string | null): value is string {
  return value !== null && /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

export interface QrPrintContent {
  title: string;
  dataUrl: string;
  heading: string;
  route: string;
  hint: string;
}

/**
 * The page that is opened to print a QR code. It is written into a blank window that shares the
 * origin of the app, so every value is escaped: warehouse and item names are typed by users, and
 * an unescaped one would run as script with the app's origin when somebody else prints.
 */
export function buildQrPrintHtml(content: QrPrintContent): string {
  const { title, dataUrl, heading, route, hint } = {
    title: escapeHtml(content.title),
    dataUrl: escapeHtml(content.dataUrl),
    heading: escapeHtml(content.heading),
    route: escapeHtml(content.route),
    hint: escapeHtml(content.hint)
  };

  return `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          img { max-width: 300px; }
          h2 { margin-bottom: 5px; }
          p { color: #666; margin: 5px 0; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="QR Code" />
        <h2>${heading}</h2>
        <p>${route}</p>
        <p>${hint}</p>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `;
}
