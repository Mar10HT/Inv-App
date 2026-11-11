import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { of, throwError } from 'rxjs';

import { ReportsScheduledTab } from './reports-scheduled-tab';
import { ScheduledReport, ScheduledReportsService } from '../../../services/scheduled-reports.service';
import { NotificationService } from '../../../services/notification.service';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

const report = (overrides: Partial<ScheduledReport> = {}): ScheduledReport => ({
  id: 'r1',
  reportType: 'INVENTORY',
  frequency: 'WEEKLY',
  recipientEmails: 'a@x.com',
  locale: 'en',
  isActive: true,
  nextSendAt: '2026-10-01T00:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  ...overrides
});

describe('ReportsScheduledTab', () => {
  let fixture: ComponentFixture<ReportsScheduledTab>;
  let component: ReportsScheduledTab;
  let reports: jasmine.SpyObj<ScheduledReportsService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  const failure = new Error('boom');

  beforeEach(async () => {
    reports = jasmine.createSpyObj<ScheduledReportsService>(
      'ScheduledReportsService',
      ['loadAll', 'create', 'update', 'delete', 'sendNow'],
      { reports: signal([]), isLoading: signal(false) } as never
    );
    reports.create.and.returnValue(of(report()));
    reports.update.and.returnValue(of(report()));
    reports.delete.and.returnValue(of(undefined));
    reports.sendNow.and.returnValue(of(undefined));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [ReportsScheduledTab],
      providers: [
        ...provideTestBedDefaults(),
        { provide: ScheduledReportsService, useValue: reports },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsScheduledTab);
    component = fixture.componentInstance;
  });

  const renderFor = async (permissions: string[]): Promise<HTMLElement> => {
    await TestBed.inject(NgxPermissionsService).loadPermissions(permissions);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const setReports = (list: ScheduledReport[]): void =>
    (reports as unknown as { reports: WritableSignal<ScheduledReport[]> }).reports.set(list);

  describe('what it shows', () => {
    it('loads the scheduled reports when it opens', async () => {
      await renderFor(['reports:view']);

      expect(reports.loadAll).toHaveBeenCalledTimes(1);
    });

    it('says so when there are none', async () => {
      const el = await renderFor(['reports:view']);

      expect(el.textContent).toContain('SCHEDULED_REPORTS.NO_REPORTS');
    });

    it('lists each report with its type and recipients', async () => {
      setReports([report({ id: 'a', reportType: 'OUTFLOWS', recipientEmails: 'boss@x.com' })]);

      const el = await renderFor(['reports:view']);

      expect(el.textContent).toContain('SCHEDULED_REPORTS.TYPE.OUTFLOWS');
      expect(el.textContent).toContain('boss@x.com');
    });

    it('lets who can export add, pause and delete', async () => {
      setReports([report()]);

      const el = await renderFor(['reports:view', 'reports:export']);

      expect(el.textContent).toContain('SCHEDULED_REPORTS.ADD');
      expect(el.querySelector('button[title="SCHEDULED_REPORTS.ACTIVE"]')).not.toBeNull();
      expect(el.querySelector('button[title="COMMON.DELETE"]')).not.toBeNull();
    });

    it('only shows the list to who can only see reports (the API refuses the rest)', async () => {
      setReports([report()]);

      const el = await renderFor(['reports:view']);

      expect(el.textContent).not.toContain('SCHEDULED_REPORTS.ADD');
      expect(el.querySelector('button[title="SCHEDULED_REPORTS.ACTIVE"]')).toBeNull();
      expect(el.querySelector('button[title="COMMON.DELETE"]')).toBeNull();
    });
  });

  describe('actions', () => {
    it('the form opens with the defaults, and closes when toggled again', () => {
      component.scheduledForm.recipientEmails = 'left over';

      component.toggleScheduledForm();

      expect(component.showScheduledForm()).toBeTrue();
      expect(component.scheduledForm).toEqual({ reportType: 'INVENTORY', frequency: 'WEEKLY', recipientEmails: '', locale: 'es' });

      component.toggleScheduledForm();
      expect(component.showScheduledForm()).toBeFalse();
    });

    it('cancel closes the form and forgets the report being edited', () => {
      component.showScheduledForm.set(true);
      component.editingReport.set(report());

      component.cancelScheduledForm();

      expect(component.showScheduledForm()).toBeFalse();
      expect(component.editingReport()).toBeNull();
    });

    it('saving a new report creates it, closes the form and says so', () => {
      component.showScheduledForm.set(true);
      component.scheduledForm.recipientEmails = 'boss@x.com';

      component.saveScheduledReport();

      expect(reports.create).toHaveBeenCalledOnceWith({ reportType: 'INVENTORY', frequency: 'WEEKLY', recipientEmails: 'boss@x.com', locale: 'es' });
      expect(reports.update).not.toHaveBeenCalled();
      expect(component.showScheduledForm()).toBeFalse();
      expect(notifications.success).toHaveBeenCalledOnceWith('SCHEDULED_REPORTS.CREATED');
    });

    it('saving a report being edited updates it by its id', () => {
      component.editingReport.set(report({ id: 'r9' }));

      component.saveScheduledReport();

      expect(reports.update).toHaveBeenCalledOnceWith('r9', { reportType: 'INVENTORY', frequency: 'WEEKLY', recipientEmails: '', locale: 'es' });
      expect(reports.create).not.toHaveBeenCalled();
      expect(notifications.success).toHaveBeenCalledOnceWith('SCHEDULED_REPORTS.UPDATED');
    });

    it('reports an error, and keeps the form open, when saving fails', () => {
      reports.create.and.returnValue(throwError(() => failure));
      component.showScheduledForm.set(true);

      component.saveScheduledReport();

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never);
      expect(component.showScheduledForm()).toBeTrue();
      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('toggleReportActive pauses an active report and resumes a paused one', () => {
      component.toggleReportActive(report({ id: 'r1', isActive: true }));
      component.toggleReportActive(report({ id: 'r2', isActive: false }));

      expect(reports.update.calls.allArgs()).toEqual([
        ['r1', { isActive: false }],
        ['r2', { isActive: true }]
      ]);
    });

    it('deleting a report says so, or reports the failure', () => {
      component.deleteScheduledReport('r1');
      expect(reports.delete).toHaveBeenCalledOnceWith('r1');
      expect(notifications.success).toHaveBeenCalledOnceWith('SCHEDULED_REPORTS.DELETED');

      reports.delete.and.returnValue(throwError(() => failure));
      component.deleteScheduledReport('r2');
      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never);
    });

    it('sending a report now says so, or reports the failure', () => {
      component.sendReportNow('r1');
      expect(reports.sendNow).toHaveBeenCalledOnceWith('r1');
      expect(notifications.success).toHaveBeenCalledOnceWith('SCHEDULED_REPORTS.SENT_NOW');

      reports.sendNow.and.returnValue(throwError(() => failure));
      component.sendReportNow('r2');
      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never);
    });
  });
});
