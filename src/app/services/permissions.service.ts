import { Injectable, inject } from '@angular/core';
import { NgxPermissionsService } from 'ngx-permissions';

/** All permission keys defined in the application.
 *  When the API returns ['*'] (SYSTEM_ADMIN wildcard), these are loaded
 *  so that ngx-permissions directives work correctly. */
const ALL_PERMISSIONS = [
  'audit:view',
  'categories:create', 'categories:delete', 'categories:edit', 'categories:view',
  'dashboard:view',
  'discharges:manage', 'discharges:view',
  'inventory:change', 'inventory:create', 'inventory:delete', 'inventory:edit', 'inventory:view',
  'loans:create', 'loans:manage', 'loans:view',
  'reports:view',
  'settings:edit', 'settings:view',
  'stocktake:create', 'stocktake:manage', 'stocktake:view',
  'suppliers:create', 'suppliers:delete', 'suppliers:edit', 'suppliers:view',
  'transactions:create', 'transactions:delete', 'transactions:view',
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
