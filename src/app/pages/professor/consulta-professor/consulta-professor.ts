import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslationService } from '../../../core/services/translation.service';
import { SchoolDataService } from '../../../core/services/school-data';
import { ProfessorService, Professor } from '../../../core/services/professor.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ConfirmationService } from '../../../core/services/confirmation.service';

import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { SelectComponent } from '../../../core/components/select/select.component';
import { TableComponent, TableColumn } from '../../../core/components/table/table.component';

@Component({
  selector: 'app-consulta-professor',
  standalone: true,
  imports: [
    CommonModule,
    MatMenuModule,
    MatButtonModule,
    ReactiveFormsModule,
    SelectComponent,
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

  // Filters
  subjectFilter = new FormControl<string | null>(null);
  statusFilter = new FormControl<string | null>(null);

  // Signal-based filter values for computed reactivity
  subjectFilterValue = toSignal(this.subjectFilter.valueChanges, { initialValue: null });
  statusFilterValue = toSignal(this.statusFilter.valueChanges, { initialValue: null });

  // Determines if the "Clear Filters" button should be visible
  isFilterActive = computed(() => !!this.subjectFilterValue() || !!this.statusFilterValue());

  subjectOptions = computed(() => [
    { value: null, label: 'Todas as Disciplinas' },
    ...this.schoolData.subjects().map((s) => ({ value: s.id, label: s.name })),
  ]);

  statusOptions = computed(() => [
    { value: null, label: 'Todos os Status' },
    { value: 'available', label: 'Disponível' },
    { value: 'full', label: 'Ocupado' },
    { value: 'overloaded', label: 'Sobrecarga' },
  ]);

  rawTeachers = signal<Professor[]>([]);

  ngOnInit() {
    this.loadTeachers();
  }

  loadTeachers() {
    this.professorService.getAll().subscribe((res: any) => {
      setTimeout(() => {
        const data = res && res.data ? res.data : res;
        this.rawTeachers.set(data);
      });
    });
  }

  teachers = computed(() => {
    const subjects = this.schoolData.subjects();
    const subFilter = this.subjectFilterValue();
    const statFilter = this.statusFilterValue();

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
        const matchesSubject =
          !subFilter ||
          t.mainSubjectId === subFilter ||
          (t.secondarySubjectIds || []).includes(subFilter);
        const matchesStatus = !statFilter || t.status === statFilter;
        return matchesSubject && matchesStatus;
      });
  });

  navigateToNew() {
    this.router.navigate(['/professores/novo']);
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/professores/editar', id]);
  }

  async deleteTeacher(id: string) {
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.teachers.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.professorService.delete(id).subscribe(() => {
        this.loadTeachers();
      });
    }
  }

  getRemainingSubjectsTooltip(teacher: any): string {
    const remaining = teacher.subjects.slice(2);
    return remaining.map((s: any) => `${s.name} (${s.workload}h)`).join(', ');
  }
}
