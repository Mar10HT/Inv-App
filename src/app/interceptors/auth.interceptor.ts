import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { CsrfService } from '../services/csrf.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const csrfService = inject(CsrfService);

  // Check if request is to our API
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  if (!isApiRequest) {
    return next(req);
  }

  // Start with credentials for HttpOnly cookies
  let clonedRequest = req.clone({
    withCredentials: true
  });

  // Add CSRF token for state-changing methods (POST, PUT, DELETE, PATCH)
  // GET, HEAD, OPTIONS are excluded from CSRF protection
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const csrfToken = csrfService.getToken();

  if (needsCsrf && csrfToken) {
    clonedRequest = clonedRequest.clone({
      headers: clonedRequest.headers.set('x-csrf-token', csrfToken)
    });
  }

  return next(clonedRequest);
};
