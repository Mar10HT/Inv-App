import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { DischargeListComponent } from './discharge-list';
import { DischargeRequestService } from '../../../services/discharge-request.service';
import { ConfirmService } from '../../../services/confirm.service';
import { NotificationService } from '../../../services/notification.service';
import { DischargeRequest, DischargeRequestStatus } from '../../../interfaces/discharge-request.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

const request = (id: string, overrides: Partial<DischargeRequest> = {}): DischargeRequest => ({
  id,
  requesterName: `Requester ${id}`,
  warehouseId: 'w1',
  warehouseName: 'Main',
  status: DischargeRequestStatus.PENDING,
  items: [],
  createdAt: new Date(2026, 0, 1),
  updatedAt: new Date(2026, 0, 1),
  ...overrides
});

const withItems = (...names: string[]): DischargeRequest['items'] =>
  names.map((inventoryItemName, n) => ({ id: `i${n}`, inventoryItemId: `inv${n}`, inventoryItemName, quantity: 1 }));

describe('DischargeListComponent actions', () => {
  let fixture: ComponentFixture<DischargeListComponent>;
  let component: DischargeListComponent;
  let requests: WritableSignal<DischargeRequest[]>;
  let discharges: jasmine.SpyObj<DischargeRequestService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let navigate: jasmine.Spy;

  const ids = (): string[] => component.filteredRequests().map((r) => r.id);

  beforeEach(async () => {
    requests = signal([
      request('a', { requesterName: 'Ana', warehouseName: 'Main', createdAt: new Date(2026, 0, 3), items: withItems('Laptop') }),
      request('b', { requesterName: 'Beto', warehouseName: 'Backup', status: DischargeRequestStatus.COMPLETED, createdAt: new Date(2026, 0, 2) }),
      request('c', { requesterName: 'Carla', warehouseName: 'Main', status: DischargeRequestStatus.REJECTED, createdAt: new Date(2026, 0, 1) })
    ]);
    discharges = jasmine.createSpyObj<DischargeRequestService>(
      'DischargeRequestService',
      ['loadRequests', 'completeRequest', 'rejectRequest', 'getRequestFormQr'],
      { requests, stats: signal({ total: 0, byStatus: { pending: 0, completed: 0, rejected: 0 } }), loading: signal(false) } as never
    );
    discharges.completeRequest.and.returnValue(of(request('a', { status: DischargeRequestStatus.COMPLETED })));
    discharges.rejectRequest.and.returnValue(of(request('a', { status: DischargeRequestStatus.REJECTED })));
    discharges.getRequestFormQr.and.returnValue(of({ url: 'https://app/request', qrDataUrl: 'data:image/png;base64,AAAA' }));
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [DischargeListComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: DischargeRequestService, useValue: discharges },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(DischargeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.tick();
  });

  it('asks the service for the requests when it opens', () => {
    expect(discharges.loadRequests).toHaveBeenCalledTimes(1);
  });

  describe('filters', () => {
    it('filters by status, and shows everything again with "all"', () => {
      component.selectedStatus = DischargeRequestStatus.COMPLETED;
      component.applyFilters();
      expect(ids()).toEqual(['b']);

      component.selectedStatus = 'all';
      component.applyFilters();
      expect(ids()).toEqual(['a', 'b', 'c']);
    });

    it('searches the requester, the warehouse and the names of the items, ignoring case', () => {
      component.searchQuery = 'ANA';
      component.applyFilters();
      expect(ids()).toEqual(['a']);

      component.searchQuery = 'backup';
      component.applyFilters();
      expect(ids()).toEqual(['b']);

      component.searchQuery = 'lapt';
      component.applyFilters();
      expect(ids()).toEqual(['a']);
    });

    it('combines the search with the status', () => {
      component.searchQuery = 'main';
      component.selectedStatus = DischargeRequestStatus.REJECTED;
      component.applyFilters();

      expect(ids()).toEqual(['c']);
    });

    it('knows whether a filter is active, and clearFilters removes them all', () => {
      expect(component.hasFilters()).toBeFalse();

      component.searchQuery = 'ana';
      expect(component.hasFilters()).toBeTrue();
      component.searchQuery = '';
      component.selectedStatus = DischargeRequestStatus.PENDING;
      expect(component.hasFilters()).toBeTrue();

      component.clearFilters();

      expect(component.hasFilters()).toBeFalse();
      expect(ids()).toEqual(['a', 'b', 'c']);
    });
  });

  it('viewDetail opens the page of the request', () => {
    component.viewDetail(request('a'));

    expect(navigate).toHaveBeenCalledOnceWith(['/discharges', 'a']);
  });

  describe('completeRequest', () => {
    it('asks the user to confirm and completes nothing when they decline', () => {
      confirm.ask.and.returnValue(of(false));

      component.completeRequest(request('a'));

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'info' }));
      expect(discharges.completeRequest).not.toHaveBeenCalled();
    });

    it('completes the request once confirmed and says so', () => {
      component.completeRequest(request('a'));

      expect(discharges.completeRequest).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('DISCHARGES.COMPLETE_SUCCESS');
    });

    it('says nothing when the service answers with nothing', () => {
      discharges.completeRequest.and.returnValue(of(null));

      component.completeRequest(request('a'));

      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('tells the user when completing fails', () => {
      discharges.completeRequest.and.returnValue(throwError(() => new Error('boom')));

      component.completeRequest(request('a'));

      expect(notifications.error).toHaveBeenCalledOnceWith('DISCHARGES.COMPLETE_ERROR');
    });
  });

  describe('rejecting', () => {
    it('opening the dialog remembers the request and starts with an empty reason', () => {
      component.rejectReason = 'left over';

      component.rejectRequest(request('a'));

      expect(component.showRejectDialog).toBeTrue();
      expect(component.requestToReject?.id).toBe('a');
      expect(component.rejectReason).toBe('');
    });

    it('closing the dialog forgets the request and the reason', () => {
      component.rejectRequest(request('a'));
      component.rejectReason = 'Not needed';

      component.closeRejectDialog();

      expect([component.showRejectDialog, component.requestToReject, component.rejectReason]).toEqual([false, null, '']);
    });

    it('rejects with the reason the user typed and closes the dialog', () => {
      component.rejectRequest(request('a'));
      component.rejectReason = 'Not needed';

      component.confirmReject();

      expect(discharges.rejectRequest).toHaveBeenCalledOnceWith('a', 'Not needed');
      expect(notifications.success).toHaveBeenCalledOnceWith('DISCHARGES.REJECT_SUCCESS');
      expect(component.showRejectDialog).toBeFalse();
    });

    it('rejects without a reason when the box was left empty', () => {
      component.rejectRequest(request('a'));

      component.confirmReject();

      expect(discharges.rejectRequest).toHaveBeenCalledOnceWith('a', undefined);
    });

    it('does nothing when no request was chosen', () => {
      component.confirmReject();

      expect(discharges.rejectRequest).not.toHaveBeenCalled();
    });

    it('keeps the dialog open when the service answers with nothing, and tells the user when it fails', () => {
      component.rejectRequest(request('a'));
      discharges.rejectRequest.and.returnValue(of(null));
      component.confirmReject();
      expect(component.showRejectDialog).toBeTrue();
      expect(notifications.success).not.toHaveBeenCalled();

      discharges.rejectRequest.and.returnValue(throwError(() => new Error('boom')));
      component.confirmReject();
      expect(notifications.error).toHaveBeenCalledOnceWith('DISCHARGES.REJECT_ERROR');
      expect(component.showRejectDialog).toBeTrue();
    });
  });

  describe('how a request looks', () => {
    it('previews the first two items and marks that there are more', () => {
      expect(component.getItemsPreview(request('x', { items: withItems('Laptop') }))).toBe('Laptop');
      expect(component.getItemsPreview(request('x', { items: withItems('Laptop', 'Mouse') }))).toBe('Laptop, Mouse');
      expect(component.getItemsPreview(request('x', { items: withItems('Laptop', 'Mouse', 'Cable') }))).toBe('Laptop, Mouse...');
      expect(component.getItemsPreview(request('x'))).toBe('');
    });

    it('labels a status with its translation key', () => {
      expect(component.getStatusLabel(DischargeRequestStatus.COMPLETED)).toBe('DISCHARGES.STATUS.COMPLETED');
    });

    it('gives each status its own color, and a neutral one to anything else', () => {
      const classes = [
        DischargeRequestStatus.PENDING,
        DischargeRequestStatus.COMPLETED,
        DischargeRequestStatus.REJECTED,
        'SOMETHING_ELSE' as DischargeRequestStatus
      ].map((status) => component.getStatusClass(status));

      expect(new Set(classes).size).toBe(4);
      expect(classes[3]).toContain('surface-elevated');
    });
  });

  describe('sharing the request form', () => {
    it('opens the dialog loading, then shows the link and the QR the service gave', () => {
      const answer = new Subject<{ url: string; qrDataUrl: string }>();
      discharges.getRequestFormQr.and.returnValue(answer);

      component.openShareDialog();
      expect(component.showShareDialog).toBeTrue();
      expect(component.shareLoading()).toBeTrue();

      answer.next({ url: 'https://app/request', qrDataUrl: 'data:image/png;base64,AAAA' });

      expect(component.shareUrl()).toBe('https://app/request');
      expect(component.shareQrDataUrl()).toBe('data:image/png;base64,AAAA');
      expect(component.shareLoading()).toBeFalse();
    });

    it('closes the dialog and tells the user when the link cannot be loaded', () => {
      discharges.getRequestFormQr.and.returnValue(throwError(() => new Error('boom')));

      component.openShareDialog();

      expect(notifications.error).toHaveBeenCalledTimes(1);
      expect(component.showShareDialog).toBeFalse();
      expect(component.shareLoading()).toBeFalse();
    });

    it('closeShareDialog forgets the link and the QR', () => {
      component.openShareDialog();

      component.closeShareDialog();

      expect([component.showShareDialog, component.shareUrl(), component.shareQrDataUrl()]).toEqual([false, '', '']);
    });

    it('copies the link and shows "copied" for two seconds', async () => {
      jasmine.clock().install();
      try {
        const writeText = jasmine.createSpy('writeText').and.resolveTo();
        spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText } as unknown as Clipboard);
        component.shareUrl.set('https://app/request');

        component.copyShareUrl();
        await writeText.calls.mostRecent().returnValue;

        expect(writeText).toHaveBeenCalledOnceWith('https://app/request');
        expect(component.shareCopied()).toBeTrue();
        jasmine.clock().tick(2000);
        expect(component.shareCopied()).toBeFalse();
      } finally {
        jasmine.clock().uninstall();
      }
    });

    describe('downloadQr', () => {
      it('saves the QR as an image', () => {
        const downloads: { download: string; href: string }[] = [];
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
          downloads.push({ download: this.download, href: this.href });
        });
        component.shareQrDataUrl.set('data:image/png;base64,AAAA');

        component.downloadQr();

        expect(downloads).toEqual([{ download: 'request-form-qr.png', href: 'data:image/png;base64,AAAA' }]);
        expect(document.body.querySelector('a[download]')).toBeNull();
      });

      it('saves nothing before the QR has loaded', () => {
        const click = spyOn(HTMLAnchorElement.prototype, 'click');

        component.downloadQr();

        expect(click).not.toHaveBeenCalled();
      });
    });
  });
});
