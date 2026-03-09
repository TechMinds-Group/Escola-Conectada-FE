import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UnidadeService, Unidade } from '../../../core/services/unidade.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
})
export class Login implements OnInit {
  private authService = inject(AuthService);
  private unidadeService = inject(UnidadeService);
  private router = inject(Router);

  username = '';
  password = '';
  selectedTenantId = '';
  errorMessage = '';
  loading = signal(false);

  unidades = signal<Unidade[]>([]);

  ngOnInit() {
    // Check if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Clear any residual data if not authenticated to avoid header contamination
    localStorage.removeItem('ec_token');
    localStorage.removeItem('ec_user');
    localStorage.removeItem('ec_tenant_id');

    // Load units from real API
    this.unidadeService.list().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.unidades.set(data);
          this.selectedTenantId = data[0].id;
        }
      },
      error: (err) => {
        console.error('Error loading units from API:', err);
        // Fallback only for development if API is down
        const mockUnits: Unidade[] = [
          {
            id: '00000000-0000-0000-0000-000000000001',
            nome: 'Unidade Central (Fallback)',
            identificador: 'central',
            ativo: true,
            documento: '',
            dataCadastro: '',
            dataExpiracao: '',
          },
        ];
        this.unidades.set(mockUnits);
        this.selectedTenantId = mockUnits[0].id;
      },
    });
  }

  onInputChange() {
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  async onSubmit() {
    if (!this.username || !this.password || !this.selectedTenantId) {
      this.errorMessage = 'Por favor, preencha todos os campos.';
      return;
    }

    this.loading.set(true);
    this.errorMessage = '';

    try {
      const success = await this.authService.login(
        this.username,
        this.password,
        this.selectedTenantId,
      );

      if (success) {
        await this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Dados de acesso inválidos. Verifique suas credenciais.';
      }
    } catch (error: any) {
      console.error('Login submission error:', error);

      if (error.status === 401) {
        // Specifically handle 401 from backend
        this.errorMessage = error.error?.message || 'Usuário ou senha incorretos.';
      } else if (error.status === 403) {
        this.errorMessage = error.error?.message || 'Acesso negado para esta unidade.';
      } else if (error.status === 0) {
        this.errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
      } else {
        this.errorMessage = 'Ocorreu um erro inesperado na autenticação. Tente novamente.';
      }
    } finally {
      this.loading.set(false);
    }
  }
}
