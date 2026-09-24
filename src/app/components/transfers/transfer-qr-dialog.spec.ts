import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferQrDialog } from './transfer-qr-dialog';
import { TransferRequest } from '../../interfaces/transfer-request.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

describe('TransferQrDialog printing', () => {
  let fixture: ComponentFixture<TransferQrDialog>;
  let component: TransferQrDialog;
  let written: string[];

  const request = (source: string, destination: string): TransferRequest =>
    ({ id: 't1', items: [{}, {}], sourceWarehouseName: source, destinationWarehouseName: destination }) as unknown as TransferRequest;

  const printedPage = (): Document => new DOMParser().parseFromString(written.join(''), 'text/html');

  beforeEach(async () => {
    written = [];
    spyOn(window, 'open').and.returnValue({
      document: { write: (html: string) => written.push(html), close: () => undefined }
    } as unknown as Window);

    await TestBed.configureTestingModule({
      imports: [TransferQrDialog],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(TransferQrDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('qrDataUrl', 'data:image/png;base64,AAAA');
  });

  it('prints the QR with the route of the transfer', () => {
    fixture.componentRef.setInput('request', request('Main', 'Backup'));

    component.printQrCode();

    const page = printedPage();
    expect(page.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(page.querySelector('h2')?.textContent).toBe('Transfer: 2 Items');
    expect(page.body.textContent).toContain('Main -> Backup');
  });

  it('does not run markup typed into a warehouse name', () => {
    fixture.componentRef.setInput('request', request('<img src=x onerror=alert(1)>', '</p><script>alert(2)</script>'));

    component.printQrCode();

    const page = printedPage();
    expect(page.querySelectorAll('img')).toHaveSize(1);
    expect(page.querySelector('[onerror]')).toBeNull();
    expect(page.querySelectorAll('script')).toHaveSize(1);
    expect(page.body.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('prints nothing without a QR code', () => {
    fixture.componentRef.setInput('qrDataUrl', null);
    fixture.componentRef.setInput('request', request('Main', 'Backup'));

    component.printQrCode();

    expect(written).toEqual([]);
  });
});
