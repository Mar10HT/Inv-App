import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { filter, take, map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';

/**
 * Route guard that checks if the user has the required permission.
 * Waits for permissions to finish loading (e.g. on page refresh) before
 * evaluating access, preventing false negatives from the async /auth/me call.
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

    // Permissions load asynchronously on app init (page refresh). Wait for
    // them before evaluating access so the guard doesn't see empty permissions.
    if (!authService.permissionsLoaded()) {
      return authService.permissionsLoaded$.pipe(
        filter(loaded => loaded),
        take(1),
        map(() => {
          // Re-check auth: a 401 from /auth/me may have cleared the session
          // while we were waiting. In that case, the auth service already
          // navigated to /login — just return false so we don't also navigate.
          if (!authService.isAuthenticated()) return false;
          if (permissionsService.hasPermission(permission)) return true;
          router.navigate(['/dashboard']);
          return false;
        })
      );
    }

    if (permissionsService.hasPermission(permission)) {
      return true;
    }

    // Redirect to dashboard if user lacks permission
    router.navigate(['/dashboard']);
    return false;
  };
}
