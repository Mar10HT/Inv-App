import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { RolesService } from './roles.service';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const url = (path = ''): string => `${environment.apiUrl}/roles${path}`;

describe('RolesService', () => {
  let service: RolesService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(RolesService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  const call = <T>(request$: { subscribe: (next: (value: T) => void) => unknown }): { answer: () => T | undefined } => {
    let result: T | undefined;
    request$.subscribe((value) => (result = value));
    return { answer: () => result };
  };

  it('lists the roles', () => {
    const roles = call(service.getAll());

    backend.expectOne({ method: 'GET', url: url() }).flush([{ id: 'r1' }]);

    expect(roles.answer()).toEqual([{ id: 'r1' }] as never);
  });

  it('loads one role by id', () => {
    call(service.getOne('r1'));

    backend.expectOne({ method: 'GET', url: url('/r1') }).flush({ id: 'r1' });
  });

  it('creates a role with the given data', () => {
    const dto = { name: 'auditor', displayName: 'Auditor', permissions: ['audit:view'] };
    call(service.create(dto as never));

    const request = backend.expectOne({ method: 'POST', url: url() });
    expect(request.request.body).toEqual(dto);
    request.flush({ id: 'new' });
  });

  it('updates a role with a patch', () => {
    call(service.update('r1', { displayName: 'Renamed' } as never));

    const request = backend.expectOne({ method: 'PATCH', url: url('/r1') });
    expect(request.request.body).toEqual({ displayName: 'Renamed' });
    request.flush({ id: 'r1' });
  });

  it('removes a role', () => {
    const removed = call(service.remove('r1'));

    backend.expectOne({ method: 'DELETE', url: url('/r1') }).flush({ message: 'deleted' });

    expect(removed.answer()).toEqual({ message: 'deleted' });
  });

  it('lists the permissions that can be granted', () => {
    call(service.getPermissions());

    backend.expectOne({ method: 'GET', url: url('/permissions') }).flush([]);
  });
});
