import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Licenca {
  id: string;
  chave: string;
  diasValidade: number;
  utilizada: boolean;
  dataUtilizacao: string | null;
  unidadeId: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class LicencaService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/Licencas';

  list(): Observable<Licenca[]> {
    return this.http.get<Licenca[]>(this.baseUrl);
  }

  save(licenca: { chave: string; diasValidade: number }): Observable<Licenca> {
    return this.http.post<Licenca>(this.baseUrl, licenca);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
