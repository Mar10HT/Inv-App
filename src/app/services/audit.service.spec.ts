import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { AuditService } from './audit.service';
import { AuditAction, BackendAuditLog } from '../interfaces/audit.interface';
import { environment } from '../../environments/environment';
import { provideTestBedDefaults } from '../../testing/test-providers';

const backendLog = (overrides: Partial<BackendAuditLog> = {}): BackendAuditLog => ({
  id: 'a1',
  action: 'UPDATE',
  entity: 'InventoryItem',
  entityId: 'item-1',
  changes: null,
  createdAt: '2026-03-10T09:30:00Z',
  userId: 'u1',
  user: { id: 'u1', name: 'Ana', email: 'ana@x.com' },
  ...overrides
});

const auditUrl = `${environment.apiUrl}/audit`;

describe('AuditService', () => {
  let service: AuditService;
  let backend: HttpTestingController;

  const load = (logs: BackendAuditLog[], total = logs.length): void => {
    service.loadLogs();
    backend.expectOne((r) => r.url === auditUrl).flush({ data: logs, meta: { total, limit: 50, offset: 0 } });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(AuditService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('loadLogs', () => {
    it('sends only the options it was given', () => {
      service.loadLogs({ limit: 200, action: 'LOGIN' });

      const params = backend.expectOne((r) => r.url === auditUrl).request.params;
      expect(params.get('limit')).toBe('200');
      expect(params.get('action')).toBe('LOGIN');
      expect(params.has('offset')).toBeFalse();
      expect(params.has('entity')).toBeFalse();
    });

    it('keeps the mapped logs and the total the API reports', () => {
      service.loadLogs();
      expect(service.loading()).toBeTrue();
      backend.expectOne((r) => r.url === auditUrl).flush({ data: [backendLog()], meta: { total: 42, limit: 50, offset: 0 } });

      expect(service.logs()).toHaveSize(1);
      expect(service.total()).toBe(42);
      expect(service.loading()).toBeFalse();
    });

    it('keeps the logs it had and stops loading when the request fails', () => {
      load([backendLog({ id: 'kept' })]);

      service.loadLogs();
      backend.expectOne((r) => r.url === auditUrl).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.logs().map((l) => l.id)).toEqual(['kept']);
      expect(service.loading()).toBeFalse();
    });
  });

  describe('mapping a log', () => {
    it('turns the date into a Date and keeps the action and the entity the API sent', () => {
      load([backendLog()]);

      const [log] = service.logs();
      expect(log.createdAt).toEqual(new Date('2026-03-10T09:30:00Z'));
      expect(log.action).toBe(AuditAction.UPDATE);
      expect(log.entity as string).toBe('InventoryItem');
      expect(log.entityId).toBe('item-1');
    });

    describe('who did it', () => {
      it('prefers the user name, then the email, then System', () => {
        load([
          backendLog({ id: '1', user: { id: 'u1', name: 'Ana', email: 'ana@x.com' } }),
          backendLog({ id: '2', user: { id: 'u2', name: null, email: 'bob@x.com' } }),
          backendLog({ id: '3', user: null, userId: null })
        ]);

        expect(service.logs().map((l) => l.userName)).toEqual(['Ana', 'bob@x.com', 'System']);
      });

      it('takes the user id from the user, or from the log when the user is gone', () => {
        load([backendLog({ id: '1' }), backendLog({ id: '2', user: null, userId: 'deleted-user' })]);

        expect(service.logs().map((l) => l.userId)).toEqual(['u1', 'deleted-user']);
      });
    });

    describe('what it was called', () => {
      it('uses the name after the change, then the name before it, then the id', () => {
        load([
          backendLog({ id: '1', changes: { before: { name: 'Old' }, after: { name: 'New' } } }),
          backendLog({ id: '2', changes: { before: { name: 'Gone' } } }),
          backendLog({ id: '3', changes: null, entityId: 'the-id' })
        ]);

        expect(service.logs().map((l) => l.entityName)).toEqual(['New', 'Gone', 'the-id']);
      });
    });

    describe('what changed', () => {
      it('lists only the fields whose value differs between before and after', () => {
        load([
          backendLog({
            changes: {
              before: { name: 'Laptop', quantity: 3, tags: ['a'] },
              after: { name: 'Laptop', quantity: 5, tags: ['a'] }
            }
          })
        ]);

        expect(service.logs()[0].changes).toEqual([{ field: 'quantity', oldValue: 3, newValue: 5 }]);
      });

      it('compares nested values by content, not by reference', () => {
        load([
          backendLog({
            changes: { before: { dims: { w: 1 } }, after: { dims: { w: 2 } } }
          })
        ]);

        expect(service.logs()[0].changes.map((c) => c.field)).toEqual(['dims']);
      });

      it('reports a field that only exists on one side with null for the other', () => {
        load([backendLog({ changes: { before: { old: 'x' }, after: { added: 'y' } } })]);

        expect(service.logs()[0].changes).toEqual([
          { field: 'old', oldValue: 'x', newValue: null },
          { field: 'added', oldValue: null, newValue: 'y' }
        ]);
      });

      it('lists only the named fields when there is just an after and a field list', () => {
        load([backendLog({ changes: { after: { a: 1, b: 2, c: 3 }, fields: ['a', 'c', 'missing'] } })]);

        expect(service.logs()[0].changes).toEqual([
          { field: 'a', oldValue: null, newValue: 1 },
          { field: 'c', oldValue: null, newValue: 3 }
        ]);
      });

      it('lists every field when there is just an after', () => {
        load([backendLog({ action: 'CREATE', changes: { after: { name: 'Laptop', quantity: 2 } } })]);

        expect(service.logs()[0].changes).toEqual([
          { field: 'name', oldValue: null, newValue: 'Laptop' },
          { field: 'quantity', oldValue: null, newValue: 2 }
        ]);
      });

      it('has no changes when the API sent none', () => {
        load([backendLog({ changes: null })]);

        expect(service.logs()[0].changes).toEqual([]);
      });
    });
  });
});
