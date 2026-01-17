import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Check if request is to our API
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  if (!isApiRequest) {
    return next(req);
  }

  // Clone request with credentials for HttpOnly cookies
  let clonedRequest = req.clone({
    withCredentials: true
  });

  // Also add Bearer token if available (fallback for some endpoints)
  if (token) {
    clonedRequest = clonedRequest.clone({
      headers: clonedRequest.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(clonedRequest);
};
