import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AvisoType = 'Informativo' | 'Urgente' | 'Sucesso';

export interface Aviso {
  id?: string;
  title: string;
  content: string;
  type: AvisoType;
  active: boolean;
  startDate?: string;
  expirationDate?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AvisoService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Avisos`;

  // Signal to notify PublicView or other components about updates
  public avisosUpdated = signal<number>(0);

  list(): Observable<Aviso[]> {
    return this.http.get<Aviso[]>(this.baseUrl);
  }

  getById(id: string): Observable<Aviso> {
    return this.http.get<Aviso>(`${this.baseUrl}/${id}`);
  }

  save(aviso: Aviso): Observable<any> {
    return this.http.post<any>(this.baseUrl, aviso).pipe(tap(() => this.notifyUpdate()));
  }

  update(id: string, aviso: Aviso): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, aviso).pipe(tap(() => this.notifyUpdate()));
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(tap(() => this.notifyUpdate()));
  }

  private notifyUpdate() {
    this.avisosUpdated.update((v) => v + 1);
  }
}
