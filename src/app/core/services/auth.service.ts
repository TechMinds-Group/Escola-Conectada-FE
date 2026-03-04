import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);

  // Signal to track authentication state
  private authenticated = signal<boolean>(this.checkToken());

  constructor() {}

  isAuthenticated() {
    return this.authenticated();
  }

  private checkToken(): boolean {
    return !!localStorage.getItem('ec_token');
  }

  login(email: string, password: string, tenantId: string) {
    // Mock logic: e-mail qualquer + senha 'admin123'
    if (password === 'admin123') {
      const mockToken = 'mock-jwt-token-' + Math.random().toString(36).substring(7);
      localStorage.setItem('ec_token', mockToken);
      localStorage.setItem('ec_tenant_id', tenantId);
      localStorage.setItem('ec_user_email', email);

      this.authenticated.set(true);
      return true;
    }
    return false;
  }

  logout() {
    localStorage.removeItem('ec_token');
    localStorage.removeItem('ec_tenant_id');
    localStorage.removeItem('ec_user_email');
    this.authenticated.set(false);
    this.router.navigate(['/login']);
  }
}
