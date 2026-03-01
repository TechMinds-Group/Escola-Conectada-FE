import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { SchoolDataService } from '../../../core/services/school-data';
import { ProfessorService, Professor } from '../../../core/services/professor.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-consulta-professor',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatButtonModule],
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
    return this.rawTeachers().map((t) => {
      // Calculate Workload
      const allocatedWorkload = t.allocatedWorkload || 0;
      const contractualWorkload = t.contractualWorkload || 20; // Default if missing

      // Resolve Subjects
      const mainSubject = subjects.find((s) => s.id === t.mainSubjectId);
      const secondarySubjects = (t.secondarySubjectIds || [])
        .map((id) => subjects.find((s) => s.id === id))
        .filter((s) => !!s);

      return {
        ...t,
        allocatedWorkload,
        contractualWorkload,
        mainSubject,
        secondarySubjects,
        // Status logic
        freeHours: Math.max(0, contractualWorkload - allocatedWorkload),
        isOverloaded: allocatedWorkload > contractualWorkload,
        isFull: allocatedWorkload >= contractualWorkload,
        usagePercentage: Math.min(100, Math.round((allocatedWorkload / contractualWorkload) * 100)),
      };
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
