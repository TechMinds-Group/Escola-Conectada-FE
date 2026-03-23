import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EquipamentoService, Equipamento } from '../../../core/services/equipamento.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { TableComponent } from '../../../core/components/table/table.component';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';
import { AuthService } from '../../../core/services/auth.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-consulta-equipamento',
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
    DatePipe
  ],
  templateUrl: './consulta-equipamento.html',
  styles: [`
    .grid-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
    }
  `]
})
export class ConsultaEquipamento implements OnInit {
  private EquipamentoService = inject(EquipamentoService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private authService = inject(AuthService);

  private normalizeStr(str: string): string {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  // Consultar Panel State (Admin Only)
  isConsultarPanelOpen = signal(false);
  reservasList = signal<any[]>([]);
  filterReservaName = new FormControl('');
  searchReserva = signal(''); // New!

  reservasFiltradas = computed(() => {
    let list = this.reservasList();
    const search = this.searchReserva();

    if (search) {
      const normalizedSearch = this.normalizeStr(search);
      list = list.filter((r) => 
        this.normalizeStr(r.equipamentoNome).includes(normalizedSearch) ||
        this.normalizeStr(r.nomeCompleto).includes(normalizedSearch)
      );
    }
    return list;
  });

  colsReservas = [
    { header: 'Equipamento', key: 'equipamentoNome', width: '30%' },
    { header: 'Solicitante', key: 'nomeCompleto', width: '25%' },
    { header: 'Data/Turno', template: 'dataTpl', width: '25%' },
    { header: 'Horas', key: 'horas', width: '10%' },
    { header: 'Ações', template: 'acoesTpl', width: '10%' }
  ];

  // Filters State
  isFilterPanelOpen = signal(false);
  filterName = new FormControl('');
  filterType = new FormControl('Todos');
  appliedFilters = signal({ name: '', type: 'Todos' });

  // Data
  equipamentosList = signal<Equipamento[]>([]);

  equipamentos = computed(() => {
    let list = this.equipamentosList();
    const filters = this.appliedFilters();
    const name = filters.name;
    const type = filters.type;

    if (name) {
      const normalizedSearch = this.normalizeStr(name);
      list = list.filter((e) => this.normalizeStr(e.nome).includes(normalizedSearch));
    }
    if (type && type !== 'Todos') {
      list = list.filter((e) => e.tipo === type);
    }
    return list;
  });

  typeOptions = computed(() => {
    const types = Array.from(new Set(this.equipamentosList().map((e) => e.tipo)));
    return [
      { value: 'Todos', label: 'Todos os Tipos' },
      ...types.map((t) => ({ value: t, label: t }))
    ];
  });

  isFilterActive = computed(() => !!this.appliedFilters().name || this.appliedFilters().type !== 'Todos');

  ngOnInit() {
    this.loadEquipamentos();
    
    // bind filter changes to signal for computed reactivity
    this.filterReservaName.valueChanges.subscribe((v) => {
      this.searchReserva.set(v || '');
    });
  }

  loadEquipamentos() {
    this.EquipamentoService.list().subscribe({
      next: (res: any) => {
        const data = res && res.data ? res.data : res;
        this.equipamentosList.set(data);
      },
      error: () => this.notification.error('Erro ao carregar equipamentos.')
    });
  }

  toggleFilterPanel() {
    this.isFilterPanelOpen.update((v) => !v);
    if (this.isFilterPanelOpen()) {
      this.isConsultarPanelOpen.set(false);
    }
  }

  applyFilters() {
    this.appliedFilters.set({
      name: this.filterName.value || '',
      type: this.filterType.value || 'Todos'
    });
  }

  clearFilters() {
    this.filterName.setValue('');
    this.filterType.setValue('Todos');
    this.applyFilters();
  }

  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }

  toggleConsultarPanel() {
    this.isConsultarPanelOpen.update((v) => !v);
    if (this.isConsultarPanelOpen()) {
      this.isFilterPanelOpen.set(false);
      this.loadReservas();
    }
  }

  loadReservas() {
    this.EquipamentoService.listReservas().subscribe({
      next: (res: any) => {
        const data = res && res.data ? res.data : res;
        this.reservasList.set(data);
      },
      error: () => this.notification.error('Erro ao carregar agendamentos.')
    });
  }

  async cancelarReserva(id: string) {
    const confirmed = await this.confirmationService.confirm({
      message: 'Deseja realmente cancelar este agendamento?',
      confirmClass: 'btn-danger',
      confirmLabel: 'Cancelar'
    });

    if (confirmed) {
      this.EquipamentoService.cancelarReserva(id).subscribe({
        next: () => {
          this.notification.success('Agendamento cancelado com sucesso.');
          this.loadReservas();
        },
        error: () => this.notification.error('Erro ao cancelar agendamento.')
      });
    }
  }

  navigateToNew() {
    this.router.navigate(['/equipamentos/new']);
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/equipamentos/edit', id]);
  }

  async deleteEquipamento(id: string) {
    const confirmed = await this.confirmationService.confirm({
      message: 'Deseja realmente excluir este equipamento?',
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir'
    });

    if (confirmed) {
      this.EquipamentoService.delete(id).subscribe({
        next: () => {
          this.notification.success('Equipamento excluído com sucesso.');
          this.loadEquipamentos();
        },
        error: () => this.notification.error('Erro ao excluir equipamento.')
      });
    }
  }

  agendarEquipamento(id: string) {
    this.notification.info('Funcionalidade de Agendamento será implementada em breve.');
  }
}
