import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SchoolDataService, Subject, ThematicAxis } from '../../../core/services/school-data';
import { TranslationService } from '../../../core/services/translation.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';
import { TableComponent } from '../../../core/components/table/table.component';

@Component({
  selector: 'app-consulta-materia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TextInputComponent, SelectComponent, TableComponent],
  templateUrl: './consulta-materia.html',
  styleUrl: './consulta-materia.scss',
})
export class ConsultaMateria implements OnInit {
  public schoolData = inject(SchoolDataService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  private confirmationService = inject(ConfirmationService);
  t = this.translation.dictionary;

  // Filter Controls
  showFilters = signal(false);
  filterName = new FormControl('');
  filterArea = new FormControl('Todas');
  filterStatus = new FormControl('Todos');

  // Multi-select or Badge Filter State
  appliedFilters = computed(() => {
    const filters: { key: string; label: string }[] = [];
    const name = this.filterName.value;
    const area = this.filterArea.value;
    const status = this.filterStatus.value;

    if (name) filters.push({ key: 'name', label: `Nome: ${name}` });
    if (area && area !== 'Todas') filters.push({ key: 'area', label: `Área: ${area}` });
    if (status && status !== 'Todos') filters.push({ key: 'status', label: `Status: ${status}` });

    return filters;
  });

  // Data
  subjects = computed(() => {
    let list = this.schoolData.subjects();
    const name = this.filterName.value?.toLowerCase().trim();
    const area = this.filterArea.value;
    const status = this.filterStatus.value;

    if (name) {
      list = list.filter((s) => s.name.toLowerCase().includes(name));
    }

    if (area && area !== 'Todas') {
      list = list.filter((s) => s.axis === area);
    }

    // Status filter if implemented in entity
    // if (status && status !== 'Todos') { ... }

    return list;
  });

  // Options
  areaOptions = computed(() => {
    return [
      { value: 'Todas', label: 'Todas as Áreas' },
      ...this.schoolData.thematicAxes().map((axis) => ({ value: axis, label: axis })),
    ];
  });

  statusOptions = [
    { value: 'Todos', label: 'Todos os Status' },
    { value: 'Ativo', label: 'Ativo' },
    { value: 'Inativo', label: 'Inativo' },
  ];

  ngOnInit() {
    this.schoolData.loadSubjects();
  }

  toggleFilters() {
    this.showFilters.update((v) => !v);
  }

  clearFilters() {
    this.filterName.setValue('');
    this.filterArea.setValue('Todas');
    this.filterStatus.setValue('Todos');
  }

  removeFilter(key: string) {
    if (key === 'name') this.filterName.setValue('');
    if (key === 'area') this.filterArea.setValue('Todas');
    if (key === 'status') this.filterStatus.setValue('Todos');
  }

  navigateToNew() {
    this.router.navigate(['/subjects/new']);
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/subjects/edit', id]);
  }

  async deleteSubject(id: string) {
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.subjects.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      await this.schoolData.deleteSubject(id);
    }
  }
}
