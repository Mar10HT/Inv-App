import { loadReportLogo, resetReportLogoCache } from './report-logo';

describe('loadReportLogo', () => {
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    resetReportLogoCache();
    fetchSpy = spyOn(window, 'fetch');
  });

  function mockOkResponse(dataUrl: string, contentType = 'image/png'): void {
    class FakeFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(): void {
        this.result = dataUrl;
        this.onload?.();
      }
    }
    spyOn(window, 'FileReader').and.returnValue(new FakeFileReader() as unknown as FileReader);
    fetchSpy.and.resolveTo({
      ok: true,
      headers: { get: (name: string) => (name === 'content-type' ? contentType : null) },
      blob: () => Promise.resolve(new Blob())
    } as unknown as Response);
  }

  it('resolves the logo as a data URL on success', async () => {
    mockOkResponse('data:image/png;base64,xyz');

    const result = await loadReportLogo();

    expect(result).toBe('data:image/png;base64,xyz');
    expect(fetchSpy).toHaveBeenCalledWith('/brand/olanchonet-logo.png');
  });

  it('resolves null instead of throwing when the fetch response is not ok', async () => {
    fetchSpy.and.resolveTo({ ok: false } as unknown as Response);

    const result = await loadReportLogo();

    expect(result).toBeNull();
  });

  it('resolves null when the response is ok but not an image (e.g. an SPA fallback index.html)', async () => {
    mockOkResponse('data:text/html;base64,xyz', 'text/html');

    const result = await loadReportLogo();

    expect(result).toBeNull();
  });

  it('resolves null instead of throwing when fetch rejects', async () => {
    fetchSpy.and.rejectWith(new Error('offline'));

    const result = await loadReportLogo();

    expect(result).toBeNull();
  });

  it('only fetches once across repeated calls (memoized)', async () => {
    mockOkResponse('data:image/png;base64,xyz');

    await loadReportLogo();
    await loadReportLogo();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries on the next call after a failure, instead of memoizing null forever', async () => {
    fetchSpy.and.resolveTo({ ok: false } as unknown as Response);
    expect(await loadReportLogo()).toBeNull();

    mockOkResponse('data:image/png;base64,xyz');
    const result = await loadReportLogo();

    expect(result).toBe('data:image/png;base64,xyz');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
