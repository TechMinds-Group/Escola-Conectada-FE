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

  email = '';
  password = '';
  selectedTenantId = '';
  errorMessage = '';
  loading = false;

  unidades = signal<Unidade[]>([]);

  ngOnInit() {
    // Check if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Try to load units, with fallback mock data
    this.unidadeService.list().subscribe({
      next: (data) => {
        this.unidades.set(data);
        if (data.length > 0) this.selectedTenantId = data[0].id;
      },
      error: () => {
        console.warn('Using mock units fallback');
        const mockUnits: Unidade[] = [
          {
            id: '1',
            nome: 'Escola Central',
            identificador: 'central',
            ativo: true,
            documento: '',
            dataCadastro: '',
            dataExpiracao: '',
          },
          {
            id: '2',
            nome: 'Escola Norte',
            identificador: 'norte',
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

  onSubmit() {
    if (!this.email || !this.password || !this.selectedTenantId) {
      this.errorMessage = 'Por favor, preencha todos os campos.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Mock login logic
    const success = this.authService.login(this.email, this.password, this.selectedTenantId);

    if (success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage = 'E-mail ou senha inválidos.';
      this.loading = false;
    }
  }
}
