import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { TransferQrDialog, TransferRejectDialog, TransferScanDialog } from './transfer-qr-dialog';
import { TransferRequestService } from '../../services/transfer-request.service';
import { NotificationService } from '../../services/notification.service';
import { TransferRequest } from '../../interfaces/transfer-request.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const request = (): TransferRequest =>
  ({ id: 't1', items: [{}, {}], sourceWarehouseName: 'Main', destinationWarehouseName: 'Backup' }) as unknown as TransferRequest;

describe('TransferQrDialog actions', () => {
  let fixture: ComponentFixture<TransferQrDialog>;
  let component: TransferQrDialog;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferQrDialog],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(TransferQrDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('qrDataUrl', 'data:image/png;base64,AAAA');
  });

  it('asks its parent to close', () => {
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);

    component.close();

    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('saves the QR named after the transfer', () => {
    const downloads: { download: string; href: string }[] = [];
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      downloads.push({ download: this.download, href: this.href });
    });
    fixture.componentRef.setInput('request', request());

    component.downloadQrCode();

    expect(downloads).toEqual([{ download: 'qr-transfer-t1.png', href: 'data:image/png;base64,AAAA' }]);
  });

  it('saves nothing without a transfer', () => {
    const click = spyOn(HTMLAnchorElement.prototype, 'click');

    component.downloadQrCode();

    expect(click).not.toHaveBeenCalled();
  });

  it('prints the number of items in the heading', () => {
    const written: string[] = [];
    spyOn(window, 'open').and.returnValue({
      document: { write: (html: string) => written.push(html), close: () => undefined }
    } as unknown as Window);
    fixture.componentRef.setInput('request', request());

    component.printQrCode();

    expect(new DOMParser().parseFromString(written.join(''), 'text/html').querySelector('h2')?.textContent).toBe('Transfer: 2 Items');
  });

  it('prints nothing when the browser blocks the print window', () => {
    spyOn(window, 'open').and.returnValue(null);
    fixture.componentRef.setInput('request', request());

    expect(() => component.printQrCode()).not.toThrow();
  });
});

describe('TransferScanDialog', () => {
  let fixture: ComponentFixture<TransferScanDialog>;
  let component: TransferScanDialog;
  let transfers: jasmine.SpyObj<TransferRequestService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let closed: jasmine.Spy;
  let scanned: jasmine.Spy;

  beforeEach(async () => {
    transfers = jasmine.createSpyObj<TransferRequestService>('TransferRequestService', ['scanQr']);
    transfers.scanQr.and.returnValue(of({ id: 't1' } as unknown as TransferRequest));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [TransferScanDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: TransferRequestService, useValue: transfers },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransferScanDialog);
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

    expect(transfers.scanQr).toHaveBeenCalledOnceWith('QR-DATA');
    expect(notifications.success).toHaveBeenCalledOnceWith('TRANSFERS.QR.SCAN_SUCCESS');
    expect(component.scannedQrData).toBe('');
    expect(scanned).toHaveBeenCalledOnceWith({ success: true });
  });

  it('does nothing while the box is empty', () => {
    component.processScannedQr();

    expect(transfers.scanQr).not.toHaveBeenCalled();
  });

  it('keeps quiet when the service answers with nothing', () => {
    transfers.scanQr.and.returnValue(of(null));
    component.scannedQrData = 'QR-DATA';

    component.processScannedQr();

    expect(notifications.success).not.toHaveBeenCalled();
    expect(scanned).not.toHaveBeenCalled();
  });

  it('tells the user when the scan fails and keeps what they pasted', () => {
    transfers.scanQr.and.returnValue(throwError(() => new Error('bad code')));
    component.scannedQrData = 'QR-DATA';

    component.processScannedQr();

    expect(notifications.error).toHaveBeenCalledOnceWith('TRANSFERS.QR.SCAN_ERROR');
    expect(component.scannedQrData).toBe('QR-DATA');
  });

  it('clears the box and asks its parent to close', () => {
    component.scannedQrData = 'QR-DATA';

    component.close();

    expect(component.scannedQrData).toBe('');
    expect(closed).toHaveBeenCalledTimes(1);
  });
});

describe('TransferRejectDialog', () => {
  let component: TransferRejectDialog;
  let rejected: jasmine.Spy;
  let closed: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferRejectDialog],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    component = TestBed.createComponent(TransferRejectDialog).componentInstance;
    rejected = jasmine.createSpy('rejected');
    closed = jasmine.createSpy('closed');
    component.rejected.subscribe(rejected);
    component.closed.subscribe(closed);
  });

  it('confirms the rejection with the reason the user typed, and clears the box', () => {
    component.rejectReason = 'Wrong items';

    component.confirmReject();

    expect(rejected).toHaveBeenCalledOnceWith({ reason: 'Wrong items' });
    expect(component.rejectReason).toBe('');
  });

  it('confirms without a reason when the box was left empty', () => {
    component.confirmReject();

    expect(rejected).toHaveBeenCalledOnceWith({ reason: undefined });
  });

  it('clears the reason and asks its parent to close', () => {
    component.rejectReason = 'Wrong items';

    component.close();

    expect(component.rejectReason).toBe('');
    expect(closed).toHaveBeenCalledTimes(1);
    expect(rejected).not.toHaveBeenCalled();
  });
});
