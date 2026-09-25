import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { CsrfService } from './csrf.service';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

describe('CsrfService', () => {
  let service: CsrfService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(CsrfService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('has no token until one is fetched', () => {
    expect(service.getToken()).toBeNull();
  });

  it('fetches the token with the session cookie and keeps it in memory', () => {
    service.fetchCsrfToken().subscribe();

    const request = backend.expectOne(`${environment.apiUrl}/auth/csrf-token`);
    expect(request.request.withCredentials).toBeTrue();
    request.flush({ csrfToken: 'abc' });

    expect(service.getToken()).toBe('abc');
    expect(localStorage.getItem('csrfToken')).toBeNull();
  });

  it('keeps the previous token when fetching a new one fails', () => {
    service.csrfToken.set('old');

    service.fetchCsrfToken().subscribe({ error: () => undefined });
    backend.expectOne(`${environment.apiUrl}/auth/csrf-token`).flush(null, { status: 500, statusText: 'Error' });

    expect(service.getToken()).toBe('old');
  });
});
