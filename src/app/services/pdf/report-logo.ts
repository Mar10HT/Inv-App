const LOGO_PATH = '/brand/olanchonet-logo.png';

let cached: Promise<string | null> | null = null;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch(LOGO_PATH);
    // A dev/test server with an SPA fallback can answer a missing static path
    // with a 200 index.html instead of a 404 — ok:true but not an image, which
    // jsPDF's getImageProperties() can't parse. Reject it here instead of
    // handing drawHeader() a data URL it can't use.
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return null;
    return await readAsDataUrl(await response.blob());
  } catch {
    return null;
  }
}

/**
 * Fetches and memoizes the olanchonet logo as a data URL for jsPDF's addImage().
 * Never rejects: a failed fetch (404, offline, missing asset in a test run)
 * resolves null, so a report header draws without a logo instead of the whole
 * export throwing. There's no precedent for addImage()/fetch in this codebase,
 * so this is the one place a report PDF depends on a network request.
 */
export function loadReportLogo(): Promise<string | null> {
  if (!cached) {
    // Don't memoize a failure — a dropped/slow request on the first export of a
    // session shouldn't leave every later export in that tab logo-less until reload.
    cached = fetchLogoDataUrl().then((result) => {
      if (result === null) cached = null;
      return result;
    });
  }
  return cached;
}

/** Test-only: clears the memoized promise so each spec starts fresh. */
export function resetReportLogoCache(): void {
  cached = null;
}
