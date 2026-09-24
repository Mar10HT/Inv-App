import { TestBed } from '@angular/core/testing';

import { PermissionsService } from './permissions.service';
import { provideTestBedDefaults } from '../../testing/test-providers';

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(PermissionsService);
  });

  it('grants only the permissions it was given', () => {
    service.loadPermissions(['inventory:view', 'loans:view']);

    expect(service.hasPermission('inventory:view')).toBeTrue();
    expect(service.hasPermission('loans:view')).toBeTrue();
    expect(service.hasPermission('inventory:create')).toBeFalse();
  });

  it('grants nothing before anything is loaded', () => {
    expect(service.hasPermission('inventory:view')).toBeFalse();
  });

  it('forgets everything when the permissions are cleared', () => {
    service.loadPermissions(['inventory:view']);

    service.clearPermissions();

    expect(service.hasPermission('inventory:view')).toBeFalse();
  });

  describe('the wildcard a system administrator receives', () => {
    // Every key the API defines in src/common/constants/permissions.constant.ts. When the API
    // gets a new permission it has to be added to ALL_PERMISSIONS too, or administrators lose
    // whatever the new key guards in the UI.
    const apiPermissions = [
      'alerts:manage', 'alerts:view', 'audit:export', 'audit:view', 'auth:admin',
      'categories:create', 'categories:delete', 'categories:edit', 'categories:view',
      'dashboard:view',
      'discharges:create', 'discharges:manage', 'discharges:view',
      'inventory:create', 'inventory:delete', 'inventory:edit', 'inventory:export',
      'inventory:view', 'inventory:view_assigned',
      'loans:create', 'loans:delete', 'loans:manage', 'loans:view',
      'outflows:cancel', 'outflows:create', 'outflows:view',
      'reports:export', 'reports:view',
      'sales:cancel', 'sales:create', 'sales:view',
      'settings:edit', 'settings:view',
      'stocktake:create', 'stocktake:manage', 'stocktake:view',
      'suppliers:create', 'suppliers:delete', 'suppliers:edit', 'suppliers:view',
      'transactions:create', 'transactions:delete', 'transactions:edit', 'transactions:view',
      'transfers:create', 'transfers:manage', 'transfers:view',
      'users:create', 'users:delete', 'users:edit', 'users:view',
      'warehouse:create', 'warehouse:delete', 'warehouse:edit', 'warehouse:view'
    ];

    beforeEach(() => service.loadPermissions(['*']));

    it('expands to every permission the API defines', () => {
      const missing = apiPermissions.filter((permission) => !service.hasPermission(permission));

      expect(missing).toEqual([]);
    });

    it('does not invent permissions the API does not know', () => {
      expect(service.hasPermission('inventory:change')).toBeFalse();
    });
  });
});
