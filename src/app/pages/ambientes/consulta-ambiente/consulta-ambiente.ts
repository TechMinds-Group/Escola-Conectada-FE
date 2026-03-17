import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SchoolDataService, SchoolRoom } from '../../../core/services/school-data';
import { AmbienteService } from '../../../core/services/ambiente.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../../core/services/language.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TableComponent } from '../../../core/components/table/table.component';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-consulta-ambiente',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    TableComponent,
    TextInputComponent,
    SelectComponent,
  ],
  templateUrl: './consulta-ambiente.html',
  styleUrl: './consulta-ambiente.scss',
})
export class ConsultaAmbiente implements OnInit, AfterViewInit {
  public lang = inject(LanguageService);
  public schoolData = inject(SchoolDataService);
  private ambienteService = inject(AmbienteService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  private cdr = inject(ChangeDetectorRef);
  private confirmationService = inject(ConfirmationService);
  private notification = inject(NotificationService);
  t: any = this.translation.dictionary;

  // Filters State
  isFilterPanelOpen = signal(false);
  filterName = new FormControl('');
  filterType = new FormControl('Todos');
  appliedFilters = signal({
    name: '',
    type: 'Todos',
  });

  // Data
  roomsList = signal<SchoolRoom[]>([]);

  rooms = computed(() => {
    let list = this.roomsList();
    const filters = this.appliedFilters();
    const name = filters.name.toLowerCase();
    const type = filters.type;

    if (name) {
      list = list.filter((r) => r.name.toLowerCase().includes(name));
    }
    if (type && type !== 'Todos') {
      list = list.filter((r) => r.type === type);
    }
    return list;
  });

  isFilterActive = computed(
    () =>
      !!this.appliedFilters().name ||
      this.appliedFilters().type !== 'Todos',
  );

  ngOnInit() {
    this.loadRooms();
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  loadRooms() {
    this.ambienteService.list().subscribe({
      next: (res: any) => {
        const rooms = res && res.data ? res.data : res;
        this.roomsList.set(rooms);
        // Sync with mock schoolData for consistency in other parts of app if needed
        this.schoolData.schoolRooms.set(rooms);
      },
      error: () => {},
    });
  }

  toggleFilterPanel() {
    this.isFilterPanelOpen.update((v) => !v);
  }

  applyFilters() {
    this.appliedFilters.set({
      name: this.filterName.value || '',
      type: this.filterType.value || 'Todos',
    });
  }

  clearFilters() {
    this.filterName.setValue('');
    this.filterType.setValue('Todos');
    this.applyFilters();
  }

  removeFilter(key: string) {
    if (key === 'name') this.filterName.setValue('');
    if (key === 'type') this.filterType.setValue('Todos');
    this.applyFilters();
  }

  getResourceLabel(res: string): string {
    const resources = this.t().admin.rooms.form.resources as Record<string, string>;
    return resources[res] || res;
  }

  navigateToNew() {
    this.router.navigate(['/ambientes/new']);
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/ambientes/edit', id]);
  }

  async deleteRoom(id: string) {
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.rooms.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.ambienteService.delete(id).subscribe({
        next: () => this.loadRooms(),
        error: (err) => {
          let errorMessage = 'Erro ao excluir ambiente.';
          if (err.error) {
            if (typeof err.error === 'string') errorMessage = err.error;
            else if (err.error.message) errorMessage = err.error.message;
            else if (err.error.errors) {
              const firstKey = Object.keys(err.error.errors)[0];
              if (firstKey && err.error.errors[firstKey].length > 0) {
                errorMessage = err.error.errors[firstKey][0];
              }
            }
          }
          this.notification.error(errorMessage);
        },
      });
    }
  }

  // Options for selects
  typeOptions = computed(() => {
    return [
      { value: 'Todos', label: 'Todos os Tipos' },
      ...this.schoolData.roomTypes().map((t) => ({ value: t.name, label: t.name })),
    ];
  });


  completeTutorial() {
    this.ambienteService.completeTutorial();
  }
}
