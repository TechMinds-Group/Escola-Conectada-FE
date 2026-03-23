import { Component, computed, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../core/services/translation.service';
import { ActivatedRoute } from '@angular/router';
import { AmbienteService } from '../../core/services/ambiente.service';
import { ProfessorService, Professor } from '../../core/services/professor.service';
import { ReservaService, Reserva } from '../../core/services/reserva.service';
import { AuthService, User } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  SchoolDataService,
  SchoolRoom,
  SchoolClass,
  Teacher,
} from '../../core/services/school-data';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SelectComponent } from '../../core/components/select/select.component';
import { TmDateComponent } from '../../core/components/tm-date/tm-date.component';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'app-reservas-salas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatFormFieldModule,
    SelectComponent,
    TmDateComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './reservas-salas.html',
  styleUrl: './reservas-salas.scss',
})
export class ReservasSalas implements OnInit {
  public translation = inject(TranslationService);
  private ambienteService = inject(AmbienteService);
  private professorService = inject(ProfessorService);
  private reservaService = inject(ReservaService);
  private schoolData = inject(SchoolDataService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private route = inject(ActivatedRoute);
  t = this.translation.dictionary;

  user = computed<User | null>(() => this.authService.currentUser());
  isAdmin = computed<boolean>(
    () =>
      this.user()?.roles?.includes('Administrador') ||
      this.user()?.roles?.includes('SuperAdmin') ||
      false,
  );

  // Real Data
  professoresApi = signal<Professor[]>([]);
  schoolRoomsApi = signal<SchoolRoom[]>([]);
  reservasApi = signal<Reserva[]>([]);
  isLoading = signal(true);
  isLoadingAvailability = signal(false);
  isFilterPanelOpen = signal(false);

  schoolClassesApi = computed(() => this.schoolData.schoolClasses());
  teachersApi = computed(() => this.schoolData.teachers());

  // Time Filter State
  timeGridsApi = computed(() => this.schoolData.schoolTimeGrids());

  turnos = computed(() => {
    const grids = this.timeGridsApi();
    const uniqueShifts = new Set<string>();
    grids.forEach((g) => uniqueShifts.add(g.shift));
    if (uniqueShifts.size === 0) return ['Manhã', 'Tarde', 'Noite'];
    const defaultShifts = ['Manhã', 'Tarde', 'Noite', 'Integral'];
    return Array.from(uniqueShifts).sort(
      (a, b) => defaultShifts.indexOf(a) - defaultShifts.indexOf(b),
    );
  });

  horariosMenu = computed(() => {
    const grids = this.timeGridsApi();
    const menu: Record<
      string,
      { id: string; label: string; slotIndex: number; start: string; end: string }[]
    > = {};

    this.turnos().forEach((turno) => {
      menu[turno] = [];
    });

    grids.forEach((grid) => {
      const shift = grid.shift;
      if (!menu[shift]) menu[shift] = [];
      grid.slots
        .filter((s) => s.type === 'Aula')
        .forEach((slot) => {
          const timeId = slot.start;
          if (!menu[shift].find((s) => s.id === timeId)) {
            menu[shift].push({
              id: timeId,
              label: `${slot.index}º Horário (${slot.start} as ${slot.end})`,
              slotIndex: slot.index || 0,
              start: slot.start,
              end: slot.end,
            });
          }
        });
    });

    Object.keys(menu).forEach((turno) => {
      menu[turno].sort((a, b) => a.start.localeCompare(b.start));
    });

    // Fallback if grids are empty
    if (Object.values(menu).every((v) => v.length === 0)) {
      menu['Manhã'] = [
        {
          id: '07:00',
          label: '1º Horário (07:00 as 07:50)',
          slotIndex: 1,
          start: '07:00',
          end: '07:50',
        },
        {
          id: '07:50',
          label: '2º Horário (07:50 as 08:40)',
          slotIndex: 2,
          start: '07:50',
          end: '08:40',
        },
      ];
      menu['Tarde'] = [
        {
          id: '13:00',
          label: '1º Horário (13:00 as 13:50)',
          slotIndex: 1,
          start: '13:00',
          end: '13:50',
        },
      ];
      menu['Noite'] = [
        {
          id: '19:00',
          label: '1º Horário (19:00 as 19:50)',
          slotIndex: 1,
          start: '19:00',
          end: '19:50',
        },
      ];
    }

    return menu;
  });

  selectedTurno = signal<string>('Manhã');
  selectedTimeId = signal<string>('07:00');
  selectedDate = signal<string>(format(new Date(), 'yyyy-MM-dd')); // YYYY-MM-DD
  selectedResources = signal<string[]>([]);

  appliedFilters = signal({
    turno: 'Manhã',
    timeId: '07:00',
    date: format(new Date(), 'yyyy-MM-dd'),
    resources: [] as string[],
  });

  isFilterActive = computed(() => {
    const applied = this.appliedFilters();
    return (
      applied.turno !== 'Manhã' ||
      applied.timeId !== '07:00' ||
      applied.date !== new Date().toISOString().split('T')[0] ||
      applied.resources.length > 0
    );
  });

  // Para o MatDatepicker (trabalha com objetos Date)
  selectedDateObj = computed(() => {
    const iso = this.selectedDate();
    return iso ? parseISO(iso) : new Date();
  });

  displayDate = computed(() => {
    const date = this.selectedDate();
    if (!date) return '';
    const d = parseISO(date);
    return format(d, 'dd/MM/yyyy');
  });

  // Availability View Data
  availabilityData = signal<any[]>([]);

  // Filter by Resources
  availableResources = computed(() => {
    const res = new Set<string>();
    this.availabilityData().forEach((item) => {
      item.recursos?.forEach((r: string) => res.add(r));
    });
    return Array.from(res).sort();
  });

  filteredAvailability = computed(() => {
    const data = this.availabilityData();
    const resources = this.appliedFilters().resources;
    if (resources.length === 0) return data;
    return data.filter((item) => resources.every((r) => item.recursos?.includes(r)));
  });

  availableTimes = computed(() => this.horariosMenu()[this.selectedTurno()] || []);

  // Pending reservations (Pendente status from API)
  pendencias = computed(() => {
    const reservas = this.reservasApi();
    const currentUser = this.user();
    const isUserAdmin = this.isAdmin();

    return reservas.filter((r) => {
      if (r.status !== 'Pendente') return false;
      if (isUserAdmin) return true;

      const profId = currentUser?.professorId;
      // Ver se eu sou o professor afetado (quem tem que aprovar) OU se eu sou o solicitante (quem quer a sala)
      return r.affectedProfessorId === profId || r.professorId === profId;
    });
  });

  // Modal State
  isModalOpen = signal(false);
  selectedRoomForModal = signal<any | null>(null);
  requestTeacherId = signal('');
  requestReason = signal('');
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  getAutoTurno(): string {
    const settings = this.schoolData.tvSettings();
    const triggers = settings.shiftTriggers;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const toMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const morningMins = toMinutes(triggers.morning);
    const afternoonMins = toMinutes(triggers.afternoon);
    const nightMins = toMinutes(triggers.night);

    if (currentMins >= nightMins) return 'Noite';
    if (currentMins >= afternoonMins) return 'Tarde';
    return 'Manhã';
  }

  constructor() {
    // Auto-select first shift
    effect(() => {
      const turnos = this.turnos();
      if (turnos.length > 0 && !turnos.includes(this.selectedTurno())) {
        this.selectedTurno.set(turnos[0]);
      }
    });

    // Auto-select first time of selected shift
    effect(() => {
      const turnoFilter = this.selectedTurno();
      const times = this.horariosMenu()[turnoFilter] || [];
      const currentId = this.selectedTimeId();
      if (times.length > 0 && currentId && !times.some((t) => t.id === currentId)) {
        this.selectedTimeId.set(times[0].id);
      }
    });

    // Auto-refresh Availability View when Applied Filters change
    effect(() => {
      const applied = this.appliedFilters();
      // Use timeId if available (HH:mm format), otherwise use the shift name
      this.loadAvailability(applied.date, applied.timeId || applied.turno);
    });
  }

  ngOnInit() {
    this.schoolData.loadClasses();

    const autoTurno = this.getAutoTurno();
    this.selectedTurno.set(autoTurno);
    const times = this.horariosMenu()[autoTurno] || [];
    if (times.length > 0) {
      this.selectedTimeId.set(times[0].id);
    } else {
      this.selectedTimeId.set('');
    }
    this.applyFilters();

    this.ambienteService.list().subscribe({
      next: (salas) => this.schoolRoomsApi.set(salas),
      error: () => {},
    });

    this.professorService.getAll().subscribe({
      next: (profs) => this.professoresApi.set(profs),
      error: () => {},
    });

    // Initial loads
    this.loadReservas();
    // loadAvailability será executado pelo effect de appliedFilters

    // Check for reservaId in query params
    this.route.queryParams.subscribe((params) => {
      const reservaId = params['reservaId'];
      if (reservaId) {
        this.openSelectionByReservaId(reservaId);
      }
    });
  }

  private openSelectionByReservaId(reservaId: string) {
    // Wait for data to load then find and open
    effect(
      () => {
        const reservas = this.reservasApi();
        const rooms = this.availabilityData();
        if (reservas.length > 0 && rooms.length > 0) {
          const res = reservas.find((r) => r.id === reservaId);
          if (res) {
            const room = rooms.find((rm) => rm.salaId === res.salaId);
            if (room) {
              this.selectedDate.set(res.data.split('T')[0]);
              this.selectedTimeId.set(res.horarioInicio);
              this.applyFilters();
              // Additional logic to open modal if needed, but usually just highlighting or selecting is enough
              // For this UX, let's open the details/modal
              this.openRequestModal(room);
            }
          }
        }
      },
      { allowSignalWrites: true },
    );
  }

  loadAvailability(data: string, turno: string) {
    this.isLoadingAvailability.set(true);
    this.reservaService.getStatusAmbientes(data, turno).subscribe({
      next: (res) => {
        this.availabilityData.set(res);
        this.isLoadingAvailability.set(false);
      },
      error: () => {
        this.isLoadingAvailability.set(false);
      },
    });
  }

  loadReservas() {
    this.isLoading.set(true);
    this.reservaService.list(this.selectedDate()).subscribe({
      next: (reservas) => {
        this.reservasApi.set(reservas);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onTurnoChange(newTurno: string) {
    this.selectedTurno.set(newTurno);
    const available = this.horariosMenu()[newTurno];
    if (available?.length > 0) this.selectedTimeId.set(available[0].id);
    else this.selectedTimeId.set('');
  }

  toggleFilterPanel() {
    this.isFilterPanelOpen.update((v) => !v);
  }

  applyFilters() {
    this.appliedFilters.set({
      date: this.selectedDate(),
      turno: this.selectedTurno(),
      timeId: this.selectedTimeId(),
      resources: [...this.selectedResources()],
    });
    this.isFilterPanelOpen.set(false);
  }

  clearFilters() {
    const today = format(new Date(), 'yyyy-MM-dd');
    this.selectedDate.set(today);
    
    const autoTurno = this.getAutoTurno();
    this.selectedTurno.set(autoTurno);
    
    const available = this.horariosMenu()[autoTurno];
    if (available?.length > 0) this.selectedTimeId.set(available[0].id);
    else this.selectedTimeId.set('07:00');
    
    this.selectedResources.set([]);
    this.applyFilters();
  }

  onDateChange(date: string) {
    this.selectedDate.set(date);
    this.loadReservas();
    // No auto-load availability here, wait for Apply
  }

  onDateInputChange(value: string) {
    if (!value) return;

    // Tentar converter DD/MM/AAAA para YYYY-MM-DD
    const parts = value.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];

      if (year.length === 4) {
        const isoDate = `${year}-${month}-${day}`;
        // Validar se é uma data real
        const d = new Date(isoDate + 'T12:00:00'); // Meio-dia para evitar problemas de fuso no parse
        if (!isNaN(d.getTime())) {
          this.onDateChange(isoDate);
          return;
        }
      }
    }

    // Se falhar, reseta
    this.selectedDate.set(this.selectedDate());
  }

  onDatePickerChange(date: Date | null | undefined) {
    if (date && date instanceof Date && !isNaN(date.getTime())) {
      // Ajustar para evitar problemas de timezone ao converter para ISO string
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;
      this.onDateChange(isoDate);
    }
  }

  onDateInputKeyup(event: any) {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 8) value = value.substring(0, 8);

    let formatted = '';
    if (value.length > 0) {
      formatted = value.substring(0, 2);
      if (value.length > 2) {
        formatted += '/' + value.substring(2, 4);
        if (value.length > 4) {
          formatted += '/' + value.substring(4, 8);
        }
      }
    }
    input.value = formatted;
  }

  openRequestModal(item: any) {
    this.selectedRoomForModal.set(item);
    // Auto-select professor if logged in as Professor
    const currentUser = this.user();
    if (currentUser?.professorId) {
      this.requestTeacherId.set(currentUser.professorId);
    } else {
      this.requestTeacherId.set('');
    }

    this.requestReason.set('');
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedRoomForModal.set(null);
  }

  submitRequest() {
    const room = this.selectedRoomForModal();
    const timeId = this.selectedTimeId();
    const teacherId = this.requestTeacherId();

    if (!room || !teacherId) return;

    const slotDef = (this.horariosMenu()[this.selectedTurno()] || []).find((t) => t.id === timeId);
    if (!slotDef) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.reservaService
      .create({
        salaId: room.salaId,
        professorId: teacherId,
        data: this.selectedDate(),
        horarioInicio: slotDef.start,
        horarioFim: slotDef.end,
        motivo: this.requestReason() || 'Reserva Direta',
      })
      .subscribe({
        next: (res: any) => {
          this.closeModal();
          this.loadReservas();
          this.loadAvailability(this.selectedDate(), this.selectedTurno());
          this.isSubmitting.set(false);
          this.notification.success(res.message || 'Operação realizada com sucesso!');
        },
        error: (err: any) => {
          const msg = err?.error?.message || 'Erro ao registrar reserva.';
          this.errorMessage.set(msg);
          this.notification.error(msg);
          this.isSubmitting.set(false);
        },
      });
  }

  acceptRequest(reservaId: string) {
    this.reservaService.aprovar(reservaId).subscribe({
      next: () => {
        this.loadReservas();
        this.loadAvailability(this.selectedDate(), this.selectedTurno());
        this.notification.success('Reserva aprovada!');
      },
      error: () => {},
    });
  }

  rejectRequest(reservaId: string) {
    this.reservaService.recusar(reservaId).subscribe({
      next: () => {
        this.loadReservas();
        this.loadAvailability(this.selectedDate(), this.selectedTurno());
        this.notification.info('Solicitação recusada.');
      },
      error: () => {},
    });
  }

  deleteReserva(reservaId: string) {
    this.reservaService.delete(reservaId).subscribe({
      next: () => {
        this.loadReservas();
        this.loadAvailability(this.selectedDate(), this.selectedTurno());
        this.notification.info('Reserva removida.');
      },
      error: () => {},
    });
  }

  getSelectedRoomName(): string {
    return this.selectedRoomForModal()?.salaNome || '';
  }

  getSelectedTimeLabel(): string {
    const timeId = this.selectedTimeId();
    const turno = this.selectedTurno();
    return this.horariosMenu()[turno]?.find((t) => t.id === timeId)?.label || '';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Livre':
        return 'bg-success-subtle text-success border-success-subtle';
      case 'Ocupado':
        return 'bg-danger-subtle text-danger border-danger-subtle';
      case 'Solicitado':
        return 'bg-warning-subtle text-warning-emphasis border-warning-subtle';
      default:
        return 'bg-light text-secondary';
    }
  }
}
