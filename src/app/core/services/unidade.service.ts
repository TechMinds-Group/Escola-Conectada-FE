import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Unidade {
  id: string;
  nome: string;
  identificador: string;
  documento: string | null;
  ativo: boolean;
  dataCadastro?: string;
  dataExpiracao?: string | null;
}

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UnidadeService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Unidades`;

  list(): Observable<Unidade[]> {
    return this.http
      .get<Unidade[]>(this.baseUrl, {
        headers: { 'Skip-Interceptor': 'true' },
      })
      .pipe(
        catchError((err) => {
          // Fallback silencioso direto no serviço caso API bloqueie por auth (401)
          const fallbackUnits: Unidade[] = [
            {
              id: '',
              nome: 'Unidade Padrão',
              identificador: 'default',
              ativo: true,
              documento: '',
            },
          ];
          return of(fallbackUnits);
        }),
      );
  }

  getPublicUnidades(): Observable<Unidade[]> {
    return this.http
      .get<Unidade[]>(`${this.baseUrl}/public`, {
        headers: { 'Skip-Interceptor': 'true' },
      })
      .pipe(
        catchError((err) => {
          const fallbackUnits: Unidade[] = [
            {
              id: '',
              nome: 'Unidade Padrão',
              identificador: 'default',
              ativo: true,
              documento: '',
            },
          ];
          return of(fallbackUnits);
        }),
      );
  }

  getById(id: string): Observable<Unidade> {
    return this.http.get<Unidade>(`${this.baseUrl}/${id}`);
  }

  save(unidade: Unidade): Observable<Unidade> {
    return this.http.post<Unidade>(this.baseUrl, unidade);
  }

  update(id: string, unidade: Unidade): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, unidade);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  ativarLicenca(chave: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ativar-licenca`, { chave });
  }
}
