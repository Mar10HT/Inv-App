import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that prevents authenticated users from accessing the login page
 * Redirects them to the dashboard instead
 */
export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Already signed in: send the user on. The dashboard guard picks a page they may open
  // if the dashboard is not one of them.
  return authService.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
