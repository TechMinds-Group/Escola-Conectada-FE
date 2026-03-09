import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, tap, of, Observable, lastValueFrom, map } from 'rxjs';

export interface User {
  id: string;
  nome: string;
  email: string;
  username?: string;
  roles: string[];
  tenantId: string;
  professorId?: string;
}

export const ROLES = {
  ADMIN: 'Admin',
  PROFESSOR: 'Professor',
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/Account`;

  // Signal to track authentication state
  private authenticated = signal<boolean>(this.checkToken());
  public currentUser = signal<User | null>(this.getUserFromStorage());

  constructor() {
    // Check for session timeout on load
    if (this.authenticated()) {
      this.setupSessionTimeout();
    }
  }

  isAuthenticated() {
    return this.authenticated() && !this.isTokenExpired();
  }

  getCurrentUser() {
    return this.currentUser();
  }

  private isTokenExpired(): boolean {
    const token = localStorage.getItem('ec_token');
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;

      const expirationDate = new Date(0);
      expirationDate.setUTCSeconds(payload.exp);

      return expirationDate.valueOf() <= new Date().valueOf();
    } catch (e) {
      return true;
    }
  }

  private checkToken(): boolean {
    const token = localStorage.getItem('ec_token');
    return !!token && !this.isTokenExpired();
  }

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem('ec_user');
    return user ? JSON.parse(user) : null;
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return !!user && user.roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUser();
    return !!user && roles.some((r) => user.roles.includes(r));
  }

  async login(username: string, password: string, tenantId: string): Promise<boolean> {
    const loginData = { username, password, tenantId };

    try {
      // Ensure tenantId is in localStorage BEFORE the request so interceptor picks it up
      localStorage.setItem('ec_tenant_id', tenantId);

      const response = await lastValueFrom(this.http.post<any>(`${this.apiUrl}/login`, loginData));

      if (response && response.token) {
        localStorage.setItem('ec_token', response.token);
        localStorage.setItem('ec_user', JSON.stringify(response.user));

        this.authenticated.set(true);
        this.currentUser.set(response.user);

        this.setupSessionTimeout();
        return true;
      }
      return false;
    } catch (error: any) {
      if (error.status === 401) {
        const message = error.error?.message || 'Não autorizado.';
        console.error(`Login error (401): ${message}`);
      } else {
        console.error('Login error:', error);
      }
      throw error;
    }
  }

  getProfessorUsers(): Observable<any[]> {
    return this.http
      .get<any>(`${this.apiUrl}/professores`)
      .pipe(map((res: any) => (res && res.data ? res.data : res) || []));
  }

  private setupSessionTimeout() {
    // Simple client-side timeout: 30 minutes
    // In a real app, we might check JWT 'exp' claim or listen to 401s
    setTimeout(
      () => {
        if (this.isAuthenticated()) {
          console.warn('Session expired (client-side timeout)');
          this.logout();
        }
      },
      30 * 60 * 1000,
    );
  }

  async updateProfile(name: string): Promise<boolean> {
    try {
      await lastValueFrom(this.http.put<any>(`${this.apiUrl}/profile`, { name }));

      const user = this.currentUser();
      if (user) {
        user.nome = name;
        localStorage.setItem('ec_user', JSON.stringify(user));
        this.currentUser.set({ ...user });
      }
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async updateUsername(username: string): Promise<boolean> {
    try {
      await lastValueFrom(this.http.put<any>(`${this.apiUrl}/username`, { username }));

      const user = this.currentUser();
      if (user) {
        // We'll need to cast this or update the User interface if it doesn't have a username property
        (user as any).username = username;
        localStorage.setItem('ec_user', JSON.stringify(user));
        this.currentUser.set({ ...user });
      }
      return true;
    } catch (error) {
      console.error('Update username error:', error);
      throw error;
    }
  }

  async changePassword(current: string, newPass: string): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.post<any>(`${this.apiUrl}/change-password`, {
          currentPassword: current,
          newPassword: newPass,
        }),
      );
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('ec_token');
    localStorage.removeItem('ec_user');
    localStorage.removeItem('ec_tenant_id');
    localStorage.removeItem('ec_professor_id');

    this.authenticated.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
