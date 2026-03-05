import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('ec_token');
  const tenantId = localStorage.getItem('ec_tenant_id');
  const router = inject(Router);
  const apiUrl = environment.apiUrl;

  let authReq = req;

  // Only inject the token and tenant if the request is targeting our API
  const isTargetingApi = req.url.startsWith(apiUrl) || req.url.startsWith('/api');

  if (isTargetingApi) {
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['X-Tenant-Id'] = tenantId;

    authReq = req.clone({
      setHeaders: headers,
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 Unauthorized handling: Clear session and redirect to login
      // Skip if already on login page OR if on the public view (no auth required there)
      const isLoginRequest = req.url.includes('/Account/login');
      const isPublicView = router.url.startsWith('/view');

      if (error.status === 401 && !isLoginRequest && !isPublicView) {
        localStorage.removeItem('ec_token');
        localStorage.removeItem('ec_user');
        localStorage.removeItem('ec_tenant_id');

        // Redirect instantly to login
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
