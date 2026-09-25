import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { UserService } from './user.service';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const url = (path = ''): string => `${environment.apiUrl}/users${path}`;

describe('UserService', () => {
  let service: UserService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(UserService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the warehouses of a user', () => {
    let result: unknown;

    service.getUserWarehouses('u1').subscribe((warehouses) => (result = warehouses));
    backend.expectOne({ method: 'GET', url: url('/u1/warehouses') }).flush([{ id: 'w1' }]);

    expect(result).toEqual([{ id: 'w1' }]);
  });

  it('sets the password of another user with the new password only', () => {
    let result: unknown;

    service.setPassword('u1', 'S3cret!pass').subscribe((answer) => (result = answer));
    const request = backend.expectOne({ method: 'PATCH', url: url('/u1/password') });
    expect(request.request.body).toEqual({ newPassword: 'S3cret!pass' });
    request.flush({ message: 'ok' });

    expect(result).toEqual({ message: 'ok' });
  });

  it('assigns warehouses by sending the ids', () => {
    service.assignWarehouses('u1', ['w1', 'w2']).subscribe();

    const request = backend.expectOne({ method: 'POST', url: url('/u1/warehouses') });
    expect(request.request.body).toEqual({ warehouseIds: ['w1', 'w2'] });
    request.flush([]);
  });

  it('exposes the users it loaded through the base service as `users`', () => {
    service.getAll().subscribe();
    backend.expectOne((r) => r.url === url()).flush({ data: [{ id: 'u1' }, { id: 'u2' }] });

    expect(service.users().map((u) => u.id)).toEqual(['u1', 'u2']);
  });
});
