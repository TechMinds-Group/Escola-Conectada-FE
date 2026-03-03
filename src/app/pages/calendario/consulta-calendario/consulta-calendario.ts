import { Component, inject, signal, computed, effect, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../core/services/translation.service';
import { EventoService, Evento } from '../../../core/services/evento.service';
import { addMonths, subMonths, startOfToday, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarModule, CalendarView, CalendarEvent } from 'angular-calendar';
import { ModalManageEventComponent } from '../../../core/components/modals/modal-manage-event/modal-manage-event.component';
import { ModalManageListComponent } from '../../../core/components/modals/modal-manage-list/modal-manage-list.component';

@Component({
  selector: 'app-consulta-calendario',
  standalone: true,
  imports: [CommonModule, CalendarModule, ModalManageEventComponent, ModalManageListComponent],
  templateUrl: './consulta-calendario.html',
  styleUrl: './consulta-calendario.scss',
})
export class ConsultaCalendario implements OnInit {
  @ViewChild(ModalManageEventComponent) eventModal!: ModalManageEventComponent;
  @ViewChild('categoryModal') categoryModal!: ModalManageListComponent;

  private translation = inject(TranslationService);
  private eventoService = inject(EventoService);
  t = this.translation.dictionary;

  // Categorias vindas do serviço
  eventCategories = this.eventoService.eventCategories;
  showCategoryManager = signal(false);

  // Variables simples (conforme solicitado para evitar () no template)
  // State reativo para a data de visualização
  viewDate = signal<Date>(new Date());
  calendarView: CalendarView = CalendarView.Month;
  CalendarView = CalendarView; // Para usar no template

  // State
  isModalOpen = signal(false);
  activeFilters = signal<string[]>([]);

  // Sincronizar filtros ativos com as categorias disponíveis
  private syncFilters = effect(
    () => {
      const cats = this.eventCategories();
      // Na primeira carga ou se categorias mudarem, selecionamos tudo por padrão
      this.activeFilters.set(cats);
    },
    { allowSignalWrites: true },
  );

  // Events Data
  rawEvents = signal<Evento[]>([]);

  // Computed for Calendar Events
  events = computed<CalendarEvent[]>(() => {
    const filters = this.activeFilters();
    return this.rawEvents()
      .filter((e) => filters.includes(e.categoria))
      .map((e) => ({
        id: e.id,
        start: e.dataInicio ? parseISO(e.dataInicio) : new Date(),
        end: e.dataFim ? parseISO(e.dataFim) : undefined,
        title: e.titulo,
        color: this.getEventColor(e.categoria),
        meta: e,
      }));
  });

  viewMonth = computed(() => {
    return format(this.viewDate(), 'MMMM', { locale: ptBR });
  });

  viewYear = computed(() => {
    return format(this.viewDate(), 'yyyy', { locale: ptBR });
  });

  viewTitle = computed(() => {
    return format(this.viewDate(), 'MMMM yyyy', { locale: ptBR });
  });

  constructor() {
    effect(() => {
      const updated = this.eventoService.eventosUpdated();
      this.loadEvents();
    });
  }

  ngOnInit() {
    this.loadEvents();
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  private checkScreenSize() {
    this.calendarView = window.innerWidth < 768 ? CalendarView.Day : CalendarView.Month;
  }

  loadEvents() {
    this.eventoService.getAll().subscribe({
      next: (events) => this.rawEvents.set(events),
      error: (err) => console.error('Erro ao carregar eventos:', err),
    });
  }

  getEventColor(category: string): any {
    switch (category) {
      case 'Prova':
        return { primary: '#0d6efd', secondary: '#0d6efd' }; // Azul
      case 'Reunião':
        return { primary: '#ffc107', secondary: '#ffc107' }; // Amarelo
      case 'Feriado':
        return { primary: '#dc3545', secondary: '#dc3545' }; // Vermelho
      case 'Evento Festivo':
        return { primary: '#6610f2', secondary: '#6610f2' }; // Roxo
      default:
        return { primary: '#6c757d', secondary: '#6c757d' };
    }
  }

  // Navigation
  incrementDate() {
    this.viewDate.update((d) => addMonths(d, 1));
  }

  decrementDate() {
    this.viewDate.update((d) => subMonths(d, 1));
  }

  today() {
    this.viewDate.set(startOfToday());
  }

  // Interaction Handlers
  handleDayClick(date: Date) {
    this.isModalOpen.set(true);
    this.eventModal.startNew(date);
  }

  handleEventClick(event: CalendarEvent) {
    this.isModalOpen.set(true);
    this.eventModal.startEdit(event.meta);
  }

  // Filters
  toggleFilter(category: string) {
    this.activeFilters.update((filters) => {
      if (filters.includes(category)) {
        return filters.filter((f) => f !== category);
      } else {
        return [...filters, category];
      }
    });
  }

  isFilterActive(category: string): boolean {
    return this.activeFilters().includes(category);
  }

  navigateToNew() {
    this.handleDayClick(new Date());
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  // Category Management
  openCategoryManager() {
    this.showCategoryManager.set(true);
  }

  closeCategoryManager() {
    this.showCategoryManager.set(false);
  }

  saveCategory(item: { id?: string; name: string }) {
    if (item.id) {
      this.eventoService.updateCategory(item.id, item.name);
    } else {
      this.eventoService.addCategory(item.name);
    }
    this.categoryModal.reset();
  }

  deleteCategory(name: string) {
    this.eventoService.deleteCategory(name);
  }

  get categoryItems() {
    return this.eventCategories().map((c) => ({ id: c, name: c }));
  }
}
