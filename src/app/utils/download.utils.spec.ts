import { triggerBlobDownload } from './download.utils';

describe('triggerBlobDownload', () => {
  let createSpy: jasmine.Spy;
  let revokeSpy: jasmine.Spy;
  let clickSpy: jasmine.Spy;

  beforeEach(() => {
    createSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
    revokeSpy = spyOn(URL, 'revokeObjectURL');
    clickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
  });

  it('downloads the blob through an anchor that is in the DOM when clicked', () => {
    let anchorInDom = false;
    clickSpy.and.callFake(function (this: HTMLAnchorElement) {
      anchorInDom = document.body.contains(this);
    });

    triggerBlobDownload(new Blob(['x']), 'report.pdf');

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(anchorInDom).toBeTrue();
  });

  it('sets the file name and object URL on the anchor', () => {
    let href = '';
    let download = '';
    clickSpy.and.callFake(function (this: HTMLAnchorElement) {
      href = this.href;
      download = this.download;
    });

    triggerBlobDownload(new Blob(['x']), 'report.pdf');

    expect(href).toBe('blob:test-url');
    expect(download).toBe('report.pdf');
  });

  it('revokes the URL and removes the anchor only after the click has been handled', async () => {
    triggerBlobDownload(new Blob(['x']), 'report.pdf');

    expect(revokeSpy).not.toHaveBeenCalled();
    expect(document.body.querySelector('a[download="report.pdf"]')).not.toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(revokeSpy).toHaveBeenCalledOnceWith('blob:test-url');
    expect(document.body.querySelector('a[download="report.pdf"]')).toBeNull();
  });
});
