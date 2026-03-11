import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Aviso, AvisoService } from '../../../core/services/aviso.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { TableComponent } from '../../../core/components/table/table.component';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-consulta-avisos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableComponent,
    TextInputComponent,
    SelectComponent,
  ],
  templateUrl: './consulta-avisos.html',
  styleUrl: './consulta-avisos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultaAvisos implements OnInit {
  private avisoService = inject(AvisoService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  private confirmationService = inject(ConfirmationService);

  t = this.translation.dictionary;

  // Filters
  showFilters = signal(false);
  filterSubject = new FormControl('');
  filterType = new FormControl('Todos');

  appliedFilters = signal<any[]>([]);

  // Data
  avisosList = signal<Aviso[]>([]);
  isLoading = signal<boolean>(false);

  avisos = computed(() => {
    let list = this.avisosList();
    const subject = this.filterSubject.value?.toLowerCase();
    const type = this.filterType.value;

    if (subject) {
      list = list.filter((a) => a.title.toLowerCase().includes(subject));
    }

    if (type && type !== 'Todos') {
      list = list.filter((a) => a.type === type);
    }

    return list;
  });

  // Options for selects
  typeOptions = computed(() => {
    return [
      { value: 'Todos', label: 'Todos os Tipos' },
      { value: 'Informativo', label: 'Informativo' },
      { value: 'Urgente', label: 'Urgente' },
      { value: 'Sucesso', label: 'Sucesso' },
    ];
  });

  ngOnInit() {
    this.loadAvisos();
  }

  onBack() {
    this.router.navigate(['/']);
  }

  loadAvisos() {
    this.isLoading.set(true);
    this.avisoService.list().subscribe({
      next: (res) => {
        this.avisosList.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  getTipoBadge(type: string): string {
    switch (type) {
      case 'Urgente':
        return 'bg-danger text-white';
      case 'Informativo':
        return 'bg-info text-white';
      case 'Sucesso':
        return 'bg-success text-white';
      default:
        return 'bg-secondary text-white';
    }
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  applyFilters() {
    const filters = [];
    if (this.filterSubject.value)
      filters.push({ key: 'subject', label: `Assunto: ${this.filterSubject.value}` });
    if (this.filterType.value !== 'Todos')
      filters.push({ key: 'type', label: `Tipo: ${this.filterType.value}` });

    this.appliedFilters.set(filters);
    this.showFilters.set(false);
  }

  clearFilters() {
    this.filterSubject.setValue('');
    this.filterType.setValue('Todos');
    this.appliedFilters.set([]);
  }

  removeFilter(key: string) {
    if (key === 'subject') this.filterSubject.setValue('');
    if (key === 'type') this.filterType.setValue('Todos');
    this.applyFilters();
  }

  alternarAtivo(aviso: Aviso) {
    const updated = { ...aviso, active: !aviso.active };
    this.avisoService.update(aviso.id!, updated).subscribe({
      next: () => this.loadAvisos(),
      error: () => {},
    });
  }

  navigateToNew() {
    this.router.navigate(['/avisos/new']);
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/avisos/edit', id]);
  }

  async deleteAviso(id: string) {
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.notices.form.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: this.t().admin.notices.buttons.delete,
    });

    if (confirmed) {
      this.avisoService.delete(id).subscribe({
        next: () => this.loadAvisos(),
        error: () => {},
      });
    }
  }
}
