import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  dataCriacao: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificacaoService implements OnDestroy {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Notificacoes`;
  private pollInterval?: any;

  constructor() {
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    // Initial load
    this.loadNotifications();

    // Poll every 60 seconds
    this.pollInterval = setInterval(() => {
      this.loadNotifications();
    }, 60000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  private notificacoesState = signal<Notificacao[]>([]);

  public notificacoes = this.notificacoesState.asReadonly();
  public unreadCount = computed(() => this.notificacoesState().filter((n) => !n.lida).length);

  loadNotifications(): void {
    this.http.get<Notificacao[]>(this.apiUrl).subscribe((notifs) => {
      this.notificacoesState.set(notifs);
    });
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/lido`, {}).pipe(
      tap(() => {
        this.notificacoesState.update((prev) =>
          prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
        );
      }),
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/marcar-todas-lidas`, {}).pipe(
      tap(() => {
        this.notificacoesState.update((prev) => prev.map((n) => ({ ...n, lida: true })));
      }),
    );
  }
}
