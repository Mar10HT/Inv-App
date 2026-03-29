import { Injectable, inject } from '@angular/core';
import { NgxPermissionsService } from 'ngx-permissions';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private ngxPermissions = inject(NgxPermissionsService);

  /**
   * Load permissions received from the API (GET /auth/me).
   * Replaces the previous hardcoded role-to-permission mapping.
   */
  loadPermissions(permissions: string[]): void {
    this.ngxPermissions.loadPermissions(permissions);
  }

  /** Clear all permissions (called on logout). */
  clearPermissions(): void {
    this.ngxPermissions.flushPermissions();
  }

  /** Synchronous check — returns true if the permission is currently loaded. */
  hasPermission(permission: string): boolean {
    const loaded = this.ngxPermissions.getPermissions();
    return permission in loaded;
  }
}
