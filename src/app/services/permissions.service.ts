import { Injectable, inject } from '@angular/core';
import { NgxPermissionsService } from 'ngx-permissions';

/** Every permission the API defines (src/common/constants/permissions.constant.ts of the API).
 *  When the API returns ['*'] (SYSTEM_ADMIN wildcard), these are loaded
 *  so that ngx-permissions directives work correctly. A permission missing here is
 *  one a system administrator would silently lack in the UI. */
const ALL_PERMISSIONS = [
  'alerts:manage', 'alerts:view',
  'audit:export', 'audit:view',
  'auth:admin',
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
  'warehouse:create', 'warehouse:delete', 'warehouse:edit', 'warehouse:view',
];

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private ngxPermissions = inject(NgxPermissionsService);

  /**
   * Load permissions received from the API (GET /auth/me).
   * Expands the wildcard '*' to all known permissions so ngx-permissions
   * directives work correctly for SYSTEM_ADMIN users.
   */
  loadPermissions(permissions: string[]): void {
    const effective = permissions.includes('*') ? ALL_PERMISSIONS : permissions;
    this.ngxPermissions.loadPermissions(effective);
  }

  /** Clear all permissions (called on logout). */
  clearPermissions(): void {
    this.ngxPermissions.flushPermissions();
  }

  /** Synchronous check — returns true if the permission is currently loaded.
   *  Treats '*' as a wildcard that grants all permissions. */
  hasPermission(permission: string): boolean {
    const loaded = this.ngxPermissions.getPermissions();
    return '*' in loaded || permission in loaded;
  }
}
