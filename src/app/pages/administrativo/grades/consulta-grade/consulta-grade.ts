import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SchoolDataService } from '../../../../core/services/school-data';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslationService } from '../../../../core/services/translation.service';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { SelectComponent } from '../../../../core/components/select/select.component';
import { TextInputComponent } from '../../../../core/components/text-input/text-input.component';
import { TableComponent } from '../../../../core/components/table/table.component';

@Component({
  selector: 'app-consulta-grade',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    SelectComponent,
    TextInputComponent,
    TableComponent,
  ],
  templateUrl: './consulta-grade.html',
  styleUrl: './consulta-grade.scss',
})
export class ConsultaGrade implements OnInit {
  private schoolData = inject(SchoolDataService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  // State
  isFilterPanelOpen = signal(false);
  isLoading = signal(false);

  // Form Controls
  nameFilter = new FormControl('');
  shiftFilter = new FormControl<string | null>(null);

  // Values currently applied to the list
  appliedFilters = signal({
    name: '',
    shift: null as string | null,
  });

  // Determines if any filter is applied
  isFilterActive = computed(() => !!this.appliedFilters().name || !!this.appliedFilters().shift);

  shiftOptions = computed(() => [
    { value: null, label: 'Todos os Turnos' },
    { value: 'Manhã', label: 'Manhã' },
    { value: 'Tarde', label: 'Tarde' },
    { value: 'Noite', label: 'Noite' },
    { value: 'Integral', label: 'Integral' },
  ]);

  grids = computed(() => {
    const allGrids = this.schoolData.schoolTimeGrids();
    const filters = this.appliedFilters();
    const nameSearch = (filters.name || '').toLowerCase();

    return allGrids.filter((grid) => {
      const matchesName = !nameSearch || grid.name.toLowerCase().includes(nameSearch);
      const matchesShift = !filters.shift || grid.shift === filters.shift;
      return matchesName && matchesShift;
    });
  });

  ngOnInit() {
    this.schoolData.loadTimeGrids();
  }

  toggleFilterPanel() {
    this.isFilterPanelOpen.update((v: boolean) => !v);
  }

  applyFilters() {
    this.appliedFilters.set({
      name: this.nameFilter.value || '',
      shift: this.shiftFilter.value,
    });
  }

  clearFilters() {
    this.nameFilter.setValue('');
    this.shiftFilter.setValue(null);
    this.applyFilters();
  }

  navigateToAdd() {
    this.router.navigate(['/time-grids/new']);
  }

  editGrid(id: string) {
    this.router.navigate(['/time-grids/edit', id]);
  }

  getShiftColor(shift: string): string {
    switch (shift) {
      case 'Manhã':
        return 'info';
      case 'Tarde':
        return 'danger';
      case 'Noite':
        return 'indigo';
      case 'Integral':
        return 'success';
      default:
        return 'primary';
    }
  }

  getShiftName(shift: string): string {
    const shifts = this.t().admin.timegrid.shifts as Record<string, string>;
    return shifts[shift] || shift;
  }

  countLessons(slots: any[]): number {
    return slots.filter((s) => s.type === 'Aula').length;
  }
}
