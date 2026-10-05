import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { CreateScheduledReportDto, ScheduledReport, ScheduledReportsService } from './scheduled-reports.service';
import { provideTestBedDefaults } from '../../testing/test-providers';
import { environment } from '../../environments/environment';

const url = (path = ''): string => `${environment.apiUrl}/scheduled-reports${path}`;

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

describe('ScheduledReportsService', () => {
  let service: ScheduledReportsService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(ScheduledReportsService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('loadAll', () => {
    it('shows loading while the request runs and keeps what comes back', () => {
      service.loadAll();

      expect(service.isLoading()).toBeTrue();
      backend.expectOne(url()).flush([report({ id: 'a' }), report({ id: 'b' })]);

      expect(service.reports().map((r) => r.id)).toEqual(['a', 'b']);
      expect(service.isLoading()).toBeFalse();
    });

    it('stops loading and keeps the last list when the request fails', () => {
      service.loadAll();
      backend.expectOne(url()).flush([report({ id: 'a' })]);

      service.loadAll();
      backend.expectOne(url()).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(service.isLoading()).toBeFalse();
      expect(service.reports().map((r) => r.id)).toEqual(['a']);
    });
  });

  describe('writes that refresh the list', () => {
    it('create posts the report and loads the list again', () => {
      const dto: CreateScheduledReportDto = { reportType: 'LOANS', frequency: 'DAILY', recipientEmails: 'a@x.com' };
      let created: ScheduledReport | undefined;

      service.create(dto).subscribe((saved) => (created = saved));
      const post = backend.expectOne(url());
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual(dto);
      post.flush(report({ id: 'new' }));
      backend.expectOne(url()).flush([report({ id: 'new' })]);

      expect(created?.id).toBe('new');
      expect(service.reports().map((r) => r.id)).toEqual(['new']);
    });

    it('update patches the report and loads the list again', () => {
      service.update('r1', { isActive: false }).subscribe();

      const patch = backend.expectOne(url('/r1'));
      expect(patch.request.method).toBe('PATCH');
      expect(patch.request.body).toEqual({ isActive: false });
      patch.flush(report({ isActive: false }));
      backend.expectOne(url()).flush([report({ isActive: false })]);

      expect(service.reports()[0].isActive).toBeFalse();
    });

    it('delete removes the report and loads the list again', () => {
      service.delete('r1').subscribe();

      const del = backend.expectOne(url('/r1'));
      expect(del.request.method).toBe('DELETE');
      del.flush(null);
      backend.expectOne(url()).flush([]);

      expect(service.reports()).toEqual([]);
    });

    it('does not load the list again when the write fails', () => {
      let failure: unknown;

      service.delete('r1').subscribe({ error: (err) => (failure = err) });
      backend.expectOne(url('/r1')).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(failure).toBeDefined();
      backend.expectNone(url());
    });
  });

  describe('sendNow', () => {
    it('posts to the send-now address and leaves the list alone', () => {
      service.sendNow('r1').subscribe();

      const post = backend.expectOne(url('/r1/send-now'));
      expect(post.request.method).toBe('POST');
      post.flush(null);
      backend.expectNone(url());
    });
  });
});
