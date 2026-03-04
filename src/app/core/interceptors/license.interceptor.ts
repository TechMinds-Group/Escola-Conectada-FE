import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const licenseInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Se o status for 402 (Payment Required), redireciona para a página de ativação
      if (error.status === 402) {
        router.navigate(['/ativar-licenca']);
      }
      return throwError(() => error);
    }),
  );
};
