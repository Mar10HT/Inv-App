import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { TransfersComponent } from './transfers';
import { TransferRequestService } from '../../services/transfer-request.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { TransferRequest, TransferRequestStatus } from '../../interfaces/transfer-request.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { warehouse } from '../../../testing/report-fixtures';

const request = (id: string, overrides: Partial<TransferRequest> = {}): TransferRequest =>
  ({
    id,
    status: TransferRequestStatus.PENDING,
    sourceWarehouseName: 'Main',
    destinationWarehouseName: 'Backup',
    requestedByName: 'Ana',
    items: [{ inventoryItemName: 'Laptop', quantity: 2 }],
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides
  }) as unknown as TransferRequest;

describe('TransfersComponent', () => {
  let fixture: ComponentFixture<TransfersComponent>;
  let component: TransfersComponent;
  let allRequests: ReturnType<typeof signal<TransferRequest[]>>;
  let service: jasmine.SpyObj<TransferRequestService>;
  let warehouses: jasmine.SpyObj<WarehouseService>;
  let inventory: jasmine.SpyObj<InventoryService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const failure = new Error('boom');
  const ids = (): string[] => component.filteredRequests().map((r) => r.id);

  beforeEach(async () => {
    allRequests = signal([
      request('a', { requestedByName: 'Ana', status: TransferRequestStatus.SENT, createdAt: new Date(2026, 0, 3), items: [{ inventoryItemName: 'Monitor', quantity: 1 }] as TransferRequest['items'] }),
      request('b', { requestedByName: 'Beto', sourceWarehouseName: 'North', destinationWarehouseName: 'South', createdAt: new Date(2026, 0, 2) }),
      request('c', { requestedByName: 'Carla', status: TransferRequestStatus.COMPLETED, createdAt: new Date(2026, 0, 1) })
    ]);
    service = jasmine.createSpyObj<TransferRequestService>(
      'TransferRequestService',
      ['approveRequest', 'rejectRequest', 'sendTransfer', 'cancelRequest', 'manualConfirmReceipt', 'downloadPdf', 'getQrCode', 'exportToXLSX'],
      {
        requests: allRequests,
        stats: signal({ total: 3, byStatus: { pending: 1, approved: 0, sent: 1, completed: 1, rejected: 0, cancelled: 0 } }),
        loading: signal(false),
        error: signal(null)
      } as never
    );
    service.approveRequest.and.returnValue(of(request('a')));
    service.rejectRequest.and.returnValue(of(request('a')));
    service.sendTransfer.and.returnValue(of({ ...request('a'), qrCodeDataUrl: 'data:image/png;base64,SEND' } as never));
    service.cancelRequest.and.returnValue(of(request('a')));
    service.manualConfirmReceipt.and.returnValue(of(request('a')));
    service.getQrCode.and.returnValue(of('data:image/png;base64,SHOWN'));
    service.exportToXLSX.and.resolveTo();
    warehouses = jasmine.createSpyObj<WarehouseService>('WarehouseService', ['getAll'], {
      warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')])
    } as never);
    warehouses.getAll.and.returnValue(of([]));
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['loadItems']);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError', 'guardExport']);
    notifications.guardExport.and.callFake(async (task: () => Promise<unknown>) => {
      await task();
    });

    await TestBed.configureTestingModule({
      imports: [TransfersComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: TransferRequestService, useValue: service },
        { provide: WarehouseService, useValue: warehouses },
        { provide: InventoryService, useValue: inventory },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransfersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.tick();
  });

  describe('opening the page', () => {
    it('asks for the warehouses and the items, and shows the requests newest first', () => {
      expect(warehouses.getAll).toHaveBeenCalledTimes(1);
      expect(inventory.loadItems).toHaveBeenCalledTimes(1);
      expect(ids()).toEqual(['a', 'b', 'c']);
    });

    it('tells the user when the warehouses fail to load', () => {
      warehouses.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(TransfersComponent).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });

    it('follows the requests of the service as they change', () => {
      allRequests.update((list) => [...list, request('d', { createdAt: new Date(2026, 0, 9) })]);
      TestBed.tick();

      expect(ids()).toEqual(['d', 'a', 'b', 'c']);
    });
  });

  describe('filters', () => {
    it('searches the warehouses, who asked and the item names, ignoring case', () => {
      component.searchQuery = 'SOUTH';
      component.applyFilters();
      expect(ids()).toEqual(['b']);

      component.searchQuery = 'carla';
      component.applyFilters();
      expect(ids()).toEqual(['c']);

      component.searchQuery = 'monitor';
      component.applyFilters();
      expect(ids()).toEqual(['a']);
    });

    it('filters by status and combines it with the search', () => {
      component.selectedStatus = TransferRequestStatus.COMPLETED;
      component.applyFilters();
      expect(ids()).toEqual(['c']);

      component.searchQuery = 'ana';
      component.applyFilters();
      expect(ids()).toEqual([]);
    });

    it('onFilterChange goes back to the first page, and clearFilters removes every filter', () => {
      component.onPageChange({ pageIndex: 3, pageSize: 10 });
      component.selectedStatus = TransferRequestStatus.SENT;
      component.onFilterChange();
      expect(component.pageIndex()).toBe(0);
      expect(ids()).toEqual(['a']);
      expect(component.hasFilters()).toBeTrue();

      component.clearFilters();

      expect(component.hasFilters()).toBeFalse();
      expect(ids()).toEqual(['a', 'b', 'c']);
    });

    it('pages the list with the size the paginator asks for', () => {
      component.onPageChange({ pageIndex: 1, pageSize: 2 });

      expect(component.paginatedRequests().map((r) => r.id)).toEqual(['c']);
    });
  });

  describe('the dialogs', () => {
    it('opens and closes the new request dialog, and closes it after a created request only', () => {
      component.openNewRequestDialog();
      component.onRequestCreated({ success: false } as never);
      expect(component.showNewRequestDialog).toBeTrue();

      component.onRequestCreated({ success: true } as never);
      expect(component.showNewRequestDialog).toBeFalse();

      component.openNewRequestDialog();
      component.closeNewRequestDialog();
      expect(component.showNewRequestDialog).toBeFalse();
    });

    it('opens and closes the scan dialog, and closes it after a successful scan only', () => {
      component.openScanDialog();
      component.onQrScanned({ success: false });
      expect(component.showScanDialog).toBeTrue();

      component.onQrScanned({ success: true });
      expect(component.showScanDialog).toBeFalse();

      component.openScanDialog();
      component.closeScanDialog();
      expect(component.showScanDialog).toBeFalse();
    });
  });

  describe('approveRequest', () => {
    it('asks the user to confirm and approves nothing when they decline', () => {
      confirm.ask.and.returnValue(of(false));

      component.approveRequest(request('a'));

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'info' }));
      expect(service.approveRequest).not.toHaveBeenCalled();
    });

    it('approves once confirmed and says so', () => {
      component.approveRequest(request('a'));

      expect(service.approveRequest).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('TRANSFERS.APPROVE_SUCCESS');
    });

    it('says nothing for an empty answer, and tells the user when approving fails', () => {
      service.approveRequest.and.returnValue(of(null));
      component.approveRequest(request('a'));
      expect(notifications.success).not.toHaveBeenCalled();

      service.approveRequest.and.returnValue(throwError(() => failure));
      component.approveRequest(request('a'));
      expect(notifications.error).toHaveBeenCalledOnceWith('TRANSFERS.APPROVE_ERROR');
    });
  });

  describe('rejecting', () => {
    it('opening the dialog remembers the request, and closing it forgets it', () => {
      component.rejectRequest(request('a'));
      expect(component.showRejectDialog).toBeTrue();
      expect(component.requestToReject?.id).toBe('a');

      component.closeRejectDialog();
      expect([component.showRejectDialog, component.requestToReject]).toEqual([false, null]);
    });

    it('rejects with the reason, says so and closes the dialog', () => {
      component.rejectRequest(request('a'));

      component.onRejectConfirmed({ reason: 'Not needed' });

      expect(service.rejectRequest).toHaveBeenCalledOnceWith('a', 'Not needed');
      expect(notifications.success).toHaveBeenCalledOnceWith('TRANSFERS.REJECT_SUCCESS');
      expect(component.showRejectDialog).toBeFalse();
    });

    it('does nothing when no request was chosen', () => {
      component.onRejectConfirmed({ reason: 'Not needed' });

      expect(service.rejectRequest).not.toHaveBeenCalled();
    });

    it('keeps the dialog open for an empty answer, and tells the user when rejecting fails', () => {
      component.rejectRequest(request('a'));
      service.rejectRequest.and.returnValue(of(null));
      component.onRejectConfirmed({});
      expect(component.showRejectDialog).toBeTrue();
      expect(notifications.success).not.toHaveBeenCalled();

      service.rejectRequest.and.returnValue(throwError(() => failure));
      component.onRejectConfirmed({});
      expect(notifications.error).toHaveBeenCalledOnceWith('TRANSFERS.REJECT_ERROR');
      expect(component.showRejectDialog).toBeTrue();
    });
  });

  describe('sendTransfer', () => {
    it('asks the user to confirm and sends nothing when they decline', () => {
      confirm.ask.and.returnValue(of(false));

      component.sendTransfer(request('a'));

      expect(service.sendTransfer).not.toHaveBeenCalled();
    });

    it('sends the transfer once confirmed and shows the QR the service returned', () => {
      component.sendTransfer(request('a'));

      expect(service.sendTransfer).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('TRANSFERS.SEND_SUCCESS');
      expect(component.showQrDialog).toBeTrue();
      expect(component.currentQrDataUrl).toBe('data:image/png;base64,SEND');
      expect(component.currentRequest?.id).toBe('a');
    });

    it('does not open the QR dialog when the answer has no QR', () => {
      service.sendTransfer.and.returnValue(of(request('a') as never));

      component.sendTransfer(request('a'));

      expect(notifications.success).toHaveBeenCalledTimes(1);
      expect(component.showQrDialog).toBeFalse();
    });

    it('says nothing for an empty answer, and tells the user when sending fails', () => {
      service.sendTransfer.and.returnValue(of(null));
      component.sendTransfer(request('a'));
      expect(notifications.success).not.toHaveBeenCalled();

      service.sendTransfer.and.returnValue(throwError(() => failure));
      component.sendTransfer(request('a'));
      expect(notifications.error).toHaveBeenCalledOnceWith('TRANSFERS.SEND_ERROR');
    });
  });

  describe('cancelRequest', () => {
    it('asks for a warning confirmation with a way back, and cancels nothing when declined', () => {
      confirm.ask.and.returnValue(of(false));

      component.cancelRequest(request('a'));

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'warning', cancelText: 'COMMON.BACK' }));
      expect(service.cancelRequest).not.toHaveBeenCalled();
    });

    it('cancels once confirmed and says so', () => {
      component.cancelRequest(request('a'));

      expect(service.cancelRequest).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('TRANSFERS.CANCEL_SUCCESS');
    });

    it('says nothing for an empty answer, and tells the user when cancelling fails', () => {
      service.cancelRequest.and.returnValue(of(null));
      component.cancelRequest(request('a'));
      expect(notifications.success).not.toHaveBeenCalled();

      service.cancelRequest.and.returnValue(throwError(() => failure));
      component.cancelRequest(request('a'));
      expect(notifications.error).toHaveBeenCalledOnceWith('TRANSFERS.CANCEL_ERROR');
    });
  });

  describe('manualConfirmReceipt', () => {
    it('asks for a warning confirmation, and confirms nothing when declined', () => {
      confirm.ask.and.returnValue(of(false));

      component.manualConfirmReceipt(request('a'));

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'warning' }));
      expect(service.manualConfirmReceipt).not.toHaveBeenCalled();
    });

    it('confirms the receipt once confirmed and says so', () => {
      component.manualConfirmReceipt(request('a'));

      expect(service.manualConfirmReceipt).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('TRANSFERS.MANUAL_CONFIRM_SUCCESS');
    });

    it('says nothing for an empty answer, and tells the user when it fails', () => {
      service.manualConfirmReceipt.and.returnValue(of(null));
      component.manualConfirmReceipt(request('a'));
      expect(notifications.success).not.toHaveBeenCalled();

      service.manualConfirmReceipt.and.returnValue(throwError(() => failure));
      component.manualConfirmReceipt(request('a'));
      expect(notifications.error).toHaveBeenCalledOnceWith('TRANSFERS.MANUAL_CONFIRM_ERROR');
    });
  });

  describe('showQrCode', () => {
    it('opens the QR dialog at once and fills it with the code the service gives', () => {
      component.showQrCode(request('a'));

      expect(service.getQrCode).toHaveBeenCalledOnceWith('a');
      expect(component.showQrDialog).toBeTrue();
      expect(component.currentQrDataUrl).toBe('data:image/png;base64,SHOWN');
      expect(component.currentRequest?.id).toBe('a');
    });

    it('tells the user and closes the dialog when the code cannot be loaded', () => {
      service.getQrCode.and.returnValue(throwError(() => failure) as Observable<string>);

      component.showQrCode(request('a'));

      expect(notifications.error).toHaveBeenCalledOnceWith('TRANSFERS.QR.ERROR');
      expect(component.showQrDialog).toBeFalse();
      expect(component.currentRequest).toBeNull();
    });

    it('closeQrDialog forgets the request and the code', () => {
      component.showQrCode(request('a'));

      component.closeQrDialog();

      expect([component.showQrDialog, component.currentQrDataUrl, component.currentRequest]).toEqual([false, null, null]);
    });
  });

  describe('helpers', () => {
    it('getItemsPreview shows the first two items and marks that there are more', () => {
      const items = (...names: string[]): TransferRequest['items'] => names.map((inventoryItemName) => ({ inventoryItemName })) as TransferRequest['items'];

      expect(component.getItemsPreview(request('x', { items: items('Laptop') }))).toBe('Laptop');
      expect(component.getItemsPreview(request('x', { items: items('Laptop', 'Mouse') }))).toBe('Laptop, Mouse');
      expect(component.getItemsPreview(request('x', { items: items('Laptop', 'Mouse', 'Cable') }))).toBe('Laptop, Mouse...');
    });

    it('getStatusLabel uses the translation key of the status', () => {
      expect(component.getStatusLabel(TransferRequestStatus.APPROVED)).toBe('TRANSFERS.STATUS.APPROVED');
    });

    it('getStatusClass gives a state its own look and a neutral one to anything else', () => {
      const classes = [
        TransferRequestStatus.PENDING,
        TransferRequestStatus.APPROVED,
        TransferRequestStatus.COMPLETED,
        TransferRequestStatus.REJECTED,
        'SOMETHING_ELSE' as TransferRequestStatus
      ].map((status) => component.getStatusClass(status));

      expect(classes[1]).toContain('info');
      expect(classes[2]).toContain('success');
      expect(classes[3]).toContain('error');
      expect(classes[4]).not.toContain('border');
    });

    it('downloadPdf asks the service for the pdf of the request', () => {
      component.downloadPdf(request('a'));

      expect(service.downloadPdf).toHaveBeenCalledOnceWith('a');
    });

    it('exportToXLSX exports the requests that pass the filters', async () => {
      component.selectedStatus = TransferRequestStatus.SENT;
      component.applyFilters();

      await component.exportToXLSX();

      expect(notifications.guardExport).toHaveBeenCalledTimes(1);
      expect(service.exportToXLSX).toHaveBeenCalledOnceWith(component.filteredRequests());
      expect(component.filteredRequests().map((r) => r.id)).toEqual(['a']);
    });
  });
});
