import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { LoanQrDialog, LoanScanDialog } from './loan-qr-dialog';
import { LoanService } from '../../services/loan.service';
import { NotificationService } from '../../services/notification.service';
import { Loan, LoanWithQr } from '../../interfaces/loan.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const loan = (items: { inventoryItemName: string; quantity: number }[] = [{ inventoryItemName: 'Laptop', quantity: 1 }]): Loan =>
  ({ id: 'l1', items, sourceWarehouseName: 'Main', destinationWarehouseName: 'Backup' }) as unknown as Loan;

describe('LoanQrDialog actions', () => {
  let fixture: ComponentFixture<LoanQrDialog>;
  let component: LoanQrDialog;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanQrDialog],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanQrDialog);
    component = fixture.componentInstance;
  });

  it('asks its parent to close', () => {
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);

    component.close();

    expect(closed).toHaveBeenCalledTimes(1);
  });

  describe('loanSummary', () => {
    it('is empty without a loan', () => {
      expect(component.loanSummary()).toBe('');
    });

    it('lists the items, with the quantity only when there is more than one', () => {
      fixture.componentRef.setInput('loan', loan([{ inventoryItemName: 'Laptop', quantity: 1 }, { inventoryItemName: 'Cable', quantity: 3 }]));

      expect(component.loanSummary()).toBe('Laptop; Cable ×3');
    });
  });

  describe('downloadQrCode', () => {
    let downloads: { download: string; href: string }[];

    beforeEach(() => {
      downloads = [];
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        downloads.push({ download: this.download, href: this.href });
      });
      fixture.componentRef.setInput('qrDataUrl', 'data:image/png;base64,AAAA');
    });

    it('saves the QR named after the loan and the kind of code', () => {
      fixture.componentRef.setInput('loan', loan());

      component.downloadQrCode();
      fixture.componentRef.setInput('type', 'return');
      component.downloadQrCode();

      expect(downloads).toEqual([
        { download: 'qr-send-l1.png', href: 'data:image/png;base64,AAAA' },
        { download: 'qr-return-l1.png', href: 'data:image/png;base64,AAAA' }
      ]);
    });

    it('saves nothing without a loan', () => {
      component.downloadQrCode();

      expect(downloads).toEqual([]);
    });
  });

  it('prints nothing when the browser blocks the print window', () => {
    spyOn(window, 'open').and.returnValue(null);
    fixture.componentRef.setInput('qrDataUrl', 'data:image/png;base64,AAAA');
    fixture.componentRef.setInput('loan', loan());

    expect(() => component.printQrCode()).not.toThrow();
  });
});

describe('LoanScanDialog', () => {
  let fixture: ComponentFixture<LoanScanDialog>;
  let component: LoanScanDialog;
  let loans: jasmine.SpyObj<LoanService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let closed: jasmine.Spy;
  let scanned: jasmine.Spy;

  beforeEach(async () => {
    loans = jasmine.createSpyObj<LoanService>('LoanService', ['scanQr']);
    loans.scanQr.and.returnValue(of({ id: 'l1' } as LoanWithQr));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [LoanScanDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: LoanService, useValue: loans },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanScanDialog);
    component = fixture.componentInstance;
    closed = jasmine.createSpy('closed');
    scanned = jasmine.createSpy('scanned');
    component.closed.subscribe(closed);
    component.scanned.subscribe(scanned);
    fixture.detectChanges();
  });

  it('sends the scanned data, tells the user, clears the box and reports the scan', () => {
    component.scannedQrData = 'QR-DATA';

    component.processScannedQr();

    expect(loans.scanQr).toHaveBeenCalledOnceWith('QR-DATA');
    expect(notifications.success).toHaveBeenCalledOnceWith('LOANS.QR.SCAN_SUCCESS');
    expect(component.scannedQrData).toBe('');
    expect(scanned).toHaveBeenCalledOnceWith({ success: true });
  });

  it('does nothing while the box is empty', () => {
    component.processScannedQr();

    expect(loans.scanQr).not.toHaveBeenCalled();
  });

  it('keeps quiet when the service answers with nothing', () => {
    loans.scanQr.and.returnValue(of(null));
    component.scannedQrData = 'QR-DATA';

    component.processScannedQr();

    expect(notifications.success).not.toHaveBeenCalled();
    expect(scanned).not.toHaveBeenCalled();
    expect(component.scannedQrData).toBe('QR-DATA');
  });

  it('tells the user when the scan fails and keeps what they pasted', () => {
    loans.scanQr.and.returnValue(throwError(() => new Error('bad code')));
    component.scannedQrData = 'QR-DATA';

    component.processScannedQr();

    expect(notifications.error).toHaveBeenCalledOnceWith('LOANS.QR.SCAN_ERROR');
    expect(scanned).not.toHaveBeenCalled();
    expect(component.scannedQrData).toBe('QR-DATA');
  });

  it('clears the box and asks its parent to close', () => {
    component.scannedQrData = 'QR-DATA';

    component.close();

    expect(component.scannedQrData).toBe('');
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('closes from the cancel button', () => {
    const cancel = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('COMMON.CANCEL')
    ) as HTMLButtonElement;

    cancel.click();

    expect(closed).toHaveBeenCalledTimes(1);
  });
});
