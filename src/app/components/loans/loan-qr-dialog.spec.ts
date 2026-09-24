import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanQrDialog } from './loan-qr-dialog';
import { Loan } from '../../interfaces/loan.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

describe('LoanQrDialog printing', () => {
  let fixture: ComponentFixture<LoanQrDialog>;
  let component: LoanQrDialog;
  let written: string[];

  const loan = (itemName: string, source: string): Loan =>
    ({
      id: 'l1',
      items: [{ inventoryItemName: itemName, quantity: 2 }],
      sourceWarehouseName: source,
      destinationWarehouseName: 'Backup'
    }) as unknown as Loan;

  const printedPage = (): Document => new DOMParser().parseFromString(written.join(''), 'text/html');

  beforeEach(async () => {
    written = [];
    spyOn(window, 'open').and.returnValue({
      document: { write: (html: string) => written.push(html), close: () => undefined }
    } as unknown as Window);

    await TestBed.configureTestingModule({
      imports: [LoanQrDialog],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanQrDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('qrDataUrl', 'data:image/png;base64,AAAA');
  });

  it('prints the QR with the items and the route of the loan', () => {
    fixture.componentRef.setInput('loan', loan('Laptop', 'Main'));

    component.printQrCode();

    const page = printedPage();
    expect(page.title).toBe('QR Code - Laptop ×2');
    expect(page.querySelector('h2')?.textContent).toBe('Laptop ×2');
    expect(page.body.textContent).toContain('Main → Backup');
    expect(page.body.textContent).toContain('Scan to confirm receipt');
  });

  it('asks to confirm the return when printing the return code', () => {
    fixture.componentRef.setInput('loan', loan('Laptop', 'Main'));
    fixture.componentRef.setInput('type', 'return');

    component.printQrCode();

    expect(printedPage().body.textContent).toContain('Scan to confirm return');
  });

  it('does not run markup typed into an item or warehouse name', () => {
    fixture.componentRef.setInput('loan', loan('</title><script>alert(1)</script>', '<img src=x onerror=alert(2)>'));

    component.printQrCode();

    const page = printedPage();
    expect(page.querySelectorAll('img')).toHaveSize(1);
    expect(page.querySelector('[onerror]')).toBeNull();
    expect(page.querySelectorAll('script')).toHaveSize(1);
  });

  it('prints nothing without a QR code', () => {
    fixture.componentRef.setInput('qrDataUrl', null);
    fixture.componentRef.setInput('loan', loan('Laptop', 'Main'));

    component.printQrCode();

    expect(written).toEqual([]);
  });
});
