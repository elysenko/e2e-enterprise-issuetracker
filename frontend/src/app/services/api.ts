import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Base path for the NestJS REST API. Served same-origin behind nginx in
 * production and proxied by `ng serve` (see proxy.conf.json) in dev, so a
 * root-relative `/api` resolves correctly in both.
 */
export const API_BASE = '/api';

export const TOKEN_KEY = 'access_token';

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Attaches the stored Bearer token to every `/api` request and, on a 401,
 * clears the session and bounces the user to /login. Auth endpoints are exempt
 * from the redirect so a failed login/signup surfaces its error to the form.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const isApi = req.url.startsWith(API_BASE);
  const token = readToken();
  const authReq =
    isApi && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthRoute = req.url.includes('/api/auth/');
      if (err.status === 401 && !isAuthRoute) {
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('token');
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('issuetracker_user');
          localStorage.removeItem('user');
        } catch {
          /* ignore storage errors */
        }
        void router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
