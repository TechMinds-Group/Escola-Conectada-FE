import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TurmaService, TurmaDto } from '../../../core/services/turma.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-consulta-turma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './consulta-turma.html',
  styleUrl: './consulta-turma.scss',
})
export class ConsultaTurma implements OnInit {
  public translation = inject(TranslationService);
  t = this.translation.dictionary;
  private turmaService = inject(TurmaService);

  // State
  turmas = signal<TurmaDto[]>([]);
  isLoading = signal(true);
  searchText = signal('');
  filterTurno = signal('Todos');
  filterAno = signal<number>(new Date().getFullYear());

  // Derived
  filteredTurmas = computed(() => {
    let list = this.turmas();
    const search = this.searchText().toLowerCase();
    const turno = this.filterTurno();
    const ano = this.filterAno();

    if (search) {
      list = list.filter(
        (t) =>
          t.nome.toLowerCase().includes(search) ||
          (t.matrizNome || '').toLowerCase().includes(search),
      );
    }
    if (turno !== 'Todos') {
      list = list.filter((t) => t.turno === turno);
    }
    list = list.filter((t) => t.ano === ano);
    return list;
  });

  turnoOptions = ['Todos', 'Manhã', 'Tarde', 'Noite', 'Integral'];
  anoOptions = [new Date().getFullYear(), new Date().getFullYear() - 1];

  ngOnInit() {
    this.turmaService.list().subscribe({
      next: (data) => {
        this.turmas.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Completo':
        return 'bg-success-subtle text-success border-success-subtle';
      case 'Incompleto':
        return 'bg-warning-subtle text-warning-emphasis border-warning-subtle';
      case 'Conflito':
        return 'bg-danger-subtle text-danger border-danger-subtle';
      default:
        return 'bg-light text-secondary';
    }
  }

  getTurnoBadgeClass(turno: string): string {
    switch (turno) {
      case 'Manhã':
        return 'bg-info-subtle text-info-emphasis';
      case 'Tarde':
        return 'bg-warning-subtle text-warning-emphasis';
      case 'Noite':
        return 'bg-secondary-subtle text-secondary-emphasis';
      default:
        return 'bg-primary-subtle text-primary';
    }
  }

  getInitials(nome: string): string {
    return nome
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }
}
