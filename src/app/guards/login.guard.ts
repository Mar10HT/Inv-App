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

  if (authService.isAuthenticated()) {
    // User is already authenticated, redirect to dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  // User is not authenticated, allow access to login page
  return true;
};
