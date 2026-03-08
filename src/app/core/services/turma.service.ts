import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AlocacaoDto {
  matrizDisciplinaId: string;
  professorId: string;
  diaDaSemana: number;
  ordemAula: number;
}

export interface TurmaDto {
  id: string;
  nome: string;
  codigo?: string;
  ano: number;
  turno: string;
  matrizId: string;
  matrizNome?: string;
  salaId?: string;
  salaNome?: string;
  capacidadeMaxima: number;
  professorRegenteId?: string;
  unidadeId: string;
  gradeHorariaId?: string;
  gradeHorariaNome?: string;
  statusCronograma: string;
  alocacoes?: AlocacaoDto[];
}

@Injectable({
  providedIn: 'root',
})
export class TurmaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Turmas`;

  list(): Observable<TurmaDto[]> {
    return this.http.get<TurmaDto[]>(this.apiUrl);
  }

  getById(id: string): Observable<TurmaDto> {
    return this.http.get<TurmaDto>(`${this.apiUrl}/${id}`);
  }

  save(turma: Partial<TurmaDto>): Observable<any> {
    return this.http.post(this.apiUrl, turma);
  }

  update(id: string, turma: Partial<TurmaDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, turma);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
