import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { DischargeDetailComponent } from './discharge-detail';
import { DischargeRequestService } from '../../../services/discharge-request.service';
import { ConfirmService } from '../../../services/confirm.service';
import { NotificationService } from '../../../services/notification.service';
import { DischargeRequest, DischargeRequestStatus } from '../../../interfaces/discharge-request.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

const request = (overrides: Partial<DischargeRequest> = {}): DischargeRequest => ({
  id: 'd1',
  requesterName: 'Ana',
  requesterPosition: 'IT',
  requesterPhone: '555-0100',
  neededByDate: new Date(2026, 9, 1),
  justification: 'The screens are broken',
  warehouseId: 'w1',
  warehouseName: 'Main',
  status: DischargeRequestStatus.PENDING,
  items: [],
  createdAt: new Date(2026, 8, 1),
  updatedAt: new Date(2026, 8, 1),
  ...overrides
});

describe('DischargeDetailComponent', () => {
  let fixture: ComponentFixture<DischargeDetailComponent>;
  let component: DischargeDetailComponent;
  let discharges: jasmine.SpyObj<DischargeRequestService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let navigate: jasmine.Spy;

  const setup = async (options: { id?: string | null; found?: Observable<DischargeRequest> } = {}): Promise<void> => {
    const id = options.id === undefined ? 'd1' : options.id;
    discharges = jasmine.createSpyObj<DischargeRequestService>('DischargeRequestService', ['findOne', 'completeRequest', 'rejectRequest']);
    discharges.findOne.and.returnValue(options.found ?? of(request()));
    discharges.completeRequest.and.returnValue(of(request({ status: DischargeRequestStatus.COMPLETED })));
    discharges.rejectRequest.and.returnValue(of(request({ status: DischargeRequestStatus.REJECTED })));
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [DischargeDetailComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: DischargeRequestService, useValue: discharges },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } }
      ]
    }).compileComponents();

    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(DischargeDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('opening the page', () => {
    it('loads the request named in the address', async () => {
      await setup();

      expect(discharges.findOne).toHaveBeenCalledOnceWith('d1');
      expect(component.request()?.id).toBe('d1');
      expect(component.loading()).toBeFalse();
    });

    it('stops loading and shows nothing when the request cannot be loaded', async () => {
      await setup({ found: throwError(() => new Error('gone')) });

      expect(component.request()).toBeNull();
      expect(component.loading()).toBeFalse();
    });

    it('does not ask for anything when the address has no id', async () => {
      await setup({ id: null });

      expect(discharges.findOne).not.toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
    });

    it('confirmReject does nothing when there is no request', async () => {
      await setup({ id: null });

      component.confirmReject();

      expect(discharges.rejectRequest).not.toHaveBeenCalled();
    });

    it('goBack returns to the list of discharges', async () => {
      await setup();

      component.goBack();

      expect(navigate).toHaveBeenCalledOnceWith(['/discharges']);
    });
  });

  describe('completeRequest', () => {
    it('does nothing when there is no request', async () => {
      await setup({ id: null });

      component.completeRequest();

      expect(confirm.ask).not.toHaveBeenCalled();
    });

    it('asks the user to confirm, and completes nothing when they decline', async () => {
      await setup();
      confirm.ask.and.returnValue(of(false));

      component.completeRequest();

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'info' }));
      expect(discharges.completeRequest).not.toHaveBeenCalled();
    });

    it('completes the request once confirmed, shows the new state and says so', async () => {
      await setup();

      component.completeRequest();

      expect(discharges.completeRequest).toHaveBeenCalledOnceWith('d1');
      expect(component.request()?.status).toBe(DischargeRequestStatus.COMPLETED);
      expect(notifications.success).toHaveBeenCalledOnceWith('DISCHARGES.COMPLETE_SUCCESS');
    });

    it('keeps the request as it was when the service answers with nothing', async () => {
      await setup();
      discharges.completeRequest.and.returnValue(of(null));

      component.completeRequest();

      expect(component.request()?.status).toBe(DischargeRequestStatus.PENDING);
      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('tells the user when completing fails', async () => {
      await setup();
      discharges.completeRequest.and.returnValue(throwError(() => new Error('boom')));

      component.completeRequest();

      expect(notifications.error).toHaveBeenCalledOnceWith('DISCHARGES.COMPLETE_ERROR');
      expect(component.request()?.status).toBe(DischargeRequestStatus.PENDING);
    });
  });

  describe('rejecting', () => {
    beforeEach(() => setup());

    it('opening the dialog starts with an empty reason, and closing it clears what was typed', () => {
      component.rejectReason = 'left over';

      component.openRejectDialog();
      expect(component.showRejectDialog).toBeTrue();
      expect(component.rejectReason).toBe('');

      component.rejectReason = 'Not needed';
      component.closeRejectDialog();
      expect(component.showRejectDialog).toBeFalse();
      expect(component.rejectReason).toBe('');
    });

    it('rejects with the reason the user typed, shows the new state and closes the dialog', () => {
      component.openRejectDialog();
      component.rejectReason = 'Not needed';

      component.confirmReject();

      expect(discharges.rejectRequest).toHaveBeenCalledOnceWith('d1', 'Not needed');
      expect(component.request()?.status).toBe(DischargeRequestStatus.REJECTED);
      expect(notifications.success).toHaveBeenCalledOnceWith('DISCHARGES.REJECT_SUCCESS');
      expect(component.showRejectDialog).toBeFalse();
    });

    it('rejects without a reason when the box was left empty', () => {
      component.confirmReject();

      expect(discharges.rejectRequest).toHaveBeenCalledOnceWith('d1', undefined);
    });

    it('leaves the dialog open and the request untouched when the service answers with nothing', () => {
      discharges.rejectRequest.and.returnValue(of(null));
      component.openRejectDialog();

      component.confirmReject();

      expect(component.showRejectDialog).toBeTrue();
      expect(component.request()?.status).toBe(DischargeRequestStatus.PENDING);
      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('tells the user when rejecting fails, and keeps the dialog open', () => {
      discharges.rejectRequest.and.returnValue(throwError(() => new Error('boom')));
      component.openRejectDialog();

      component.confirmReject();

      expect(notifications.error).toHaveBeenCalledOnceWith('DISCHARGES.REJECT_ERROR');
      expect(component.showRejectDialog).toBeTrue();
    });

  });

  describe('how a request looks', () => {
    beforeEach(() => setup());

    it('labels a status with its translation key', () => {
      expect(component.getStatusLabel(DischargeRequestStatus.PENDING)).toBe('DISCHARGES.STATUS.PENDING');
    });

    it('gives each status its own color, and a neutral one to anything else', () => {
      const classes = [
        DischargeRequestStatus.PENDING,
        DischargeRequestStatus.COMPLETED,
        DischargeRequestStatus.REJECTED,
        'SOMETHING_ELSE' as DischargeRequestStatus
      ].map((status) => component.getStatusClass(status));

      expect(new Set(classes).size).toBe(4);
      expect(classes[0]).toContain('amber');
      expect(classes[1]).toContain('success');
      expect(classes[2]).toContain('error');
      expect(classes[3]).toContain('surface-elevated');
    });

    it('formats a date with its day and year', () => {
      const formatted = component.formatDate(new Date(2026, 8, 24));

      expect(formatted).toContain('2026');
      expect(formatted).toContain('24');
    });
  });
});
