import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { filter, take, map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';

/**
 * The first page the user may open. A denial must never land on another denial: sending
 * everybody to /dashboard made a user without dashboard:view bounce between refusals.
 */
function fallbackUrl(permissions: PermissionsService, router: Router): UrlTree {
  if (permissions.hasPermission('dashboard:view')) return router.createUrlTree(['/dashboard']);
  if (permissions.hasPermission('inventory:view')) return router.createUrlTree(['/inventory']);
  // Every signed in user may open their own profile
  return router.createUrlTree(['/profile']);
}

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
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    const decide = (): boolean | UrlTree =>
      permissionsService.hasPermission(permission) ? true : fallbackUrl(permissionsService, router);

    // Permissions load asynchronously on app init (page refresh). Wait for
    // them before evaluating access so the guard doesn't see empty permissions.
    if (!authService.permissionsLoaded()) {
      return authService.permissionsLoaded$.pipe(
        filter(loaded => loaded),
        take(1),
        // Re-check auth: a 401 from /auth/me may have cleared the session while we were
        // waiting. The auth service already navigated to /login, so just cancel.
        map(() => (authService.isAuthenticated() ? decide() : false))
      );
    }

    return decide();
  };
}
