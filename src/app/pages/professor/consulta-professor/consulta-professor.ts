import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { SchoolDataService } from '../../../core/services/school-data';
import { ProfessorService, Professor } from '../../../core/services/professor.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { NotificationService } from '../../../core/services/notification.service';

import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { SelectComponent } from '../../../core/components/select/select.component';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { TableComponent } from '../../../core/components/table/table.component';

@Component({
  selector: 'app-consulta-professor',
  standalone: true,
  imports: [
    CommonModule,
    MatMenuModule,
    MatButtonModule,
    ReactiveFormsModule,
    SelectComponent,
    TextInputComponent,
    TableComponent,
  ],
  templateUrl: './consulta-professor.html',
  styleUrl: './consulta-professor.scss',
})
export class ConsultaProfessor implements OnInit {
  public schoolData = inject(SchoolDataService);
  public professorService = inject(ProfessorService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService);

  // State
  rawTeachers = signal<Professor[]>([]);
  isFilterPanelOpen = signal(false);
  isLoading = signal(true);

  // Form Controls
  nameFilter = new FormControl('');
  subjectFilter = new FormControl<string | null>(null);
  unidadeFilter = new FormControl<string | null>(null);

  // Values currently applied to the list
  appliedFilters = signal({
    name: '',
    subject: null as string | null,
    unidade: null as string | null,
  });

  // Determines if any filter is applied
  isFilterActive = computed(
    () =>
      !!this.appliedFilters().name ||
      !!this.appliedFilters().subject ||
      !!this.appliedFilters().unidade,
  );

  subjectOptions = computed(() => [
    { value: null, label: 'Todas as Disciplinas' },
    ...this.schoolData.subjects().map((s) => ({ value: s.id, label: s.name })),
  ]);

  unidadeOptions = computed(() => [
    { value: null, label: 'Todas as Unidades' },
    ...this.schoolData.units().map((u: any) => ({ value: u.id, label: u.name })),
  ]);

  ngOnInit() {
    this.loadTeachers();
    this.schoolData.loadUnidades();
  }

  loadTeachers() {
    this.isLoading.set(true);
    this.professorService.getAll().subscribe({
      next: (res: any) => {
        const data = res && res.data ? res.data : res;
        this.rawTeachers.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading teachers:', err);
        this.isLoading.set(false);
        this.notificationService.error('Erro ao carregar lista de professores');
      },
    });
  }

  teachers = computed(() => {
    const subjects = this.schoolData.subjects();
    const filters = this.appliedFilters();
    const nameSearch = (filters.name || '').toLowerCase();

    return this.rawTeachers()
      .map((t) => {
        // Calculate Workload
        const allocatedWorkload = t.allocatedWorkload || 0;
        const contractualWorkload = t.contractualWorkload || 20;

        // Resolve Subjects
        const mainSubject = subjects.find((s) => s.id === t.mainSubjectId);
        const secondarySubjects = (t.secondarySubjectIds || [])
          .map((id) => subjects.find((s) => s.id === id))
          .filter((s) => !!s);

        const usagePercentage = Math.min(
          100,
          Math.round((allocatedWorkload / contractualWorkload) * 100),
        );
        const isOverloaded = allocatedWorkload > contractualWorkload;
        const isFull = allocatedWorkload >= contractualWorkload;

        return {
          ...t,
          allocatedWorkload,
          contractualWorkload,
          mainSubject,
          secondarySubjects,
          usagePercentage,
          isOverloaded,
          isFull,
          status: isOverloaded ? 'overloaded' : isFull ? 'full' : 'available',
        };
      })
      .filter((t) => {
        const matchesName = !nameSearch || t.name.toLowerCase().includes(nameSearch);
        const matchesSubject =
          !filters.subject ||
          t.mainSubjectId === filters.subject ||
          (t.secondarySubjectIds || []).includes(filters.subject);
        return matchesName && matchesSubject;
      });
  });

  toggleFilterPanel() {
    this.isFilterPanelOpen.update((v) => !v);
  }

  applyFilters() {
    this.appliedFilters.set({
      name: this.nameFilter.value || '',
      subject: this.subjectFilter.value,
      unidade: this.unidadeFilter.value,
    });
  }

  clearFilters() {
    this.nameFilter.setValue('');
    this.subjectFilter.setValue(null);
    this.unidadeFilter.setValue(null);
    this.applyFilters();
  }

  navigateToNew() {
    this.router.navigate(['/professores/novo']);
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/professores/editar', id]);
  }

  async deleteTeacher(id: string) {
    const teacher = this.rawTeachers().find((t) => t.id === id);
    const confirmed = await this.confirmationService.confirm({
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir o professor ${teacher?.name || ''}? Esta ação não pode ser desfeita.`,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.professorService.delete(id).subscribe({
        next: () => {
          this.notificationService.success('Professor excluído com sucesso');
          this.loadTeachers();
        },
        error: () => {
          this.notificationService.error('Erro ao excluir professor');
        },
      });
    }
  }

  getRemainingSubjectsTooltip(teacher: any): string {
    const remaining = teacher.subjects?.slice(2) || [];
    return remaining.map((s: any) => `${s.name} (${s.workload}h)`).join(', ');
  }
}
