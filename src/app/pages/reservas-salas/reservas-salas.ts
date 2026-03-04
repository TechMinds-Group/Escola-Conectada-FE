import { Component, computed, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../core/services/translation.service';
import { AmbienteService } from '../../core/services/ambiente.service';
import { ProfessorService, Professor } from '../../core/services/professor.service';
import {
  SchoolDataService,
  SchoolRoom,
  SchoolClass,
  Teacher,
} from '../../core/services/school-data';

interface TimeBlock {
  id: string; // Time ID e.g., '19:00'
  label: string;
  slotIndex: number;
  status: 'Livre' | 'Ocupada';
  currentTeacher: string | null;
}

interface RoomDisplay {
  id: string;
  name: string;
  capacity: number;
  horarios: Record<string, TimeBlock>;
}

interface PendingRequest {
  id: number;
  roomId: string;
  roomName: string;
  timeId: string;
  timeLabel: string;
  requestingTeacher: string;
  reason: string;
}

@Component({
  selector: 'app-reservas-salas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservas-salas.html',
})
export class ReservasSalas implements OnInit {
  public translation = inject(TranslationService);
  private ambienteService = inject(AmbienteService);
  private professorService = inject(ProfessorService);
  private schoolData = inject(SchoolDataService);
  t = this.translation.dictionary;

  // Real Data
  professoresApi = signal<Professor[]>([]);
  schoolRoomsApi = signal<SchoolRoom[]>([]);
  schoolClassesApi = computed(() => this.schoolData.schoolClasses());
  teachersApi = computed(() => this.schoolData.teachers()); // Use SchoolData to map ID to name

  // Time Filter State
  timeGridsApi = computed(() => this.schoolData.schoolTimeGrids());

  turnos = computed(() => {
    const grids = this.timeGridsApi();
    const uniqueShifts = new Set<string>();
    grids.forEach((g) => uniqueShifts.add(g.shift));
    const defaultShifts = ['Manhã', 'Tarde', 'Noite', 'Integral'];
    if (uniqueShifts.size === 0) return ['Manhã', 'Tarde', 'Noite']; // Fallback

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

    // Fallback if grids are empty but we have turnos
    if (Object.keys(menu).length === 0 || menu['Manhã']?.length === 0) {
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

  // Computed available times for the dropdown
  availableTimes = computed(() => this.horariosMenu()[this.selectedTurno()] || []);

  // We maintain a local overlay of "mock reservations" that override the API schedule
  localReservations = signal<Record<string, Record<string, string>>>({}); // { [roomId]: { [timeId]: teacherName } }

  // Computed to tie everything together
  viewSalas = computed<RoomDisplay[]>(() => {
    const rooms = this.schoolRoomsApi();
    const classes = this.schoolClassesApi();
    const allTeachers = this.teachersApi();
    const turno = this.selectedTurno();
    const timeId = this.selectedTimeId();

    const menu = this.horariosMenu();
    // Find the slotIndex for the selected time
    const slotDef = (menu[turno] || []).find((t) => t.id === timeId);
    if (!slotDef) return [];

    // Get today's day of week (Map Sunday=0..Saturday=6 to Monday=0..Friday=4). Default Monday if weekend to show data.
    let currentDay = new Date().getDay() - 1;
    if (currentDay < 0 || currentDay > 4) currentDay = 0;

    return rooms.map((room) => {
      let isOccupied = false;
      let teacherName: string | null = null;

      // 1. Check Backend Allocations (Grade Escolar)
      // Find a class physically located in this room during the selected shift
      const classInRoom = classes.find((c) => c.roomId === room.id && c.shift === turno);
      if (classInRoom) {
        // Find if any teacher is assigned to this day and slot
        const assignment = classInRoom.assignments?.find(
          (a) => a.dayOfWeek === currentDay && a.slotIndex === slotDef.slotIndex,
        );

        if (assignment && assignment.teacherId) {
          isOccupied = true;
          // Find teacher name
          const t = allTeachers.find((tchr) => tchr.id === assignment.teacherId);
          teacherName = t ? t.name : 'Professor Alocado';
        }
      }

      // 2. Check Local Overrides (Mock Reservations made in this session)
      const localRoomOverrides = this.localReservations()[room.id];
      if (localRoomOverrides && localRoomOverrides[timeId]) {
        isOccupied = true;
        teacherName = localRoomOverrides[timeId];
      }

      const block: TimeBlock = {
        id: timeId,
        label: slotDef.label,
        slotIndex: slotDef.slotIndex,
        status: isOccupied ? 'Ocupada' : 'Livre',
        currentTeacher: teacherName,
      };

      return {
        id: room.id,
        name: room.name,
        capacity: room.capacity || 0,
        horarios: {
          [timeId]: block,
        },
      };
    });
  });

  pendencias = signal<PendingRequest[]>([]);

  // Modal State
  isModalOpen = signal(false);
  selectedRoomIdForModal = signal<string | null>(null);
  requestTeacherId = signal('');
  requestReason = signal('');

  constructor() {
    // Auto-select the first shift if the current one is invalid
    effect(() => {
      const turnos = this.turnos();
      const currentTurno = this.selectedTurno();
      if (turnos.length > 0 && !turnos.includes(currentTurno)) {
        this.selectedTurno.set(turnos[0]);
      }
    });

    // Auto-select the first time slot of the newly selected shift if the current one is invalid
    effect(() => {
      const turnoFilter = this.selectedTurno();
      const times = this.horariosMenu()[turnoFilter] || [];
      const currentTime = this.selectedTimeId();
      if (times.length > 0 && !times.some((t) => t.id === currentTime)) {
        this.selectedTimeId.set(times[0].id);
      }
    });
  }

  ngOnInit() {
    this.schoolData.loadClasses(); // Ensure latest assignments are loaded

    // Fetch Rooms from API
    this.ambienteService.list().subscribe({
      next: (salas) => {
        this.schoolRoomsApi.set(salas);
      },
      error: (err) => console.error('Erro ao listar salas', err),
    });

    // Fetch Teachers from API
    this.professorService.getAll().subscribe({
      next: (profs) => {
        this.professoresApi.set(profs);
      },
      error: (err) => console.error('Erro ao listar professores', err),
    });
  }

  onTurnoChange(newTurno: string) {
    this.selectedTurno.set(newTurno);
    // Reset the time block to the first available in that turno
    const available = this.horariosMenu()[newTurno];
    if (available && available.length > 0) {
      this.selectedTimeId.set(available[0].id);
    } else {
      this.selectedTimeId.set('');
    }
  }

  openRequestModal(roomId: string) {
    this.selectedRoomIdForModal.set(roomId);
    this.requestTeacherId.set('');
    this.requestReason.set('');
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

    const teacher = this.professoresApi().find((p) => p.id === teacherId);
    if (!teacher) return;

    const room = this.schoolRoomsApi().find((r) => r.id === roomId);
    if (!room) return;

    const slotDef = (this.horariosMenu()[this.selectedTurno()] || []).find((t) => t.id === timeId);
    if (!slotDef) return;

    // Is the room free or occupied?
    // If we only wanted "Solicitar" for occupied, and "Reservar" for Free, we determine here
    // But both go through the same modal as per user instruction for the lock.

    const newRequest: PendingRequest = {
      id: Date.now(),
      roomId: room.id,
      roomName: room.name,
      timeId: timeId,
      timeLabel: slotDef.label,
      requestingTeacher: teacher.name,
      reason: this.requestReason() || 'Reserva Direta',
    };

    console.log('[API Simulação] Reserva/Solicitação Registrada:', newRequest);

    // Instead of immediate mock override, add to pending panel for visual demonstration
    this.pendencias.update((p) => [...p, newRequest]);
    this.closeModal();
  }

  acceptRequest(requestId: number) {
    const request = this.pendencias().find((p) => p.id === requestId);
    if (!request) return;

    // Apply Local Override
    this.localReservations.update((current) => {
      const roomReservations = current[request.roomId] || {};
      return {
        ...current,
        [request.roomId]: {
          ...roomReservations,
          [request.timeId]: request.requestingTeacher,
        },
      };
    });

    // Remove from pending panel
    this.pendencias.update((p) => p.filter((req) => req.id !== requestId));
  }

  rejectRequest(requestId: number) {
    this.pendencias.update((p) => p.filter((req) => req.id !== requestId));
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
