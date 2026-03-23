import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Equipamento {
  id?: string;
  nome: string;
  tipo: string;
  descricao: string;
  quantidade: number;
  status: string;
  solicitante?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EquipamentoService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Equipamentos`;

  list(): Observable<Equipamento[]> {
    return this.http.get<Equipamento[]>(this.baseUrl);
  }

  getById(id: string): Observable<Equipamento> {
    return this.http.get<Equipamento>(`${this.baseUrl}/${id}`);
  }

  save(equipamento: Equipamento): Observable<Equipamento> {
    return this.http.post<Equipamento>(this.baseUrl, equipamento);
  }

  update(id: string, equipamento: Equipamento): Observable<Equipamento> {
    return this.http.put<Equipamento>(`${this.baseUrl}/${id}`, equipamento);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  // TipoEquipamento Methods
  private readonly typeUrl = `${environment.apiUrl}/TipoEquipamentos`;

  listTypes(): Observable<any[]> {
    return this.http.get<any[]>(this.typeUrl);
  }

  saveType(tipo: any): Observable<any> {
    return this.http.post<any>(this.typeUrl, tipo);
  }

  updateType(id: string, tipo: any): Observable<any> {
    return this.http.put<any>(`${this.typeUrl}/${id}`, tipo);
  }

  deleteType(id: string): Observable<any> {
    return this.http.delete<any>(`${this.typeUrl}/${id}`);
  }

  // Reserva Equipamentos
  private readonly reservaUrl = `${environment.apiUrl}/ReservaEquipamentos`;

  criarReserva(reserva: any): Observable<any> {
    return this.http.post<any>(this.reservaUrl, reserva);
  }

  listReservas(): Observable<any[]> {
    return this.http.get<any[]>(this.reservaUrl);
  }

  cancelarReserva(id: string): Observable<any> {
    return this.http.delete<any>(`${this.reservaUrl}/${id}`);
  }
}
