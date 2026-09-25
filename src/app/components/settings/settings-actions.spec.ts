import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpTestingController } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { Settings } from './settings';
import { ScheduledReport, ScheduledReportsService } from '../../services/scheduled-reports.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { ThemeService } from '../../services/theme.service';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { environment } from '../../../environments/environment';

const api = (path: string): string => `${environment.apiUrl}${path}`;

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

describe('Settings actions', () => {
  let fixture: ComponentFixture<Settings>;
  let component: Settings;
  let backend: HttpTestingController;
  let reports: jasmine.SpyObj<ScheduledReportsService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const failure = new Error('boom');

  beforeEach(async () => {
    localStorage.removeItem('language');
    reports = jasmine.createSpyObj<ScheduledReportsService>(
      'ScheduledReportsService',
      ['loadAll', 'create', 'update', 'delete', 'sendNow'],
      { reports: signal([]), isLoading: signal(false) } as never
    );
    reports.create.and.returnValue(of(report()));
    reports.update.and.returnValue(of(report()));
    reports.delete.and.returnValue(of(undefined));
    reports.sendNow.and.returnValue(of(undefined));
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        ...provideTestBedDefaults(),
        { provide: ScheduledReportsService, useValue: reports },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    backend.verify();
    localStorage.removeItem('language');
  });

  /** Answers the preferences request made when the page opens. */
  const loadPreferences = (prefs = { emailNotifications: true, lowStockAlerts: true }): void => {
    backend.expectOne(api('/users/preferences')).flush(prefs);
  };

  describe('opening the page', () => {
    it('loads the scheduled reports and the notification preferences of the user', () => {
      loadPreferences({ emailNotifications: false, lowStockAlerts: true });

      expect(reports.loadAll).toHaveBeenCalledTimes(1);
      expect(component.emailNotifications()).toBeFalse();
      expect(component.lowStockAlerts()).toBeTrue();
    });

    it('keeps both notifications on when the preferences cannot be loaded', () => {
      backend.expectOne(api('/users/preferences')).flush(null, { status: 500, statusText: 'Server Error' });

      expect(component.emailNotifications()).toBeTrue();
      expect(component.lowStockAlerts()).toBeTrue();
    });

    it('starts in English, or in the language the user saved', () => {
      loadPreferences();
      expect(component.currentLang()).toBe('en');

      localStorage.setItem('language', 'es');
      const reopened = TestBed.createComponent(Settings);
      reopened.detectChanges();
      backend.expectOne(api('/users/preferences')).flush({ emailNotifications: true, lowStockAlerts: true });

      expect(reopened.componentInstance.currentLang()).toBe('es');
    });
  });

  it('starts in the language the app picked when the user never saved one', () => {
    loadPreferences();
    TestBed.inject(TranslateService).use('es');

    const reopened = TestBed.createComponent(Settings);
    reopened.detectChanges();
    backend.expectOne(api('/users/preferences')).flush({ emailNotifications: true, lowStockAlerts: true });

    expect(reopened.componentInstance.currentLang()).toBe('es');
  });

  it('changeLang switches the app language and remembers it', () => {
    loadPreferences();
    const use = spyOn(TestBed.inject(TranslateService), 'use');

    component.changeLang('es');

    expect(use).toHaveBeenCalledOnceWith('es');
    expect(component.currentLang()).toBe('es');
    expect(localStorage.getItem('language')).toBe('es');
  });

  it('toggleDarkMode goes through the theme service', () => {
    loadPreferences();
    const toggle = spyOn(TestBed.inject(ThemeService), 'toggle');

    component.toggleDarkMode();

    expect(toggle).toHaveBeenCalledTimes(1);
  });

  describe('notification preferences', () => {
    beforeEach(() => loadPreferences());

    it('toggling email notifications shows the change at once and saves it', () => {
      component.toggleEmailNotifications();

      expect(component.emailNotifications()).toBeFalse();
      const request = backend.expectOne(api('/users/preferences'));
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ emailNotifications: false });
      request.flush({ emailNotifications: false, lowStockAlerts: true });
      expect(notifications.error).not.toHaveBeenCalled();
    });

    it('puts the email switch back and tells the user when saving fails', () => {
      component.toggleEmailNotifications();
      backend.expectOne(api('/users/preferences')).flush(null, { status: 500, statusText: 'Server Error' });

      expect(component.emailNotifications()).toBeTrue();
      expect(notifications.error).toHaveBeenCalledOnceWith('SETTINGS.SAVE_ERROR');
    });

    it('toggling low stock alerts shows the change at once and saves it', () => {
      component.toggleLowStockAlerts();

      expect(component.lowStockAlerts()).toBeFalse();
      const request = backend.expectOne(api('/users/preferences'));
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ lowStockAlerts: false });
      request.flush({ emailNotifications: true, lowStockAlerts: false });
    });

    it('puts the low stock switch back and tells the user when saving fails', () => {
      component.toggleLowStockAlerts();
      backend.expectOne(api('/users/preferences')).flush(null, { status: 500, statusText: 'Server Error' });

      expect(component.lowStockAlerts()).toBeTrue();
      expect(notifications.error).toHaveBeenCalledOnceWith('SETTINGS.SAVE_ERROR');
    });
  });

  describe('exportData', () => {
    let downloads: { download: string; href: string }[];

    beforeEach(() => {
      loadPreferences();
      downloads = [];
      spyOn(URL, 'createObjectURL').and.returnValue('blob:export');
      spyOn(URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        downloads.push({ download: this.download, href: this.href });
      });
    });

    it('downloads the inventory workbook, leaves no link behind and says so', () => {
      component.exportData();
      expect(component.exporting()).toBeTrue();

      const request = backend.expectOne(api('/reports/inventory/excel'));
      expect(request.request.responseType).toBe('blob');
      expect(request.request.withCredentials).toBeTrue();
      request.flush(new Blob(['xlsx']));

      expect(downloads).toHaveSize(1);
      expect(downloads[0].download).toMatch(/^inventory-export-\d{4}-\d{2}-\d{2}\.xlsx$/);
      expect(downloads[0].href).toBe('blob:export');
      expect(document.body.querySelector('a[download]')).toBeNull();
      expect(URL.revokeObjectURL).toHaveBeenCalledOnceWith('blob:export');
      expect(notifications.success).toHaveBeenCalledOnceWith('SETTINGS.EXPORT_SUCCESS');
      expect(component.exporting()).toBeFalse();
    });

    it('stops exporting and reports the error when the download fails', () => {
      component.exportData();
      backend.expectOne(api('/reports/inventory/excel')).flush(new Blob(['boom']), { status: 500, statusText: 'Server Error' });

      expect(downloads).toEqual([]);
      expect(notifications.handleError).toHaveBeenCalledTimes(1);
      expect(component.exporting()).toBeFalse();
    });
  });

  describe('scheduled reports', () => {
    beforeEach(() => loadPreferences());

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

    it('reports an error when updating fails', () => {
      reports.update.and.returnValue(throwError(() => failure));
      component.editingReport.set(report());

      component.saveScheduledReport();

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never);
    });

    it('toggleReportActive pauses an active report and resumes a paused one', () => {
      component.toggleReportActive(report({ id: 'r1', isActive: true }));
      component.toggleReportActive(report({ id: 'r2', isActive: false }));

      expect(reports.update.calls.allArgs()).toEqual([
        ['r1', { isActive: false }],
        ['r2', { isActive: true }]
      ]);
    });

    it('toggleReportActive reports a failure', () => {
      reports.update.and.returnValue(throwError(() => failure));

      component.toggleReportActive(report());

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never);
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

  describe('resetData', () => {
    beforeEach(() => loadPreferences());

    it('asks for a dangerous confirmation and deletes nothing when the user declines', () => {
      confirm.ask.and.returnValue(of(false));

      component.resetData();

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'danger' }));
      backend.expectNone(api('/inventory/reset-all'));
      expect(component.resetting()).toBeFalse();
    });

    it('deletes the inventory once confirmed and says how many items went', () => {
      component.resetData();
      expect(component.resetting()).toBeTrue();

      const request = backend.expectOne(api('/inventory/reset-all'));
      expect(request.request.method).toBe('DELETE');
      expect(request.request.withCredentials).toBeTrue();
      request.flush({ deletedCount: 12 });

      expect(notifications.success).toHaveBeenCalledOnceWith('SETTINGS.RESET_SUCCESS', { interpolateParams: { count: '12' } });
      expect(component.resetting()).toBeFalse();
    });

    it('reports the error and stops resetting when the reset fails', () => {
      component.resetData();
      backend.expectOne(api('/inventory/reset-all')).flush(null, { status: 500, statusText: 'Server Error' });

      expect(notifications.handleError).toHaveBeenCalledTimes(1);
      expect(notifications.success).not.toHaveBeenCalled();
      expect(component.resetting()).toBeFalse();
    });
  });
});
