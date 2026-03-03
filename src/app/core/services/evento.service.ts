import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Evento {
  id?: string;
  titulo: string;
  dataInicio: string; // ISO string
  dataFim: string; // ISO string
  categoria: string;
  descricao?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EventoService {
  private http = inject(HttpClient);
  // Using NG_APP_API_URL if it exists in environment, fallback to hardcoded port if needed
  private apiUrl = `${environment.apiUrl || 'http://localhost:5231/api'}/eventos`;

  // Signal for hot reload
  private _eventosUpdated = signal<number>(0);

  // Categorias de Eventos com persistência local
  private readonly DEFAULT_CATEGORIES = [
    'Prova',
    'Reunião',
    'Feriado',
    'Evento Festivo',
    'Recesso Escolar',
  ];
  private _eventCategories = signal<string[]>(this.loadCategories());

  get eventosUpdated() {
    return this._eventosUpdated.asReadonly();
  }

  get eventCategories() {
    return this._eventCategories.asReadonly();
  }

  private loadCategories(): string[] {
    const stored = localStorage.getItem('calendar_event_categories');
    return stored ? JSON.parse(stored) : this.DEFAULT_CATEGORIES;
  }

  private saveCategories(categories: string[]) {
    localStorage.setItem('calendar_event_categories', JSON.stringify(categories));
    this._eventCategories.set(categories);
  }

  addCategory(name: string) {
    const current = this._eventCategories();
    if (!current.includes(name)) {
      this.saveCategories([...current, name]);
    }
  }

  deleteCategory(name: string) {
    const current = this._eventCategories();
    this.saveCategories(current.filter((c) => c !== name));
  }

  updateCategory(oldName: string, newName: string) {
    const current = this._eventCategories();
    this.saveCategories(current.map((c) => (c === oldName ? newName : c)));
  }

  // Notifies subscribers (the calendar component) to refetch events
  notifyUpdate() {
    this._eventosUpdated.update((v) => v + 1);
  }

  getAll(): Observable<Evento[]> {
    return this.http.get<Evento[]>(this.apiUrl);
  }

  getById(id: string): Observable<Evento> {
    return this.http.get<Evento>(`${this.apiUrl}/${id}`);
  }

  create(evento: Partial<Evento>): Observable<any> {
    return this.http.post(this.apiUrl, evento).pipe(tap(() => this.notifyUpdate()));
  }

  update(id: string, evento: Partial<Evento>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, evento).pipe(tap(() => this.notifyUpdate()));
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.notifyUpdate()));
  }
}
