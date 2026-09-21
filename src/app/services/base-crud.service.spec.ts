import { Injectable, signal } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BaseCrudService } from './base-crud.service';
import { provideTestBedDefaults } from '../../testing/test-providers';

interface Thing {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
class ThingService extends BaseCrudService<Thing, { name: string }> {
  protected readonly apiUrl = '/api/things';
  protected readonly items = signal<Thing[]>([]);
  readonly list = this.items.asReadonly();
}

describe('BaseCrudService', () => {
  let service: ThingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(ThingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getAll', () => {
    it('requests the default page size, stores the items and clears loading', () => {
      let result: Thing[] | undefined;
      service.getAll().subscribe((items) => (result = items));
      expect(service.loading()).toBeTrue();

      const req = http.expectOne((r) => r.url === '/api/things');
      expect(req.request.params.get('limit')).toBe('1000');
      req.flush({ data: [{ id: '1', name: 'A' }] });

      expect(result).toEqual([{ id: '1', name: 'A' }]);
      expect(service.list()).toEqual([{ id: '1', name: 'A' }]);
      expect(service.loading()).toBeFalse();
      expect(service.error()).toBeNull();
    });

    it('keeps a limit supplied by the caller', () => {
      service.getAll(new HttpParams().set('limit', '5').set('q', 'x')).subscribe();

      const req = http.expectOne((r) => r.url === '/api/things');
      expect(req.request.params.get('limit')).toBe('5');
      expect(req.request.params.get('q')).toBe('x');
      req.flush({ data: [] });
    });
  });

  it('getById fetches a single record without touching the list', () => {
    let result: Thing | undefined;
    service.getById('7').subscribe((t) => (result = t));

    http.expectOne('/api/things/7').flush({ id: '7', name: 'Seven' });

    expect(result).toEqual({ id: '7', name: 'Seven' });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBeFalse();
  });

  it('create posts the dto and appends the new record', () => {
    service.create({ name: 'New' }).subscribe();

    const req = http.expectOne('/api/things');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'New' });
    req.flush({ id: '9', name: 'New' });

    expect(service.list()).toEqual([{ id: '9', name: 'New' }]);
  });

  it('update patches the record and replaces only the matching item', () => {
    service.create({ name: 'A' }).subscribe();
    http.expectOne('/api/things').flush({ id: '1', name: 'A' });
    service.create({ name: 'B' }).subscribe();
    http.expectOne('/api/things').flush({ id: '2', name: 'B' });

    service.update('1', { name: 'A2' }).subscribe();
    const req = http.expectOne('/api/things/1');
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: '1', name: 'A2' });

    expect(service.list()).toEqual([
      { id: '1', name: 'A2' },
      { id: '2', name: 'B' }
    ]);
  });

  it('delete removes the record from the list', () => {
    service.create({ name: 'A' }).subscribe();
    http.expectOne('/api/things').flush({ id: '1', name: 'A' });

    service.delete('1').subscribe();
    const req = http.expectOne('/api/things/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(service.list()).toEqual([]);
  });

  describe('error handling', () => {
    it('stores the message, stops loading and rethrows to the caller', () => {
      let caught: unknown;
      service.getAll().subscribe({ error: (e) => (caught = e) });

      http.expectOne((r) => r.url === '/api/things').flush('boom', { status: 500, statusText: 'Server Error' });

      expect(caught).toBeDefined();
      expect(service.error()).toContain('500');
      expect(service.loading()).toBeFalse();
      expect(service.list()).toEqual([]);
    });

    it('resets a previous error when a new request starts', () => {
      service.getById('1').subscribe({ error: () => undefined });
      http.expectOne('/api/things/1').flush('x', { status: 404, statusText: 'Not Found' });
      expect(service.error()).not.toBeNull();

      service.getById('2').subscribe();
      expect(service.error()).toBeNull();
      http.expectOne('/api/things/2').flush({ id: '2', name: 'Two' });
    });

    it('keeps the list intact when a mutation fails', () => {
      service.create({ name: 'A' }).subscribe();
      http.expectOne('/api/things').flush({ id: '1', name: 'A' });

      service.delete('1').subscribe({ error: () => undefined });
      http.expectOne('/api/things/1').flush('nope', { status: 403, statusText: 'Forbidden' });

      expect(service.list()).toEqual([{ id: '1', name: 'A' }]);
      expect(service.loading()).toBeFalse();
    });
  });
});
