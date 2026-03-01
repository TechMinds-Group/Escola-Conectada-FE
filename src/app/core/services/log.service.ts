import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface AuditLogDto {
  id: string;
  actionType: string;
  entityName: string;
  entityId: string;
  userName?: string;
  timestamp: string;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class LogService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/logs`;

  getAll(): Observable<AuditLogDto[]> {
    return this.http.get<AuditLogDto[]>(this.apiUrl);
  }

  restore(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/restore`, {});
  }
}
