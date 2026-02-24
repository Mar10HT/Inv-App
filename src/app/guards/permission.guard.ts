import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';

/**
 * Route guard that checks if the user has the required permission.
 * Usage in routes: canActivate: [permissionGuard('view_users')]
 */
export function permissionGuard(permission: string): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const permissionsService = inject(PermissionsService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    if (permissionsService.hasPermission(permission)) {
      return true;
    }

    // Redirect to dashboard if user lacks permission
    router.navigate(['/dashboard']);
    return false;
  };
}
