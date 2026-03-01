import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SchoolRoom, SchoolRoomType } from './school-data';

@Injectable({
  providedIn: 'root',
})
export class AmbienteService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/Salas';
  private readonly typeUrl = '/api/TipoSalas';

  // Room Methods
  list(): Observable<SchoolRoom[]> {
    return this.http.get<SchoolRoom[]>(this.baseUrl);
  }

  getById(id: string): Observable<SchoolRoom> {
    return this.http.get<SchoolRoom>(`${this.baseUrl}/${id}`);
  }

  save(sala: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, sala);
  }

  update(id: string, sala: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, sala);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  // Room Type Methods
  listTypes(): Observable<any> {
    return this.http.get<any>(this.typeUrl);
  }

  saveType(type: any): Observable<any> {
    return this.http.post<any>(this.typeUrl, type);
  }

  updateType(id: string, type: any): Observable<any> {
    return this.http.put<any>(`${this.typeUrl}/${id}`, type);
  }

  deleteType(id: string): Observable<any> {
    return this.http.delete<any>(`${this.typeUrl}/${id}`);
  }

  // Block (Bloco) Methods
  private readonly blocoUrl = '/api/Blocos';

  listBlocks(): Observable<any> {
    return this.http.get<any>(this.blocoUrl);
  }

  saveBlock(block: any): Observable<any> {
    return this.http.post<any>(this.blocoUrl, block);
  }

  updateBlock(id: string, block: any): Observable<any> {
    return this.http.put<any>(`${this.blocoUrl}/${id}`, block);
  }

  deleteBlock(id: string): Observable<any> {
    return this.http.delete<any>(`${this.blocoUrl}/${id}`);
  }

  // Resource Methods
  private readonly resourceUrl = '/api/SalaRecursos';

  listResources(): Observable<any> {
    return this.http.get<any>(this.resourceUrl);
  }

  saveResource(resource: any): Observable<any> {
    return this.http.post<any>(this.resourceUrl, resource);
  }

  updateResource(id: string, resource: any): Observable<any> {
    return this.http.put<any>(`${this.resourceUrl}/${id}`, resource);
  }

  deleteResource(id: string): Observable<any> {
    return this.http.delete<any>(`${this.resourceUrl}/${id}`);
  }

  // Tutorial Persistence (LocalStorage fallback)
  private readonly TUTORIAL_KEY = 'hasCompletedAmbientesTour';

  hasCompletedTutorial(): boolean {
    return localStorage.getItem(this.TUTORIAL_KEY) === 'true';
  }

  completeTutorial(): void {
    localStorage.setItem(this.TUTORIAL_KEY, 'true');
  }

  resetTutorial(): void {
    localStorage.removeItem(this.TUTORIAL_KEY);
  }
}
