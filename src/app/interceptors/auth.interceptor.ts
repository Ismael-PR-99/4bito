import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshing = false;

function attachToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return req.clone({
    withCredentials: true,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);

  // Don't intercept the refresh call itself to avoid loops
  if (req.url.includes('/auth/refresh') || req.url.includes('/auth/logout')) {
    return next(req.clone({ withCredentials: true }));
  }

  return next(attachToken(req, auth.getToken())).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || refreshing) return throwError(() => err);

      refreshing = true;
      return auth.refresh().pipe(
        switchMap(newToken => {
          refreshing = false;
          return next(attachToken(req, newToken));
        }),
        catchError(refreshErr => {
          refreshing = false;
          auth.logout();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
