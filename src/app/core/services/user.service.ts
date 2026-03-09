import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';

export interface UserListDto {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  lastAccess: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Account`;

  getUsers(): Observable<UserListDto[]> {
    return this.http
      .get<any>(`${this.apiUrl}/users-list`)
      .pipe(map((res) => (res && res.data ? res.data : res) || []));
  }

  getRoles(): Observable<string[]> {
    return this.http
      .get<any>(`${this.apiUrl}/roles`)
      .pipe(map((res) => (res && res.data ? res.data : res) || []));
  }

  checkUsernameAvailability(username: string, excludeId?: string): Observable<boolean> {
    const params: any = { username };
    if (excludeId) params.excludeId = excludeId;
    return this.http
      .get<any>(`${this.apiUrl}/check-username`, { params })
      .pipe(map((res) => res.available));
  }

  createUser(user: {
    name: string;
    username: string;
    email: string | null;
    role: string;
    password?: string | null;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-user`, user);
  }

  updateUser(
    id: string,
    user: { name: string; username: string; role: string; password?: string | null },
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-user/${id}`, user);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete-user/${id}`);
  }
}
