import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, ROLES } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Check roles if defined in route data
    const requiredRoles = route.data?.['roles'] as string[];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (authService.hasAnyRole(requiredRoles)) {
      return true;
    }

    // Redirect based on role if unauthorized
    if (authService.hasRole(ROLES.PROFESSOR)) {
      router.navigate(['/calendario-professor']);
    } else {
      router.navigate(['/dashboard']);
    }
    return false;
  }

  // Instant redirect to login page
  router.navigate(['/login']);
  return false;
};
