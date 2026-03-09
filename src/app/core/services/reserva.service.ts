import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Reserva {
  id: string;
  salaId: string;
  salaNome: string;
  professorId: string;
  professorNome: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  motivo: string;
  status: 'Pendente' | 'Aprovada' | 'Recusada' | 'Cancelada';
  affectedProfessorId?: string;
  turmaConflito?: string;
  createdAt: string;
}

export interface CreateReservaPayload {
  salaId: string;
  professorId: string;
  data: string; // ISO date string
  horarioInicio: string;
  horarioFim: string;
  motivo: string;
}

export interface AmbienteDisponibilidade {
  salaId: string;
  salaNome: string;
  bloco: string;
  recursos: string[];
  statusOcupacao: 'Livre' | 'Ocupado' | 'Solicitado';
  professorNome: string | null;
  occupantProfessorId: string | null;
  capacidade: number;
  data: string;
  horario: string;
  horarioFim: string;
}

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Reservas`;

  list(data?: string, salaId?: string): Observable<Reserva[]> {
    let params = new HttpParams();
    if (data) params = params.set('data', data);
    if (salaId) params = params.set('salaId', salaId);
    return this.http.get<Reserva[]>(this.baseUrl, { params });
  }

  getStatusAmbientes(data: string, turno: string): Observable<AmbienteDisponibilidade[]> {
    const params = new HttpParams().set('data', data).set('turno', turno);
    return this.http.get<AmbienteDisponibilidade[]>(`${this.baseUrl}/disponibilidade`, { params });
  }

  create(payload: CreateReservaPayload): Observable<any> {
    return this.http.post<any>(this.baseUrl, payload);
  }

  aprovar(id: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}/aprovar`, {});
  }

  recusar(id: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}/recusar`, {});
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  aceitarSolicitacao(notificacaoId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/aceitar-solicitacao/${notificacaoId}`, {});
  }
}
