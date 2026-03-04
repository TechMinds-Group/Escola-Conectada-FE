import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ativar-licenca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-dark text-light p-4">
      <div
        class="card bg-secondary border-0 shadow-lg"
        style="max-width: 500px; width: 100%; border-radius: 1.5rem;"
      >
        <div class="card-body p-5">
          <div class="text-center mb-4">
            <div class="display-1 mb-3 text-warning">
              <i class="bi bi-shield-lock"></i>
            </div>
            <h2 class="fw-bold mb-2">Acesso Bloqueado</h2>
            <p class="text-light-50">
              Sua licença expirou ou não foi encontrada. Insira uma nova chave para continuar
              utilizando o sistema.
            </p>
          </div>

          <form (submit)="ativar()">
            <div class="mb-4">
              <label for="chave" class="form-label small text-uppercase fw-bold opacity-75"
                >Chave de Ativação</label
              >
              <input
                type="text"
                id="chave"
                name="chave"
                [(ngModel)]="chave"
                class="form-control form-control-lg bg-dark text-light border-0 py-3 px-4"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required
                [disabled]="loading()"
              />
            </div>

            <div
              *ngIf="error()"
              class="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger mb-4"
            >
              <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ error() }}
            </div>

            <div
              *ngIf="success()"
              class="alert alert-success border-0 bg-success bg-opacity-10 text-success mb-4"
            >
              <i class="bi bi-check-circle-fill me-2"></i> {{ success() }}
            </div>

            <button
              type="submit"
              class="btn btn-warning btn-lg w-100 py-3 fw-bold text-dark shadow-sm"
              [disabled]="loading() || !chave"
            >
              <span *ngIf="loading()" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading() ? 'ATIVANDO...' : 'ATIVAR SISTEMA' }}
            </button>
          </form>

          <div class="mt-5 text-center small opacity-50">
            <p>Precisa de ajuda? Entre em contato com o suporte técnico.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
      .card {
        background: #1a1a1a !important;
        backdrop-filter: blur(10px);
      }
      .form-control:focus {
        background: #252525 !important;
        box-shadow: 0 0 0 0.25rem rgba(255, 193, 7, 0.25);
        color: white !important;
      }
    `,
  ],
})
export class AtivarLicencaComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  chave = '';
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  ativar() {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.http
      .post<{
        message: string;
      }>('/api/unidades/ativar-licenca', { chave: this.chave })
      .subscribe({
        next: (response) => {
          this.success.set(response.message);
          this.loading.set(false);
          // Pequeno delay para mostrar sucesso antes de redirecionar
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 2000);
        },
        error: (err) => {
          this.error.set(
            err.error?.message || 'Erro ao ativar licença. Verifique a chave e tente novamente.',
          );
          this.loading.set(false);
        },
      });
  }
}
