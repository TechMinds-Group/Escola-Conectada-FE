import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TurmaService, TurmaDto } from '../../../core/services/turma.service';
import { TranslationService } from '../../../core/services/translation.service';
import { SchoolDataService } from '../../../core/services/school-data';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';
import { TableComponent } from '../../../core/components/table/table.component';

@Component({
  selector: 'app-consulta-turma',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TextInputComponent, SelectComponent, TableComponent],
  templateUrl: './consulta-turma.html',
  styleUrl: './consulta-turma.scss',
})
export class ConsultaTurma implements OnInit {
  public translation = inject(TranslationService);
  t = this.translation.dictionary;
  private turmaService = inject(TurmaService);
  private schoolData = inject(SchoolDataService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService);

  // State
  turmas = signal<TurmaDto[]>([]);
  isLoading = signal(true);
  isFilterPanelOpen = signal(false);

  // Form Controls
  searchText = new FormControl('');
  filterStatus = new FormControl('Todos');
  filterMatrix = new FormControl('Todas');

  // Values currently applied to the list
  appliedFilters = signal({
    search: '',
    status: 'Todos',
    matrix: 'Todas',
  });

  // Options

  statusOptions = [
    { value: 'Todos', label: 'Todos os Status' },
    { value: 'Completo', label: 'Completo' },
    { value: 'Incompleto', label: 'Incompleto' },
    { value: 'Conflito', label: 'Conflito' },
  ];

  matrixOptions = computed(() => {
    return [
      { value: 'Todas', label: 'Todas as Matrizes' },
      ...this.schoolData.schoolMatrices().map((m) => ({ value: m.name, label: m.name })),
    ];
  });

  // Derived
  filteredTurmas = computed(() => {
    let list = this.turmas();
    const filters = this.appliedFilters();
    const search = (filters.search || '').toLowerCase();

    if (search) {
      list = list.filter(
        (t) =>
          t.nome.toLowerCase().includes(search) ||
          (t.matrizNome || '').toLowerCase().includes(search),
      );
    }
    if (filters.status !== 'Todos') {
      list = list.filter((t) => t.statusCronograma === filters.status);
    }
    if (filters.matrix !== 'Todas') {
      list = list.filter((t) => t.matrizNome === filters.matrix);
    }
    return list;
  });

  isFilterActive = computed(
    () =>
      !!this.appliedFilters().search ||
      this.appliedFilters().status !== 'Todos' ||
      this.appliedFilters().matrix !== 'Todas',
  );

  toggleFilterPanel() {
    this.isFilterPanelOpen.update((v) => !v);
  }

  applyFilters() {
    this.appliedFilters.set({
      search: this.searchText.value || '',
      status: this.filterStatus.value || 'Todos',
      matrix: this.filterMatrix.value || 'Todas',
    });
  }

  clearFilters() {
    this.searchText.setValue('');
    this.filterStatus.setValue('Todos');
    this.filterMatrix.setValue('Todas');
    this.applyFilters();
  }

  ngOnInit() {
    this.loadTurmas();
    this.schoolData.loadUnidades();
  }

  loadTurmas() {
    this.isLoading.set(true);
    this.turmaService.list().subscribe({
      next: (data) => {
        this.turmas.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  navigateToNew() {
    this.router.navigate(['/classes/new']);
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/classes/edit', id]);
  }

  async deleteTurma(id: string) {
    const turma = this.turmas().find((t) => t.id === id);
    const confirmed = await this.confirmationService.confirm({
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir a turma ${turma?.nome || ''}? Esta ação não pode ser desfeita.`,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.turmaService.delete(id).subscribe({
        next: () => {
          this.notificationService.success('Turma excluída com sucesso');
          this.loadTurmas();
        },
        error: () => {
          this.notificationService.error('Erro ao excluir turma');
        },
      });
    }
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

}
