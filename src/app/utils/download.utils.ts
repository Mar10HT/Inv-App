/**
 * Trigger a browser download for a blob.
 *
 * Firefox/Safari require the anchor to be in the DOM and the object URL to
 * outlive the click event — revoking synchronously after click() cancels the
 * download. Append to body, click, then revoke on a macrotask.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}
