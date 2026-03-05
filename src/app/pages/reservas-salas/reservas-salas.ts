import { Component, computed, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../core/services/translation.service';
import { AmbienteService } from '../../core/services/ambiente.service';
import { ProfessorService, Professor } from '../../core/services/professor.service';
import { ReservaService, Reserva } from '../../core/services/reserva.service';
import {
  SchoolDataService,
  SchoolRoom,
  SchoolClass,
  Teacher,
} from '../../core/services/school-data';

interface TimeBlock {
  id: string;
  label: string;
  slotIndex: number;
  status: 'Livre' | 'Ocupada' | 'Pendente';
  currentTeacher: string | null;
  reservaId: string | null;
}

interface RoomDisplay {
  id: string;
  name: string;
  capacity: number;
  horarios: Record<string, TimeBlock>;
}

@Component({
  selector: 'app-reservas-salas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservas-salas.html',
  styleUrl: './reservas-salas.scss',
})
export class ReservasSalas implements OnInit {
  public translation = inject(TranslationService);
  private ambienteService = inject(AmbienteService);
  private professorService = inject(ProfessorService);
  private reservaService = inject(ReservaService);
  private schoolData = inject(SchoolDataService);
  t = this.translation.dictionary;

  // Real Data
  professoresApi = signal<Professor[]>([]);
  schoolRoomsApi = signal<SchoolRoom[]>([]);
  reservasApi = signal<Reserva[]>([]);
  isLoadingReservas = signal(false);

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
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

  availableTimes = computed(() => this.horariosMenu()[this.selectedTurno()] || []);

  // Computed: derive RoomDisplay from rooms + real reservations
  viewSalas = computed<RoomDisplay[]>(() => {
    const rooms = this.schoolRoomsApi();
    const classes = this.schoolClassesApi();
    const allTeachers = this.teachersApi();
    const turno = this.selectedTurno();
    const timeId = this.selectedTimeId();
    const reservas = this.reservasApi();

    const menu = this.horariosMenu();
    const slotDef = (menu[turno] || []).find((t) => t.id === timeId);
    if (!slotDef) return [];

    let currentDay = new Date().getDay() - 1;
    if (currentDay < 0 || currentDay > 4) currentDay = 0;

    return rooms.map((room) => {
      let isOccupied = false;
      let teacherName: string | null = null;
      let reservaId: string | null = null;
      let status: 'Livre' | 'Ocupada' | 'Pendente' = 'Livre';

      // 1. Check grade-based allocations (permanent schedule)
      const classInRoom = classes.find((c) => c.roomId === room.id && c.shift === turno);
      if (classInRoom) {
        const assignment = classInRoom.assignments?.find(
          (a) => a.dayOfWeek === currentDay && a.slotIndex === slotDef.slotIndex,
        );
        if (assignment && assignment.teacherId) {
          isOccupied = true;
          status = 'Ocupada';
          const t = allTeachers.find((tchr) => tchr.id === assignment.teacherId);
          teacherName = t ? t.name : 'Professor Alocado';
        }
      }

      // 2. Check real reservations from API (override grade if approved)
      if (!isOccupied) {
        const reservaForSlot = reservas.find(
          (r) => r.salaId === room.id && r.horarioInicio === timeId,
        );
        if (reservaForSlot) {
          reservaId = reservaForSlot.id;
          if (reservaForSlot.status === 'Aprovada') {
            status = 'Ocupada';
            isOccupied = true;
            teacherName = reservaForSlot.professorNome;
          } else if (reservaForSlot.status === 'Pendente') {
            status = 'Pendente';
            teacherName = reservaForSlot.professorNome;
          }
        }
      }

      const block: TimeBlock = {
        id: timeId,
        label: slotDef.label,
        slotIndex: slotDef.slotIndex,
        status,
        currentTeacher: teacherName,
        reservaId,
      };

      return {
        id: room.id,
        name: room.name,
        capacity: room.capacity || 0,
        horarios: { [timeId]: block },
      };
    });
  });

  // Pending reservations (Pendente status from API)
  pendencias = computed(() => this.reservasApi().filter((r) => r.status === 'Pendente'));

  // Modal State
  isModalOpen = signal(false);
  selectedRoomIdForModal = signal<string | null>(null);
  requestTeacherId = signal('');
  requestReason = signal('');
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

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
      if (times.length > 0 && !times.some((t) => t.id === this.selectedTimeId())) {
        this.selectedTimeId.set(times[0].id);
      }
    });
  }

  ngOnInit() {
    this.schoolData.loadClasses();

    this.ambienteService.list().subscribe({
      next: (salas) => this.schoolRoomsApi.set(salas),
      error: (err) => console.error('Erro ao listar salas', err),
    });

    this.professorService.getAll().subscribe({
      next: (profs) => this.professoresApi.set(profs),
      error: (err) => console.error('Erro ao listar professores', err),
    });

    this.loadReservas();
  }

  loadReservas() {
    this.isLoadingReservas.set(true);
    this.reservaService.list(this.selectedDate()).subscribe({
      next: (reservas) => {
        this.reservasApi.set(reservas);
        this.isLoadingReservas.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar reservas', err);
        this.isLoadingReservas.set(false);
      },
    });
  }

  onTurnoChange(newTurno: string) {
    this.selectedTurno.set(newTurno);
    const available = this.horariosMenu()[newTurno];
    if (available?.length > 0) this.selectedTimeId.set(available[0].id);
    else this.selectedTimeId.set('');
  }

  onDateChange(date: string) {
    this.selectedDate.set(date);
    this.loadReservas();
  }

  openRequestModal(roomId: string) {
    this.selectedRoomIdForModal.set(roomId);
    this.requestTeacherId.set('');
    this.requestReason.set('');
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedRoomIdForModal.set(null);
  }

  submitRequest() {
    const roomId = this.selectedRoomIdForModal();
    const timeId = this.selectedTimeId();
    const teacherId = this.requestTeacherId();

    if (!roomId || !teacherId) return;

    const slotDef = (this.horariosMenu()[this.selectedTurno()] || []).find((t) => t.id === timeId);
    if (!slotDef) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.reservaService
      .create({
        salaId: roomId,
        professorId: teacherId,
        data: this.selectedDate(),
        horarioInicio: slotDef.start,
        horarioFim: slotDef.end,
        motivo: this.requestReason() || 'Reserva Direta',
      })
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadReservas();
          this.isSubmitting.set(false);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erro ao registrar reserva.';
          this.errorMessage.set(msg);
          this.isSubmitting.set(false);
        },
      });
  }

  acceptRequest(reservaId: string) {
    this.reservaService.aprovar(reservaId).subscribe({
      next: () => this.loadReservas(),
      error: (err) => console.error('Erro ao aprovar reserva', err),
    });
  }

  rejectRequest(reservaId: string) {
    this.reservaService.recusar(reservaId).subscribe({
      next: () => this.loadReservas(),
      error: (err) => console.error('Erro ao recusar reserva', err),
    });
  }

  deleteReserva(reservaId: string) {
    this.reservaService.delete(reservaId).subscribe({
      next: () => this.loadReservas(),
      error: (err) => console.error('Erro ao excluir reserva', err),
    });
  }

  getSelectedRoomName(): string {
    const id = this.selectedRoomIdForModal();
    return this.schoolRoomsApi().find((r) => r.id === id)?.name || '';
  }

  getSelectedTimeLabel(): string {
    const timeId = this.selectedTimeId();
    const turno = this.selectedTurno();
    return this.horariosMenu()[turno]?.find((t) => t.id === timeId)?.label || '';
  }
}
