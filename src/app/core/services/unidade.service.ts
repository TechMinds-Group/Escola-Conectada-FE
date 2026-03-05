import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    return this.http.get<Unidade[]>(this.baseUrl);
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
