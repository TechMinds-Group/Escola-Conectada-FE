import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  SchoolDataService,
  SchoolMatrix as SchoolMatrixModel,
} from '../../../core/services/school-data';
import { TranslationService } from '../../../core/services/translation.service';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';
import { TableComponent } from '../../../core/components/table/table.component';

@Component({
  selector: 'app-consulta-matriz-escolar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TextInputComponent,
    SelectComponent,
    TableComponent,
  ],
  templateUrl: './consulta-matriz-escolar.html',
  styleUrl: './consulta-matriz-escolar.scss',
})
export class ConsultaMatrizEscolarPage {
  public schoolData = inject(SchoolDataService);
  public translation = inject(TranslationService);
  private router = inject(Router);
  t = this.translation.dictionary;

  // Filters State
  showFilters = signal(false);
  filterName = new FormControl('');
  filterStatus = new FormControl('Todos');
  appliedFilters = signal<any[]>([]);

  // Original list
  matricesList = this.schoolData.schoolMatrices;

  // Filtered computed list
  matrices = computed(() => {
    let list = this.matricesList();
    const name = this.filterName.value?.toLowerCase().trim();
    const status = this.filterStatus.value;

    if (name) {
      list = list.filter((m) => m.name.toLowerCase().includes(name));
    }

    if (status && status !== 'Todos') {
      list = list.filter((m) => m.status === status);
    }

    return list;
  });

  statusOptions = [
    { value: 'Todos', label: 'Todos os Status' },
    { value: 'Ativa', label: 'Ativa' },
    { value: 'Inativa', label: 'Inativa' },
  ];

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  applyFilters() {
    const filters = [];
    if (this.filterName.value)
      filters.push({ key: 'name', label: `Nome: ${this.filterName.value}` });
    if (this.filterStatus.value !== 'Todos')
      filters.push({ key: 'status', label: `Status: ${this.filterStatus.value}` });

    this.appliedFilters.set(filters);
    this.showFilters.set(false);
  }

  clearFilters() {
    this.filterName.setValue('');
    this.filterStatus.setValue('Todos');
    this.appliedFilters.set([]);
  }

  removeFilter(key: string) {
    if (key === 'name') this.filterName.setValue('');
    if (key === 'status') this.filterStatus.setValue('Todos');
    this.applyFilters();
  }

  onRowClick(matrix: SchoolMatrixModel) {
    this.router.navigate(['/school-matrices/edit', matrix.id]);
  }

  // Helpers for Template (Display only)
  getMatrixTotalHours(matrix: SchoolMatrixModel) {
    return matrix.levels.reduce((acc, level) => {
      const levelHours = level.subjects.reduce((sum, s) => {
        if (s.isInternship) {
          return sum + (s.internshipHours || 0);
        }
        return sum + Math.round((s.weeklyLessons * level.lessonDuration * level.schoolWeeks) / 60);
      }, 0);
      return acc + levelHours;
    }, 0);
  }

  getMatrixLevelsSummary(matrix: SchoolMatrixModel) {
    return matrix.levels.map((l) => l.level).join(', ');
  }
}
